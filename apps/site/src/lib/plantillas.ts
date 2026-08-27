// Plantillas rediseñadas: catálogo (categoría/etiqueta/marca) y ficha de producto.
// HTML propio, sin Elementor. Reutiliza el armazón y el sistema de diseño.
import { imagenVariante, type Producto, type Listado } from './contenido.ts';
import { documento, migas, FLECHA, WA, CHECK } from './chrome.ts';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WHATSAPP = '5214493419403';
const wa = (txt: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`;

/* Shortcodes de Jetpack que WordPress nunca llegó a renderizar y quedaban a la
   vista como texto crudo en 296 de 368 fichas. Se retiran (no son contenido) y
   su lugar lo ocupa un formulario de cotización que sí funciona.              */
function limpiarDescripcion(html: string): string {
  return html
    .replace(/\[contact-form[\s\S]*?\[\/contact-form\]/gi, '')
    .replace(/\[contact-field[^\]]*\]/gi, '')
    .replace(/\[\/?ninja_form[^\]]*\]/gi, '')
    .replace(/(<(?:p|strong|b|h[2-6])[^>]*>\s*)?Formulario de cotizaci[oó]n\s*(<\/(?:p|strong|b|h[2-6])>)?/gi, '')
    .replace(/(<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>)+/gi, '')
    .trim();
}

/* Formulario de cotización (envía a /api/formularios, el mismo del sitio) */
function formularioCotizacion(p: { nombre: string; sku: string | null }): string {
  return `<form class="cotiza" data-form="cotizacion" data-producto="${esc(p.nombre)}${p.sku ? ' (' + esc(p.sku) + ')' : ''}" novalidate>
    <h2 class="titulo-menor">Solicita tu cotización</h2>
    <p class="cotiza__intro">Déjanos tus datos y un asesor te responde el mismo día hábil.</p>
    <div class="cotiza__campos">
      <label>Nombre<input type="text" name="nombre" required autocomplete="name" placeholder="Tu nombre"></label>
      <label>Correo<input type="email" name="correo" required autocomplete="email" placeholder="tucorreo@empresa.com"></label>
      <label>Teléfono<input type="tel" name="telefono" autocomplete="tel" placeholder="(449) 000 0000"></label>
      <label>Cantidad<input type="number" name="cantidad" min="1" step="1" placeholder="1"></label>
      <label class="cotiza__ancho">Mensaje<textarea name="mensaje" rows="3" placeholder="Cuéntanos medidas, colores o cualquier detalle"></textarea></label>
    </div>
    <div class="cotiza__pie">
      <button class="btn btn--primario" type="submit">Enviar solicitud</button>
      <p class="cotiza__aviso" role="status"></p>
    </div>
  </form>`;
}

/* --- Tarjeta de producto (catálogo y relacionados) ------------------------ */
export function tarjetaProducto(p: Producto): string {
  const img = imagenVariante(p.imagen, 500);
  return `<a class="prod revelar" href="/producto/${p.slug}/">
    <span class="prod__img">${img
      ? `<img src="${esc(img)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" width="500" height="500">`
      : '<span class="prod__sinimg" aria-hidden="true"></span>'}</span>
    <span class="prod__cuerpo">
      <span class="prod__nombre">${esc(p.nombre)}</span>
      ${p.sku ? `<span class="prod__sku">Clave ${esc(p.sku)}</span>` : ''}
      <span class="prod__ir">Ver detalle ${FLECHA}</span>
    </span>
  </a>`;
}

/* --- Página de catálogo --------------------------------------------------- */
export function paginaCatalogo(o: {
  l: Listado; ruta: string; tipo: 'categoria' | 'etiqueta' | 'marca';
  productos: Producto[]; subcategorias: Listado[]; hermanas: Listado[];
}): string {
  const { l, productos: prods, subcategorias: subs, hermanas } = o;
  const etiqueta = o.tipo === 'categoria' ? 'Catálogo' : o.tipo === 'marca' ? 'Marca' : 'Colección';
  const portada = imagenVariante(l.imagen, 1600);
  const enlaceCat = (s: Listado) => (o.tipo === 'categoria' ? `/categoria-producto/${s.ruta ?? s.slug}/` : `/categoria-producto/${s.ruta ?? s.slug}/`);

  const cuerpo = `
${migas([{ t: 'Productos', h: '/productos/' }, { t: l.nombre }])}
<main id="contenido">

  <section class="franja${portada ? ' franja--foto' : ''}">
    ${portada ? `<div class="franja__media"><img src="${esc(portada)}" alt="" fetchpriority="high" decoding="async"></div>` : ''}
    <div class="contenedor franja__inner">
      <span class="etiqueta">${etiqueta}</span>
      <h1>${esc(l.nombre)}</h1>
      ${l.descripcion ? `<p>${esc(l.descripcion)}</p>` : ''}
      <p class="franja__conteo">${prods.length} producto${prods.length === 1 ? '' : 's'} disponible${prods.length === 1 ? '' : 's'}</p>
    </div>
  </section>

  ${subs.length ? `<section class="seccion seccion--ajustada">
    <div class="contenedor">
      <h2 class="titulo-menor">Explora por tipo</h2>
      <ul class="fichas">
        ${subs.map((s) => `<li><a href="${enlaceCat(s)}">${esc(s.nombre)} <b>${s.conteo}</b></a></li>`).join('')}
      </ul>
    </div>
  </section>` : ''}

  <section class="seccion">
    <div class="contenedor">
      ${prods.length
        ? `<div class="rejilla rejilla--prod">${prods.map(tarjetaProducto).join('')}</div>`
        : `<p class="vacio">Estamos preparando esta sección. Escríbenos y te enviamos las opciones disponibles.</p>`}
    </div>
  </section>

  ${hermanas.length ? `<section class="seccion seccion--alt">
    <div class="contenedor">
      <h2 class="titulo-menor">Otras categorías</h2>
      <ul class="fichas">
        ${hermanas.map((s) => `<li><a href="${enlaceCat(s)}">${esc(s.nombre)} <b>${s.conteo}</b></a></li>`).join('')}
      </ul>
    </div>
  </section>` : ''}

  <section class="cierre">
    <div class="contenedor">
      <h2 class="revelar">¿No encuentras lo que buscas?</h2>
      <p class="revelar">Fabricamos mobiliario a la medida. Cuéntanos tu espacio y te preparamos una propuesta sin compromiso.</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="${wa('Hola, me interesa el catálogo de ' + l.nombre + '.')}" target="_blank" rel="noopener">${WA} Cotizar por WhatsApp</a>
        <a class="btn btn--borde" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>
</main>`;

  return documento({
    titulo: l.seo?.title ? `${l.seo.title} | Ofitodo` : `${l.nombre} | Ofitodo`,
    descripcion: l.seo?.description || l.descripcion || `${l.nombre}: ${prods.length} opciones de mobiliario para oficina en Aguascalientes y todo México.`,
    ruta: o.ruta, activo: '/productos/', ogImagen: l.imagen, clase: 'pag-catalogo', cuerpo,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: l.nombre,
      url: `https://ofitodo.com${o.ruta}`,
      description: l.descripcion || undefined,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: prods.length,
        itemListElement: prods.slice(0, 30).map((p, i) => ({
          '@type': 'ListItem', position: i + 1,
          url: `https://ofitodo.com/producto/${p.slug}/`, name: p.nombre,
        })),
      },
    }),
  });
}

