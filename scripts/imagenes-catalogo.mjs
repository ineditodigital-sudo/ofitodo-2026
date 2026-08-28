// imagenes-catalogo: (1) catálogo de las variantes que WordPress YA generó para cada imagen
// y (2) medición del ancho real al que se muestra cada imagen en el sitio.
// Con ambas cosas el build puede servir siempre el tamaño correcto (srcset + sizes).
// Salida: content/imagenes-variantes.json y content/imagenes-medidas.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { unserialize } = require('./.deps/node_modules/php-serialize');

const ROOT = path.resolve(import.meta.dirname, '..');

/* ---------- 1. Catálogo de variantes ---------- */
const pm = JSON.parse(readFileSync(path.join(ROOT, 'reference', 'db-export', 'postmeta.json'), 'utf8'));
const variantes = {};
let n = 0;
for (const m of pm) {
  if (m.meta_key !== '_wp_attachment_metadata') continue;
  let d; try { d = unserialize(m.meta_value); } catch { continue; }
  if (!d?.file || !d.sizes) continue;
  const dir = d.file.includes('/') ? d.file.slice(0, d.file.lastIndexOf('/') + 1) : '';
  const lista = [];
  for (const v of Object.values(d.sizes)) {
    if (!v?.file || !v.width) continue;
    // solo variantes que conservan la proporción (evita recortes de otra forma)
    lista.push({ f: dir + v.file, w: +v.width, h: +v.height });
  }
  if (d.width) lista.push({ f: d.file, w: +d.width, h: +d.height });
  // deduplicar por ancho, quedándonos con la de proporción más parecida al original
  const prop = d.width / d.height;
  const porAncho = new Map();
  for (const v of lista.sort((a, b) => Math.abs(a.w / a.h - prop) - Math.abs(b.w / b.h - prop))) {
    if (!porAncho.has(v.w)) porAncho.set(v.w, v);
  }
  variantes[d.file] = { w: +d.width, h: +d.height, v: [...porAncho.values()].sort((a, b) => a.w - b.w).map((v) => [v.f, v.w]) };
  n++;
}
writeFileSync(path.join(ROOT, 'content', 'imagenes-variantes.json'), JSON.stringify(variantes));
console.log(`variantes: ${n} imágenes con ${Object.values(variantes).reduce((t, x) => t + x.v.length, 0)} tamaños disponibles`);

/* ---------- 2. Medición del ancho real de despliegue ---------- */
if (process.argv.includes('--medir')) {
  const { chromium } = require('./.deps/node_modules/playwright-core');
  const CHROME = process.env.CHROME_PATH;
  const PAGINAS = [
    '/', '/nosotros/', '/productos/', '/tienda/', '/sectores/', '/contactanos/', '/blog/', '/soluciones/',
    '/muebles-para-oficina/', '/proyectos-destacados/', '/descargar-catalogo/',
    '/categoria-producto/escritorios/', '/categoria-producto/sillas/',
    '/producto/silla-operativa-modelo-lituania-ofitodo/', '/mobiliario-de-oficina-en-aguascalientes/',
  ];
  const medidas = {};
  const b = await chromium.launch({ executablePath: CHROME });
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    for (const ruta of PAGINAS) {
      try {
        await p.goto('https://ofitodo.com' + ruta, { waitUntil: 'load', timeout: 45000 });
        await p.evaluate(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise(r => setTimeout(r, 600)); window.scrollTo(0, 0); });
        await p.waitForTimeout(700);
        const datos = await p.evaluate(() => [...document.images].map((i) => ({
          src: (i.currentSrc || i.src || '').split('/uploads/')[1] || '', w: Math.round(i.getBoundingClientRect().width),
        })).filter((x) => x.src && x.w > 0));
        for (const { src, w } of datos) {
          // normalizar: quitar el sufijo -WxH para agrupar por imagen original
          const base = src.replace(/-\d+x\d+(\.\w+)$/, '$1');
          medidas[base] = Math.max(medidas[base] || 0, w);
        }
      } catch (e) { console.warn('  (no se pudo medir ' + ruta + ')'); }
    }
    await p.close();
  }
  await b.close();
  writeFileSync(path.join(ROOT, 'content', 'imagenes-medidas.json'), JSON.stringify(medidas));
  console.log(`medidas: ${Object.keys(medidas).length} imágenes medidas en escritorio y móvil`);
}
