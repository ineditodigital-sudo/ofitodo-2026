# 01 — Diagnóstico (Fase C1)

**Fecha:** 2026-08-26 · **Fuentes:** backup Installatron `app_ofitodo-com_Ofitodo_2026-08-25_11-41-23.tar.gz` (2.8 GB, extraído en `SITIO WEB OLD OFITODO/`) + sitio vivo `https://ofitodo.com`.

## Identidad del sitio

| Dato | Valor |
|---|---|
| Sitio | **Ofitodo** — "Mobiliario para oficina y más" (Aguascalientes, MX) |
| URL producción | `https://ofitodo.com` (APP-META registra `www.ofitodo.com`; canónico a confirmar en C2) |
| Sitio vivo | **Sí** — verificado 2026-08-26, operativo |
| WordPress | 6.9.7, idioma `es_ES`, PHP 8.1, cPanel (secureserver.net / GoDaddy), Installatron |
| Prefijo de tablas activo | `S7tWp_` — el dump también contiene una instalación vieja con prefijo `wp_` que **NO se migra** |
| Tema activo | **Entre 1.6** (Mikado, con plugin `mkd-core`); sin tema hijo. Inactivos: interico, hello-elementor, twenty* |
| Portada | página ID 10551 (`show_on_front=page`); sin página de blog asignada (`page_for_posts=0`) |
| Permalinks | `/%postname%/` · tienda: `/producto/`, `/categoria-producto/`, `/product-tag/` |
| Moneda / país | MXN · `MX:AG` |
| Multisite | Permitido en `wp-config.php` pero **no activo** |
| Backup formato | cPanel/Installatron: raíz web completa + `APP-DATA.SQL` (66 MB) + `APP-META.INI` |
| uploads/ | **2.49 GB, 27,401 archivos** (incluye thumbnails generados) → se queda en servidor, fuera de Git (§5.6) |

## Contenido (prefijo `S7tWp_`)

| Tipo | Conteo | Nota |
|---|---|---|
| `product` | 418 | Sin variaciones detectadas (`product_variation` = 0) |
| `page` | 28 | |
| `post` | 23 | Blog |
| `attachment` | 2,120 | |
| `enhancedcategory` | 181 | Diseños de páginas de categoría (plugin Enhanced Category Pages) — contenido real de categorías vive aquí |
| `nav_menu_item` | 38 | 3 menús |
| `shop_order` | **6** | Historial mínimo; formato posts (HPOS no activo) |
| `nf_sub` | 120 | Envíos de Ninja Forms → migrar a DB |
| `elementor_library` / `elementor-hf` | 6 / 2 | **Header y footer construidos con Elementor** (header-footer-elementor) |
| `feedback` | 69 | Envíos de Jetpack antiguos (plugin inactivo) — conservar en `_no-publicado` |
| `wpcode` snippets | 4 | Revisar en C2 (pueden contener tracking o funciones) |
| `revision` / `customize_changeset` / otros | 151 / 2 / ~10 | Conservar sin compilar |
| Reseñas de producto | **170** (comments tipo `review`) | + 13 `order_note` |
| Comentarios de blog | 0 | |
| Taxonomías | 55 `product_cat`, 73 `product_tag`, 12 `category`, 17 `post_tag` | Sin atributos `pa_*` (los 418 productos son simples) |
| Usuarios | **3 — todos `administrator`** | **No hay cuentas de clientes** (1 hash phpass `$P$`, 2 bcrypt `$wp$`) |
| Formularios | 3 Ninja Forms: "Contact Me", "Formulario", "FORMULARIO" | Campos a inventariar en C2 |

## Plugins activos (32) — clasificación §3.2

