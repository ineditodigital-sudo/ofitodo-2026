// Transformaciones de build (§5.5): el HTML renderizado de la referencia define la
// estructura; los datos de content/ parchan lo que cambia. Paridad por construcción.
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { Producto, Listado } from './contenido.ts';
// cheerio vive en scripts/.deps (instalación standalone por el disco exFAT).
// Resolución absoluta desde cwd (= apps/site): el bundler reubica este módulo en dist/.
const require = createRequire(path.resolve(process.cwd(), '..', '..', 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');
const requireScripts = createRequire(path.resolve(process.cwd(), '..', '..', 'scripts', 'editables-core.cjs'));
const core = requireScripts('./editables-core.cjs');

export interface Editables { pagina?: Record<string, Record<string, string>>; global?: Record<string, Record<string, string>>; }

/* ---------- Optimización de imágenes (Fase 1 de rendimiento) ----------
 * El sitio servía el archivo original (1-1.7 MB) para mostrarlo a 173 px.
 * WordPress ya generó variantes de cada imagen: aquí se elige la correcta y se
 * construye srcset/sizes para que cada dispositivo baje solo lo que necesita.  */
const RUTA = (p: string) => path.resolve(process.cwd(), '..', '..', 'content', p);
let VARIANTES: Record<string, { w: number; h: number; v: [string, number][] }> = {};
let MEDIDAS: Record<string, number> = {};
try { VARIANTES = JSON.parse(readFileSync(RUTA('imagenes-variantes.json'), 'utf8')); } catch { /* sin catálogo: no se optimiza */ }
try { MEDIDAS = JSON.parse(readFileSync(RUTA('imagenes-medidas.json'), 'utf8')); } catch { /* sin medidas */ }

/** Elige la variante más ajustada al objetivo: acepta hasta un 5 % por debajo antes
 *  de saltar al siguiente tamaño (evita bajar 2048 px cuando 1536 px basta). */
function mejorVariante(v: [string, number][], objetivo: number): [string, number] {
  const holgado = objetivo * 0.95;
  const debajo = [...v].reverse().find(([, w]) => w >= holgado && w <= objetivo);
  return debajo || v.find(([, w]) => w >= objetivo) || v[v.length - 1];
}

// hoja de refinamiento versionada por contenido (evita servir CSS viejo desde la caché)
let CSS_REFINAMIENTO = '/assets/refinamiento.css';
try { CSS_REFINAMIENTO = JSON.parse(readFileSync(path.resolve(process.cwd(), 'src', 'generado', 'assets.json'), 'utf8')).refinamiento; } catch { /* usa el nombre base */ }

const BASE_UPLOADS = 'https://ofitodo.com/wp-content/uploads/';
const clave = (src: string) => (src.split('/uploads/')[1] || '').replace(/-\d+x\d+(\.\w+)$/, '$1');

function optimizarImagenes($: any): void {
  if (!Object.keys(VARIANTES).length) return;
  $('img').each((_: number, el: unknown) => {
    const $img = $(el);
    const src = $img.attr('src') || '';
    if (!src.includes('/uploads/')) return;
    const k = clave(src);
    const info = VARIANTES[k];
    if (!info || info.v.length < 2) return;

    const anchoCss = MEDIDAS[k] || 0;
    // objetivo: cubrir pantallas de alta densidad (2x) sin pasarse del original.
    // Sin medida (imágenes ocultas en carruseles, etc.) se aplica un tope prudente:
    // ninguna imagen del sitio se muestra a más de 1024 px de ancho real.
    const TOPE_SIN_MEDIDA = 1024;
    const objetivo = anchoCss ? Math.min(anchoCss * 2, info.w) : Math.min(TOPE_SIN_MEDIDA, info.w);
    const elegida = mejorVariante(info.v, objetivo);

    // srcset solo con las variantes útiles (hasta la elegida)
    const utiles = info.v.filter(([, w]) => w <= elegida[1]);
    if (utiles.length > 1) {
      $img.attr('srcset', utiles.map(([f, w]) => `${BASE_UPLOADS}${f} ${w}w`).join(', '));
      $img.attr('sizes', anchoCss ? `(max-width: 600px) ${Math.min(anchoCss, 600)}px, ${anchoCss}px` : '100vw');
    } else {
      $img.removeAttr('srcset');
    }
    $img.attr('src', BASE_UPLOADS + elegida[0]);
    if (!$img.attr('width') && anchoCss) $img.attr('width', String(anchoCss));
    if (!$img.attr('loading')) $img.attr('loading', 'lazy');
    if (!$img.attr('decoding')) $img.attr('decoding', 'async');
  });
  // la primera imagen visible no debe diferirse (afecta la velocidad percibida)
  const primera = $('img[loading="lazy"]').first();
  if (primera.length) { primera.attr('loading', 'eager'); primera.attr('fetchpriority', 'high'); }
  optimizarFondos($);
}

/** Imágenes que no son <img>: fondos de sección (CSS) y las que los carruseles
 *  crean por JavaScript desde su configuración JSON. Un fondo a pantalla completa no
 *  necesita más de 1600 px; varios originales llegaban a 2560 px y 700 KB. */
const TOPE_FONDO = 1600;
function variantePara(url: string, tope: number): string | null {
  const info = VARIANTES[clave(url.replace(/\\\//g, '/'))];
  if (!info || info.w <= tope) return null;
  return mejorVariante(info.v, tope)[0];
}
function optimizarFondos($: any): void {
  // 1. background-image en <style> y en atributos style
  const enCss = (css: string): string =>
    css.replace(/url\((['"]?)(https:\/\/ofitodo\.com\/wp-content\/uploads\/[^'")]+)\1\)/g,
      (todo: string, q: string, url: string) => {
        const v = variantePara(url, TOPE_FONDO);
        return v ? `url(${q}${BASE_UPLOADS}${v}${q})` : todo;
      });
  $('style').each((_: number, el: unknown) => {
    const t = $(el).html();
    if (t && t.includes('/uploads/')) $(el).html(enCss(t));
  });
  $('[style*="/uploads/"]').each((_: number, el: unknown) => {
    const s = $(el).attr('style');
    if (s) $(el).attr('style', enCss(s));
  });

  // 2. URLs dentro de la configuración JSON de carruseles (data-settings, etc.).
  //    Ahí las barras van escapadas: https:\/\/ofitodo.com\/wp-content\/uploads\/…
  const enJson = (txt: string): string =>
    txt.replace(/https:(?:\\\/|\/){2}ofitodo\.com(?:\\\/|\/)wp-content(?:\\\/|\/)uploads(?:\\\/|\/)[^"'\s,}\]]+?\.(?:jpe?g|png|webp|gif)/gi,
      (url: string) => {
        const v = variantePara(url, TOPE_FONDO);
        if (!v) return url;
        const escapado = url.includes('\\/');
        const nueva = BASE_UPLOADS + v;
        return escapado ? nueva.replace(/\//g, '\\/') : nueva;
      });
  $('[data-settings*="uploads"], [data-elementor-settings*="uploads"]').each((_: number, el: unknown) => {
    for (const attr of ['data-settings', 'data-elementor-settings']) {
      const s = $(el).attr(attr);
      if (s && s.includes('uploads')) $(el).attr(attr, enJson(s));
    }
  });
}

/** SEO + jerarquía: 398 páginas del sitio no tenían <h1> (Google no sabía cuál era
 *  el tema principal). Si falta, el primer encabezado del contenido pasa a ser h1
 *  conservando todas sus clases: la página se ve igual, pero queda bien estructurada. */
function asegurarH1($: any): void {
  if ($('h1').length > 0) return;
  const candidato = $('h2, h3').filter((_: number, el: unknown) =>
    $(el).closest('header, footer, nav').length === 0 && $(el).text().trim().length > 2).first();
  if (!candidato.length) return;
  const el = candidato.get(0);
  el.tagName = 'h1';
  $(el).addClass('of-h1-promovido');
}

const KEEP_ABS = /^https:\/\/ofitodo\.com\/(wp-content|wp-includes|wp-json|xmlrpc|wp-login|wp-admin|feed|comments\/feed|\?)/;
const PAGO_RE = /paypal\.com|paypalobjects\.com|mlstatic\.com|mercadopago|mercadolibre|woocommerce-paypal-payments/;

export const fmtPrecio = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function base(html: string) {
  const $ = load(html);
  // Navegación interna → relativa (assets y uploads siguen absolutos a ofitodo.com)
  $('[href], [src]').each((_: number, el: unknown) => {
    for (const attr of ['href', 'src'] as const) {
      const v = $(el).attr(attr);
      if (v && v.startsWith('https://ofitodo.com') && !KEEP_ABS.test(v)) {
        $(el).attr(attr, v.replace('https://ofitodo.com', '') || '/');
      }
    }
  });
  // canonical y og:url siempre hacia producción
  const canon = $('link[rel="canonical"]');
  const ch = canon.attr('href');
  if (ch && ch.startsWith('/')) canon.attr('href', 'https://ofitodo.com' + ch);
  const og = $('meta[property="og:url"]');
  const ogv = og.attr('content');
  if (ogv && ogv.startsWith('/')) og.attr('content', 'https://ofitodo.com' + ogv);
  // SDKs de pago retirados (docs/excepciones.md #1 y #2)
  $('script[src]').each((_: number, el: unknown) => { if (PAGO_RE.test($(el).attr('src') ?? '')) $(el).remove(); });
  $('link[href]').each((_: number, el: unknown) => { if (PAGO_RE.test($(el).attr('href') ?? '')) $(el).remove(); });
  // DOM muerto de botones de pago ya renderizados en la referencia
  $('.ppc-button-wrapper, #ppc-button-ppcp-gateway, .paypal-buttons, #ppcp-messages, [id^="zoid-paypal"]').remove();
  asegurarH1($);
  optimizarImagenes($);
  // Capa de refinamiento visual (va al final del head: solo ajusta lo del tema)
  $('head').append(`<link rel="stylesheet" href="${CSS_REFINAMIENTO}">`);
  // Islas propias (búsqueda, carrito, formularios)
  $('body').append('<script defer src="/assets/islas.js"></script>');
  return $;
}

/** Página congelada: referencia + enlaces relativos + islas activas.
 *  Aplica los cambios de contenido del panel (texto/imagen/enlace) sobre el mismo diseño,
 *  y marca los nodos con data-cms para el editor visual. Paridad intacta si no hay cambios. */
export function congelada(html: string, seo?: { title?: string; description?: string | null }, ed?: Editables): string {
  const $ = base(html);
  if (seo?.title && $('title').first().text() !== seo.title) $('title').text(seo.title);
  if (seo?.description) {
    const m = $('meta[name="description"]');
    if (m.length) m.attr('content', seo.description);
    else $('title').after(`<meta name="description" content="${seo.description.replace(/"/g, '&quot;')}">`);
  }
  // Contenido editable: global (header/footer) + página. Siempre marca data-cms (para el editor).
  core.inyectar($, core.scopeGlobal($), ed?.global ?? {}, { prefijo: 'g:' });
  core.inyectar($, core.scopeContenido($), ed?.pagina ?? {}, { saltarHF: true, prefijo: 'c:' });
  return $.html();
}

/** Ficha de producto: referencia propia parchada con los datos del catálogo. */
export function producto(html: string, p: Producto): string {
  const $ = base(html);
  $('title').text(p.seo.title);
  if (p.seo.description) $('meta[name="description"]').attr('content', p.seo.description);
  // El texto del título solo se re-escribe para productos NUEVOS (sin referencia):
  // el renderizado original aplica texturizado tipográfico («»…) que es la verdad visual.
  if (!p.tieneReferencia) {
    $('.mkd-single-product-title').first().text(p.nombre);
    const img = $('.woocommerce-product-gallery img').first();
    if (p.imagen && img.length) { img.attr('src', p.imagen); img.removeAttr('srcset'); img.attr('alt', p.nombre); }
    $('.woocommerce-Tabs-panel--description').html(p.descripcionHtml || p.descripcionCorta || '');
  }
  if (p.sku) $('.sku').first().text(p.sku);
  const priceEl = $('.mkd-single-product-summary .price').first();
  if (p.precio != null && priceEl.length) {
    const cur = '<span class="woocommerce-Price-currencySymbol">&#36;</span>';
    const monto = (n: number) => `<span class="woocommerce-Price-amount amount"><bdi>${cur}${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}</bdi></span>`;
    priceEl.html(p.precioOferta ? `<del>${monto(p.precioRegular ?? p.precio)}</del> <ins>${monto(p.precioOferta)}</ins>` : monto(p.precio));
  }
  // datos para la isla de carrito
  $('body').attr('data-producto', JSON.stringify({ slug: p.slug, nombre: p.nombre, precio: p.precio, imagen: p.imagen, sku: p.sku }));
  return $.html();
}

const liProducto = (p: Producto) => {
  const img = p.imagen ? p.imagen.replace(/(\.\w+)$/, '-200x200$1') : '';
  return `<li class="ofitodo-product-card product type-product post-${p.legacyId} status-publish ${p.stockStatus} product-type-simple">` +
    `<a href="/producto/${p.slug}/" class="ofitodo-product-link"><div class="ofitodo-img-box">` +
    (img ? `<img width="200" height="200" src="${img}" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="${p.nombre.replace(/"/g, '&quot;')}" loading="lazy">` : '') +
    `</div><h3 class="ofitodo-title"> ${p.nombre} </h3></a></li>`;
};
const liCategoria = (c: Listado, rutaBase: string) => {
  const img = c.imagen ? c.imagen.replace(/(\.\w+)$/, '-200x200$1') : '';
  return `<li class="ofitodo-category-card"><a href="/categoria-producto/${c.ruta ?? c.slug}/" class="ofitodo-category-link"><div class="ofitodo-img-box">` +
    (img ? `<img width="200" height="200" src="${img}" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="${c.nombre.replace(/"/g, '&quot;')}" loading="lazy">` : '') +
    `</div><h3 class="ofitodo-title"> ${c.nombre} </h3></a></li>`;
};

/**
 * Listado (categoría/etiqueta/marca): referencia propia; el grid se concilia contra los
 * datos actuales — se quitan los que ya no están y se agregan los nuevos al final.
 */
export function listado(
  html: string, l: Listado,
  actuales: { productos: Producto[]; subcategorias: Listado[] },
): string {
  const $ = base(html);
  $('title').text(l.seo.title);
  if (l.seo.description) $('meta[name="description"]').attr('content', l.seo.description);

  const ul = $('ul.products').first();
  if (ul.length) {
    const enRef = new Set<string>();
    ul.children('li').each((_: number, li: unknown) => {
      const href = $(li).find('a').first().attr('href') ?? '';
      const slug = href.replace(/\/$/, '').split('/').pop() ?? '';
      enRef.add(slug);
      const esCat = $(li).hasClass('ofitodo-category-card');
      const vivo = esCat
        ? actuales.subcategorias.some((c) => c.slug === slug)
        : actuales.productos.some((p) => p.slug === slug);
      if (!vivo) $(li).remove();
    });
    // El original mostraba solo el primer lote (load-more por ajax). Los demás productos
    // se pre-renderizan OCULTOS y un botón estático los revela: misma vista inicial,
    // misma funcionalidad, sin servidor.
    let extras = 0;
    for (const p of actuales.productos) if (!enRef.has(p.slug)) { ul.append(liProducto(p).replace('<li class="', '<li hidden data-of-mas class="')); extras++; }
    for (const c of actuales.subcategorias) if (!enRef.has(c.slug)) { ul.append(liCategoria(c, '').replace('<li class="', '<li hidden data-of-mas class="')); extras++; }
    if (extras > 0) ul.after(`<div class="of-cargar-mas-holder"><button type="button" class="of-btn of-cargar-mas" data-of-revelar>Cargar más productos (${extras})</button></div><link rel="stylesheet" href="/assets/sistema.css">`);
  }
  return $.html();
}

/**
 * Página de sistema nueva (carrito, checkout, cuenta, pedido recibido):
 * chrome (head+header+title+footer) transplantado de una página donante; contenido propio.
 */
export function sistema(
  donorHtml: string,
  o: { titulo: string; tituloBarra: string; contenidoHtml: string; slug: string; robots?: string },
): string {
  const $ = base(donorHtml);
  $('title').text(`${o.titulo} | Ofitodo`);
  $('meta[name="description"]').remove();
  $('meta[name="robots"]').attr('content', o.robots ?? 'noindex, follow');
  $('link[rel="canonical"]').attr('href', `https://ofitodo.com${o.slug}`);
  $('meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]').remove();
  // barra de título
  const barra = $('.mkd-title-holder');
  barra.find('h1, h2.mkd-page-title, .mkd-page-title').first().text(o.tituloBarra);
  // sustituir todo el contenido entre la barra de título y el footer
  const site = $('.site').first().length ? $('.site').first() : $('body');
  let dentro = false;
  const aBorrar: unknown[] = [];
  site.children().each((_: number, el: unknown) => {
    const $el = $(el);
    if ($el.hasClass('mkd-title-holder')) { dentro = true; return; }
    if ($el.is('footer')) { dentro = false; return; }
    if (dentro) aBorrar.push(el);
  });
  aBorrar.forEach((el) => $(el).remove());
  barra.after(`<div class="mkd-container"><div class="mkd-container-inner clearfix ofitodo-sistema">${o.contenidoHtml}</div></div>`);
  return $.html();
}
