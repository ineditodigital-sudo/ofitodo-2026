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
const admin = path.join(ROOT, 'apps', 'admin', 'dist');
if (existsSync(admin)) cpSync(admin, path.join(OUT, 'admin'), { recursive: true });

// correos a producción
const idx = path.join(OUT, 'api', 'index.php');
writeFileSync(idx, readFileSync(idx, 'utf8').replace('const EN_STAGING = true;', 'const EN_STAGING = false;'));

// .htaccess de PRODUCCIÓN: 404 real, redirecciones, 410, caché larga para assets
writeFileSync(path.join(OUT, '.htaccess'), `# ofitodo.com — sitio estático + API (generado por preparar-produccion)
DirectoryIndex index.html
AddDefaultCharset UTF-8
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
RewriteEngine On
# En producción el dominio principal SÍ tiene PHP-FPM (WordPress corría ahí):
# se usa index.php directo; el puente CGI queda de respaldo (/cgi-bin/api.cgi)
RewriteRule ^api(/.*)?$ /api/index.php [L,QSA]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^admin(/.*)?$ /admin/index.html [L]
RewriteRule ^inicio/?$ / [R=301,L]
RewriteRule ^wp-login\\.php$ /admin/ [R=301,L]
RewriteRule ^wp-admin(/.*)?$ /admin/ [R=301,L]
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
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType text/css "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
</IfModule>
<IfModule mod_headers.c>
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`);
// robots real ya viene de apps/site/public/robots.txt (copiado con dist)
console.log('dist-prod listo para el cutover (docs/06-cutover.md).');
