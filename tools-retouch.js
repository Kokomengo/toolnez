/* tools-retouch.js - remove objects from a photo and cover areas in a video.
   Meant for your own material: logos you added yourself, camera date stamps,
   number plates, faces, objects that get in the way. */
(() => {
const T = ToolNez;
const { $, $$, icon, bytes, clamp, secs, toast, download, dropzone, onFiles,
        loadImage, drawTo, toBlob, stem, results } = T;

const legalNote = `<div class="note">${icon('info')}<span><b>Use this on your own images and videos.</b>
  Removing another author's signature or mark in order to reuse their work is copyright infringement,
  and in many countries an offence as well.</span></div>`;

/* ------------------------------------------------------------------ smart fill
   Fills the marked area by propagating colour inwards from the edges (onion peeling) and
   then smoothing with Laplace iterations. Works very well on flat backgrounds, gradients,
   skies, walls or blurred areas; on finely detailed textures it leaves a smudge. */
function inpaint(imgData, mask, w, h, smooth = 90) {
  const d = imgData.data;
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = mask[i] ? 0 : 1;

  const R = new Float32Array(w * h), G = new Float32Array(w * h), B = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { R[i] = d[i * 4]; G[i] = d[i * 4 + 1]; B[i] = d[i * 4 + 2]; }

  /* 1. propagate from the edge inwards */
  let pending = [];
  for (let i = 0; i < w * h; i++) if (!known[i]) pending.push(i);
  const nb = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1];
  let guard = 0;
  while (pending.length && guard++ < 4000) {
    const next = [], settled = [];
    for (const i of pending) {
      const x = i % w, y = (i / w) | 0;
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = 0; k < 8; k++) {
        const j = i + nb[k];
        if (j < 0 || j >= w * h) continue;
        const jx = j % w;
        if (Math.abs(jx - x) > 1) continue;          // do not jump rows
        if (!known[j]) continue;
        const wgt = k < 4 ? 2 : 1;
        r += R[j] * wgt; g += G[j] * wgt; b += B[j] * wgt; n += wgt;
      }
      if (n) { R[i] = r / n; G[i] = g / n; B[i] = b / n; settled.push(i); }
      else next.push(i);
    }
    settled.forEach(i => known[i] = 1);
    if (!settled.length) break;
    pending = next;
  }

  /* 2. smoothing (Laplace) inside the mask only */
  const hole = [];
  for (let i = 0; i < w * h; i++) if (mask[i]) hole.push(i);
  for (let it = 0; it < smooth; it++) {
    for (const i of hole) {
      const x = i % w;
      if (x === 0 || x === w - 1 || i < w || i >= w * h - w) continue;
      R[i] = (R[i - 1] + R[i + 1] + R[i - w] + R[i + w]) / 4;
      G[i] = (G[i - 1] + G[i + 1] + G[i - w] + G[i + w]) / 4;
      B[i] = (B[i - 1] + B[i + 1] + B[i - w] + B[i + w]) / 4;
    }
  }

  /* 3. a pinch of grain so it does not end up a tell-tale flat patch */
  for (const i of hole) {
    const n = (Math.random() - 0.5) * 5;
    d[i * 4] = clamp(R[i] + n, 0, 255);
    d[i * 4 + 1] = clamp(G[i] + n, 0, 255);
    d[i * 4 + 2] = clamp(B[i] + n, 0, 255);
    d[i * 4 + 3] = 255;
  }
  return imgData;
}

/* pixelate and blur a region of a canvas */
function pixelateRegion(ctx, x, y, w, h, size) {
  if (w < 1 || h < 1) return;
  const tmp = document.createElement('canvas');
  const sw = Math.max(1, Math.round(w / size)), sh = Math.max(1, Math.round(h / size));
  tmp.width = sw; tmp.height = sh;
  const t = tmp.getContext('2d');
  t.imageSmoothingEnabled = true;
  t.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw, sh);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, sw, sh, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}
