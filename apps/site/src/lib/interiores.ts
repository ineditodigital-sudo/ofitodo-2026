// Páginas interiores rediseñadas: Nosotros, Productos, Sectores y Contacto.
// Todo el texto procede de interiores-datos.ts (extraído del sitio real).
import { imagenVariante, categorias, productos, sitio, type Listado } from './contenido.ts';
import { documento, migas, FLECHA, WA, CHECK } from './chrome.ts';
import { NOSOTROS, SECTORES_PAG, PRODUCTOS_PAG, CONTACTO_PAG } from './interiores-datos.ts';
import { SECTORES } from './home-datos.ts';
import { SECTORES_DATOS, POR_QUE, CIERRE_SECTOR, type Sector } from './sectores-datos.ts';
import { tarjetaProducto } from './plantillas.ts';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WHATSAPP = '5214493419403';
const wa = (t: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t)}`;

/* Franja superior común a todas las interiores */
function franja(o: { entrada: string; titulo: string; texto?: string; imagen?: string | null; extra?: string }): string {
  const img = imagenVariante(o.imagen, 1600);
  return `<section class="franja${img ? ' franja--foto' : ''}">
    ${img ? `<div class="franja__media"><img src="${esc(img)}" alt="" fetchpriority="high" decoding="async"></div>` : ''}
    <div class="contenedor franja__inner">
      <span class="etiqueta">${esc(o.entrada)}</span>
      <h1>${esc(o.titulo)}</h1>
      ${o.texto ? `<p>${esc(o.texto)}</p>` : ''}
      ${o.extra ?? ''}
    </div>
  </section>`;
}

function cierre(o: { titulo: string; texto: string; cta?: string; mensaje: string }): string {
  return `<section class="cierre">
    <div class="contenedor">
      <h2 class="revelar">${esc(o.titulo)}</h2>
      <p class="revelar">${esc(o.texto)}</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="${wa(o.mensaje)}" target="_blank" rel="noopener">${WA} ${esc(o.cta ?? 'Cotizar por WhatsApp')}</a>
        <a class="btn btn--borde" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>`;
}

/* --- Nosotros ------------------------------------------------------------- */
export function paginaNosotros(): string {
  const n = NOSOTROS;
  const cuerpo = `
${migas([{ t: 'Nosotros' }])}
<main id="contenido">
  ${franja({ entrada: n.entrada, titulo: n.titulo, imagen: n.imagen })}

  <section class="seccion">
    <div class="contenedor contenedor--texto">
      <h2 class="titulo-menor revelar">${esc(n.quienes.titulo)}</h2>
      <div class="prosa revelar">${n.quienes.parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    </div>
  </section>

  <section class="seccion seccion--alt">
    <div class="contenedor">
      <div class="rejilla rejilla--dos">
        ${n.proposito.map((p) => `<article class="panel revelar">
          <h2>${esc(p.titulo)}</h2>
          <p>${esc(p.texto)}</p>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Lo que nos guía</span>
        <h2>Nuestros valores</h2>
      </div>
      <div class="rejilla rejilla--cuatro">
        ${n.valores.map((v, i) => `<article class="paso revelar">
          <span class="paso__n">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(v.titulo)}</h3>
          <p>${esc(v.texto)}</p>
        </article>`).join('')}
      </div>
    </div>
  </section>

  ${cierre({ ...n.cierre, mensaje: 'Hola, me gustaría conocer más sobre Ofitodo.' })}
</main>`;

  return documento({
    titulo: 'Nosotros | Ofitodo',
    descripcion: 'Ofitodo, especialistas en mobiliario para oficina en Aguascalientes. Calidad, diseño y soluciones funcionales para empresas de todo México.',
    ruta: '/nosotros/', activo: '/nosotros/', ogImagen: n.imagen, clase: 'pag-nosotros', cuerpo,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Nosotros',
      url: 'https://ofitodo.com/nosotros/',
      mainEntity: {
        '@type': 'Organization', name: 'Ofitodo',
        description: n.quienes.parrafos[0], url: 'https://ofitodo.com/',
        address: { '@type': 'PostalAddress', addressLocality: 'Aguascalientes', addressCountry: 'MX' },
      },
    }),
  });
}

