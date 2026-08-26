import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { PageContent } from '@ofitodo/schema';

// Colecciones editoriales: archivos JSON en content/es/* (fuente de verdad en el repo).
// Se llenan durante la conversión (Fase S); el build valida contra el esquema zod.
export const collections = {
  paginas: defineCollection({
    loader: glob({ pattern: '**/*.json', base: '../../content/es/pages' }),
    schema: PageContent,
  }),
  posts: defineCollection({
    loader: glob({ pattern: '**/*.json', base: '../../content/es/posts' }),
    schema: PageContent,
  }),
};
