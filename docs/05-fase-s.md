# 05 — Fase S: Reconstrucción (informe)

**Enfoque ejecutado — híbrido §5.5:** "el HTML renderizado define la estructura; la DB define los datos", aplicado literalmente:

| Grupo de URLs | Cómo se genera | Datos |
|---|---|---|
| 368 fichas de producto | Referencia propia + parche de datos (title SEO, precio, SKU) + isla de carrito | `content/catalogo/productos.json` |
| 52 categorías + 47 etiquetas + 6 marcas | Referencia propia + **grid conciliado contra el catálogo** (quita eliminados, agrega nuevos ocultos + botón "cargar más" estático que sustituye el ajax del original) | catálogo + `grid` de referencia |
| 24 páginas + 20 posts + autor/archivos | **Congeladas**: HTML de referencia con enlaces relativos, SDKs de pago retirados (excepciones #1-2), islas activas | `content/es/{pages,posts}/*.json` |
| `/cart/`, `/finalizar-compra/`, `/mi-cuenta/`, `/pedido-recibido/` | **Reconstruidas**: chrome del tema transplantado + contenido funcional propio (contra entrega) | islas + API |
| 404, sitemaps (10), robots.txt | Referencia congelada servida idéntica | — |

**Productos nuevos** (sin referencia): se generan con plantilla donante + datos completos (título, imagen, descripción, precio).

## Módulos dinámicos entregados

- **Búsqueda** (isla vanilla): índice estático de 368 productos, busca por nombre **y SKU** (paridad con el snippet "Buscar SKU en Ajax Search Lite"), sin servidor.
- **Carrito + checkout contra entrega**: localStorage + páginas propias con los MISMOS campos billing_* del original; pedido → `POST /api/pedidos` (precios validados en servidor, numeración continúa después de 10053) → correos a tienda y cliente.
- **Formularios**: los Ninja Forms de las páginas (cotización en fichas, catálogo) se re-renderizan desde sus datos inline y envían a `POST /api/formularios` → DB + correo.
- **API**: contrato único implementado 2 veces — `apps/api` (Hono/Workers, camino de producción del ADR, pendiente de token CF) y `apps/api-php` (**operativa hoy en staging**: SQLite + mail()).
- **Panel v1** (`/admin/`): login transparente con las contraseñas WP originales (phpass y bcrypt-WP verificados con roundtrip), módulos Mensajes recibidos, Pedidos (cambio de estado) y Productos (precio/stock con efecto inmediato en API).

## Paridad medida (scripts/parity.mjs)

**524/526 URLs idénticas (99.6 %)** en title, description, canonical, robots, secuencia h1-h6, enlaces, imágenes y JSON-LD. Las 2 diferencias: `/cart/` y `/mi-cuenta/` (reconstruidas por la excepción #1). ➜ `reports/parity/resumen.md`. Meta ≥99 %: **cumplida**.

## Deuda técnica declarada (post-cutover)

1. **Componetización**: las páginas congeladas se convierten a secciones tipadas editables plantilla por plantilla (orden: home → sectores → nosotros → blog). Hasta entonces, sus textos se editan vía `reference/html/` + rebuild (docs/09-operacion.md).
2. **M2 profundo**: las páginas heredan los ~65 CSS/~77 JS del tema original → Lighthouse similar al original (44-52). Las mejoras invisibles aplicadas (SDKs de pago fuera, caché larga, cabeceras de seguridad, lazy en imágenes generadas) no bastan para ≥95: eso llega con la componetización. Medición en docs/05-rendimiento.md.
3. Atajos `?p=ID` → mapa completo de 301 (hoy: redirigen a portada).
4. Panel: edición editorial de páginas (requiere 1.).
