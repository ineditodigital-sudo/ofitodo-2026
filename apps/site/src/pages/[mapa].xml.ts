// Sitemaps con la MISMA estructura y nombres que Yoast en el original (M1):
// se sirven desde la referencia congelada; al cambiar contenido se regeneran en wp-convert.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MAPAS = ['sitemap_index', 'post-sitemap', 'page-sitemap', 'product-sitemap',
  'elementor-hf-sitemap', 'category-sitemap', 'product_brand-sitemap',
  'product_cat-sitemap', 'product_tag-sitemap', 'author-sitemap'];

export function getStaticPaths() {
  return MAPAS.map((m) => ({ params: { mapa: m } }));
}

export const GET: APIRoute = ({ params }) => {
  const f = path.resolve(process.cwd(), '..', '..', 'reference', 'sitemaps', `${params.mapa}.xml`);
  const xml = readFileSync(f, 'utf8').replace(/<\?xml-stylesheet[^?]*\?>\s*/, '');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
