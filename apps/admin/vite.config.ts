import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Panel de administración — se sirve bajo /admin/ (mismo dominio que la API).
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8787' }, // wrangler dev de apps/api
  },
});
