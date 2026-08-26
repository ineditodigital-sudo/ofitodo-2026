// Flujo de referencia §4.2: producto → agregar al carrito → carrito → checkout (SIN pagar).
// Guarda captura desktop + datos por paso en reference/flows/compra/.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'reference', 'flows', 'compra');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'es-MX' });
page.setDefaultTimeout(45000);
const pasos = [];

async function paso(n, nombre, extra = {}) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${n}-${nombre}.png`), fullPage: true });
  pasos.push({ paso: n, nombre, url: page.url(), title: await page.title(), ...extra });
  console.log(`${n}. ${nombre} → ${page.url()}`);
}

// 1. Ficha de producto
await page.goto('https://ofitodo.com/producto/silla-operativa-modelo-lituania-ofitodo/');
const precio = await page.locator('.mkd-single-product-summary .price').first().innerText().catch(() => '?');
await paso(1, 'producto', { precio: precio.replace(/\s+/g, ' ') });

// 2. Agregar al carrito
await page.locator('button.single_add_to_cart_button').first().click();
await page.waitForLoadState('load');
await paso(2, 'agregado', { aviso: await page.locator('.woocommerce-message').first().innerText().catch(() => '') });

// 3. Carrito
await page.goto('https://ofitodo.com/cart/');
const totales = await page.locator('.cart_totals').innerText().catch(() => '');
await paso(3, 'carrito', { totales: totales.replace(/\s+/g, ' ').slice(0, 400) });

// 4. Checkout — capturar TODOS los campos (sin enviar nada)
await page.goto('https://ofitodo.com/finalizar-compra/');
const campos = await page.evaluate(() =>
  [...document.querySelectorAll('form.checkout input, form.checkout select, form.checkout textarea')].map(i => ({
    name: i.name, type: i.type || i.tagName.toLowerCase(),
    required: !!i.closest('p')?.querySelector('.required'),
    label: i.closest('p')?.querySelector('label')?.innerText?.replace(/\s+/g, ' ').trim() || null,
  })).filter(c => c.name));
const metodosPago = await page.evaluate(() =>
  [...document.querySelectorAll('.wc_payment_methods li')].map(li => li.innerText.replace(/\s+/g, ' ').trim().slice(0, 100)));
const metodosEnvio = await page.evaluate(() =>
  [...document.querySelectorAll('#shipping_method li, .woocommerce-shipping-totals')].map(li => li.innerText.replace(/\s+/g, ' ').trim().slice(0, 150)));
await paso(4, 'checkout', { campos, metodosPago, metodosEnvio });

writeFileSync(path.join(OUT, 'flujo.json'), JSON.stringify(pasos, null, 2));
console.log('Flujo guardado en reference/flows/compra/');
await browser.close();