function blurRegion(ctx, x, y, w, h, radius) {
  if (w < 1 || h < 1) return;
  const tmp = document.createElement('canvas');
  tmp.width = ctx.canvas.width; tmp.height = ctx.canvas.height;
  const t = tmp.getContext('2d');
  t.filter = `blur(${radius}px)`;
  t.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

/* ==========================================================================
   1. REMOVE OBJECTS FROM A PHOTO
   ========================================================================== */
T.tool({
  id: 'remove-objects', cat: 'image', icon: 'eraser', isNew: true,
  name: 'Remove objects from a photo',
  tagline: 'Paint over whatever is in the way and the gap fills itself in.',
  keywords: 'remove object erase logo own mark date stamp retouch clean photo fill heal',
  ui: () => `
    ${dropzone('Drop the image you want to retouch', 'Then paint over whatever you want gone', 'image/*', false)}
    <div id="tools" hidden>
      <div class="actions" style="margin-top:14px">
        <div class="segment" id="mode">
          <button data-m="brush" class="on">Brush</button>
          <button data-m="rect">Rectangle</button>
          <button data-m="erase">Unmark</button>
        </div>
        <div class="segment" id="fill">
          <button data-f="smart" class="on">Fill in</button>
          <button data-f="pixel">Pixelate</button>
          <button data-f="blur">Blur</button>
        </div>
        <span class="tiny dim" id="hint">Mark the area in red and press Apply.</span>
      </div>
      <div class="grid2" style="margin-top:12px">
        <div class="field"><div class="slider-head"><label class="lb">Brush size</label><b id="szv">28 px</b></div>
          <input type="range" id="sz" min="6" max="120" value="28"></div>
        <div class="field"><div class="slider-head"><label class="lb">Fill strength</label><b id="itv">medium</b></div>
          <input type="range" id="it" min="0" max="2" value="1"></div>
      </div>
      <div class="stage" id="stage" style="touch-action:none;position:relative"></div>
      <div class="actions">
        <button class="btn" id="apply">${icon('eraser')}Apply</button>
        <button class="btn sec" id="undo">Undo</button>
        <button class="btn sec" id="clearmask">Clear the selection</button>
        <button class="btn sec" id="reset">Back to the original</button>
        <button class="btn sec" id="save">${icon('download')}Save</button>
        <span class="tiny dim" id="status"></span>
      </div>
    </div>
    ${legalNote}`,
  init(root) {
    let file = null, base = null;                // canvas holding the current image
    let view, mctx, maskCanvas, scale = 1, history = [];
    const stage = $('#stage', root);
    let mode = 'brush', fillMode = 'smart', drawing = false, last = null, rect = null;

    const setStatus = s => $('#status', root).textContent = s;

    const repaint = () => {
      const c = view.getContext('2d');
      c.clearRect(0, 0, view.width, view.height);
      c.drawImage(base, 0, 0, view.width, view.height);
      c.save();
      c.globalAlpha = .45; c.fillStyle = '#e0655f';
      c.drawImage(maskCanvas, 0, 0, view.width, view.height);
      c.restore();
      if (rect) {
        c.strokeStyle = '#e8a33d'; c.lineWidth = 2;
        c.setLineDash([5, 4]);
        c.strokeRect(rect.x, rect.y, rect.w, rect.h);
        c.setLineDash([]);
      }
    };
    const pointAt = e => {
      const r = view.getBoundingClientRect();
      return { x: (e.clientX - r.left) * view.width / r.width, y: (e.clientY - r.top) * view.height / r.height };
    };
    const stroke = (a, b) => {
      const s = +$('#sz', root).value;
      mctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
      mctx.strokeStyle = '#fff'; mctx.fillStyle = '#fff';
      mctx.lineWidth = s; mctx.lineCap = 'round'; mctx.lineJoin = 'round';
      mctx.beginPath(); mctx.moveTo(a.x, a.y); mctx.lineTo(b.x, b.y); mctx.stroke();
    };

    onFiles(root, async fs => {
      file = fs[0];
      const img = await loadImage(file);
      base = drawTo(img, img.naturalWidth, img.naturalHeight);
      const maxW = Math.min(760, stage.clientWidth || 760);
      scale = Math.min(1, maxW / base.width);
      view = document.createElement('canvas');
      view.width = Math.round(base.width * scale);
      view.height = Math.round(base.height * scale);
      view.style.cursor = 'crosshair';
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = view.width; maskCanvas.height = view.height;
      mctx = maskCanvas.getContext('2d');
      stage.innerHTML = ''; stage.appendChild(view);
      $('#tools', root).hidden = false;
      history = [];
      setStatus(`${base.width}\u00d7${base.height} px`);
      repaint();

      view.addEventListener('pointerdown', e => {
        view.setPointerCapture(e.pointerId);
        drawing = true; last = pointAt(e);
        if (mode === 'rect') rect = { x: last.x, y: last.y, w: 0, h: 0 };
        else stroke(last, last);
        repaint();
      });
      view.addEventListener('pointermove', e => {
        if (!drawing) return;
        const p = pointAt(e);
        if (mode === 'rect') { rect.w = p.x - rect.x; rect.h = p.y - rect.y; }
        else { stroke(last, p); last = p; }
        repaint();
      });
      ['pointerup', 'pointercancel'].forEach(ev => view.addEventListener(ev, () => {
        if (drawing && mode === 'rect' && rect) {
          const r = norm(rect);
          mctx.globalCompositeOperation = 'source-over';
          mctx.fillStyle = '#fff'; mctx.fillRect(r.x, r.y, r.w, r.h);
          rect = null; repaint();
        }
        drawing = false;
      }));
    });
    const norm = r => ({
      x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h),
      w: Math.abs(r.w), h: Math.abs(r.h)
    });

    $$('#mode button', root).forEach(b => b.onclick = () => {
      $$('#mode button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); mode = b.dataset.m;
      $('#hint', root).textContent = mode === 'rect'
        ? 'Drag to frame the area.'
        : mode === 'erase' ? 'Paint to take part of the red selection back off.'
        : 'Paint over whatever is in the way.';
    });
    $$('#fill button', root).forEach(b => b.onclick = () => {
      $$('#fill button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); fillMode = b.dataset.f;
    });
    const sz = $('#sz', root);
    sz.oninput = () => $('#szv', root).textContent = sz.value + ' px';
    const it = $('#it', root);
    it.oninput = () => $('#itv', root).textContent = ['gentle', 'medium', 'strong'][it.value];

    $('#apply', root).onclick = async () => {
      if (!base) return;
      const md = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
      let any = false;
      for (let i = 3; i < md.length; i += 4) if (md[i] > 40) { any = true; break; }
      if (!any) return toast('Mark the area you want gone first', true);

      history.push(drawTo(base, base.width, base.height));
      if (history.length > 8) history.shift();
      setStatus('Working\u2026');
      await new Promise(r => setTimeout(r, 20));

      const W = base.width, H = base.height;
      const bctx = base.getContext('2d');

      /* mask at full resolution */
      const full = document.createElement('canvas');
      full.width = W; full.height = H;
      const fc = full.getContext('2d');
      fc.drawImage(maskCanvas, 0, 0, W, H);
      const fmd = fc.getImageData(0, 0, W, H).data;

      if (fillMode === 'smart') {
        const mask = new Uint8Array(W * H);
        let minX = W, minY = H, maxX = 0, maxY = 0;
        for (let i = 0; i < W * H; i++) {
          if (fmd[i * 4 + 3] > 40) {
            mask[i] = 1;
            const x = i % W, y = (i / W) | 0;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
        /* work only on the affected box, with some margin */
        const pad = 24;
        const rx = Math.max(0, minX - pad), ry = Math.max(0, minY - pad);
        const rw = Math.min(W, maxX + pad) - rx, rh = Math.min(H, maxY + pad) - ry;
        const region = bctx.getImageData(rx, ry, rw, rh);
        const sub = new Uint8Array(rw * rh);
        for (let y = 0; y < rh; y++)
          for (let x = 0; x < rw; x++) sub[y * rw + x] = mask[(y + ry) * W + (x + rx)];
        const smooth = [40, 90, 200][+it.value];
        bctx.putImageData(inpaint(region, sub, rw, rh, smooth), rx, ry);
      } else {
        /* pixelate or blur, respecting the shape of the mask */
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        const tc = tmp.getContext('2d');
        tc.drawImage(base, 0, 0);
        if (fillMode === 'pixel') pixelateRegion(tc, 0, 0, W, H, [8, 16, 28][+it.value]);
        else { tc.filter = `blur(${[6, 14, 26][+it.value]}px)`; tc.drawImage(base, 0, 0); tc.filter = 'none'; }
        const shaped = document.createElement('canvas');
        shaped.width = W; shaped.height = H;
        const sc = shaped.getContext('2d');
        sc.drawImage(full, 0, 0);
        sc.globalCompositeOperation = 'source-in';
        sc.drawImage(tmp, 0, 0);
        bctx.drawImage(shaped, 0, 0);
      }
      mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      repaint();
      setStatus('Done \u00b7 carry on with another area if you like');
    };
    $('#undo', root).onclick = () => {
      if (!history.length) return toast('Nothing left to undo');
      base = history.pop();
      mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      repaint(); setStatus('Undone');
    };
    $('#clearmask', root).onclick = () => { mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height); repaint(); };
    $('#reset', root).onclick = async () => {
      if (!file) return;
      const img = await loadImage(file);
      base = drawTo(img, img.naturalWidth, img.naturalHeight);
      history = [];
      mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      repaint(); setStatus('Original image restored');
    };
    $('#save', root).onclick = async () => {
      const png = file.type === 'image/png';
      download(await toBlob(base, png ? 'image/png' : 'image/jpeg', .94),
        `${stem(file.name)}-retouched.${png ? 'png' : 'jpg'}`);
    };
  },
  info: `<h2>How the fill works</h2>
    <p>There is no artificial intelligence behind it: the algorithm takes the pixels at the edge of the area you
    painted and propagates them inwards layer by layer, then smooths the result with diffusion iterations and
    adds a touch of grain so it does not end up a flat patch. It is the classic diffusion <em>inpainting</em>
    technique.</p>
    <h2>When it works well and when it does not</h2>
    <ul>
      <li><strong>Very well:</strong> text or a logo over sky, a wall, grass, water, blurred backgrounds or gradients.</li>
      <li><strong>So-so:</strong> areas with a fine repeating texture, such as brickwork or fabric.</li>
      <li><strong>Badly:</strong> large objects in the middle of straight-line structures, like a window, or a face.
      There you are better off with <em>Pixelate</em> or <em>Blur</em>, which hide without inventing.</li>
    </ul>
    <p>Tip: instead of one big pass, do several small ones. Paint a piece, apply, paint the next. The result is
    noticeably cleaner and you can always undo.</p>
    <h2>An honest warning</h2>
    <p>This tool is for your own material: the logo you added, the orange date your camera burned in, a number
    plate, a bin that ruins the shot, or personal data visible in a screenshot. Taking a photographer's signature
    off so you can reuse their work is not just wrong, it is copyright infringement, and we are not going to
    help with it.</p>`,
  faq: [
    ['Can it remove a very large piece of text?', 'The bigger the area, the more the algorithm has to invent and the blurrier it gets. Up to 10-15% of the image usually looks convincing if the background is uniform.'],
    ['Does the rest of the photo lose quality?', 'No. Only the pixels you marked are touched; everything else is saved unchanged. If the original was a PNG, so is the output.']
  ]
});

/* ==========================================================================
   2. COVER AN AREA IN A VIDEO
   ========================================================================== */
T.tool({
  id: 'cover-video-area', cat: 'video', icon: 'eraser', isNew: true,
  name: 'Cover an area in a video',
  tagline: 'Blur, pixelate or black out a rectangle for the whole clip.',
  keywords: 'cover hide blur pixelate face number plate logo own mark video censor redact',
  ui: () => `
    ${dropzone('Drop the video here', 'Then draw the rectangle on the first frame', 'video/*', false)}
    <div id="picker" hidden>
      <p class="tiny dim" style="margin:14px 0 6px">Drag on the image to frame the area that needs covering.</p>
      <div class="stage" id="stage" style="touch-action:none"></div>
      <div class="actions">
        <div class="segment" id="fx">
          <button data-f="blur" class="on">Blur</button>
          <button data-f="pixel">Pixelate</button>
          <button data-f="solid">Black out</button>
        </div>
        <div class="field" style="min-width:200px"><div class="slider-head">
          <label class="lb">Strength</label><b id="stv">medium</b></div>
          <input type="range" id="st" min="0" max="2" value="1"></div>
      </div>
      <div class="grid2">
        <div class="field"><div class="slider-head"><label class="lb">Starts at</label><b id="tin">0:00</b></div>
          <input type="range" id="ra" min="0" value="0"></div>
        <div class="field"><div class="slider-head"><label class="lb">Ends at</label><b id="tout">0:00</b></div>
          <input type="range" id="rb" min="0" value="0"></div>
      </div>
      <div class="grid2">
        <div><label class="lb" for="res">Output resolution</label><select id="res">
          <option value="0">Same as the original</option><option value="1280" selected>1280 px</option>
          <option value="854">854 px</option></select></div>
        <div><label class="lb" for="br">Quality</label><select id="br">
          <option value="4000000">High \u00b7 4 Mbps</option><option value="2500000" selected>Medium \u00b7 2.5 Mbps</option>
          <option value="1200000">Light \u00b7 1.2 Mbps</option></select></div>
      </div>
      <div class="actions"><button class="btn" id="go">${icon('eraser')}Process the video</button>
        <span class="tiny dim" id="sel"></span></div>
      <div id="prog" hidden><div class="bar-meter"><i></i></div><p class="tiny dim" id="progtxt"></p></div>
      <div class="filelist" id="out"></div>
    </div>
    ${legalNote}`,
  init(root) {
    let file = null, vid = null, view = null, vscale = 1, rect = null, drawing = false;
    const stage = $('#stage', root);
    let fx = 'blur';

    const paintPreview = () => {
      const c = view.getContext('2d');
      c.drawImage(vid, 0, 0, view.width, view.height);
      if (rect) {
        const r = norm(rect);
        const strength = +$('#st', root).value;
        if (fx === 'pixel') pixelateRegion(c, r.x, r.y, r.w, r.h, [6, 12, 22][strength] * vscale || 6);
        else if (fx === 'blur') blurRegion(c, r.x, r.y, r.w, r.h, [5, 12, 22][strength] * vscale || 5);
        else { c.fillStyle = '#000'; c.fillRect(r.x, r.y, r.w, r.h); }
        c.strokeStyle = '#e8a33d'; c.lineWidth = 2;
        c.strokeRect(r.x, r.y, r.w, r.h);
        $('#sel', root).textContent = `Area: ${Math.round(r.w / vscale)}\u00d7${Math.round(r.h / vscale)} px`;
      }
    };
    const norm = r => ({
      x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h),
      w: Math.abs(r.w), h: Math.abs(r.h)
    });
    const pointAt = e => {
      const b = view.getBoundingClientRect();
      return { x: (e.clientX - b.left) * view.width / b.width, y: (e.clientY - b.top) * view.height / b.height };
    };

    onFiles(root, async fs => {
      file = fs[0];
      vid = await loadVideo(file);
      await seekTo(vid, Math.min(0.2, vid.duration / 2));
      const maxW = Math.min(760, stage.clientWidth || 760);
      vscale = Math.min(1, maxW / vid.videoWidth);
      view = document.createElement('canvas');
      view.width = Math.round(vid.videoWidth * vscale);
      view.height = Math.round(vid.videoHeight * vscale);
      view.style.cursor = 'crosshair';
      stage.innerHTML = ''; stage.appendChild(view);
      $('#picker', root).hidden = false;
      rect = { x: view.width * .55, y: view.height * .78, w: view.width * .38, h: view.height * .16 };
      paintPreview();

      const ra = $('#ra', root), rb = $('#rb', root);
      [ra, rb].forEach(s => s.max = Math.floor(vid.duration * 100));
      ra.value = 0; rb.value = Math.floor(vid.duration * 100);
      const lbl = () => {
        $('#tin', root).textContent = secs(+ra.value / 100);
        $('#tout', root).textContent = secs(+rb.value / 100);
      };
      ra.oninput = async () => { if (+ra.value >= +rb.value) ra.value = +rb.value - 20; lbl(); await seekTo(vid, +ra.value / 100); paintPreview(); };
      rb.oninput = () => { if (+rb.value <= +ra.value) rb.value = +ra.value + 20; lbl(); };
      lbl();

      view.addEventListener('pointerdown', e => {
        view.setPointerCapture(e.pointerId);
        const p = pointAt(e);
        drawing = true; rect = { x: p.x, y: p.y, w: 0, h: 0 };
      });
      view.addEventListener('pointermove', e => {
        if (!drawing) return;
        const p = pointAt(e);
        rect.w = p.x - rect.x; rect.h = p.y - rect.y;
        paintPreview();
      });
      ['pointerup', 'pointercancel'].forEach(ev => view.addEventListener(ev, () => { drawing = false; paintPreview(); }));
    });

    $$('#fx button', root).forEach(b => b.onclick = () => {
      $$('#fx button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on'); fx = b.dataset.f; paintPreview();
    });
    const st = $('#st', root);
    st.oninput = () => { $('#stv', root).textContent = ['gentle', 'medium', 'strong'][st.value]; paintPreview(); };

    $('#go', root).onclick = async () => {
      if (!rect || Math.abs(rect.w) < 6) return toast('Draw the area to cover first', true);
      const go = $('#go', root), wrap = $('#prog', root), bar = $('#prog i', root), txt = $('#progtxt', root);
      const start = +$('#ra', root).value / 100, end = +$('#rb', root).value / 100;
      const strength = +st.value;
      const r = norm(rect);
      /* relative proportions: they hold whatever the output resolution is */
      const rel = { x: r.x / view.width, y: r.y / view.height, w: r.w / view.width, h: r.h / view.height };

      go.disabled = true; go.innerHTML = '<i class="spin"></i>Processing\u2026';
      wrap.hidden = false;
      try {
        const out = await reencodeVideo(file, {
          start, end,
          width: +$('#res', root).value || null,
          bitrate: +$('#br', root).value,
          paint: (ctx, cw, ch) => {
            const x = rel.x * cw, y = rel.y * ch, w = rel.w * cw, h = rel.h * ch;
            const k = cw / 1280;
            if (fx === 'pixel') pixelateRegion(ctx, x, y, w, h, Math.max(4, [8, 16, 28][strength] * k));
            else if (fx === 'blur') blurRegion(ctx, x, y, w, h, Math.max(3, [8, 16, 30][strength] * k));
            else { ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); }
          }
        }, p => {
          bar.style.width = clamp(p * 100, 0, 100) + '%';
          txt.textContent = `${Math.round(p * 100)}% \u00b7 ${secs((end - start) * (1 - p))} to go`;
        });
        bar.style.width = '100%'; txt.textContent = 'Finished';
        const ext = out.mime.includes('mp4') ? 'mp4' : 'webm';
        results($('#out', root), [{
          blob: out.blob, name: `${stem(file.name)}-covered.${ext}`,
          note: `${out.width}\u00d7${out.height} \u00b7 ${secs(end - start)} \u00b7 ${bytes(out.blob.size)}`
        }]);
      } catch (e) { toast(e.message, true); }
      go.disabled = false; go.innerHTML = icon('eraser') + 'Process the video';
    };
  },
  info: `<h2>Three ways to cover something</h2>
    <p><strong>Blur</strong> hides without drawing attention and is the usual choice for faces or addresses.
    <strong>Pixelate</strong> is the classic television effect: more noticeable, but it makes clear that something
    was deliberately hidden. <strong>Black out</strong> is the safest option when the information must not leak
    under any circumstances, because the other two, at very low strength, are sometimes reversible.</p>
    <h2>Common uses</h2>
    <ul><li>Covering the faces of people who did not agree to appear before you publish the video.</li>
    <li>Hiding number plates, addresses, account numbers or names in a screen recording.</li>
    <li>Removing the logo or timecode your own camera or software burns in.</li>
    <li>Covering a notification that popped up in the middle of a demo.</li></ul>
    <p>The rectangle is stored as proportions rather than pixels, so you can change the output resolution and the
    covered area stays where it should.</p>`,
  faq: [
    ['Does the covered area follow the object?', 'No, it is a fixed rectangle for the whole segment. If what you want hidden moves a lot, process the video in several segments, each with its own rectangle, and join them afterwards.'],
    ['Why does it take as long as the video lasts?', 'Because it is re-encoded by playing it back in real time with MediaRecorder, frame by frame.']
  ]
});

})();
