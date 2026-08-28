/* Núcleo compartido de contenido editable (usado por el extractor y por el render del sitio).
 * Recorre el HTML de referencia de forma determinista y:
 *   - extraer(): lista de campos editables {id, tipo, etiqueta, seccion, valor}
 *   - inyectar(): marca los nodos con data-cms-id y aplica los cambios del panel
 * Editar TEXTO reemplaza solo el nodo de texto → el markup/diseño nunca se toca (imposible romper).
 * Los IDs son estables mientras el HTML de referencia (congelado) no cambie.
 */
'use strict';

// Subárboles que NO son contenido de página (se manejan como globales o se ignoran)
const SKIP = 'script,style,noscript,svg,.joinchat,.pswp,#wpadminbar,.mkd-shopping-cart-holder,' +
  '.ajax-search-lite,.asl_w_container,.mkd-fullscreen-menu-holder,.mkd-mobile-header,' +
  '.ppc-button-wrapper,.paypal-buttons,form.cart,.woocommerce-product-gallery__trigger';

function esSaltable($, el) {
  return $(el).is(SKIP) || $(el).closest(SKIP).length > 0;
}

// Etiqueta amigable según el rol del nodo de texto
function etiquetaTexto($, node) {
  const p = node.parent;
  const tag = p && p.tagName ? p.tagName.toLowerCase() : '';
  const cls = (p && p.attribs && p.attribs.class) || '';
  if (tag === 'h1' || /mkd-page-title|entry-title/.test(cls)) return 'Título principal';
  if (tag === 'h2') return 'Subtítulo';
  if (tag === 'h3' || tag === 'h4') return 'Encabezado';
  if (tag === 'h5' || tag === 'h6') return 'Encabezado pequeño';
  if (tag === 'li') return 'Elemento de lista';
  if (tag === 'button' || /button|btn|cta/i.test(cls)) return 'Botón';
  return 'Texto';
}

/** Recorre nodos editables en orden DFS determinista. cb(tipo, elOrNode, extra).
 * opts.saltarHF: salta subárboles header/footer (modo contenido de página). */
function recorrer($, $scope, cb, opts) {
  opts = opts || {};
  const cont = { texto: 0, imagen: 0, enlace: 0 };
  let seccion = '';
  function visita(el) {
    if (el.type === 'text') {
      const val = (el.data || '').replace(/\s+/g, ' ');
      if (val.trim().length >= 2) {
        const id = 't' + cont.texto++;
        cb('texto', el, { id, etiqueta: etiquetaTexto($, el), seccion, valor: val.trim() });
      }
      return;
    }
    if (el.type !== 'tag') return;
    const tag = el.tagName.toLowerCase();
    if (opts.saltarHF && (tag === 'header' || tag === 'footer')) return;
    if (esSaltable($, el)) return;
    // registrar sección por encabezado
    if (/^h[1-3]$/.test(tag)) {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t) seccion = t.slice(0, 60);
    }
    if (tag === 'img') {
      const id = 'i' + cont.imagen++;
      cb('imagen', el, { id, etiqueta: 'Imagen', seccion, src: $(el).attr('src') || '', alt: $(el).attr('alt') || '' });
      return;
    }
    if (tag === 'a' && $(el).attr('href') !== undefined) {
      const texto = $(el).text().replace(/\s+/g, ' ').trim();
      // enlaces con texto visible = botón/enlace editable; se captura como unidad (no sus text nodes)
      if (texto.length >= 1 && texto.length <= 120) {
        const id = 'l' + cont.enlace++;
        cb('enlace', el, { id, etiqueta: 'Botón/Enlace', seccion, texto, href: $(el).attr('href') || '', target: $(el).attr('target') || '' });
        return; // no recorrer dentro (evita duplicar el texto)
      }
    }
    // recurse
    const node = el;
    let child = node.firstChild;
    while (child) { const next = child.next; visita(child); child = next; }
  }
  $scope.each((_, el) => visita(el));
}

function extraer($, $scope, opts) {
  const campos = [];
  recorrer($, $scope, (tipo, el, x) => {
    if (tipo === 'texto') campos.push({ id: x.id, tipo, etiqueta: x.etiqueta, seccion: x.seccion, valor: x.valor });
    else if (tipo === 'imagen') campos.push({ id: x.id, tipo, etiqueta: x.etiqueta, seccion: x.seccion, src: x.src, alt: x.alt });
    else if (tipo === 'enlace') campos.push({ id: x.id, tipo, etiqueta: x.etiqueta, seccion: x.seccion, texto: x.texto, href: x.href, target: x.target });
  }, opts);
  return campos;
}

/** Marca nodos con data-cms-id y aplica overrides {id: {valor|texto|href|target|src|alt}}. */
function inyectar($, $scope, overrides, opts) {
  overrides = overrides || {};
  recorrer($, $scope, (tipo, el, x) => {
    const ov = overrides[x.id];
    const pref = opts.prefijo || '';
    if (tipo === 'texto') {
      const valor = ov && typeof ov.valor === 'string' ? ov.valor : el.data;
      if (opts.marcar === false) {
        el.data = valor; // solo aplica el cambio, sin envolver (sitio público sin editor)
      } else {
        // envuelve el texto en un span editable (edición en contexto precisa)
        const span = `<span data-cms="${pref}${x.id}">${$('<div>').text(valor).html()}</span>`;
        $(el).replaceWith(span);
      }
    } else if (tipo === 'imagen') {
      if (ov && ov.src) { $(el).attr('src', ov.src); $(el).removeAttr('srcset'); }
      if (ov && typeof ov.alt === 'string') $(el).attr('alt', ov.alt);
      $(el).attr('data-cms', pref + x.id);
    } else if (tipo === 'enlace') {
      if (ov && typeof ov.texto === 'string') $(el).text(ov.texto);
      if (ov && ov.href) $(el).attr('href', ov.href);
      if (ov && typeof ov.target === 'string') { if (ov.target) $(el).attr('target', ov.target); else $(el).removeAttr('target'); }
      $(el).attr('data-cms', pref + x.id);
    }
  }, opts);
}

// Región de contenido de página = body saltando header/footer (opts.saltarHF)
function scopeContenido($) { return $('body'); }
function scopeGlobal($) { return $('header').first().add($('footer').first()); }

module.exports = { recorrer, extraer, inyectar, scopeContenido, scopeGlobal, SKIP };
