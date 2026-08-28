import { defineConfig } from 'astro/config';

// Sitio público de ofitodo.com — 100 % pre-renderizado (regla dura #4: nada de SPA en indexables).
// Islas de interactividad (búsqueda, carrito) en JS vanilla — sin frameworks en lo público.
export default defineConfig({
  site: 'https://ofitodo.com',
  output: 'static',
  trailingSlash: 'always', // el original fuerza trailing slash con 301
  build: { format: 'directory' },
});
