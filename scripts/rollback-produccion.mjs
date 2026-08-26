// rollback-produccion: revierte el cutover al instante restaurando el .htaccess de
// WordPress y quitando el index.html del sitio nuevo. WordPress vuelve a servir.
// Uso: node scripts/rollback-produccion.mjs <carpeta-de-respaldo>
//   ej: node scripts/rollback-produccion.mjs backups/prod-2026-08-26_1621
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Client } = require('./.deps/node_modules/basic-ftp');

const ROOT = path.resolve(import.meta.dirname, '..');
const BK = process.argv[2];
if (!BK || !existsSync(path.join(ROOT, BK, 'dothtaccess'))) {
  console.error('Uso: node scripts/rollback-produccion.mjs <carpeta-respaldo con dothtaccess>');
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(path.join(ROOT, '.env.prod'), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const REMOTO = (env.FTP_PATH || '/').replace(/\/$/, '') || '';

const c = new Client(60000);
try {
  await c.access({ host: env.FTP_HOST, port: +(env.FTP_PORT || 21), user: env.FTP_USER, password: env.FTP_PASS, secure: env.FTP_SECURE !== 'no', secureOptions: { rejectUnauthorized: false } });
  // 1. restaurar el .htaccess original de WordPress
  await c.uploadFrom(path.join(ROOT, BK, 'dothtaccess'), `${REMOTO}/.htaccess`);
  console.log('.htaccess de WordPress restaurado.');
  // 2. quitar el index.html del sitio nuevo para que index.php (WP) vuelva a mandar
  try { await c.rename(`${REMOTO}/index.html`, `${REMOTO}/index.html.nuevo`); console.log('index.html del sitio nuevo apartado (→ index.html.nuevo).'); }
  catch (e) { console.log('index.html: ', e.message.split('\n')[0]); }
  console.log('ROLLBACK COMPLETO. WordPress vuelve a servir en ofitodo.com. Purga la caché de Cloudflare si aplica.');
} finally { c.close(); }
