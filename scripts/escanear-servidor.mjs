// Escaneo defensivo del servidor de producción: busca archivos ejecutables
// donde NO debería haberlos (la carpeta de medios) y ficheros con nombres o
// fechas típicas de una puerta trasera. Solo LEE: no borra ni modifica nada.
//
// Uso: node scripts/escanear-servidor.mjs [ruta-remota]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(RAIZ, 'scripts', '.deps', 'node_modules', 'basic-ftp', 'package.json'));
const ftp = require('basic-ftp');

// Credenciales solo desde .env.prod (nunca en código ni en el repo)
const env = Object.fromEntries(
  readFileSync(path.join(RAIZ, '.env.prod'), 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const HOST = env.FTP_HOST;
const USER = env.FTP_USER;
const PASS = env.FTP_PASS;
const PORT = +(env.FTP_PORT || 21);
const BASE = process.argv[2] || (env.FTP_PATH || '/public_html').replace(/\/$/, '');

// Lo que nunca debería ser ejecutable
const EJECUTABLE = /\.(php[0-9]?|phtml|pht|phps|phar|cgi|pl|py|sh|shtml|asp|aspx|jsp|htaccess)$/i;
// Nombres que usan las puertas traseras conocidas
const SOSPECHOSO = /^(shell|c99|r57|wso|alfa|b374k|mini|adminer|up|upload|cmd|gel4y|indoxploit|marijuana|1337|x|xx|tmp|temp|test|backup|old|wp-conflg|wp-conf|wp-tmp|wp-cache-config|class-wp-|radio|wp-atom|wp-feed|wp-rss|wp-vcd)\b/i;

let c = new ftp.Client(60000);
c.ftp.verbose = false;

async function conectar() {
  const cli = new ftp.Client(60000);
  cli.ftp.verbose = false;
  await cli.access({ host: HOST, port: PORT, user: USER, password: PASS, secure: env.FTP_SECURE !== 'no', secureOptions: { rejectUnauthorized: false } });
  return cli;
}

// El servidor corta la conexión de vez en cuando: se reintenta reconectando,
// así el escaneo cubre TODO el árbol y no deja carpetas sin mirar.
async function listar(dir) {
  for (let intento = 1; intento <= 4; intento++) {
    try { return await c.list(dir); }
    catch (e) {
      if (intento === 4) { hallazgos.errores.push(`${dir}: ${String(e.message).slice(0, 60)}`); return []; }
      try { c.close(); } catch {}
      try { c = await conectar(); } catch {}
    }
  }
  return [];
}

const hallazgos = { ejecutablesEnMedios: [], sospechosos: [], recientes: [], errores: [] };
let visitados = 0;

async function recorrer(dir, prof = 0, dentroDeMedios = false) {
  if (prof > 8) return;
  const lista = await listar(dir);
  visitados++;
  if (visitados % 40 === 0) console.log(`  ${visitados} carpetas revisadas…`);

  for (const f of lista) {
    if (f.name === '.' || f.name === '..') continue;
    const ruta = `${dir}/${f.name}`;
    if (f.isDirectory) {
      await recorrer(ruta, prof + 1, dentroDeMedios || /\/uploads$/.test(dir) || /\/uploads\//.test(ruta));
      continue;
    }
    const reciente = f.modifiedAt && (Date.now() - new Date(f.modifiedAt).getTime()) < 90 * 864e5;
    if (EJECUTABLE.test(f.name)) {
      if (dentroDeMedios) hallazgos.ejecutablesEnMedios.push({ ruta, tam: f.size, fecha: f.modifiedAt });
      else if (reciente) hallazgos.recientes.push({ ruta, tam: f.size, fecha: f.modifiedAt });
    }
    if (SOSPECHOSO.test(f.name) && EJECUTABLE.test(f.name)) {
      hallazgos.sospechosos.push({ ruta, tam: f.size, fecha: f.modifiedAt });
    }
  }
}

console.log(`Escaneando ${HOST}${BASE} (solo lectura)…\n`);
c = await conectar();

for (const sub of ['/wp-content/uploads', '/wp-content', '/wp-includes', '']) {
  const dir = BASE + sub;
  console.log(`· ${dir}`);
  await recorrer(dir, sub === '' ? 7 : 0, sub.includes('uploads'));
}
c.close();

const fmt = (x) => `    ${x.ruta}  (${x.tam} bytes, ${x.fecha ? new Date(x.fecha).toISOString().slice(0, 10) : 'sin fecha'})`;
console.log(`\n${'='.repeat(66)}`);
console.log(`  Ejecutables dentro de /uploads : ${hallazgos.ejecutablesEnMedios.length}`);
console.log(`  Nombres sospechosos            : ${hallazgos.sospechosos.length}`);
console.log(`  Ejecutables modificados <90 d  : ${hallazgos.recientes.length}`);
console.log('='.repeat(66));

if (hallazgos.ejecutablesEnMedios.length) {
  console.log('\n*** EJECUTABLES EN LA CARPETA DE MEDIOS (no debería haber ninguno) ***');
  hallazgos.ejecutablesEnMedios.forEach((x) => console.log(fmt(x)));
}
if (hallazgos.sospechosos.length) {
  console.log('\n*** NOMBRES TÍPICOS DE PUERTA TRASERA ***');
  hallazgos.sospechosos.forEach((x) => console.log(fmt(x)));
}
if (hallazgos.recientes.length) {
  console.log('\nEjecutables modificados en los últimos 90 días:');
  hallazgos.recientes.slice(0, 40).forEach((x) => console.log(fmt(x)));
  if (hallazgos.recientes.length > 40) console.log(`    … y ${hallazgos.recientes.length - 40} más`);
}
if (hallazgos.errores.length) console.log(`\nCarpetas no legibles: ${hallazgos.errores.length}`);

writeFileSync(path.join(RAIZ, 'reports', 'escaneo-servidor.json'), JSON.stringify(hallazgos, null, 1));
console.log('\nDetalle en reports/escaneo-servidor.json');
