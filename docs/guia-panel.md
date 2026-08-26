# Guía del Panel de Ofitodo (CMS)

**Dónde:** `ofitodo.com/admin/` · **Entrar:** tu usuario y contraseña de siempre (los mismos de WordPress).

El panel está hecho para que administres tu sitio sin conocimientos técnicos. Nunca vas a ver código, y **no puedes romper el sitio**: solo editas contenido.

## Menú del panel

- **Inicio** — un vistazo rápido: pedidos por atender, mensajes sin leer, cambios por publicar.
- **Páginas** — el corazón del CMS. Elige una página (Inicio, Nosotros, Sectores…) y edítala con **vista previa en vivo**.
- **Encabezado y pie** — lo que sale en TODAS las páginas: logo, menú, datos del pie, redes, copyright.
- **Blog** — tus entradas del blog, se editan igual que las páginas.
- **Marca y colores** — los colores de tu sitio con un selector visual.
- **Contacto y redes** — teléfonos, WhatsApp, correo y redes sociales.
- **Imágenes** — sube una foto y copia su dirección para usarla donde quieras (se optimizan solas).
- **Tienda** — precio y disponibilidad de cada producto (se aplican al instante).
- **Pedidos** — cada pedido contra entrega con los datos del cliente; cambia su estado.
- **Mensajes** — lo que llega por los formularios del sitio.

## Cómo editar una página (lo más importante)

1. Entra a **Páginas** y elige la que quieras.
2. Verás la página a la izquierda y sus elementos editables a la derecha.
3. **Haz clic en cualquier texto, imagen o botón** de la vista previa: se selecciona su campo.
4. Cámbialo en el panel de la derecha. El cambio se ve **al instante** en la vista previa.
   - **Textos**: escribe el nuevo texto.
   - **Imágenes**: «Cambiar imagen» (arrastra o elige un archivo) y escribe su texto alternativo.
   - **Botones y enlaces**: cambia el texto, a dónde llevan, y si abren en otra pestaña.
5. Cuando termines:
   - **Guardar borrador**: reserva tus cambios sin mostrarlos todavía.
   - **Publicar**: los aplica al sitio (se ven en unos minutos).

## ¿Qué se aplica al instante y qué al publicar?

| Al instante | Al publicar (unos minutos) |
|---|---|
| Precios y disponibilidad de productos | Textos, imágenes, botones y enlaces de las páginas |
| Estado de pedidos, marcar mensajes leídos | Colores de marca, datos de contacto y redes |

## Preguntas frecuentes

**¿Puedo deshacer un cambio?** Sí. Cada publicación queda en el historial de esa página y se puede restaurar.

**¿Se puede romper el sitio?** No. Solo editas contenido controlado; el diseño está protegido.

**¿Necesito ayuda?** Escríbenos: cristian.castaneda@maindsoft.net

---

### Nota técnica (para el equipo)

«Publicar» guarda los cambios en el servidor. Para reflejarlos en el sitio estático se ejecuta una vez:
```
npm run publicar
```
Esto baja los cambios publicados, reconstruye el sitio y lo sube a `ofitodo.com` (sin tocar la base de datos ni las imágenes). Es la razón por la que los cambios de contenido tardan «unos minutos». Automatizarlo con un webhook es la siguiente mejora opcional.
