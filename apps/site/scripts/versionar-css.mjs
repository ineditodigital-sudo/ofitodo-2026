// Versiona cada hoja de estilo con un hash de su contenido:
//   ofitodo.css → ofitodo.<hash>.css
// Así cada cambio estrena URL (la caché de Cloudflare deja de ser un problema)
// y a la vez se puede seguir cacheando durante mucho tiempo.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const AQUI = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(AQUI, 'public', 'assets');

// Hojas del sistema de diseño que se versionan (nombre lógico → archivo fuente)
const HOJAS = ['refinamiento', 'ofitodo', 'paginas'];

const salida = {};
for (const nombre of HOJAS) {
  const origen = path.join(ASSETS, `${nombre}.css`);
  if (!existsSync(origen)) continue;

  const css = readFileSync(origen, 'utf8');
  const hash = createHash('sha1').update(css).digest('hex').slice(0, 8);
  const archivo = `${nombre}.${hash}.css`;

  // limpiar versiones anteriores para no acumular archivos
  const viejo = new RegExp(`^${nombre}\\.[0-9a-f]{8}\\.css$`);
  for (const f of readdirSync(ASSETS)) {
    if (viejo.test(f) && f !== archivo) unlinkSync(path.join(ASSETS, f));
  }

  writeFileSync(path.join(ASSETS, archivo), css);
  salida[nombre] = `/assets/${archivo}`;
  console.log(`${nombre} versionado → ${archivo}`);
}

// el build lo lee para enlazarlo en cada página
mkdirSync(path.join(AQUI, 'src', 'generado'), { recursive: true });
writeFileSync(path.join(AQUI, 'src', 'generado', 'assets.json'), JSON.stringify(salida, null, 1));
