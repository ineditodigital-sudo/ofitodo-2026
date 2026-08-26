# 09 — Operación del sitio (para agentes y para Cristian)

El sitio es estático (Astro) + API PHP + panel. **Todo cambio editorial pasa por Git y rebuild; lo operativo (precios, stock, pedidos, mensajes) es instantáneo vía panel/API.**

## Ciclo estándar de publicación

```
node scripts/wp-convert.mjs                 # regen de content/ si cambiaron datos fuente
npm run content:validate
npm run build --prefix apps/site
node scripts/preparar-staging.mjs
node scripts/deploy-ftps.mjs dist-staging
node scripts/parity.mjs                     # verificación de paridad tras cambios
```

## Tareas comunes

### Cambiar precio o disponibilidad de un producto {#productos}
Panel → **Productos** → editar → Guardar. Efecto inmediato en pedidos y API. La página estática del producto muestra el precio nuevo tras el siguiente ciclo de publicación (arriba). Por código: `PUT /api/admin/productos {slug, precio, stock}` o editar `content/catalogo/productos.json` + rebuild.

### Agregar un producto nuevo {#producto-nuevo}
1. Agregar el objeto a `content/catalogo/productos.json` (usar uno existente como forma; `tieneReferencia: false`).
2. Agregarlo al `grid.items` de su(s) categoría(s) en `categorias.json` (o dejar que el build lo anexe al final por pertenencia).
3. Subir su imagen a `wp-content/uploads/` del servidor (misma convención de rutas) o a `public/media/`.
4. Ciclo de publicación. La ficha se genera con la plantilla donante.

### Editar una página o post congelado {#paginas}
Las páginas de marketing están congeladas (HTML de referencia; ver `content/es/pages/*.json` → `htmlRef`). Cambios de TEXTO puntuales: editar el HTML en `reference/html/<htmlRef>` (con cuidado, es el original) + rebuild. Cambios de fondo: componetizar esa página (crear plantilla Astro) — ver deuda técnica en `docs/05-fase-s.md`.

### Agregar una redirección {#redirecciones}
`content/redirects.json` → objeto `{de, a, codigo}` + regla espejo en `scripts/preparar-staging.mjs` (.htaccess) + rebuild. **Nunca** cambiar un slug sin su 301.

### Ver mensajes de formularios / pedidos {#mensajes}
Panel → Mensajes recibidos / Pedidos (estados: pendiente → confirmado → entregado / cancelado). Los correos también llegan al buzón configurado (staging: cristian.castaneda@maindsoft.net; producción: ventasofitodo@hotmail.com — se cambia con `EN_STAGING` en `api/index.php`).

### Desplegar {#desplegar}
Staging: ciclo estándar (arriba). Producción: [06-cutover.md](06-cutover.md) — SOLO con respaldo previo y aprobación de Cristian.

### Se rompió algo {#rollback}
[07-rollback.md](07-rollback.md).

## Qué NUNCA hacer

- Deploy a producción sin respaldo verificado del servidor y de `api/datos/ofitodo.sqlite`.
- Cambiar un slug sin crear su 301 en `redirects.json`.
- Tocar `SITIO WEB OLD OFITODO/`, el `.tar.gz`, o `wp-content/uploads/` del servidor (solo AGREGAR archivos).
- Subir secretos al repo (viven en `.env` y GitHub Secrets).
- Editar contenido directamente en el servidor por FTP (se pierde en el siguiente deploy): siempre repo → build → deploy.

## Entorno local

- Disco `E:` es **exFAT** → npm workspaces no funciona; cada app instala en su carpeta (`npm install --prefix apps/<app>`); utilerías de scripts en `scripts/.deps/`.
- Playwright/cheerio de scripts: `scripts/.deps/node_modules`.
- CI (GitHub Actions, Linux): `.github/workflows/ci.yml` valida contenido, typecheck, tests y build en cada PR.
