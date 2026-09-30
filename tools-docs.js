/* tools-docs.js - PDF and text tools */
(() => {
const T = ToolNez;
const { $, $$, esc, icon, bytes, secs, toast, download, copy, dropzone, onFiles,
        loadImage, drawTo, toBlob, stem, results, store, clamp } = T;

/* ----------------------------------------------------------------- PDF */

async function jpegForPdf(file, maxW = 1654) {
  const img = await loadImage(file);
  let w = img.naturalWidth, h = img.naturalHeight;
  if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  const blob = await toBlob(drawTo(img, w, h), 'image/jpeg', .88);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}

T.tool({
  id: 'images-to-pdf', cat: 'pdf', icon: 'pdf',
  name: 'Images to PDF', tagline: 'Loose photos or scans turned into one document.',
  keywords: 'jpg to pdf images pdf scan merge combine document',
  ui: () => `
    ${dropzone('Drop your images', 'Each one becomes a page, and you can reorder them after', 'image/*')}
    <div class="filelist" id="pages"></div>
    <div class="grid3">
      <div><label class="lb" for="size">Page size</label><select id="size">
        <option value="a4">A4</option><option value="letter">Letter</option><option value="fit">Fit the photo</option></select></div>
      <div><label class="lb" for="orient">Orientation</label><select id="orient">
        <option value="auto">Automatic</option><option value="p">Portrait</option><option value="l">Landscape</option></select></div>
      <div><label class="lb" for="margin">Margin (pt)</label><input type="number" id="margin" value="20" min="0" max="120"></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('pdf')}Build the PDF</button>
      <button class="btn sec" id="clear">Clear</button></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let files = [];
    const list = $('#pages', root), go = $('#go', root);
    const redraw = () => {
      go.disabled = !files.length;
      list.innerHTML = files.map((f, i) => `
        <div class="frow">
          <img src="${URL.createObjectURL(f)}" alt="">
          <div class="meta"><b>Page ${i + 1} &middot; ${esc(f.name)}</b><span>${bytes(f.size)}</span></div>
          <button class="btn sm sec" data-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn sm sec" data-dn="${i}" ${i === files.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="x" data-rm="${i}">✕</button>
        </div>`).join('');
      $$('[data-rm]', list).forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); redraw(); });
      $$('[data-up]', list).forEach(b => b.onclick = () => { const i = +b.dataset.up;[files[i - 1], files[i]] = [files[i], files[i - 1]]; redraw(); });
      $$('[data-dn]', list).forEach(b => b.onclick = () => { const i = +b.dataset.dn;[files[i + 1], files[i]] = [files[i], files[i + 1]]; redraw(); });
    };
    onFiles(root, fs => { files = files.concat(fs.filter(f => f.type.startsWith('image'))); redraw(); });
    $('#clear', root).onclick = () => { files = []; redraw(); $('#out', root).innerHTML = ''; };
    go.onclick = async () => {
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Assembling…';
      const size = $('#size', root).value, orient = $('#orient', root).value, m = +$('#margin', root).value;
      const items = [];
      for (const f of files) {
        const im = await jpegForPdf(f);
        let W, H;
        if (size === 'fit') { W = im.w; H = im.h; }
        else {
          const base = size === 'a4' ? [595.28, 841.89] : [612, 792];
          const land = orient === 'l' || (orient === 'auto' && im.w > im.h);
          [W, H] = land ? [base[1], base[0]] : base;
        }
        const r = Math.min((W - 2 * m) / im.w, (H - 2 * m) / im.h);
        const pw = im.w * r, ph = im.h * r;
        items.push({ ...im, W: W.toFixed(2), H: H.toFixed(2), pw: pw.toFixed(2), ph: ph.toFixed(2), x: ((W - pw) / 2).toFixed(2), y: ((H - ph) / 2).toFixed(2) });
      }
      const blob = pdfFromImages(items);
      results($('#out', root), [{ blob, name: 'document.pdf', note: `${items.length} page${items.length === 1 ? '' : 's'} \u00b7 ${bytes(blob.size)}` }]);
      go.disabled = false; go.innerHTML = icon('pdf') + 'Build the PDF';
    };
  },
  info: `<h2>What people actually use this for</h2>
    <p>The usual case: someone asks for your ID, a signed contract or three receipts "as a single PDF" and all you have
    is phone photos. Drop them in, put them in order, done. A4 portrait with a 20 point margin looks close enough to a
    proper scan.</p>
    <p>The file is built by a small generator that embeds each photo as JPEG inside the PDF, so the result weighs about
    the same as the images together and opens in any reader.</p>`,
  faq: [['Can I put several photos on one page?', 'Not yet - each image takes a page of its own. If you need a grid, build the collage first and add it as a single image.']]
});

/* pdf.js on demand (the only third-party dependency on the site) */
let pdfjs = null;
function loadPdfjs() {
  if (pdfjs) return pdfjs;
  pdfjs = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      const L = window.pdfjsLib;
      L.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      res(L);
    };
    s.onerror = () => { pdfjs = null; rej(new Error('Could not load the PDF reader - check your connection')); };
    document.head.appendChild(s);
  });
  return pdfjs;
}

T.tool({
  id: 'pdf-to-images', cat: 'pdf', icon: 'image',
  name: 'PDF to images', tagline: 'Every page as a PNG, one by one or zipped.',
  keywords: 'pdf to jpg png pages export image convert',
  ui: () => `
    ${dropzone('Drop a PDF', 'Converted page by page', 'application/pdf', false)}
    <div class="filelist" id="inbox"></div>
    <div class="grid2">
      <div><label class="lb" for="sc">Resolution</label><select id="sc">
        <option value="1.5">Screen &middot; fast</option><option value="2" selected>Good &middot; around 150 dpi</option>
        <option value="3">High &middot; for printing</option></select></div>
      <div><label class="lb" for="rng">Pages</label><input type="text" id="rng" placeholder="all, or 1-3,7"></div>
    </div>
    <div class="actions"><button class="btn" id="go" disabled>${icon('image')}Convert</button></div>
    <div id="prog" hidden><div class="bar-meter"><i></i></div><p class="tiny dim" id="progtxt"></p></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    let file = null;
    const go = $('#go', root), bar = $('#prog i', root), wrap = $('#prog', root), txt = $('#progtxt', root);
    onFiles(root, fs => {
      file = fs[0];
      $('#inbox', root).innerHTML = `<div class="frow"><span class="ic" style="width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px">${icon('pdf')}</span>
        <div class="meta"><b>${esc(file.name)}</b><span>${bytes(file.size)}</span></div></div>`;
      go.disabled = false;
    });
    const parseRange = (s, max) => {
      if (!s.trim()) return Array.from({ length: max }, (_, i) => i + 1);
      const out = new Set();
      s.split(',').forEach(part => {
        const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
        if (!m) return;
        const a = +m[1], b = +(m[2] || m[1]);
        for (let i = a; i <= Math.min(b, max); i++) if (i > 0) out.add(i);
      });
      return [...out].sort((a, b) => a - b);
    };
    go.onclick = async () => {
      let L;
      try { L = await loadPdfjs(); } catch (e) { return toast(e.message, true); }
      go.disabled = true; wrap.hidden = false;
      const doc = await L.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = parseRange($('#rng', root).value, doc.numPages);
      const scale = +$('#sc', root).value, items = [];
      for (let k = 0; k < pages.length; k++) {
        const pg = await doc.getPage(pages[k]);
        const vp = pg.getViewport({ scale });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        const blob = await toBlob(c, 'image/png');
        items.push({ blob, name: `${stem(file.name)}-p${String(pages[k]).padStart(2, '0')}.png`, thumb: URL.createObjectURL(blob), note: `${c.width}\u00d7${c.height} \u00b7 ${bytes(blob.size)}` });
        bar.style.width = ((k + 1) / pages.length * 100) + '%';
        txt.textContent = `Page ${k + 1} of ${pages.length}`;
      }
      results($('#out', root), items, stem(file.name) + '-pages.zip');
      go.disabled = false;
    };
  }
});

T.tool({
  id: 'pdf-to-text', cat: 'pdf', icon: 'text',
  name: 'Get the text out of a PDF', tagline: 'Copy and paste without fighting the viewer.',
  keywords: 'extract text pdf copy select content',
  ui: () => `
    ${dropzone('Drop a PDF', 'Works when the PDF holds real text, not when it is a scanned photo', 'application/pdf', false)}
    <div class="actions"><button class="btn" id="go" disabled>${icon('text')}Extract</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy</button>
      <button class="btn sec" id="dl">${icon('download')}Save .txt</button>
      <label class="opt"><input type="checkbox" id="marks" checked> Mark the page breaks</label></div>
    <textarea id="out" placeholder="The text will show up here…" style="margin-top:14px;min-height:280px"></textarea>`,
  init(root) {
    let file = null;
    const go = $('#go', root), out = $('#out', root);
    onFiles(root, fs => { file = fs[0]; go.disabled = false; });
    go.onclick = async () => {
      let L;
      try { L = await loadPdfjs(); } catch (e) { return toast(e.message, true); }
      go.disabled = true; go.innerHTML = '<i class="spin"></i>Reading…';
      const doc = await L.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const c = await (await doc.getPage(i)).getTextContent();
        if ($('#marks', root).checked) text += `\n\n--- page ${i} ---\n`;
        text += c.items.map(x => x.str).join(' ').replace(/\s+/g, ' ');
      }
      out.value = text.trim();
      if (!out.value) toast('That PDF holds no text - it looks like a scan', true);
      go.disabled = false; go.innerHTML = icon('text') + 'Extract';
    };
    $('#cp', root).onclick = () => copy(out.value, 'Text');
    $('#dl', root).onclick = () => download(new Blob([out.value], { type: 'text/plain' }), 'text.txt');
  },
  faq: [['It comes out empty', 'Then the PDF is a scanned image. That needs OCR, which is a heavier kind of processing altogether.']]
});

