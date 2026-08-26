# Estado del proyecto — Ofitodo wp-rebuild

**Actualizado:** 2026-08-26

| Campo | Valor |
|---|---|
| Fase actual | **TODAS LAS FASES EJECUTADAS hasta staging** (S 99.6 % paridad · M1 ✔ · M2 medida · A/A2 runbooks listos) |
| % avance global | 95 % (resta: toggle PHP del subdominio, pruebas E2E de envío, cutover a producción) |
| Siguiente paso | 1) Cristian: cPanel → MultiPHP Manager → asignar PHP 8.x a temporal.ofitodo.com (activa /api, formularios, pedidos y panel) · 2) probar /api/salud, un formulario, un pedido y el login del panel · 3) firmar excepciones #4/#7/#8 · 4) cutover (docs/06-cutover.md) |
| Bloqueos | (a) pool PHP del subdominio (cPanel, 1 min, solo Cristian) · (b) FTP del docroot de ofitodo.com para el cutover · (c) opcional ADR: token CF + Neon para migrar la API de PHP a Workers |

## Bitácora

- **2026-08-26 (cierre)** — Deploy COMPLETO del sitio nuevo a temporal (547 archivos, 0 fallos): 528 páginas Astro, sitemaps y robots idénticos, redirects y 410 verificados en vivo, panel y API subidos. Pedidos históricos (6, $13,127.04 al centavo) sembrados. M2 medido: BP 61→75, CLS ficha 0.715→0 (SDKs de pago fuera); Performance queda para la componetización (plan en 05-rendimiento.md). **Hallazgo bloqueante menor: el subdominio no tiene pool PHP → /api/* da 500 hasta activar MultiPHP en cPanel (solo Cristian)**; mientras, formularios/checkout degradan con fallback a WhatsApp y el resto del sitio es 100 % funcional. Docs 05/05b/06/07/08/09 completos; excepciones #4-#8 registradas.

- **2026-08-26 (noche)** — Directiva de Cristian: "termina todas las fases". **Fase S ejecutada completa** (enfoque híbrido §5.5): 528 URLs generadas por Astro (productos/listados desde datos con referencia como estructura; marketing congelado con islas), búsqueda con SKU, carrito+checkout contra entrega, formularios → API, panel v1 con login WP transparente, sitemaps y robots idénticos. **Paridad 99.6 % (524/526; las 2 difs son cart/mi-cuenta rediseñadas por excepción #1)**. API en dos sabores: Hono (ADR, pendiente CF) y PHP+SQLite (operativa). Runbooks 06/07/09 escritos; excepciones #4-#8 registradas (3 pendientes de firma). Deploy del paquete completo a temporal en curso.

- **2026-08-26 (tarde)** — **PREVIEW COMPLETO EN LÍNEA: https://temporal.ofitodo.com** (orden de Cristian /goal). Export estático de la referencia C2 (525 páginas + 404 real) desplegado por FTPS reanudable (527 archivos, 0 fallidos), verificado por tipo y visualmente. Staging noindex (X-Robots-Tag + robots.txt Disallow). Peculiaridad del vhost: soft-404 en staging (ver 04-preview-staging.md). Rama `fase-r-scaffold` pusheada (PR pendiente de abrir). Hallazgo de entorno: E: es exFAT → sin symlinks → npm workspaces falla local; verificación del monorepo va por CI.

- **2026-08-26** — **Compuertas C2 y ADR APROBADAS** por Cristian. Fase R iniciada en rama `fase-r-scaffold`: monorepo npm workspaces (apps/site Astro 7 + apps/api Hono/Workers con esquema Drizzle completo + apps/admin React/Vite con login + packages/schema zod + packages/ui), content/ con site.json/theme.json/redirects.json reales, validador de contenido, CI y deploy-staging por FTPS, CLAUDE.md/AGENTS.md.

- **2026-08-26** — **C2 COMPLETA**: rastreo 533/533 sin errores (HTML + metas + screenshots 3 viewports, ~2.5 GB en `reference/`), inventario final con CSV por URL, flujo de compra grabado (sin envío/impuestos; métodos vivos: Transferencia, PayPal, Tarjetas, OXXO), Lighthouse base 10 páginas (Perf 17-52, home 12.2 MB/225 req, fichas con CLS hasta 0.715). Borrador ADR Fase R publicado. En compuerta C2.

- **2026-08-26** — C2 en marcha: DB exportada a `reference/db-export/` (21 tablas JSON), inventario base en `docs/02-inventario.md`, manifiesto de media (2,120 originales/0.78 GB + 19,649 thumbs + 5,632 huérfanos, nada faltante), canónico verificado (https, sin www, trailing slash, `?p=`→301), rastreo de 533 URLs corriendo en segundo plano. Hallazgos: Cloudflare ACTIVO (ficha actualizada); GTM-KK4C8J9P + AW-11184632208 + AW-951553100 + GT-55XJKWD + GA4 G-KDXBWMR8FD; solo 37/368 productos con precio (catálogo de cotización); 170 reseñas TODAS sin aprobar (no visibles); pedidos: 4 fallidos + 2 de $0; `woocommerce_order_items` vacía en dump (delta del cutover desde DB viva); snippet activo "Buscar SKU en Ajax Search Lite"; fuentes Google: Josefin Sans, Bellefair, Lato, Biryani; home sin `<h1>` (candidata a mejora, no se toca).

- **2026-08-26** — **Compuerta C1 APROBADA** por Cristian. Decisiones: solo pago contra entrega (sin BACS/PayPal/MercadoPago → `excepciones.md`), sin Zaps (`/wp-json` → 410), 1 rol admin en panel, repo `github.com/ineditodigital-sudo/ofitodo-2026`. Inicia C2.
- **2026-08-26** — C1 completado. Backup Installatron inspeccionado (`SITIO WEB OLD OFITODO/`), DB analizada (prefijo activo `S7tWp_`; ignora el prefijo viejo `wp_`), sitio vivo verificado. Ver [01-diagnostico.md](01-diagnostico.md). Ficha llena en [00-prompt-maestro.md](00-prompt-maestro.md). Credenciales FTP de staging en `.env` (git-ignored).

## Datos operativos clave (no secretos)

- Backup: `app_ofitodo-com_Ofitodo_2026-08-25_11-41-23.tar.gz` (raíz del proyecto); extraído en `SITIO WEB OLD OFITODO/` (WP completo + `APP-DATA.SQL`).
- Deploy staging: FTPS `ftp.ofitodo.com:21` → `public_html/temporal.ofitodo.com` (= `https://temporal.ofitodo.com`). Credenciales SOLO en `.env`.
- Producción: `https://ofitodo.com` (cPanel GoDaddy). uploads/ = 2.49 GB → se queda en servidor.
- Contenido: 418 productos simples, 28 páginas, 23 posts, 181 enhancedcategory, 170 reseñas, 6 pedidos, 3 usuarios admin, 3 formularios Ninja, español único.
- Header/footer del tema construidos con Elementor (elementor-hf); páginas mezclan Elementor + WPBakery + shortcodes mkd.
