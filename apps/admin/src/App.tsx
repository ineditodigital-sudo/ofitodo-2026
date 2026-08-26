import { useEffect, useState, type FormEvent } from 'react';

/* Panel de Ofitodo v2 — CMS operativo en lenguaje humano:
   Inicio (resumen) · Pedidos · Mensajes · Productos (editor completo) · Páginas y SEO · Ayuda.
   Precio/stock actúan al instante; nombre/descripción/imagen/SEO se aplican en la
   siguiente publicación del sitio (ciclo en docs/09-operacion.md). */

type Json = Record<string, unknown>;
async function api(ruta: string, metodo = 'GET', cuerpo?: Json) {
  const url = '/api' + ruta + (metodo === 'GET' ? (ruta.includes('?') ? '&' : '?') + 'cb=' + Date.now() : '');
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    credentials: 'same-origin',
  });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.mensaje ?? 'Error');
  return j;
}
const fmt = (n: number | null) => (n == null ? 'por cotización' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }));
const fecha = (s: string) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const ESTADOS: Record<string, string> = { pendiente: 'Pendiente', confirmado: 'Confirmado', entregado: 'Entregado', cancelado: 'Cancelado', 'wc-processing': 'En proceso (WP)', 'wc-failed': 'Fallido (WP)' };

function Login({ onOk }: { onOk: (nombre: string) => void }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true); setError(null);
    try { const r = await api('/admin/login', 'POST', { usuario, contrasena }); onOk(r.nombre as string); }
    catch (err) { setError((err as Error).message); }
    finally { setCargando(false); }
  }
  return (
    <main className="acceso">
      <form onSubmit={entrar} className="acceso-tarjeta">
        <h1>Panel de Ofitodo</h1>
        <p className="acceso-sub">Administra tu sitio web</p>
        <label>Usuario o correo<input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required /></label>
        <label>Contraseña<input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" required /></label>
        <button disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
        {error && <p role="alert" className="acceso-error">{error}</p>}
        <p className="acceso-sub">Usa tu mismo usuario y contraseña de siempre.</p>
      </form>
    </main>
  );
}

function Inicio({ irA }: { irA: (t: Tab) => void }) {
  const [r, setR] = useState<Json | null>(null);
  useEffect(() => { api('/admin/resumen').then(setR).catch(() => setR({})); }, []);
  if (!r) return <p>Cargando…</p>;
  return (
    <div>
      <div className="kpis">
        <button className="kpi" onClick={() => irA('pedidos')}><strong>{String(r.pedidosPendientes ?? 0)}</strong><span>pedidos por atender</span></button>
        <button className="kpi" onClick={() => irA('mensajes')}><strong>{String(r.mensajesNoLeidos ?? 0)}</strong><span>mensajes sin leer</span></button>
        <button className="kpi" onClick={() => irA('productos')}><strong>{String(r.cambiosPendientes ?? 0)}</strong><span>cambios por publicar</span></button>
      </div>
      <div className="dos-col">
        <section className="tarjeta">
          <h3>Últimos pedidos</h3>
          {(r.ultimosPedidos as Json[] | undefined)?.length
            ? <ul className="lista-simple">{(r.ultimosPedidos as Json[]).map((p) => <li key={String(p.numero)}>#{String(p.numero)} · {fmt(p.total as number)} · {ESTADOS[String(p.estado)] ?? String(p.estado)} · {fecha(String(p.creado))}</li>)}</ul>
            : <p className="suave">Aún no hay pedidos.</p>}
        </section>
        <section className="tarjeta">
          <h3>Últimos mensajes</h3>
          {(r.ultimosMensajes as Json[] | undefined)?.length
            ? <ul className="lista-simple">{(r.ultimosMensajes as Json[]).map((m) => <li key={String(m.id)}>{Number(m.leido) ? '' : '🔵 '}{String(m.formulario)} · {fecha(String(m.creado))}</li>)}</ul>
            : <p className="suave">Aún no hay mensajes.</p>}
        </section>
      </div>
      <section className="tarjeta">
        <h3>¿Cómo funciona tu sitio?</h3>
        <p><strong>Al instante</strong>: precios y disponibilidad de productos, estados de pedidos y mensajes — se guardan y aplican de inmediato.</p>
        <p><strong>Con publicación</strong>: nombres, descripciones e imágenes de productos, y los títulos/descripciones de Google de cada página — quedan guardados aquí y se aplican al sitio en la siguiente publicación (la hace tu equipo técnico o el asistente; tarda unos minutos).</p>
      </section>
    </div>
  );
}

function Mensajes() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  useEffect(() => { api('/admin/mensajes').then((r) => setFilas(r.mensajes as Json[])); }, []);
  async function leer(m: Json) {
    if (Number(m.leido)) return;
    m.leido = 1; setFilas((f) => [...(f ?? [])]);
    await api('/admin/mensajes', 'PUT', { id: m.id, leido: 1 }).catch(() => {});
  }
  if (!filas) return <p>Cargando…</p>;
  if (!filas.length) return <p>Aún no hay mensajes de los formularios del sitio.</p>;
  return (
    <div className="lista">
      {filas.map((m) => (
        <details key={String(m.id)} className="tarjeta" onToggle={(e) => (e.target as HTMLDetailsElement).open && leer(m)}>
          <summary>{Number(m.leido) ? '' : '🔵 '}<strong>{String(m.formulario)}</strong> · {fecha(String(m.creado))} <span className="suave">desde {String(m.pagina || 'el sitio')}</span></summary>
          <dl>{Object.entries(JSON.parse(String(m.datos)) as Json).map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{String(v) || '—'}</dd></div>))}</dl>
        </details>
      ))}
    </div>
  );
}