/* --- Productos (concentrador de categorías) ------------------------------- */
export function paginaProductos(): string {
  const p = PRODUCTOS_PAG;
  const cats = categorias()
    .filter((c) => !c.parentSlug && c.conteo > 0 && c.tieneReferencia)
    .sort((a, b) => b.conteo - a.conteo);
  const total = productos().length;

  const tarjeta = (c: Listado) => {
    const img = imagenVariante(c.imagen, 600);
    return `<a class="tarjeta revelar" href="/categoria-producto/${c.ruta ?? c.slug}/">
      <span class="tarjeta__img">${img ? `<img src="${esc(img)}" alt="${esc(c.nombre)}" loading="lazy" decoding="async" width="600" height="400">` : ''}</span>
      <span class="tarjeta__cuerpo">
        <h3>${esc(c.nombre)}</h3>
        <span class="tarjeta__meta">${c.conteo} producto${c.conteo === 1 ? '' : 's'}</span>
        <span class="tarjeta__ir">Ver catálogo ${FLECHA}</span>
      </span>
    </a>`;
  };

  const cuerpo = `
${migas([{ t: 'Productos' }])}
<main id="contenido">
  ${franja({
    entrada: p.entrada, titulo: p.titulo, texto: p.texto, imagen: p.imagen,
    extra: `<p class="franja__conteo">${total} productos en ${cats.length} categorías</p>`,
  })}

  <section class="seccion">
    <div class="contenedor">
      <div class="rejilla rejilla--tres">${cats.map(tarjeta).join('')}</div>
    </div>
  </section>

  ${cierre({ ...p.cierre, cta: 'Hablar con un asesor', mensaje: 'Hola, necesito asesoría para elegir mobiliario de oficina.' })}
</main>`;

  return documento({
    titulo: 'Productos | Ofitodo',
    descripcion: p.texto,
    ruta: '/productos/', activo: '/productos/', ogImagen: p.imagen, clase: 'pag-productos', cuerpo,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Productos',
      url: 'https://ofitodo.com/productos/',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: cats.length,
        itemListElement: cats.map((c, i) => ({
          '@type': 'ListItem', position: i + 1, name: c.nombre,
          url: `https://ofitodo.com/categoria-producto/${c.ruta ?? c.slug}/`,
        })),
      },
    }),
  });
}

/* --- Sectores ------------------------------------------------------------- */
export function paginaSectores(): string {
  const s = SECTORES_PAG;
  const cuerpo = `
${migas([{ t: 'Sectores' }])}
<main id="contenido">
  ${franja({ entrada: s.entrada, titulo: s.titulo, texto: s.texto, imagen: s.imagen })}

  <section class="seccion">
    <div class="contenedor">
      <div class="rejilla rejilla--sectores">
        ${SECTORES.map((x) => `<a class="sector revelar" href="${esc(x.href)}">
          <img src="${esc(imagenVariante(x.img, 768))}" alt="" loading="lazy" decoding="async" width="768" height="576">
          <span class="sector__nombre">${esc(x.nombre)}</span>
        </a>`).join('')}
      </div>
    </div>
  </section>

  ${cierre({ ...s.cierre, mensaje: 'Hola, quisiera hablar sobre mobiliario para mi sector.' })}
</main>`;

  return documento({
    titulo: 'Sectores | Ofitodo',
    descripcion: `${s.texto} Oficinas, bancos, escuelas, consultorios, hospitales, industria y restaurantes.`,
    ruta: '/sectores/', activo: '/sectores/', ogImagen: s.imagen, clase: 'pag-sectores', cuerpo,
  });
}

