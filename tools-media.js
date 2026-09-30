/* tools-media.js - image and video tools */
(() => {
const T = ToolNez;
const { $, $$, esc, icon, bytes, num, clamp, secs, toast, download, dropzone, onFiles,
        loadImage, drawTo, toBlob, stem, results, store } = T;

/* per-tool setting memory */
const remember = (id, el, key) => {
  const saved = store.get('opt.' + id + '.' + key, null);
  if (saved !== null) { if (el.type === 'checkbox') el.checked = saved; else el.value = saved; }
  el.addEventListener('change', () => store.set('opt.' + id + '.' + key, el.type === 'checkbox' ? el.checked : el.value));
};
const slider = (id, label, min, max, val, suffix = '') =>
  `<div class="field"><div class="slider-head"><label class="lb" for="${id}">${label}</label><b id="${id}v">${val}${suffix}</b></div>
   <input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
const bindSlider = (root, id, suffix = '', cb) => {
  const s = $('#' + id, root), out = $('#' + id + 'v', root);
  const up = () => { out.textContent = s.value + suffix; cb?.(+s.value); };
  s.addEventListener('input', up); up(); return s;
};
const listFiles = (el, files, onRemove) => {
  el.innerHTML = files.map((f, i) => `
    <div class="frow">
      ${f.type.startsWith('image') ? `<img src="${URL.createObjectURL(f)}" alt="">` : `<span class="ic" style="width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px">${icon('video')}</span>`}
      <div class="meta"><b>${esc(f.name)}</b><span>${bytes(f.size)}</span></div>
      <button class="x" data-rm="${i}" title="Remove">&times;</button>
    </div>`).join('');
  $$('[data-rm]', el).forEach(b => b.onclick = () => onRemove(+b.dataset.rm));
};

/* ==========================================================  IMAGE  ========================================================== */

T.tool({
  id: 'convert-image', cat: 'image', icon: 'image',
  name: 'Convert images', tagline: 'PNG to JPG, to WebP, or the other way round. Many at once.',
  keywords: 'convert png jpg jpeg webp format change extension',
  ui: () => `
    ${dropzone('Drop your images here', 'PNG, JPG, WebP, GIF, BMP or AVIF &middot; several at a time', 'image/*')}
    <div class="filelist" id="inbox"></div>
    <div class="grid2">
      <div><label class="lb" for="fmt">Convert to</label>
        <select id="fmt"><option value="image/webp">WebP &middot; smallest files</option>
        <option value="image/jpeg">JPG &middot; photos and email</option>
        <option value="image/png">PNG &middot; keeps transparency</option></select></div>
      ${slider('qual', 'Quality', 40, 100, 90, '%')}
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('image')}Convert</button>
      <button class="btn sec" id="clear">Clear</button></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let files = [];
    const out = $('#out', root), inbox = $('#inbox', root), go = $('#go', root);
    const redraw = () => { listFiles(inbox, files, i => { files.splice(i, 1); redraw(); }); go.disabled = !files.length; };
    onFiles(root, fs => { files = files.concat(fs.filter(f => f.type.startsWith('image'))); redraw(); });
    $('#clear', root).onclick = () => { files = []; out.innerHTML = ''; redraw(); };
    bindSlider(root, 'qual', '%');
    remember('convert-image', $('#fmt', root), 'fmt');
    go.onclick = async () => {
      const fmt = $('#fmt', root).value, q = +$('#qual', root).value / 100;
      const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }[fmt];
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Converting…';
      const items = [];
      for (const f of files) {
        const img = await loadImage(f);
        const blob = await toBlob(drawTo(img, img.naturalWidth, img.naturalHeight), fmt, q);
        const diff = Math.round((1 - blob.size / f.size) * 100);
        items.push({
          blob, name: stem(f.name) + '.' + ext, thumb: URL.createObjectURL(blob),
          note: `${img.naturalWidth}\u00d7${img.naturalHeight} \u00b7 ${bytes(f.size)} \u2192 ${bytes(blob.size)}`,
          badge: diff > 0 ? `−${diff}%` : `+${-diff}%`, badgeOk: diff > 0
        });
      }
      results(out, items, 'converted-images.zip');
      go.disabled = false; go.innerHTML = icon('image') + 'Convert';
      toast(items.length + (items.length === 1 ? ' image ready' : ' images ready'));
    };
  },
  info: `<h2>Which format to pick</h2>
    <p><strong>WebP</strong> comes out 25-35% smaller than a JPG of the same visual quality and supports transparency,
    which makes it the default choice for anything going on a modern website. <strong>JPG</strong> is still the safest
    bet when you are emailing a photo or uploading to an older portal. <strong>PNG</strong> only earns its size with
    logos, screenshots and anything that needs a transparent background.</p>
    <p>Converting also drops the EXIF metadata, camera GPS coordinates included. That is a handy side effect when you
    are about to publish a photo.</p>`,
  faq: [['Can it convert iPhone HEIC files?', 'Only if your browser can open them (Safari can, Chrome on Windows usually cannot). If the image never appears in the list, the browser did not recognise it.']]
});

