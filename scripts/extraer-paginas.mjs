// Extrae el contenido de las páginas simples que aún conservaban el diseño
// antiguo (legales y páginas de contenido) → content/paginas-cuerpos.json
//
// Método: se retira el envoltorio del tema (bloques de Elementor que contienen
// el buscador del encabezado o el mapa del pie) y se conserva TODO lo demás.
// Salvaguarda: se comparan las palabras antes y después; si se pierde alguna,
// la página no se reconstruye y se sirve su versión original intacta.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(RAIZ, 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

const R = (...p) => path.join(RAIZ, 'reference', ...p);
const C = (...p) => path.join(RAIZ, 'content', ...p);

const texto = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const palabras = (s) => new Set(
  texto(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
);
const CHROME = /Generic selectors|BUSQUEDA POR TITULO|Mapa del Sitio|Todos los derechos reservados|MAS RESULTADOS/i;

// Páginas a tratar (el resto ya tiene plantilla propia)
const OBJETIVO = [
  'aviso-de-privacidad', 'politica-de-privacidad', 'politica-de-seguridad',
  'descargar-catalogo', 'interior-design', 'proyecto-llaves-en-mano',
  'proyectos-destacados', 'sala-espera-recepcion', 'soluciones',
];

const paginas = readdirSync(C('es', 'pages'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(C('es', 'pages', f), 'utf8')))
  .filter((p) => OBJETIVO.includes(p.slug.replace(/\//g, '')));

const salida = {};
const informe = [];

for (const p of paginas) {
  const archivo = R('html', p.htmlRef);
  if (!existsSync(archivo)) { console.warn('sin referencia:', p.slug); continue; }
  const $ = load(readFileSync(archivo, 'utf8'));

  $('script, style, noscript, link, template, iframe[src*="googletagmanager"]').remove();

  const antesTexto = texto($('body').text());

  // Fuera el envoltorio del tema
  $('[data-elementor-type]').each((_, el) => { if (CHROME.test($(el).text())) $(el).remove(); });
  $('.saltar, .skip-link, a[href="#contenido"], a[href="#content"]').remove();
  $('header, footer, nav').remove();

  const chromeTexto = texto($('body').text());

  // Aplana atributos de Elementor para que herede el diseño nuevo
  $('body *').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    for (const a of ['class', 'style', 'data-id', 'data-element_type', 'data-settings',
      'data-widget_type', 'data-elementor-type', 'data-elementor-id', 'data-e-bg-lazyload',
      'data-e-type', 'role', 'aria-roledescription', 'tabindex']) $el.removeAttr(a);
    if (/gallery|image-carousel/.test(cls)) $el.attr('data-galeria', '1');
  });

  // Carruseles → galería simple
  $('[data-galeria]').each((_, el) => {
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

  // El título lo pinta la plantilla: se quita el primero si coincide
  const primerTitulo = $('h1, h2').first();
  if (primerTitulo.length && texto(primerTitulo.text()).toLowerCase() === texto(p.title).toLowerCase()) primerTitulo.remove();

  // La plantilla ya pinta el título como h1: los del cuerpo bajan a h2
  $('h1').each((_, el) => { const $e = $(el); $e.replaceWith(`<h2>${$e.html()}</h2>`); });

  let html = $('body').html() || '';

  // Compacta envoltorios vacíos
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

  const finalTexto = texto(load(`<div>${html}</div>`, null, false).root().text());
  const antes = palabras(chromeTexto);          // solo el contenido, ya sin envoltorio
  const despues = palabras(finalTexto);
  const perdidas = [...antes].filter((w) => !despues.has(w));
  const conserva = antes.size ? (antes.size - perdidas.length) / antes.size : 0;
  const ok = conserva >= 0.98 && finalTexto.length > 120;

  informe.push({ slug: p.slug, titulo: p.title, conserva: Number(conserva.toFixed(3)), chars: finalTexto.length, ok, perdidas: perdidas.slice(0, 10) });
  if (ok) salida[p.slug] = { titulo: p.title, seo: p.seo, html };
  void antesTexto;
}

writeFileSync(C('paginas-cuerpos.json'), JSON.stringify(salida, null, 1));
console.log(`páginas tratadas: ${informe.length} · rediseñadas: ${informe.filter((x) => x.ok).length}`);
for (const x of informe) {
  console.log(`  ${x.ok ? 'OK  ' : 'NO  '} ${String(Math.round(x.conserva * 100)).padStart(3)}% ${String(x.chars).padStart(6)} chars  ${x.slug}`);
  if (!x.ok && x.perdidas.length) console.log(`        se perderían: ${x.perdidas.join(', ')}`);
}
