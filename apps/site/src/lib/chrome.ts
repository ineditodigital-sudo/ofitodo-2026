// Encabezado y pie propios: HTML limpio, sin Elementor ni jQuery.
// Resuelve el logo cortado (se sirve a su proporción real) y el menú móvil.
import { sitio, categorias } from './contenido.ts';

const LOGO = 'https://ofitodo.com/wp-content/uploads/2025/12/logo-azul-3.webp';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Ruta real de una categoría (algunas están anidadas: sillas vive bajo restaurantes)
function rutaCat(slug: string): string | null {
  const c = categorias().find((x) => x.slug === slug);
  return c && c.tieneReferencia ? `/categoria-producto/${c.ruta ?? c.slug}/` : null;
}
function sub(pares: [string, string][]): { t: string; h: string }[] {
  return pares.map(([t, slug]) => ({ t, h: rutaCat(slug) })).filter((x): x is { t: string; h: string } => !!x.h);
}

let _MENU: { t: string; h: string; sub?: { t: string; h: string }[] }[] | null = null;
export function menu(): { t: string; h: string; sub?: { t: string; h: string }[] }[] {
  if (_MENU) return _MENU;
  _MENU = [
    { t: 'Inicio', h: '/' },
    { t: 'Nosotros', h: '/nosotros/' },
    {
      t: 'Productos', h: '/productos/', sub: sub([
        ['Escritorios', 'escritorios'],
        ['Sillas y sillones de oficina', 'sillas'],
        ['Comedores y restaurantes', 'restaurantes'],
        ['Exhibidores', 'exhibidores'],
        ['Estaciones de trabajo', 'estaciones-de-trabajo'],
        ['Libreros y archiveros', 'libreros-y-archiveros'],
        ['Lockers y vestidores', 'lockers-y-vestidores'],
        ['Mesas de juntas', 'mesas-de-juntas'],
        ['Paneles acústicos', 'paneles-acusticos'],
        ['Salas de espera y recepción', 'recepcion'],
      ]),
    },
    { t: 'Tienda', h: '/tienda/', sub: sub([['Mobiliario', 'mobiliario'], ['MRO', 'mro']]) },
    {
      t: 'Sectores', h: '/sectores/', sub: [
        { t: 'Muebles para Oficina', h: '/muebles-para-oficina/' },
        { t: 'Muebles para Bancos', h: '/muebles-para-bancos/' },
        { t: 'Muebles para Escuelas', h: '/muebles-para-escuelas/' },
        { t: 'Muebles para Consultorios', h: '/muebles-para-consultorios/' },
        { t: 'Muebles para Hospital', h: '/muebles-para-hospital/' },
        { t: 'Muebles para Industria', h: '/muebles-para-industria/' },
        { t: 'Muebles para Restaurante', h: '/muebles-para-restaurante/' },
      ],
    },
    { t: 'Blog', h: '/blog/' },
  ];
  return _MENU;
}

const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
const ICO_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const ICO_CERRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CARET = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

