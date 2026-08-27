// extraer-editables: genera el catálogo de contenido editable por página + el global
// (header/footer). Salida: content/editables/<key>.json y content/editables/_global.json
// Cada archivo = { pagina, titulo, campos:[{id,tipo,etiqueta,seccion,valor|src|alt|texto|href|target}] }
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { load } = require('./.deps/node_modules/cheerio');
const core = require('./editables-core.cjs');

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'content', 'editables');
mkdirSync(OUT, { recursive: true });

const congeladas = [];
for (const col of ['pages', 'posts']) {
  const dir = path.join(ROOT, 'content', 'es', col);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')))
    congeladas.push(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
}

let totalCampos = 0;
for (const pg of congeladas) {
  const htmlPath = path.join(ROOT, 'reference', 'html', pg.htmlRef);
  if (!existsSync(htmlPath)) continue;
  const $ = load(readFileSync(htmlPath, 'utf8'));
  const campos = core.extraer($, core.scopeContenido($), { saltarHF: true })
    .filter((c) => !esBasura(c));
  const key = (pg.slug === '/' ? 'home' : pg.slug.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
  writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ pagina: pg.slug, titulo: pg.title, key, tipo: pg.tipo || 'page', campos }, null, 1));
  totalCampos += campos.length;
}

// Global (header + footer) desde una página representativa
const rep = load(readFileSync(path.join(ROOT, 'reference', 'html', 'nosotros.html'), 'utf8'));
const globales = core.extraer(rep, core.scopeGlobal(rep)).filter((c) => !esBasura(c));
writeFileSync(path.join(OUT, '_global.json'), JSON.stringify({ pagina: '_global', titulo: 'Encabezado y pie de página', key: '_global', campos: globales }, null, 1));

function esBasura(c) {
  const v = (c.valor || c.texto || '').trim();
  if (c.tipo === 'texto' || c.tipo === 'enlace') {
    if (/^\[[a-z-]+ /i.test(v)) return true;            // shortcodes crudos
    if (/^(\{|\}|;|,|\.|·|\||—|–)$/.test(v)) return true; // símbolos sueltos
    if (v === 'Ir al contenido principal') return true;   // skip-link
  }
  return false;
}

console.log(`Editables: ${congeladas.length} páginas + global · ${totalCampos + globales.length} campos → content/editables/`);
