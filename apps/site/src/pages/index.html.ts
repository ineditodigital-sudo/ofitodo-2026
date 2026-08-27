// PORTADA REDISEÑADA — HTML propio, semántico y ligero.
// Encabezado, pie y armazón propios (chrome.ts). Sin Elementor ni jQuery.

import type { APIRoute } from 'astro';
import { categorias, productos, imagenVariante } from '../lib/contenido.ts';
import { HERO, INTRO, PERSONALIZADO, SECTORES, PROCESO, CLIENTES, CATALOGOS, CIERRE } from '../lib/home-datos.ts';
import { documento, FLECHA, CHECK, WA } from '../lib/chrome.ts';


const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tarjetaCategoria(c: { nombre: string; ruta: string; imagen: string | null; conteo: number }): string {
  const img = imagenVariante(c.imagen, 600);
  return `<a class="tarjeta revelar" href="/categoria-producto/${c.ruta}/">
      <span class="tarjeta__img">${img ? `<img src="${esc(img)}" alt="${esc(c.nombre)}" loading="lazy" decoding="async" width="600" height="400">` : ''}</span>
      <span class="tarjeta__cuerpo">
        <h3>${esc(c.nombre)}</h3>
        <span class="tarjeta__meta">${c.conteo} producto${c.conteo === 1 ? '' : 's'}</span>
        <span class="tarjeta__ir">Ver catálogo ${FLECHA}</span>
      </span>
    </a>`;
}

