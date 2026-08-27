// PORTADA REDISEÑADA — HTML propio, semántico y ligero.
// Conserva el encabezado y el pie reales del sitio (para no perder menú, buscador,
// WhatsApp ni analítica) y sustituye TODO el cuerpo por un diseño nuevo.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { categorias, productos, imagenVariante } from '../lib/contenido.ts';
import { HERO, INTRO, PERSONALIZADO, SECTORES, PROCESO, CLIENTES, CATALOGOS, CIERRE } from '../lib/home-datos.ts';
import { encabezado, pie, SCRIPT_CHROME } from '../lib/chrome.ts';

const require = createRequire(path.resolve(process.cwd(), '..', '..', 'scripts', '.deps', 'node_modules', 'cheerio', 'index.js'));
const { load } = require('cheerio');

const CSS_HOME = (() => {
  try { return JSON.parse(readFileSync(path.resolve(process.cwd(), 'src', 'generado', 'assets.json'), 'utf8')).ofitodo ?? '/assets/ofitodo.css'; }
  catch { return '/assets/ofitodo.css'; }
})();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>';

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

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mobiliario para Oficina en Aguascalientes | Ofitodo</title>
<meta name="description" content="Fabricantes de mobiliario para oficina en Aguascalientes y todo México. Escritorios, sillas, estaciones de trabajo y mobiliario a medida para empresas.">
<link rel="canonical" href="https://ofitodo.com/">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:locale" content="es_ES">
<meta property="og:type" content="website">
<meta property="og:title" content="Mobiliario para Oficina en Aguascalientes | Ofitodo">
<meta property="og:description" content="Fabricantes de mobiliario para oficina en Aguascalientes y todo México.">
<meta property="og:url" content="https://ofitodo.com/">
<meta property="og:site_name" content="Ofitodo">
<meta property="og:image" content="https://ofitodo.com/wp-content/uploads/2026/01/Group-35-1.webp">
<link rel="icon" href="https://ofitodo.com/wp-content/uploads/2023/05/cropped-Ofitodo_logoPerfil-32x32.png" sizes="32x32">
<link rel="apple-touch-icon" href="https://ofitodo.com/wp-content/uploads/2023/05/cropped-Ofitodo_logoPerfil-180x180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${CSS_HOME}">
</head>
<body class="ofitodo-home">
${encabezado("/")}
${cuerpo}
${pie()}
<script>
${SCRIPT_CHROME}
// Aparición progresiva al hacer scroll (nativo, sin librerías)
document.addEventListener('DOMContentLoaded', function () {
  var els = document.querySelectorAll('.revelar');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (e) { e.classList.add('visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e, i) {
      if (e.isIntersecting) { setTimeout(function () { e.target.classList.add('visible'); }, i * 70); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .06 });
  els.forEach(function (e) { io.observe(e); });
});
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
