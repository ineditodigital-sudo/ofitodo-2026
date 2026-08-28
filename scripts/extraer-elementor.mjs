// Convierte las últimas páginas que aún dependen de WordPress/Elementor.
//
// Para cada una: toma su HTML congelado, descarga las hojas de estilo que pide
// al servidor, DEPURA las reglas que la página no usa, las acota a su
// contenedor y las incrusta. Resultado: la página conserva su maquetación pero
// deja de pedir un solo archivo a /wp-content o /wp-includes.
//
// Salida: content/paginas-elementor.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { acotarCss, revelarOcultos } from './css-acotar.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(RAIZ, 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

const R = (...p) => path.join(RAIZ, 'reference', ...p);
const C = (...p) => path.join(RAIZ, 'content', ...p);
const CACHE = path.join(RAIZ, 'reports', 'cache-css');
mkdirSync(CACHE, { recursive: true });

const AMBITO = '.pagina-heredada';
// El envoltorio del tema se identifica por el ID de su plantilla de Elementor
// (11011 = encabezado, 10940 = pie). Es mucho más fiable que buscar frases:
// un artículo puede llevar "Todos los derechos reservados" en su propio texto.
const IDS_CHROME = new Set(['11011', '10940']);
const MARCAS = [/Generic selectors/i, /BUSQUEDA POR TITULO/i, /Mapa del Sitio/i, /MAS RESULTADOS/i];
const esChrome = ($, el) => IDS_CHROME.has(String($(el).attr('data-elementor-id') || ''))
  || MARCAS.filter((r) => r.test($(el).text())).length >= 2;

const texto = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const palabras = (s) => new Set(
  texto(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
);

/* --- Descarga de hojas de estilo, con caché en disco ---------------------- */
async function bajarCss(url) {
  const clave = url.replace(/[^a-z0-9]/gi, '_').slice(-120) + '.css';
  const f = path.join(CACHE, clave);
  if (existsSync(f)) return readFileSync(f, 'utf8');
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return '';
    const css = await r.text();
    writeFileSync(f, css);
    return css;
  } catch { return ''; }
}

/* --- Depuración: solo las reglas que la página realmente usa -------------- */
// Se prueba cada selector contra el DOM de la página. Los que no encuentran
// nada se descartan: de varios MB de Elementor quedan unas decenas de KB.
function limpiarSelector(sel) {
  return sel
    .replace(/::?(before|after|first-line|first-letter|placeholder|selection|marker|backdrop)\b/g, '')
    .replace(/:(hover|focus|focus-visible|focus-within|active|visited|checked|disabled|enabled|target|valid|invalid|required|optional|read-only|indeterminate|default|placeholder-shown|autofill|fullscreen|any-link|link)\b/g, '')
    .replace(/:(is|where)\(/g, ':is(')
    .trim();
}

function seUsa($, sel) {
  const limpio = limpiarSelector(sel);
  if (!limpio || limpio === '*' || /^(html|body|:root)$/i.test(limpio)) return true;
  if (/^@|^%|^\d/.test(limpio)) return true;
  try { return $(limpio).length > 0; } catch { return true; } // selector exótico: se conserva
}

function depurar(css, $) {
  let out = '', i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    if (css.startsWith('/*', i)) { const f = css.indexOf('*/', i + 2); i = f === -1 ? n : f + 2; continue; }

    const ini = i;
    let comilla = null;
    while (i < n) {
      const ch = css[i];
      if (comilla) { if (ch === comilla && css[i - 1] !== '\\') comilla = null; i++; continue; }
      if (ch === '"' || ch === "'") { comilla = ch; i++; continue; }
      if (ch === '{' || ch === ';') break;
      i++;
    }
    const preludio = css.slice(ini, i).trim();
    if (i < n && css[i] === ';') { i++; if (/^@(import|charset)/i.test(preludio)) out += preludio + ';\n'; continue; }
    if (i >= n) break;

    // cuerpo del bloque
    let prof = 0, desde = i;
    for (; i < n; i++) {
      const ch = css[i];
      if (comilla) { if (ch === comilla && css[i - 1] !== '\\') comilla = null; continue; }
      if (ch === '"' || ch === "'") { comilla = ch; continue; }
      if (ch === '{') prof++;
      else if (ch === '}') { prof--; if (prof === 0) { i++; break; } }
    }
    const cuerpo = css.slice(desde + 1, i - 1);

    if (preludio.startsWith('@')) {
      if (/^@(font-face|keyframes|-webkit-keyframes|page|counter-style|property|font-feature-values)/i.test(preludio)) {
        out += `${preludio}{${cuerpo}}\n`;
      } else if (/^@(media|supports|layer|container)/i.test(preludio)) {
        const dentro = depurar(cuerpo, $);
        if (dentro.trim()) out += `${preludio}{\n${dentro}}\n`;
      }
      continue;
    }
    const usados = preludio.split(',').filter((s) => seUsa($, s));
    if (usados.length) out += `${usados.join(',')}{${cuerpo}}\n`;
  }
  return out;
}

/* --- Páginas a convertir -------------------------------------------------- */
const OBJETIVO = process.argv.slice(2).length ? process.argv.slice(2) : [
  'proyectos-destacados', 'sala-espera-recepcion',
  'stand-madrid-fnsm-2026', 'estaciones-de-trabajo-para-oficina',
  'proveedor-confiable-mobiliario-oficina', 'test',
];