export function encabezado(actual = '/'): string {
  const item = (m: ReturnType<typeof menu>[number]) => {
    const activo = m.h === actual ? ' aria-current="page"' : '';
    if (!m.sub) return `<li><a href="${m.h}"${activo}>${esc(m.t)}</a></li>`;
    return `<li class="tiene-sub">
      <a href="${m.h}"${activo}>${esc(m.t)} ${CARET}</a>
      <ul class="submenu">${m.sub.map((s) => `<li><a href="${s.h}">${esc(s.t)}</a></li>`).join('')}</ul>
    </li>`;
  };
  return `<a class="saltar" href="#contenido">Ir al contenido principal</a>
<header class="cab" id="cab">
  <div class="contenedor cab__inner">
    <a class="cab__logo" href="/" aria-label="Ofitodo, inicio">
      <img src="${LOGO}" alt="Ofitodo" width="170" height="35" fetchpriority="high" decoding="async">
    </a>
    <nav class="cab__nav" aria-label="Menú principal">
      <ul class="menu">${menu().map(item).join('')}</ul>
    </nav>
    <div class="cab__acciones">
      <form class="buscador" role="search" action="/tienda/" method="get">
        <label class="oculto" for="q">Buscar productos</label>
        <input id="q" name="s" type="search" placeholder="Buscar productos…" autocomplete="off">
        <button type="submit" aria-label="Buscar">${ICO_BUSCAR}</button>
      </form>
      <a class="btn btn--primario cab__cta" href="/contactanos/">Contacto</a>
      <button class="cab__hamburguesa" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-movil">${ICO_MENU}</button>
    </div>
  </div>
  <div class="movil" id="menu-movil" hidden>
    <div class="movil__cab">
      <img src="${LOGO}" alt="Ofitodo" width="140" height="29">
      <button class="movil__cerrar" type="button" aria-label="Cerrar menú">${ICO_CERRAR}</button>
    </div>
    <nav aria-label="Menú móvil">
      <ul class="movil__menu">
        ${menu().map((m) => m.sub
          ? `<li><details><summary>${esc(m.t)} ${CARET}</summary><ul>${m.sub.map((s) => `<li><a href="${s.h}">${esc(s.t)}</a></li>`).join('')}</ul></details></li>`
          : `<li><a href="${m.h}">${esc(m.t)}</a></li>`).join('')}
      </ul>
    </nav>
    <a class="btn btn--primario" href="/contactanos/">Contacto</a>
  </div>
</header>`;
}

const ICO_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICO_IZQ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ICO_DER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// Visor de imágenes a pantalla completa (se activa solo si la página tiene galería)
export function visor(): string {
  return `<dialog class="visor" id="visor" aria-label="Imagen ampliada">
  <div class="visor__caja">
    <img class="visor__img" id="visor-img" alt="" hidden>
    <button class="visor__btn visor__cerrar" type="button" data-visor="cerrar" aria-label="Cerrar">${ICO_X}</button>
    <button class="visor__btn visor__ant" type="button" data-visor="ant" aria-label="Imagen anterior">${ICO_IZQ}</button>
    <button class="visor__btn visor__sig" type="button" data-visor="sig" aria-label="Imagen siguiente">${ICO_DER}</button>
    <p class="visor__pos" id="visor-pos"></p>
  </div>
</dialog>`;
}

