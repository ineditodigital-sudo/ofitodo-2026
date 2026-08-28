import { z } from 'zod';

// ---------- Config global del sitio (content/site.json) ----------
export const SiteConfig = z.object({
  nombre: z.string().min(1),
  tagline: z.string(),
  dominio: z.string().url(),
  idioma: z.literal('es'),
  contacto: z.object({
    telefonos: z.array(z.string()),
    whatsapp: z.string(),
    whatsappMensaje: z.string(),
    correoVentas: z.string().email(),
    correoFormularios: z.string().email(),
  }),
  redes: z.record(z.string(), z.string().url()),
  analitica: z.object({
    gtm: z.string(),
    ga4: z.string(),
    googleAds: z.array(z.string()),
    googleTag: z.string(),
  }),
  comercio: z.object({
    moneda: z.literal('MXN'),
    pais: z.literal('MX'),
    metodoPago: z.literal('contra-entrega'),
  }),
});
export type SiteConfig = z.infer<typeof SiteConfig>;

// ---------- Tokens de tema (content/theme.json) ----------
export const ThemeTokens = z.object({
  colores: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  tipografias: z.record(z.string(), z.string()),
  breakpoints: z.array(z.number().int().positive()),
  nota: z.string().optional(),
});
export type ThemeTokens = z.infer<typeof ThemeTokens>;

// ---------- Redirecciones (content/redirects.json) ----------
export const Redirects = z.object({
  comentario: z.string().optional(),
  redirects: z.array(z.object({
    de: z.string().startsWith('/'),
    a: z.string().startsWith('/'),
    codigo: z.union([z.literal(301), z.literal(302), z.literal(410)]),
  })),
  gone410: z.array(z.string()),
});
export type Redirects = z.infer<typeof Redirects>;

// ---------- Secciones tipadas de página (se amplía en Fase S por plantilla) ----------
export const Seo = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  canonical: z.string().optional(),
  robots: z.string().default('index, follow'),
  ogImage: z.string().optional(),
  schema: z.unknown().optional(),
});

const base = { visible: z.boolean().default(true) };
export const Section = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('html-heredado'), ...base, html: z.string() }), // muleta temporal de conversión; debe quedar en 0 al final de Fase S
]);
export type Section = z.infer<typeof Section>;

// ---------- Página congelada (enfoque híbrido Fase S) ----------
// El HTML renderizado de la referencia ES la página (paridad por construcción);
// se sirve transformado (islas activas, SDKs de pago retirados). Se componetiza después.
export const FrozenPage = z.object({
  slug: z.string().startsWith('/'),
  locale: z.literal('es'),
  title: z.string(),
  template: z.literal('frozen'),
  htmlRef: z.string(),              // archivo en reference/html/
  tipo: z.enum(['page', 'post', 'system']),
  status: z.enum(['publish']),
  legacyId: z.number().int().optional(),
  date: z.string().optional(),
  modified: z.string().optional(),
  seo: z.object({ title: z.string(), description: z.string().nullable() }),
});
export type FrozenPage = z.infer<typeof FrozenPage>;

export const PageContent = z.object({
  slug: z.string().startsWith('/'),
  locale: z.literal('es'),
  title: z.string().min(1),
  template: z.string(),
  status: z.enum(['publish', 'draft']),
  date: z.string(),
  modified: z.string(),
  legacyId: z.number().int().optional(),
  featuredImage: z.string().optional(),
  seo: Seo,
  sections: z.array(Section),
});
export type PageContent = z.infer<typeof PageContent>;
