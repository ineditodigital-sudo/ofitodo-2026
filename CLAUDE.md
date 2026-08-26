# Ofitodo 2026 — migración WordPress → estático + API + panel

Constitución del repo. El detalle vive en `docs/`. **Al retomar: leer `docs/estado.md` primero.**

## Reglas duras
1. **Cero pérdida y URLs idénticas** al original (referencia congelada en `reference/`). Excepciones solo en `docs/excepciones.md` firmadas por Cristian.
2. **Cambiar un slug crea su 301** en `content/redirects.json`. Sin excepciones.
3. **Nada de SPA en páginas públicas indexables**: HTML en build (Astro); islas React solo con interactividad.
4. **Primero paridad, luego mejoras.** Nada visual cambia hasta paridad 100 %. Mejoras solo en `docs/mejoras-candidatas.md` aprobadas.
5. **No inventar contenido.** Ni textos, ni alt, ni metas. Lo que falte se reporta.
6. **Secretos solo en `.env` y GitHub Secrets.** Nunca en código, docs ni commits.
7. **Todo por Git**: rama → PR → `main`. Deploy a prod solo con tag `v*` + aprobación de Cristian + respaldo previo.
8. **Editorial en `content/` (repo); operativo en DB.** El panel es la única UI humana de edición.
9. No tocar `SITIO WEB OLD OFITODO/` ni el `.tar.gz` (backup original, fuera de Git).
10. Reportes en español, breves, con tablas. Formato en `docs/00-prompt-maestro.md` §13.

## Arquitectura (aprobada, ver docs/03-arquitectura.md)
- `apps/site` — Astro + islas React → estático por FTPS (staging: temporal.ofitodo.com).
- `apps/api` — Hono en Cloudflare Workers (`/api/*`) + Drizzle → PostgreSQL Neon.
- `apps/admin` — panel React (`/admin`), 1 rol administrador.
- `packages/schema` (zod compartido) · `packages/ui` (componentes sitio+panel).
- Correo: mismo SMTP del original (from formularios@ofitodo.com → ventasofitodo@hotmail.com).
- Pago: SOLO contra entrega (excepción #1). `/wp-json/*` → 410 (excepción #3).

## Comandos
- `npm run build` / `npm run typecheck` / `npm test` — todo el monorepo.
- `npm run content:validate` — valida `content/` contra `packages/schema`.
- `npm run wp:extract` / `wp:crawl` / `wp:inventory` — regenerar referencia (ya congelada).

## Punteros
- Estado y bitácora → `docs/estado.md` · Metodología y fases → `docs/00-prompt-maestro.md`
- Qué existe en el original → `docs/01-diagnostico.md`, `docs/02-inventario.md`, `reference/urls-inventario.csv`
- Se rompió algo / deploy → `docs/06-cutover.md`, `docs/07-rollback.md` (Fase A)
