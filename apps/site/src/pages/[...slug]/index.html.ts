// Generación estática de TODAS las URLs del sitio (paridad de URLs por construcción):
// congeladas (páginas/posts/otros 200 del inventario) + catálogo regenerado desde datos
// + páginas de sistema nuevas. Endpoint .html.ts = control byte a byte del HTML.
import type { APIRoute } from 'astro';
import { productos, categorias, etiquetas, marcas, congeladas, refHtml, hayRef, urlKey, urls200, overridesPagina, overridesGlobal, type Listado } from '../../lib/contenido.ts';
import * as T from '../../lib/transformar.ts';
import * as SIS from '../../lib/sistema-paginas.ts';
import { paginaCatalogo, paginaProducto } from '../../lib/plantillas.ts';
import { INTERIORES, paginaContenido, paginaTienda, paginaSistema } from '../../lib/interiores.ts';
import { readFileSync as leerArchivo, existsSync as hayArchivo } from 'node:fs';
import pathMod from 'node:path';
import { entradas, cuerpos, paginaBlog, paginaEntrada, paginaArchivo } from '../../lib/blog.ts';

type Ruta = { params: { slug: string | undefined }; props: Record<string, unknown> };

// Entradas del blog cuyo cuerpo se pudo extraer sin perder contenido
const reconstruibles = new Set(Object.keys(cuerpos()));

// Archivos de WordPress (tipo de contenido y autor) rehechos como listados
const ARCHIVOS: Record<string, { titulo: string; descripcion: string; filtro: (s: string) => boolean }> = {
  '/tipo/blog/': { titulo: 'Artículos', descripcion: 'Guías y consejos para equipar tu espacio de trabajo.', filtro: (x) => !x.startsWith('/proyecto') },
  '/tipo/proyectos/': { titulo: 'Proyectos', descripcion: 'Instalaciones reales que hemos fabricado y montado.', filtro: (x) => x.startsWith('/proyecto') },
  '/tipo/tarjetas/': { titulo: 'Tarjetas', descripcion: 'Publicaciones de contacto del equipo de Ofitodo.', filtro: () => true },
  '/tipo/uncategorized/': { titulo: 'Publicaciones', descripcion: 'Todas las publicaciones del blog de Ofitodo.', filtro: () => true },
  '/author/marketing/': { titulo: 'Publicaciones de marketing', descripcion: 'Publicaciones del equipo de marketing de Ofitodo.', filtro: () => true },
  '/author/developer/': { titulo: 'Publicaciones de desarrollo', descripcion: 'Publicaciones del equipo de desarrollo de Ofitodo.', filtro: () => true },
};

// Páginas simples (legales e informativas) con su contenido ya extraído
const RUTA_PAGS = pathMod.resolve(process.cwd(), '..', '..', 'content', 'paginas-cuerpos.json');
const paginasCuerpos: Record<string, { titulo: string; seo: { title: string; description: string | null }; html: string }> =
  hayArchivo(RUTA_PAGS) ? JSON.parse(leerArchivo(RUTA_PAGS, 'utf8')) : {};