T.tool({
  id: 'compress-image', cat: 'image', icon: 'shrink',
  name: 'Compress photos', tagline: 'Push the file size down to just before it shows.',
  keywords: 'compress reduce size optimise shrink photo kb',
  ui: () => `
    ${dropzone('Drop the photos to compress', 'They are all handled in one pass', 'image/*')}
    <div class="filelist" id="inbox"></div>
    <div class="grid2">
      ${slider('qual', 'Quality', 30, 95, 72, '%')}
      <div><label class="lb" for="mw">Maximum width</label>
        <select id="mw"><option value="0">Leave as is</option><option value="2560">2560 px &middot; large screens</option>
        <option value="1920" selected>1920 px &middot; web and social</option><option value="1280">1280 px &middot; blog</option>
        <option value="800">800 px &middot; thumbnail</option></select></div>
    </div>
    <label class="opt" style="margin-top:12px"><input type="checkbox" id="webp"> Save as WebP (smaller still)</label>
    <div class="actions"><button class="btn" id="go" disabled>${icon('shrink')}Compress</button></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let files = [];
    const out = $('#out', root), inbox = $('#inbox', root), go = $('#go', root);
    const redraw = () => { listFiles(inbox, files, i => { files.splice(i, 1); redraw(); }); go.disabled = !files.length; };
    onFiles(root, fs => { files = files.concat(fs.filter(f => f.type.startsWith('image'))); redraw(); });
    bindSlider(root, 'qual', '%');
    ['qual', 'mw', 'webp'].forEach(k => remember('compress-image', $('#' + k, root), k));
    go.onclick = async () => {
      const q = +$('#qual', root).value / 100, mw = +$('#mw', root).value;
      const webp = $('#webp', root).checked;
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Working…';
      const items = []; let before = 0, after = 0;
      for (const f of files) {
        const img = await loadImage(f);
        let w = img.naturalWidth, h = img.naturalHeight;
        if (mw && w > mw) { h = Math.round(h * mw / w); w = mw; }
        const blob = await toBlob(drawTo(img, w, h), webp ? 'image/webp' : 'image/jpeg', q);
        before += f.size; after += blob.size;
        const cut = Math.round((1 - blob.size / f.size) * 100);
        items.push({
          blob, name: stem(f.name) + (webp ? '.webp' : '.jpg'), thumb: URL.createObjectURL(blob),
          note: `${w}\u00d7${h} \u00b7 ${bytes(f.size)} \u2192 ${bytes(blob.size)}`,
          badge: cut > 0 ? `-${cut}%` : 'no gain', badgeOk: cut > 0
        });
      }
      results(out, items, 'compressed-photos.zip');
      go.disabled = false; go.innerHTML = icon('shrink') + 'Compress';
      toast(`${bytes(before)} down to ${bytes(after)}`);
    };
  },
  info: `<h2>How much quality you can drop</h2>
    <p>Between 70 and 80 almost nobody can tell the result from the original on a screen, and the file usually ends up
    around a fifth of the size. Below 60 you start to see blocking in skies and flat areas of colour.</p>
    <p>Shrinking the width does more than lowering quality: a 4000 px phone photo that will be shown 800 px wide in a
    blog post does not need the other 3200.</p>
    <table class="t"><tr><th>Use</th><th>Width</th><th>Quality</th></tr>
    <tr><td>Hero background</td><td class="num">1920</td><td class="num">75</td></tr>
    <tr><td>Photo inside an article</td><td class="num">1280</td><td class="num">72</td></tr>
    <tr><td>Email attachment</td><td class="num">1600</td><td class="num">65</td></tr>
    <tr><td>Catalogue thumbnail</td><td class="num">600</td><td class="num">70</td></tr></table>`
});

T.tool({
  id: 'resize-image', cat: 'image', icon: 'resize',
  name: 'Resize image', tagline: 'Exact pixels or a percentage, with the ratio locked.',
  keywords: 'resize scale pixels width height dimensions',
  ui: () => `
    ${dropzone('Drop an image', 'You will see the result before saving', 'image/*', false)}
    <div class="stage" id="stage" hidden></div>
    <div class="grid3">
      <div><label class="lb" for="w">Width (px)</label><input type="number" id="w" min="1"></div>
      <div><label class="lb" for="h">Height (px)</label><input type="number" id="h" min="1"></div>
      <div><label class="lb" for="p">Percentage</label><input type="number" id="p" placeholder="50"></div>
    </div>
    <label class="opt" style="margin-top:12px"><input type="checkbox" id="lock" checked> Keep the aspect ratio</label>
    <div class="actions"><button class="btn" id="go" disabled>${icon('download')}Save image</button>
      <span class="tiny dim" id="info"></span></div>`,
  init(root) {
    let img = null, file = null;
    const W = $('#w', root), H = $('#h', root), Pc = $('#p', root), stage = $('#stage', root), go = $('#go', root);
    const ratio = () => img ? img.naturalWidth / img.naturalHeight : 1;
    const preview = () => {
      if (!img) return;
      const w = clamp(+W.value || 1, 1, 12000), h = clamp(+H.value || 1, 1, 12000);
      stage.hidden = false;
      stage.innerHTML = '';
      stage.appendChild(drawTo(img, w, h));
      $('#info', root).textContent = `Original ${img.naturalWidth}\u00d7${img.naturalHeight} \u2192 ${w}\u00d7${h}`;
    };
    onFiles(root, async fs => {
      file = fs[0]; img = await loadImage(file);
      W.value = img.naturalWidth; H.value = img.naturalHeight; go.disabled = false; preview();
    });
    W.oninput = () => { if ($('#lock', root).checked && img) H.value = Math.round(W.value / ratio()); preview(); };
    H.oninput = () => { if ($('#lock', root).checked && img) W.value = Math.round(H.value * ratio()); preview(); };
    Pc.oninput = () => {
      if (!img || !Pc.value) return;
      W.value = Math.round(img.naturalWidth * Pc.value / 100);
      H.value = Math.round(img.naturalHeight * Pc.value / 100); preview();
    };
    go.onclick = async () => {
      const png = file.type === 'image/png';
      const blob = await toBlob(drawTo(img, +W.value, +H.value), png ? 'image/png' : 'image/jpeg', 0.92);
      download(blob, `${stem(file.name)}-${W.value}x${H.value}.${png ? 'png' : 'jpg'}`);
    };
  }
});

T.tool({
  id: 'crop-image', cat: 'image', icon: 'crop',
  name: 'Crop image', tagline: 'Drag the frame, or lock it to a fixed ratio.',
  keywords: 'crop square 1:1 16:9 profile picture cover trim',
  ui: () => `
    ${dropzone('Drop an image to crop', 'Then drag the frame with the mouse or your finger', 'image/*', false)}
    <div class="actions" id="ratios" hidden>
      <div class="segment">
        <button data-r="free" class="on">Free</button><button data-r="1">1:1</button>
        <button data-r="1.7778">16:9</button><button data-r="1.3333">4:3</button><button data-r="0.8">4:5</button>
      </div>
    </div>
    <div class="stage" id="stage" hidden style="position:relative;touch-action:none"></div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('crop')}Crop and save</button>
      <span class="tiny dim" id="dims"></span></div>`,
  init(root) {
    let img = null, file = null, box = null, ratio = null, scale = 1;
    const stage = $('#stage', root), go = $('#go', root), dims = $('#dims', root);
    let cvs, frame;

    const paint = () => {
      const x = cvs.getContext('2d');
      x.clearRect(0, 0, cvs.width, cvs.height);
      x.drawImage(img, 0, 0, cvs.width, cvs.height);
      x.fillStyle = 'rgba(0,0,0,.55)';
      x.fillRect(0, 0, cvs.width, box.y);
      x.fillRect(0, box.y + box.h, cvs.width, cvs.height - box.y - box.h);
      x.fillRect(0, box.y, box.x, box.h);
      x.fillRect(box.x + box.w, box.y, cvs.width - box.x - box.w, box.h);
      x.strokeStyle = '#e8a33d'; x.lineWidth = 2;
      x.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
      x.fillStyle = '#e8a33d';
      x.fillRect(box.x + box.w - 11, box.y + box.h - 11, 11, 11);
      dims.textContent = `Crop: ${Math.round(box.w / scale)}\u00d7${Math.round(box.h / scale)} px`;
    };
    const setRatio = r => {
      ratio = r;
      if (r) {
        let w = Math.min(cvs.width, cvs.height * r);
        let h = w / r;
        if (h > cvs.height) { h = cvs.height; w = h * r; }
        box = { x: (cvs.width - w) / 2, y: (cvs.height - h) / 2, w, h };
      }
      paint();
    };
    onFiles(root, async fs => {
      file = fs[0]; img = await loadImage(file);
      const maxW = Math.min(720, stage.clientWidth || 720);
      scale = Math.min(1, maxW / img.naturalWidth);
      cvs = document.createElement('canvas');
      cvs.width = Math.round(img.naturalWidth * scale);
      cvs.height = Math.round(img.naturalHeight * scale);
      cvs.style.cursor = 'crosshair';
      stage.hidden = false; stage.innerHTML = ''; stage.appendChild(cvs);
      $('#ratios', root).hidden = false;
      box = { x: cvs.width * .1, y: cvs.height * .1, w: cvs.width * .8, h: cvs.height * .8 };
      go.disabled = false; paint();

      let mode = null, off = { x: 0, y: 0 };
      const pt = e => { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) * cvs.width / r.width, y: (e.clientY - r.top) * cvs.height / r.height }; };
      cvs.addEventListener('pointerdown', e => {
        const p = pt(e); cvs.setPointerCapture(e.pointerId);
        const nearHandle = Math.abs(p.x - (box.x + box.w)) < 18 && Math.abs(p.y - (box.y + box.h)) < 18;
        const inside = p.x > box.x && p.x < box.x + box.w && p.y > box.y && p.y < box.y + box.h;
        mode = nearHandle ? 'size' : inside ? 'move' : 'new';
        if (mode === 'move') off = { x: p.x - box.x, y: p.y - box.y };
        if (mode === 'new') box = { x: p.x, y: p.y, w: 1, h: 1 };
      });
      cvs.addEventListener('pointermove', e => {
        if (!mode) return;
        const p = pt(e);
        if (mode === 'move') {
          box.x = clamp(p.x - off.x, 0, cvs.width - box.w);
          box.y = clamp(p.y - off.y, 0, cvs.height - box.h);
        } else {
          box.w = clamp(p.x - box.x, 12, cvs.width - box.x);
          box.h = ratio ? box.w / ratio : clamp(p.y - box.y, 12, cvs.height - box.y);
          if (box.y + box.h > cvs.height) { box.h = cvs.height - box.y; if (ratio) box.w = box.h * ratio; }
        }
        paint();
      });
      ['pointerup', 'pointercancel'].forEach(ev => cvs.addEventListener(ev, () => mode = null));
    });
    $$('#ratios button', root).forEach(b => b.onclick = () => {
      $$('#ratios button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      setRatio(b.dataset.r === 'free' ? null : +b.dataset.r);
    });
    go.onclick = async () => {
      const c = document.createElement('canvas');
      c.width = Math.round(box.w / scale); c.height = Math.round(box.h / scale);
      c.getContext('2d').drawImage(img, box.x / scale, box.y / scale, c.width, c.height, 0, 0, c.width, c.height);
      download(await toBlob(c, 'image/png'), stem(file.name) + '-cropped.png');
    };
  }
});

T.tool({
  id: 'add-watermark', cat: 'image', icon: 'drop',
  name: 'Add a watermark', tagline: 'Your text over the photo, at the opacity and corner you choose.',
  keywords: 'watermark signature copyright text over photo branding',
  ui: () => `
    ${dropzone('Drop the photos to sign', 'The same mark is applied to every one', 'image/*')}
    <div class="filelist" id="inbox"></div>
    <div class="grid2">
      <div><label class="lb" for="txt">Text</label><input type="text" id="txt" value="&copy; Your name"></div>
      <div><label class="lb" for="pos">Position</label><select id="pos">
        <option value="br">Bottom right</option><option value="bl">Bottom left</option>
        <option value="tr">Top right</option><option value="tl">Top left</option>
        <option value="c">Centred</option><option value="tile">Tiled diagonally</option></select></div>
      ${slider('size', 'Size', 2, 16, 5, '%')}
      ${slider('op', 'Opacity', 10, 100, 55, '%')}
    </div>
    <div class="stage" id="stage" hidden></div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('drop')}Apply to all</button></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let files = [], sample = null;
    const inbox = $('#inbox', root), stage = $('#stage', root), go = $('#go', root);
    const stamp = (img, W, H) => {
      const c = drawTo(img, W, H), x = c.getContext('2d');
      const fs = H * (+$('#size', root).value / 100);
      x.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
      x.fillStyle = `rgba(255,255,255,${+$('#op', root).value / 100})`;
      x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = fs / 5;
      const t = $('#txt', root).value || ' ';
      const w = x.measureText(t).width, pad = fs * .7, pos = $('#pos', root).value;
      if (pos === 'tile') {
        x.save(); x.rotate(-Math.PI / 9);
        for (let y = -H; y < H * 1.6; y += fs * 3.4)
          for (let px = -W * .4; px < W * 1.4; px += w + fs * 2.4) x.fillText(t, px, y);
        x.restore();
      } else {
        const spots = { br: [W - w - pad, H - pad], bl: [pad, H - pad], tr: [W - w - pad, fs + pad], tl: [pad, fs + pad], c: [(W - w) / 2, H / 2 + fs / 3] };
        x.fillText(t, ...spots[pos]);
      }
      return c;
    };
    const preview = () => {
      if (!sample) return;
      const s = Math.min(1, 640 / sample.naturalWidth);
      stage.hidden = false; stage.innerHTML = '';
      stage.appendChild(stamp(sample, sample.naturalWidth * s, sample.naturalHeight * s));
    };
    const redraw = () => { listFiles(inbox, files, i => { files.splice(i, 1); redraw(); }); go.disabled = !files.length; };
    onFiles(root, async fs => {
      files = files.concat(fs.filter(f => f.type.startsWith('image')));
      redraw(); sample = await loadImage(files[0]); preview();
    });
    ['size', 'op'].forEach(k => bindSlider(root, k, '%', preview));
    ['txt', 'pos'].forEach(k => $('#' + k, root).addEventListener('input', preview));
    remember('add-watermark', $('#txt', root), 'txt');
    go.onclick = async () => {
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Applying…';
      const items = [];
      for (const f of files) {
        const img = await loadImage(f);
        const blob = await toBlob(stamp(img, img.naturalWidth, img.naturalHeight), 'image/jpeg', 0.92);
        items.push({ blob, name: stem(f.name) + '-signed.jpg', thumb: URL.createObjectURL(blob), note: bytes(blob.size) });
      }
      results($('#out', root), items, 'signed-photos.zip');
      go.disabled = false; go.innerHTML = icon('drop') + 'Apply to all';
    };
  }
});