T.tool({
  id: 'text-to-pdf', cat: 'pdf', icon: 'stack',
  name: 'Text to PDF', tagline: 'Paste some notes and take them away as a paginated PDF.',
  keywords: 'text to pdf create document print notes',
  ui: () => `
    <label class="lb" for="src">Content</label>
    <textarea id="src" placeholder="Type or paste here…" style="min-height:240px"></textarea>
    <div class="grid2">
      <div><label class="lb" for="fs">Font size</label><input type="number" id="fs" value="12" min="7" max="28"></div>
      <div><label class="lb" for="mg">Margins (pt)</label><input type="number" id="mg" value="56" min="20" max="120"></div>
    </div>
    <div class="actions"><button class="btn" id="go">${icon('pdf')}Generate PDF</button>
      <span class="tiny dim" id="est"></span></div>
    <div class="filelist" id="out"></div>`,
  init(root) {
    const src = $('#src', root);
    const est = () => {
      const chars = src.value.length;
      $('#est', root).textContent = chars ? `${chars} characters \u00b7 about ${Math.max(1, Math.ceil(chars / 2600))} page${Math.ceil(chars / 2600) === 1 ? '' : 's'}` : '';
    };
    src.addEventListener('input', est); est();
    $('#go', root).onclick = () => {
      if (!src.value.trim()) return toast('Type something first', true);
      const blob = pdfFromText(src.value, { fontSize: +$('#fs', root).value, margin: +$('#mg', root).value });
      results($('#out', root), [{ blob, name: 'document.pdf', note: bytes(blob.size) }]);
    };
  },
  faq: [['Does it handle accents?', 'Yes, it uses the WinAnsi encoding of Helvetica. Emoji and non-Latin alphabets will not come through - that would need a full embedded font.']]
});

