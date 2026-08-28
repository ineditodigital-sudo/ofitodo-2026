// Blog: listado y artículo. El cuerpo procede de content/blog-cuerpos.json,
// extraído del original con salvaguarda de cero pérdida (scripts/extraer-blog.mjs).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { imagenVariante } from './contenido.ts';
import { documento, migas, FLECHA, WA } from './chrome.ts';

const RAIZ = path.resolve(process.cwd(), '..', '..');
const leer = (f: string) => (existsSync(path.join(RAIZ, 'content', f)) ? JSON.parse(readFileSync(path.join(RAIZ, 'content', f), 'utf8')) : null);

export interface Entrada {
  slug: string; titulo: string; fecha: string | null; modificado: string | null;
  imagen: string | null; resumen: string; seo: { title: string; description: string | null };
  htmlRef: string; conserva: number; imagenes: number; reconstruible: boolean;
}

export const entradas = (): Entrada[] => leer('blog.json') ?? [];
export interface Cuerpo { html: string; css: string; propio: boolean }
export const cuerpos = (): Record<string, Cuerpo> => leer('blog-cuerpos.json') ?? {};

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WHATSAPP = '5214493419403';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLarga(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function tarjetaEntrada(e: Entrada): string {
  const img = imagenVariante(e.imagen, 600);
  return `<a class="nota revelar" href="${esc(e.slug)}">
    <span class="nota__img">${img
      ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="600" height="400">`
      : ''}</span>
    <span class="nota__cuerpo">
      ${e.fecha ? `<time class="nota__fecha" datetime="${esc(e.fecha)}">${fechaLarga(e.fecha)}</time>` : ''}
      <h3>${esc(e.titulo)}</h3>
      ${e.resumen ? `<p>${esc(e.resumen)}</p>` : ''}
      <span class="nota__ir">Leer más ${FLECHA}</span>
    </span>
  </a>`;
}

/* --- Listado -------------------------------------------------------------- */
export function paginaBlog(): string {
  const lista = entradas();
  const cuerpo = `
${migas([{ t: 'Blog' }])}
<main id="contenido">
  <section class="franja">
    <div class="contenedor franja__inner">
      <span class="etiqueta">Blog</span>
      <h1>Proyectos e ideas para tu espacio</h1>
      <p>Casos reales de mobiliario que hemos fabricado e instalado, y guías para elegir mejor.</p>
      <p class="franja__conteo">${lista.length} publicacion${lista.length === 1 ? '' : 'es'}</p>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      ${lista.length
        ? `<div class="rejilla rejilla--notas">${lista.map(tarjetaEntrada).join('')}</div>`
        : '<p class="vacio">Pronto publicaremos nuevos proyectos.</p>'}
    </div>
  </section>

  <section class="cierre">
    <div class="contenedor">
      <h2 class="revelar">¿Tienes un proyecto en mente?</h2>
      <p class="revelar">Cuéntanos qué espacio quieres equipar y preparamos una propuesta a tu medida.</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">${WA} Hablar con un asesor</a>
        <a class="btn btn--borde" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>
</main>`;

  return documento({
    titulo: 'Blog | Ofitodo',
    descripcion: 'Proyectos de mobiliario para oficina realizados por Ofitodo en Aguascalientes y todo México, además de guías para equipar tu espacio.',
    ruta: '/blog/', activo: '/blog/', clase: 'pag-blog', cuerpo,
    ogImagen: lista[0]?.imagen ?? null,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog de Ofitodo',
      url: 'https://ofitodo.com/blog/',
      blogPost: lista.slice(0, 20).map((e) => ({
        '@type': 'BlogPosting', headline: e.titulo,
        url: `https://ofitodo.com${e.slug}`, datePublished: e.fecha ?? undefined,
        image: e.imagen ?? undefined,
      })),
    }),
  });
}

