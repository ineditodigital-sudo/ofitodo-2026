// parity (M1): compara el sitio construido (apps/site/dist) contra la referencia congelada,
// URL por URL: title, meta description, canonical, robots, secuencia h1–h6, conteos de
// enlaces/imágenes/JSON-LD. Salida: reports/parity/parity.json + resumen.md
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { load } = require('./.deps/node_modules/cheerio');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'apps', 'site', 'dist');
const OUT = path.join(ROOT, 'reports', 'parity');
mkdirSync(OUT, { recursive: true });

const analizar = (html) => {
  const $ = load(html);
  // Ítems pre-renderizados ocultos que sustituyen el "load more" ajax del original:
  // no cuentan para paridad (la vista inicial es idéntica).
  $('[data-of-mas], .of-cargar-mas-holder').remove();
  // El icono del botón de WhatsApp venía de un banco externo que ya no lo sirve
  // (se veía roto en todas las fichas): se sustituyó por un icono propio.
  $('img[src*="vecteezy"], img[src*="whatsapp-logo"]').remove();
  return {
    title: $('title').first().text(),
    description: $('meta[name="description"]').attr('content') ?? null,
    canonical: $('link[rel="canonical"]').attr('href') ?? null,
    robots: $('meta[name="robots"]').attr('content') ?? null,
    hs: $('h1,h2,h3,h4,h5,h6').map((_, e) => e.tagName + ':' + $(e).text().replace(/\s+/g, ' ').trim().slice(0, 80)).get(),
    nLinks: $('a[href]').length,
    nImgs: $('img').length,
    nJsonLd: $('script[type="application/ld+json"]').length,
  };
};

const resultados = [];
for (const f of readdirSync(path.join(ROOT, 'reference', 'meta'))) {
  const m = JSON.parse(readFileSync(path.join(ROOT, 'reference', 'meta', f), 'utf8'));
  const u = new URL(m.url);
  if (m.status !== 200 || u.search || /\/feed\/?$/.test(u.pathname)) continue;
  if (m.url.replace(/\/$/, '') !== m.finalUrl.replace(/\/$/, '')) continue;
  const distFile = u.pathname === '/' ? path.join(DIST, 'index.html') : path.join(DIST, u.pathname.replace(/^\/|\/$/g, ''), 'index.html');
  const refFile = path.join(ROOT, 'reference', 'html', f.replace(/\.json$/, '.html'));
  if (!existsSync(refFile)) continue;
  const fila = { url: u.pathname, existe: existsSync(distFile), difs: [] };
  if (fila.existe) {
    const ref = analizar(readFileSync(refFile, 'utf8'));
    const nue = analizar(readFileSync(distFile, 'utf8'));
    for (const k of ['title', 'description', 'canonical', 'robots']) {
      if ((ref[k] ?? '') !== (nue[k] ?? '')) fila.difs.push({ campo: k, ref: ref[k], nuevo: nue[k] });
    }
    // El primer encabezado del contenido se promueve a h1 a propósito (mejora de SEO:
  // 398 páginas no tenían h1). Si el texto es el mismo, no cuenta como diferencia.
  const normalizar = (hs) => hs.map((h, i) => (i === 0 ? h.replace(/^h[123]:/, 'hN:') : h));
  if (normalizar(ref.hs).join('|') !== normalizar(nue.hs).join('|')) {
      const rs = new Set(ref.hs), ns = new Set(nue.hs);
      fila.difs.push({ campo: 'headings', faltan: ref.hs.filter((h) => !ns.has(h)).slice(0, 5), sobran: nue.hs.filter((h) => !rs.has(h)).slice(0, 5) });
    }
    for (const k of ['nLinks', 'nImgs', 'nJsonLd']) {
      if (Math.abs(ref[k] - nue[k]) > (k === 'nLinks' ? 2 : 0)) fila.difs.push({ campo: k, ref: ref[k], nuevo: nue[k] });
    }
  }
  resultados.push(fila);
}

const total = resultados.length;
const faltantes = resultados.filter((r) => !r.existe);
const conDif = resultados.filter((r) => r.existe && r.difs.length);
const limpias = total - faltantes.length - conDif.length;
writeFileSync(path.join(OUT, 'parity.json'), JSON.stringify(resultados, null, 1));

const L = [`# Paridad de contenido — ${new Date().toISOString().slice(0, 10)}`, '',
  `URLs comparadas: **${total}** · idénticas: **${limpias}** (${(limpias / total * 100).toFixed(1)} %) · con diferencias: ${conDif.length} · faltantes: ${faltantes.length}`, ''];
if (faltantes.length) { L.push('## Faltantes', ''); faltantes.forEach((r) => L.push(`- ${r.url}`)); L.push(''); }
if (conDif.length) {
  L.push('## Diferencias', '');
  for (const r of conDif.slice(0, 80)) {
    L.push(`### ${r.url}`);
    for (const d of r.difs) L.push('- ' + JSON.stringify(d).slice(0, 400));
    L.push('');
  }
}
writeFileSync(path.join(OUT, 'resumen.md'), L.join('\n'));
console.log(`Paridad: ${limpias}/${total} idénticas (${(limpias / total * 100).toFixed(1)} %) · ${conDif.length} con difs · ${faltantes.length} faltantes → reports/parity/`);
