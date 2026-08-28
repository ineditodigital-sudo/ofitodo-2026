// publicar-produccion: aplica al sitio en vivo los cambios que se publicaron desde el panel.
//   1) baja los cambios publicados (contenido, productos, SEO, slugs, tema, sitio) → content/
//   2) reconstruye el sitio
//   3) sube las páginas a producción (aditivo, no toca la base de datos ni uploads)
// Uso: node scripts/publicar-produccion.mjs   (o: npm run publicar)
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const run = (cmd, cwd = ROOT) => { console.log('· ' + cmd); execSync(cmd, { stdio: 'inherit', cwd }); };

console.log('[1/4] Bajando cambios publicados del panel…');
run('node scripts/sincronizar-panel.mjs https://ofitodo.com');

console.log('[2/4] Regenerando catálogo editable…');
run('node scripts/extraer-editables.mjs');

console.log('[3/4] Reconstruyendo el sitio…');
run('npm run build', path.join(ROOT, 'apps', 'site'));
run('node scripts/preparar-produccion.mjs');

console.log('[4/4] Subiendo a producción (aditivo)…');
run('node scripts/deploy-cutover.mjs');

console.log('\n✔ Publicado. Los cambios ya están en https://ofitodo.com (revisa con Ctrl+F5).');