/* --- Artículo ------------------------------------------------------------- */
export function paginaEntrada(e: Entrada, c: Cuerpo): string {
  const lista = entradas();
  const otras = lista.filter((x) => x.slug !== e.slug).slice(0, 3);
  const portada = imagenVariante(e.imagen, 1600);

  // Los artículos con maquetación propia se muestran tal cual los diseñó su
  // autor (su CSS va acotado al contenedor). Los demás los viste el sitio.
  const articulo = c.propio
    ? `<article class="articulo-propio">
        ${c.css ? `<style>${c.css}</style>` : ''}
        ${c.html}
      </article>`
    : `<article class="nota-completa">
        <header class="nota-completa__cab">
          <div class="contenedor contenedor--texto">
            <span class="etiqueta">Blog</span>
            <h1>${esc(e.titulo)}</h1>
            ${e.fecha ? `<time class="nota__fecha" datetime="${esc(e.fecha)}">${fechaLarga(e.fecha)}</time>` : ''}
          </div>
        </header>
        ${portada ? `<div class="contenedor nota-completa__portada">
          <img src="${esc(portada)}" alt="" fetchpriority="high" decoding="async">
        </div>` : ''}
        <div class="seccion">
          <div class="contenedor contenedor--texto">
            <div class="prosa">${c.html}</div>
          </div>
        </div>
      </article>`;

  const cuerpo = `
${migas([{ t: 'Blog', h: '/blog/' }, { t: e.titulo }])}
<main id="contenido">
  ${articulo}

  ${otras.length ? `<section class="seccion seccion--alt">
    <div class="contenedor">
      <h2 class="titulo-menor">Más publicaciones</h2>
      <div class="rejilla rejilla--notas">${otras.map(tarjetaEntrada).join('')}</div>
    </div>
  </section>` : ''}

  <section class="cierre">
    <div class="contenedor">
      <h2 class="revelar">¿Quieres algo así para tu espacio?</h2>
      <p class="revelar">Somos fabricantes. Cuéntanos tu proyecto y preparamos una propuesta sin compromiso.</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, vi la publicación "${e.titulo}" y me interesa algo similar.`)}" target="_blank" rel="noopener">${WA} Cotizar por WhatsApp</a>
        <a class="btn btn--borde" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>
</main>`;

  return documento({
    titulo: e.seo?.title || `${e.titulo} | Ofitodo`,
    descripcion: e.seo?.description || e.resumen || `${e.titulo}. Proyecto de mobiliario para oficina realizado por Ofitodo.`,
    ruta: e.slug, activo: '/blog/', ogImagen: e.imagen, tipoOg: 'article',
    clase: c.propio ? 'pag-nota pag-nota--propia' : 'pag-nota', cuerpo,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: e.titulo, url: `https://ofitodo.com${e.slug}`,
      datePublished: e.fecha ?? undefined, dateModified: e.modificado ?? e.fecha ?? undefined,
      image: e.imagen ?? undefined,
      publisher: { '@type': 'Organization', name: 'Ofitodo', url: 'https://ofitodo.com/' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://ofitodo.com${e.slug}` },
    }),
  });
}

/* --- Archivo (tipo de contenido o autor) ---------------------------------- */
export function paginaArchivo(ruta: string, titulo: string, descripcion: string, filtro: (slug: string) => boolean): string {
  const lista = entradas().filter((e) => filtro(e.slug));
  const cuerpo = `
${migas([{ t: 'Blog', h: '/blog/' }, { t: titulo }])}
<main id="contenido">
  <section class="franja">
    <div class="contenedor franja__inner">
      <span class="etiqueta">Blog</span>
      <h1>${esc(titulo)}</h1>
      <p>${esc(descripcion)}</p>
      <p class="franja__conteo">${lista.length} publicacion${lista.length === 1 ? '' : 'es'}</p>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      ${lista.length
        ? `<div class="rejilla rejilla--notas">${lista.map(tarjetaEntrada).join('')}</div>`
        : '<p class="vacio">Todavía no hay publicaciones en esta sección.</p>'}
    </div>
  </section>

  <section class="seccion seccion--ajustada">
    <div class="contenedor"><a class="btn btn--linea" href="/blog/">Ver todo el blog ${FLECHA}</a></div>
  </section>
</main>`;

  return documento({
    titulo: `${titulo} | Ofitodo`,
    descripcion, ruta, activo: '/blog/', clase: 'pag-archivo', cuerpo,
    ogImagen: lista[0]?.imagen ?? null,
  });
}
