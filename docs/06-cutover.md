# 06 — Plan de cutover a producción (ofitodo.com)

> Estado: **PREPARADO, pendiente de ejecución**. Requiere de Cristian: (a) acceso FTP/cPanel al docroot de `ofitodo.com` (las credenciales actuales solo alcanzan `temporal.ofitodo.com`), (b) ventana acordada, (c) visto bueno final sobre staging.

## Qué se despliega

Exactamente lo que hoy corre en `https://temporal.ofitodo.com`:
`apps/site/dist` (528 páginas estáticas + sitemaps + robots) + `apps/api-php/api/` (formularios, pedidos contra entrega, panel) + `apps/admin/dist` (panel en `/admin/`).

## Pasos

1. **Respaldo completo previo** (obligatorio, sin esto no hay cutover):
   - En cPanel: backup completo del home (o `Installatron → backup`) etiquetado `wp-final-<fecha>`; descargar y guardar 90 días.
   - Export de la base `ofitodo_wp1` (phpMyAdmin → Exportar → SQL).
   - Ya existe además el backup local `app_ofitodo-com_Ofitodo_2026-08-25` (este repo).
2. **Verificación en staging** (checklist §7 del prompt maestro): paridad ≥ objetivo, formulario real enviado y recibido, pedido real de prueba, login del panel con contraseña original, prueba de usuario no técnico en el panel.
3. **Preparar artefacto de producción**: `node scripts/preparar-produccion.mjs` → `dist-prod/` (igual que staging pero: `.htaccess` de producción SIN noindex y SIN soft-404*, `robots.txt` real con sitemap, `EN_STAGING=false` en `api/index.php` → correos a ventasofitodo@hotmail.com **y desaparece la cuenta "panel-prueba"**; borrar además su fila de `api/datos/ofitodo.sqlite` si se migra la DB de staging). En producción `/api` va directo a PHP-FPM (el puente `cgi-bin/api.cgi` queda de respaldo por si el vhost repite la falta de pool del subdominio).
   - *El fallback soft-404 se prueba primero en el vhost principal: si `ofitodo.com/ruta-inexistente` da 404 real con `ErrorDocument`, se usa 404 real (requisito M1). El 500-en-404 observado es del vhost del subdominio.
4. **Ventana** (≤ 30 min, tráfico bajo):
   a. cPanel → activar "índice de mantenimiento" o subir `index.html` temporal (opcional; el sync es rápido).
   b. Subir `dist-prod/` al docroot de `ofitodo.com` por FTPS.
   c. **Borrar** del docroot: `wp-admin/`, `wp-includes/`, `wp-content/plugins/`, `wp-content/themes/`, `wp-content/cache/`, `*.php` de la raíz (index.php, wp-login.php, xmlrpc.php, etc.), `wp-config.php` al final.
   d. **CONSERVAR intacto `wp-content/uploads/`** (2.49 GB de media con rutas idénticas).
   e. La base de datos MySQL de WordPress NO se toca (se apaga tras 14 días de monitoreo).
5. **Ajustar dominio en el artefacto**: los assets del sitio ya apuntan a `https://ofitodo.com/wp-content/...` → tras el cutover se sirven del mismo docroot: sin cambios necesarios. Purga de caché en Cloudflare (Purge Everything).
6. **Smoke test en producción**: home, 3 páginas, 1 post, 1 ficha, 1 categoría, formulario real, pedido real (y cancelarlo desde el panel), login del panel, 5 redirecciones (`/inicio/`, `/wp-admin/`, `?p=10551`→ ver nota, `/wp-json/`→410, xmlrpc→410), 404 real, sitemap_index.xml y robots.txt.
   - Nota `?p=ID`: los atajos `?p=`/`?page_id=` del original son manejados por WP. En estático: regla de rewrite con mapa (pendiente menor, ver M1) o aceptar excepción firmada.
7. **Monitoreo 14 días**: GSC (cobertura y 404s), analítica (GTM/GA4 siguen con los mismos IDs), pedidos/formularios por día vs semanas previas, correos.
8. **Cierre**: apagar la base MySQL de WordPress; retirar PHP restante de WP; archivar este runbook con resultados.

## Rollback

Ver [07-rollback.md](07-rollback.md) — restaurar el backup `wp-final-<fecha>` de cPanel devuelve WordPress íntegro en minutos.