export function getStaticPaths(): Ruta[] {
  const rutas: Ruta[] = [];
  const cubiertas = new Set<string>();
  const add = (pathname: string, props: Record<string, unknown>) => {
    const slug = pathname.replace(/^\/|\/$/g, '');
    cubiertas.add(pathname.replace(/\/$/, '') || '/');
    rutas.push({ params: { slug: slug || undefined }, props });
  };

  const claveDe = (slug: string) => (slug === '/' ? 'home' : slug.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
  // La portada tiene su propia página rediseñada (src/pages/index.html.ts)
  for (const c of congeladas()) {
    if (c.slug === '/') continue;
    if (INTERIORES[c.slug]) { add(c.slug, { tipo: 'interior', slug: c.slug }); continue; }
    if (c.slug === '/blog/') { add(c.slug, { tipo: 'blog' }); continue; }
    if (c.slug === '/tienda/' || c.slug === '/shop/') { add(c.slug, { tipo: 'tienda', slug: c.slug }); continue; }
    if (paginasCuerpos[c.slug]) { add(c.slug, { tipo: 'contenido', slug: c.slug }); continue; }
    if (reconstruibles.has(c.slug)) { add(c.slug, { tipo: 'entrada', slug: c.slug }); continue; }
    add(c.slug, { tipo: 'congelada', htmlRef: c.htmlRef, seo: c.seo, key: claveDe(c.slug) });
  }

  const prods = productos();
  for (const p of prods) add(`/producto/${p.slug}/`, { tipo: 'producto', slug: p.slug });

  const cats = categorias();
  for (const c of cats) if (c.tieneReferencia) add(`/categoria-producto/${c.ruta}/`, { tipo: 'categoria', slug: c.slug });
  for (const e of etiquetas()) if (e.tieneReferencia) add(`/product-tag/${e.slug}/`, { tipo: 'etiqueta', slug: e.slug });
  for (const m of marcas()) if (m.tieneReferencia) add(`/marca/${m.slug}/`, { tipo: 'marca', slug: m.slug });

  add('/cart/', { tipo: 'sistema', cual: 'carrito' });
  add('/finalizar-compra/', { tipo: 'sistema', cual: 'checkout' });
  add('/mi-cuenta/', { tipo: 'sistema', cual: 'miCuenta' });
  add('/pedido-recibido/', { tipo: 'sistema', cual: 'pedidoRecibido' });

  // Red de seguridad: cualquier URL 200 del inventario aún no cubierta → congelada tal cual
  for (const pathname of urls200()) {
    const clave = pathname.replace(/\/$/, '') || '/';
    if (cubiertas.has(clave)) continue;
    const ruta = pathname.endsWith('/') ? pathname : `${pathname}/`;
    // Archivos de WordPress que también reciben el diseño nuevo
    if (ruta === '/shop/') { add(ruta, { tipo: 'tienda', slug: ruta }); continue; }
    if (ARCHIVOS[ruta]) { add(ruta, { tipo: 'archivo', slug: ruta }); continue; }
    const f = `${urlKey(pathname)}.html`;
    if (hayRef(f)) add(ruta, { tipo: 'congelada', htmlRef: f });
  }
  return rutas;
}


export const GET: APIRoute = ({ props }) => {
  let html = '';
  if (props.tipo === 'congelada') {
    html = T.congelada(refHtml(props.htmlRef as string), props.seo as { title?: string; description?: string | null } | undefined,
      { pagina: overridesPagina(props.key as string), global: overridesGlobal() });
  } else if (props.tipo === 'archivo') {
    const a = ARCHIVOS[props.slug as string];
    html = paginaArchivo(props.slug as string, a.titulo, a.descripcion, a.filtro);
  } else if (props.tipo === 'tienda') {
    html = paginaTienda(props.slug as string);
  } else if (props.tipo === 'contenido') {
    html = paginaContenido(props.slug as string, paginasCuerpos[props.slug as string]);
  } else if (props.tipo === 'blog') {
    html = paginaBlog();
  } else if (props.tipo === 'entrada') {
    const e = entradas().find((x) => x.slug === props.slug)!;
    html = paginaEntrada(e, cuerpos()[e.slug]);
  } else if (props.tipo === 'interior') {
    html = INTERIORES[props.slug as string]();
  } else if (props.tipo === 'producto') {
    const todos = productos();
    const p = todos.find((x) => x.slug === props.slug)!;
    const cats = categorias();
    // Categoría más específica del producto (la de mayor profundidad con menos productos)
    const suyas = p.categorias.map((s) => cats.find((c) => c.slug === s)).filter(Boolean) as Listado[];
    const cat = suyas.sort((a, b) => a.conteo - b.conteo)[0] ?? null;
    const rel = cat
      ? todos.filter((x) => x.slug !== p.slug && x.categorias.includes(cat.slug) && x.imagen).slice(0, 8)
      : [];
    html = paginaProducto({ p, categoria: cat, relacionados: rel });
  } else if (props.tipo === 'categoria' || props.tipo === 'etiqueta' || props.tipo === 'marca') {
    const col = props.tipo === 'categoria' ? categorias() : props.tipo === 'etiqueta' ? etiquetas() : marcas();
    const l = col.find((x) => x.slug === props.slug)!;
    const prods = productos().filter((p) =>
      props.tipo === 'categoria' ? p.categorias.includes(l.slug) : props.tipo === 'etiqueta' ? p.etiquetas.includes(l.slug) : p.marcas.includes(l.slug));
    const subcats = props.tipo === 'categoria' ? categorias().filter((c) => c.parentSlug === l.slug && c.tieneReferencia) : [];
    const hermanas = props.tipo === 'categoria'
      ? categorias().filter((c) => c.slug !== l.slug && c.parentSlug === (l.parentSlug ?? null) && c.conteo > 0 && c.tieneReferencia).slice(0, 12)
      : [];
    const ruta = props.tipo === 'categoria' ? `/categoria-producto/${l.ruta ?? l.slug}/`
      : props.tipo === 'etiqueta' ? `/product-tag/${l.slug}/` : `/marca/${l.slug}/`;
    html = paginaCatalogo({ l, ruta, tipo: props.tipo, productos: prods, subcategorias: subcats, hermanas });
  } else if (props.tipo === 'sistema') {
    const cual = props.cual as string;
    const conf: Record<string, { t: string; d: string; c: string; slug: string }> = {
      carrito: { t: 'Carrito', d: 'Revisa los productos que has agregado antes de finalizar tu compra.', c: SIS.carrito(), slug: '/cart/' },
      checkout: { t: 'Finalizar compra', d: 'Completa tus datos de entrega. El pago es contra entrega.', c: SIS.checkout(), slug: '/finalizar-compra/' },
      miCuenta: { t: 'Mi cuenta', d: 'Acceso de clientes y del equipo de Ofitodo.', c: SIS.miCuenta(), slug: '/mi-cuenta/' },
      pedidoRecibido: { t: 'Pedido recibido', d: 'Hemos recibido tu pedido; te contactaremos para coordinar la entrega.', c: SIS.pedidoRecibido(), slug: '/pedido-recibido/' },
    };
    const k = conf[cual];
    html = paginaSistema(k.slug, k.t, k.d, k.c);
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
