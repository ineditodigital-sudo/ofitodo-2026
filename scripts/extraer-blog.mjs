// Extrae de reference/html los datos y el cuerpo de cada entrada del blog:
//   content/blog.json          → índice (título, fecha, imagen, resumen)
//   content/blog-cuerpos.json  → HTML del artículo listo para el sitio nuevo
//
// Dos tipos de entrada:
//   · propio=true  → el artículo trae SU PROPIA hoja de estilo (maquetación
//     hecha a mano). Se conservan sus clases y su CSS, acotado al contenedor
//     del artículo para que no se filtre al encabezado ni al pie.
//   · propio=false → sin estilos propios (galerías de proyecto). Se aplana a
//     HTML semántico y lo viste el diseño del sitio.
//
// Salvaguarda de cero pérdida: se comparan las palabras del artículo antes y
// después. Si se pierde alguna significativa, la entrada NO se reconstruye y
// se sirve su página original intacta.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { acotarCss, revelarOcultos } from './css-acotar.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(RAIZ, 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

const R = (...p) => path.join(RAIZ, 'reference', ...p);
const C = (...p) => path.join(RAIZ, 'content', ...p);

const AMBITO = '.articulo-propio';
const texto = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const palabras = (s) => new Set(
  texto(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
);
const CHROME = /Generic selectors|BUSQUEDA POR TITULO|Mapa del Sitio|Todos los derechos reservados|MAS RESULTADOS/i;

// Atributos de Elementor que se retiran al aplanar
const ATRIBUTOS = ['class', 'style', 'data-id', 'data-element_type', 'data-settings',
  'data-widget_type', 'data-elementor-type', 'data-elementor-id', 'data-e-bg-lazyload',
  'data-e-type', 'role', 'aria-roledescription', 'tabindex'];

/** Carruseles de Elementor → galería simple (sin su JS quedarían inservibles) */
function aplanarCarruseles($, raiz) {
  raiz.find('[data-galeria]').each((_, el) => {
    const $el = $(el);
    if ($el.parents('[data-galeria]').length) return;
    const vistas = new Set();
    const fotos = $el.find('img').toArray().map((im) => {
      const src = $(im).attr('src') || $(im).attr('data-src') || '';
      if (!src || vistas.has(src)) return '';
      vistas.add(src);
      const alt = ($(im).attr('alt') || '').replace(/"/g, '&quot;');
      return `<li><img src="${src}" alt="${alt}" loading="lazy" decoding="async"></li>`;
    }).filter(Boolean);
    if (fotos.length) $el.replaceWith(`<ul class="galeria-nota">${fotos.join('')}</ul>`);
    else $el.remove();
  });
}

/** Quita envoltorios que quedaron sin contenido */
function compactar(html) {
  const $c = load(`<div id="raiz">${html}</div>`, null, false);
  for (let i = 0; i < 8; i++) {
    let cambios = false;
    $c('#raiz div, #raiz section, #raiz span, #raiz figure').each((_, el) => {
      const $el = $c(el);
      if (!$el.text().trim() && $el.find('img, iframe, video, svg, picture').length === 0) { $el.remove(); cambios = true; }
    });
    if (!cambios) break;
  }
  return ($c('#raiz').html() || '').replace(/\n{3,}/g, '\n\n').trim();
}

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

  const bloques = $('[data-elementor-type]').toArray().filter((el) => !CHROME.test($(el).text()));
  const region = bloques.length ? $(bloques) : null;

  const entrada = {
    slug: p.slug, titulo: p.title, fecha, modificado, imagen,
    resumen: '', seo: p.seo, htmlRef: p.htmlRef,
    conserva: 0, imagenes: 0, propio: false, reconstruible: false,
  };

  if (region) {
    // CSS propio del artículo (el de Elementor no cuenta: sus clases se pierden)
    const cssPropio = region.find('style').map((_, e) => $(e).html() || '').get().join('\n');
    const tienePropio = cssPropio.length > 3000 && /\.[a-z][\w-]{2,}\s*\{/i.test(cssPropio.replace(/\.elementor[\w-]*/g, ''));

    // Texto de referencia SIN estilos ni scripts
    const $medir = load($.html());
    $medir('script, style, noscript, template').remove();
    const bloquesM = $medir('[data-elementor-type]').toArray().filter((el) => !CHROME.test($medir(el).text()));
    const textoOriginal = texto($medir(bloquesM).text());

    region.find('script, noscript, template, link, meta, title, base').remove();
    region.find('style').remove();
    region.find('nav').remove();
    region.find('.elementor-share-buttons').remove();
    entrada.imagenes = region.find('img').length;

    if (tienePropio) {
      // --- Artículo con maquetación propia: se conserva tal cual -----------
      entrada.propio = true;
      region.find('.elementor-widget-theme-post-title').remove();
      // Solo los contenedores de Elementor pierden sus atributos; el contenido
      // del autor conserva sus clases para que su CSS siga funcionando.
      region.find('[data-elementor-type], [data-element_type], [data-widget_type]').each((_, el) => {
        const $el = $(el);
        const cls = ($el.attr('class') || '').split(/\s+/).filter((c) => c && !/^(elementor|e-|swiper)/.test(c));
        for (const a of ATRIBUTOS) $el.removeAttr(a);
        if (cls.length) $el.attr('class', cls.join(' '));
      });
      // No se compacta: un <div> vacío puede ser una capa de fondo del autor
      // (p. ej. .hero-bg, que lleva la foto por CSS y no tiene contenido).
      const html = region.map((_, el) => $(el).html()).get().join('\n').replace(/\n{3,}/g, '\n\n').trim();
      const $h = load(`<div>${html}</div>`, null, false);
      // Un solo h1: el primero se queda, los demás bajan a h2
      $h('h1').each((i, el) => { if (i > 0) { const $e = $h(el); $e.replaceWith(`<h2 class="${$e.attr('class') || ''}">${$e.html()}</h2>`); } });
      const acotado = acotarCss(cssPropio, AMBITO);
      entrada.css = acotado + revelarOcultos(acotado);
      entrada.htmlFinal = $h('div').first().html() || html;
    } else {
      // --- Sin estilos propios: se aplana y lo viste el diseño del sitio ---
      region.find('*').each((_, el) => {
        const $el = $(el);
        const cls = $el.attr('class') || '';
        for (const a of ATRIBUTOS) $el.removeAttr(a);
        if (/gallery|image-carousel/.test(cls)) $el.attr('data-galeria', '1');
      });
      aplanarCarruseles($, region);
      // La plantilla ya pinta el título como h1
      region.find('h1').each((_, el) => { const $e = $(el); $e.replaceWith(`<h2>${$e.html()}</h2>`); });
      entrada.htmlFinal = compactar(region.map((_, el) => $(el).html()).get().join('\n'));
    }

    const textoFinal = texto(load(`<div>${entrada.htmlFinal}</div>`, null, false).root().text());
    const antes = palabras(textoOriginal);
    const despues = palabras(textoFinal);
    const perdidas = [...antes].filter((w) => !despues.has(w));
    entrada.conserva = Number((antes.size ? (antes.size - perdidas.length) / antes.size : 1).toFixed(3));
    entrada.perdidas = perdidas.slice(0, 12);

    const $r = load(`<div>${entrada.htmlFinal}</div>`, null, false);
    $r('p').each((_, el) => {
      const t = texto($r(el).text());
      if (!entrada.resumen && t.length > 60) entrada.resumen = t.slice(0, 220);
    });
    if (!entrada.resumen) entrada.resumen = textoFinal.slice(0, 200);

    entrada.reconstruible = entrada.conserva >= 0.95 && (textoFinal.length > 60 || entrada.imagenes >= 3);
    if (entrada.reconstruible) {
      cuerpos[p.slug] = { html: entrada.htmlFinal, css: entrada.css || '', propio: entrada.propio };
    }
  }

  delete entrada.htmlFinal; delete entrada.css;
  indice.push(entrada);
}

indice.sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')));

writeFileSync(C('blog.json'), JSON.stringify(indice, null, 1));
writeFileSync(C('blog-cuerpos.json'), JSON.stringify(cuerpos, null, 1));

const ok = indice.filter((x) => x.reconstruible);
const no = indice.filter((x) => !x.reconstruible);
console.log(`entradas: ${indice.length} · rediseñadas: ${ok.length} (${ok.filter((x) => x.propio).length} con maquetación propia) · conservan su página original: ${no.length}`);
for (const x of no) {
  console.log(`  conserva ${Math.round(x.conserva * 100)}% de las palabras (${x.imagenes} img) → ${x.slug}`);
  if (x.perdidas?.length) console.log(`     se perderían: ${x.perdidas.join(', ')}`);
}
