// Extrae de reference/html los datos y el cuerpo de cada entrada del blog:
//   content/blog.json          → índice (título, fecha, imagen, resumen)
//   content/blog-cuerpos.json  → HTML del artículo, ya limpio de Elementor
//
// Salvaguarda de "cero pérdida": se compara el texto del artículo antes y
// después de limpiarlo. Si el extracto conserva menos del 95 %, la entrada NO
// se reconstruye y su página original se sirve intacta.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(RAIZ, 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

const R = (...p) => path.join(RAIZ, 'reference', ...p);
const C = (...p) => path.join(RAIZ, 'content', ...p);

const texto = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
// Conjunto de palabras significativas: comparar así detecta pérdida REAL de
// contenido e ignora repeticiones (los carruseles duplican diapositivas).
const palabras = (s) => new Set(
  texto(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
);
// Marcas inequívocas del encabezado y del pie del tema
const CHROME = /Generic selectors|BUSQUEDA POR TITULO|Mapa del Sitio|Todos los derechos reservados|MAS RESULTADOS/i;

const posts = readdirSync(C('es', 'posts'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(C('es', 'posts', f), 'utf8')));

const indice = [];
const cuerpos = {};

for (const p of posts) {
  const archivo = R('html', p.htmlRef);
  if (!existsSync(archivo)) { console.warn('sin referencia:', p.slug); continue; }
  const $ = load(readFileSync(archivo, 'utf8'));

  const imagen = $('meta[property="og:image"]').attr('content') || null;
  const fecha = $('meta[property="article:published_time"]').attr('content') || p.date || null;
  const modificado = $('meta[property="article:modified_time"]').attr('content') || p.modified || null;

  // Scripts y estilos fuera ANTES de medir: su contenido no es texto del artículo
  $('script, style, noscript, link, template').remove();

  // --- Aislar el artículo ---------------------------------------------------
  const bloques = $('[data-elementor-type="wp-post"]').toArray().filter((el) => !CHROME.test($(el).text()));
  const region = bloques.length ? $(bloques) : null;

  const entrada = {
    slug: p.slug, titulo: p.title, fecha, modificado, imagen,
    resumen: '', seo: p.seo, htmlRef: p.htmlRef,
    conserva: 0, imagenes: 0, reconstruible: false,
  };

  if (region) {
    const textoOriginal = texto(region.text());
    entrada.imagenes = region.find('img').length;

    // Quita el título (el nuevo diseño lo pinta como h1) y los adornos vacíos
    region.find('.elementor-widget-theme-post-title, .elementor-share-buttons, nav').remove();
    // Algunas entradas traen un documento HTML completo incrustado
    region.find('meta, title, base, head, link').remove();

    // Aplana atributos de Elementor: el contenido hereda el diseño nuevo
    region.find('*').each((_, el) => {
      const $el = $(el);
      const cls = $el.attr('class') || '';
      for (const a of ['class', 'style', 'data-id', 'data-element_type', 'data-settings',
        'data-widget_type', 'data-elementor-type', 'data-elementor-id', 'data-e-bg-lazyload',
        'data-e-type', 'role', 'aria-roledescription', 'aria-label', 'tabindex']) $el.removeAttr(a);
      if (/gallery|image-carousel/.test(cls)) $el.attr('data-galeria', '1');
    });

    // Los carruseles de Elementor pasan a ser una galería simple: sin su
    // JavaScript quedarían inservibles, y así todas las fotos siguen a la vista.
    region.find('[data-galeria]').each((_, el) => {
      const $el = $(el);
      if ($el.parents('[data-galeria]').length) return; // solo el contenedor más externo
      // Los carruseles duplican diapositivas para el bucle: se quitan repetidas
      const vistas = new Set();
      const fotos = $el.find('img').toArray().map((im) => {
        const $i = $(im);
        const src = $i.attr('src') || $i.attr('data-src') || '';
        if (!src || vistas.has(src)) return '';
        vistas.add(src);
        const alt = ($i.attr('alt') || '').replace(/"/g, '&quot;');
        return `<li><img src="${src}" alt="${alt}" loading="lazy" decoding="async"></li>`;
      }).filter(Boolean);
      if (fotos.length) $el.replaceWith(`<ul class="galeria-nota">${fotos.join('')}</ul>`);
      else $el.remove();
    });

    // La plantilla ya pinta el título como h1: los del cuerpo bajan a h2
    region.find('h1').each((_, el) => { const $e = $(el); $e.replaceWith(`<h2>${$e.html()}</h2>`); });

    let html = region.map((_, el) => $(el).html()).get().join('\n');

    // Compacta envoltorios que quedaron sin contenido
    const $c = load(`<div id="raiz">${html}</div>`, null, false);
    for (let i = 0; i < 8; i++) {
      let cambios = false;
      $c('#raiz div, #raiz section, #raiz span, #raiz figure').each((_, el) => {
        const $el = $c(el);
        if (!$el.text().trim() && $el.find('img, iframe, video, svg, picture').length === 0) { $el.remove(); cambios = true; }
      });
      if (!cambios) break;
    }
    html = ($c('#raiz').html() || '').replace(/\n{3,}/g, '\n\n').trim();

    const textoFinal = texto(load(`<div>${html}</div>`, null, false).root().text());
    const antes = palabras(textoOriginal);
    const despues = palabras(textoFinal);
    const perdidas = [...antes].filter((w) => !despues.has(w));
    entrada.conserva = Number((antes.size ? (antes.size - perdidas.length) / antes.size : 1).toFixed(3));
    entrada.perdidas = perdidas.slice(0, 12);

    // Resumen: primer párrafo con sustancia
    const $r = load(`<div>${html}</div>`, null, false);
    $r('p').each((_, el) => {
      const t = texto($r(el).text());
      if (!entrada.resumen && t.length > 60) entrada.resumen = t.slice(0, 220);
    });
    if (!entrada.resumen) entrada.resumen = textoFinal.slice(0, 200);

    // Se reconstruye solo si no se pierde texto y hay algo que mostrar
    entrada.reconstruible = entrada.conserva >= 0.95 && (textoFinal.length > 60 || entrada.imagenes >= 3);
    if (entrada.reconstruible) cuerpos[p.slug] = html;
  }

  // Toda entrada entra en el índice, se reconstruya o no
  indice.push(entrada);
}

indice.sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')));

writeFileSync(C('blog.json'), JSON.stringify(indice, null, 1));
writeFileSync(C('blog-cuerpos.json'), JSON.stringify(cuerpos, null, 1));

const no = indice.filter((x) => !x.reconstruible);
console.log(`entradas: ${indice.length} · rediseñadas: ${indice.length - no.length} · conservan su página original: ${no.length}`);
for (const x of no) {
  console.log(`  conserva ${Math.round(x.conserva * 100)}% de las palabras (${x.imagenes} img) → ${x.slug}`);
  if (x.perdidas?.length) console.log(`     se perderían: ${x.perdidas.join(', ')}`);
}
