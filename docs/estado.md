# Estado del proyecto — Ofitodo wp-rebuild

**Actualizado:** 2026-08-26

| Campo | Valor |
|---|---|
| Fase actual | **C2 — Referencia e inventario: EN CURSO** |
| % avance global | 12 % |
| Siguiente paso | Rastreo Playwright del sitio vivo + export DB (`APP-DATA.SQL` → JSON) + `docs/02-inventario.md` |
| Bloqueos | Ninguno |

## Bitácora

- **2026-08-26** — **Compuerta C1 APROBADA** por Cristian. Decisiones: solo pago contra entrega (sin BACS/PayPal/MercadoPago → `excepciones.md`), sin Zaps (`/wp-json` → 410), 1 rol admin en panel, repo `github.com/ineditodigital-sudo/ofitodo-2026`. Inicia C2.
- **2026-08-26** — C1 completado. Backup Installatron inspeccionado (`SITIO WEB OLD OFITODO/`), DB analizada (prefijo activo `S7tWp_`; ignora el prefijo viejo `wp_`), sitio vivo verificado. Ver [01-diagnostico.md](01-diagnostico.md). Ficha llena en [00-prompt-maestro.md](00-prompt-maestro.md). Credenciales FTP de staging en `.env` (git-ignored).

## Datos operativos clave (no secretos)

- Backup: `app_ofitodo-com_Ofitodo_2026-08-25_11-41-23.tar.gz` (raíz del proyecto); extraído en `SITIO WEB OLD OFITODO/` (WP completo + `APP-DATA.SQL`).
- Deploy staging: FTPS `ftp.ofitodo.com:21` → `public_html/temporal.ofitodo.com` (= `https://temporal.ofitodo.com`). Credenciales SOLO en `.env`.
- Producción: `https://ofitodo.com` (cPanel GoDaddy). uploads/ = 2.49 GB → se queda en servidor.
- Contenido: 418 productos simples, 28 páginas, 23 posts, 181 enhancedcategory, 170 reseñas, 6 pedidos, 3 usuarios admin, 3 formularios Ninja, español único.
- Header/footer del tema construidos con Elementor (elementor-hf); páginas mezclan Elementor + WPBakery + shortcodes mkd.
