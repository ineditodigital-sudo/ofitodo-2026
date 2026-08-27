// Versiona la hoja de refinamiento con un hash del contenido:
//   refinamiento.css → refinamiento.<hash>.css
// Así cada cambio estrena URL (la caché de Cloudflare deja de ser un problema)
// y a la vez se puede seguir cacheando durante mucho tiempo.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const AQUI = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(AQUI, 'public', 'assets');
const ORIGEN = path.join(ASSETS, 'refinamiento.css');

const css = readFileSync(ORIGEN, 'utf8');
const hash = createHash('sha1').update(css).digest('hex').slice(0, 8);
const nombre = `refinamiento.${hash}.css`;

// limpiar versiones anteriores para no acumular archivos
for (const f of readdirSync(ASSETS)) {
  if (/^refinamiento\.[0-9a-f]{8}\.css$/.test(f) && f !== nombre) unlinkSync(path.join(ASSETS, f));
}
writeFileSync(path.join(ASSETS, nombre), css);

// el build lo lee para enlazarlo en cada página
mkdirSync(path.join(AQUI, 'src', 'generado'), { recursive: true });
writeFileSync(path.join(AQUI, 'src', 'generado', 'assets.json'), JSON.stringify({ refinamiento: `/assets/${nombre}` }, null, 1));
console.log(`refinamiento versionado → ${nombre}`);
