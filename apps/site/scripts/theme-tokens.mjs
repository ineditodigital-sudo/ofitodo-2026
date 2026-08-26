// Genera src/styles/tokens.css desde content/theme.json (§5.1). Corre antes de cada build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const theme = JSON.parse(readFileSync(path.join(ROOT, 'content', 'theme.json'), 'utf8'));

const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const lines = [':root {'];
for (const [k, v] of Object.entries(theme.colores)) lines.push(`  --color-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(theme.tipografias)) lines.push(`  --fuente-${kebab(k)}: '${v}';`);
lines.push('}');

const out = path.resolve(import.meta.dirname, '..', 'src', 'styles');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'tokens.css'), lines.join('\n') + '\n');
console.log('tokens.css generado desde content/theme.json');
