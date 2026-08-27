// extraer-medios: catálogo de todos los medios del sitio (biblioteca original de WordPress)
// para el módulo "Medios" del panel. Salida: content/medios.json
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DB = (t) => JSON.parse(readFileSync(path.join(ROOT, 'reference', 'db-export', `${t}.json`), 'utf8'));

const posts = DB('posts');
const postmeta = DB('postmeta');

const metaByPost = new Map();
for (const m of postmeta) {
  if (!metaByPost.has(m.post_id)) metaByPost.set(m.post_id, {});
  metaByPost.get(m.post_id)[m.meta_key] = m.meta_value;
}

const EXT_IMG = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
const EXT_DOC = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;
const EXT_VID = /\.(mp4|webm|mov|avi)$/i;

const medios = [];
for (const p of posts) {
  if (p.post_type !== 'attachment') continue;
  const m = metaByPost.get(p.ID) ?? {};
  const archivo = m._wp_attached_file;
  if (!archivo) continue;
  const url = `https://ofitodo.com/wp-content/uploads/${archivo}`;
  const tipo = EXT_IMG.test(archivo) ? 'imagen' : EXT_VID.test(archivo) ? 'video' : EXT_DOC.test(archivo) ? 'documento' : 'otro';
  // miniatura: WordPress genera -150x150 para imágenes rasterizadas
  const thumb = tipo === 'imagen' && !/\.svg$/i.test(archivo)
    ? url.replace(/(\.\w+)$/, '-150x150$1') : url;
  medios.push({
    id: p.ID,
    nombre: p.post_title || archivo.split('/').pop(),
    archivo: archivo.split('/').pop(),
    url, thumb, tipo,
    alt: m._wp_attachment_image_alt || '',
    fecha: (p.post_date || '').slice(0, 10),
    origen: 'sitio',
  });
}
medios.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
writeFileSync(path.join(ROOT, 'content', 'medios.json'), JSON.stringify(medios));
const porTipo = medios.reduce((a, m) => (a[m.tipo] = (a[m.tipo] || 0) + 1, a), {});
console.log(`medios.json: ${medios.length} archivos ·`, JSON.stringify(porTipo));
