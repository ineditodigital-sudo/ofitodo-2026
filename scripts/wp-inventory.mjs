// wp-inventory: genera docs/02-inventario.md desde reference/db-export/ (+ crawl si existe).
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unserialize } from 'php-serialize';

const ROOT = path.resolve(import.meta.dirname, '..');
const DB = (t) => JSON.parse(readFileSync(path.join(ROOT, 'reference', 'db-export', `${t}.json`), 'utf8'));
const un = (s) => { try { return unserialize(s); } catch { return s; } };

const posts = DB('posts');
const postmeta = DB('postmeta');
const options = DB('options');
const terms = DB('terms');
const tt = DB('term_taxonomy');
const tr = DB('term_relationships');
const comments = DB('comments');
const users = DB('users');
const nfForms = DB('nf3_forms');
const nfFields = DB('nf3_fields');
const nfFieldMeta = DB('nf3_field_meta');
const nfActions = DB('nf3_actions');
const nfActionMeta = DB('nf3_action_meta');
const snippets = DB('snippets');
const orderStats = existsSync(path.join(ROOT, 'reference', 'db-export', 'wc_order_stats.json')) ? DB('wc_order_stats') : [];
const orderProducts = existsSync(path.join(ROOT, 'reference', 'db-export', 'wc_order_product_lookup.json')) ? DB('wc_order_product_lookup') : [];

const opt = (name) => options.find(o => o.option_name === name)?.option_value;
const metaOf = (pid) => Object.fromEntries(postmeta.filter(m => m.post_id === pid).map(m => [m.meta_key, m.meta_value]));
const termById = Object.fromEntries(terms.map(t => [t.term_id, t]));
const ttByTerm = Object.fromEntries(tt.map(x => [x.term_taxonomy_id, x]));

const L = [];
const p = (...s) => L.push(...s);

p('# 02 — Inventario (Fase C2)', '', `**Generado:** ${process.argv[2] || 'wp-inventory'} · Fuentes: \`reference/db-export/\` (backup 2026-08-25) + rastreo del sitio vivo.`, '');

// ---- Contenido publicado por tipo ----
const byType = {};
for (const post of posts) (byType[post.post_type] ??= {})[post.post_status] = ((byType[post.post_type] ??= {})[post.post_status] || 0) + 1;
p('## Contenido por tipo y estado', '', '| post_type | publish | draft | otros |', '|---|---|---|---|');
for (const [t, st] of Object.entries(byType).sort((a, b) => (b[1].publish || 0) - (a[1].publish || 0))) {
  const otros = Object.entries(st).filter(([k]) => !['publish', 'draft'].includes(k)).map(([k, v]) => `${k}:${v}`).join(' ');
  p(`| ${t} | ${st.publish || 0} | ${st.draft || 0} | ${otros} |`);
}
p('');

