# 04 — Preview de staging en temporal.ofitodo.com

**Objetivo (orden de Cristian, 2026-08-26):** poder visualizar el sitio ya en el dominio de staging.

## Qué se despliega

Export estático 1:1 de la **referencia congelada de C2** (el HTML renderizado real del sitio vivo, 533 URLs):

- Estructura de carpetas = URLs exactas del original (`/nosotros/` → `nosotros/index.html`).
- Fidelidad visual total: mismo HTML, mismo CSS/JS del tema, mismas imágenes.
- Los assets (`/wp-content/`, `/wp-includes/`) y los canónicos/og:url siguen apuntando a `https://ofitodo.com` → no se duplican 2.5 GB de media y el SEO de producción no se toca.
- Enlaces de navegación reescritos a relativos → se navega dentro de temporal.
- Protección SEO de staging: `.htaccess` con `X-Robots-Tag: noindex, nofollow` + `robots.txt` con `Disallow: /`.

## Qué NO funciona en este preview (y por diseño)

| Función | Estado en preview | Dónde se implementa de verdad |
|---|---|---|
| Búsqueda ajax (con SKU) | no opera | isla React + API (Fase S) |
| Carrito / checkout | no opera | islas React + API, pago contra entrega (Fase S) |
| Formularios Ninja | no envían | API + SMTP actual (Fase S) |
| Mini-carrito del header | estático | isla React (Fase S) |

El preview es la **línea base visual** sobre la que la reconstrucción Astro se compara (diff visual ≤0.5 %). Cada plantilla reconstruida va sustituyendo su versión estática en staging.

## Cómo re-desplegar

```
node scripts/wp-static-export.mjs
node scripts/deploy-ftps.mjs dist-static
```
