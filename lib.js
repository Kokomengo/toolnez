/* lib.js - own utilities: ZIP, GIF, PDF and video re-encoding.
   Escritas a mano para no depender de nadie. */

/* ---------------------------------------------------------- ZIP (store) */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
async function makeZip(entries) {          // [{name, blob}]
  const chunks = [], central = [];
  let offset = 0;
  const te = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() / 2)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  for (const e of entries) {
    const data = new Uint8Array(await e.blob.arrayBuffer());
    const name = te.encode(e.name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true);
    local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
    cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  let censize = 0; central.forEach(c => censize += c.length);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, censize, true); end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/* ---------------------------------------------------------- GIF 89a */
const GIF_PALETTE = (() => {                       // 216 web-safe + 40 grises
  const p = new Uint8Array(768); let i = 0;
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) {
    p[i++] = r * 51; p[i++] = g * 51; p[i++] = b * 51;
  }
  for (let k = 0; k < 40; k++) { const v = Math.round(k * 255 / 39); p[i++] = v; p[i++] = v; p[i++] = v; }
  return p;
})();
function quantize(rgba, len) {
  const out = new Uint8Array(len);
  for (let i = 0, j = 0; j < len; i += 4, j++) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12) out[j] = 216 + Math.round((r + g + b) / 3 * 39 / 255);
    else out[j] = Math.round(r / 51) * 36 + Math.round(g / 51) * 6 + Math.round(b / 51);
  }
  return out;
}
function lzwEncode(px, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1, dict = new Map();
  const bytes = []; let cur = 0, bits = 0;
  const emit = c => { cur |= c << bits; bits += codeSize; while (bits >= 8) { bytes.push(cur & 255); cur >>= 8; bits -= 8; } };
  emit(clear);
  let prefix = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], key = prefix * 4096 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next); next++; if (next > (1 << codeSize) - 1 && codeSize < 12) codeSize++; }
    else { emit(clear); dict = new Map(); codeSize = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (bits > 0) bytes.push(cur & 255);
  const blocks = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const part = bytes.slice(i, i + 255);
    blocks.push(part.length, ...part);
  }
  blocks.push(0);
  return new Uint8Array(blocks);
}
function encodeGIF(frames, w, h, delayCs) {        // frames: Uint8ClampedArray RGBA
  const te = new TextEncoder(), parts = [];
  const u16 = n => new Uint8Array([n & 255, (n >> 8) & 255]);
  parts.push(te.encode('GIF89a'), u16(w), u16(h), new Uint8Array([0xF7, 0, 0]), GIF_PALETTE);
  parts.push(te.encode('!'), new Uint8Array([0xFF, 11]), te.encode('NETSCAPE2.0'), new Uint8Array([3, 1, 0, 0, 0]));
  for (const f of frames) {
    parts.push(new Uint8Array([0x21, 0xF9, 4, 0]), u16(delayCs), new Uint8Array([0, 0]));
    parts.push(new Uint8Array([0x2C]), u16(0), u16(0), u16(w), u16(h), new Uint8Array([0]));
    parts.push(new Uint8Array([8]), lzwEncode(quantize(f, w * h), 8));
  }
  parts.push(new Uint8Array([0x3B]));
  return new Blob(parts, { type: 'image/gif' });
}

