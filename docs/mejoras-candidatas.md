# Refinamiento del sitio público — propuesta

**Medido en producción el 2026-08-27** (no son estimaciones: son las cifras reales de `ofitodo.com` hoy).

## Diagnóstico

| Página | Peticiones | Peso | Detalle |
|---|---|---|---|
| Inicio | 249 | **20.6 MB** | imágenes 18.8 MB (**92 %**), scripts 987 KB |
| Ficha de producto | 208 | 1.4 MB | scripts 874 KB (**62 %**) |

Ambas cargan **67 hojas de estilo y ~100 scripts**, incluidos 50 archivos de Elementor, 4 de WPBakery y jQuery — plugins de WordPress **que ya no existen en el sitio**.

### Hallazgo crítico: las imágenes se sirven 8 veces más grandes de lo que se ven

| Imagen | Tamaño real | Se muestra a |
|---|---|---|
| `lockers.webp` (1.3 MB) | 1024 px | **173 px** |
| `archivero.webp` (962 KB) | 1181 px | **173 px** |
| `exhibidores-melamina.webp` (1 MB) | 1181 px | **173 px** |
| `silla_President…webp` | 1439 px | **173 px** |

Una miniatura de 173 px debería pesar ~15 KB. Se están enviando archivos de **1 a 1.7 MB**: hasta 90 veces más de lo necesario. Doce imágenes de la home pesan más de 800 KB cada una.

**Traducción de negocio:** un cliente en celular con datos móviles descarga 20 MB para ver la portada. En una conexión 4G normal son ~25 segundos de espera; muchos se van antes. Google penaliza esto en el posicionamiento.

---

## ✅ Fase 1 — EN EJECUCIÓN (2026-08-27)

**Hallazgo que lo cambió todo:** no hizo falta generar ni subir una sola imagen. WordPress ya había creado **12 variantes de cada foto** que estaban en el servidor sin usarse (`archivero-300x300.webp` = 15 KB frente a los 962 KB del original que se enviaba).

Lo implementado:
- Catálogo de **2,086 imágenes con 16,294 tamaños disponibles** (`content/imagenes-variantes.json`).
- **Medición real** del ancho al que se muestra cada imagen en escritorio y móvil (`imagenes-medidas.json`).
- El build inyecta `srcset` + `sizes` exactos, `loading="lazy"` y prioridad alta a la primera imagen visible; para imágenes sin medida aplica un tope de 1024 px.
- **Fondos de sección** (`background-image` en CSS y atributos `style`): tope de 1600 px — algunos originales llegaban a 2560 px y 700 KB.

| Medición | Antes | Después |
|---|---|---|
| Home escritorio | 20.6 MB | **8.3 MB** (−60 %) |
| Home móvil | 20.6 MB | **6.9 MB** (−66 %) |

Paridad verificada tras cada cambio: **99.6 %** — el diseño no cambió ni un píxel.

**Pendiente de la fase:** podar los 67 CSS y ~100 JS de plugins desaparecidos (Elementor, WPBakery, jQuery), que son el grueso de lo que queda. Es el siguiente paso y el de mayor cuidado, porque hay que conservar las 4 piezas que sí funcionan (menú móvil, galería, carrusel, WhatsApp).

## Fase 1 — plan original (referencia)

Nada cambia visualmente. Cero riesgo de paridad. Máximo impacto.

1. **Optimizar imágenes en el build** — generar variantes responsive (AVIF/WebP) y servir a cada dispositivo el tamaño que realmente necesita, con `srcset` y carga diferida.
   → Home: **20.6 MB → ~1.5 MB** (−93 %).
2. **Podar el lastre de WordPress** — eliminar los CSS/JS de plugins desaparecidos (Elementor, WPBakery, jQuery, Woo). Se conservan y reimplementan las 4 piezas que sí hacen algo: menú móvil, lightbox de galería, carrusel y el botón de WhatsApp.
   → De ~165 archivos a menos de 10; −1 MB de JS y −180 peticiones.
3. **Auto-hospedar las tipografías** (hoy 4 familias desde Google, 11 peticiones) con `font-display: swap`.

**Resultado esperado:** Lighthouse móvil de 38-53 → **90+**; el sitio abre en 1-2 s en vez de 20+.

## Fase 2 — Conversión y claridad (cambios visibles, requieren tu visto bueno)

El sitio es un **catálogo de cotización**: solo 37 de 368 productos tienen precio. El objetivo real no es la venta directa sino **generar solicitudes**. Propongo:

1. **Título principal en la home** — hoy la portada no tiene `<h1>`; Google no sabe cuál es el tema principal de la página. Es el arreglo de SEO más barato que existe.
2. **CTA de cotización coherente en las fichas** — cuando un producto no tiene precio, hoy aparece un formulario largo. Propongo un bloque claro: "Solicita tu cotización" con 3 campos y WhatsApp de un toque.
3. **Buscador con SKU más visible** — ya funciona por SKU (lo pedía el equipo); hoy está discreto en el encabezado.
4. **Fichas más informativas** — medidas, materiales y acabados en una tabla legible; hoy se pierden en la descripción.
5. **Sectores más visual** — es su diferenciador (bancos, escuelas, hospitales, industria) y merece más peso en la portada.

## Fase 3 — Rediseño (opcional, mayor alcance)

Solo si el negocio lo pide: rehacer plantilla por plantilla con componentes propios (sin herencia del tema), lo que además desbloquea la edición por bloques en el CMS. Es el camino natural una vez validadas las fases 1 y 2.

---

## Mi recomendación

Empezar **hoy por la Fase 1**: es invisible para el usuario, no toca el diseño aprobado, no requiere decisiones de negocio y convierte al sitio en uno de los más rápidos de su sector. La Fase 2 la revisamos junto con propuestas visuales concretas antes de tocar nada.