| Categoría | Plugins | Acción |
|---|---|---|
| SEO | Yoast SEO 28.1, Google Site Kit | Extraer metas/schema/sitemaps; conservar IDs de Analytics |
| Comercio | WooCommerce 10.9.4, Mercado Pago 8.9.0, PayPal Payments 4.1.1, Skydropx (envíos), Load More Products, Themify WC Product Filter | Módulo §6.2 |
| Builders | Elementor 4.2.0 + Essential/Premium/Royal Addons + Header Footer Elementor, WPBakery (js_composer 6.9.0), mkd-core (tema) | HTML renderizado = estructura; mapear a componentes |
| Formularios | Ninja Forms 3.14.10 | Reproducir campos; backend en API |
| Búsqueda | Ajax Search Lite, SearchWP Live Ajax Search | Pagefind (editorial) + API (catálogo) |
| Contacto | Creame WhatsApp Me (joinchat) | Reproducir botón/comportamiento idéntico |
| Correo | WP Mail SMTP 4.9.0 | SES en el nuevo sistema |
| Integraciones | **Zapier 1.5.3 activo** | ⚠ Confirmar con Cristian qué Zaps existen (§6.5) |
| Contenido | Enhanced Category Pages, Enhanced Media Library, Simple Tags, Unlist Posts, Column/Meks shortcodes | Mapear a esquema de contenido |
| Infra (ignorar) | Cloudflare, Better Search Replace, Migrate Guru, Envato Market, WP Headers and Footers | — |

## Restos de plugins desinstalados (tablas huérfanas — no migrar, documentar)

RevSlider, Smart Slider 3 (nextend2), Forminator (`frmt_*`), AIOSEO, TranslatePress (`trp_*`, solo `es_es`), UserFeedback, Jetpack sync, WPForms, WPCode (`snippets`), Google Listings & Ads (`gla_*`), Ajax Search Pro (`asp_*`).

## Módulos dinámicos (§3.3) — alcance confirmado

| Módulo | Estado | Enfoque |
|---|---|---|
| **Comercio** | ✅ Activo | 418 productos simples, 55 categorías, 170 reseñas, 6 pedidos, envío flat_rate + free_shipping + Skydropx. Pasarelas **habilitadas: Transferencia bancaria (BACS) + PayPal (ppcp-gateway)**; Mercado Pago instalado pero sin evidencia de estar habilitado |
| Auth / miembros | ⚪ Mínimo | Solo 3 admins; **sin clientes registrados, sin membresías** → login solo para el panel; "Mi cuenta" de Woo a confirmar en C2 (probablemente sin uso) |
| Multilenguaje | ❌ No | Español único (restos de TranslatePress inactivos) |
| Comentarios | ⚪ Solo reseñas | 170 reseñas Woo pre-renderizadas; blog sin comentarios |
| `/wp-json/` | ⚠ Por confirmar | Plugin Zapier activo = posible consumidor real |
| Correos | ✅ | Woo transaccionales + Ninja Forms vía WP Mail SMTP → SES |
| CFDI | ❌ No | Sin plugin de facturación |

## Decisiones §3.4 — RESUELTAS en compuerta C1 (Cristian, 2026-08-26)

1. **Pasarelas:** ✅ **SOLO pago contra entrega (COD)**. Se retiran BACS y PayPal del checkout nuevo → excepción de paridad aprobada, ver [excepciones.md](excepciones.md). Sin integración de pasarela en línea: el checkout crea el pedido y notifica por correo.
2. **Historial de pedidos:** ✅ sí, los 6 completos.
3. **Idiomas:** ✅ es únicamente.
4. **Comentarios:** ✅ blog cerrado; reseñas Woo como estaban.
5. **Consumidores `/wp-json/`:** ✅ **ninguno** (Cristian confirma que no hay Zaps) → todo `/wp-json/*`, `?rest_route=`, `/xmlrpc.php`, `/wp-cron.php` → 410.
6. **Editores del panel:** default aceptado — 1 rol administrador (ajustable antes de la Fase S del panel).
7. **Repo GitHub:** ✅ `https://github.com/ineditodigital-sudo/ofitodo-2026.git`, rama `main`.

**Compuerta C1: APROBADA (2026-08-26) → avanza a C2.**