T.tool({
  id: 'color-palette', cat: 'image', icon: 'palette',
  name: 'Pull the colour palette', tagline: 'The dominant colours of a photo, in HEX and RGB.',
  keywords: 'palette colour color dominant hex rgb extract swatches',
  ui: () => `
    ${dropzone('Drop an image', 'Pulls out eight representative colours', 'image/*', false)}
    <div class="stage" id="stage" hidden></div>
    <div class="cards" id="out" style="margin-top:14px"></div>`,
  init(root) {
    onFiles(root, async fs => {
      const img = await loadImage(fs[0]);
      const stage = $('#stage', root);
      stage.hidden = false; stage.innerHTML = '';
      stage.appendChild(drawTo(img, Math.min(560, img.naturalWidth), Math.min(560, img.naturalWidth) * img.naturalHeight / img.naturalWidth));
      const c = drawTo(img, 140, Math.max(1, Math.round(140 * img.naturalHeight / img.naturalWidth)));
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const buckets = new Map();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 120) continue;
        const key = [d[i], d[i + 1], d[i + 2]].map(v => Math.round(v / 26) * 26).join(',');
        const b = buckets.get(key) || { n: 0, r: 0, g: 0, bl: 0 };
        b.n++; b.r += d[i]; b.g += d[i + 1]; b.bl += d[i + 2];
        buckets.set(key, b);
      }
      const top = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 8);
      const total = c.width * c.height;
      $('#out', root).innerHTML = top.map(b => {
        const r = Math.round(b.r / b.n), g = Math.round(b.g / b.n), bl = Math.round(b.bl / b.n);
        const hex = '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
        return `<button class="tcard" data-hex="${hex}" style="cursor:pointer;text-align:left;font:inherit;color:inherit">
          <span class="ic" style="background:${hex};border-color:${hex}"></span>
          <span><h3 class="mono">${hex}</h3><p>rgb(${r}, ${g}, ${bl}) &middot; ${(b.n / total * 100).toFixed(1)}% of the image</p></span></button>`;
      }).join('');
      $$('[data-hex]', root).forEach(el => el.onclick = () => T.copy(el.dataset.hex, el.dataset.hex));
    });
  }
});

