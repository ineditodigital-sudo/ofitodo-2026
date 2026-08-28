# 03 — Arquitectura (Fase R) — APROBADA

> Estado: **APROBADA por Cristian (2026-08-26)** junto con la compuerta C2. Congelada; cambios solo por nuevo ADR.
> Basado en los hallazgos de C1/C2: catálogo de cotización (368 productos, 37 con precio), sin clientes registrados, un idioma, pago solo contra entrega, Cloudflare activo, hosting cPanel GoDaddy vía FTPS.

## ADR-001 · Generador del sitio público: **Astro** (opción A del §5.1)

**Decisión propuesta:** Astro + islas React.
**Motivo:** HTML puro pre-renderizado (SEO intacto), Vite por debajo, islas React solo donde hay interactividad real: búsqueda (con SKU), filtros de catálogo, carrito, checkout contra entrega, formularios. El sitio es 95 % contenido estático — React full-page (opción B) cargaría JS sin beneficio.
**Alternativa descartada:** Vite + React SSG (Vike). Se reconsidera solo si Cristian quiere React en toda la página.

## ADR-002 · Capa dinámica (API): **Cloudflare Workers + Hono**

**Decisión propuesta:** API en Cloudflare Workers (framework Hono, TypeScript), enrutada como `ofitodo.com/api/*` en la MISMA zona de Cloudflare que ya existe. Panel en `ofitodo.com/admin/*` (SPA React servida por el mismo Worker).
**Motivo:** Cloudflare ya está delante del dominio (beacon activo) → rutas del mismo dominio = cookies simples, sin CORS, sin servidor que mantener, capa gratuita sobrada para este tráfico.
**Alternativa:** Replit Autoscale (Node/Express) si algún límite de Workers estorba (jobs largos, librerías nativas). La forma de la API es la misma en ambos.
**Pendiente:** acceso a la zona de Cloudflare (API token) — necesario también para purga de caché en deploys.

## ADR-003 · Base de datos: **PostgreSQL (Neon) + Drizzle**

Serverless, compatible con Workers (driver HTTP de Neon), capa gratuita suficiente (catálogo chico). Migraciones Drizzle versionadas en `apps/api/`. Tablas §5.4 recortadas a lo que este sitio usa de verdad:
`users` (3 admins, `legacy_hash` phpass/bcrypt→argon2id), `sessions`, `products`, `product_categories`, `product_brands`, `product_tags`, `product_media`, `orders` (+`order_items`, `order_addresses`, `order_notes` — pago contra entrega), `reviews` (170 sin aprobar, archivo), `form_submissions` (120 históricos + nuevos), `content_versions`, `publish_jobs`, `audit_log`. Todas con `legacy_id`.
Sin: memberships, coupons, tax_rates, shipping_zones, subscriptions, payments de pasarela (no existen en el original).

## ADR-004 · Correo: **mismo SMTP actual** (no SES)

El original envía por WP Mail SMTP: from `formularios@ofitodo.com` → destino `ventasofitodo@hotmail.com`. La API usará **el mismo servidor SMTP y remitente** (credenciales en Secrets) = paridad exacta de remitente/entregabilidad sin abrir cuenta AWS. SES queda como alternativa si el SMTP de GoDaddy da problemas desde Workers (se probaría con MailChannels/SMTP relay).
Disparadores: 3 formularios Ninja (mismos textos/destinos), pedido contra entrega (nuevo pedido → tienda y cliente).

## ADR-005 · Reparto de datos

- **Editorial → repo** (`content/`): 27 páginas, 20 posts, menús, `site.json`, `theme.json`, `redirects.json`, textos de categoría (181 diseños enhancedcategory se consolidan en las 52 categorías reales).
- **Operativo → DB:** productos, pedidos, mensajes de formulario, reseñas archivadas, usuarios del panel.
- **Catálogo:** DB → build pre-renderiza fichas/categorías (SEO); precio/stock se hidratan desde `/api` (solo 37 con precio; el resto muestra CTA de cotización idéntico al original). Rebuild agrupado máx. 1/15 min.
- **Media:** `wp-content/uploads/` se queda en el servidor con rutas idénticas (2.49 GB). Variantes AVIF/WebP nuevas en `public/media/`. Subidas del panel: editoriales → repo; de producto → R2 (pendiente confirmar con acceso CF) o FTP al servidor.

## ADR-006 · Deploy y entornos

- **Staging:** `temporal.ofitodo.com` (FTPS explícito :21, docroot directo — validado). `noindex` + basic auth mientras dure la migración.
- **Producción:** docroot de `ofitodo.com` (mismo servidor GoDaddy; FTPS con la cuenta que corresponda en el cutover).
- GitHub Actions: `ci.yml` (lint, typecheck, content:validate, test, build, parity, links), `deploy-staging.yml` (merge a main → FTPS a temporal), `deploy-prod.yml` (tag v* + aprobación de Cristian en Environment `production` → respaldo lftp+pg_dump → deploy → smoke → purga CF), `rollback.yml`, `rebuild-on-content.yml`.
- FTP sin SSH → `SamKirkland/FTP-Deploy-Action` incremental, `dangerous-clean-slate: false`, exclude `wp-content/uploads/**`.

## ADR-007 · Panel `/admin`

React (Vite) + `packages/ui` compartido con el sitio para vista previa en vivo. Un rol (administrador). Módulos según inventario real: Páginas y secciones, Blog, Menús, Tienda (productos/categorías/marcas/pedidos), Mensajes recibidos, Redirecciones, SEO por página, Tema (colores/tipos acotados), Correos enviados. Publicación editorial = commit del bot → Action → FTPS. Operativo = DB directo.

## Estructura del monorepo

Según §5.2 del prompt maestro (sin cambios): `apps/site` (Astro), `apps/api` (Hono/Workers), `apps/admin` (React), `packages/schema` (zod), `packages/ui`, `content/`, `public/`, `scripts/`, `config/`, `docs/`, `reference/`.

## Riesgos y pendientes

| Riesgo | Mitigación |
|---|---|
| Acceso a zona Cloudflare no confirmado | Pedir API token a Cristian antes de Fase S; sin él, alternativa `api.ofitodo.com` (DNS del subdominio directo a Workers) |
| SMTP GoDaddy desde Workers (puerto 25/465 bloqueado en Workers) | Workers no hace SMTP saliente directo → usar binding a MailChannels (gratis en Workers) con el mismo From, o relay HTTP; validar en staging con envío real |
| argon2id en Workers (WASM) | Lib `@noble/hashes` scrypt como alternativa; verificación phpass/bcrypt portada a JS (existen libs); probar con los 3 hashes reales |
| 181 enhancedcategory vs 52 categorías | Mapear diseño→término en la conversión; los sobrantes a `_no-publicado` |
