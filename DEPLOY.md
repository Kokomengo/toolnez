# Cómo publicar ToolNez: GitHub → Vercel → AdSense

El repositorio ya está iniciado y con el primer commit hecho. Sigue estos pasos en orden.

---

## Paso 1 · Crear el repositorio en GitHub

1. Entra en <https://github.com/new>.
2. **Repository name:** `toolnez`
3. Visibilidad: **Public** (Vercel también acepta privados en el plan gratuito, pero público
   es más simple y no hay nada secreto en el código).
4. **No marques** "Add a README", "Add .gitignore" ni "Choose a license": ya están en el
   commit y si los creas ahí tendrás un conflicto al subir.
5. Pulsa **Create repository**.

---

## Paso 2 · Subir los archivos

Descarga la carpeta `toolnez` de este espacio de trabajo a tu ordenador, ábrela en una
terminal y ejecuta (cambia `TU-USUARIO` por tu usuario de GitHub):

```bash
cd toolnez
git remote add origin https://github.com/TU-USUARIO/toolnez.git
git push -u origin main
```

Si te pide contraseña, GitHub ya no acepta la de la cuenta: crea un token en
**Settings → Developer settings → Personal access tokens → Tokens (classic)** con permiso
`repo` y úsalo como contraseña.

> Si prefieres no usar la terminal: en la página del repositorio recién creado pulsa
> **uploading an existing file** y arrastra los 18 archivos. Funciona igual, solo que
> pierdes el historial.

**Comprueba que están los 18 archivos**, en especial los cuatro que suelen olvidarse por
no ser HTML: `ads.txt`, `robots.txt`, `llms.txt` y `sitemap.xml`.

---

## Paso 3 · Conectar Vercel

1. Entra en <https://vercel.com/new> con tu cuenta de GitHub.
2. Busca el repositorio `toolnez` y pulsa **Import**.
3. En la pantalla de configuración:
   - **Project Name:** `toolnez` ← esto es lo que determina el dominio `toolnez.vercel.app`
   - **Framework Preset:** `Other`
   - **Build Command:** déjalo vacío
   - **Output Directory:** déjalo vacío
   - **Install Command:** déjalo vacío
4. **Deploy**. Tarda unos 20 segundos.

Al terminar tendrás `https://toolnez.vercel.app` funcionando. A partir de ahí, cada `git push`
vuelve a desplegar solo.

> Si el nombre `toolnez` ya estuviera cogido por otra persona, Vercel te dará
> `toolnez-algo.vercel.app`. En ese caso **avísame**: hay que cambiar el dominio en
> `index.html` (canonical, og:url, og:image), `robots.txt`, `sitemap.xml`, `llms.txt` y
> `build-seo.js`. Es un minuto, pero hay que hacerlo antes de pedir la revisión a AdSense.

---

## Paso 4 · Comprobaciones antes de tocar AdSense

Abre estas cuatro URLs y confirma que responden:

- `https://toolnez.vercel.app/` → la web
- `https://toolnez.vercel.app/ads.txt` → texto plano
- `https://toolnez.vercel.app/robots.txt` → texto plano
- `https://toolnez.vercel.app/sitemap.xml` → XML

Y dentro de la web, que cargan las páginas legales, porque AdSense las revisa:
`#/p/privacy`, `#/p/terms`, `#/p/cookies`, `#/p/contact`.

✅ El correo de contacto ya está configurado: **elmillodel2029@gmail.com**

---

## Paso 5 · Google Search Console (hazlo el mismo día)

No es obligatorio para AdSense, pero sin esto Google tarda semanas en descubrirte:

1. <https://search.google.com/search-console> → **Añadir propiedad** → *Prefijo de URL* →
   `https://toolnez.vercel.app`
2. Verifica con el método de **etiqueta HTML**: te dará un `<meta name="google-site-verification" ...>`.
   Pásamelo y lo añado al `<head>`.
3. Luego **Sitemaps** → envía `sitemap.xml`.

---

## Paso 6 · AdSense

1. AdSense → **Sitios** → **Añadir sitio** → `toolnez.vercel.app`
2. Te dará un fragmento con tu ID: `ca-pub-` seguido de 16 dígitos.
   **Pásamelo** (o edítalo tú en `adsense.js`, línea 17, y en `ads.txt` sin el prefijo `ca-`).
3. Haz `git push` con ese cambio y espera a que Vercel despliegue.
4. Vuelve a AdSense y pulsa **Solicitar revisión**.
5. La respuesta tarda entre unos días y dos semanas. Mientras tanto verás huecos vacíos,
   que es lo correcto.

Cuando te aprueben, crea las unidades de anuncio y pásame los cuatro números de slot;
los coloco en `adsense.js` y quedan los 5 bloques por página funcionando.

---

## Qué necesito de ti para seguir

| Dato | Dónde va | Estado |
|---|---|---|
| Correo de contacto | `core.js`, `llms.txt` | ✅ hecho |
| Dominio final real | 6 archivos, si no es `toolnez.vercel.app` | ⬜ confirmar tras el paso 3 |
| `ca-pub-…` | `adsense.js`, `ads.txt` | ⬜ pendiente |
| Meta de Search Console | `index.html` | ⬜ opcional |
| 4 IDs de bloque | `adsense.js` | ⬜ tras la aprobación |