T.tool({
  id: 'favicon', cat: 'image', icon: 'stack',
  name: 'Generate favicons', tagline: 'Every size a site asks for, bundled in a ZIP.',
  keywords: 'favicon icon web apple touch icon 512 192 32',
  ui: () => `
    ${dropzone('Drop your logo', 'Square, with a little padding; PNG or rasterised SVG', 'image/*', false)}
    <div class="stage" id="stage" hidden></div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('stack')}Build the pack</button></div>
    <div class="filelist" id="out"></div>
    <div class="note">${icon('info')}<span>You get 16, 32, 48, 180, 192 and 512 px, plus the HTML snippet to paste into your <code>head</code>.</span></div>`,
  init(root) {
    let img = null;
    const go = $('#go', root);
    onFiles(root, async fs => {
      img = await loadImage(fs[0]);
      const st = $('#stage', root); st.hidden = false; st.innerHTML = ''; st.appendChild(drawTo(img, 128, 128));
      go.disabled = false;
    });
    go.onclick = async () => {
      const sizes = [16, 32, 48, 180, 192, 512];
      const items = [];
      for (const s of sizes) {
        const blob = await toBlob(drawTo(img, s, s), 'image/png');
        items.push({ blob, name: `favicon-${s}x${s}.png`, thumb: URL.createObjectURL(blob), note: `${s}\u00d7${s} \u00b7 ${bytes(blob.size)}` });
      }
      const html = `<link rel="icon" href="/favicon-32x32.png" sizes="32x32">
<link rel="icon" href="/favicon-192x192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/favicon-180x180.png">`;
      items.push({ blob: new Blob([html], { type: 'text/html' }), name: 'paste-into-head.html', note: 'HTML snippet' });
      results($('#out', root), items, 'favicons.zip');
    };
  }
});

