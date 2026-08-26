// deploy-ftps: sube un directorio al staging por FTPS explícito, REANUDABLE:
// - salta archivos ya subidos con el mismo tamaño (SIZE)
// - reconecta y reintenta ante cortes (ECONNRESET habitual en hosting compartido)
// Uso: node scripts/deploy-ftps.mjs <dirLocal> [rutaRemota]
// basic-ftp vive en scripts/.deps (el disco exFAT no soporta symlinks de npm workspaces).
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Client } = require('./.deps/node_modules/basic-ftp');

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const dirLocal = path.resolve(ROOT, process.argv[2] ?? 'dist-static');
const rutaRemota = (process.argv[3] ?? env.FTP_PATH ?? '/').replace(/\/$/, '') || '';

// Lista plana de archivos locales
const archivos = [];
(function walk(d, rel) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(d, e.name), r);
    else archivos.push({ rel: r, abs: path.join(d, e.name), size: statSync(path.join(d, e.name)).size });
  }
})(dirLocal, '');
console.log(`Archivos a subir: ${archivos.length}`);

let client = null;
async function conectar() {
  if (client) try { client.close(); } catch {}
  client = new Client(90000);
  await client.access({
    host: env.FTP_HOST, port: +(env.FTP_PORT || 21),
    user: env.FTP_USER, password: env.FTP_PASS,
    secure: true, secureOptions: { rejectUnauthorized: false },
  });
}

await conectar();
const dirsCreados = new Set();
let subidos = 0, saltados = 0, fallidos = [];

for (const [i, f] of archivos.entries()) {
  const remoto = `${rutaRemota}/${f.rel}`.replace(/\\/g, '/');
  const dirRemoto = remoto.split('/').slice(0, -1).join('/') || '/';
  for (let intento = 1; intento <= 4; intento++) {
    try {
      if (!dirsCreados.has(dirRemoto)) {
        await client.ensureDir(dirRemoto);
        await client.cd('/');
        dirsCreados.add(dirRemoto);
      }
      let tam = -1;
      try { tam = await client.size(remoto); } catch { tam = -1; }
      if (tam === f.size) { saltados++; break; }
      await client.uploadFrom(f.abs, remoto);
      subidos++;
      break;
    } catch (e) {
      if (intento === 4) { fallidos.push(f.rel); console.log(`FALLO ${f.rel}: ${e.message}`); }
      else { try { await conectar(); } catch {} }
    }
  }
  if ((i + 1) % 50 === 0) console.log(`${i + 1}/${archivos.length} · subidos ${subidos} · saltados ${saltados}`);
}

console.log(`LISTO: subidos ${subidos}, ya estaban ${saltados}, fallidos ${fallidos.length}`);
if (fallidos.length) { console.log(fallidos.join('\n')); process.exit(1); }
client.close();