/* ----------------------------------------------------------------- TEXT */

function markdownToHtml(src) {
  let s = esc(src);
  const code = [];
  s = s.replace(/```([\s\S]*?)```/g, (m, c) => { code.push(c.replace(/^\w*\n/, '')); return `\u0000${code.length - 1}\u0000`; });
  s = s.replace(/^\s*\|(.+)\|\s*\n\s*\|[-: |]+\|\s*\n((?:\s*\|.*\|\s*\n?)*)/gm, (m, head, body) => {
    const th = head.split('|').map(x => `<th>${x.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(r =>
      '<tr>' + r.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => `<td>${c.trim()}</td>`).join('') + '</tr>').join('');
    return `<table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>\n`;
  });
  s = s
    .replace(/^###### (.*)$/gm, '<h6>$1</h6>').replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>').replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^\s*&gt; ?(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*([-*_])\s*\1\s*\1[\s*\-_]*$/gm, '<hr>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/^\s*[-*+] \[( |x)\] (.*)$/gmi, (m, c, t) => `<li style="list-style:none">
      <input type="checkbox" disabled ${c.toLowerCase() === 'x' ? 'checked' : ''}> ${t}</li>`)
    .replace(/^\s*[-*+] (.*)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+\. (.*)$/gm, '<li data-ol>$1</li>');
  s = s.replace(/(?:<li[^>]*>[\s\S]*?<\/li>\n?)+/g, m =>
    (m.includes('data-ol') ? `<ol>${m}</ol>` : `<ul>${m}</ul>`).replace(/ data-ol/g, ''));
  s = s.split(/\n{2,}/).map(p =>
    /^\s*<(h\d|ul|ol|blockquote|table|hr|img|pre|div)/.test(p.trim()) ? p : (p.trim() ? `<p>${p.trim().replace(/\n/g, '<br>')}</p>` : '')
  ).join('\n');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<pre><code>${code[i]}</code></pre>`);
}

T.tool({
  id: 'markdown-editor', cat: 'text', icon: 'markdown',
  name: 'Markdown editor', tagline: 'Write on the left, watch it render on the right.',
  keywords: 'markdown md editor readme live preview html',
  ui: () => `
    <div class="actions" style="margin:0 0 12px">
      <div class="segment" id="mode"><button data-m="split" class="on">Split</button>
        <button data-m="write">Write only</button><button data-m="read">Preview only</button></div>
      <span class="tiny dim" id="stats" style="margin-left:auto"></span>
    </div>
    <div class="two" id="pane">
      <textarea id="src" spellcheck="true" style="min-height:440px"></textarea>
      <div class="preview" id="prev" style="min-height:440px"></div>
    </div>
    <div class="actions">
      <button class="btn" id="html">${icon('download')}Save HTML</button>
      <button class="btn sec" id="md">${icon('download')}Save .md</button>
      <button class="btn sec" id="pdf">${icon('pdf')}Export to PDF</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy the HTML</button>
      <span class="tiny dim" id="saved"></span>
    </div>`,
  init(root) {
    const src = $('#src', root), prev = $('#prev', root);
    const demo = `# Meeting notes

Three things that **cannot** slip:

- Close the budget before Friday
- Chase the September invoices
- [ ] Reply to Marta's email
- [x] Book the room

> If it is not written down, it did not happen.

| Task | Owner |
|---|---|
| Budget | Ana |
| Invoices | Luis |

A snippet of code:

\`\`\`
npm run build
\`\`\`
`;
    src.value = store.get('md', demo);
    const render = () => {
      prev.innerHTML = markdownToHtml(src.value);
      store.set('md', src.value);
      const w = src.value.trim() ? src.value.trim().split(/\s+/).length : 0;
      $('#stats', root).textContent = `${w} words \u00b7 ${src.value.length} characters \u00b7 ${Math.max(1, Math.ceil(w / 200))} min read`;
      $('#saved', root).textContent = 'Draft kept in this browser';
    };
    src.addEventListener('input', render);
    src.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = src.selectionStart;
        src.value = src.value.slice(0, s) + '  ' + src.value.slice(src.selectionEnd);
        src.selectionStart = src.selectionEnd = s + 2;
      }
    });
    render();
    $$('#mode button', root).forEach(b => b.onclick = () => {
      $$('#mode button', root).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const m = b.dataset.m;
      $('#pane', root).style.gridTemplateColumns = m === 'split' ? '1fr 1fr' : '1fr';
      src.hidden = m === 'read'; prev.hidden = m === 'write';
    });
    const page = () => `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Document</title><style>body{font:16px/1.7 ui-sans-serif,system-ui,sans-serif;max-width:740px;margin:48px auto;padding:0 20px;color:#222}
code{background:#f0f0ee;padding:2px 5px;border-radius:4px}pre{background:#f7f7f5;padding:14px;border-radius:8px;overflow:auto}
blockquote{border-left:3px solid #ccc;margin:0;padding-left:14px;color:#555}table{border-collapse:collapse}
td,th{border:1px solid #ddd;padding:6px 10px}</style></head><body>${markdownToHtml(src.value)}</body></html>`;
    $('#html', root).onclick = () => download(new Blob([page()], { type: 'text/html' }), 'document.html');
    $('#md', root).onclick = () => download(new Blob([src.value], { type: 'text/markdown' }), 'document.md');
    $('#cp', root).onclick = () => copy(markdownToHtml(src.value), 'HTML');
    $('#pdf', root).onclick = () => {
      const plain = src.value.replace(/^#{1,6} /gm, '').replace(/\*\*|\*|`|~~/g, '');
      download(pdfFromText(plain), 'document.pdf');
    };
  },
  info: `<h2>Cheat sheet</h2>
    <table class="t"><tr><th>You type</th><th>You get</th></tr>
    <tr><td><code># Title</code></td><td>Large heading</td></tr>
    <tr><td><code>**bold**</code></td><td><strong>bold</strong></td></tr>
    <tr><td><code>*italic*</code></td><td><em>italic</em></td></tr>
    <tr><td><code>- item</code></td><td>Bulleted list</td></tr>
    <tr><td><code>- [ ] task</code></td><td>Checkbox</td></tr>
    <tr><td><code>&gt; quote</code></td><td>Block quote</td></tr>
    <tr><td><code>[text](url)</code></td><td>Link</td></tr></table>
    <p>The draft is saved in this browser as you type. Clearing the site data wipes it, so export the
    <code>.md</code> for anything that matters.</p>`
});