export const GET: APIRoute = () => {
  const cats = categorias()
    .filter((c) => !c.parentSlug && c.conteo > 0 && c.imagen && c.tieneReferencia)
    .sort((a, b) => b.conteo - a.conteo)
    .slice(0, 8);
  const totalProductos = productos().length;

  const cuerpo = `
<main id="contenido">

  <section class="hero">
    <div class="hero__media">
      <img src="${esc(imagenVariante(HERO.imagen, 1600))}" alt="" fetchpriority="high" decoding="async" width="1536" height="838">
    </div>
    <div class="contenedor hero__inner">
      <span class="etiqueta">${esc(HERO.entrada)}</span>
      <h1>${esc(HERO.titulo)}</h1>
      <p>${esc(HERO.texto)}</p>
      <div class="hero__acciones">
        <a class="btn btn--wa" href="${esc(HERO.ctaPrimario.href)}" target="_blank" rel="noopener">${WA} ${esc(HERO.ctaPrimario.texto)}</a>
        <a class="btn btn--borde" href="${esc(HERO.ctaSecundario.href)}">${esc(HERO.ctaSecundario.texto)}</a>
      </div>
      <div class="hero__datos">
        <div class="hero__dato"><strong>${totalProductos}+</strong><span>Productos</span></div>
        <div class="hero__dato"><strong>7</strong><span>Sectores atendidos</span></div>
        <div class="hero__dato"><strong>Aguascalientes</strong><span>Fabricación propia</span></div>
      </div>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Catálogo</span>
        <h2>${esc(INTRO.titulo)}</h2>
        <p>${esc(INTRO.texto)}</p>
      </div>
      <div class="rejilla rejilla--4">
        ${cats.map(tarjetaCategoria).join('\n')}
      </div>
      <p style="text-align:center;margin-top:2.5rem">
        <a class="btn btn--primario" href="/productos/">Ver todos los productos ${FLECHA}</a>
      </p>
    </div>
  </section>

  <section class="seccion seccion--fondo">
    <div class="contenedor dos">
      <div class="revelar">
        <span class="etiqueta">A tu medida</span>
        <h2 style="font-size:var(--t-h2)">${esc(PERSONALIZADO.titulo)}</h2>
        <p style="margin-top:1rem;color:var(--suave)">${esc(PERSONALIZADO.texto)}</p>
        <ul class="lista-check">
          ${PERSONALIZADO.puntos.map((p) => `<li>${CHECK}<span>${esc(p)}</span></li>`).join('\n')}
        </ul>
        <a class="btn btn--primario" href="${esc(PERSONALIZADO.cta.href)}" target="_blank" rel="noopener">${esc(PERSONALIZADO.cta.texto)}</a>
      </div>
      <div class="dos__media revelar">
        <img src="${esc(imagenVariante(PERSONALIZADO.imagen, 800))}" alt="Mobiliario de oficina fabricado a medida por Ofitodo" loading="lazy" decoding="async" width="1536" height="838">
      </div>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Especialidades</span>
        <h2>Sectores que atendemos</h2>
        <p>Cada giro tiene necesidades distintas. Diseñamos mobiliario pensado para el uso real de cada espacio.</p>
      </div>
      <div class="rejilla rejilla--sectores">
        ${SECTORES.map((s) => `<a class="sector revelar" href="${esc(s.href)}">
          <img src="${esc(imagenVariante(s.img, 500))}" alt="Mobiliario para ${esc(s.nombre.toLowerCase())}" loading="lazy" decoding="async">
          <span>${esc(s.nombre)} ${FLECHA}</span>
        </a>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="seccion seccion--fondo">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Cómo trabajamos</span>
        <h2>Proceso de compra</h2>
        <p>De la primera llamada a la instalación, acompañamos cada etapa del proyecto.</p>
      </div>
      <div class="pasos">
        ${PROCESO.map((p) => `<article class="paso revelar">
          <span class="paso__n">${p.n}</span>
          <h3>${esc(p.t)}</h3>
          <p>${esc(p.d)}</p>
        </article>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Descargables</span>
        <h2>Explora nuestros catálogos</h2>
        <p>Consulta la gama completa de productos y soluciones en nuestros catálogos.</p>
      </div>
      <div class="rejilla rejilla--3">
        ${CATALOGOS.map((c) => `<a class="tarjeta revelar" href="${esc(c.href)}">
          <span class="tarjeta__img"><img src="${esc(imagenVariante(c.img, 600))}" alt="${esc(c.t)}" loading="lazy" decoding="async"></span>
          <span class="tarjeta__cuerpo">
            <h3>${esc(c.t)}</h3>
            <span class="tarjeta__meta">${esc(c.d)}</span>
            <span class="tarjeta__ir">Ver catálogo ${FLECHA}</span>
          </span>
        </a>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="seccion seccion--fondo">
    <div class="contenedor">
      <div class="cab-seccion revelar"><h2 style="font-size:clamp(1.5rem,1.2rem+1vw,2rem)">Clientes que confían en nosotros</h2></div>
      <div class="clientes revelar">
        ${CLIENTES.map((c) => `<img src="${esc(imagenVariante(c.src, 200))}" alt="${esc(c.alt)}" loading="lazy" decoding="async">`).join('\n')}
      </div>
    </div>
  </section>

  <section class="seccion cierre">
    <div class="contenedor">
      <h2 class="revelar">${esc(CIERRE.titulo)}</h2>
      <p class="revelar">${esc(CIERRE.texto)}</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="https://wa.me/524493419403" target="_blank" rel="noopener">${WA} Cotizar por WhatsApp</a>
        <a class="btn btn--claro" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>

</main>`;

  const html = documento({
    titulo: 'Mobiliario para Oficina en Aguascalientes | Ofitodo',
    descripcion: 'Fabricantes de mobiliario para oficina en Aguascalientes y todo México. Escritorios, sillas, estaciones de trabajo y mobiliario a medida para empresas.',
    ruta: '/', activo: '/', clase: 'ofitodo-home', cuerpo,
    ogImagen: 'https://ofitodo.com/wp-content/uploads/2026/01/Group-35-1.webp',
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Ofitodo',
      description: 'Fabricantes de mobiliario para oficina en Aguascalientes y todo México.',
      url: 'https://ofitodo.com/',
      image: 'https://ofitodo.com/wp-content/uploads/2025/12/logo-azul-3.webp',
      telephone: '+52 449 918 40 80',
      address: { '@type': 'PostalAddress', addressLocality: 'Aguascalientes', addressRegion: 'Aguascalientes', addressCountry: 'MX' },
    }),
  });

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
