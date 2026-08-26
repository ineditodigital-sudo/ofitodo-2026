// wp-extract: parsea APP-DATA.SQL (mysqldump extendido) y exporta tablas S7tWp_ a JSON.
// Sin dependencias. Salida: reference/db-export/<tabla>.json + _resumen.json con conteos.
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SQL = path.join(ROOT, 'SITIO WEB OLD OFITODO', 'APP-DATA.SQL');
const OUT = path.join(ROOT, 'reference', 'db-export');
const PREFIX = 'S7tWp_';

// Tablas a exportar (sin el prefijo). El resto solo se cuenta.
const WANTED = new Set([
  'options', 'posts', 'postmeta', 'terms', 'term_taxonomy', 'term_relationships',
  'termmeta', 'comments', 'commentmeta', 'users', 'usermeta', 'links',
  'woocommerce_order_items', 'woocommerce_order_itemmeta',
  'woocommerce_attribute_taxonomies', 'woocommerce_tax_rates',
  'woocommerce_tax_rate_locations', 'woocommerce_shipping_zones',
  'woocommerce_shipping_zone_locations', 'woocommerce_shipping_zone_methods',
  'wc_customer_lookup', 'wc_product_meta_lookup', 'wc_category_lookup',
  'wc_order_product_lookup', 'wc_order_stats',
  'nf3_forms', 'nf3_fields', 'nf3_field_meta', 'nf3_form_meta',
  'nf3_actions', 'nf3_action_meta', 'snippets',
]);

const columns = {};   // tabla -> [col...]
const rows = {};      // tabla -> [obj...]
const counts = {};    // tabla -> n (todas las S7tWp_)

function parseValues(str, cols, table) {
  // str: "(v,v,...),(v,...);" — máquina de estados carácter a carácter.
  const out = [];
  let i = 0;
  const n = str.length;
  while (i < n) {
    while (i < n && str[i] !== '(') i++;
    if (i >= n) break;
    i++; // consume (
    const tuple = [];
    let done = false;
    while (!done) {
      // saltar espacios
      while (str[i] === ' ') i++;
      if (str[i] === 'N' && str.startsWith('NULL', i)) { tuple.push(null); i += 4; }
      else if (str[i] === "'") {
        i++;
        let buf = '';
        while (i < n) {
          const c = str[i];
          if (c === '\\') {
            const e = str[i + 1];
            buf += e === 'n' ? '\n' : e === 'r' ? '\r' : e === 't' ? '\t'
              : e === '0' ? '\0' : e === 'Z' ? '\x1a' : e === 'b' ? '\b' : e;
            i += 2;
          } else if (c === "'") { i++; break; }
          else { buf += c; i++; }
        }
        tuple.push(buf);
      } else if (str[i] === 'b' && str[i + 1] === "'") {
        // literal bit b'0'/b'1'
        i += 2;
        let buf = '';
        while (str[i] !== "'") { buf += str[i]; i++; }
        i++;
        tuple.push(parseInt(buf, 2));
      } else {
        // número u otro token sin comillas
        let buf = '';
        while (i < n && str[i] !== ',' && str[i] !== ')') { buf += str[i]; i++; }
        const t = buf.trim();
        tuple.push(t === '' ? null : (/^-?\d+$/.test(t) && Math.abs(+t) <= Number.MAX_SAFE_INTEGER ? +t : (/^-?\d*\.\d+(e-?\d+)?$/i.test(t) ? +t : t)));
      }
      while (str[i] === ' ') i++;
      if (str[i] === ',') { i++; }
      else if (str[i] === ')') { i++; done = true; }
      else if (i >= n) { done = true; }
    }
    counts[table] = (counts[table] || 0) + 1;
    if (cols && rows[table]) {
      const obj = {};
      for (let k = 0; k < tuple.length; k++) obj[cols[k] || `col${k}`] = tuple[k];
      rows[table].push(obj);
    }
    // separador entre tuplas: ,( o ;
  }
}

let curCreate = null; // tabla en CREATE TABLE
const rl = createInterface({ input: createReadStream(SQL, { encoding: 'utf8' }), crlfDelay: Infinity });

for await (const line of rl) {
  if (curCreate) {
    const m = line.match(/^\s*`([^`]+)`/);
    if (m) { columns[curCreate].push(m[1]); continue; }
    if (/^\)/.test(line)) { curCreate = null; }
    continue;
  }
  let m = line.match(/^CREATE TABLE `(\w+)` \(/);
  if (m) {
    if (m[1].startsWith(PREFIX)) { curCreate = m[1]; columns[curCreate] = []; }
    continue;
  }
  m = line.match(/^INSERT INTO `(\w+)` VALUES (.*)$/s);
  if (m) {
    const table = m[1];
    if (!table.startsWith(PREFIX)) continue;
    const short = table.slice(PREFIX.length);
    if (WANTED.has(short) && !rows[table]) rows[table] = [];
    parseValues(m[2], columns[table], table);
  }
}

mkdirSync(OUT, { recursive: true });
for (const [table, data] of Object.entries(rows)) {
  const short = table.slice(PREFIX.length);
  writeFileSync(path.join(OUT, `${short}.json`), JSON.stringify(data));
  console.log(`${short}: ${data.length} filas`);
}
const resumen = Object.fromEntries(Object.entries(counts).sort());
writeFileSync(path.join(OUT, '_resumen.json'), JSON.stringify(resumen, null, 2));
console.log('--- resumen de conteos en _resumen.json ---');
