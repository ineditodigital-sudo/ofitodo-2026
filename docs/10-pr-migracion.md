## Resumen

Migración completa de ofitodo.com de WordPress/Elementor a sitio estático, con
rediseño de todo el frontal, CMS propio, y eliminación de la dependencia de
WordPress en el servidor.

**43 commits · 231 archivos · +77.627 líneas**

El sitio ya está en producción y verificado; este PR lleva a `main` el código
que lo genera.

---

## Garantía de cero pérdida

Es la parte crítica: había URLs bien posicionadas y no se perdió ninguna.

Verificado **contra el sitio en vivo**, cruzando dos censos independientes (el
rastreo completo del sitio original y los 9 sitemaps):

| Resultado | URLs |
|---|---|
| Responden **200 en su misma URL** | **527** |
| Redirigen **301** a página válida | 3 |
| Responden **410** (retiradas por decisión de negocio) | 2 |
| **Perdidas** | **0** |

Los 9 sitemaps son **idénticos** al original, URL por URL. Reproducible con:

```bash
node scripts/verificar-urls.mjs https://ofitodo.com
```

---

## Rediseño del frontal

Se sustituyó el HTML heredado de WordPress por HTML propio y un sistema de
diseño nuevo.

| | Antes | Ahora |
|---|---|---|
| Peso medio por página | ~360 KB | **32 KB** |
| Hojas de estilo | 67 | **2 propias** |
| Scripts externos | 83 | **0** |
| Elementor / WPBakery / jQuery | Sí | **Ninguno** |

Cubre: portada, 21 catálogos, 368 fichas de producto, Nosotros/Productos/
Sectores/Contacto, 7 páginas de sector, blog y sus 20 entradas, tienda,
legales, archivos y el flujo de compra.

### Defectos reales corregidos

- **296 de 368 fichas mostraban shortcodes crudos de Jetpack** (`[contact-form]…`)
  — un fallo que también tenía el sitio original. Sustituidos por un formulario
  de cotización que sí envía a `/api/formularios`.
- La animación de aparición dependía de JavaScript y dejaba secciones en blanco.
  Ahora es CSS ligado al scroll y anima **solo el desplazamiento, nunca la
  opacidad**: aunque falle, el texto siempre se lee.
- Variantes de imagen inexistentes que daban 404 → `imagenVariante()` usa el
  catálogo real de tamaños que WordPress ya había generado.
- Enlaces del menú apuntando a URLs inventadas → el menú se construye con las
  rutas reales del catálogo, así que no puede volver a romperse.
- Vídeo de fondo del hero que se había perdido en la reconstrucción, restaurado
  con triple respaldo (fallo de carga, códec ausente, `prefers-reduced-motion`).

---

## Conservación del contenido delicado

Varias entradas del blog y páginas estaban maquetadas a mano, cada una con su
propia hoja de estilo (hasta 31 KB). Aplanarlas destruía su diseño.

- **`scripts/css-acotar.mjs`** — delimitador de CSS: reescribe cada selector
  para que la hoja del autor no pueda tocar el encabezado, el pie ni el resto
  del sitio (`html`/`body`/`:root` pasan a ser el contenedor; `@font-face` y
  `@keyframes` intactos).
- **Salvaguarda de cero pérdida**: se comparan las palabras del contenido antes
  y después. Si se perdería alguna, la página **no se reconstruye** y se sirve
  su versión original. El informe nombra exactamente qué palabras se perderían.
- Se detecta y neutraliza el patrón `opacity:0` + clase de estado que dependía
  del script del autor, que ya no se conserva.

---

## Infraestructura corregida

Dos fallos encontrados al verificar en producción:

1. **El despliegue servía HTML obsoleto en silencio.** `deploy-cutover.mjs`
   saltaba archivos comparando solo el **tamaño** remoto; al cambiar el hash de
   una hoja de estilo, el HTML que la enlaza conserva el mismo tamaño. Ahora
   compara sha1 contra un manifiesto que vive **en el servidor**.

2. **Cloudflare cacheaba el HTML** (`cf-cache-status: HIT`, `age` hasta 870 s).
   Esta era la causa real de que las publicaciones no se vieran. El `.htaccess`
   envía `Cache-Control: max-age=0, must-revalidate` para `.html` y marca
   inmutables los assets versionados por hash.

---

## Blindaje del servidor

Con antecedentes de puertas traseras en otros sitios WordPress del cliente:

- **Ningún `.php` es accesible por HTTP**: ni se ejecuta ni se lee su código.
  Una puerta trasera dejada en cualquier carpeta queda inerte. La API no se ve
  afectada porque `/cgi-bin/api.cgi` lanza `php-cgi` como subproceso, sin pasar
  por el manejador de Apache — que se retira.
- Sin listados de directorio (antes se veían los 32 plugins instalados).
- Bloqueo de `.env`, `.sql`, `.log`, respaldos, `.git` y sondas de escaneo.
- HSTS, `X-Frame-Options`, `Permissions-Policy`.

**Escaneo defensivo** (`scripts/escanear-servidor.mjs`, solo lectura): sin
evidencia de compromiso. En `/uploads` solo 4 `.php` de 0 y 99 bytes — los
`index` vacíos que WordPress deja para evitar listados.

---

## Fin de la dependencia de WordPress

Las últimas 6 páginas pedían entre 53 y 62 hojas de estilo y ~73 scripts a
`/wp-content` y `/wp-includes`. `scripts/extraer-elementor.mjs` descarga sus
hojas, **depura las reglas que la página no usa** (2,6 MB → ~350 KB, un 87 %
menos), las acota a su contenedor y las sirve como archivo versionado.

Conservan su maquetación intacta: **100 % de las palabras en las 6**.

| Comprobación | Resultado |
|---|---|
| Páginas que piden algo a `/wp-content/plugins`, `/themes` o `/wp-includes` | **0 de 528** |
| Páginas con jQuery | **0** |
| Páginas que usan `/wp-content/uploads/` (imágenes) | 528 |

---

## Pendiente (fuera de este PR)

- **Purgar la caché de Cloudflare** para que los cambios sean inmediatos en las
  URLs ya cacheadas. Requiere acceso al panel de Cloudflare.
- **Retirar el árbol de WordPress del servidor**, conservando
  `/wp-content/uploads/`. Es un borrado irreversible en producción: requiere
  respaldo previo y autorización explícita.
- **Contenido de prueba indexado**: `/test/` y `/producto/test-1|2|3/` están en
  los sitemaps que se envían a Google. Registrado en
  `docs/mejoras-candidatas.md`; retirarlos cambia el inventario de URLs.
- El **usuario FTP de staging** aparece en el historial de Git desde un commit
  anterior a este trabajo (solo el usuario, ninguna contraseña). Conviene rotar
  esa cuenta.
