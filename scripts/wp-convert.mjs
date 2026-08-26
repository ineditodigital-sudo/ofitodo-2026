// wp-convert (Fase S): genera el contenido fuente del sitio nuevo a partir de
// la DB exportada (verdad de datos) + la referencia rastreada (verdad visual).
//
// Salidas:
//   content/catalogo/productos.json     — datos completos de los 368 productos publicados
//   content/catalogo/categorias.json    — 52 categorías con jerarquía, ruta URL y grid de referencia
//   content/catalogo/etiquetas.json     — 47 etiquetas con grid
//   content/catalogo/marcas.json        — 6 marcas con grid
//   content/catalogo/indice-busqueda.json — índice ligero para la isla de búsqueda (nombre+SKU)
//   content/es/pages/*.json             — manifiesto de páginas congeladas (FrozenPage)
//   content/es/posts/*.json             — manifiesto de posts congelados
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { load } = require('./.deps/node_modules/cheerio');

const ROOT = path.resolve(import.meta.dirname, '..');
const DB = (t) => JSON.parse(readFileSync(path.join(ROOT, 'reference', 'db-export', `${t}.json`), 'utf8'));
const OUTCAT = path.join(ROOT, 'content', 'catalogo');
mkdirSync(OUTCAT, { recursive: true });

const posts = DB('posts');
const postmeta = DB('postmeta');
const terms = DB('terms');
const tt = DB('term_taxonomy');
const tr = DB('term_relationships');
const termmeta = DB('termmeta');

const metaByPost = new Map();
for (const m of postmeta) {
  if (!metaByPost.has(m.post_id)) metaByPost.set(m.post_id, {});
  metaByPost.get(m.post_id)[m.meta_key] = m.meta_value;
}
const M = (id) => metaByPost.get(id) ?? {};
const postById = new Map(posts.map((p) => [p.ID, p]));
const termById = new Map(terms.map((t) => [t.term_id, t]));
const ttById = new Map(tt.map((x) => [x.term_taxonomy_id, x]));
const termMetaOf = (termId) => Object.fromEntries(termmeta.filter((m) => m.term_id === termId).map((m) => [m.meta_key, m.meta_value]));

// term_taxonomy_ids por objeto (producto) y objetos por término
const ttByObject = new Map();
const objectsByTt = new Map();
for (const r of tr) {
  (ttByObject.get(r.object_id) ?? ttByObject.set(r.object_id, []).get(r.object_id)).push(r.term_taxonomy_id);
  (objectsByTt.get(r.term_taxonomy_id) ?? objectsByTt.set(r.term_taxonomy_id, []).get(r.term_taxonomy_id)).push(r.object_id);
}
const taxTermsOf = (objId, taxonomy) =>
  (ttByObject.get(objId) ?? [])
    .map((id) => ttById.get(id))
    .filter((x) => x && x.taxonomy === taxonomy)
    .map((x) => termById.get(x.term_id))
    .filter(Boolean);

const adjuntoUrl = (attId) => {
  const f = M(+attId)?._wp_attached_file;
  return f ? `https://ofitodo.com/wp-content/uploads/${f}` : null;
};

