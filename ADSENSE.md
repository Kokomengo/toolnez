# Poner AdSense en marcha en ToolNez

Todo el cableado ya está hecho. Cuando Google te apruebe, solo tienes que tocar
**dos archivos**: `adsense.js` y `ads.txt`.

---

## 1. Mientras el sitio está en revisión

No hace falta que hagas nada más que **tener el sitio publicado y accesible**.
Ahora mismo la página no pide absolutamente nada a Google (el ID sigue siendo el
de relleno), así que no hay peticiones fallidas ni errores en consola. Los huecos
de anuncio se ven como recuadros vacíos con borde discontinuo.

Lo que Google mira durante la revisión y que ya está resuelto:

| Requisito | Estado |
|---|---|
| Dominio accesible y con contenido propio | ✅ 36 herramientas con texto original |
| Página de privacidad | ✅ `#/p/privacy`, menciona AdSense y cookies |
| Página de cookies | ✅ `#/p/cookies` |
| Términos de uso | ✅ `#/p/terms` |
| Vía de contacto | ✅ elmillodel2029@gmail.com |
| `ads.txt` en la raíz | ✅ existe, falta tu ID |
| `robots.txt` deja pasar a `Mediapartners-Google` y `AdsBot-Google` | ✅ |
| Sin contenido que incumpla las políticas | ✅ las herramientas de retoque se presentan para material propio |

**Importante para pasar la revisión:** en AdSense, al añadir el sitio, pon
`toolnez.vercel.app`. Google exige que el snippet esté presente en la página que
revisa, así que **haz el paso 2 antes de pedir la revisión** aunque todavía no
tengas bloques creados.

---

## 2. Activar los anuncios (1 minuto)

Abre `adsense.js` y cambia una sola línea:

```js
client: 'ca-pub-0000000000000000',   // <- pon aquí tu ID real
```

Lo encuentras en AdSense → **Cuenta → Configuración → Información de la cuenta**.
Tiene el formato `ca-pub-` seguido de 16 dígitos.

En cuanto pongas un ID válido:

- se carga la librería de AdSense,
- se activan los **Auto Ads** (`autoAds: true`),
- los recuadros vacíos pasan a ser unidades reales.

Si un ID no es válido, el archivo lo detecta y no carga nada, para que nunca se
te quede la página pidiendo scripts rotos.

---

## 3. Los cuatro bloques manuales (opcional pero recomendado)

Los Auto Ads colocan anuncios donde Google quiera. Si prefieres controlar las
posiciones —que ya están diseñadas y con su hueco reservado en el layout—, crea
las unidades en AdSense → **Anuncios → Por unidad de anuncio → Display** y pega
el número de 10 dígitos de `data-ad-slot` en `adsense.js`:

```js
slots: {
  h:    '1234567890',   // banner horizontal: cabecera y pie de cada vista
  m:    '',             // bloque bajo el resultado de la herramienta
  r:    '',             // rectángulo dentro del contenido
  side: ''              // vertical 300x600 en la barra lateral
}
```

Cualquiera que dejes vacío simplemente no se muestra. Con las cuatro rellenas hay
**hasta 5 impresiones por vista** (el banner `h` aparece dos veces: arriba y abajo).

Si quieres solo bloques manuales y nada automático, pon `autoAds: false`.

---

## 4. `ads.txt`

Abre `ads.txt` y sustituye los ceros. **Ojo: aquí va sin el prefijo `ca-`**:

```
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

Tras desplegar, compruébalo en `https://toolnez.vercel.app/ads.txt`.
AdSense tarda entre unas horas y un día en dejar de avisar de que falta.

---

## 5. Correo de contacto

Ya está configurado como **elmillodel2029@gmail.com** en `core.js` (página de contacto)
y en `llms.txt`. Si algún día quieres cambiarlo, esos son los dos sitios.

---

## 6. Desplegar y comprobar

```bash
cd toolhub
vercel --prod          # o un push a la rama conectada
```

Después:

1. Abre la web y mira la consola: no debe haber errores de `adsbygoogle`.
2. `https://toolnez.vercel.app/ads.txt` debe devolver texto plano.
3. En AdSense → Anuncios, el sitio debe aparecer como **Listo**.
4. Los primeros anuncios pueden tardar **de unas horas a 48 h** en rellenarse.
   Ver recuadros en blanco al principio es normal.

---

## Reglas que conviene no romper

- **Nunca hagas clic en tus propios anuncios**, ni pidas a nadie que lo haga. Es
  el motivo número uno de cierre de cuenta.
- No recargues la página una y otra vez para ver si salen: genera impresiones
  inválidas.
- No pongas anuncios pegados a los botones de descarga de forma que se pulsen por
  error; los huecos actuales ya están separados a propósito.
- Si añades más herramientas, no subas de ~5 unidades por vista para no diluir
  el CPM ni entrar en "exceso de anuncios".

---

## Tarea pendiente que más ingresos puede dar

Las herramientas viven en rutas con `#` (`/#/t/percentage`), y Google **no las
indexa como páginas independientes**. Eso limita mucho el tráfico de búsqueda, que
es de donde vienen los ingresos de AdSense. La solución es generar un HTML
estático por herramienta (36 páginas reales, cada una con su título, descripción y
contenido). Dímelo y lo monto.
