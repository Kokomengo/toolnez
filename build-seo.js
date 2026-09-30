/* build-seo.js - regenerates sitemap.xml and llms.txt by reading the tool catalogue.
   Usage:  node build-seo.js            -> uses https://toolnez.vercel.app
           node build-seo.js https://other.com
   Run it again every time you add or remove a tool. */

const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'https://toolnez.vercel.app').replace(/\/$/, '');
const dir = __dirname;
const files = ['tools-media.js', 'tools-docs.js', 'tools-calc.js', 'tools-retouch.js'];

const CATS = {
  image: 'Image', video: 'Video', pdf: 'PDF',
  text: 'Text', calc: 'Calculators', util: 'Utilities'
};

const tools = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const re = /id:\s*'([^']+)',\s*cat:\s*'([^']+)',\s*icon:\s*'[^']+',([^]*?)name:\s*'([^']+)',\s*tagline:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) tools.push({ id: m[1], cat: m[2], name: m[4], tagline: m[5] });
}
tools.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));

/* ---------------------------------------------------------------- sitemap */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: '/', pri: '1.0', freq: 'weekly' },
  ...Object.keys(CATS).map(c => ({ loc: `/#/c/${c}`, pri: '0.8', freq: 'weekly' })),
  ...tools.map(t => ({ loc: `/#/t/${t.id}`, pri: '0.7', freq: 'monthly' })),
  ...['how-it-works', 'changelog', 'privacy', 'terms', 'cookies', 'contact']
    .map(p => ({ loc: `/#/p/${p}`, pri: '0.3', freq: 'yearly' }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(dir, 'sitemap.xml'), sitemap);

/* ---------------------------------------------------------------- llms.txt */
const byCat = {};
tools.forEach(t => (byCat[t.cat] = byCat[t.cat] || []).push(t));
const llms = `# ToolNez

> A collection of ${tools.length} free web tools: image conversion and editing, video trimming and
> compression, PDF building and reading, text utilities, everyday calculators and developer helpers.
> No sign-up, no watermarks and no usage limits.

The site is a single-page application with fragment routing (#). The home page is ${BASE}/
and each tool lives at ${BASE}/#/t/{id}. The content is in English.

## How it works

- No backend: there is no API and no database.
- Only external dependency: pdf.js (Apache 2.0), loaded on demand in the tools that read PDFs.
- The PDF, GIF and ZIP writers are own implementations bundled in lib.js.
- Video is re-encoded in real time with MediaRecorder, so the job takes as long as the clip lasts.
- Monetisation: Google AdSense advertising. There are no paid plans or subscription walls.

${Object.entries(byCat).map(([c, list]) => `## ${CATS[c] || c}\n\n` +
  list.map(t => `- [${t.name}](${BASE}/#/t/${t.id}): ${t.tagline}`).join('\n')).join('\n\n')}

## Information pages

- [How it works](${BASE}/#/p/how-it-works): technical detail of the APIs used and browser support.
- [Changelog](${BASE}/#/p/changelog): record of changes to the site.
- [Privacy](${BASE}/#/p/privacy): what is stored (preferences in localStorage) and how AdSense is used.
- [Terms](${BASE}/#/p/terms): the calculators are indicative and do not replace professional advice.
- [Cookies and ads](${BASE}/#/p/cookies): third-party cookies coming from advertising.
- [Contact](${BASE}/#/p/contact): elmillodel2029@gmail.com

## Legitimate use

The retouching tools (remove objects from a photo, cover an area in a video) are meant for your own
material: removing a mark you added yourself, a burned-in camera date, an object in the way or visible
personal data. They must not be used on third-party content protected by copyright.
`;
fs.writeFileSync(path.join(dir, 'llms.txt'), llms);

console.log(`sitemap.xml  ${urls.length} URLs`);
console.log(`llms.txt     ${tools.length} tools`);
console.log(`base         ${BASE}`);