/* --- Ficha de producto ---------------------------------------------------- */
export function paginaProducto(o: { p: Producto; categoria: Listado | null; relacionados: Producto[] }): string {
  const { p, categoria: cat, relacionados: rel } = o;
  const galeria = [p.imagen, ...p.galeria].filter(Boolean) as string[];
  const principal = imagenVariante(galeria[0], 900);
  const texto = `Hola, me interesa el producto ${p.nombre}${p.sku ? ` (clave ${p.sku})` : ''}. ¿Me pueden cotizar?`;
  const rutaCat = cat ? `/categoria-producto/${cat.ruta ?? cat.slug}/` : '';
  const detalle = limpiarDescripcion(p.descripcionHtml);

  const cuerpo = `
${migas([{ t: 'Productos', h: '/productos/' }, ...(cat ? [{ t: cat.nombre, h: rutaCat }] : []), { t: p.nombre }])}
<main id="contenido">

  <section class="ficha">
    <div class="contenedor ficha__grid">

      <div class="galeria">
        <div class="galeria__marco">
          ${principal ? `<img id="gal-principal" src="${esc(principal)}" alt="${esc(p.nombre)}" fetchpriority="high" decoding="async" width="900" height="900">` : ''}
        </div>
        ${galeria.length > 1 ? `<ul class="galeria__tiras">
          ${galeria.slice(0, 6).map((g, i) => `<li><button type="button" class="galeria__mini${i === 0 ? ' activa' : ''}" data-grande="${esc(imagenVariante(g, 900))}" aria-label="Ver imagen ${i + 1}">
            <img src="${esc(imagenVariante(g, 200))}" alt="" loading="lazy" decoding="async" width="110" height="110"></button></li>`).join('')}
        </ul>` : ''}
      </div>

      <div class="ficha__info">
        ${cat ? `<a class="etiqueta etiqueta--enlace" href="${rutaCat}">${esc(cat.nombre)}</a>` : ''}
        <h1>${esc(p.nombre)}</h1>
        ${p.sku ? `<p class="ficha__sku">Clave <strong>${esc(p.sku)}</strong></p>` : ''}
        ${p.descripcionCorta ? `<p class="ficha__resumen">${esc(p.descripcionCorta)}</p>` : ''}

        <div class="ficha__precio">
          ${p.precio
            ? `<strong>$${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong><span>MXN · IVA incluido</span>`
            : `<strong>Precio a cotizar</strong><span>Te respondemos el mismo día</span>`}
        </div>

        <div class="ficha__acciones">
          <a class="btn btn--wa" href="${wa(texto)}" target="_blank" rel="noopener">${WA} Cotizar por WhatsApp</a>
          <a class="btn btn--linea" href="#cotizar">Solicitar por correo</a>
        </div>

        <ul class="ficha__garantias">
          <li>${CHECK} Fabricación propia en Aguascalientes</li>
          <li>${CHECK} Envío a todo México</li>
          <li>${CHECK} Pago contra entrega</li>
          <li>${CHECK} Asesoría y medidas a tu espacio</li>
        </ul>
      </div>
    </div>
  </section>

  ${detalle ? `<section class="seccion seccion--alt">
    <div class="contenedor contenedor--texto">
      <h2 class="titulo-menor">Detalles y especificaciones</h2>
      <div class="prosa">${detalle}</div>
    </div>
  </section>` : ''}

  <section class="seccion" id="cotizar">
    <div class="contenedor contenedor--texto">
      ${formularioCotizacion(p)}
    </div>
  </section>

  ${rel.length ? `<section class="seccion">
    <div class="contenedor">
      <h2 class="titulo-menor">También te puede interesar</h2>
      <div class="rejilla rejilla--prod">${rel.map(tarjetaProducto).join('')}</div>
    </div>
  </section>` : ''}

  <section class="cierre">
    <div class="contenedor">
      <h2 class="revelar">¿Lo quieres a otra medida o color?</h2>
      <p class="revelar">Somos fabricantes: adaptamos este modelo a tu espacio, tus materiales y tu presupuesto.</p>
      <div class="cierre__acciones revelar">
        <a class="btn btn--wa" href="${wa(texto)}" target="_blank" rel="noopener">${WA} Hablar con un asesor</a>
        <a class="btn btn--borde" href="/contactanos/">Escríbenos</a>
      </div>
    </div>
  </section>
</main>`;

  return documento({
    titulo: p.seo?.title || `${p.nombre} | Ofitodo`,
    descripcion: p.seo?.description || p.descripcionCorta || `${p.nombre}. Mobiliario para oficina fabricado en Aguascalientes con envío a todo México.`,
    ruta: `/producto/${p.slug}/`, activo: '/productos/', ogImagen: p.imagen, tipoOg: 'product',
    clase: 'pag-producto', cuerpo,
    scriptExtra: `
(function(){
  var g=document.getElementById('gal-principal');
  document.querySelectorAll('.galeria__mini').forEach(function(b){
    b.addEventListener('click',function(){
      if(!g) return;
      g.src=b.dataset.grande;
      document.querySelectorAll('.galeria__mini').forEach(function(x){x.classList.remove('activa')});
      b.classList.add('activa');
    });
  });
  var f=document.querySelector('form[data-form="cotizacion"]');
  if(f) f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var aviso=f.querySelector('.cotiza__aviso'), btn=f.querySelector('button[type=submit]');
    var d={}; new FormData(f).forEach(function(v,k){ d[k]=v; });
    if(!d.nombre||!d.correo){ aviso.textContent='Escribe tu nombre y tu correo, por favor.'; aviso.className='cotiza__aviso cotiza__aviso--error'; return; }
    d.producto=f.dataset.producto;
    btn.disabled=true; aviso.className='cotiza__aviso'; aviso.textContent='Enviando…';
    fetch('/api/formularios',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({formulario:'cotizacion-producto',pagina:location.pathname,datos:d})})
      .then(function(r){ if(!r.ok) throw 0; f.reset();
        aviso.className='cotiza__aviso cotiza__aviso--ok';
        aviso.textContent='Listo, recibimos tu solicitud. Te contactamos muy pronto.'; })
      .catch(function(){ aviso.className='cotiza__aviso cotiza__aviso--error';
        aviso.textContent='No pudimos enviarlo. Escríbenos por WhatsApp y te atendemos de inmediato.'; })
      .finally(function(){ btn.disabled=false; });
  });
})();`,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nombre,
      sku: p.sku || undefined,
      image: galeria.slice(0, 5),
      description: p.descripcionCorta || undefined,
      brand: { '@type': 'Brand', name: 'Ofitodo' },
      offers: {
        '@type': 'Offer',
        url: `https://ofitodo.com/producto/${p.slug}/`,
        priceCurrency: 'MXN',
        ...(p.precio ? { price: String(p.precio) } : {}),
        availability: p.stockStatus === 'instock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    }),
  });
}
