/* core.js - tool registry, routing, search and shared UI helpers */

window.ToolNez = (() => {

  /* ---------------------------------------------------------- DOM helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  const num = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const secs = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

  /* ---------------------------------------------------------- icons */
  const P = {
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l4.6-4.4a2 2 0 012.8 0L20 20"/>',
    shrink: '<path d="M4 4h5M4 4v5M4 4l6 6M20 20h-5M20 20v-5M20 20l-6-6"/><rect x="9" y="9" width="6" height="6" rx="1.2"/>',
    resize: '<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M20 10v9a1.5 1.5 0 01-1.5 1.5H10"/><path d="M13 13l6 6M19 15v4h-4"/>',
    crop: '<path d="M6 2v14.5A1.5 1.5 0 007.5 18H22"/><path d="M2 6h14.5A1.5 1.5 0 0118 7.5V22"/>',
    drop: '<path d="M12 3s6 6.2 6 10a6 6 0 01-12 0c0-3.8 6-10 6-10z"/><path d="M9.5 14.2a2.8 2.8 0 002.5 2.2"/>',
    palette: '<path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.5-2-.6-1.2.2-2.3 1.5-2.3H17a4 4 0 004-4c0-5-4-9.7-9-9.7z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.4" r="1"/><circle cx="15" cy="8.2" r="1"/>',
    star: '<path d="M12 3.6l2.5 5.2 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z"/>',
    video: '<rect x="2.5" y="5.5" width="14" height="13" rx="2.5"/><path d="M16.5 10.5l5-3v9l-5-3z"/>',
    scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6L20 18M20 6L8.2 16.4"/>',
    gif: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M11 9.5H9a2 2 0 00-2 2v1a2 2 0 002 2h1.3v-2M13.5 9.5v5M16 14.5v-5h3M16 12h2.3"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    frames: '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M8 3h11a2 2 0 012 2v11"/>',
    pdf: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 14h1.2a1.2 1.2 0 000-2.4H9V17"/>',
    stack: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/>',
    text: '<path d="M4 6h16M4 12h11M4 18h7"/>',
    markdown: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M6 15.5v-7l3 3.4 3-3.4v7M16 8.5v5M16 13.5l-1.8-2M16 13.5l1.8-2"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15.5 12v2.2"/>',
    hash: '<path d="M6 4.5L4.8 19.5M13 4.5L11.8 19.5M4 9h15.5M3.4 15h15.5"/>',
    code: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    scale: '<path d="M12 4v16M7 8h10"/><path d="M5 20h14"/><path d="M4 12l3-4 3 4a3 3 0 01-6 0zM14 12l3-4 3 4a3 3 0 01-6 0z"/>',
    bank: '<path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.6 10v8M14.4 10v8M19 10v8M3 20.5h18"/>',
    trend: '<path d="M3 17l5.5-5.5 3.5 3.5L21 6"/><path d="M15 6h6v6"/>',
    cake: '<path d="M4 20h16M5 20v-6a2 2 0 012-2h10a2 2 0 012 2v6"/><path d="M12 12V8M9 8V6M15 8V6"/>',
    ruler: '<rect x="2" y="8" width="20" height="8" rx="2" transform="rotate(-8 12 12)"/><path d="M6.5 9.5v3M10 9v3M13.5 8.5v3M17 8v3"/>',
    plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
    link: '<path d="M10 13.5a4 4 0 006 .5l2-2a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10.5a4 4 0 00-6-.5l-2 2a4 4 0 005.7 5.7l1-1"/>',
    braces: '<path d="M8 4c-2 0-2 3-2 4s0 2.5-2 4c2 1.5 2 3 2 4s0 4 2 4M16 4c2 0 2 3 2 4s0 2.5 2 4c-2 1.5-2 3-2 4s0 4-2 4"/>',
    divide: '<circle cx="12" cy="6.5" r="1.3"/><circle cx="12" cy="17.5" r="1.3"/><path d="M5 12h14"/>',
    download: '<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5"/><path d="M4 18v2.5h16V18"/>',
    upload: '<path d="M12 16V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 17v3h16v-3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/>',
    eraser: '<path d="M8.5 20H20"/><path d="M15.5 4.5l4 4a1.6 1.6 0 010 2.3l-7.2 7.2H8.6l-3.1-3.1a1.6 1.6 0 010-2.3l7.7-7.7a1.6 1.6 0 012.3 0z"/><path d="M10.2 7.8l6 6"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>'
  };
  const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.info}</svg>`;

  /* ---------------------------------------------------------- categories */
  const CATS = {
    image: { name: 'Image', blurb: 'Convert, compress and retouch photos without installing anything.' },
    video: { name: 'Video', blurb: 'Trim, compress and export clips straight from the browser.' },
    pdf: { name: 'PDF', blurb: 'Put documents together and take them apart again.' },
    text: { name: 'Text', blurb: 'Write, count and tidy up. The boring part, done fast.' },
    calc: { name: 'Calculators', blurb: 'Everyday numbers: money, health, units and dates.' },
    util: { name: 'Utilities', blurb: 'Passwords, hashes and the developer odds and ends you reach for daily.' }
  };
  const CAT_ORDER = ['image', 'video', 'pdf', 'text', 'calc', 'util'];

  /* ---------------------------------------------------------- registry */
  const TOOLS = [];
  const tool = def => { TOOLS.push(def); return def; };
  const find = id => TOOLS.find(t => t.id === id);

  /* ---------------------------------------------------------- local state */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('tn.' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tn.' + k, JSON.stringify(v)); } catch { } }
  };
  const favs = () => store.get('favs', []);
  const toggleFav = id => {
    const f = favs(), i = f.indexOf(id);
    i < 0 ? f.push(id) : f.splice(i, 1);
    store.set('favs', f);
    return i < 0;
  };
  const pushRecent = id => {
    const r = store.get('recent', []).filter(x => x !== id);
    r.unshift(id); store.set('recent', r.slice(0, 6));
  };

  /* ---------------------------------------------------------- notices */
  let toastT;
  function toast(msg, bad = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('bad', !!bad);
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function download(blob, name) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 8000);
    toast('Saved: ' + name);
  }
  async function copy(text, what = 'Content') {
    try { await navigator.clipboard.writeText(text); toast(what + ' copied'); }
    catch { toast('Your browser blocked the clipboard', true); }
  }

  /* ---------------------------------------------------------- files */
  function dropzone(label = 'Drag your files here', hint = 'or click to pick them', accept = '*/*', multiple = true) {
    return `<div class="dropzone" data-dz tabindex="0" role="button">
      ${icon('upload')}<b>${label}</b><span>${hint}</span>
      <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} hidden>
    </div>`;
  }
  function onFiles(root, cb) {
    const dz = $('[data-dz]', root); if (!dz) return;
    const input = $('input[type=file]', dz);
    const fire = list => { const f = [...list]; if (f.length) cb(f); };
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', () => { fire(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('over')));
    dz.addEventListener('drop', e => { e.preventDefault(); fire(e.dataTransfer.files); });
    // dropping anywhere on the panel works too
    const box = dz.closest('.box') || root;
    box.addEventListener('dragover', e => e.preventDefault());
    box.addEventListener('drop', e => { e.preventDefault(); fire(e.dataTransfer.files); });
  }
  const loadImage = file => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Not a readable image: ' + file.name));
    i.src = URL.createObjectURL(file);
  });
  const drawTo = (img, w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  const toBlob = (canvas, type, q) => new Promise(r => canvas.toBlob(r, type, q));
  const stem = n => n.replace(/\.[^.]+$/, '');

  /* Shared results panel: preview plus single or bundled download */
  function results(container, items, zipName) {
    if (!items.length) { container.innerHTML = ''; return; }
    container.innerHTML = items.map((it, i) => `
      <div class="frow">
        ${it.thumb ? `<img src="${it.thumb}" alt="">` : ''}
        <div class="meta"><b>${esc(it.name)}</b><span>${esc(it.note || '')}</span></div>
        ${it.badge ? `<span class="pill ${it.badgeOk ? 'good' : ''}">${esc(it.badge)}</span>` : ''}
        <button class="btn sm" data-get="${i}">${icon('download')}Save</button>
      </div>`).join('') +
      (items.length > 1 ? `<div class="actions"><button class="btn sec" data-zip>${icon('stack')}Download all ${items.length} as a ZIP</button></div>` : '');
    $$('[data-get]', container).forEach(b => b.onclick = () => {
      const it = items[+b.dataset.get]; download(it.blob, it.name);
    });
    const z = $('[data-zip]', container);
    if (z) z.onclick = async () => {
      z.disabled = true; z.innerHTML = '<i class="spin"></i>Zipping…';
      download(await makeZip(items.map(i => ({ name: i.name, blob: i.blob }))), zipName || 'toolnez.zip');
      z.disabled = false; z.innerHTML = icon('stack') + `Download all ${items.length} as a ZIP`;
    };
  }

  /* ---------------------------------------------------------- ads */
  /* Everything configurable lives in adsense.js */
  const ADS = window.ADSENSE || {};
  const AD_CLIENT = ADS.client || '';
  const AD_SLOTS = Object.assign({ h: '', m: '', r: '', side: '' }, ADS.slots || {});
  const AD_LIVE = !!ADS.live;

  /* Renders a real ad unit when AdSense is configured, an empty reserved box
     otherwise, so the layout never jumps once the ads go live. */
  function adUnit(size, format) {
    const slot = AD_SLOTS[size] || '';
    if (!AD_LIVE || !slot) return '';
    const extra = format === 'vertical'
      ? 'data-ad-format="vertical"'
      : 'data-ad-format="auto" data-full-width-responsive="true"';
    return `<ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}"
      data-ad-slot="${slot}" ${extra}></ins>`;
  }
  function ad(size = 'm', hint = '') {
    const unit = adUnit(size);
    /* Live but this position has no slot ID yet: render nothing, so the public
       site never shows empty boxes. Auto ads still fill the page. */
    if (!unit && AD_LIVE) return '';
    return `<div class="ad ad-${size}${unit ? ' live' : ''}">
      ${unit}
      ${unit ? '' : `<div class="slot">Ad space${hint ? ' \u00b7 ' + hint : ''}</div>`}
    </div>`;
  }
  function refreshAds() {
    if (!AD_LIVE) return;
    $$('.adsbygoogle').forEach(el => {
      if (el.dataset.filled) return;
      el.dataset.filled = '1';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { }
    });
  }

  /* ---------------------------------------------------------- views */
  const card = t => `
    <a class="tcard rise" href="#/t/${t.id}" data-link>
      <button class="fav ${favs().includes(t.id) ? 'on' : ''}" data-fav="${t.id}" title="Save to favourites" aria-label="Favourite">${icon('star')}</button>
      ${t.isNew ? '<span class="new-dot">new</span>' : ''}
      <span class="ic">${icon(t.icon)}</span>
      <span><h3>${t.name}</h3><p>${t.tagline}</p></span>
    </a>`;

  function homeView() {
    const rec = store.get('recent', []).map(find).filter(Boolean);
    const fv = favs().map(find).filter(Boolean);
    const shortcuts = (fv.length ? fv : rec).slice(0, 6);
    const sections = CAT_ORDER.map((k, i) => {
      const list = TOOLS.filter(t => t.cat === k);
      return `<section class="sect" id="${k}">
        <div class="sect-head">
          <div><h2>${CATS[k].name}</h2><p>${CATS[k].blurb}</p></div>
          <a href="#/c/${k}" data-link>See all ${list.length} &rarr;</a>
        </div>
        <div class="cards">${list.map(card).join('')}</div>
        ${i === 1 ? ad('h', 'leaderboard') : i === 3 ? ad('m') : ''}
      </section>`;
    }).join('');

    return `<div class="wrap">
      <section class="hero">
        <span class="kicker"><i></i>${TOOLS.length} tools &middot; free &middot; no sign-up</span>
        <h1>Every small job you keep looking up, in one place.</h1>
        <p class="lead">Converting an image, trimming a clip, building a PDF or working out a loan payment
        should take seconds, not a detour through three different sites. These tools are <b>free, unlimited
        and free of watermarks</b>, and they work just as well on a phone.</p>
        <div class="hero-actions">
          <a class="btn" href="#/c/image" data-link>${icon('image')}Start with images</a>
          <a class="btn sec" href="#/c/video" data-link>${icon('video')}Video tools</a>
        </div>
        ${shortcuts.length ? `<div class="recent"><span class="lbl">${fv.length ? 'Your favourites' : 'Pick up where you left off'}:</span>
          ${shortcuts.map(t => `<a class="chip" href="#/t/${t.id}" data-link>${icon(t.icon)}${t.name}</a>`).join('')}</div>` : ''}
      </section>
      ${ad('h', 'header')}
      ${sections}
      <section class="sect">
        <div class="sect-head"><div><h2>How this is put together</h2></div></div>
        <div class="cards">
          <div class="tcard"><span class="ic">${icon('shield')}</span><span><h3>No account, ever</h3>
            <p>Nothing to sign up for, nothing to verify. Open a tool, use it, close the tab.</p></span></div>
          <div class="tcard"><span class="ic">${icon('stack')}</span><span><h3>Batches and ZIPs</h3>
            <p>Drop twenty photos, convert them in one go and grab them all in a single archive.</p></span></div>
          <div class="tcard"><span class="ic">${icon('info')}</span><span><h3>It remembers your settings</h3>
            <p>Quality, format and size are kept for next time, so you are not re-picking the same options.</p></span></div>
          <div class="tcard"><span class="ic">${icon('key')}</span><span><h3>Free, paid for by ads</h3>
            <p>Advertising covers the hosting. There is no hidden paid tier and no daily limit.</p></span></div>
        </div>
      </section>
      ${ad('r', 'rectangle')}
    </div>`;
  }

  function catView(k) {
    const c = CATS[k]; if (!c) return homeView();
    const list = TOOLS.filter(t => t.cat === k);
    return `<div class="wrap">
      <div class="crumb"><a href="#/" data-link>Home</a> / <span>${c.name}</span></div>
      <section class="hero" style="padding:28px 0 22px">
        <h1>${c.name}</h1><p class="lead">${c.blurb}</p>
      </section>
      ${ad('h')}
      <div class="cards">${list.map(card).join('')}</div>
      ${ad('r')}
      <section class="sect">
        <div class="sect-head"><div><h2>Other sections</h2></div></div>
        <div class="cards">${CAT_ORDER.filter(x => x !== k).map(x => `
          <a class="tcard rise" href="#/c/${x}" data-link><span class="ic">${icon(TOOLS.find(t => t.cat === x)?.icon || 'info')}</span>
          <span><h3>${CATS[x].name}</h3><p>${CATS[x].blurb}</p></span></a>`).join('')}</div>
      </section>
    </div>`;
  }

  function toolView(t) {
    const siblings = TOOLS.filter(x => x.cat === t.cat && x.id !== t.id).slice(0, 5);
    const related = TOOLS.filter(x => x.cat === t.cat && x.id !== t.id).slice(0, 3);
    const faq = (t.faq || []).concat([
      ['Do I need an account?', 'No. There is no sign-up, no email and no limit on how often you use it.'],
      ['Is there a size limit?', 'The limit is your device memory rather than a rule we set. On phones it is worth staying under roughly 200 MB per file.']
    ]);
    return `<div class="wrap">
      <div class="crumb"><a href="#/" data-link>Home</a> / <a href="#/c/${t.cat}" data-link>${CATS[t.cat].name}</a> / <span>${t.name}</span></div>
      <div class="layout">
        <div>
          <div class="thead">
            <span class="ic">${icon(t.icon)}</span>
            <div><h1>${t.name}</h1><p>${t.tagline}</p></div>
            <button class="ghost-btn fav-big ${favs().includes(t.id) ? 'on' : ''}" data-fav="${t.id}" title="Save to favourites">${icon('star')}</button>
          </div>
          ${ad('h', 'tool header')}
          <div class="box" id="workbench">${t.ui()}</div>
          ${ad('m', 'below the result')}
          ${t.info ? `<div class="box prose">${t.info}</div>` : ''}
          ${ad('r', 'in content')}
          <div class="box">
            <h2>Common questions</h2>
            ${faq.map(([q, a], i) => `<details class="qa" ${i === 0 ? 'open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}
          </div>
          ${related.length ? `<section class="sect"><div class="sect-head"><div><h2>Carry on with</h2></div></div>
            <div class="cards">${related.map(card).join('')}</div></section>` : ''}
          ${ad('h', 'footer')}
        </div>
        <aside>
          ${ad('r', 'sidebar')}
          <div class="side-box">
            <h3>${CATS[t.cat].name}</h3>
            ${siblings.map(s => `<a class="side-link" href="#/t/${s.id}" data-link>${icon(s.icon)}${s.name}</a>`).join('')}
            <a class="side-link" href="#/c/${t.cat}" data-link>${icon('stack')}See all</a>
          </div>
          ${(() => { const u = adUnit('side', 'vertical');
            if (!u && AD_LIVE) return '';
            return `<div class="ad ad-side${u ? ' live' : ''}">${u || '<div class="slot">Ad space &middot; 300&times;600</div>'}</div>`; })()}
        </aside>
      </div>
    </div>`;
  }

  const PAGES = {
    'how-it-works': ['How it works', `
      <p>ToolNez is a single web app that leans on modern browser APIs rather than a pile of plugins:
      <code>Canvas</code> for images, <code>MediaRecorder</code> for video, <code>Web Audio</code> for sound
      and <code>Web Crypto</code> for passwords and hashes. The PDF, GIF and ZIP writers are small
      implementations included in <code>lib.js</code>.</p>
      <h2>What that means in practice</h2>
      <ul><li>Speed depends on your machine rather than on a queue, so small jobs finish instantly.</li>
      <li>Video is the one slow case: re-encoding plays the clip through, so it takes roughly as long as the clip lasts.</li>
      <li>Two tools (reading text or pages out of a PDF) pull in <strong>pdf.js</strong> from a CDN the first time.
      It is the only third-party piece in the whole site.</li></ul>
      <h2>Browser support</h2>
      <p>Recent Chrome, Edge, Firefox, Opera and Safari. Video exports as WebM or MP4 depending on what the browser
      can write; when an option is unavailable the interface disables it instead of failing halfway through.</p>`],
    changelog: ['What\'s new', `
      <h2>Now in English</h2>
      <p>The whole interface, every tool description and the help pages have been rewritten in English.</p>
      <h2>Retouching</h2>
      <p>Two additions: <em>remove objects from a photo</em>, with a hand-written diffusion fill, and
      <em>cover an area of a video</em>, which blurs, pixelates or blacks out a rectangle for the whole clip.
      Both are meant for material you own.</p>
      <h2>Video section</h2>
      <p>Seven tools: trim, compress, convert, video to GIF, frame extraction, audio extraction and area covering,
      all driven by the browser's own encoder.</p>
      <h2>Clean-up</h2>
      <p>The UUID generator, the CSS shadow and gradient builders, the URL encoder and the Lorem Ipsum generator
      are gone: barely used and cluttering the front page. The strength meter now lives inside the password
      generator, which is where it belongs.</p>
      <h2>Comfort</h2>
      <p>Favourites, a history of recent tools, keyboard search (press <code>/</code>), ZIP downloads for batches,
      remembered settings and progress bars on the slow jobs.</p>`],
    privacy: ['Privacy', `
      <p>We do not keep the files you work with and we do not ask you to create an account, so there is no profile
      attached to you here. The only things saved are your theme preference, your favourites and each tool's
      settings, all in your browser's <code>localStorage</code>. Clearing the site data removes them.</p>
      <h2>Advertising</h2>
      <p>We use Google AdSense. Google and its partners may use cookies to serve ads based on your visits to this
      and other sites. You can turn off personalised advertising in
      <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google's ad settings</a>.</p>
      <h2>Third parties</h2>
      <p>The pdf.js library is fetched from cdnjs, and only if you open one of the PDF reading tools.</p>
      <h2>Contact</h2>
      <p>Questions about any of this: <strong>elmillodel2029@gmail.com</strong>.</p>`],
    terms: ['Terms', `
      <p>The service is provided as is, with no warranty. The calculators are indicative: they are not a substitute
      for medical, tax or financial advice. Always sanity-check a result before relying on it for something that matters.</p>
      <p>You are responsible for the content you process and for having the right to process it. The retouching tools
      are intended for your own material.</p>`],
    cookies: ['Cookies and ads', `
      <p>Ours: no tracking cookies. Just <code>localStorage</code> for theme, favourites and tool settings.</p>
      <p>Third party: whatever Google AdSense sets in order to measure and personalise advertising. See the
      <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">Google partner sites policy</a>.</p>`],
    contact: ['Contact', `
      <p>If something is broken, if a tool you need is missing, or if you just want to say you use this every day,
      write to <strong>elmillodel2029@gmail.com</strong>. Bug reports that mention the browser and the type of file
      are the ones that actually help.</p>`]
  };
  function pageView(k) {
    const p = PAGES[k]; if (!p) return homeView();
    return `<div class="wrap">
      <div class="crumb"><a href="#/" data-link>Home</a> / <span>${p[0]}</span></div>
      <div class="layout" style="grid-template-columns:minmax(0,1fr) 300px">
        <div><h1 style="margin:16px 0 18px">${p[0]}</h1><div class="box prose">${p[1]}</div>${ad('m')}</div>
        <aside>${ad('r', 'sidebar')}</aside>
      </div></div>`;
  }

  /* ---------------------------------------------------------- routing */
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const main = $('#main');
    let html, current = null;

    if (!parts.length) html = homeView();
    else if (parts[0] === 'c') html = catView(parts[1]);
    else if (parts[0] === 'p') html = pageView(parts[1]);
    else if (parts[0] === 't' && find(parts[1])) { current = find(parts[1]); html = toolView(current); }
    else html = `<div class="wrap"><section class="hero"><h1>This page does not exist</h1>
      <p class="lead">The tool may have been retired. Try the
      <a href="#/" data-link style="color:var(--brand)">front page</a> or the search box above.</p></section></div>`;

    main.innerHTML = html;
    window.scrollTo(0, 0);
    reveal();
    refreshAds();
    hookFavs();
    markNav(parts);

    if (current) {
      document.title = `${current.name} · ToolNez`;
      pushRecent(current.id);
      try { current.init($('#workbench')); }
      catch (e) { console.error(e); toast('Something went wrong opening this tool', true); }
    } else {
      document.title = 'ToolNez · Image, video and PDF tools that just work';
    }
  }
  function markNav(parts) {
    const key = parts[0] === 'c' ? parts[1] : parts[0] === 't' ? find(parts[1])?.cat : '';
    $$('#links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/c/' + key));
  }
  let obs;
  function reveal() {
    obs?.disconnect();
    obs = new IntersectionObserver(en => en.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('seen'); obs.unobserve(e.target); }
    }), { rootMargin: '0px 0px -40px 0px' });
    $$('.rise').forEach((el, i) => { el.style.transitionDelay = Math.min(i, 6) * 35 + 'ms'; obs.observe(el); });
  }
  function hookFavs() {
    $$('[data-fav]').forEach(b => b.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const on = toggleFav(b.dataset.fav);
      b.classList.toggle('on', on);
      toast(on ? 'Added to favourites' : 'Removed from favourites');
    });
  }

  /* ---------------------------------------------------------- search */
  function setupSearch() {
    const input = $('#q'), box = $('#qres');
    let items = [], sel = -1;
    const close = () => { box.classList.remove('on'); sel = -1; };
    const paint = list => {
      items = list;
      box.innerHTML = list.length
        ? list.map(t => `<a href="#/t/${t.id}" data-link><span class="ic">${icon(t.icon)}</span>
            <span><b>${t.name}</b><span>${CATS[t.cat].name} · ${t.tagline}</span></span></a>`).join('')
        : `<a class="dim" style="padding:12px">Nothing by that name. Try &ldquo;pdf&rdquo;, &ldquo;gif&rdquo; or &ldquo;loan&rdquo;.</a>`;
      box.classList.add('on');
    };
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) return close();
      const score = t => {
        const n = t.name.toLowerCase();
        if (n.startsWith(q)) return 0;
        if (n.includes(q)) return 1;
        if ((t.keywords || '').includes(q)) return 2;
        if (t.tagline.toLowerCase().includes(q)) return 3;
        return 99;
      };
      paint(TOOLS.map(t => [t, score(t)]).filter(x => x[1] < 99).sort((a, b) => a[1] - b[1]).slice(0, 7).map(x => x[0]));
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.blur(); close(); return; }
      if (!box.classList.contains('on') || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        $$('a', box).forEach((a, i) => a.classList.toggle('sel', i === sel));
      } else if (e.key === 'Enter' && sel >= 0) {
        location.hash = '#/t/' + items[sel].id; input.value = ''; input.blur(); close();
      }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.finder')) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus(); input.select();
      }
    });
  }

  /* ---------------------------------------------------------- boot */
  function start() {
    const saved = store.get('theme', null);
    const theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(theme);
    $('#theme').onclick = () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next); store.set('theme', next);
    };
    $('#burger').onclick = () => $('#links').classList.toggle('open');
    $('#yr').textContent = new Date().getFullYear();
    $('#ntools').textContent = TOOLS.length;
    document.addEventListener('click', e => {
      if (e.target.closest('a[data-link]')) $('#links').classList.remove('open');
    });
    addEventListener('scroll', () => {
      const d = document.documentElement;
      $('#progress').style.width = (d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight) * 100) + '%';
    }, { passive: true });
    addEventListener('hashchange', route);
    setupSearch();
    route();
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('#theme').innerHTML = t === 'light'
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>';
  }

  return {
    // registry
    tool, start, TOOLS, CATS,
    // dom
    $, $$, esc, icon, bytes, num, clamp, secs,
    // io
    toast, download, copy, dropzone, onFiles, loadImage, drawTo, toBlob, stem, results, store
  };
})();
