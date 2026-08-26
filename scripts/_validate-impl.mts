import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SiteConfig, ThemeTokens, Redirects, PageContent } from '../packages/schema/src/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const C = (p: string) => path.join(ROOT, 'content', p);
let errores = 0;

function validar(nombre: string, schema: { safeParse: (d: unknown) => { success: boolean; error?: unknown } }, data: unknown) {
  const r = schema.safeParse(data);
  if (!r.success) {
    errores++;
    console.error(`✘ ${nombre}:`, JSON.stringify(r.error, null, 1).slice(0, 800));
  } else {
    console.log(`✔ ${nombre}`);
  }
}

validar('site.json', SiteConfig, JSON.parse(readFileSync(C('site.json'), 'utf8')));
validar('theme.json', ThemeTokens, JSON.parse(readFileSync(C('theme.json'), 'utf8')));
validar('redirects.json', Redirects, JSON.parse(readFileSync(C('redirects.json'), 'utf8')));

const slugs = new Set<string>();
for (const col of ['es/pages', 'es/posts']) {
  const dir = C(col);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    validar(`${col}/${f}`, PageContent, data);
    if (slugs.has(data.slug)) { errores++; console.error(`✘ slug duplicado: ${data.slug} (${col}/${f})`); }
    slugs.add(data.slug);
  }
}

if (errores) { console.error(`\n${errores} error(es) de contenido.`); process.exit(1); }
console.log('\nContenido válido.');