T.tool({
  id: 'word-count', cat: 'text', icon: 'text',
  name: 'Word count', tagline: 'Words, characters and how long it takes to read.',
  keywords: 'count words characters letters reading time essay limit',
  ui: () => `
    <textarea id="src" placeholder="Paste your text…" style="min-height:220px"></textarea>
    <div class="cards" id="out" style="margin-top:14px"></div>
    <div class="box" style="margin-top:14px">
      <h3>Words you repeat most</h3>
      <div id="freq" class="tiny dim">Type something to see them.</div>
    </div>`,
  init(root) {
    const src = $('#src', root);
    const stop = new Set('the of and to in a is that it for on with as was at by be this from or an are have has not but they you we he she his her its their our your all can will one two more when there been who which would there about out up other into than then them these some could time also do does did if no so what when who why how'.split(' '));
    const up = () => {
      const t = src.value;
      const words = t.trim() ? t.trim().split(/\s+/) : [];
      const cells = [
        ['Words', words.length], ['Characters', t.length],
        ['No spaces', t.replace(/\s/g, '').length],
        ['Sentences', (t.match(/[.!?…]+(\s|$)/g) || []).length],
        ['Paragraphs', t.split(/\n{2,}/).filter(x => x.trim()).length],
        ['Reading', Math.max(1, Math.ceil(words.length / 200)) + ' min'],
        ['Read aloud', Math.max(1, Math.ceil(words.length / 130)) + ' min']
      ];
      $('#out', root).innerHTML = cells.map(([k, v]) => `
        <div class="tcard"><span><p class="tiny" style="margin:0 0 2px;text-transform:uppercase;letter-spacing:.06em">${k}</p>
        <h3 class="mono" style="font-size:1.5rem;margin:0">${v}</h3></span></div>`).join('');
      const counts = new Map();
      words.map(w => w.toLowerCase().replace(/[^\w']/gi, '')).filter(w => w.length > 2 && !stop.has(w))
        .forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
      const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12);
      $('#freq', root).innerHTML = top.length
        ? top.map(([w, n]) => `<span class="pill" style="margin:0 6px 6px 0;display:inline-block">${esc(w)} &middot; ${n}</span>`).join('')
        : 'Type something to see them.';
    };
    src.addEventListener('input', up); up();
  }
});

T.tool({
  id: 'change-case', cat: 'text', icon: 'text',
  name: 'Change case', tagline: 'Fix a headline someone typed in all caps, in two clicks.',
  keywords: 'uppercase lowercase capitalise title case sentence case convert text',
  ui: () => `
    <textarea id="src" placeholder="Paste the text to transform…"></textarea>
    <div class="actions">
      <button class="btn sec sm" data-c="up">UPPERCASE</button>
      <button class="btn sec sm" data-c="low">lowercase</button>
      <button class="btn sec sm" data-c="title">Title Case</button>
      <button class="btn sec sm" data-c="sent">Sentence case</button>
      <button class="btn sec sm" data-c="kebab">kebab-case</button>
      <button class="btn sec sm" data-c="snake">snake_case</button>
    </div>
    <div class="actions">
      <button class="btn" id="cp">${icon('copy')}Copy</button>
      <button class="btn sec" id="undo">Undo</button>
    </div>`,
  init(root) {
    const src = $('#src', root);
    let history = [];
    const minor = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'up', 'via']);
    const F = {
      up: s => s.toUpperCase(),
      low: s => s.toLowerCase(),
      title: s => s.toLowerCase().replace(/(^|[\s"'(\-–])(\p{L})(\p{L}*)/gu, (m, a, b, c) =>
        a + (minor.has(b + c) && a.trim() ? b + c : b.toUpperCase() + c)),
      sent: s => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
      kebab: s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-'),
      snake: s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s-]+/g, '_')
    };
    $$('[data-c]', root).forEach(b => b.onclick = () => {
      history.push(src.value);
      src.value = F[b.dataset.c](src.value);
    });
    $('#undo', root).onclick = () => { if (history.length) src.value = history.pop(); else toast('Nothing to undo'); };
    $('#cp', root).onclick = () => copy(src.value, 'Text');
  }
});

