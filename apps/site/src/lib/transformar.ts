// Transformaciones de build (§5.5): el HTML renderizado de la referencia define la
// estructura; los datos de content/ parchan lo que cambia. Paridad por construcción.
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Producto, Listado } from './contenido.ts';
// cheerio vive en scripts/.deps (instalación standalone por el disco exFAT).
// Resolución absoluta desde cwd (= apps/site): el bundler reubica este módulo en dist/.
const require = createRequire(path.resolve(process.cwd(), '..', '..', 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

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
  // Islas propias (búsqueda, carrito, formularios)
  $('body').append('<script defer src="/assets/islas.js"></script>');
  return $;
}

/** Página congelada: referencia + enlaces relativos + islas activas.
 *  El SEO editable (panel → content/es) parcha title/description sobre la referencia. */
export function congelada(html: string, seo?: { title?: string; description?: string | null }): string {
  const $ = base(html);
  if (seo?.title && $('title').first().text() !== seo.title) $('title').text(seo.title);
  if (seo?.description) {
    const m = $('meta[name="description"]');
    if (m.length) m.attr('content', seo.description);
    else $('title').after(`<meta name="description" content="${seo.description.replace(/"/g, '&quot;')}">`);
  }
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