/* ---------------------------------------------------------- PDF */
const PDF_ENC = new TextEncoder();
function pdfBuild(objects) {
  const parts = [], offsets = []; let pos = 0;
  const push = u8 => { parts.push(u8); pos += u8.length; };
  push(PDF_ENC.encode('%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n'));
  objects.forEach((o, i) => {
    offsets[i] = pos;
    push(PDF_ENC.encode(`${i + 1} 0 obj\n`));
    push(o instanceof Uint8Array ? o : PDF_ENC.encode(o));
    push(PDF_ENC.encode('\nendobj\n'));
  });
  const xref = pos;
  let x = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => x += String(o).padStart(10, '0') + ' 00000 n \n');
  x += `trailer\n<< /Size ${objects.length + 1} /Root ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  push(PDF_ENC.encode(x));
  return new Blob(parts, { type: 'application/pdf' });
}
const joinBytes = (...a) => {
  let n = 0; a.forEach(x => n += x.length);
  const o = new Uint8Array(n); let k = 0; a.forEach(x => { o.set(x, k); k += x.length; });
  return o;
};
function pdfFromImages(items) {
  const objects = [], imgRefs = [], contRefs = [], pageRefs = [];
  let n = 0;
  items.forEach(it => {
    imgRefs.push(++n);
    objects.push(joinBytes(
      PDF_ENC.encode(`<< /Type /XObject /Subtype /Image /Width ${it.w} /Height ${it.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${it.bytes.length} >>\nstream\n`),
      it.bytes, PDF_ENC.encode('\nendstream')));
    const cs = `q ${it.pw} 0 0 ${it.ph} ${it.x} ${it.y} cm /Im0 Do Q`;
    contRefs.push(++n);
    objects.push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  });
  const pagesRef = n + items.length + 1;
  items.forEach((it, i) => {
    pageRefs.push(++n);
    objects.push(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${it.W} ${it.H}] /Resources << /XObject << /Im0 ${imgRefs[i]} 0 R >> >> /Contents ${contRefs[i]} 0 R >>`);
  });
  const pr = ++n;
  objects.push(`<< /Type /Pages /Kids [${pageRefs.map(r => r + ' 0 R').join(' ')}] /Count ${pageRefs.length} >>`);
  ++n; objects.push(`<< /Type /Catalog /Pages ${pr} 0 R >>`);
  return pdfBuild(objects);
}
const latin1 = str => {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const c = str.codePointAt(i);
    out[i] = c < 256 ? c : 63;                    // fuera de WinAnsi -> '?'
  }
  return out;
};
function pdfFromText(text, { fontSize = 12, margin = 56 } = {}) {
  const W = 595.28, H = 841.89, lh = fontSize * 1.45;
  const maxChars = Math.floor((W - 2 * margin) / (fontSize * 0.5));
  const lines = [];
  text.split('\n').forEach(par => {
    if (!par.trim()) return lines.push('');
    let cur = '';
    par.split(/\s+/).forEach(word => {
      if ((cur + ' ' + word).trim().length > maxChars) { lines.push(cur.trim()); cur = word; }
      else cur += ' ' + word;
    });
    lines.push(cur.trim());
  });
  const perPage = Math.floor((H - 2 * margin) / lh), pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objects = [], contRefs = [], pageRefs = [];
  let n = 0;
  pages.forEach(pl => {
    const body = pl.map((l, i) => {
      const safe = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      return `BT /F1 ${fontSize} Tf ${margin} ${(H - margin - (i + 1) * lh).toFixed(1)} Td (${safe}) Tj ET`;
    }).join('\n');
    const raw = latin1(body);                     // WinAnsi: one byte per character
    contRefs.push(++n);
    objects.push(joinBytes(PDF_ENC.encode(`<< /Length ${raw.length} >>\nstream\n`), raw, PDF_ENC.encode('\nendstream')));
  });
  const fontRef = ++n;
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const pagesRef = n + pages.length + 1;
  pages.forEach((_, i) => {
    pageRefs.push(++n);
    objects.push(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contRefs[i]} 0 R >>`);
  });
  const pr = ++n;
  objects.push(`<< /Type /Pages /Kids [${pageRefs.map(r => r + ' 0 R').join(' ')}] /Count ${pageRefs.length} >>`);
  ++n; objects.push(`<< /Type /Catalog /Pages ${pr} 0 R >>`);
  return pdfBuild(objects);
}

/* ---------------------------------------------------------- VIDEO */
function pickVideoMime(prefer) {
  const list = prefer === 'mp4'
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
    : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function loadVideo(file) {
  return new Promise((res, rej) => {
    const v = document.createElement('video');
    v.preload = 'auto'; v.muted = true; v.playsInline = true;
    v.onloadedmetadata = () => res(v);
    v.onerror = () => rej(new Error('Could not read that video'));
    v.src = URL.createObjectURL(file);
  });
}
const seekTo = (v, t) => new Promise(res => { v.onseeked = () => res(); v.currentTime = Math.min(t, Math.max(0, v.duration - 0.03)); });

/* Re-encodes by playing the video onto a canvas and recording the output.
   Tarda aproximadamente lo que dura el fragmento. */
async function reencodeVideo(file, opts, onProgress) {
  const { start = 0, end = null, width = null, fps = 30, mute = false,
          bitrate = 2_500_000, format = 'webm', paint = null } = opts;
  const src = document.createElement('video');
  src.src = URL.createObjectURL(file);
  src.muted = mute; src.playsInline = true; src.volume = mute ? 0 : 1;
  await new Promise((res, rej) => { src.onloadedmetadata = res; src.onerror = () => rej(new Error('Formato no compatible')); });
  const stop = end ?? src.duration;
  const scale = width ? Math.min(1, width / src.videoWidth) : 1;
  const cw = Math.round(src.videoWidth * scale / 2) * 2;
  const ch = Math.round(src.videoHeight * scale / 2) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { alpha: false });

  const stream = canvas.captureStream(fps);
  let audioCtx = null;
  if (!mute) {
    try {
      audioCtx = new AudioContext();
      const node = audioCtx.createMediaElementSource(src);
      const dest = audioCtx.createMediaStreamDestination();
      node.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (_) { /* sin audio disponible */ }
  }
  const mime = pickVideoMime(format);
  if (!mime) throw new Error('Your browser cannot record video');
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(res => rec.onstop = res);

  await seekTo(src, start);
  rec.start(200);
  await src.play();
  let raf;
  await new Promise(res => {
    const draw = () => {
      ctx.drawImage(src, 0, 0, cw, ch);
      if (paint) paint(ctx, cw, ch, src);      // retoques por fotograma
      onProgress?.((src.currentTime - start) / (stop - start));
      if (src.currentTime >= stop - 0.02 || src.ended) return res();
      raf = requestAnimationFrame(draw);
    };
    draw();
  });
  cancelAnimationFrame(raf);
  src.pause(); rec.stop();
  await done;
  audioCtx?.close();
  URL.revokeObjectURL(src.src);
  return { blob: new Blob(chunks, { type: mime }), width: cw, height: ch, mime };
}
