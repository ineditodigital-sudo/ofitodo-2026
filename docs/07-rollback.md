# 07 — Rollback

## Staging (temporal.ofitodo.com)

Nada que perder: re-desplegar cualquier estado anterior con
```
git checkout <tag-o-commit>
npm run build --prefix apps/site && npm run build --prefix apps/admin
node scripts/preparar-staging.mjs && node scripts/deploy-ftps.mjs dist-staging
```
Los datos dinámicos (mensajes/pedidos del shim) viven en `api/datos/ofitodo.sqlite` en el servidor; el deploy **no** los pisa (el uploader no borra archivos remotos que no existan localmente... y `datos/` se sube solo con el esqueleto). Para respaldarlos: descargar `api/datos/ofitodo.sqlite` por FTPS antes de cambios mayores.

## Producción (tras el cutover)

1. **Vuelta atrás total (a WordPress)** — solo si algo grave falla en las primeras horas:
   - cPanel → Backups (o Installatron) → restaurar `wp-final-<fecha>` (archivos + DB). ~10-20 min.
   - Purga de caché en Cloudflare.
   - Verificar home + 3 páginas + checkout WP.
2. **Vuelta a una versión anterior del sitio nuevo** — caso normal:
   - Igual que staging pero con `scripts/preparar-produccion.mjs` y el FTP de producción.
   - `api/datos/ofitodo.sqlite` (pedidos/mensajes) se descarga ANTES por FTPS y se restaura después si hiciera falta.
3. **Regla**: siempre respaldo antes de tocar producción (§11.2 paso 1). Sin respaldo verificado, no hay deploy.