T.tool({
  id: 'clean-text', cat: 'text', icon: 'text',
  name: 'Clean up text', tagline: 'Duplicates, stray spaces, accents and odd line breaks.',
  keywords: 'clean duplicates spaces accents sort lines lists tidy',
  ui: () => `
    <label class="lb" for="src">Input text</label>
    <textarea id="src" placeholder="Paste the list or the text here…"></textarea>
    <div class="actions" style="margin-top:12px">
      <label class="opt"><input type="checkbox" id="dup" checked> Remove duplicate lines</label>
      <label class="opt"><input type="checkbox" id="empty" checked> Remove empty lines</label>
      <label class="opt"><input type="checkbox" id="spaces" checked> Collapse extra spaces</label>
      <label class="opt"><input type="checkbox" id="accents"> Strip accents</label>
      <label class="opt"><input type="checkbox" id="punct"> Strip punctuation</label>
      <label class="opt"><input type="checkbox" id="sort"> Sort alphabetically</label>
      <label class="opt"><input type="checkbox" id="join"> Join into one line</label>
      <label class="opt"><input type="checkbox" id="numbered"> Number the lines</label>
    </div>
    <div class="actions"><button class="btn" id="go">Clean up</button>
      <button class="btn sec" id="cp">${icon('copy')}Copy result</button>
      <span class="tiny dim" id="delta"></span></div>
    <div class="result" id="out">The result will show up here.</div>`,
  init(root) {
    const src = $('#src', root), out = $('#out', root);
    const on = id => $('#' + id, root).checked;
    $('#go', root).onclick = () => {
      let t = src.value;
      if (on('spaces')) t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
      let lines = t.split('\n');
      if (on('dup')) lines = [...new Set(lines)];
      if (on('empty')) lines = lines.filter(l => l.trim());
      if (on('sort')) lines = lines.sort((a, b) => a.localeCompare(b, 'en'));
      if (on('numbered')) lines = lines.map((l, i) => `${i + 1}. ${l}`);
      t = lines.join(on('join') ? ' ' : '\n');
      if (on('accents')) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (on('punct')) t = t.replace(/[.,;:!?"'`()\[\]{}]/g, '');
      t = t.trim();
      out.textContent = t || 'Nothing to show.';
      const before = src.value.split('\n').filter(x => x.trim()).length;
      $('#delta', root).textContent = `${before} lines \u2192 ${t ? t.split('\n').length : 0}`;
    };
    $('#cp', root).onclick = () => copy(out.textContent, 'Result');
  }
});

})();