/* ==========================================================  VIDEO  ========================================================== */

const canRecord = () => !!window.MediaRecorder;
const videoNote = `<div class="note">${icon('info')}<span>Video is re-encoded by playing it through, so the job takes
  roughly as long as the selected clip. Keep the tab visible while it runs.</span></div>`;

/* player with an in/out selection, shared by several tools */
function trimmer(root, { onReady } = {}) {
  const box = $('#player', root);
  let video = null, dur = 0, a = 0, b = 0;
  const setLabels = () => {
    $('#tin', root).textContent = secs(a);
    $('#tout', root).textContent = secs(b);
    $('#tlen', root).textContent = secs(b - a);
  };
  return {
    get range() { return { start: a, end: b, duration: dur }; },
    get video() { return video; },
    async load(file) {
      video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true; video.playsInline = true; video.preload = 'metadata';
      box.hidden = false; box.innerHTML = ''; box.appendChild(video);
      await new Promise(r => video.onloadedmetadata = r);
      dur = video.duration; a = 0; b = dur;
      const s1 = $('#ra', root), s2 = $('#rb', root);
      [s1, s2].forEach(s => { s.max = Math.floor(dur * 100); s.step = 1; });
      s1.value = 0; s2.value = Math.floor(dur * 100);
      s1.oninput = () => { a = Math.min(+s1.value / 100, b - .2); s1.value = Math.round(a * 100); video.currentTime = a; setLabels(); };
      s2.oninput = () => { b = Math.max(+s2.value / 100, a + .2); s2.value = Math.round(b * 100); video.currentTime = b; setLabels(); };
      $('#rangewrap', root).hidden = false;
      setLabels();
      onReady?.(video, file);
    }
  };
}
const rangeUI = () => `
  <div id="rangewrap" hidden>
    <div class="grid2">
      <div class="field"><div class="slider-head"><label class="lb">Starts at</label><b id="tin">0:00</b></div>
        <input type="range" id="ra" min="0" value="0"></div>
      <div class="field"><div class="slider-head"><label class="lb">Ends at</label><b id="tout">0:00</b></div>
        <input type="range" id="rb" min="0" value="0"></div>
    </div>
    <p class="tiny dim" style="margin:8px 0 0">Selected length: <b id="tlen" class="mono">0:00</b></p>
  </div>`;
const progressUI = () => `<div id="prog" hidden><div class="bar-meter"><i></i></div>
  <p class="tiny dim" id="progtxt" style="margin:8px 0 0"></p></div>`;
function progressBar(root) {
  const wrap = $('#prog', root), bar = $('#prog i', root), txt = $('#progtxt', root);
  return {
    start(msg) { wrap.hidden = false; bar.style.width = '0%'; txt.textContent = msg; },
    set(p, msg) { bar.style.width = clamp(p * 100, 0, 100).toFixed(1) + '%'; if (msg) txt.textContent = msg; },
    done(msg) { bar.style.width = '100%'; txt.textContent = msg || 'Done'; }
  };
}

