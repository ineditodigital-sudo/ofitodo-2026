// deploy-cutover: sube dist-prod/ al docroot de producción EXCEPTO .htaccess (aditivo,
// WordPress sigue sirviendo). El .htaccess se sube aparte como switch atómico.
// Uso: node scripts/deploy-cutover.mjs            → sube todo menos .htaccess
//      node scripts/deploy-cutover.mjs --switch   → sube SOLO .htaccess (el switch)
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Client } = require('./.deps/node_modules/basic-ftp');

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(readFileSync(path.join(ROOT, '.env.prod'), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const REMOTO = (env.FTP_PATH || '/').replace(/\/$/, '') || '';
const DIST = path.join(ROOT, 'dist-prod');
const SWITCH = process.argv.includes('--switch');

async function conectar() {
  const c = new Client(90000);
  await c.access({ host: env.FTP_HOST, port: +(env.FTP_PORT || 21), user: env.FTP_USER, password: env.FTP_PASS, secure: env.FTP_SECURE !== 'no', secureOptions: { rejectUnauthorized: false } });
  return c;
}

let c = await conectar();

if (SWITCH) {
  await c.ensureDir(REMOTO || '/'); await c.cd('/');
  await c.uploadFrom(path.join(DIST, '.htaccess'), `${REMOTO}/.htaccess`);
  console.log('SWITCH: .htaccess de producción subido. El sitio nuevo está activo.');
  c.close();
} else {
  const archivos = [];
  (function walk(d, rel) { for (const e of readdirSync(d, { withFileTypes: true })) { const r = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (r !== '.htaccess') archivos.push({ abs: path.join(d, e.name), rel: r, size: statSync(path.join(d, e.name)).size }); } })(DIST, '');
  console.log(`Subiendo ${archivos.length} archivos (sin .htaccess) → ${REMOTO}`);
  const dirs = new Set(); let subidos = 0, saltados = 0, fallidos = [];
  for (const [i, f] of archivos.entries()) {
    const remoto = `${REMOTO}/${f.rel}`; const dir = remoto.split('/').slice(0, -1).join('/') || '/';
    for (let t = 1; t <= 4; t++) {
      try {
        if (!dirs.has(dir)) { await c.ensureDir(dir); await c.cd('/'); dirs.add(dir); }
        let tam = -1; try { tam = await c.size(remoto); } catch {}
        if (tam === f.size) { saltados++; break; }
        await c.uploadFrom(f.abs, remoto); subidos++; break;
      } catch (e) { if (t === 4) { fallidos.push(f.rel); console.log('FALLO', f.rel, e.message.split('\n')[0]); } else { try { c.close(); c = await conectar(); } catch {} } }
    }
    if ((i + 1) % 50 === 0) console.log(`${i + 1}/${archivos.length} · subidos ${subidos} · saltados ${saltados}`);
  }
  console.log(`LISTO (aditivo): subidos ${subidos}, sin cambio ${saltados}, fallidos ${fallidos.length}`);
  c.close();
  if (fallidos.length) process.exit(1);
}
