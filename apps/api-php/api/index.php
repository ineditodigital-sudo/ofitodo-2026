<?php
/**
 * API dinámica de ofitodo (variante PHP para el hosting cPanel de staging/producción).
 * Mismo contrato que apps/api (Hono/Workers): /api/salud, /api/formularios, /api/pedidos,
 * /api/productos/estado y /api/admin/*. Datos en SQLite (api/datos/, protegido).
 *
 * CORREO: mientras el sitio esté en staging, los envíos van a DESTINO_STAGING.
 * En el cutover se cambia DESTINO a ventasofitodo@hotmail.com (ver docs/06-cutover.md).
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

const DESTINO_PRODUCCION = 'ventasofitodo@hotmail.com';
const DESTINO_STAGING = 'cristian.castaneda@maindsoft.net';
const EN_STAGING = true; // ← cambiar a false en el cutover
const REMITENTE = 'formularios@ofitodo.com';

$destino = EN_STAGING ? DESTINO_STAGING : DESTINO_PRODUCCION;

header('Content-Type: application/json; charset=utf-8');
$ruta = preg_replace('#^/api#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$metodo = $_SERVER['REQUEST_METHOD'];
$cuerpo = json_decode(file_get_contents('php://input') ?: 'null', true);

$pdo = of_db();

try {
  /* ---------- público ---------- */
  if ($ruta === '/salud' && $metodo === 'GET') {
    responder(['ok' => true, 'servicio' => 'ofitodo-api-php', 'version' => '1.0.0']);
  }

  if ($ruta === '/formularios' && $metodo === 'POST') {
    $form = trim((string)($cuerpo['formulario'] ?? ''));
    $datos = $cuerpo['datos'] ?? null;
    $pagina = substr((string)($cuerpo['pagina'] ?? ''), 0, 300);
    if ($form === '' || !is_array($datos) || !$datos) fallar('Datos incompletos.');
    if (count($datos) > 30) fallar('Demasiados campos.');
    $pdo->prepare('INSERT INTO form_submissions (formulario, datos, pagina, creado) VALUES (?,?,?,datetime("now"))')
        ->execute([$form, json_encode($datos, JSON_UNESCAPED_UNICODE), $pagina]);
    $lineas = '';
    foreach ($datos as $k => $v) $lineas .= sanear($k) . ': ' . sanear((string)$v) . "\n";
    of_mail($destino, 'Sitio web Ofitodo — ' . sanear($form),
      "Nuevo mensaje del sitio (formulario: {$form})\nPágina: {$pagina}\n\n{$lineas}", REMITENTE);
    responder(['ok' => true, 'mensaje' => 'Gracias, hemos recibido tu mensaje.']);
  }

  if ($ruta === '/pedidos' && $metodo === 'POST') {
    $cliente = $cuerpo['cliente'] ?? null;
    $items = $cuerpo['items'] ?? null;
    if (!is_array($cliente) || !is_array($items) || !$items) fallar('Pedido incompleto.');
    foreach (['billing_first_name', 'billing_last_name', 'billing_address_1', 'billing_city', 'billing_state', 'billing_postcode', 'billing_phone', 'billing_email'] as $req) {
      if (trim((string)($cliente[$req] ?? '')) === '') fallar('Falta el campo ' . $req . '.');
    }
    if (!filter_var($cliente['billing_email'], FILTER_VALIDATE_EMAIL)) fallar('Correo inválido.');
    // precios: los define el servidor (catálogo + overrides del panel), nunca el cliente
    $precios = of_precios($pdo);
    $lineas = []; $total = 0.0;
    foreach ($items as $it) {
      $slug = (string)($it['slug'] ?? '');
      $qty = max(1, min(500, (int)($it['qty'] ?? 1)));
      if (!isset($precios[$slug])) fallar('Producto desconocido: ' . sanear($slug));
      $p = $precios[$slug];
      if ($p['precio'] === null) fallar('El producto "' . sanear($p['nombre']) . '" se vende por cotización; contáctanos por WhatsApp.');
      $lineas[] = ['slug' => $slug, 'nombre' => $p['nombre'], 'precio' => $p['precio'], 'qty' => $qty, 'subtotal' => round($p['precio'] * $qty, 2)];
      $total += $p['precio'] * $qty;
    }
    $total = round($total, 2);
    $pdo->beginTransaction();
    $num = (int)$pdo->query('SELECT COALESCE(MAX(numero), 10053) + 1 FROM orders')->fetchColumn();
    $pdo->prepare('INSERT INTO orders (numero, estado, total, cliente, items, creado) VALUES (?,?,?,?,?,datetime("now"))')
        ->execute([$num, 'pendiente', $total, json_encode($cliente, JSON_UNESCAPED_UNICODE), json_encode($lineas, JSON_UNESCAPED_UNICODE)]);
    $pdo->commit();
    $resumen = '';
    foreach ($lineas as $l) $resumen .= "- {$l['nombre']} × {$l['qty']} = \${$l['subtotal']}\n";
    $nombre = sanear($cliente['billing_first_name'] . ' ' . $cliente['billing_last_name']);
    $dir = sanear("{$cliente['billing_address_1']} {$cliente['billing_address_2']}, {$cliente['billing_city']}, {$cliente['billing_state']}, CP {$cliente['billing_postcode']}");
    of_mail($destino, "Nuevo pedido #{$num} (contra entrega)",
      "Pedido #{$num} — PAGO CONTRA ENTREGA\n\nCliente: {$nombre}\nTel: {$cliente['billing_phone']}\nCorreo: {$cliente['billing_email']}\nDirección: {$dir}\n" .
      ($cliente['order_comments'] ? "Notas: " . sanear((string)$cliente['order_comments']) . "\n" : '') .
      "\nProductos:\n{$resumen}\nTOTAL: \${$total} MXN", REMITENTE);
    of_mail((string)$cliente['billing_email'], "Ofitodo — recibimos tu pedido #{$num}",
      "Hola {$nombre},\n\nRecibimos tu pedido #{$num}. Muy pronto te contactaremos para coordinar la entrega y el pago contra entrega.\n\nResumen:\n{$resumen}\nTOTAL: \${$total} MXN\n\nGracias por tu compra.\nOfitodo — Mobiliario para oficina y más\nWhatsApp: +52 449 341 9403", REMITENTE);
    responder(['ok' => true, 'numero' => $num, 'total' => $total]);
  }

  if ($ruta === '/productos/estado' && $metodo === 'GET') {
    $rows = $pdo->query('SELECT slug, precio, stock FROM product_overrides')->fetchAll(PDO::FETCH_ASSOC);
    responder(['ok' => true, 'overrides' => $rows]);
  }

  /* ---------- panel (admin) ---------- */
  if ($ruta === '/admin/login' && $metodo === 'POST') {
    $u = trim((string)($cuerpo['usuario'] ?? ''));
    $c = (string)($cuerpo['contrasena'] ?? '');
    $fila = $pdo->prepare('SELECT * FROM admins WHERE login = ? OR email = ?');
    $fila->execute([$u, $u]);
    $adm = $fila->fetch(PDO::FETCH_ASSOC);
    if (!$adm || !of_verificar_password($c, $adm)) fallar('Usuario o contraseña incorrectos.', 401);
    if (!$adm['hash_nuevo']) {
      $pdo->prepare('UPDATE admins SET hash_nuevo = ? WHERE id = ?')->execute([password_hash($c, PASSWORD_DEFAULT), $adm['id']]);
    }
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO sessions (token, admin_id, expira) VALUES (?,?,datetime("now","+7 days"))')->execute([$token, $adm['id']]);
    setcookie('of_admin', $token, ['expires' => time() + 7 * 86400, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => isset($_SERVER['HTTPS'])]);
    responder(['ok' => true, 'nombre' => $adm['display_name']]);
  }

  $admin = of_sesion($pdo);
  if (str_starts_with($ruta, '/admin/') && !$admin) fallar('Sesión requerida.', 401);

  if ($ruta === '/admin/yo') responder(['ok' => true, 'nombre' => $admin['display_name']]);
  if ($ruta === '/admin/salir' && $metodo === 'POST') {
    $pdo->prepare('DELETE FROM sessions WHERE token = ?')->execute([$_COOKIE['of_admin'] ?? '']);
    setcookie('of_admin', '', ['expires' => 1, 'path' => '/']);
    responder(['ok' => true]);
  }
  if ($ruta === '/admin/mensajes' && $metodo === 'GET') {
    responder(['ok' => true, 'mensajes' => $pdo->query('SELECT * FROM form_submissions ORDER BY id DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC)]);
  }
  if ($ruta === '/admin/pedidos' && $metodo === 'GET') {
    responder(['ok' => true, 'pedidos' => $pdo->query('SELECT * FROM orders ORDER BY id DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC)]);
  }
  if ($ruta === '/admin/pedidos' && $metodo === 'PUT') {
    $id = (int)($cuerpo['id'] ?? 0);
    $estado = (string)($cuerpo['estado'] ?? '');
    if (!in_array($estado, ['pendiente', 'confirmado', 'entregado', 'cancelado'], true)) fallar('Estado inválido.');
    $pdo->prepare('UPDATE orders SET estado = ? WHERE id = ?')->execute([$estado, $id]);
    responder(['ok' => true]);
  }
  if ($ruta === '/admin/productos' && $metodo === 'GET') {
    $base = of_precios($pdo);
    responder(['ok' => true, 'productos' => array_values($base)]);
  }
  if ($ruta === '/admin/productos' && $metodo === 'PUT') {
    $slug = (string)($cuerpo['slug'] ?? '');
    $precio = $cuerpo['precio'] !== null && $cuerpo['precio'] !== '' ? round((float)$cuerpo['precio'], 2) : null;
    $stock = in_array($cuerpo['stock'] ?? 'instock', ['instock', 'outofstock'], true) ? $cuerpo['stock'] : 'instock';
    $pdo->prepare('INSERT INTO product_overrides (slug, precio, stock) VALUES (?,?,?)
                   ON CONFLICT(slug) DO UPDATE SET precio = excluded.precio, stock = excluded.stock')
        ->execute([$slug, $precio, $stock]);
    responder(['ok' => true]);
  }

  fallar('Ruta no encontrada.', 404);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok' => false, 'mensaje' => 'Error del servidor.']);
}
