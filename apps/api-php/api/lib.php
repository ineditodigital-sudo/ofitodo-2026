<?php
/** Utilidades de la API PHP: SQLite, autenticación WP (phpass $P$ y bcrypt $wp$), correo. */
declare(strict_types=1);

function responder(array $d, int $code = 200): never {
  http_response_code($code);
  echo json_encode($d, JSON_UNESCAPED_UNICODE);
  exit;
}
function fallar(string $msj, int $code = 400): never {
  responder(['ok' => false, 'mensaje' => $msj], $code);
}
function sanear(string $s): string {
  return str_replace(["\r", "\n"], ' ', strip_tags($s));
}

function of_db(): PDO {
  $dir = __DIR__ . '/datos';
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $pdo = new PDO('sqlite:' . $dir . '/ofitodo.sqlite');
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec('PRAGMA journal_mode=WAL');
  $pdo->exec('CREATE TABLE IF NOT EXISTS form_submissions (id INTEGER PRIMARY KEY, formulario TEXT, datos TEXT, pagina TEXT, creado TEXT, leido INTEGER DEFAULT 0)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, numero INTEGER UNIQUE, estado TEXT, total REAL, cliente TEXT, items TEXT, creado TEXT)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS product_overrides (slug TEXT PRIMARY KEY, precio REAL, stock TEXT)');
  foreach (['nombre TEXT', 'descripcion TEXT', 'imagen TEXT', 'modificado TEXT'] as $col) {
    try { $pdo->exec("ALTER TABLE product_overrides ADD COLUMN {$col}"); } catch (Throwable $e) {}
  }
  $pdo->exec('CREATE TABLE IF NOT EXISTS pages_seo (slug TEXT PRIMARY KEY, title TEXT, description TEXT, modificado TEXT)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, login TEXT UNIQUE, email TEXT, display_name TEXT, hash_legacy TEXT, hash_nuevo TEXT)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, admin_id INTEGER, expira TEXT)');
  // Semilla: los 6 pedidos históricos de WooCommerce (§6.2, totales al centavo desde postmeta)
  if ((int)$pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn() === 0) {
    $hist = json_decode((string)file_get_contents(__DIR__ . '/datos/pedidos-historicos.json'), true) ?? [];
    $ins = $pdo->prepare('INSERT INTO orders (numero, estado, total, cliente, items, creado) VALUES (?,?,?,?,?,?)');
    foreach ($hist as $h) {
      $ins->execute([$h['numero'], $h['estado'], $h['total'],
        json_encode($h['cliente'], JSON_UNESCAPED_UNICODE), json_encode($h['items'], JSON_UNESCAPED_UNICODE), $h['fecha']]);
    }
  }
  // Semilla: los 3 administradores reales de WordPress con su hash original (login transparente §6.1)
  if ((int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() === 0) {
    $ins = $pdo->prepare('INSERT INTO admins (login, email, display_name, hash_legacy) VALUES (?,?,?,?)');
    $ins->execute(['emumch', 'ofitodo@ip-72-167-32-121.ip.secureserver.net', 'admin', '$P$BQkRFO0NgO07zrUGosLOj2KNB3qgZN1']);
    $ins->execute(['developer', 'oscar.camarillo@maindsoft.net', 'developer', '$wp$2y$10$3HTnvJuoxRbrym9iNzqrQecCKudnut7KcyUGWBq6GQ/lMZNLq4Z9y']);
    $ins->execute(['Marketing', 'ventas.online@ofitodo.com', 'marketing ofitodo', '$wp$2y$10$F6FySwAKmtjykZ3P/NP4bOo7tRpqmHmpLMewiQmKp3D2wNRKmS22C']);
  }
  // SOLO STAGING: cuenta de prueba del panel (se elimina en el cutover, docs/06-cutover.md)
  if (defined('EN_STAGING') && EN_STAGING) {
    $q = $pdo->prepare('SELECT COUNT(*) FROM admins WHERE login = ?');
    $q->execute(['panel-prueba']);
    if (!(int)$q->fetchColumn()) {
      $pdo->prepare('INSERT INTO admins (login, email, display_name, hash_legacy, hash_nuevo) VALUES (?,?,?,?,?)')
          ->execute(['panel-prueba', 'cristian.castaneda@maindsoft.net', 'Cuenta de prueba', '', password_hash('Ofitodo!Prueba26', PASSWORD_DEFAULT)]);
    }
  }
  return $pdo;
}

/** Catálogo de precios (JSON del build) + overrides del panel. */
function of_precios(PDO $pdo): array {
  $base = json_decode((string)file_get_contents(__DIR__ . '/datos/precios.json'), true) ?? [];
  $map = [];
  foreach ($base as $p) $map[$p['slug']] = ['slug' => $p['slug'], 'nombre' => $p['nombre'], 'sku' => $p['sku'], 'precio' => $p['precio'], 'imagen' => $p['imagenFull'] ?? null, 'stock' => 'instock', 'pendiente' => false];
  foreach ($pdo->query('SELECT * FROM product_overrides') as $o) {
    if (!isset($map[$o['slug']])) continue;
    $m = &$map[$o['slug']];
    if ($o['precio'] !== null) $m['precio'] = (float)$o['precio'];
    if (!empty($o['stock'])) $m['stock'] = $o['stock'];
    if (!empty($o['nombre'])) $m['nombre'] = $o['nombre'];
    if (!empty($o['descripcion'])) $m['descripcion'] = $o['descripcion'];
    if (!empty($o['imagen'])) $m['imagen'] = $o['imagen'];
    $m['pendiente'] = !empty($o['nombre']) || !empty($o['descripcion']) || !empty($o['imagen']);
    unset($m);
  }
  return $map;
}

/** Verificación de contraseña WordPress: phpass portable ($P$) y bcrypt WP ≥ 6.8 ($wp$2y$). */
function of_verificar_password(string $pass, array $adm): bool {
  if ($adm['hash_nuevo'] && password_verify($pass, $adm['hash_nuevo'])) return true;
  $h = (string)$adm['hash_legacy'];
  if (str_starts_with($h, '$wp$')) {
    $pre = base64_encode(hash_hmac('sha384', $pass, 'wp-sha384', true));
    return password_verify($pre, substr($h, 3));
  }
  if (str_starts_with($h, '$P$')) return of_phpass($pass, $h) === $h;
  return password_verify($pass, $h);
}

/** phpass portable (algoritmo de WordPress clásico). */
function of_phpass(string $password, string $setting): string {
  $itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  $count_log2 = strpos($itoa64, $setting[3]);
  if ($count_log2 < 7 || $count_log2 > 30) return '*';
  $count = 1 << $count_log2;
  $salt = substr($setting, 4, 8);
  if (strlen($salt) !== 8) return '*';
  $hash = md5($salt . $password, true);
  do { $hash = md5($hash . $password, true); } while (--$count);
  $output = substr($setting, 0, 12);
  // encode64
  $i = 0; $c = strlen($hash);
  do {
    $value = ord($hash[$i++]);
    $output .= $itoa64[$value & 0x3f];
    if ($i < $c) $value |= ord($hash[$i]) << 8;
    $output .= $itoa64[($value >> 6) & 0x3f];
    if ($i++ >= $c) break;
    if ($i < $c) $value |= ord($hash[$i]) << 16;
    $output .= $itoa64[($value >> 12) & 0x3f];
    if ($i++ >= $c) break;
    $output .= $itoa64[($value >> 18) & 0x3f];
  } while ($i < $c);
  return $output;
}

function of_sesion(PDO $pdo): ?array {
  $t = $_COOKIE['of_admin'] ?? '';
  if (!$t) return null;
  $q = $pdo->prepare('SELECT a.* FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = ? AND s.expira > datetime("now")');
  $q->execute([$t]);
  return $q->fetch(PDO::FETCH_ASSOC) ?: null;
}

function of_mail(string $para, string $asunto, string $texto, string $de): void {
  $cab = "From: Ofitodo <{$de}>\r\nReply-To: {$de}\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: ofitodo-api";
  @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $texto, $cab);
}
