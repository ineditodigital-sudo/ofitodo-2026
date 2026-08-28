/* Islas de interactividad de ofitodo.com (vanilla, sin frameworks):
   búsqueda con SKU, carrito + checkout contra entrega, formularios (Ninja → API propia).
   Se inyecta en TODAS las páginas por el build (transformar.ts). */
(function () {
  'use strict';
  var API = '/api';
  var LS = 'ofitodo_carrito';

  /* ---------- utilidades ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmt(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function post(ruta, datos) {
    return fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.mensaje || 'Error'); return j; }); });
  }

  /* ---------- carrito (localStorage) ---------- */
  function carrito() { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } }
  function guardar(c) { try { localStorage.setItem(LS, JSON.stringify(c)); } catch (e) {} actualizarContador(); }
  function agregarAlCarrito(p, qty) {
    var c = carrito();
    var ex = c.find(function (x) { return x.slug === p.slug; });
    if (ex) ex.qty += qty; else c.push({ slug: p.slug, nombre: p.nombre, precio: p.precio, imagen: p.imagen, sku: p.sku, qty: qty });
    guardar(c);
  }
  function totalCarrito(c) { return c.reduce(function (t, x) { return t + (x.precio || 0) * x.qty; }, 0); }
  function actualizarContador() {
    var n = carrito().reduce(function (t, x) { return t + x.qty; }, 0);
    $$('.mkd-shopping-cart-holder .mkd-cart-count, .cart-contents-count').forEach(function (el) { el.textContent = n; });
  }

  // Ficha de producto: interceptar "añadir al carrito"
  var pdata = document.body.getAttribute('data-producto');
  if (pdata) {
    try { pdata = JSON.parse(pdata); } catch (e) { pdata = null; }
    var formCart = $('form.cart');
    if (pdata && formCart && pdata.precio != null) {
      formCart.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var qty = parseInt(($('input.qty', formCart) || {}).value || '1', 10) || 1;
        agregarAlCarrito(pdata, qty);
        location.href = '/cart/'; // mismo comportamiento que el original
      });
    }
  }

  /* ---------- página de carrito ---------- */
  var elCarrito = $('#of-carrito');
  if (elCarrito) {
    var render = function () {
      var c = carrito();
      if (!c.length) {
        elCarrito.innerHTML = '<p class="of-vacio">Tu carrito está vacío.</p><p><a class="of-btn" href="/tienda/">Volver a la tienda</a></p>';
        return;
      }
      var filas = c.map(function (x, i) {
        return '<tr><td class="of-td-img">' + (x.imagen ? '<img src="' + x.imagen.replace(/(\.\w+)$/, '-150x150$1') + '" alt="" width="64" height="64">' : '') + '</td>' +
          '<td><a href="/producto/' + x.slug + '/">' + x.nombre + '</a>' + (x.sku ? '<br><small>SKU: ' + x.sku + '</small>' : '') + '</td>' +
          '<td>' + (x.precio != null ? fmt(x.precio) : '—') + '</td>' +
          '<td><div class="of-qty"><button data-a="menos" data-i="' + i + '" aria-label="Menos">−</button><span>' + x.qty + '</span><button data-a="mas" data-i="' + i + '" aria-label="Más">+</button></div></td>' +
          '<td>' + (x.precio != null ? fmt(x.precio * x.qty) : '—') + '</td>' +
          '<td><button class="of-x" data-a="quitar" data-i="' + i + '" aria-label="Quitar">×</button></td></tr>';
      }).join('');
      elCarrito.innerHTML = '<table class="of-tabla"><thead><tr><th></th><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>' + filas + '</tbody></table>' +
        '<div class="of-totales"><h4>Totales del carrito</h4><p><span>Subtotal</span><strong>' + fmt(totalCarrito(c)) + '</strong></p><p><span>Total</span><strong>' + fmt(totalCarrito(c)) + '</strong></p>' +
        '<a class="of-btn" href="/finalizar-compra/">Finalizar compra</a><p class="of-nota">Pago contra entrega: pagas al recibir tu pedido.</p></div>';
    };
    elCarrito.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-a]'); if (!b) return;
      var c = carrito(); var i = +b.getAttribute('data-i');
      if (b.getAttribute('data-a') === 'mas') c[i].qty++;
      if (b.getAttribute('data-a') === 'menos') c[i].qty = Math.max(1, c[i].qty - 1);
      if (b.getAttribute('data-a') === 'quitar') c.splice(i, 1);
      guardar(c); render();
    });
    render();
  }

  /* ---------- checkout contra entrega ---------- */
  var formCk = $('#of-checkout-form');
  if (formCk) {
    var c0 = carrito();
    var res = $('#of-resumen');
    if (!c0.length) {
      formCk.innerHTML = '<p class="of-vacio">Tu carrito está vacío. <a href="/tienda/">Ir a la tienda</a></p>';
    } else {
      res.innerHTML = '<table class="of-tabla of-mini"><tbody>' + c0.map(function (x) {
        return '<tr><td>' + x.nombre + ' × ' + x.qty + '</td><td>' + (x.precio != null ? fmt(x.precio * x.qty) : '—') + '</td></tr>';
      }).join('') + '<tr class="of-total"><td>Total</td><td>' + fmt(totalCarrito(c0)) + '</td></tr></tbody></table>';
      formCk.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var err = $('#of-checkout-error'); err.hidden = true;
        if (!formCk.reportValidity()) return;
        var f = new FormData(formCk); var cliente = {};
        f.forEach(function (v, k) { cliente[k] = v; });
        var btn = $('#of-realizar-pedido'); btn.disabled = true; btn.textContent = 'Enviando pedido…';
        post('/pedidos', { cliente: cliente, items: carrito() })
          .then(function (r) { guardar([]); location.href = '/pedido-recibido/?n=' + r.numero; })
          .catch(function (e) { err.textContent = 'No pudimos registrar tu pedido: ' + e.message + '. Intenta de nuevo o escríbenos por WhatsApp.'; err.hidden = false; btn.disabled = false; btn.textContent = 'Realizar el pedido'; });
      });
    }
  }
  var nped = $('#of-numero-pedido');
  if (nped) {
    var n = new URLSearchParams(location.search).get('n');
    if (n) nped.innerHTML = 'Tu número de pedido es el <strong>#' + n + '</strong>.';
  }

  /* ---------- búsqueda (Ajax Search Lite → local, con SKU) ---------- */
  var indice = null;
  function cargarIndice() {
    if (indice) return Promise.resolve(indice);
    return fetch('/assets/indice-busqueda.json').then(function (r) { return r.json(); }).then(function (d) { indice = d; return d; });
  }
  $$('input[name="phrase"].orig').forEach(function (input) {
    var form = input.closest('form'); if (!form) return;
    var caja = document.createElement('div'); caja.className = 'of-busqueda-res'; caja.hidden = true;
    form.style.position = 'relative'; form.appendChild(caja);
    var t = null;
    function buscar() {
      var q = norm(input.value.trim());
      if (q.length < 2) { caja.hidden = true; return; }
      cargarIndice().then(function (idx) {
        var rs = idx.filter(function (p) { return norm(p.nombre).indexOf(q) !== -1 || (p.sku && norm(p.sku).indexOf(q) !== -1); }).slice(0, 8);
        caja.innerHTML = rs.length
          ? rs.map(function (p) { return '<a href="/producto/' + p.slug + '/">' + (p.imagen ? '<img src="' + p.imagen + '" alt="" width="40" height="40">' : '') + '<span>' + p.nombre + (p.sku ? ' <small>(' + p.sku + ')</small>' : '') + '</span></a>'; }).join('')
          : '<p class="of-sinres">Sin resultados para “' + input.value + '”.</p>';
        caja.hidden = false;
      });
    }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(buscar, 180); });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); buscar(); });
    document.addEventListener('click', function (ev) { if (!form.contains(ev.target)) caja.hidden = true; });
  });

  /* ---------- formularios Ninja Forms → API propia ---------- */
  var nf = window.nfForms;
  if (nf && nf.length) {
    nf.forEach(function (fdata) {
      var id = fdata.id;
      var cont = document.getElementById('nf-form-' + id + '-cont');
      if (!cont) return;
      var campos = (fdata.fields || []).filter(function (f) { return f.type !== 'submit' && f.type !== 'html' && f.type !== 'hr'; });
      var submit = (fdata.fields || []).find(function (f) { return f.type === 'submit'; });
      var html = '<form class="of-nf" novalidate>' + campos.map(function (f) {
        var req = +f.required ? ' required' : '';
        var tipo = f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text';
        var inner = f.type === 'textarea'
          ? '<textarea name="f' + f.id + '" rows="4"' + req + '></textarea>'
          : '<input type="' + tipo + '" name="f' + f.id + '"' + req + '>';
        return '<p><label>' + (f.label || '') + (+f.required ? ' <abbr class="required">*</abbr>' : '') + inner + '</label></p>';
      }).join('') + '<p><button type="submit" class="of-btn">' + ((submit && submit.label) || 'Enviar') + '</button></p>' +
        '<p class="of-nf-msj" role="status" hidden></p></form>';
      cont.innerHTML = html;
      var formEl = cont.querySelector('form');
      formEl.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!formEl.reportValidity()) return;
        var datos = {};
        campos.forEach(function (f) { datos[f.label || ('campo ' + f.id)] = (formEl.elements['f' + f.id] || {}).value || ''; });
        var msj = cont.querySelector('.of-nf-msj');
        var btn = formEl.querySelector('button'); btn.disabled = true;
        post('/formularios', { formulario: fdata.settings && fdata.settings.title ? fdata.settings.title : ('form-' + id), datos: datos, pagina: location.pathname })
          .then(function () { formEl.reset(); msj.textContent = 'Gracias, hemos recibido tu mensaje. Te contactaremos muy pronto.'; msj.hidden = false; btn.disabled = false; })
          .catch(function () { msj.textContent = 'No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.'; msj.hidden = false; btn.disabled = false; });
      });
    });
  }

  /* ---------- "cargar más" en listados (sustituye el ajax del original) ---------- */
  $$('[data-of-revelar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('[data-of-mas]').forEach(function (li) { li.hidden = false; });
      btn.parentElement.remove();
    });
  });

  actualizarContador();
})();
