# Excepciones de paridad aprobadas

| # | Qué cambia respecto al original | Motivo | Aprobado por | Fecha |
|---|---|---|---|---|
| 1 | Métodos de pago del checkout: el original tiene Transferencia bancaria (BACS) y PayPal habilitados; el sitio nuevo ofrecerá **únicamente pago contra entrega** | Decisión de negocio en compuerta C1 | Cristian | 2026-08-26 |
| 2 | Mercado Pago (plugin instalado, sin evidencia de habilitado) no se migra | Sin uso real | Cristian | 2026-08-26 |
| 3 | Endpoints `/wp-json/*`, `?rest_route=`, `/xmlrpc.php`, `/wp-cron.php` → 410 sin compatibilidad | Cristian confirma que no existen Zaps ni consumidores externos | Cristian | 2026-08-26 |
| 4 | Feeds RSS (`/feed/`, `/comments/feed/`) → 410 | Sin evidencia de suscriptores; el sitio no los enlaza | **Cristian** ✔ | 2026-08-26 |
| 5 | `/cart/`, `/finalizar-compra/`, `/mi-cuenta/` reconstruidas con diseño propio (chrome del tema + formulario contra entrega con los mismos campos billing_*) | Consecuencia directa de #1 (retiro de pasarelas); eran noindex | Cubierta por #1 | 2026-08-26 |
| 6 | "Cargar más" de los listados: ajax del plugin → botón estático que revela ítems pre-renderizados ocultos (misma vista inicial, misma función) | Sin servidor WP; mejora invisible | Aplicada §M2 (siempre permitidas) | 2026-08-26 |
| 7 | Atajos `?p=`, `?page_id=`, `?product=` → 301 a portada (en vez del permalink exacto por ID) | Mapa completo pendiente como mejora M1; uso real de estos atajos: no observado | **Cristian** ✔ | 2026-08-26 |
| 8 | Formularios Ninja: mensaje de éxito propio en español ("Gracias, hemos recibido tu mensaje") en lugar de los textos por defecto del plugin | El original usaba defaults genéricos en inglés ("Submission Confirmation") | **Cristian** ✔ | 2026-08-26 |