T.tool({
  id: 'trim-video', cat: 'video', icon: 'scissors', isNew: true,
  name: 'Trim video', tagline: 'Keep the part that matters and drop the rest.',
  keywords: 'trim cut video clip shorten split section',
  ui: () => `
    ${dropzone('Drop a video', 'MP4, MOV, WebM - whatever your browser can open', 'video/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid2" style="margin-top:14px">
      <div><label class="lb" for="fmt">Output format</label><select id="fmt">
        <option value="webm">WebM &middot; works everywhere in Chrome/Firefox</option>
        <option value="mp4">MP4 &middot; if your browser allows it</option></select></div>
      <div><label class="lb">&nbsp;</label><label class="opt"><input type="checkbox" id="mute"> Drop the audio</label></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('scissors')}Trim</button></div>
    ${progressUI()}
    <div class="filelist" id="out"></div>
    ${videoNote}`,
  init(root) {
    let file = null;
    const go = $('#go', root), pb = progressBar(root);
    const tr = trimmer(root, { onReady: () => go.disabled = false });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    go.onclick = async () => {
      if (!canRecord()) return toast('This browser cannot record video', true);
      const { start, end } = tr.range;
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Trimming…';
      pb.start('Processing in real time…');
      try {
        const r = await reencodeVideo(file, {
          start, end, mute: $('#mute', root).checked, format: $('#fmt', root).value, bitrate: 4_000_000
        }, p => pb.set(p, `${Math.round(p * 100)}% \u00b7 ${secs((end - start) * (1 - p))} left`));
        pb.done('Trim finished');
        const ext = r.mime.includes('mp4') ? 'mp4' : 'webm';
        results($('#out', root), [{
          blob: r.blob, name: `${stem(file.name)}-trimmed.${ext}`,
          note: `${secs(end - start)} \u00b7 ${r.width}\u00d7${r.height} \u00b7 ${bytes(r.blob.size)}`
        }]);
      } catch (e) { toast(e.message, true); }
      go.disabled = false; go.innerHTML = icon('scissors') + 'Trim';
    };
  },
  info: `<h2>Why it takes as long as the clip</h2>
    <p>The browser plays the video onto a canvas and records the output with <code>MediaRecorder</code>, the same
    engine behind video calls. That forces real time, but it also means there is no queue and no waiting room.</p>
    <p>For long trims keep the tab in the foreground: if the browser puts it to sleep, the recording pauses with it.</p>`,
  faq: [['Does it lose quality?', 'A little, because the clip is re-encoded. At 4 Mbps it holds up well to 1080p. If you need a lossless cut, that is a job for a desktop app.']]
});

T.tool({
  id: 'compress-video', cat: 'video', icon: 'shrink', isNew: true,
  name: 'Compress video', tagline: 'Drop the resolution and bitrate until it fits wherever it needs to go.',
  keywords: 'compress video reduce size mb whatsapp email attachment',
  ui: () => `
    ${dropzone('Drop the video to compress', 'Handy for email and messaging limits', 'video/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid2" style="margin-top:14px">
      <div><label class="lb" for="res">Resolution</label><select id="res">
        <option value="0">Leave as is</option><option value="1280" selected>720p &middot; 1280 px</option>
        <option value="854">480p &middot; 854 px</option><option value="640">360p &middot; 640 px</option></select></div>
      <div><label class="lb" for="br">Quality</label><select id="br">
        <option value="4000000">High &middot; 4 Mbps</option><option value="2000000" selected>Medium &middot; 2 Mbps</option>
        <option value="1000000">Light &middot; 1 Mbps</option><option value="500000">Minimum &middot; 0.5 Mbps</option></select></div>
    </div>
    <label class="opt" style="margin-top:12px"><input type="checkbox" id="mute"> No audio (saves a bit more)</label>
    <div class="actions"><button class="btn" id="go" disabled>${icon('shrink')}Compress</button>
      <span class="tiny dim" id="est"></span></div>
    ${progressUI()}
    <div class="filelist" id="out"></div>
    ${videoNote}`,
  init(root) {
    let file = null;
    const go = $('#go', root), pb = progressBar(root), est = $('#est', root);
    const tr = trimmer(root, { onReady: () => { go.disabled = false; guess(); } });
    const guess = () => {
      if (!file) return;
      const { start, end } = tr.range;
      const kb = (+$('#br', root).value / 8) * (end - start);
      est.textContent = `Roughly ${bytes(kb)} of output`;
    };
    ['res', 'br'].forEach(k => { remember('compress-video', $('#' + k, root), k); $('#' + k, root).addEventListener('change', guess); });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    go.onclick = async () => {
      const { start, end } = tr.range;
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Compressing…';
      pb.start('Re-encoding…');
      try {
        const r = await reencodeVideo(file, {
          start, end, width: +$('#res', root).value || null, bitrate: +$('#br', root).value,
          mute: $('#mute', root).checked
        }, p => pb.set(p, `${Math.round(p * 100)}% \u00b7 ${secs((end - start) * (1 - p))} left`));
        const cut = Math.round((1 - r.blob.size / file.size) * 100);
        pb.done('Finished');
        results($('#out', root), [{
          blob: r.blob, name: `${stem(file.name)}-compressed.webm`,
          note: `${r.width}\u00d7${r.height} \u00b7 ${bytes(file.size)} \u2192 ${bytes(r.blob.size)}`,
          badge: cut > 0 ? `-${cut}%` : 'no gain', badgeOk: cut > 0
        }]);
      } catch (e) { toast(e.message, true); }
      go.disabled = false; go.innerHTML = icon('shrink') + 'Compress';
    };
  },
  info: `<h2>Which setting to touch first</h2>
    <p>Resolution wins: going from 1080p to 720p already removes more than half the weight and nobody notices on a
    phone. Bitrate fine-tunes the rest. For a screen recording or a talking head, 1 Mbps at 720p is plenty; with fast
    motion such as sport or gameplay, stay at 2 Mbps or higher or you will see blocking.</p>`
});