/* --- Contacto ------------------------------------------------------------- */
export function paginaContacto(): string {
  const c = CONTACTO_PAG;
  const s = sitio();
  const tel: string[] = s.contacto?.telefonos ?? [];
  const whats = String(s.contacto?.whatsapp ?? '').replace(/\D/g, '');
  const correo = String(s.contacto?.correoVentas ?? '');

  const cuerpo = `
${migas([{ t: 'Contáctanos' }])}
<main id="contenido">
  ${franja({ entrada: c.entrada, titulo: c.titulo, texto: c.texto, imagen: c.imagen })}

  <section class="seccion">
    <div class="contenedor contacto__grid">

      <div class="contacto__datos revelar">
        <h2 class="titulo-menor">Habla con nosotros</h2>
        <ul class="contacto__lista">
          ${tel.length ? `<li>
            <span class="contacto__et">Teléfono${tel.length > 1 ? 's' : ''}</span>
            ${tel.map((t) => `<a href="tel:${t.replace(/\D/g, '')}">${esc(t)}</a>`).join('')}
          </li>` : ''}
          ${whats ? `<li>
            <span class="contacto__et">WhatsApp</span>
            <a href="https://wa.me/${whats}" target="_blank" rel="noopener">${esc(s.contacto.whatsapp)}</a>
          </li>` : ''}
          ${correo ? `<li>
            <span class="contacto__et">Correo</span>
            <a href="mailto:${esc(correo)}">${esc(correo)}</a>
          </li>` : ''}
          <li>
            <span class="contacto__et">Dónde estamos</span>
            <a href="${esc(c.mapa)}" target="_blank" rel="noopener">${esc(c.direccion)}</a>
          </li>
        </ul>

        <ul class="ficha__garantias">
          <li>${CHECK} Fabricación propia</li>
          <li>${CHECK} Envío a todo México</li>
          <li>${CHECK} Pago contra entrega</li>
        </ul>

        <a class="btn btn--wa" href="${wa(String(s.contacto?.whatsappMensaje ?? 'Hola, me gustaría solicitar más información.'))}" target="_blank" rel="noopener">${WA} Escribir por WhatsApp</a>
      </div>

      <form class="cotiza revelar" data-form="contacto" novalidate>
        <h2 class="titulo-menor">Envíanos un mensaje</h2>
        <p class="cotiza__intro">Te respondemos el mismo día hábil.</p>
        <div class="cotiza__campos">
          <label>Nombre<input type="text" name="nombre" required autocomplete="name" placeholder="Tu nombre"></label>
          <label>Correo<input type="email" name="correo" required autocomplete="email" placeholder="tucorreo@empresa.com"></label>
          <label>Teléfono<input type="tel" name="telefono" autocomplete="tel" placeholder="(449) 000 0000"></label>
          <label>Empresa<input type="text" name="empresa" autocomplete="organization" placeholder="Opcional"></label>
          <label class="cotiza__ancho">Mensaje<textarea name="mensaje" rows="4" required placeholder="Cuéntanos qué necesitas para tu espacio"></textarea></label>
        </div>
        <div class="cotiza__pie">
          <button class="btn btn--primario" type="submit">Enviar mensaje</button>
          <p class="cotiza__aviso" role="status"></p>
        </div>
      </form>
    </div>
  </section>
</main>`;

  return documento({
    titulo: 'Contáctanos | Ofitodo',
    descripcion: c.texto,
    ruta: '/contactanos/', activo: '/contactanos/', ogImagen: c.imagen, clase: 'pag-contacto', cuerpo,
    scriptExtra: `
(function(){
  var f=document.querySelector('form[data-form="contacto"]');
  if(!f) return;
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var aviso=f.querySelector('.cotiza__aviso'), btn=f.querySelector('button[type=submit]');
    var d={}; new FormData(f).forEach(function(v,k){ d[k]=v; });
    if(!d.nombre||!d.correo||!d.mensaje){ aviso.className='cotiza__aviso cotiza__aviso--error';
      aviso.textContent='Completa tu nombre, correo y mensaje, por favor.'; return; }
    btn.disabled=true; aviso.className='cotiza__aviso'; aviso.textContent='Enviando…';
    fetch('/api/formularios',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({formulario:'contacto',pagina:location.pathname,datos:d})})
      .then(function(r){ if(!r.ok) throw 0; f.reset();
        aviso.className='cotiza__aviso cotiza__aviso--ok';
        aviso.textContent='Listo, recibimos tu mensaje. Te contactamos muy pronto.'; })
      .catch(function(){ aviso.className='cotiza__aviso cotiza__aviso--error';
        aviso.textContent='No pudimos enviarlo. Escríbenos por WhatsApp y te atendemos de inmediato.'; })
      .finally(function(){ btn.disabled=false; });
  });
})();`,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ContactPage',
      url: 'https://ofitodo.com/contactanos/',
      mainEntity: {
        '@type': 'Organization', name: 'Ofitodo', url: 'https://ofitodo.com/',
        email: correo || undefined,
        telephone: tel.map((t) => '+52' + t.replace(/\D/g, '')),
        address: { '@type': 'PostalAddress', addressLocality: 'Aguascalientes', addressCountry: 'MX' },
      },
    }),
  });
}