function Pedidos() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  const cargar = () => api('/admin/pedidos').then((r) => setFilas(r.pedidos as Json[]));
  useEffect(() => { cargar(); }, []);
  async function cambiar(id: number, estado: string) { await api('/admin/pedidos', 'PUT', { id, estado }); cargar(); }
  if (!filas) return <p>Cargando…</p>;
  if (!filas.length) return <p>Todavía no hay pedidos. Cuando un cliente compre contra entrega, aparecerá aquí.</p>;
  return (
    <div className="lista">
      {filas.map((p) => {
        const cli = JSON.parse(String(p.cliente)) as Json;
        const items = JSON.parse(String(p.items)) as Json[];
        return (
          <details key={String(p.id)} className="tarjeta">
            <summary>
              <strong>Pedido #{String(p.numero)}</strong> · {fmt(p.total as number)} · {fecha(String(p.creado))}
              <select value={String(p.estado)} onChange={(e) => cambiar(p.id as number, e.target.value)} onClick={(e) => e.stopPropagation()}>
                {Object.entries(ESTADOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </summary>
            <p><strong>{String(cli.billing_first_name)} {String(cli.billing_last_name)}</strong> · {String(cli.billing_phone)} · {String(cli.billing_email)}</p>
            <p>{String(cli.billing_address_1)} {String(cli.billing_address_2 || '')}, {String(cli.billing_city)}, {String(cli.billing_state)}, CP {String(cli.billing_postcode)}</p>
            {Boolean(cli.order_comments) && <p>Notas: {String(cli.order_comments)}</p>}
            <ul>{items.map((it, i) => <li key={i}>{String(it.nombre)} × {String(it.qty)} = {fmt((it.subtotal ?? null) as number | null)}</li>)}</ul>
          </details>
        );
      })}
    </div>
  );
}

function Productos() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { api('/admin/productos').then((r) => setFilas(r.productos as Json[])); }, []);
  if (!filas) return <p>Cargando…</p>;
  const vis = filas.filter((p) => (String(p.nombre) + ' ' + String(p.sku ?? '')).toLowerCase().includes(filtro.toLowerCase())).slice(0, 40);
  return (
    <div>
      <p><input className="buscar" placeholder="Busca un producto por nombre o SKU…" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></p>
      {aviso && <p className="aviso">{aviso}</p>}
      <div className="lista">
        {vis.map((p) => (
          <div className="tarjeta" key={String(p.slug)}>
            <div className="fila-prod" onClick={() => setAbierto(abierto === p.slug ? null : String(p.slug))}>
              {typeof p.imagen === 'string' && p.imagen && <img src={String(p.imagen).replace(/(\.\w+)$/, '-150x150$1')} alt="" width={44} height={44} />}
              <strong>{String(p.nombre)}</strong>
              <span className="suave">{String(p.sku ?? '')}</span>
              <span className="precio">{fmt(p.precio as number | null)}</span>
              {Boolean(p.pendiente) && <span className="pill">por publicar</span>}
              <a href={`/producto/${String(p.slug)}/`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>ver página ↗</a>
            </div>
            {abierto === p.slug && <EditorProducto p={p} onListo={(msj) => { setAviso(msj); setAbierto(null); setTimeout(() => setAviso(null), 7000); api('/admin/productos').then((r) => setFilas(r.productos as Json[])); }} />}
          </div>
        ))}
      </div>
      {vis.length === 40 && <p className="suave">Mostrando 40 — usa el buscador para encontrar el resto (hay {filas.length}).</p>}
    </div>
  );
}
function EditorProducto({ p, onListo }: { p: Json; onListo: (msj: string) => void }) {
  const [nombre, setNombre] = useState(String(p.nombre ?? ''));
  const [precio, setPrecio] = useState(p.precio == null ? '' : String(p.precio));
  const [stock, setStock] = useState(String(p.stock ?? 'instock'));
  const [descripcion, setDescripcion] = useState(String(p.descripcion ?? ''));
  const [imagen, setImagen] = useState(String(p.imagen ?? ''));
  const [slug, setSlug] = useState(String(p.slug ?? ''));
  const [guardando, setGuardando] = useState(false);
  const slugCambia = slug !== String(p.slug) && slug.trim() !== '';
  async function guardar() {
    setGuardando(true);
    try {
      const r = await api('/admin/productos', 'PUT', {
        slug: p.slug,
        precio: precio === '' ? null : +precio,
        stock,
        nombre: nombre !== String(p.nombre) ? nombre : null,
        descripcion: descripcion || null,
        imagen: imagen !== String(p.imagen ?? '') ? imagen : null,
        slug_nuevo: slugCambia ? slug : null,
      });
      onListo((r.aviso ? r.aviso + ' ' : '') + 'Guardado. Precio y disponibilidad ya están activos; nombre, descripción, imagen y dirección se aplican en la próxima publicación del sitio.');
    } finally { setGuardando(false); }
  }
  return (
    <div className="editor">
      <label>Nombre del producto<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <div className="fila2">
        <label>Precio (vacío = por cotización) <em>al instante</em><input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="por cotización" /></label>
        <label>Disponibilidad <em>al instante</em><select value={stock} onChange={(e) => setStock(e.target.value)}><option value="instock">Disponible</option><option value="outofstock">Agotado</option></select></label>
      </div>
      <label>Descripción (se muestra en la página del producto) <em>con publicación</em><textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Escribe la nueva descripción solo si quieres cambiarla" /></label>
      <label>Foto principal (dirección de la imagen) <em>con publicación</em><input value={imagen} onChange={(e) => setImagen(e.target.value)} /></label>
      <label>Dirección web del producto <em>con publicación</em>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} />
        <small className="suave">tudominio.com/producto/<strong>{slug || '…'}</strong>/</small>
        {slugCambia && <small className="aviso-inline">Al cambiarla, la dirección anterior enviará sola a la nueva (redirección 301) — no se pierde el posicionamiento en Google.</small>}
      </label>
      <button disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
    </div>
  );
}

