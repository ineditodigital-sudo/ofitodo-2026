# 08 — Migración de datos: conteos origen vs destino

Fuente: backup Installatron 2026-08-25 (`APP-DATA.SQL`, prefijo `S7tWp_`). Destino: `content/` (editorial+catálogo) y `apps/api-php/api/datos/` (operativo).

| Dato | Origen (WP) | Destino | Estado |
|---|---|---|---|
| Productos publicados | 368 | `content/catalogo/productos.json` = **368** | ✅ 100 % |
| Categorías de producto | 55 (52 con página) | `categorias.json` = **55**, 52 con grid de referencia | ✅ 100 % |
| Etiquetas de producto | 47 con página | `etiquetas.json` = **47** | ✅ |
| Marcas | 6 con página | `marcas.json` = **6** | ✅ |
| Páginas publicadas | 27 (24 congeladas + 3 reimplementadas: cart, finalizar-compra, mi-cuenta) | `content/es/pages` = **24** + 4 páginas de sistema nuevas | ✅ |
| Posts publicados | 20 (uno oculto del sitemap: manuel-santos, recuperado) | `content/es/posts` = **20** | ✅ |
| **Pedidos históricos** | 6 (4 wc-failed, 2 wc-processing; suma **$13,127.04 MXN**) | seed `pedidos-historicos.json` = **6, totales al centavo** desde `_order_total` + líneas desde `wc_order_product_lookup` | ✅ al centavo |
| Usuarios | 3 administradores | seed `admins` con **hash original intacto** (login transparente phpass/bcrypt-WP, roundtrip verificado) | ✅ |
| Clientes registrados | 0 | n/a | ✅ |
| Cupones / zonas de envío / tasas de impuesto / suscripciones / membresías | 0 en el original | no aplican | ✅ |
| Reseñas | 170, TODAS sin aprobar (invisibles en el sitio) | conservadas en `reference/db-export/comments.json`; no se publican (igual que el original) | ✅ |
| Envíos de formularios (nf_sub) | 120 | conservados en `reference/db-export/` (posts+postmeta); los nuevos van a la DB de la API | ✅ conservados |
| Media | 2,120 originales (0.78 GB) + thumbs | permanecen en `wp-content/uploads/` del servidor con rutas idénticas (manifiesto completo en `reference/media-manifest.json`; 0 faltantes) | ✅ |
| URLs 200 del original | 526 comparables | **528 generadas**, paridad de contenido **99.6 %** (524 idénticas; 2 rediseñadas por excepción #1) | ✅ |
| Redirecciones | `/inicio/`→`/` + canónicos www/https/slash | reproducidas en `.htaccess` + `redirects.json` | ✅ |
| Notas de pedido (13) | order_notes | en `reference/db-export/comments.json` (histórico consultable) | ✅ conservadas |

Nota HPOS: `woocommerce_order_items`/`_itemmeta` venían **vacías en el dump**; las líneas de pedido se reconstruyeron desde `wc_order_product_lookup` (8 líneas) y cuadran con los totales de `wc_order_stats`. En el delta del cutover se cotejará contra la DB viva (docs/06-cutover.md paso 4).