/* --- Página de sector ----------------------------------------------------- */
export function paginaSector(sec: Sector): string {
  const todos = productos();
  // Muestra repartida entre las categorías del sector (por turnos), para que
  // no se llene toda la rejilla con productos de una sola de ellas.
  const porCategoria = sec.categorias.map((c) => todos.filter((p) => p.imagen && p.categorias.includes(c)));
  const vistos = new Set<string>();
  const destacados: typeof todos = [];
  for (let vuelta = 0; destacados.length < 8 && vuelta < 40; vuelta++) {
    let agregado = false;
    for (const grupo of porCategoria) {
      const p = grupo[vuelta];
      if (!p || vistos.has(p.slug)) continue;
      vistos.add(p.slug); destacados.push(p); agregado = true;
      if (destacados.length >= 8) break;
    }
    if (!agregado && porCategoria.every((g) => vuelta >= g.length)) break;
  }
  const cats = categorias().filter((c) => sec.categorias.includes(c.slug) && c.conteo > 0 && c.tieneReferencia);

  const cuerpo = `
${migas([{ t: 'Sectores', h: '/sectores/' }, { t: sec.nombre }])}
<main id="contenido">
  ${franja({ entrada: sec.entrada, titulo: sec.nombre, texto: sec.resumen ?? undefined, imagen: sec.imagen })}

  <section class="seccion">
    <div class="contenedor contenedor--texto">
      <h2 class="titulo-menor revelar">${esc(sec.introTitulo)}</h2>
      <div class="prosa revelar"><p>${esc(sec.intro)}</p></div>
    </div>
  </section>

  ${cats.length ? `<section class="seccion seccion--ajustada">
    <div class="contenedor">
      <h2 class="titulo-menor">Categorías para este sector</h2>
      <ul class="fichas">
        ${cats.map((c) => `<li><a href="/categoria-producto/${c.ruta ?? c.slug}/">${esc(c.nombre)} <b>${c.conteo}</b></a></li>`).join('')}
      </ul>
    </div>
  </section>` : ''}

  ${destacados.length ? `<section class="seccion">
    <div class="contenedor">
      <h2 class="titulo-menor">Productos relacionados</h2>
      <div class="rejilla rejilla--prod">${destacados.map(tarjetaProducto).join('')}</div>
    </div>
  </section>` : ''}

  <section class="seccion seccion--alt">
    <div class="contenedor">
      <div class="cab-seccion revelar">
        <span class="etiqueta">Por qué nosotros</span>
        <h2>${esc(POR_QUE.titulo)}</h2>
      </div>
      <div class="rejilla rejilla--cuatro">
        ${POR_QUE.puntos.map((x, i) => `<article class="paso revelar">
          <span class="paso__n">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(x.titulo)}</h3>
          <p>${esc(x.texto)}</p>
        </article>`).join('')}
      </div>
    </div>
  </section>

  ${cierre({ ...CIERRE_SECTOR, mensaje: `Hola, me interesa mobiliario para ${sec.nombre.toLowerCase().replace('muebles para ', '')}.` })}
</main>`;

  return documento({
    titulo: `${sec.nombre} | Ofitodo`,
    descripcion: sec.resumen ?? sec.intro.slice(0, 155),
    ruta: `/${sec.slug}/`, activo: '/sectores/', ogImagen: sec.imagen,
    clase: 'pag-sector', cuerpo,
  });
}

export const INTERIORES: Record<string, () => string> = {
  '/nosotros/': paginaNosotros,
  '/productos/': paginaProductos,
  '/sectores/': paginaSectores,
  '/contactanos/': paginaContacto,
  ...Object.fromEntries(SECTORES_DATOS.map((x) => [`/${x.slug}/`, () => paginaSector(x)])),
};


