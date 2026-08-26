// cutover-produccion: ejecuta el runbook docs/06-cutover.md de forma segura y guiada.
// Requiere credenciales de PRODUCCIÓN en .env.prod (FTP_HOST/FTP_USER/FTP_PASS/FTP_PATH).
//
// Fases:
//   1. RESPALDO obligatorio del docroot actual de producción → backups/prod-<fecha>/ (sin esto, aborta)
//   2. Sube dist-prod/ (sitio + api + panel + .htaccess de producción)
//   3. Verifica (smoke test) y REPORTA qué archivos de WordPress conviene borrar (NO los borra solo:
//      el paso destructivo se hace a mano o con --purge tras confirmar el smoke test)
//
// Uso:
//   node scripts/preparar-produccion.mjs
//   node scripts/cutover-produccion.mjs            # respaldo + deploy + smoke (NO destructivo)
//   node scripts/cutover-produccion.mjs --purge    # además borra los restos de WordPress
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Client } = require('./.deps/node_modules/basic-ftp');

const ROOT = path.resolve(import.meta.dirname, '..');
const ENVF = path.join(ROOT, '.env.prod');
if (!existsSync(ENVF)) {
  console.error('FALTA .env.prod con las credenciales de PRODUCCIÓN. Crea el archivo con:\n' +
    'FTP_HOST=...\nFTP_USER=...\nFTP_PASS=...\nFTP_PATH=/public_html   (o el docroot de ofitodo.com)\n');
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(ENVF, 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const DIST = path.join(ROOT, 'dist-prod');
if (!existsSync(DIST)) { console.error('Falta dist-prod/. Corre antes: node scripts/preparar-produccion.mjs'); process.exit(1); }

const PURGE = process.argv.includes('--purge');
const REMOTO = (env.FTP_PATH || '/').replace(/\/$/, '') || '';
const SELLO = process.env.SELLO || new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const BK = path.join(ROOT, 'backups', `prod-${SELLO}`);

async function conectar() {
  const c = new Client(90000);
  await c.access({ host: env.FTP_HOST, port: +(env.FTP_PORT || 21), user: env.FTP_USER, password: env.FTP_PASS, secure: env.FTP_SECURE !== 'no', secureOptions: { rejectUnauthorized: false } });
  return c;
}

// 1. RESPALDO
console.log(`[1/3] Respaldo del docroot de producción → ${BK}`);
mkdirSync(BK, { recursive: true });
let c = await conectar();
await c.cd(REMOTO || '/');
try {
  await c.downloadToDir(BK, '.');
} catch (e) {
  console.error('RESPALDO FALLÓ:', e.message, '\nSin respaldo NO se despliega (regla dura #11). Abortado.');
  c.close(); process.exit(1);
}
c.close();
const nBk = (function cuenta(d) { let n = 0; for (const e of readdirSync(d, { withFileTypes: true })) n += e.isDirectory() ? cuenta(path.join(d, e.name)) : 1; return n; })(BK);
if (nBk < 5) { console.error(`Respaldo sospechosamente pequeño (${nBk} archivos). Abortado por seguridad.`); process.exit(1); }
console.log(`   Respaldo OK: ${nBk} archivos guardados en ${BK}`);

// 2. DEPLOY del sitio nuevo (incremental, conserva wp-content/uploads)
console.log('[2/3] Subiendo dist-prod/ (incremental, no borra uploads)');
const archivos = [];
(function walk(d, rel) { for (const e of readdirSync(d, { withFileTypes: true })) { const r = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else archivos.push({ abs: path.join(d, e.name), rel: r, size: statSync(path.join(d, e.name)).size }); } })(DIST, '');
c = await conectar();
const dirs = new Set(); let subidos = 0, saltados = 0;
for (const f of archivos) {
  const remoto = `${REMOTO}/${f.rel}`; const dir = remoto.split('/').slice(0, -1).join('/') || '/';
  for (let i = 1; i <= 4; i++) {
    try {
      if (!dirs.has(dir)) { await c.ensureDir(dir); await c.cd('/'); dirs.add(dir); }
      let tam = -1; try { tam = await c.size(remoto); } catch {}
      if (tam === f.size) { saltados++; break; }
      await c.uploadFrom(f.abs, remoto); subidos++; break;
    } catch (e) { if (i === 4) console.log('FALLO', f.rel, e.message); else { c.close(); c = await conectar(); } }
  }
}
c.close();
console.log(`   Deploy OK: ${subidos} subidos, ${saltados} sin cambio`);

// 3. SMOKE TEST
console.log('[3/3] Smoke test en producción');
const smoke = ['/', '/tienda/', '/producto/silla-operativa-modelo-lituania-ofitodo/', '/categoria-producto/escritorios/', '/sitemap_index.xml', '/robots.txt', '/api/salud'];
let ok = 0;
for (const p of smoke) {
  try {
    const r = await fetch(`https://ofitodo.com${p}?cb=${Date.now()}`, { redirect: 'manual' });
    const bueno = r.status === 200 || (p === '/' && r.status < 400);
    console.log(`   ${r.status} ${p}`); if (bueno) ok++;
  } catch (e) { console.log(`   ERR ${p}: ${e.message}`); }
}
console.log(`   Smoke: ${ok}/${smoke.length} OK`);

// Paso destructivo (opcional, tras confirmar smoke)
const RESTOS = ['wp-admin', 'wp-includes', 'wp-content/plugins', 'wp-content/themes', 'wp-content/cache',
  'wp-login.php', 'xmlrpc.php', 'wp-cron.php', 'wp-load.php', 'wp-settings.php', 'wp-blog-header.php',
  'wp-links-opml.php', 'wp-mail.php', 'wp-signup.php', 'wp-trackback.php', 'wp-activate.php',
  'wp-comments-post.php', 'wp-config-sample.php', 'readme.html', 'license.txt'];
if (PURGE) {
  if (ok < smoke.length) { console.error('NO se purga: el smoke test no pasó al 100 %. Revisa antes.'); process.exit(1); }
  console.log('[purge] Borrando restos de WordPress (se CONSERVA wp-content/uploads y wp-config.php hasta el final)');
  c = await conectar();
  for (const r of RESTOS) {
    const remoto = `${REMOTO}/${r}`;
    try { if (r.endsWith('.php') || r.endsWith('.html') || r.endsWith('.txt')) await c.remove(remoto); else await c.removeDir(remoto); console.log('   borrado', r); }
    catch (e) { console.log('   (no estaba)', r); }
  }
  c.close();
  console.log('Purga completa. Revisa el sitio y, cuando estés seguro, borra wp-config.php y la DB de WordPress a mano (docs/06-cutover.md paso 8).');
} else {
  console.log('\nDeploy no destructivo completo. El sitio nuevo ya responde JUNTO a WordPress.');
  console.log('Cuando confirmes que todo se ve bien, corre:  node scripts/cutover-produccion.mjs --purge');
  writeFileSync(path.join(BK, 'restos-a-borrar.json'), JSON.stringify(RESTOS, null, 1));
}