T.tool({
  id: 'convert-video', cat: 'video', icon: 'video', isNew: true,
  name: 'Convert video', tagline: 'Move a clip to WebM or MP4 and set the frame rate.',
  keywords: 'convert video mp4 webm format fps change',
  ui: () => `
    ${dropzone('Drop the video', 'Converted with the browser encoder', 'video/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid3" style="margin-top:14px">
      <div><label class="lb" for="fmt">Output</label><select id="fmt">
        <option value="webm">WebM (VP9)</option><option value="mp4">MP4 (H.264)</option></select></div>
      <div><label class="lb" for="fps">Frames per second</label><select id="fps">
        <option value="30" selected>30 fps</option><option value="24">24 fps &middot; cinematic</option><option value="15">15 fps &middot; light</option></select></div>
      <div><label class="lb" for="br">Bitrate</label><select id="br">
        <option value="6000000">6 Mbps</option><option value="3000000" selected>3 Mbps</option><option value="1500000">1.5 Mbps</option></select></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('video')}Convert</button>
      <span class="tiny dim" id="supp"></span></div>
    ${progressUI()}
    <div class="filelist" id="out"></div>
    ${videoNote}`,
  init(root) {
    let file = null;
    const go = $('#go', root), pb = progressBar(root);
    const tr = trimmer(root, { onReady: () => go.disabled = false });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    const mp4ok = window.MediaRecorder && MediaRecorder.isTypeSupported('video/mp4');
    $('#supp', root).textContent = mp4ok ? 'This browser can write MP4' : 'This browser only writes WebM, so that is what you will get';
    go.onclick = async () => {
      const { start, end } = tr.range;
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Converting…';
      pb.start('Converting…');
      try {
        const r = await reencodeVideo(file, {
          start, end, fps: +$('#fps', root).value, bitrate: +$('#br', root).value, format: $('#fmt', root).value
        }, p => pb.set(p, `${Math.round(p * 100)}%`));
        pb.done('Conversion finished');
        const ext = r.mime.includes('mp4') ? 'mp4' : 'webm';
        results($('#out', root), [{ blob: r.blob, name: `${stem(file.name)}.${ext}`, note: `${r.width}\u00d7${r.height} \u00b7 ${bytes(r.blob.size)}` }]);
      } catch (e) { toast(e.message, true); }
      go.disabled = false; go.innerHTML = icon('video') + 'Convert';
    };
  }
});

T.tool({
  id: 'video-to-gif', cat: 'video', icon: 'gif', isNew: true,
  name: 'Video to GIF', tagline: 'A short clip turned into an animated GIF, with a hand-written encoder.',
  keywords: 'gif animated video to gif meme loop',
  ui: () => `
    ${dropzone('Drop the video', 'Good GIFs run between two and six seconds', 'video/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid3" style="margin-top:14px">
      <div><label class="lb" for="w">Width</label><select id="w">
        <option value="480">480 px</option><option value="360" selected>360 px</option><option value="240">240 px</option></select></div>
      <div><label class="lb" for="fps">Frames per second</label><select id="fps">
        <option value="15">15 &middot; smooth</option><option value="10" selected>10 &middot; balanced</option><option value="6">6 &middot; light</option></select></div>
      <div><label class="lb">&nbsp;</label><span class="tiny dim" id="warn"></span></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('gif')}Create GIF</button></div>
    ${progressUI()}
    <div class="stage" id="gifout" hidden></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let file = null;
    const go = $('#go', root), pb = progressBar(root);
    const tr = trimmer(root, { onReady: () => go.disabled = false });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    go.onclick = async () => {
      const { start, end } = tr.range;
      const fps = +$('#fps', root).value, W = +$('#w', root).value;
      const total = Math.min(Math.round((end - start) * fps), 300);
      if (end - start > 15) toast('Over 15 s makes a huge GIF, so it will be cut to 15 s');
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Extracting…';
      pb.start('Pulling frames…');
      const v = await loadVideo(file);
      const H = Math.round(W * v.videoHeight / v.videoWidth / 2) * 2;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const frames = [];
      const stop = Math.min(end, start + 15);
      for (let i = 0; i < total; i++) {
        const t = start + (stop - start) * i / total;
        await seekTo(v, t);
        ctx.drawImage(v, 0, 0, W, H);
        frames.push(ctx.getImageData(0, 0, W, H).data);
        pb.set(i / total, `Frame ${i + 1} of ${total}`);
      }
      pb.set(1, 'Encoding the GIF…');
      await new Promise(r => setTimeout(r, 30));
      const blob = encodeGIF(frames, W, H, Math.round(100 / fps));
      pb.done(`GIF with ${frames.length} frames`);
      const st = $('#gifout', root);
      st.hidden = false; st.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Generated GIF">`;
      results($('#out', root), [{ blob, name: stem(file.name) + '.gif', note: `${W}\u00d7${H} \u00b7 ${frames.length} frames \u00b7 ${bytes(blob.size)}` }]);
      go.disabled = false; go.innerHTML = icon('gif') + 'Create GIF';
    };
  },
  info: `<h2>How not to end up with a 20 MB GIF</h2>
    <p>GIF dates from 1987 and allows only 256 colours per image, so the size runs away fast. Three rules: under six
    seconds, 360 px wide or less, and 10 frames per second. That keeps a typical clip between 1 and 3 MB.</p>
    <p>The encoder here - palette, LZW compression and block framing - is written from scratch, with no library
    downloaded to do it.</p>`
});