function Paginas() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { api('/admin/paginas').then((r) => setFilas(r.paginas as Json[])); }, []);
  if (!filas) return <p>Cargando…</p>;
  return (
    <div>
      <p className="suave">Así se ve cada página en Google. Los cambios se aplican en la próxima publicación del sitio.</p>
      {aviso && <p className="aviso">{aviso}</p>}
      <div className="lista">
        {filas.map((pg) => (
          <div className="tarjeta" key={String(pg.slug)}>
            <div className="fila-prod" onClick={() => setAbierta(abierta === pg.slug ? null : String(pg.slug))}>
              <strong>{String(pg.slug)}</strong>
              <span className="suave">{String(pg.title).slice(0, 60)}</span>
              {Boolean(pg.pendiente) && <span className="pill">por publicar</span>}
              <a href={String(pg.slug)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>ver ↗</a>
            </div>
            {abierta === pg.slug && <EditorPagina pg={pg} onListo={(m) => { setAviso(m); setAbierta(null); setTimeout(() => setAviso(null), 7000); api('/admin/paginas').then((r) => setFilas(r.paginas as Json[])); }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
function EditorPagina({ pg, onListo }: { pg: Json; onListo: (m: string) => void }) {
  const [title, setTitle] = useState(String(pg.title ?? ''));
  const [description, setDescription] = useState(String(pg.description ?? ''));
  const [guardando, setGuardando] = useState(false);
  return (
    <div className="editor">
      <label>Título en Google ({title.length} caracteres; ideal 50-60)<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Descripción en Google ({description.length} caracteres; ideal 120-155)<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <button disabled={guardando} onClick={async () => { setGuardando(true); try { await api('/admin/paginas', 'PUT', { slug: pg.slug, title, description }); onListo('Guardado. Se aplica en la próxima publicación del sitio.'); } finally { setGuardando(false); } }}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
    </div>
  );
}

function Ayuda() {
  return (
    <div className="lista">
      <section className="tarjeta"><h3>¿Qué puedo hacer desde aquí?</h3>
        <p>· <strong>Pedidos</strong>: ver cada pedido contra entrega con los datos del cliente y cambiar su estado.</p>
        <p>· <strong>Mensajes</strong>: leer lo que llega por los formularios del sitio (también te llega por correo).</p>
        <p>· <strong>Productos</strong>: cambiar precio y disponibilidad (al instante), y nombre, descripción o foto (se aplican al publicar).</p>
        <p>· <strong>Páginas y SEO</strong>: editar cómo se ve cada página en Google.</p></section>
      <section className="tarjeta"><h3>¿Y si quiero cambiar textos o fotos de las páginas?</h3>
        <p>Los textos y fotos de las páginas (Inicio, Nosotros, Sectores…) se cambian hoy con ayuda del equipo técnico, y muy pronto también desde aquí: es la siguiente etapa del panel, ya planeada.</p></section>
      <section className="tarjeta"><h3>¿Necesitas ayuda?</h3>
        <p>Escríbenos: cristian.castaneda@maindsoft.net</p></section>
    </div>
  );
}

type Tab = 'inicio' | 'pedidos' | 'mensajes' | 'productos' | 'paginas' | 'ayuda';
const TABS: [Tab, string][] = [['inicio', 'Inicio'], ['pedidos', 'Pedidos'], ['mensajes', 'Mensajes'], ['productos', 'Productos'], ['paginas', 'Páginas y SEO'], ['ayuda', 'Ayuda']];

export function App() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [tab, setTab] = useState<Tab>('inicio');
  useEffect(() => { api('/admin/yo').then((r) => setNombre(r.nombre as string)).catch(() => {}).finally(() => setListo(true)); }, []);
  if (!listo) return null;
  if (!nombre) return <Login onOk={setNombre} />;
  return (
    <div className="panel">
      <header className="barra">
        <strong>Panel de Ofitodo</strong>
        <nav>{TABS.map(([t, titulo]) => <button key={t} className={tab === t ? 'activa' : ''} onClick={() => setTab(t)}>{titulo}</button>)}</nav>
        <span className="suave">Hola, {nombre} · <a href="#salir" onClick={async (e) => { e.preventDefault(); await api('/admin/salir', 'POST'); location.reload(); }}>Salir</a></span>
      </header>
      <main className="contenido">
        {tab === 'inicio' && <Inicio irA={setTab} />}
        {tab === 'pedidos' && <Pedidos />}
        {tab === 'mensajes' && <Mensajes />}
        {tab === 'productos' && <Productos />}
        {tab === 'paginas' && <Paginas />}
        {tab === 'ayuda' && <Ayuda />}
      </main>
    </div>
  );
}
