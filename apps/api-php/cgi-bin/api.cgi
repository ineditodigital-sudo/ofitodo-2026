#!/bin/sh
# Puente CGI -> PHP para la API (el vhost del subdominio no tiene pool PHP-FPM).
export REDIRECT_STATUS=200
export SCRIPT_FILENAME="$DOCUMENT_ROOT/api/index.php"
exec /opt/cpanel/ea-php81/root/usr/bin/php-cgi