// SEO real por URL desde el rastreo (title y description exactos que sirvió Yoast)
const urlKey = (u) => {
  const { pathname, search } = new URL(u);
  let k = decodeURIComponent(pathname + search).replace(/\/$/, '') || '__home';
  return k.replace(/^\//, '').replace(/[\/?&=#%]/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);
};
const crawlMeta = (url) => {
  const f = path.join(ROOT, 'reference', 'meta', `${urlKey(url)}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};
const refHtmlFile = (url) => {
  const f = `${urlKey(url)}.html`;
  return existsSync(path.join(ROOT, 'reference', 'html', f)) ? f : null;
};

// ---------- Rutas URL jerárquicas de categorías ----------
const catTts = tt.filter((x) => x.taxonomy === 'product_cat');
const catPath = new Map(); // term_id -> "padre/hijo"
function rutaDe(termId) {
  if (catPath.has(termId)) return catPath.get(termId);
  const nodo = catTts.find((x) => x.term_id === termId);
  const t = termById.get(termId);
  if (!t) return '';
  const ruta = nodo?.parent ? `${rutaDe(nodo.parent)}/${t.slug}` : t.slug;
  catPath.set(termId, ruta);
  return ruta;
}

// ---------- Grid de referencia (orden y modo reales de cada listado) ----------
function gridDesdeReferencia(url) {
  const f = refHtmlFile(url);
  if (!f) return null;
  const $ = load(readFileSync(path.join(ROOT, 'reference', 'html', f), 'utf8'));
  const items = [];
  $('ul.products > li').each((_, li) => {
    const $li = $(li);
    const href = $li.find('a').first().attr('href') ?? '';
    const esCat = $li.hasClass('ofitodo-category-card');
    const slug = href.replace(/\/$/, '').split('/').pop();
    items.push({ tipo: esCat ? 'categoria' : 'producto', slug });
  });
  return { modo: items[0]?.tipo === 'categoria' ? 'subcategorias' : 'productos', items };
}

// ---------- Productos ----------
const productosPub = posts.filter((p) => p.post_type === 'product' && p.post_status === 'publish');
const productos = productosPub.map((p) => {
  const m = M(p.ID);
  const url = `https://ofitodo.com/producto/${p.post_name}/`;
  const cm = crawlMeta(url);
  const galeria = (m._product_image_gallery ?? '').split(',').filter(Boolean).map(adjuntoUrl).filter(Boolean);
  return {
    legacyId: p.ID,
    slug: p.post_name,
    nombre: p.post_title,
    sku: m._sku ?? null,
    precio: m._price ? +m._price : null,
    precioRegular: m._regular_price ? +m._regular_price : null,
    precioOferta: m._sale_price ? +m._sale_price : null,
    stockStatus: m._stock_status ?? 'instock',
    descripcionHtml: p.post_content ?? '',
    descripcionCorta: p.post_excerpt ?? '',
    imagen: adjuntoUrl(m._thumbnail_id),
    galeria,
    categorias: taxTermsOf(p.ID, 'product_cat').map((t) => t.slug),
    etiquetas: taxTermsOf(p.ID, 'product_tag').map((t) => t.slug),
    marcas: taxTermsOf(p.ID, 'product_brand').map((t) => t.slug),
    upsell: (m._upsell_ids ? [] : []),
    seo: { title: cm?.title ?? p.post_title, description: cm?.metaDescription ?? null },
    tieneReferencia: !!refHtmlFile(url),
    fecha: p.post_date,
    modificado: p.post_modified,
  };
});
writeFileSync(path.join(OUTCAT, 'productos.json'), JSON.stringify(productos, null, 1));

// ---------- Categorías ----------
const categorias = catTts.map((x) => {
  const t = termById.get(x.term_id);
  const tm = termMetaOf(x.term_id);
  const ruta = rutaDe(x.term_id);
  const url = `https://ofitodo.com/categoria-producto/${ruta}/`;
  const cm = crawlMeta(url);
  return {
    legacyId: x.term_id,
    slug: t.slug,
    ruta,
    nombre: t.name,
    descripcion: x.description ?? '',
    parentSlug: x.parent ? termById.get(x.parent)?.slug ?? null : null,
    imagen: tm.thumbnail_id ? adjuntoUrl(tm.thumbnail_id) : null,
    orden: tm.order ? +tm.order : 0,
    conteo: x.count,
    seo: { title: cm?.title ?? t.name, description: cm?.metaDescription ?? null },
    grid: gridDesdeReferencia(url),
    tieneReferencia: !!refHtmlFile(url),
  };
});
writeFileSync(path.join(OUTCAT, 'categorias.json'), JSON.stringify(categorias, null, 1));

// ---------- Etiquetas y marcas ----------
const listadoTax = (taxonomy, base) => tt.filter((x) => x.taxonomy === taxonomy).map((x) => {
  const t = termById.get(x.term_id);
  const url = `https://ofitodo.com/${base}/${t.slug}/`;
  const cm = crawlMeta(url);
  return {
    legacyId: x.term_id, slug: t.slug, nombre: t.name, conteo: x.count,
    seo: { title: cm?.title ?? t.name, description: cm?.metaDescription ?? null },
    grid: gridDesdeReferencia(url),
    tieneReferencia: !!refHtmlFile(url),
  };
});
writeFileSync(path.join(OUTCAT, 'etiquetas.json'), JSON.stringify(listadoTax('product_tag', 'product-tag'), null, 1));
writeFileSync(path.join(OUTCAT, 'marcas.json'), JSON.stringify(listadoTax('product_brand', 'marca'), null, 1));

// ---------- Índice de búsqueda (isla): nombre + SKU + imagen + precio ----------
const indice = productos.map((p) => ({
  slug: p.slug, nombre: p.nombre, sku: p.sku, precio: p.precio,
  imagen: p.imagen ? p.imagen.replace(/(\.\w+)$/, '-200x200$1') : null,
  imagenFull: p.imagen,
}));
writeFileSync(path.join(OUTCAT, 'indice-busqueda.json'), JSON.stringify(indice));

// ---------- Páginas y posts congelados ----------
// Se excluyen las que el sitio nuevo reimplementa con funcionalidad propia:
const REBUILT = new Set(['cart', 'finalizar-compra', 'mi-cuenta']);
const escribirFrozen = (col, p, slugUrl) => {
  const url = `https://ofitodo.com${slugUrl}`;
  const cm = crawlMeta(url);
  const htmlRef = refHtmlFile(url);
  if (!htmlRef) { console.warn(`sin referencia: ${slugUrl}`); return 0; }
  const data = {
    slug: slugUrl, locale: 'es', title: p?.post_title ?? cm?.title ?? '', template: 'frozen',
    htmlRef, tipo: col === 'posts' ? 'post' : 'page', status: 'publish',
    legacyId: p?.ID, date: p?.post_date, modified: p?.post_modified,
    seo: { title: cm?.title ?? '', description: cm?.metaDescription ?? null },
  };
  const file = (slugUrl === '/' ? 'home' : slugUrl.replace(/^\/|\/$/g, '').replace(/\//g, '__')) + '.json';
  writeFileSync(path.join(ROOT, 'content', 'es', col === 'posts' ? 'posts' : 'pages', file), JSON.stringify(data, null, 1));
  return 1;
};

let nPag = 0, nPost = 0;
nPag += escribirFrozen('pages', posts.find((p) => p.ID === 10551) ?? null, '/'); // portada
for (const p of posts.filter((x) => x.post_type === 'page' && x.post_status === 'publish')) {
  if (REBUILT.has(p.post_name)) continue;
  nPag += escribirFrozen('pages', p, `/${p.post_name}/`);
}
for (const p of posts.filter((x) => x.post_type === 'post' && x.post_status === 'publish')) {
  nPost += escribirFrozen('posts', p, `/${p.post_name}/`);
}

console.log(`productos: ${productos.length} · categorías: ${categorias.length} · etiquetas/marcas: ok`);
console.log(`páginas congeladas: ${nPag} · posts congelados: ${nPost}`);
const sinGrid = categorias.filter((c) => !c.grid).map((c) => c.ruta);
if (sinGrid.length) console.warn('categorías sin grid de referencia:', sinGrid.join(', '));
