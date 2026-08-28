# 05b — Rendimiento (M2): antes vs después

Lighthouse mobile (throttling simulado). "Antes" = ofitodo.com (WordPress, 2026-08-26). "Después" = temporal.ofitodo.com (sitio nuevo, mismo día).

| Página | Antes P/A/BP/SEO | Después P/A/BP/SEO | Peso antes → después | CLS antes → después |
|---|---|---|---|---|
| Home (congelada) | 45/94/61/100 | 38/94/**75**/69* | 12.2 MB → 13.3 MB* | 0 → 0 |
| Ficha producto | **17**/85/61/92 | 39/85/**75**/61* | 2.4 MB → 3.3 MB* | **0.715 → 0** |
| Categoría escritorios | 46/94/61/100 | 53/94/**75**/69* | 2.3 MB → 3.3 MB* | 0 → 0 |
| Carrito (reconstruida) | 51/88/61/100 | 50/94/**75**/61* | 2.2 MB → 2.8 MB | 0 → 0.055 |

\* Los SEO 61-69 del "después" son consecuencia del **noindex deliberado de staging** (Lighthouse penaliza "page is blocked from indexing"); desaparece en producción. El peso "después" se mide sin la capa de optimización de Cloudflare que hoy sirve al dominio principal (staging va directo al origen GoDaddy); en producción el sitio nuevo quedará detrás del MISMO Cloudflare.

## Mejoras invisibles ya aplicadas (siempre permitidas §M2)

- SDKs de PayPal/MercadoPago retirados → **Best Practices 61 → 75** en todas las páginas y **CLS de fichas 0.715 → 0** (el botón inyectado causaba el brinco de layout).
- `loading="lazy"` en imágenes generadas; ítems extra de listados ocultos no descargan imagen.
- Cabeceras de seguridad y caché larga de assets en el `.htaccess` de producción.
- El "load more" ajax → estático (una petición menos al servidor, cero PHP).

## Por qué Performance sigue ≈ igual (y el plan)

Las páginas conservan por diseño los ~65 CSS y ~77 JS del tema original (paridad visual por construcción, Fase S híbrida). **La meta Lighthouse ≥95 y peso ≤40 % se alcanza en la fase de componetización** (deuda declarada en [05-fase-s.md](05-fase-s.md)): cada plantilla re-escrita con CSS propio desde `content/theme.json` va soltando el lastre del tema. Orden propuesto: ficha de producto (mayor tráfico SEO) → categorías → home → resto.

Presupuesto de referencia por plantilla componetizada: HTML+CSS+JS propio < 300 KB (vs 3.3 MB actuales) — dentro de la meta ≤40 % con margen amplio.