const fichas = [];
for (const col of ['pages', 'posts']) {
  const dir = C('es', col);
  if (!existsSync(dir)) continue;
  for (const f of readFileSync ? require('node:fs').readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    const j = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    if (OBJETIVO.includes(j.slug.replace(/\//g, ''))) fichas.push(j);
  }
}

const salida = {};
const informe = [];

for (const p of fichas) {
  const archivo = R('html', p.htmlRef);
  if (!existsSync(archivo)) { console.warn('sin referencia:', p.slug); continue; }
  const $ = load(readFileSync(archivo, 'utf8'));

  // Hojas que pide la página, en su orden
  const hojas = $('link[rel="stylesheet"]').map((_, e) => $(e).attr('href')).get()
    .filter((h) => h && /wp-content|wp-includes/.test(h));

  // En estas páginas el contenido vive FUERA de los bloques de Elementor: el
  // tema solo envuelve el encabezado y el pie. Se retira ese envoltorio y se
  // conserva TODO lo demás del cuerpo.
  // Los estilos se guardan y se retiran ANTES de medir: su contenido es CSS,
  // no texto de la página, y contaminaría la comparación.
  const cssPropio = $('style').map((_, e) => $(e).html() || '').get().join('\n');
  $('script, style, noscript, template, link, meta, title, base').remove();

  // Referencia para medir: el cuerpo entero menos el encabezado y el pie
  const palabrasChrome = palabras(
    $('[data-elementor-type]').toArray().filter((el) => esChrome($, el)).map((el) => $(el).text()).join(' ')
  );
  const textoOriginal = texto($('body').text());

  $('[data-elementor-type]').each((_, el) => { if (esChrome($, el)) $(el).remove(); });
  // Ojo: NO se tocan <nav>. El menú del tema va dentro de los bloques que
  // acabamos de quitar, y algunos artículos usan <nav> para su propio índice.
  $('.saltar, .skip-link').remove();
  $('.elementor-widget-theme-post-title, .elementor-share-buttons').remove();

  const htmlRegion = $('body').html() || '';
  const $pagina = load(`<div>${htmlRegion}</div>`, null, false);
  if (texto($pagina.root().text()).length < 120) {
    informe.push({ slug: p.slug, ok: false, motivo: 'no queda contenido tras quitar el envoltorio' });
    continue;
  }

  // --- Imágenes rotas heredadas del original -----------------------------
  // 1) webp-express guardaba copias .webp fuera de /uploads. Esa carpeta ya no
  //    existe (404 también en el sitio original): se apunta al archivo real.
  $pagina('img[src*="webp-express"], img[srcset*="webp-express"]').each((_, el) => {
    const $i = $pagina(el);
    const arreglar = (u) => String(u || '').replace(/\/wp-content\/webp-express\/webp-images\/uploads\//g, '/wp-content/uploads/').replace(/\.(png|jpe?g)\.webp(\s|$)/gi, '.$1$2');
    if ($i.attr('src')) $i.attr('src', arreglar($i.attr('src')));
    if ($i.attr('srcset')) $i.attr('srcset', arreglar($i.attr('srcset')));
  });
  // 2) Imágenes de demostración del tema que nunca se subieron (404 en el
  //    original). Se retiran: una imagen rota no aporta nada.
  $pagina('img[src*="/2018/01/blog-list-title-img"]').remove();

  // Un solo h1
  $pagina('h1').each((i, el) => {
    if (i > 0) { const $e = $pagina(el); $e.replaceWith(`<h2 class="${$e.attr('class') || ''}">${$e.html()}</h2>`); }
  });

  let bruto = 0, css = '';
  for (const h of hojas) {
    const url = h.startsWith('http') ? h : `https://ofitodo.com${h}`;
    const t = await bajarCss(url);
    bruto += t.length;
    css += depurar(t, $pagina) + '\n';
  }
  css += depurar(cssPropio, $pagina);

  const acotado = acotarCss(css, AMBITO);
  const final = acotado + revelarOcultos(acotado);

  const html = $pagina('div').first().html() || htmlRegion;
  const textoFinal = texto($pagina.root().text());
  // El encabezado y el pie no son contenido: se descuentan de la comparación
  const antes = new Set([...palabras(textoOriginal)].filter((w) => !palabrasChrome.has(w)));
  const despues = palabras(textoFinal);
  const perdidas = [...antes].filter((w) => !despues.has(w));
  const conserva = antes.size ? (antes.size - perdidas.length) / antes.size : 1;
  const ok = conserva >= 0.95;

  informe.push({ slug: p.slug, ok, conserva: +conserva.toFixed(3), hojas: hojas.length, bruto, depurado: final.length, perdidas: perdidas.slice(0, 8) });
  if (ok) salida[p.slug] = { titulo: p.title, seo: p.seo, html, css: final };
}

writeFileSync(C('paginas-elementor.json'), JSON.stringify(salida, null, 1));
console.log(`\nPáginas tratadas: ${informe.length} · convertidas: ${informe.filter((x) => x.ok).length}`);
for (const x of informe) {
  const kb = (n) => Math.round(n / 1024) + ' KB';
  console.log(`  ${x.ok ? 'OK ' : 'NO '} ${String(Math.round((x.conserva ?? 0) * 100)).padStart(3)}%  ${x.slug}`);
  if (x.hojas) console.log(`        ${x.hojas} hojas · ${kb(x.bruto)} en bruto → ${kb(x.depurado)} depurado`);
  if (!x.ok && x.perdidas?.length) console.log(`        se perderían: ${x.perdidas.join(', ')}`);
  if (x.motivo) console.log(`        ${x.motivo}`);
}
