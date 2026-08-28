// Acota una hoja de estilo a un contenedor: reescribe cada selector para que
// solo aplique dentro de `ambito`. Así el CSS propio de un artículo puede
// convivir con el del sitio sin filtrarse al encabezado, al pie ni a nada más.
//
// - `html`, `body`, `:root` y `*` de nivel superior pasan a ser el propio ámbito
// - `@media`, `@supports` y `@layer` se recorren por dentro
// - `@font-face`, `@keyframes`, `@import`, `@charset` y `@page` se dejan intactos

const SIN_TOCAR = /^@(font-face|keyframes|-webkit-keyframes|import|charset|page|namespace|counter-style|property|font-feature-values)/i;
const RECURSIVAS = /^@(media|supports|layer|container|scope)/i;

function partirSelectores(sel) {
  // separa por comas de nivel superior (respeta paréntesis y comillas)
  const out = [];
  let act = '', prof = 0, comilla = null;
  for (const ch of sel) {
    if (comilla) { act += ch; if (ch === comilla) comilla = null; continue; }
    if (ch === '"' || ch === "'") { comilla = ch; act += ch; continue; }
    if (ch === '(') prof++;
    if (ch === ')') prof--;
    if (ch === ',' && prof === 0) { out.push(act); act = ''; continue; }
    act += ch;
  }
  if (act.trim()) out.push(act);
  return out;
}

function acotarSelector(sel, ambito) {
  const s = sel.trim();
  if (!s) return s;
  // El propio documento pasa a ser el contenedor
  if (/^(html|body|:root)$/i.test(s)) return ambito;
  if (/^(html|body|:root)\s+/i.test(s)) return `${ambito} ${s.replace(/^(html|body|:root)\s+/i, '')}`;
  if (s === '*') return `${ambito} *`;
  // Selectores que ya empiezan por el ámbito no se tocan
  if (s.startsWith(ambito)) return s;
  // :where(...) mantiene la especificidad baja del original
  return `${ambito} ${s}`;
}

export function acotarCss(css, ambito) {
  let out = '';
  let i = 0;
  const n = css.length;

  const saltarEspacios = () => { while (i < n && /\s/.test(css[i])) i++; };

  function leerBloque() {
    // devuelve el contenido entre { } dejando i después de la llave de cierre
    let prof = 0, ini = i, comilla = null;
    for (; i < n; i++) {
      const ch = css[i];
      if (comilla) { if (ch === comilla && css[i - 1] !== '\\') comilla = null; continue; }
      if (ch === '"' || ch === "'") { comilla = ch; continue; }
      if (ch === '{') prof++;
      else if (ch === '}') { prof--; if (prof === 0) { const cuerpo = css.slice(ini + 1, i); i++; return cuerpo; } }
    }
    return css.slice(ini + 1);
  }

  while (i < n) {
    saltarEspacios();
    if (i >= n) break;

    // comentarios
    if (css.startsWith('/*', i)) {
      const fin = css.indexOf('*/', i + 2);
      i = fin === -1 ? n : fin + 2;
      continue;
    }

    // lee el preludio hasta { o ;
    let ini = i, comilla = null;
    while (i < n) {
      const ch = css[i];
      if (comilla) { if (ch === comilla && css[i - 1] !== '\\') comilla = null; i++; continue; }
      if (ch === '"' || ch === "'") { comilla = ch; i++; continue; }
      if (ch === '{' || ch === ';') break;
      i++;
    }
    const preludio = css.slice(ini, i).trim();

    if (i < n && css[i] === ';') { // at-rule sin bloque (@import, @charset)
      i++;
      if (preludio) out += preludio + ';\n';
      continue;
    }
    if (i >= n) { if (preludio) out += preludio; break; }

    const cuerpo = leerBloque();

    if (preludio.startsWith('@')) {
      if (SIN_TOCAR.test(preludio)) { out += `${preludio}{${cuerpo}}\n`; continue; }
      if (RECURSIVAS.test(preludio)) { out += `${preludio}{\n${acotarCss(cuerpo, ambito)}}\n`; continue; }
      out += `${preludio}{${cuerpo}}\n`;
      continue;
    }

    const sels = partirSelectores(preludio).map((x) => acotarSelector(x, ambito)).join(', ');
    out += `${sels}{${cuerpo}}\n`;
  }
  return out;
}

/**
 * Devuelve la visibilidad a lo que dependía del JavaScript del autor.
 * Muchos artículos ocultan bloques con `opacity: 0` y los revelan con una
 * clase (`.visible`, `.active`…) que añadía su script. Como ese script no se
 * conserva, esos bloques quedarían invisibles para siempre: aquí se detecta
 * ese patrón —y solo ese— y se fuerza el estado final.
 */
const ESTADOS = ['visible', 'active', 'show', 'shown', 'in', 'animated', 'is-visible', 'aos-animate'];

export function revelarOcultos(css) {
  const ocultos = new Set();
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const cuerpo = m[2];
    if (!sel || sel.startsWith('@')) continue;
    if (!/(^|[;{\s])opacity\s*:\s*0(\s|;|$)|visibility\s*:\s*hidden/.test(cuerpo)) continue;
    // Solo si en la hoja existe la variante "ya revelado"
    const tienePareja = ESTADOS.some((e) => css.includes(`${sel}.${e}`) || css.includes(`${sel}.${e} `));
    if (tienePareja) ocultos.add(sel);
  }
  if (!ocultos.size) return '';
  return `\n/* El script del autor no se conserva: se fija el estado final visible */\n`
    + [...ocultos].map((s) => `${s}{opacity:1;visibility:visible;transform:none;}`).join('\n') + '\n';
}
