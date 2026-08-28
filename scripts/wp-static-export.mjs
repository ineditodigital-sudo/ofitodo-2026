// wp-static-export: convierte la referencia rastreada (reference/html + meta) en un sitio
// estático desplegable en STAGING (temporal.ofitodo.com) para visualización fiel inmediata.
//
// - Estructura de carpetas = URLs exactas del original (/nosotros/ -> nosotros/index.html).
// - Enlaces internos de navegación -> relativos (la navegación se queda en temporal).
// - Assets (wp-content, wp-includes, CSS/JS/imágenes), canonical, og:url y JSON-LD se quedan
//   apuntando a https://ofitodo.com => fidelidad visual total sin subir 2.5 GB de media.
// - SEO de staging protegido por .htaccess (X-Robots-Tag: noindex) + robots.txt Disallow.
// - Limitaciones del preview (documentadas): búsqueda, carrito y formularios no operan aquí;
//   son las islas dinámicas que la reconstrucción Astro implementa contra la API.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const META = path.join(ROOT, 'reference', 'meta');
const HTML = path.join(ROOT, 'reference', 'html');
const OUT = path.join(ROOT, 'dist-static');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const urlKey = (u) => {
  const { pathname, search } = new URL(u);
  let k = decodeURIComponent(pathname + search).replace(/\/$/, '') || '__home';
  return k.replace(/^\//, '').replace(/[\/?&=#%]/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);
};

// No relativizar estos prefijos (assets y rutas WP que se sirven desde el sitio vivo):
const KEEP_ABS = /^https:\/\/ofitodo\.com\/(wp-content|wp-includes|wp-json|xmlrpc|wp-login|wp-admin|feed|comments\/feed|\?)/;

function procesar(html) {
  // href/src de navegación interna -> ruta relativa; assets se quedan absolutos.
  return html.replace(/(href|src)=("|')https:\/\/ofitodo\.com(\/[^"']*)?("|')/g, (m, attr, q1, ruta = '/', q2) => {
    const abs = `https://ofitodo.com${ruta}`;
    if (KEEP_ABS.test(abs)) return m;
    // canonical/og los maneja el <head>: solo tocamos <a href>, no metas (ver abajo)
    return `${attr}=${q1}${ruta}${q2}`;
  });
}

// Nota: el replace anterior también afectaría <link rel="canonical"> porque usa href=.
// Para conservar canónicos hacia producción, se restauran después:
function restaurarCanonicos(html) {
  return html
    .replace(/(<link[^>]+rel=("|')canonical("|')[^>]+href=("|'))(\/[^"']*)(("|'))/g, (m, a, _q1, _q2, _q3, ruta, q4) => `${a}https://ofitodo.com${ruta}${q4}`)
    .replace(/(<meta[^>]+property=("|')og:url("|')[^>]+content=("|'))(\/[^"']*)(("|'))/g, (m, a, _q1, _q2, _q3, ruta, q4) => `${a}https://ofitodo.com${ruta}${q4}`);
}

let ok = 0, saltadas = [];
for (const f of readdirSync(META)) {
  const m = JSON.parse(readFileSync(path.join(META, f), 'utf8'));
  const u = new URL(m.url);
  const esHtml = /text\/html/.test(m.headers?.['content-type'] || 'text/html');
  const redirigida = m.url.replace(/\/$/, '') !== m.finalUrl.replace(/\/$/, '');
  if (m.status !== 200 || !esHtml || redirigida || u.search || /\/feed\/?$/.test(u.pathname)) {
    saltadas.push({ url: m.url, motivo: m.status !== 200 ? `status ${m.status}` : redirigida ? `redirige a ${m.finalUrl}` : u.search ? 'query' : 'feed' });
    continue;
  }
  const key = urlKey(m.url);
  let html;
  try { html = readFileSync(path.join(HTML, `${key}.html`), 'utf8'); } catch { saltadas.push({ url: m.url, motivo: 'sin html' }); continue; }
  html = restaurarCanonicos(procesar(html));
  const rel = u.pathname === '/' ? 'index.html' : path.join(u.pathname.replace(/^\/|\/$/g, ''), 'index.html');
  mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  writeFileSync(path.join(OUT, rel), html);
  ok++;
}

// Página 404 real del original (rastreada) → /404.html
try {
  const h404 = restaurarCanonicos(procesar(readFileSync(path.join(HTML, 'url-inexistente-para-404-xyz.html'), 'utf8')));
  writeFileSync(path.join(OUT, '404.html'), h404);
} catch { console.warn('sin html de 404 en la referencia'); }

// .htaccess de staging: noindex duro + index + 404 del tema
writeFileSync(path.join(OUT, '.htaccess'), [
  '# STAGING temporal.ofitodo.com — no indexar nunca',
  'Header set X-Robots-Tag "noindex, nofollow"',
  'DirectoryIndex index.html',
  'AddDefaultCharset UTF-8',
  'ErrorDocument 404 /404.html',
  '',
].join('\n'));
writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

writeFileSync(path.join(ROOT, 'reference', 'export-saltadas.json'), JSON.stringify(saltadas, null, 2));
console.log(`Exportadas: ${ok} páginas · saltadas: ${saltadas.length} (reference/export-saltadas.json)`);