/* --- Página de contenido simple (legales y páginas informativas) ---------- */
export function paginaContenido(ruta: string, d: { titulo: string; seo: { title: string; description: string | null }; html: string }): string {
  const cuerpo = `
${migas([{ t: d.titulo }])}
<main id="contenido">
  <section class="franja">
    <div class="contenedor franja__inner">
      <span class="etiqueta">Ofitodo</span>
      <h1>${esc(d.titulo)}</h1>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor contenedor--texto">
      <div class="prosa">${d.html}</div>
    </div>
  </section>
</main>`;

  return documento({
    titulo: d.seo?.title || `${d.titulo} | Ofitodo`,
    descripcion: d.seo?.description || `${d.titulo} de Comercializadora Ofitodo.`,
    ruta, clase: 'pag-contenido', cuerpo,
  });
}

/* --- Tienda: catálogo completo ------------------------------------------- */
export function paginaTienda(ruta = '/tienda/'): string {
  const todos = productos().filter((p) => p.imagen && !p.categorias.includes('uncategorized'));
  const cats = categorias()
    .filter((c) => !c.parentSlug && c.conteo > 0 && c.tieneReferencia)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const cuerpo = `
${migas([{ t: 'Tienda' }])}
<main id="contenido">
  <section class="franja">
    <div class="contenedor franja__inner">
      <span class="etiqueta">Tienda</span>
      <h1>Todo nuestro catálogo</h1>
      <p>Mobiliario para oficina fabricado en Aguascalientes, con envío a todo México y pago contra entrega.</p>
      <p class="franja__conteo">${todos.length} productos</p>
    </div>
  </section>

  <section class="seccion seccion--ajustada">
    <div class="contenedor">
      <h2 class="titulo-menor">Filtra por categoría</h2>
      <ul class="fichas">
        ${cats.map((c) => `<li><a href="/categoria-producto/${c.ruta ?? c.slug}/">${esc(c.nombre)} <b>${c.conteo}</b></a></li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      <div class="rejilla rejilla--prod">${todos.map(tarjetaProducto).join('')}</div>
    </div>
  </section>

  ${cierre({
    titulo: '¿Necesitas algo a la medida?',
    texto: 'Somos fabricantes: adaptamos cualquier modelo a tu espacio, tus materiales y tu presupuesto.',
    cta: 'Hablar con un asesor',
    mensaje: 'Hola, me gustaría cotizar mobiliario para oficina.',
  })}
</main>`;

  return documento({
    titulo: 'Tienda | Ofitodo',
    descripcion: `Catálogo completo de mobiliario para oficina: ${todos.length} productos con envío a todo México y pago contra entrega.`,
    ruta, activo: '/tienda/', clase: 'pag-tienda', cuerpo,
  });
}

/* --- Páginas de sistema (carrito, compra, cuenta, pedido) ----------------- */
export function paginaSistema(ruta: string, titulo: string, descripcion: string, contenido: string): string {
  const cuerpo = `
${migas([{ t: titulo }])}
<main id="contenido">
  <section class="franja">
    <div class="contenedor franja__inner">
      <span class="etiqueta">Tu compra</span>
      <h1>${esc(titulo)}</h1>
      <p>${esc(descripcion)}</p>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">${contenido}</div>
  </section>
</main>`;

  return documento({
    titulo: `${titulo} | Ofitodo`,
    descripcion, ruta, activo: '/tienda/', clase: 'pag-sistema', cuerpo,
    noIndex: true,
  });
}

/* --- Páginas heredadas (maquetación de Elementor, ya sin WordPress) -------
 * Su CSS viene depurado y acotado por scripts/extraer-elementor.mjs y se
 * sirve como archivo aparte (versionado por hash) para que el navegador lo
 * cachee. La página no pide un solo archivo a /wp-content ni /wp-includes.  */
export function paginaHeredada(ruta: string, d: { titulo: string; seo: { title: string; description: string | null }; html: string }, hojaCss: string): string {
  const cuerpo = `
${migas([{ t: d.titulo }])}
<main id="contenido">
  <link rel="stylesheet" href="${esc(hojaCss)}">
  <div class="pagina-heredada">${d.html}</div>
</main>`;

  return documento({
    titulo: d.seo?.title || `${d.titulo} | Ofitodo`,
    descripcion: d.seo?.description || `${d.titulo}. Ofitodo, mobiliario para oficina en Aguascalientes.`,
    ruta, clase: 'pag-heredada', cuerpo,
  });
}
