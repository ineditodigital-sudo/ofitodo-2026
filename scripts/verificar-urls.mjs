// Comprueba, CONTRA EL SITIO EN VIVO, que ninguna URL conocida del original se
// haya perdido. Reúne el censo desde dos fuentes independientes:
//   1. reference/urls-inventario.csv  → el rastreo completo del sitio original
//   2. los sitemaps                    → lo que se le declaró a Google
// y pide cada una a producción siguiendo redirecciones.
//
// Uso: node scripts/verificar-urls.mjs [base]
//      node scripts/verificar-urls.mjs https://ofitodo.com
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const BASE = (process.argv[2] || 'https://ofitodo.com').replace(/\/$/, '');
const CONCURRENCIA = 8;
const REINTENTOS = 2;

/* --- Censo ---------------------------------------------------------------- */
const censo = new Map(); // ruta → Set(origen)
const anotar = (url, origen) => {
  try {
    const u = new URL(url, 'https://ofitodo.com');
    if (u.hostname !== 'ofitodo.com') return;
    const ruta = u.pathname + (u.search || '');
    if (!censo.has(ruta)) censo.set(ruta, new Set());
    censo.get(ruta).add(origen);
  } catch { /* URL malformada en la fuente: se ignora */ }
};

// 1) Rastreo original: solo las que respondían 200 (las demás ya no existían)
const csv = readFileSync(path.join(RAIZ, 'reference', 'urls-inventario.csv'), 'utf8').split(/\r?\n/).slice(1);
let inventario200 = 0;
for (const linea of csv) {
  const m = linea.match(/^"([^"]+)",[^,]*,(\d+),"([^"]*)"/);
  if (!m) continue;
  const [, url, estado] = m;
  if (estado !== '200') continue;
  inventario200++;
  anotar(url, 'rastreo');
}

// 2) Sitemaps (lo declarado a los buscadores)
const dist = path.join(RAIZ, 'apps', 'site', 'dist');
let enSitemaps = 0;
if (existsSync(dist)) {
  for (const f of readdirSync(dist).filter((x) => /sitemap.*\.xml$/.test(x) && x !== 'sitemap_index.xml')) {
    const xml = readFileSync(path.join(dist, f), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) { anotar(m[1], 'sitemap'); enSitemaps++; }
  }
}

const rutas = [...censo.keys()].sort();
console.log(`Censo: ${rutas.length} URLs distintas (rastreo 200: ${inventario200} · sitemaps: ${enSitemaps})`);
console.log(`Destino: ${BASE}\n`);

/* --- Comprobación --------------------------------------------------------- */
async function pedir(ruta) {
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 30000);
      // GET (no HEAD): algunos servidores responden distinto a HEAD
      const r = await fetch(BASE + ruta, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'verificador-ofitodo' } });
      clearTimeout(t);
      const destino = new URL(r.url).pathname;
      return { estado: r.status, destino, redirigida: destino.replace(/\/$/, '') !== ruta.split('?')[0].replace(/\/$/, '') };
    } catch (e) {
      if (intento === REINTENTOS) return { estado: 0, destino: '', redirigida: false, error: String(e.message || e).slice(0, 50) };
      await new Promise((r) => setTimeout(r, 800 * (intento + 1)));
    }
  }
}

const resultados = [];
let hechas = 0;
async function trabajador(cola) {
  while (cola.length) {
    const ruta = cola.pop();
    const r = await pedir(ruta);
    resultados.push({ ruta, origen: [...censo.get(ruta)].join('+'), ...r });
    if (++hechas % 50 === 0) console.log(`  ${hechas}/${rutas.length}…`);
  }
}
const cola = [...rutas];
await Promise.all(Array.from({ length: CONCURRENCIA }, () => trabajador(cola)));

/* --- Informe -------------------------------------------------------------- */
const ok = resultados.filter((r) => r.estado === 200 && !r.redirigida);
const redir = resultados.filter((r) => r.estado === 200 && r.redirigida);
const ido = resultados.filter((r) => r.estado === 410);
const perdidas = resultados.filter((r) => r.estado !== 200 && r.estado !== 410);

console.log(`\n${'='.repeat(64)}`);
console.log(`  ${String(ok.length).padStart(4)}  responden 200 en su misma URL`);
console.log(`  ${String(redir.length).padStart(4)}  redirigen (301) a una página válida`);
console.log(`  ${String(ido.length).padStart(4)}  responden 410 (retiradas a propósito)`);
console.log(`  ${String(perdidas.length).padStart(4)}  PERDIDAS`);
console.log('='.repeat(64));

if (redir.length) {
  console.log('\nRedirigidas (la URL antigua sigue funcionando):');
  for (const r of redir.slice(0, 25)) console.log(`  ${r.ruta}  →  ${r.destino}`);
  if (redir.length > 25) console.log(`  … y ${redir.length - 25} más`);
}
if (perdidas.length) {
  console.log('\nPERDIDAS:');
  for (const r of perdidas) console.log(`  [${r.estado || r.error}] ${r.ruta}   (origen: ${r.origen})`);
}

writeFileSync(path.join(RAIZ, 'reports', 'verificacion-urls.json'),
  JSON.stringify({ base: BASE, total: rutas.length, ok: ok.length, redir: redir.length, ido: ido.length, perdidas }, null, 1));
console.log(`\nDetalle en reports/verificacion-urls.json`);
process.exit(perdidas.length ? 1 : 0);
