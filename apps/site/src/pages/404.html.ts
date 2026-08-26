// Página 404 real del original (referencia congelada) con islas activas.
import type { APIRoute } from 'astro';
import { refHtml } from '../lib/contenido.ts';
import { congelada } from '../lib/transformar.ts';

export const GET: APIRoute = () =>
  new Response(congelada(refHtml('url-inexistente-para-404-xyz.html')), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
