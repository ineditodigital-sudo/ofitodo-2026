# Estado del proyecto — Ofitodo wp-rebuild

**Actualizado:** 2026-08-26

| Campo | Valor |
|---|---|
| Fase actual | **C2 — Referencia e inventario: rastreo en curso (~5 h)** |
| % avance global | 20 % |
| Siguiente paso | Al terminar el rastreo: regenerar inventario con datos del crawl, Lighthouse base de 10 páginas, componentes recurrentes → compuerta C2 |
| Bloqueos | Ninguno |

## Bitácora

- **2026-08-26** — C2 en marcha: DB exportada a `reference/db-export/` (21 tablas JSON), inventario base en `docs/02-inventario.md`, manifiesto de media (2,120 originales/0.78 GB + 19,649 thumbs + 5,632 huérfanos, nada faltante), canónico verificado (https, sin www, trailing slash, `?p=`→301), rastreo de 533 URLs corriendo en segundo plano. Hallazgos: Cloudflare ACTIVO (ficha actualizada); GTM-KK4C8J9P + AW-11184632208 + AW-951553100 + GT-55XJKWD + GA4 G-KDXBWMR8FD; solo 37/368 productos con precio (catálogo de cotización); 170 reseñas TODAS sin aprobar (no visibles); pedidos: 4 fallidos + 2 de $0; `woocommerce_order_items` vacía en dump (delta del cutover desde DB viva); snippet activo "Buscar SKU en Ajax Search Lite"; fuentes Google: Josefin Sans, Bellefair, Lato, Biryani; home sin `<h1>` (candidata a mejora, no se toca).

- **2026-08-26** — **Compuerta C1 APROBADA** por Cristian. Decisiones: solo pago contra entrega (sin BACS/PayPal/MercadoPago → `excepciones.md`), sin Zaps (`/wp-json` → 410), 1 rol admin en panel, repo `github.com/ineditodigital-sudo/ofitodo-2026`. Inicia C2.
- **2026-08-26** — C1 completado. Backup Installatron inspeccionado (`SITIO WEB OLD OFITODO/`), DB analizada (prefijo activo `S7tWp_`; ignora el prefijo viejo `wp_`), sitio vivo verificado. Ver [01-diagnostico.md](01-diagnostico.md). Ficha llena en [00-prompt-maestro.md](00-prompt-maestro.md). Credenciales FTP de staging en `.env` (git-ignored).

## Datos operativos clave (no secretos)

- Backup: `app_ofitodo-com_Ofitodo_2026-08-25_11-41-23.tar.gz` (raíz del proyecto); extraído en `SITIO WEB OLD OFITODO/` (WP completo + `APP-DATA.SQL`).
- Deploy staging: FTPS `ftp.ofitodo.com:21` → `public_html/temporal.ofitodo.com` (= `https://temporal.ofitodo.com`). Credenciales SOLO en `.env`.
- Producción: `https://ofitodo.com` (cPanel GoDaddy). uploads/ = 2.49 GB → se queda en servidor.
- Contenido: 418 productos simples, 28 páginas, 23 posts, 181 enhancedcategory, 170 reseñas, 6 pedidos, 3 usuarios admin, 3 formularios Ninja, español único.
- Header/footer del tema construidos con Elementor (elementor-hf); páginas mezclan Elementor + WPBakery + shortcodes mkd.
