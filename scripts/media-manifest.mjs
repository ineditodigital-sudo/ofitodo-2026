// media-manifest: inventaría wp-content/uploads del backup vs adjuntos registrados en la DB.
// Salida: reference/media-manifest.json + resumen en consola.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UP = path.join(ROOT, 'SITIO WEB OLD OFITODO', 'wp-content', 'uploads');
const postmeta = JSON.parse(readFileSync(path.join(ROOT, 'reference', 'db-export', 'postmeta.json'), 'utf8'));

const attached = new Set(postmeta.filter(m => m.meta_key === '_wp_attached_file').map(m => m.meta_value.replace(/\\/g, '/')));

const files = [];
(function walk(dir, rel) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r);
    else files.push({ file: r, size: statSync(path.join(dir, e.name)).size });
  }
})(UP, '');

const isThumbOf = (f) => f.replace(/-\d+x\d+(\.\w+)$/, '$1');
const scaled = (f) => f.replace(/-scaled(\.\w+)$/, '$1');
let nOrig = 0, nThumb = 0, nOrphan = 0, bOrig = 0, bThumb = 0, bOrphan = 0;
for (const f of files) {
  const base = f.file;
  if (attached.has(base)) { f.kind = 'original'; nOrig++; bOrig += f.size; }
  else if (attached.has(isThumbOf(base)) || attached.has(scaled(isThumbOf(base))) || attached.has(isThumbOf(base).replace(/(\.\w+)$/, '-scaled$1'))) { f.kind = 'thumbnail'; nThumb++; bThumb += f.size; }
  else { f.kind = 'huerfano'; nOrphan++; bOrphan += f.size; }
}

const gb = (b) => (b / 1024 ** 3).toFixed(2) + ' GB';
writeFileSync(path.join(ROOT, 'reference', 'media-manifest.json'), JSON.stringify({
  generado: new Date().toISOString().slice(0, 10),
  totales: { archivos: files.length, originalesRegistrados: attached.size, enDisco: { originales: nOrig, thumbnails: nThumb, huerfanos: nOrphan } },
  bytes: { originales: bOrig, thumbnails: bThumb, huerfanos: bOrphan },
  archivos: files,
}));
console.log(`uploads: ${files.length} archivos · registrados en DB: ${attached.size}`);
console.log(`originales en disco: ${nOrig} (${gb(bOrig)}) · thumbnails: ${nThumb} (${gb(bThumb)}) · huérfanos: ${nOrphan} (${gb(bOrphan)})`);
const faltan = [...attached].filter(a => !files.some(f => f.file === a));
console.log(`adjuntos registrados SIN archivo en disco: ${faltan.length}`);
if (faltan.length) writeFileSync(path.join(ROOT, 'reference', 'media-faltante.json'), JSON.stringify(faltan, null, 2));
