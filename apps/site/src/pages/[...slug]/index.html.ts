// Generación estática de TODAS las URLs del sitio (paridad de URLs por construcción):
// congeladas (páginas/posts/otros 200 del inventario) + catálogo regenerado desde datos
// + páginas de sistema nuevas. Endpoint .html.ts = control byte a byte del HTML.
import type { APIRoute } from 'astro';
import { productos, categorias, etiquetas, marcas, congeladas, refHtml, hayRef, urlKey, urls200, overridesPagina, overridesGlobal } from '../../lib/contenido.ts';
import * as T from '../../lib/transformar.ts';
import * as SIS from '../../lib/sistema-paginas.ts';

type Ruta = { params: { slug: string | undefined }; props: Record<string, unknown> };

export function getStaticPaths(): Ruta[] {
  const rutas: Ruta[] = [];
  const cubiertas = new Set<string>();
  const add = (pathname: string, props: Record<string, unknown>) => {
    const slug = pathname.replace(/^\/|\/$/g, '');
    cubiertas.add(pathname.replace(/\/$/, '') || '/');
    rutas.push({ params: { slug: slug || undefined }, props });
  };

  const claveDe = (slug: string) => (slug === '/' ? 'home' : slug.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
  for (const c of congeladas()) add(c.slug, { tipo: 'congelada', htmlRef: c.htmlRef, seo: c.seo, key: claveDe(c.slug) });

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
    const f = `${urlKey(pathname)}.html`;
    if (hayRef(f)) add(pathname.endsWith('/') ? pathname : `${pathname}/`, { tipo: 'congelada', htmlRef: f });
  }
  return rutas;
}

const porSlugProducto = () => new Map(productos().map((p) => [p.slug, p]));

export const GET: APIRoute = ({ props }) => {
  let html = '';
  if (props.tipo === 'congelada') {
    html = T.congelada(refHtml(props.htmlRef as string), props.seo as { title?: string; description?: string | null } | undefined,
      { pagina: overridesPagina(props.key as string), global: overridesGlobal() });
  } else if (props.tipo === 'producto') {
    const p = porSlugProducto().get(props.slug as string)!;
    const ref = p.tieneReferencia ? refHtml(`producto__${p.slug}.html`) : refHtml('producto__silla-operativa-modelo-lituania-ofitodo.html');
    html = T.producto(ref, p);
  } else if (props.tipo === 'categoria' || props.tipo === 'etiqueta' || props.tipo === 'marca') {
    const col = props.tipo === 'categoria' ? categorias() : props.tipo === 'etiqueta' ? etiquetas() : marcas();
    const l = col.find((x) => x.slug === props.slug)!;
    const base = props.tipo === 'categoria' ? `categoria-producto__${(l.ruta ?? l.slug).replace(/\//g, '__')}` : props.tipo === 'etiqueta' ? `product-tag__${l.slug}` : `marca__${l.slug}`;
    const prods = productos().filter((p) =>
      props.tipo === 'categoria' ? p.categorias.includes(l.slug) : props.tipo === 'etiqueta' ? p.etiquetas.includes(l.slug) : p.marcas.includes(l.slug));
    const subcats = props.tipo === 'categoria' ? categorias().filter((c) => c.parentSlug === l.slug) : [];
    html = T.listado(refHtml(`${base}.html`), l, { productos: prods, subcategorias: subcats });
  } else if (props.tipo === 'sistema') {
    const donor = refHtml('contactanos.html');
    const cual = props.cual as string;
    const conf: Record<string, { t: string; c: string; slug: string }> = {
      carrito: { t: 'Carrito', c: SIS.carrito(), slug: '/cart/' },
      checkout: { t: 'Finalizar compra', c: SIS.checkout(), slug: '/finalizar-compra/' },
      miCuenta: { t: 'Mi cuenta', c: SIS.miCuenta(), slug: '/mi-cuenta/' },
      pedidoRecibido: { t: 'Pedido recibido', c: SIS.pedidoRecibido(), slug: '/pedido-recibido/' },
    };
    const k = conf[cual];
    html = T.sistema(donor, { titulo: k.t, tituloBarra: k.t, contenidoHtml: k.c, slug: k.slug });
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