T.tool({
  id: 'video-frames', cat: 'video', icon: 'frames', isNew: true,
  name: 'Extract frames', tagline: 'Turn the video into still images and grab them as a ZIP.',
  keywords: 'frames stills screenshot video to images png thumbnail',
  ui: () => `
    ${dropzone('Drop the video', 'Pulls stills at even intervals', 'video/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid2" style="margin-top:14px">
      <div><label class="lb" for="n">How many frames</label><input type="number" id="n" value="12" min="1" max="120"></div>
      <div><label class="lb" for="fmt">Format</label><select id="fmt">
        <option value="image/jpeg">JPG &middot; light</option><option value="image/png">PNG &middot; lossless</option></select></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('frames')}Extract</button>
      <button class="btn sec" id="shot" disabled>${icon('play')}Grab the current frame</button></div>
    ${progressUI()}
    <div class="filelist" id="out"></div>`,
  init(root) {
    let file = null;
    const go = $('#go', root), shot = $('#shot', root), pb = progressBar(root);
    const tr = trimmer(root, { onReady: () => { go.disabled = false; shot.disabled = false; } });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    const grab = (v, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); return c; };
    shot.onclick = async () => {
      const v = tr.video;
      const blob = await toBlob(grab(v, v.videoWidth, v.videoHeight), $('#fmt', root).value, .92);
      download(blob, `${stem(file.name)}-${secs(v.currentTime).replace(':', 'm')}s.${$('#fmt', root).value.includes('png') ? 'png' : 'jpg'}`);
    };
    go.onclick = async () => {
      const { start, end } = tr.range, n = clamp(+$('#n', root).value, 1, 120);
      const fmt = $('#fmt', root).value, ext = fmt.includes('png') ? 'png' : 'jpg';
      go.disabled = true; pb.start('Extracting…');
      const v = await loadVideo(file);
      const items = [];
      for (let i = 0; i < n; i++) {
        const t = start + (end - start) * (n === 1 ? .5 : i / (n - 1));
        await seekTo(v, t);
        const blob = await toBlob(grab(v, v.videoWidth, v.videoHeight), fmt, .9);
        items.push({ blob, name: `frame-${String(i + 1).padStart(3, '0')}.${ext}`, thumb: URL.createObjectURL(blob), note: `${secs(t)} \u00b7 ${bytes(blob.size)}` });
        pb.set((i + 1) / n, `${i + 1} of ${n}`);
      }
      pb.done('Done');
      results($('#out', root), items, 'frames.zip');
      go.disabled = false;
    };
  }
});

T.tool({
  id: 'extract-audio', cat: 'video', icon: 'music', isNew: true,
  name: 'Extract the audio', tagline: 'Pull the sound out of a video as a WAV file.',
  keywords: 'extract audio video to mp3 wav sound track separate',
  ui: () => `
    ${dropzone('Drop the video', 'Works for trimming a plain audio file too', 'video/*,audio/*', false)}
    <div class="stage" id="player" hidden></div>
    ${rangeUI()}
    <div class="grid2" style="margin-top:14px">
      <div><label class="lb" for="ch">Channels</label><select id="ch">
        <option value="2">Stereo</option><option value="1">Mono &middot; half the size</option></select></div>
      <div><label class="lb" for="sr">Sample rate</label><select id="sr">
        <option value="44100">44,100 Hz &middot; CD quality</option><option value="22050">22,050 Hz &middot; speech</option></select></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('music')}Extract audio</button></div>
    ${progressUI()}
    <div class="filelist" id="out"></div>
    <div class="note">${icon('info')}<span>Output is lossless WAV, which every player understands. There is no MP3 option
    because the browser ships no MP3 encoder and adding one would mean pulling in an external library.</span></div>`,
  init(root) {
    let file = null;
    const go = $('#go', root), pb = progressBar(root);
    const tr = trimmer(root, { onReady: () => go.disabled = false });
    onFiles(root, fs => { file = fs[0]; if (file) tr.load(file); });
    const toWav = buf => {
      const ch = buf.numberOfChannels, len = buf.length * ch * 2 + 44;
      const ab = new ArrayBuffer(len), view = new DataView(ab);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); view.setUint32(4, len - 8, true); str(8, 'WAVEfmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
      view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
      view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true);
      str(36, 'data'); view.setUint32(40, len - 44, true);
      const chans = [];
      for (let i = 0; i < ch; i++) chans.push(buf.getChannelData(i));
      let off = 44;
      for (let i = 0; i < buf.length; i++)
        for (let c = 0; c < ch; c++) {
          const s = Math.max(-1, Math.min(1, chans[c][i]));
          view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
        }
      return new Blob([ab], { type: 'audio/wav' });
    };
    go.onclick = async () => {
      const { start, end } = tr.range;
      go.disabled = true; pb.start('Decoding the audio…');
      try {
        const ac = new AudioContext();
        const decoded = await ac.decodeAudioData(await file.arrayBuffer());
        pb.set(.6, 'Trimming and mixing…');
        const ch = Math.min(+$('#ch', root).value, decoded.numberOfChannels);
        const sr = +$('#sr', root).value;
        const frames = Math.floor((end - start) * sr);
        const off = new OfflineAudioContext(ch, frames, sr);
        const src = off.createBufferSource();
        src.buffer = decoded; src.connect(off.destination);
        src.start(0, start, end - start);
        const out = await off.startRendering();
        const blob = toWav(out);
        pb.done('Audio ready');
        results($('#out', root), [{ blob, name: stem(file.name) + '.wav', note: `${secs(end - start)} \u00b7 ${ch === 1 ? 'mono' : 'stereo'} \u00b7 ${bytes(blob.size)}` }]);
        ac.close();
      } catch (e) { toast('The audio in that file could not be read', true); }
      go.disabled = false;
    };
  }
});

})();
