# ToolNez

36 free web tools: image conversion and editing, video trimming and compression, PDF building
and reading, text utilities, everyday calculators and developer helpers. No sign-up, no
watermarks, no usage limits.

Live: **https://toolnez.vercel.app**

## What's inside

| Category | Tools |
|---|---|
| Image | 8 |
| Video | 7 |
| PDF | 4 |
| Text | 4 |
| Calculators | 8 |
| Utilities | 5 |

## Stack

Plain HTML, CSS and JavaScript. No framework, no build step, no backend.
The only external dependency is [pdf.js](https://mozilla.github.io/pdf.js/) (Apache 2.0),
loaded on demand in the tools that read PDFs. The PDF, GIF and ZIP writers are own
implementations in `lib.js`.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell: meta tags, header, search, nav, footer |
| `styles.css` | All styling |
| `lib.js` | ZIP, GIF and PDF writers plus video re-encoding helpers |
| `core.js` | Router, tool registry, storage, favourites, ad placement, pages |
| `tools-media.js` | Image and video tools |
| `tools-docs.js` | PDF and text tools |
| `tools-calc.js` | Calculators and developer utilities |
| `tools-retouch.js` | Object removal and video area covering |
| `adsense.js` | **The only file to edit to enable ads** (see `ADSENSE.md`) |
| `build-seo.js` | Regenerates `sitemap.xml` and `llms.txt` from the tool catalogue |
| `vercel.json` | Clean URLs, security headers, cache and content-type rules |
| `ads.txt` `robots.txt` `llms.txt` `sitemap.xml` | Indexing and advertising files |

## Local development

Any static server works:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

After adding or removing a tool, regenerate the SEO files:

```bash
node build-seo.js
```

## Deploying to Vercel

Import the repository in Vercel. There is no build command and no output directory:
it is a static site, `vercel.json` handles the rest.

## Advertising

Google AdSense is wired in but switched off until a real publisher ID is present.
See [`ADSENSE.md`](ADSENSE.md) for the step-by-step setup.

## Licence

The code in this repository is the author's own work. pdf.js is used under Apache 2.0.
