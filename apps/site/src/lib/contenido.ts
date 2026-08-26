// Carga de contenido fuente: content/ (verdad editorial y de catálogo) + reference/ (HTML congelado).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// La build corre con cwd = apps/site (el bundler reubica los módulos, no usar import.meta)
const ROOT = path.resolve(process.cwd(), '..', '..');
const C = (...p: string[]) => path.join(ROOT, 'content', ...p);
const R = (...p: string[]) => path.join(ROOT, 'reference', ...p);

export interface Producto {
  legacyId: number; slug: string; nombre: string; sku: string | null;
  precio: number | null; precioRegular: number | null; precioOferta: number | null;
  stockStatus: string; descripcionHtml: string; descripcionCorta: string;
  imagen: string | null; galeria: string[];
  categorias: string[]; etiquetas: string[]; marcas: string[];
  seo: { title: string; description: string | null };
  tieneReferencia: boolean; fecha: string; modificado: string;
}
export interface GridItem { tipo: 'categoria' | 'producto'; slug: string }
export interface Listado {
  legacyId: number; slug: string; ruta?: string; nombre: string; conteo: number;
  descripcion?: string; parentSlug?: string | null; imagen?: string | null;
  seo: { title: string; description: string | null };
  grid: { modo: string; items: GridItem[] } | null;
  tieneReferencia: boolean;
}
export interface Congelada {
  slug: string; title: string; htmlRef: string; tipo: string;
  seo: { title: string; description: string | null };
}

const j = (f: string) => JSON.parse(readFileSync(f, 'utf8'));

export const productos = (): Producto[] => j(C('catalogo', 'productos.json'));
export const categorias = (): Listado[] => j(C('catalogo', 'categorias.json'));
export const etiquetas = (): Listado[] => j(C('catalogo', 'etiquetas.json'));
export const marcas = (): Listado[] => j(C('catalogo', 'marcas.json'));
export const sitio = () => j(C('site.json'));

export function congeladas(): Congelada[] {
  const out: Congelada[] = [];
  for (const col of ['pages', 'posts']) {
    const dir = C('es', col);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) out.push(j(path.join(dir, f)));
  }
  return out;
}

export const refHtml = (file: string): string => readFileSync(R('html', file), 'utf8');
export const hayRef = (file: string): boolean => existsSync(R('html', file));

// Cambios de contenido publicados desde el panel (por página + global)
export function overridesPagina(key: string): Record<string, Record<string, string>> {
  const f = C('editables-overrides', `${key}.json`);
  return existsSync(f) ? j(f) : {};
}
export function overridesGlobal(): Record<string, Record<string, string>> {
  const f = C('editables-overrides', '_global.json');
  return existsSync(f) ? j(f) : {};
}

export const urlKey = (u: string): string => {
  const { pathname, search } = new URL(u, 'https://ofitodo.com');
  const k = decodeURIComponent(pathname + search).replace(/\/$/, '') || '__home';
  return k.replace(/^\//, '').replace(/[\/?&=#%]/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);
};

// Inventario completo de URLs 200 del original (para no perder ninguna ruta).
export function urls200(): string[] {
  const csv = readFileSync(R('urls-inventario.csv'), 'utf8').split(/\r?\n/).slice(1);
  const out: string[] = [];
  for (const line of csv) {
    if (!line) continue;
    const m = line.match(/^"([^"]+)",[^,]+,(\d+),"([^"]*)"/);
    if (!m) continue;
    const [, url, status, finalUrl] = m;
    if (status !== '200') continue;
    if (url.replace(/\/$/, '') !== finalUrl.replace(/\/$/, '')) continue; // redirigidas no
    const u = new URL(url);
    if (u.search || /\/feed\/?$/.test(u.pathname)) continue;
    out.push(u.pathname);
  }
  return out;
}
