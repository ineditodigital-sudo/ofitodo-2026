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
header('Cache-Control: no-store'); // el nginx del hosting cachea GETs sin esta cabecera
$ruta = preg_replace('#^/api#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$metodo = $_SERVER['REQUEST_METHOD'];
$crudo = file_get_contents('php://input');
$len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if (($crudo === '' || $crudo === false || ($len > 0 && strlen($crudo) < $len)) && $len > 0) {
  // php-cgi vía puente CGI no siempre expone php://input completo: leer stdin en bucle
  $fh = fopen('php://stdin', 'rb');
  if ($fh) {
    $crudo = '';
    while (strlen($crudo) < $len && !feof($fh)) {
      $chunk = fread($fh, 8192);
      if ($chunk === false || $chunk === '') break;
      $crudo .= $chunk;
    }
    fclose($fh);
  }
}
$cuerpo = json_decode($crudo !== '' ? $crudo : 'null', true);

try {
  $pdo = of_db();

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

  // Exportación de cambios del panel para el ciclo de publicación (scripts/sincronizar-panel.mjs)
  if ($ruta === '/exportar-cambios' && $metodo === 'GET') {
    if (($_GET['clave'] ?? '') !== 'ofsync_7c1f4a9e2b8d4e63a5f0c9d21b7e8a44') fallar('Clave inválida.', 401);
    $co = $pdo->query("SELECT pagina, campo, datos FROM content_overrides WHERE estado='publicado'");
    $contenido = [];
    foreach ($co as $r) $contenido[$r['pagina']][$r['campo']] = json_decode($r['datos'], true);
    $set = [];
    foreach ($pdo->query('SELECT clave, valor FROM settings') as $r) $set[$r['clave']] = json_decode($r['valor'], true);
    responder(['ok' => true,
      'productos' => $pdo->query('SELECT * FROM product_overrides')->fetchAll(PDO::FETCH_ASSOC),
      'paginas' => $pdo->query('SELECT * FROM pages_seo')->fetchAll(PDO::FETCH_ASSOC),
      'slugs' => $pdo->query('SELECT * FROM slug_changes')->fetchAll(PDO::FETCH_ASSOC),
      'redirects' => $pdo->query('SELECT * FROM redirects_panel')->fetchAll(PDO::FETCH_ASSOC),
      'contenido' => $contenido,
      'settings' => $set,
    ]);
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
    $nombre = trim((string)($cuerpo['nombre'] ?? '')) ?: null;
    $descripcion = trim((string)($cuerpo['descripcion'] ?? '')) ?: null;
    $imagen = trim((string)($cuerpo['imagen'] ?? '')) ?: null;
    $pdo->prepare('INSERT INTO product_overrides (slug, precio, stock, nombre, descripcion, imagen, modificado) VALUES (?,?,?,?,?,?,datetime("now"))
                   ON CONFLICT(slug) DO UPDATE SET precio=excluded.precio, stock=excluded.stock, nombre=excluded.nombre,
                   descripcion=excluded.descripcion, imagen=excluded.imagen, modificado=excluded.modificado')
        ->execute([$slug, $precio, $stock, $nombre, $descripcion, $imagen]);
    // Cambio de dirección web (slug) → registra el nuevo slug y crea el 301 automático (§14)
    $slugNuevo = of_slug((string)($cuerpo['slug_nuevo'] ?? ''));
    if ($slugNuevo !== '' && $slugNuevo !== $slug) {
      $precios = of_precios($pdo);
      if (isset($precios[$slugNuevo])) fallar('Ya existe un producto con esa dirección web.');
      $pdo->prepare('INSERT INTO slug_changes (slug_actual, slug_nuevo, tipo, creado) VALUES (?,?,?,datetime("now"))
                     ON CONFLICT(slug_actual) DO UPDATE SET slug_nuevo=excluded.slug_nuevo, creado=excluded.creado')
          ->execute([$slug, $slugNuevo, 'producto']);
      $pdo->prepare('INSERT INTO redirects_panel (origen, destino, creado) VALUES (?,?,datetime("now"))
                     ON CONFLICT(origen) DO UPDATE SET destino=excluded.destino')
          ->execute(["/producto/{$slug}/", "/producto/{$slugNuevo}/"]);
      responder(['ok' => true, 'slugNuevo' => $slugNuevo, 'aviso' => "La dirección cambió a /producto/{$slugNuevo}/. La dirección anterior redirigirá sola (301) tras la próxima publicación."]);
    }
    responder(['ok' => true]);
  }
  if ($ruta === '/admin/producto-deshacer' && $metodo === 'POST') {
    $slug = (string)($cuerpo['slug'] ?? '');
    $sc = $pdo->prepare('SELECT slug_nuevo FROM slug_changes WHERE slug_actual = ?'); $sc->execute([$slug]);
    if ($n = $sc->fetchColumn()) $pdo->prepare('DELETE FROM redirects_panel WHERE origen = ?')->execute(["/producto/{$slug}/"]);
    $pdo->prepare('DELETE FROM slug_changes WHERE slug_actual = ?')->execute([$slug]);
    $pdo->prepare('DELETE FROM product_overrides WHERE slug = ?')->execute([$slug]);
    responder(['ok' => true, 'mensaje' => 'Cambios pendientes de este producto descartados.']);
  }
  if ($ruta === '/admin/paginas' && $metodo === 'GET') {
    $base = json_decode((string)file_get_contents(__DIR__ . '/datos/paginas.json'), true) ?? [];
    $ov = [];
    foreach ($pdo->query('SELECT * FROM pages_seo') as $o) $ov[$o['slug']] = $o;
    foreach ($base as &$p) {
      if (isset($ov[$p['slug']])) { $p['title'] = $ov[$p['slug']]['title'] ?: $p['title']; $p['description'] = $ov[$p['slug']]['description'] ?: $p['description']; $p['pendiente'] = true; }
      else $p['pendiente'] = false;
    }
    responder(['ok' => true, 'paginas' => $base]);
  }
  if ($ruta === '/admin/paginas' && $metodo === 'PUT') {
    $slug = (string)($cuerpo['slug'] ?? '');
    if ($slug === '') fallar('Falta la página.');
    $pdo->prepare('INSERT INTO pages_seo (slug, title, description, modificado) VALUES (?,?,?,datetime("now"))
                   ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, modificado=excluded.modificado')
        ->execute([$slug, trim((string)($cuerpo['title'] ?? '')), trim((string)($cuerpo['description'] ?? ''))]);
    responder(['ok' => true]);
  }
  if ($ruta === '/admin/mensajes' && $metodo === 'PUT') {
    $pdo->prepare('UPDATE form_submissions SET leido = ? WHERE id = ?')->execute([(int)($cuerpo['leido'] ?? 1), (int)($cuerpo['id'] ?? 0)]);
    responder(['ok' => true]);
  }
  /* ---------- CMS: contenido editable de páginas ---------- */
  if ($ruta === '/admin/paginas-editables' && $metodo === 'GET') {
    $dir = __DIR__ . '/datos/editables';
    $lista = [];
    foreach (glob($dir . '/*.json') as $f) {
      $d = json_decode((string)file_get_contents($f), true);
      if (!$d) continue;
      $key = basename($f, '.json');
      $pub = $pdo->prepare("SELECT COUNT(*) FROM content_overrides WHERE pagina=? AND estado='borrador'");
      $pub->execute([$key]);
      $lista[] = ['key' => $key, 'titulo' => $d['titulo'] ?? $key, 'slug' => $d['pagina'] ?? '', 'tipo' => $d['tipo'] ?? 'page', 'campos' => count($d['campos'] ?? []), 'borrador' => (int)$pub->fetchColumn() > 0];
    }
    usort($lista, fn($a, $b) => $a['key'] === '_global' ? -1 : ($b['key'] === '_global' ? 1 : strcmp($a['titulo'], $b['titulo'])));
    responder(['ok' => true, 'paginas' => $lista]);
  }
  if ($ruta === '/admin/pagina' && $metodo === 'GET') {
    $key = preg_replace('/[^a-z0-9_-]/i', '', (string)($_GET['key'] ?? ''));
    $f = __DIR__ . '/datos/editables/' . $key . '.json';
    if (!is_file($f)) fallar('Página no encontrada.', 404);
    $d = json_decode((string)file_get_contents($f), true);
    // aplicar borrador (o publicado) sobre los valores originales
    foreach (['publicado', 'borrador'] as $est) {
      $q = $pdo->prepare('SELECT campo, datos FROM content_overrides WHERE pagina=? AND estado=?');
      $q->execute([$key, $est]);
      $ov = [];
      foreach ($q as $r) $ov[$r['campo']] = json_decode($r['datos'], true);
      foreach ($d['campos'] as &$c) if (isset($ov[$c['id']])) foreach ($ov[$c['id']] as $k => $v) $c[$k] = $v;
      unset($c);
    }
    responder(['ok' => true, 'pagina' => $d]);
  }
  if ($ruta === '/admin/pagina' && $metodo === 'PUT') {
    $key = preg_replace('/[^a-z0-9_-]/i', '', (string)($cuerpo['key'] ?? ''));
    $cambios = $cuerpo['cambios'] ?? [];
    $publicar = !empty($cuerpo['publicar']);
    if ($key === '' || !is_array($cambios)) fallar('Datos incompletos.');
    $estados = $publicar ? ['borrador', 'publicado'] : ['borrador'];
    $ins = $pdo->prepare('INSERT INTO content_overrides (pagina, campo, datos, estado, modificado) VALUES (?,?,?,?,datetime("now"))
                          ON CONFLICT(pagina, campo, estado) DO UPDATE SET datos=excluded.datos, modificado=excluded.modificado');
    foreach ($cambios as $campo => $datos) {
      $campo = preg_replace('/[^a-z0-9:_-]/i', '', (string)$campo);
      $j = json_encode($datos, JSON_UNESCAPED_UNICODE);
      foreach ($estados as $e) $ins->execute([$key, $campo, $j, $e]);
    }
    if ($publicar) {
      // snapshot de versión
      $snap = $pdo->prepare("SELECT campo, datos FROM content_overrides WHERE pagina=? AND estado='publicado'");
      $snap->execute([$key]);
      $all = [];
      foreach ($snap as $r) $all[$r['campo']] = json_decode($r['datos'], true);
      $adm = of_sesion($pdo);
      $pdo->prepare('INSERT INTO content_versions (pagina, etiqueta, snapshot, autor, creado) VALUES (?,?,?,?,datetime("now"))')
          ->execute([$key, count($cambios) . ' cambio(s)', json_encode($all, JSON_UNESCAPED_UNICODE), $adm['display_name'] ?? 'panel']);
    }
    responder(['ok' => true, 'publicado' => $publicar,
      'mensaje' => $publicar ? 'Publicado. Se ve en el sitio en la próxima actualización (unos minutos).' : 'Borrador guardado.']);
  }
  if ($ruta === '/admin/versiones' && $metodo === 'GET') {
    $key = preg_replace('/[^a-z0-9_-]/i', '', (string)($_GET['key'] ?? ''));
    $q = $pdo->prepare('SELECT id, etiqueta, autor, creado FROM content_versions WHERE pagina=? ORDER BY id DESC LIMIT 30');
    $q->execute([$key]);
    responder(['ok' => true, 'versiones' => $q->fetchAll(PDO::FETCH_ASSOC)]);
  }
  if ($ruta === '/admin/restaurar' && $metodo === 'POST') {
    $id = (int)($cuerpo['id'] ?? 0);
    $v = $pdo->prepare('SELECT * FROM content_versions WHERE id=?'); $v->execute([$id]);
    $ver = $v->fetch(PDO::FETCH_ASSOC);
    if (!$ver) fallar('Versión no encontrada.', 404);
    $snap = json_decode($ver['snapshot'], true) ?: [];
    $pdo->prepare('DELETE FROM content_overrides WHERE pagina=?')->execute([$ver['pagina']]);
    $ins = $pdo->prepare('INSERT INTO content_overrides (pagina, campo, datos, estado, modificado) VALUES (?,?,?,?,datetime("now"))');
    foreach ($snap as $campo => $datos) foreach (['borrador', 'publicado'] as $e) $ins->execute([$ver['pagina'], $campo, json_encode($datos, JSON_UNESCAPED_UNICODE), $e]);
    responder(['ok' => true, 'mensaje' => 'Versión restaurada. Se aplica en la próxima actualización del sitio.']);
  }

  /* ---------- CMS: tema, sitio, medios ---------- */
  if ($ruta === '/admin/ajustes' && $metodo === 'GET') {
    $tema = json_decode((string)file_get_contents(__DIR__ . '/datos/theme.json'), true) ?? [];
    $sitio = json_decode((string)file_get_contents(__DIR__ . '/datos/site.json'), true) ?? [];
    foreach ($pdo->query("SELECT clave, valor FROM settings") as $r) {
      if ($r['clave'] === 'tema') $tema = array_replace_recursive($tema, json_decode($r['valor'], true) ?: []);
      if ($r['clave'] === 'sitio') $sitio = array_replace_recursive($sitio, json_decode($r['valor'], true) ?: []);
    }
    responder(['ok' => true, 'tema' => $tema, 'sitio' => $sitio]);
  }
  if ($ruta === '/admin/ajustes' && $metodo === 'PUT') {
    $clave = in_array($cuerpo['clave'] ?? '', ['tema', 'sitio'], true) ? $cuerpo['clave'] : null;
    if (!$clave || !is_array($cuerpo['valor'] ?? null)) fallar('Datos inválidos.');
    $pdo->prepare('INSERT INTO settings (clave, valor, modificado) VALUES (?,?,datetime("now")) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor, modificado=excluded.modificado')
        ->execute([$clave, json_encode($cuerpo['valor'], JSON_UNESCAPED_UNICODE)]);
    responder(['ok' => true, 'mensaje' => 'Guardado. Se aplica en la próxima actualización del sitio.']);
  }
  if ($ruta === '/admin/media' && $metodo === 'POST') {
    $data = (string)($cuerpo['archivo'] ?? '');
    $nombre = preg_replace('/[^a-z0-9._-]/i', '-', (string)($cuerpo['nombre'] ?? 'imagen'));
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp|gif|svg\+xml);base64,#', $data, $m)) fallar('Formato de imagen no válido.');
    $bin = base64_decode(substr($data, strpos($data, ',') + 1));
    if ($bin === false || strlen($bin) > 12 * 1024 * 1024) fallar('Imagen inválida o muy grande (máx 12 MB).');
    $ext = str_replace(['jpeg', 'svg+xml'], ['jpg', 'svg'], $m[1]);
    $dir = dirname(__DIR__) . '/media';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $base = pathinfo($nombre, PATHINFO_FILENAME);
    $file = $base . '-' . substr(md5($bin), 0, 8) . '.' . $ext;
    // optimización simple con GD (redimensiona si es enorme y recomprime)
    if ($ext !== 'svg' && function_exists('imagecreatefromstring') && strlen($bin) > 300 * 1024) {
      $img = @imagecreatefromstring($bin);
      if ($img) {
        $w = imagesx($img); $h = imagesy($img);
        if ($w > 1600) { $nh = (int)($h * 1600 / $w); $tmp = imagecreatetruecolor(1600, $nh); imagecopyresampled($tmp, $img, 0, 0, 0, 0, 1600, $nh, $w, $h); imagedestroy($img); $img = $tmp; }
        ob_start();
        if ($ext === 'png') imagepng($img, null, 8); elseif ($ext === 'webp') imagewebp($img, null, 82); else imagejpeg($img, null, 82);
        $bin = ob_get_clean(); imagedestroy($img);
      }
    }
    file_put_contents($dir . '/' . $file, $bin);
    responder(['ok' => true, 'url' => '/media/' . $file, 'peso' => strlen($bin)]);
  }

  if ($ruta === '/admin/resumen' && $metodo === 'GET') {
    responder(['ok' => true,
      'pedidosPendientes' => (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE estado IN ('pendiente','wc-processing')")->fetchColumn(),
      'mensajesNoLeidos' => (int)$pdo->query('SELECT COUNT(*) FROM form_submissions WHERE leido = 0')->fetchColumn(),
      'cambiosPendientes' => (int)$pdo->query("SELECT COUNT(*) FROM product_overrides WHERE nombre IS NOT NULL OR descripcion IS NOT NULL OR imagen IS NOT NULL")->fetchColumn()
        + (int)$pdo->query('SELECT COUNT(*) FROM pages_seo')->fetchColumn(),
      'ultimosPedidos' => $pdo->query('SELECT numero, estado, total, creado FROM orders ORDER BY id DESC LIMIT 5')->fetchAll(PDO::FETCH_ASSOC),
      'ultimosMensajes' => $pdo->query('SELECT id, formulario, creado, leido FROM form_submissions ORDER BY id DESC LIMIT 5')->fetchAll(PDO::FETCH_ASSOC),
    ]);
  }

  fallar('Ruta no encontrada.', 404);
} catch (Throwable $e) {
  if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok' => false, 'mensaje' => 'Error del servidor.']);
}
