// preparar-produccion: arma dist-prod/ para el cutover (docs/06-cutover.md).
// Igual que staging PERO: sin noindex, robots real, 404 real, correos a producción.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-prod');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(path.join(ROOT, 'apps', 'site', 'dist'), OUT, { recursive: true });
cpSync(path.join(ROOT, 'apps', 'api-php', 'api'), path.join(OUT, 'api'), { recursive: true });
cpSync(path.join(ROOT, 'apps', 'api-php', 'cgi-bin'), path.join(OUT, 'cgi-bin'), { recursive: true });
copyFileSync(path.join(ROOT, 'content', 'catalogo', 'indice-busqueda.json'), path.join(OUT, 'api', 'datos', 'precios.json'));
const paginas = [];
for (const col of ['pages', 'posts']) {
  const dir = path.join(ROOT, 'content', 'es', col);
  for (const f of (existsSync(dir) ? readdirSync(dir) : []).filter((x) => x.endsWith('.json'))) {
    const p = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    paginas.push({ slug: p.slug, tipo: p.tipo, title: p.seo.title, description: p.seo.description });
  }
}
writeFileSync(path.join(OUT, 'api', 'datos', 'paginas.json'), JSON.stringify(paginas, null, 1));
cpSync(path.join(ROOT, 'content', 'editables'), path.join(OUT, 'api', 'datos', 'editables'), { recursive: true });
copyFileSync(path.join(ROOT, 'content', 'theme.json'), path.join(OUT, 'api', 'datos', 'theme.json'));
copyFileSync(path.join(ROOT, 'content', 'site.json'), path.join(OUT, 'api', 'datos', 'site.json'));
const admin = path.join(ROOT, 'apps', 'admin', 'dist');
if (existsSync(admin)) cpSync(admin, path.join(OUT, 'admin'), { recursive: true });

// correos a producción
const idx = path.join(OUT, 'api', 'index.php');
writeFileSync(idx, readFileSync(idx, 'utf8').replace('const EN_STAGING = true;', 'const EN_STAGING = false;'));

// 301 desde content/redirects.json (incluye los que crea el panel al cambiar un slug)
const red = JSON.parse(readFileSync(path.join(ROOT, 'content', 'redirects.json'), 'utf8'));
const esc = (s) => s.replace(/([.\\])/g, '\\$1');
const reglas301 = red.redirects
  .filter((r) => r.codigo === 301 && !/^\/(inicio|wp-login|wp-admin)/.test(r.de))
  .map((r) => `RewriteRule ^${esc(r.de.replace(/^\//, ''))}$ ${r.a} [R=301,L]`)
  .join('\n');