export function pie(): string {
  const s = sitio();
  const c = s.contacto ?? {};
  const r = s.redes ?? {};
  const redes: [string, string][] = [
    ['Facebook', r.facebook], ['Instagram', r.instagram], ['LinkedIn', r.linkedin], ['TikTok', r.tiktok],
  ].filter((x): x is [string, string] => Boolean(x[1]));
  const tel = (c.telefonos ?? []) as string[];
  return `<footer class="pie">
  <div class="contenedor pie__grid">
    <div class="pie__marca">
      <img src="${LOGO}" alt="Ofitodo" width="160" height="33" loading="lazy" style="filter:brightness(0) invert(1)">
      <p>Mobiliario para oficina de la más alta calidad en Aguascalientes y todo México.</p>
      ${redes.length ? `<ul class="pie__redes">${redes.map(([n, u]) =>
        `<li><a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${n}">${n[0]}</a></li>`).join('')}</ul>` : ''}
    </div>
    <div>
      <h3>Mapa del sitio</h3>
      <ul class="pie__lista">${menu().map((m) => `<li><a href="${m.h}">${esc(m.t)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h3>Productos</h3>
      <ul class="pie__lista">${(menu()[2].sub ?? []).slice(0, 6).map((x) => `<li><a href="${x.h}">${esc(x.t)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h3>Contacto</h3>
      <ul class="pie__lista pie__contacto">
        ${tel.map((t) => `<li><a href="tel:${t.replace(/\D/g, '')}">${esc(t)}</a></li>`).join('')}
        ${c.whatsapp ? `<li><a href="https://wa.me/${String(c.whatsapp).replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp ${esc(String(c.whatsapp))}</a></li>` : ''}
        ${c.correoVentas ? `<li><a href="mailto:${esc(String(c.correoVentas))}">${esc(String(c.correoVentas))}</a></li>` : ''}
        <li><a href="https://maps.app.goo.gl/KG5Y9yzXqoy7tn9e7" target="_blank" rel="noopener">Aguascalientes, México</a></li>
        <li><a href="/wp-content/uploads/2026/02/AVISO-DE-PRIVACIDAD-DE-COMERCIALIZADORA-OFITODO-1.pdf" target="_blank" rel="noopener">Aviso de privacidad</a></li>
      </ul>
    </div>
  </div>
  <div class="contenedor pie__legal"><p>© ${new Date().getFullYear()} Ofitodo. Todos los derechos reservados.</p></div>
</footer>
<a class="wa-flotante" href="https://wa.me/${String(c.whatsapp ?? '').replace(/\D/g, '')}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>
</a>`;
}

export const SCRIPT_CHROME = `
(function(){
  var cab=document.getElementById('cab'), ham=document.querySelector('.cab__hamburguesa'),
      mov=document.getElementById('menu-movil'), cerrar=document.querySelector('.movil__cerrar');
  function abrir(v){ mov.hidden=!v; document.body.style.overflow=v?'hidden':''; ham.setAttribute('aria-expanded',String(v)); }
  ham&&ham.addEventListener('click',function(){abrir(true)});
  cerrar&&cerrar.addEventListener('click',function(){abrir(false)});
  mov&&mov.addEventListener('click',function(e){ if(e.target.tagName==='A') abrir(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&mov&&!mov.hidden) abrir(false); });
  // El vídeo del hero solo se muestra cuando ya puede reproducirse
  var v=document.querySelector('.hero__video');
  if(v){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){ v.remove(); }
    else {
      var quitar=function(){ if(v&&v.parentNode) v.remove(); };
      v.addEventListener('canplay',function(){ v.classList.add('listo'); },{once:true});
      v.addEventListener('error',quitar,{once:true});
      var src=v.querySelector('source'); if(src) src.addEventListener('error',quitar,{once:true});
      var pr=v.play(); if(pr&&pr.catch) pr.catch(quitar);
      // Si a los 6 s no hay imagen decodificada (códec ausente, red lenta),
      // se retira y la foto de portada se queda: nunca un hueco negro.
      setTimeout(function(){ if(v&&v.parentNode&&v.readyState<2) quitar(); },6000);
    }
  }
  // --- Visor de imágenes ---------------------------------------------------
  (function(){
    var dlg=document.getElementById('visor'); if(!dlg||!dlg.showModal) return;
    var img=document.getElementById('visor-img'), pos=document.getElementById('visor-pos');
    // Fuentes de imágenes ampliables: galería de producto y galerías de artículo
    var lista=[], indice=0;
    function recoger(){
      var minis=[].slice.call(document.querySelectorAll('.galeria__mini'));
      if(minis.length) return minis.map(function(b){ return {src:b.dataset.grande, alt:b.querySelector('img')?b.querySelector('img').alt:''}; });
      var principal=document.getElementById('gal-principal');
      if(principal) return [{src:principal.src, alt:principal.alt}];
      return [];
    }
    function abrir(l,i){ lista=l; indice=i; pintar(); if(!dlg.open) dlg.showModal(); }
    function pintar(){
      if(!lista.length) return;
      indice=(indice+lista.length)%lista.length;
      img.src=lista[indice].src; img.alt=lista[indice].alt||''; img.hidden=false;
      pos.textContent=lista.length>1? (indice+1)+' / '+lista.length : '';
      var multi=lista.length>1;
      dlg.querySelector('.visor__ant').hidden=!multi;
      dlg.querySelector('.visor__sig').hidden=!multi;
    }
    // Ficha de producto
    var marco=document.querySelector('.galeria__marco');
    if(marco) marco.addEventListener('click',function(){
      var l=recoger(); if(!l.length) return;
      var actual=document.getElementById('gal-principal');
      var i=Math.max(0,l.findIndex(function(x){return x.src===(actual&&actual.src);}));
      abrir(l,i);
    });
    // Galerías dentro de artículos
    document.querySelectorAll('.galeria-nota').forEach(function(g){
      var fotos=[].slice.call(g.querySelectorAll('img')).map(function(im){ return {src:im.currentSrc||im.src, alt:im.alt}; });
      g.querySelectorAll('img').forEach(function(im,i){
        im.style.cursor='zoom-in';
        im.addEventListener('click',function(){ abrir(fotos,i); });
      });
    });
    dlg.addEventListener('click',function(e){
      var b=e.target.closest('[data-visor]');
      if(b){ var a=b.dataset.visor; if(a==='cerrar') dlg.close(); else { indice+=(a==='sig'?1:-1); pintar(); } return; }
      if(e.target===dlg||e.target.classList.contains('visor__caja')) dlg.close();
    });
    document.addEventListener('keydown',function(e){
      if(!dlg.open) return;
      if(e.key==='ArrowRight'){ indice++; pintar(); }
      else if(e.key==='ArrowLeft'){ indice--; pintar(); }
    });
  })();

  var y=0; addEventListener('scroll',function(){ var s=scrollY; if(cab){ cab.classList.toggle('cab--fija', s>10); } y=s; },{passive:true});
})();`;

/* --- Armazón común de documento ------------------------------------------
 * Todas las páginas rediseñadas comparten cabeza, fuentes, CSS y scripts.   */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ASSETS: Record<string, string> = (() => {
  try { return JSON.parse(readFileSync(path.resolve(process.cwd(), 'src', 'generado', 'assets.json'), 'utf8')); }
  catch { return {}; }
})();
export const CSS = ASSETS.ofitodo ?? '/assets/ofitodo.css';
export const CSS_PAGINAS = ASSETS.paginas ?? '/assets/paginas.css';

export const FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
export const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
export const WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/></svg>';

export interface Doc {
  titulo: string;
  descripcion: string;
  ruta: string;                 // canónica, con barras: '/nosotros/'
  cuerpo: string;
  activo?: string;              // ruta del menú a marcar
  ogImagen?: string | null;
  clase?: string;
  tipoOg?: string;
  scriptExtra?: string;
  jsonLd?: string;
  noIndex?: boolean;
}

export function documento(d: Doc): string {
  const url = `https://ofitodo.com${d.ruta}`;
  const og = d.ogImagen || 'https://ofitodo.com/wp-content/uploads/2026/01/Group-35-1.webp';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.titulo)}</title>
<meta name="description" content="${esc(d.descripcion)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${d.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta property="og:locale" content="es_ES">
<meta property="og:type" content="${d.tipoOg ?? 'website'}">
<meta property="og:title" content="${esc(d.titulo)}">
<meta property="og:description" content="${esc(d.descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="Ofitodo">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="https://ofitodo.com/wp-content/uploads/2023/05/cropped-Ofitodo_logoPerfil-32x32.png" sizes="32x32">
<link rel="apple-touch-icon" href="https://ofitodo.com/wp-content/uploads/2023/05/cropped-Ofitodo_logoPerfil-180x180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${CSS}">
<link rel="stylesheet" href="${CSS_PAGINAS}">
${d.jsonLd ? `<script type="application/ld+json">${d.jsonLd}</script>` : ''}
</head>
<body class="ofitodo ${d.clase ?? ''}">
${encabezado(d.activo ?? d.ruta)}
${d.cuerpo}
${visor()}
${pie()}
<script>
${SCRIPT_CHROME}
${d.scriptExtra ?? ''}
</script>
</body>
</html>`;
}

// Migas de pan accesibles + datos estructurados
export function migas(items: { t: string; h?: string }[]): string {
  return `<nav class="migas" aria-label="Ruta de navegación"><div class="contenedor"><ol>
    <li><a href="/">Inicio</a></li>
    ${items.map((x, i) => `<li>${x.h && i < items.length - 1 ? `<a href="${x.h}">${esc(x.t)}</a>` : `<span aria-current="page">${esc(x.t)}</span>`}</li>`).join('')}
  </ol></div></nav>`;
}
