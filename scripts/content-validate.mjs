// Valida content/ contra packages/schema (regla §5.3): site.json, theme.json, redirects.json
// y todas las páginas/posts. Falla el build si algo no cumple.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// El esquema es TypeScript; se ejecuta vía tsx para no duplicar definiciones.
const ROOT = path.resolve(import.meta.dirname, '..');
const runner = path.join(ROOT, 'scripts', '_validate-impl.mts');
execSync(`npx tsx "${runner}"`, { stdio: 'inherit', cwd: ROOT });
