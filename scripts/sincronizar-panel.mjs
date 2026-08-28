// sincronizar-panel: baja los cambios hechos en el panel (precios, nombres, descripciones,
// imágenes, SEO de páginas) y los aplica a content/ ANTES del build.
// Forma parte del ciclo de publicación (docs/09-operacion.md).
// Uso: node scripts/sincronizar-panel.mjs [https://temporal.ofitodo.com]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOST = process.argv[2] ?? 'https://temporal.ofitodo.com';
const CLAVE = 'ofsync_7c1f4a9e2b8d4e63a5f0c9d21b7e8a44';

const r = await fetch(`${HOST}/api/exportar-cambios?clave=${CLAVE}&cb=${Math.random()}`);
const data = await r.json();
if (!data.ok) { console.error('No se pudo exportar:', data.mensaje); process.exit(1); }

// productos
const pf = path.join(ROOT, 'content', 'catalogo', 'productos.json');
const productos = JSON.parse(readFileSync(pf, 'utf8'));
let nP = 0;
for (const o of data.productos) {
  const p = productos.find((x) => x.slug === o.slug);
  if (!p) continue;
  if (o.precio != null) { p.precio = +o.precio; p.precioRegular = +o.precio; }
  if (o.stock) p.stockStatus = o.stock;
  if (o.nombre) { p.nombre = o.nombre; p.tieneReferencia = false; } // re-render con datos
  if (o.descripcion) { p.descripcionHtml = o.descripcion; p.descripcionCorta = o.descripcion; p.tieneReferencia = p.tieneReferencia && !o.descripcion; }
  if (o.imagen) { p.imagen = o.imagen; p.tieneReferencia = false; }
  nP++;
}

// cambios de slug: renombra el producto y prepara su 301 (§14)
let nSlug = 0;
for (const s of (data.slugs ?? [])) {
  const p = productos.find((x) => x.slug === s.slug_actual);
  if (!p || !s.slug_nuevo) continue;
  p.slug = s.slug_nuevo;
  p.tieneReferencia = false; // se regenera en la nueva ruta con plantilla donante
  nSlug++;
}
writeFileSync(pf, JSON.stringify(productos, null, 1));

// 301 automáticos en la fuente única de redirecciones
if ((data.redirects ?? []).length) {
  const rf = path.join(ROOT, 'content', 'redirects.json');
  const red = JSON.parse(readFileSync(rf, 'utf8'));
  for (const r of data.redirects) {
    if (!red.redirects.some((x) => x.de === r.origen)) red.redirects.push({ de: r.origen, a: r.destino, codigo: 301 });
    else red.redirects.find((x) => x.de === r.origen).a = r.destino;
  }
  writeFileSync(rf, JSON.stringify(red, null, 2));
}

// índice de búsqueda (nombre/precio actualizados)
const idx = productos.map((p) => ({ slug: p.slug, nombre: p.nombre, sku: p.sku, precio: p.precio, imagen: p.imagen ? p.imagen.replace(/(\.\w+)$/, '-200x200$1') : null, imagenFull: p.imagen }));
writeFileSync(path.join(ROOT, 'content', 'catalogo', 'indice-busqueda.json'), JSON.stringify(idx));

// SEO de páginas congeladas
let nS = 0;
for (const col of ['pages', 'posts']) {
  const dir = path.join(ROOT, 'content', 'es', col);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const fp = path.join(dir, f);
    const pg = JSON.parse(readFileSync(fp, 'utf8'));
    const o = data.paginas.find((x) => x.slug === pg.slug);
    if (!o) continue;
    if (o.title) pg.seo.title = o.title;
    if (o.description) pg.seo.description = o.description;
    writeFileSync(fp, JSON.stringify(pg, null, 1));
    nS++;
  }
}
// contenido editable del CMS → content/editables-overrides/<pagina>.json
let nC = 0;
const contenido = data.contenido ?? {};
if (Object.keys(contenido).length) {
  const dir = path.join(ROOT, 'content', 'editables-overrides');
  mkdirSync(dir, { recursive: true });
  for (const [pagina, campos] of Object.entries(contenido)) {
    writeFileSync(path.join(dir, `${pagina}.json`), JSON.stringify(campos, null, 1));
    nC += Object.keys(campos).length;
  }
}

// ajustes de marca (tema/sitio) → merge en content/theme.json y site.json
const set = data.settings ?? {};
const mergeJson = (rel, patch) => {
  if (!patch) return false;
  const fp = path.join(ROOT, 'content', rel);
  const base = JSON.parse(readFileSync(fp, 'utf8'));
  const deep = (a, b) => { for (const k of Object.keys(b)) a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? deep(a[k] || {}, b[k]) : b[k]; return a; };
  writeFileSync(fp, JSON.stringify(deep(base, patch), null, 2));
  return true;
};
const nTema = mergeJson('theme.json', set.tema) ? 1 : 0;
const nSitio = mergeJson('site.json', set.sitio) ? 1 : 0;

console.log(`Sincronizado: ${nP} productos, ${nS} páginas SEO, ${nC} cambios de contenido, tema:${nTema} sitio:${nSitio}. Ahora: build + deploy.`);
