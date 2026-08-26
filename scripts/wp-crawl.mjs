// wp-crawl: rastreo de referencia del sitio vivo (Fase C2, §4.2).
// Enumera URLs desde sitemap_index.xml (+ URLs de sistema), y para cada una guarda:
//   reference/html/<clave>.html        HTML renderizado final
//   reference/meta/<clave>.json        status, url final, cabeceras, metas SEO, recursos, enlaces
//   reference/screenshots/<vp>/<clave>.png  full-page en 390x844, 768x1024, 1440x900
// Reanudable: si meta ya existe con screenshots, se salta. Rate limit ~1.3 s/URL.
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const REF = path.join(ROOT, 'reference');
const BASE = 'https://ofitodo.com';
const VIEWPORTS = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];
const DELAY_MS = 1300;
const NAV_TIMEOUT = 45000;

for (const d of ['html', 'meta', ...VIEWPORTS.map(v => `screenshots/${v.name}`)])
  mkdirSync(path.join(REF, d), { recursive: true });

const urlKey = (u) => {
  const { pathname, search } = new URL(u);
  let k = decodeURIComponent(pathname + search).replace(/\/$/, '') || '__home';
  return k.replace(/^\//, '').replace(/[\/?&=#%]/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);
};

async function fetchText(u) {
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ofitodo-rebuild-crawler' } });
  return r.ok ? await r.text() : '';
}

async function collectUrls() {
  const urls = new Set([`${BASE}/`]);
  const index = await fetchText(`${BASE}/sitemap_index.xml`);
  const subs = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const s of subs) {
    const xml = await fetchText(s);
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1];
      if (u.startsWith(BASE) && !/\.(jpg|jpeg|png|gif|webp|pdf|svg)$/i.test(u)) urls.add(u);
    }
  }
  // URLs de sistema/tienda que no salen en sitemap
  for (const p of ['/tienda/', '/carrito/', '/finalizar-compra/', '/mi-cuenta/',
    '/?s=escritorio', '/feed/', '/comments/feed/', '/url-inexistente-para-404-xyz/'])
    urls.add(`${BASE}${p}`);
  return [...urls];
}

const urls = await collectUrls();
writeFileSync(path.join(REF, 'urls.json'), JSON.stringify(urls, null, 2));
console.log(`URLs a rastrear: ${urls.length}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  locale: 'es-MX',
  reducedMotion: 'reduce',
  viewport: { width: 1440, height: 900 },
});
ctx.setDefaultTimeout(NAV_TIMEOUT);
const page = await ctx.newPage();
await page.addStyleTag; // noop para tipado

const FREEZE_CSS = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}`;

async function settle() {
  try { await page.evaluate(() => document.fonts?.ready); } catch {}
  // scroll completo para disparar lazy-load
  try {
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const t = setInterval(() => {
          y += 800; window.scrollTo(0, y);
          if (y >= document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); setTimeout(res, 400); }
        }, 60);
      });
    });
  } catch {}
  await page.waitForTimeout(500);
}

let done = 0, errors = [];
for (const url of urls) {
  const key = urlKey(url);
  const metaFile = path.join(REF, 'meta', `${key}.json`);
  const lastShot = path.join(REF, 'screenshots', VIEWPORTS[2].name, `${key}.png`);
  if (existsSync(metaFile) && existsSync(lastShot)) { done++; continue; }
  try {
    const resp = await page.goto(url, { waitUntil: 'load' });
    const status = resp?.status() ?? 0;
    const finalUrl = page.url();
    const headers = resp ? await resp.allHeaders() : {};
    await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
    await settle();

    const info = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const attr = (s, a) => q(s)?.getAttribute(a) ?? null;
      return {
        title: document.title,
        lang: document.documentElement.lang,
        metaDescription: attr('meta[name="description"]', 'content'),
        canonical: attr('link[rel="canonical"]', 'href'),
        robots: attr('meta[name="robots"]', 'content'),
        og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map(m => [m.getAttribute('property'), m.getAttribute('content')])),
        twitter: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')].map(m => [m.getAttribute('name'), m.getAttribute('content')])),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
        headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => [h.tagName.toLowerCase(), h.innerText.trim().slice(0, 200)]),
        links: [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 120) })),
        images: [...document.querySelectorAll('img')].map(i => ({ src: i.getAttribute('src'), srcset: i.getAttribute('srcset'), alt: i.getAttribute('alt') })),
        scripts: [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')),
        stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href')),
        forms: [...document.querySelectorAll('form')].map(f => ({
          action: f.getAttribute('action'), method: f.getAttribute('method'),
          fields: [...f.querySelectorAll('input,textarea,select')].map(i => ({ name: i.getAttribute('name'), type: i.getAttribute('type') || i.tagName.toLowerCase(), required: i.hasAttribute('required') })),
        })),
      };
    });

    const html = await page.content();
    writeFileSync(path.join(REF, 'html', `${key}.html`), html);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await settle();
      await page.screenshot({ path: path.join(REF, 'screenshots', vp.name, `${key}.png`), fullPage: true, timeout: 30000 }).catch(e => errors.push(`${url} [shot ${vp.name}]: ${e.message.split('\n')[0]}`));
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    writeFileSync(metaFile, JSON.stringify({ url, finalUrl, status, headers, ...info }, null, 1));
    done++;
    if (done % 20 === 0) console.log(`${done}/${urls.length} · ${url} [${status}]`);
  } catch (e) {
    errors.push(`${url}: ${e.message.split('\n')[0]}`);
    console.log(`ERROR ${url}: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(DELAY_MS);
}

writeFileSync(path.join(REF, 'crawl-errores.json'), JSON.stringify(errors, null, 2));
console.log(`Listo: ${done}/${urls.length} rastreadas, ${errors.length} errores.`);
await browser.close();