// ---- Páginas publicadas con plantilla ----
p('## Páginas publicadas', '', '| slug | título | plantilla | builder |', '|---|---|---|---|');
for (const pg of posts.filter(x => x.post_type === 'page' && x.post_status === 'publish').sort((a, b) => a.post_name.localeCompare(b.post_name))) {
  const m = metaOf(pg.ID);
  const builder = m._elementor_edit_mode === 'builder' ? 'Elementor' : /\[vc_row|\[mkd|\[vc_/.test(pg.post_content) ? 'WPBakery/mkd' : (pg.post_content.includes('<!-- wp:') ? 'Gutenberg' : 'clásico');
  p(`| /${pg.post_name}/ | ${pg.post_title.replaceAll('|', '\\|')} | ${m._wp_page_template || 'default'} | ${builder} |`);
}
p('');

// ---- Posts ----
p('## Entradas de blog publicadas', '', '| slug | título | fecha |', '|---|---|---|');
for (const b of posts.filter(x => x.post_type === 'post' && x.post_status === 'publish').sort((a, b) => b.post_date.localeCompare(a.post_date)))
  p(`| /${b.post_name}/ | ${b.post_title.replaceAll('|', '\\|')} | ${b.post_date.slice(0, 10)} |`);
p('');

// ---- Taxonomías ----
p('## Taxonomías', '', '| taxonomía | términos | con contenido |', '|---|---|---|');
const taxCount = {};
for (const x of tt) (taxCount[x.taxonomy] ??= { n: 0, used: 0 }, taxCount[x.taxonomy].n++, x.count > 0 && taxCount[x.taxonomy].used++);
for (const [tax, c] of Object.entries(taxCount).sort((a, b) => b[1].n - a[1].n)) p(`| ${tax} | ${c.n} | ${c.used} |`);
p('');

// ---- Comercio ----
const products = posts.filter(x => x.post_type === 'product' && x.post_status === 'publish');
const prodMeta = products.map(x => ({ p: x, m: metaOf(x.ID) }));
const prices = prodMeta.map(x => parseFloat(x.m._price)).filter(v => !isNaN(v));
const noPrice = prodMeta.filter(x => !x.m._price || isNaN(parseFloat(x.m._price))).length;
const withSku = prodMeta.filter(x => x.m._sku).length;
const stockManaged = prodMeta.filter(x => x.m._manage_stock === 'yes').length;
const outStock = prodMeta.filter(x => x.m._stock_status === 'outofstock').length;
p('## Comercio', '',
  `- Productos publicados: **${products.length}** (todos simples; sin variaciones, sin atributos globales \`pa_*\`)`,
  `- Con SKU: ${withSku} · Gestión de stock: ${stockManaged} · Agotados: ${outStock} · **Sin precio: ${noPrice}**`,
  prices.length ? `- Precios: min $${Math.min(...prices)} — max $${Math.max(...prices)} MXN` : '- Sin precios detectados',
  `- Cupones: 0 · Zonas de envío en dump: 0 · Tasas de impuesto: 0 (verificar contra sitio vivo)`,
  `- Reseñas: ${comments.filter(c => c.comment_type === 'review').length} — aprobadas: ${comments.filter(c => c.comment_type === 'review' && c.comment_approved == 1).length} (**ninguna visible en el sitio**; probable spam — se conservan como datos sin publicar)`, '');

// pedidos
p('### Pedidos históricos', '', '| ID | fecha | estado | total | items (lookup) |', '|---|---|---|---|---|');
for (const o of posts.filter(x => x.post_type === 'shop_order')) {
  const m = metaOf(o.ID);
  const items = orderProducts.filter(i => i.order_id === o.ID).length;
  p(`| ${o.ID} | ${o.post_date.slice(0, 10)} | ${o.post_status} | $${m._order_total || '?'} ${m._order_currency || ''} | ${items} |`);
}
p('', '> ⚠ `woocommerce_order_items`/`_itemmeta` están VACÍAS en el dump; las líneas provienen de `wc_order_product_lookup`. El delta final del cutover debe tomarse de la DB viva.', '');

// ---- Formularios ----
p('## Formularios (Ninja Forms)', '');
const fMeta = (fid, k) => nfFieldMeta.filter(x => x.parent_id === fid && x.key === k).map(x => x.value)[0];
for (const f of nfForms) {
  p(`### Form ${f.id}: ${f.title}`, '', '| campo | tipo | requerido | etiqueta |', '|---|---|---|---|');
  for (const fl of nfFields.filter(x => x.parent_id === f.id))
    p(`| ${fMeta(fl.id, 'key') || fl.key || fl.id} | ${fl.type || fMeta(fl.id, 'type')} | ${fMeta(fl.id, 'required') ?? ''} | ${(fMeta(fl.id, 'label') || fl.label || '').replaceAll('|', '\\|')} |`);
  const acts = nfActions.filter(a => a.parent_id === f.id).map(a => {
    const am = Object.fromEntries(nfActionMeta.filter(x => x.parent_id === a.id).map(x => [x.key, x.value]));
    return { type: a.type, active: a.active, to: am.to, subject: am.email_subject, success: am.success_msg };
  });
  p('', 'Acciones: ' + acts.map(a => `**${a.type}**${a.to ? ` → ${a.to}` : ''}${a.subject ? ` ("${a.subject}")` : ''}`).join(' · '), '');
}

// ---- Usuarios ----
p('## Usuarios', '', '| login | email | registrado | hash |', '|---|---|---|---|');
for (const u of users) p(`| ${u.user_login} | ${u.user_email} | ${u.user_registered?.slice(0, 10)} | ${u.user_pass?.slice(0, 6)}… |`);
p('', 'Los 3 con rol `administrator`. Sin clientes registrados.', '');

// ---- Menús ----
p('## Menús', '');
const menus = tt.filter(x => x.taxonomy === 'nav_menu');
for (const m of menus) {
  const t = termById[m.term_id];
  const itemIds = tr.filter(r => r.term_taxonomy_id === m.term_taxonomy_id).map(r => r.object_id);
  const items = posts.filter(x => itemIds.includes(x.ID) && x.post_status === 'publish').sort((a, b) => a.menu_order - b.menu_order);
  p(`### ${t.name} (${items.length} ítems)`, '');
  for (const it of items) {
    const im = metaOf(it.ID);
    let target, inherited = '';
    if (im._menu_item_type === 'custom') target = im._menu_item_url;
    else if (im._menu_item_type === 'taxonomy') {
      const term = termById[+im._menu_item_object_id];
      target = `taxonomía ${im._menu_item_object}: ${term?.slug || im._menu_item_object_id}`;
      inherited = term?.name || '';
    } else {
      const tp = posts.find(x => x.ID === +im._menu_item_object_id);
      target = `/${tp?.post_name || '#' + im._menu_item_object_id}/`;
      inherited = tp?.post_title || '';
    }
    const label = it.post_title || inherited || '(?)';
    p(`- [${im._menu_item_menu_item_parent > 0 ? '↳ ' : ''}${label}] → ${target}`);
  }
  p('');
}

// ---- Snippets (Code Snippets plugin) ----
p('## Snippets de código (Code Snippets)', '', '| nombre | scope | activo |', '|---|---|---|');
for (const s of snippets) p(`| ${(s.name || '').replaceAll('|', '\\|')} | ${s.scope} | ${s.active === 1 ? '✅' : s.active === -1 ? '⚠ error' : 'no'} |`);
p('', '> Único activo: "Buscar SKU en Ajax Search Lite" → la búsqueda del sitio incluye SKUs (reproducir en la búsqueda nueva).', '');

// ---- Opciones clave / integraciones ----
const sitekit = opt('googlesitekit_analytics-4_settings');
const joinchat = opt('joinchat');
p('## Integraciones y ajustes clave', '');
if (sitekit) { const s = un(sitekit); p(`- Google Analytics 4 (Site Kit): measurementID **${s.measurementID || '?'}**, property ${s.propertyID || '?'}`); }
if (joinchat) { const j = un(joinchat); p(`- WhatsApp (Joinchat): teléfono **${j.telephone || '?'}**, mensaje CTA: "${(j.message_send || '').slice(0, 80)}"`); }
p(`- Yoast SEO: ${opt('wpseo') ? 'configurado' : '—'} · sitemaps activos (9 sub-sitemaps)`);
p(`- WP Mail SMTP: ${(() => { try { const w = un(opt('wp_mail_smtp') || ''); return `mailer ${w?.mail?.mailer || '?'}, from ${w?.mail?.from_email || '?'}`; } catch { return 'ver opción'; } })()}`);
p(`- Correo admin: ${opt('admin_email')} · Zona horaria: ${opt('timezone_string') || 'UTC' + (opt('gmt_offset') || 0)}`);
p('');

// ---- Tokens, breakpoints, deploy (hallazgos C2 estáticos) ----
p('## Tokens preliminares del tema (extracción formal en Fase R)', '',
  '- Paleta real (opciones Mikado `mkd_options_entre`): azules corporativos `#153a67 #114a84 #124775 #00548d #134e84 #0b4163`, acentos `#186e7a #186fa5`, grises `#383838 #474747 #5b5b5b`, blanco.',
  '- Kit de Elementor (8553): colores/tipos **default sin uso real** (Roboto, #6EC1E4…) — los estilos van inline por widget.',
  '- Fuentes Google en vivo: **Josefin Sans, Bellefair, Lato, Biryani** (tema) + Lato completo (Elementor).',
  '- Breakpoints del CSS del tema: 1440, 1280, 1200, 1024/1025, 768, 680, 480 px.', '');
p('## Componentes recurrentes (parcial, se completa con el rastreo)', '',
  '- Header/footer Elementor (elementor-hf) en el 100 % de las páginas: logo, nav `wpr-nav-menu`, botones, iconos.',
  '- Barra de título de página (`mkd-title-holder`) en la mayoría de las plantillas.',
  '- Páginas legacy WPBakery (~15): wpb_row/column, image-carousel, icon-box, raw_html.',
  '- Blog: `mkd-blog-holder`, related posts, comentarios (cerrados).',
  '- Woo: plantillas del tema con dropdown-cart en header.', '');
p('## Deploy staging (validado 2026-08-26)', '',
  '- FTPS explícito OK contra **temporal.ofitodo.com:21** (⚠ `ftp.ofitodo.com` NO resuelve; origen GoDaddy `184.168.20.11`, subdominio sin proxy de Cloudflare).',
  '- La cuenta FTP entra directo al docroot del subdominio (no usar prefijo `public_html/`).',
  '- `http(s)://temporal.ofitodo.com/` responde 200 (docroot vacío, creado 2026-08-26). Credenciales solo en `.env`.', '');

// ---- Crawl (si ya existe) ----
const metaDir = path.join(ROOT, 'reference', 'meta');
if (existsSync(metaDir)) {
  const files = readdirSync(metaDir).filter(f => f.endsWith('.json'));
  const all = files.map(f => JSON.parse(readFileSync(path.join(metaDir, f), 'utf8')));
  const okc = all.filter(x => x.status === 200).length;
  const redir = all.filter(x => x.url !== x.finalUrl);
  p('## Rastreo del sitio vivo', '', `- URLs rastreadas: **${all.length}** · 200 OK: ${okc} · redirigidas: ${redir.length} · errores: ver \`reference/crawl-errores.json\``);
  const scripts = new Set(); all.forEach(x => (x.scripts || []).forEach(s => { try { const h = new URL(s, 'https://ofitodo.com').host; if (h !== 'ofitodo.com') scripts.add(h); } catch {} }));
  p(`- Hosts de scripts de terceros: ${[...scripts].join(', ') || 'ninguno'}`, '');
}

writeFileSync(path.join(ROOT, 'docs', '02-inventario.md'), L.join('\n'));
console.log(`docs/02-inventario.md generado (${L.length} líneas)`);