// .htaccess de PRODUCCIÓN: 404 real, redirecciones, 410, caché larga para assets
writeFileSync(path.join(OUT, '.htaccess'), `# ofitodo.com — sitio estático + API (generado por preparar-produccion)
DirectoryIndex index.html
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
RewriteEngine On
# /api vía puente CGI → php-cgi (verificado en el cutover; el handler LSAPI directo daba 500)
RewriteRule ^api(/.*)?$ /cgi-bin/api.cgi [L,QSA]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^admin(/.*)?$ /admin/index.html [L]
RewriteRule ^inicio/?$ / [R=301,L]
RewriteRule ^wp-login\\.php$ /admin/ [R=301,L]
RewriteRule ^wp-admin(/.*)?$ /admin/ [R=301,L]
${reglas301}
RewriteRule ^wp-json(/.*)?$ - [G,L]
RewriteRule ^xmlrpc\\.php$ - [G,L]
RewriteRule ^wp-cron\\.php$ - [G,L]
RewriteRule ^feed/?$ - [G,L]
RewriteRule ^comments/feed/?$ - [G,L]
# atajos ?p= / ?page_id= del original → portada (mapa completo: mejora M1 pendiente)
RewriteCond %{QUERY_STRING} ^(p|page_id|product)=
RewriteRule ^$ /? [R=301,L]
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
# El HTML NO se cachea: el nginx del hosting guardaba las páginas por URL y
# seguía sirviendo la versión anterior tras cada publicación (por eso "borré
# la caché y no veo cambios"). Las hojas y scripts llevan hash en el nombre,
# así que pueden cachearse durante mucho tiempo sin riesgo.
ExpiresByType text/html "access plus 0 seconds"
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType text/css "access plus 1 year"
ExpiresByType application/javascript "access plus 1 year"
</IfModule>
<IfModule mod_headers.c>
<FilesMatch "\\.html$">
Header set Cache-Control "public, max-age=0, must-revalidate"
Header unset Pragma
</FilesMatch>
# Los archivos versionados por hash son inmutables
<FilesMatch "\\.[0-9a-f]{8}\\.(css|js)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
</IfModule>
# El manifiesto de despliegue no es contenido del sitio
<Files ".deploy-manifest.json">
Require all denied
</Files>

# =========================================================================
#  BLINDAJE
#  El sitio es estático. Lo único que ejecuta código es /cgi-bin/api.cgi,
#  que lanza php-cgi como subproceso (no pasa por el manejador de Apache).
#  Por eso se puede cerrar PHP por completo sin tocar la API.
# =========================================================================

# Sin listados de directorio. (No se toca FollowSymLinks: algunos hosts
# compartidos lo necesitan para mod_rewrite y quitarlo provoca un 500.)
Options -Indexes

# --- Ningún archivo ejecutable es accesible por HTTP ---------------------
# Cubre wp-config.php, cualquier .php de WordPress y cualquier puerta trasera
# que alguien deje caer: ni se ejecuta ni se lee su código fuente.
# api.cgi queda fuera por el paréntesis negativo: es el puente de la API.
<FilesMatch "^(?!api\\.cgi$).*\\.(php|php[0-9]|phtml|pht|phps|phar|shtml|cgi|pl|py|sh|asp|aspx|jsp)$">
Require all denied
</FilesMatch>

# --- Archivos que nunca deben servirse -----------------------------------
# .well-known queda fuera: lo usan la validación de certificados y otros
# servicios; bloquearlo rompería la renovación del SSL.
<FilesMatch "\\.(env|ini|log|sql|sqlite|db|bak|old|orig|save|swp|tar|gz|zip|rar|7z|cnf|lock|pem|key|crt)$|~$">
Require all denied
</FilesMatch>
<FilesMatch "^(wp-config|wp-config-sample|readme|license|changelog|error_log|debug)\\.">
Require all denied
</FilesMatch>

<IfModule mod_rewrite.c>
# --- Nada ejecutable sale de la carpeta de medios (vector clásico) -------
RewriteRule ^wp-content/uploads/.*\\.(php|phtml|pht|phar|cgi|pl|py|sh)$ - [F,L]

# --- Puntos de entrada de WordPress ya sin uso ---------------------------
RewriteRule ^wp-(content|includes)/.*\\.(php|phtml|phar)$ - [F,L]
RewriteRule ^(wp-signup|wp-activate|wp-trackback|wp-links-opml|wp-mail|wp-comments-post|wp-load|wp-settings|wp-blog-header)\\.php$ - [F,L]
RewriteRule ^wp-content/(plugins|themes|mu-plugins|upgrade)/?$ - [F,L]

# --- Sondas típicas de escaneo automatizado ------------------------------
RewriteRule ^(\\.git|\\.svn|vendor|node_modules)(/|$) - [F,L]
RewriteRule ^(adminer|phpmyadmin|pma|myadmin|shell|c99|r57|wso|alfa|filemanager)(/|$) - [F,L]
</IfModule>

# --- Cabeceras de seguridad ----------------------------------------------
<IfModule mod_headers.c>
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
Header set X-Frame-Options "SAMEORIGIN"
Header set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()"
# HSTS sin includeSubDomains: los subdominios (temporal.*) van aparte
Header always set Strict-Transport-Security "max-age=31536000"
Header unset X-Powered-By
Header unset X-Pingback
</IfModule>

# El manejador PHP de cPanel se retira a propósito: nada debe ejecutar PHP
# por Apache. La API va por /cgi-bin/api.cgi → php-cgi (subproceso).
`);
// robots real ya viene de apps/site/public/robots.txt (copiado con dist)
console.log('dist-prod listo para el cutover (docs/06-cutover.md).');
