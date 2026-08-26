// preparar-staging: arma dist-staging/ = sitio (Astro) + API PHP + panel + config de staging.
// Luego: node scripts/deploy-ftps.mjs dist-staging
import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-staging');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. Sitio estático (build de Astro)
cpSync(path.join(ROOT, 'apps', 'site', 'dist'), OUT, { recursive: true });

// 2. API PHP + catálogo de precios (verdad del servidor para pedidos)
cpSync(path.join(ROOT, 'apps', 'api-php', 'api'), path.join(OUT, 'api'), { recursive: true });
copyFileSync(path.join(ROOT, 'content', 'catalogo', 'indice-busqueda.json'), path.join(OUT, 'api', 'datos', 'precios.json'));

// 3. Panel (si ya está construido)
const admin = path.join(ROOT, 'apps', 'admin', 'dist');
if (existsSync(admin)) cpSync(admin, path.join(OUT, 'admin'), { recursive: true });

// 4. Configuración de STAGING: noindex + API + 404 del tema (el vhost da 500 en rutas
//    inexistentes antes del ErrorDocument, ver docs/04-preview-staging.md → fallback rewrite)
writeFileSync(path.join(OUT, '.htaccess'), `# STAGING temporal.ofitodo.com — no indexar nunca
Header set X-Robots-Tag "noindex, nofollow"
DirectoryIndex index.html
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
RewriteEngine On
# API dinámica (PHP)
RewriteRule ^api(/.*)?$ /api/index.php [L,QSA]
# Panel SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^admin(/.*)?$ /admin/index.html [L]
# Redirecciones del original
RewriteRule ^inicio/?$ / [R=301,L]
RewriteRule ^wp-login\\.php$ /admin/ [R=301,L]
RewriteRule ^wp-admin(/.*)?$ /admin/ [R=301,L]
# Retiradas (docs/excepciones.md #3): 410
RewriteRule ^wp-json(/.*)?$ - [G,L]
RewriteRule ^xmlrpc\\.php$ - [G,L]
RewriteRule ^wp-cron\\.php$ - [G,L]
# Rutas inexistentes → página 404 del tema (soft-404 SOLO en staging)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /404.html [L]
</IfModule>
`);
writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

console.log('dist-staging listo (sitio + api + panel + config staging).');
