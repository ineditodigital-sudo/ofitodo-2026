// deploy-ftps: sube un directorio al staging por FTPS explícito. Credenciales desde .env.
// Uso: node scripts/deploy-ftps.mjs <dirLocal> [rutaRemota]
// basic-ftp vive en scripts/.deps (instalación standalone: el disco exFAT no soporta
// los symlinks de npm workspaces, ver docs/estado.md).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Client } = require('./.deps/node_modules/basic-ftp');

const ROOT = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const dirLocal = process.argv[2] ?? 'dist-static';
const rutaRemota = process.argv[3] ?? env.FTP_PATH ?? '/';

const client = new Client(120000);
client.ftp.verbose = false;
try {
  await client.access({
    host: env.FTP_HOST,
    port: +(env.FTP_PORT || 21),
    user: env.FTP_USER,
    password: env.FTP_PASS,
    secure: true, // FTPS explícito
    secureOptions: { rejectUnauthorized: false }, // cert del hosting compartido
  });
  console.log(`Conectado a ${env.FTP_HOST}. Subiendo ${dirLocal} -> ${rutaRemota}`);
  let subidos = 0;
  client.trackProgress((info) => { if (info.type === 'upload') subidos = info.fileCount; });
  await client.ensureDir(rutaRemota);
  await client.uploadFromDir(path.resolve(ROOT, dirLocal));
  console.log(`Listo: ${subidos} archivos subidos.`);
} finally {
  client.close();
}
