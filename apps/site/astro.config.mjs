import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Sitio público de ofitodo.com — 100 % pre-renderizado (regla dura #4: nada de SPA en indexables).
export default defineConfig({
  site: 'https://ofitodo.com',
  output: 'static',
  trailingSlash: 'always', // el original fuerza trailing slash con 301
  integrations: [react()],
  build: { format: 'directory' },
});
