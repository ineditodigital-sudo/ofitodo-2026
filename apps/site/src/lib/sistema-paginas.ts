// Contenido de las páginas de sistema reconstruidas (carrito, checkout contra entrega,
// mi cuenta, pedido recibido). Mismos campos billing_* que el checkout original
// (reference/flows/compra/flujo.json). Estilos en /assets/sistema.css.

const css = '<link rel="stylesheet" href="/assets/sistema.css">';

export const carrito = () => `${css}
<div class="of-sis" id="of-carrito" data-pagina="carrito">
  <div class="of-cargando">Cargando tu carrito…</div>
</div>`;

const ESTADOS_MX = ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'];

export const checkout = () => `${css}
<div class="of-sis of-checkout" data-pagina="checkout">
  <form id="of-checkout-form" novalidate>
    <div class="of-cols">
      <section class="of-col">
        <h3>Detalles de facturación</h3>
        <div class="of-fila2">
          <p><label>Nombre&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_first_name" required autocomplete="given-name"></label></p>
          <p><label>Apellidos&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_last_name" required autocomplete="family-name"></label></p>
        </div>
        <p><label>Nombre de la empresa (opcional)<input type="text" name="billing_company" autocomplete="organization"></label></p>
        <p><label>País / Región&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_country" value="México" readonly></label></p>
        <p><label>Dirección de la calle&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_address_1" required placeholder="Número de la casa y nombre de la calle" autocomplete="address-line1"></label></p>
        <p><label class="of-visualmente-oculto">Apartamento, habitación, escalera, etc. (opcional)</label><input type="text" name="billing_address_2" placeholder="Apartamento, habitación, escalera, etc. (opcional)" autocomplete="address-line2"></p>
        <p><label>Población&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_city" required autocomplete="address-level2"></label></p>
        <p><label>Región / Provincia&nbsp;<abbr class="required">*</abbr><select name="billing_state" required>${ESTADOS_MX.map((e) => `<option${e === 'Aguascalientes' ? ' selected' : ''}>${e}</option>`).join('')}</select></label></p>
        <p><label>Código postal / ZIP&nbsp;<abbr class="required">*</abbr><input type="text" name="billing_postcode" required inputmode="numeric" autocomplete="postal-code"></label></p>
        <p><label>Teléfono&nbsp;<abbr class="required">*</abbr><input type="tel" name="billing_phone" required autocomplete="tel"></label></p>
        <p><label>Dirección de correo electrónico&nbsp;<abbr class="required">*</abbr><input type="email" name="billing_email" required autocomplete="email"></label></p>
        <p><label>Notas del pedido (opcional)<textarea name="order_comments" rows="3" placeholder="Notas sobre tu pedido, por ejemplo, notas especiales para la entrega."></textarea></label></p>
      </section>
      <section class="of-col">
        <h3>Tu pedido</h3>
        <div id="of-resumen"></div>
        <div class="of-pago">
          <h4>Pago contra entrega</h4>
          <p>Pagas al recibir tu pedido. Nuestro equipo te contactará para coordinar la entrega y el pago.</p>
        </div>
        <button type="submit" class="of-btn" id="of-realizar-pedido">Realizar el pedido</button>
        <p class="of-error" id="of-checkout-error" role="alert" hidden></p>
      </section>
    </div>
  </form>
</div>`;

export const pedidoRecibido = () => `${css}
<div class="of-sis of-gracias" data-pagina="pedido-recibido">
  <h3>¡Gracias! Hemos recibido tu pedido.</h3>
  <p id="of-numero-pedido"></p>
  <p>Te contactaremos muy pronto para coordinar la entrega y el pago contra entrega.</p>
  <p>Si tienes dudas escríbenos por WhatsApp o a <a href="mailto:ventasofitodo@hotmail.com">ventasofitodo@hotmail.com</a>.</p>
  <p><a class="of-btn" href="/tienda/">Seguir viendo productos</a></p>
</div>`;

export const miCuenta = () => `${css}
<div class="of-sis of-cuenta" data-pagina="mi-cuenta">
  <h3>Acceso</h3>
  <p>El acceso de clientes ya no es necesario para comprar: tu pedido se coordina contra entrega.</p>
  <p>¿Eres parte del equipo de Ofitodo? Entra al panel de administración:</p>
  <p><a class="of-btn" href="/admin/">Ir al panel</a></p>
</div>`;
