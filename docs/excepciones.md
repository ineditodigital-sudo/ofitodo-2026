# Excepciones de paridad aprobadas

| # | Qué cambia respecto al original | Motivo | Aprobado por | Fecha |
|---|---|---|---|---|
| 1 | Métodos de pago del checkout: el original tiene Transferencia bancaria (BACS) y PayPal habilitados; el sitio nuevo ofrecerá **únicamente pago contra entrega** | Decisión de negocio en compuerta C1 | Cristian | 2026-08-26 |
| 2 | Mercado Pago (plugin instalado, sin evidencia de habilitado) no se migra | Sin uso real | Cristian | 2026-08-26 |
| 3 | Endpoints `/wp-json/*`, `?rest_route=`, `/xmlrpc.php`, `/wp-cron.php` → 410 sin compatibilidad | Cristian confirma que no existen Zaps ni consumidores externos | Cristian | 2026-08-26 |
