import { useEffect, useState, type FormEvent } from 'react';

/* Panel de Ofitodo — v1: Mensajes recibidos, Pedidos, Productos (precio/stock).
   Habla con /api/admin/* (misma cookie de sesión, mismo dominio). Lenguaje humano, cero jerga. */

type Json = Record<string, unknown>;
async function api(ruta: string, metodo = 'GET', cuerpo?: Json) {
  const r = await fetch('/api' + ruta, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    credentials: 'same-origin',
  });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.mensaje ?? 'Error');
  return j;
}
const fmt = (n: number | null) => (n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }));
const fecha = (s: string) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

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

function Mensajes() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  useEffect(() => { api('/admin/mensajes').then((r) => setFilas(r.mensajes as Json[])); }, []);
  if (!filas) return <p>Cargando…</p>;
  if (!filas.length) return <p>Aún no hay mensajes de los formularios del sitio.</p>;
  return (
    <div className="lista">
      {filas.map((m) => (
        <details key={String(m.id)} className="tarjeta">
          <summary><strong>{String(m.formulario)}</strong> · {fecha(String(m.creado))} <span className="suave">desde {String(m.pagina || 'el sitio')}</span></summary>
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
                {['pendiente', 'confirmado', 'entregado', 'cancelado'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </summary>
            <p><strong>{String(cli.billing_first_name)} {String(cli.billing_last_name)}</strong> · {String(cli.billing_phone)} · {String(cli.billing_email)}</p>
            <p>{String(cli.billing_address_1)} {String(cli.billing_address_2 || '')}, {String(cli.billing_city)}, {String(cli.billing_state)}, CP {String(cli.billing_postcode)}</p>
            {Boolean(cli.order_comments) && <p>Notas: {String(cli.order_comments)}</p>}
            <ul>{items.map((it, i) => <li key={i}>{String(it.nombre)} × {String(it.qty)} = {fmt(it.subtotal as number)}</li>)}</ul>
          </details>
        );
      })}
    </div>
  );
}

function Productos() {
  const [filas, setFilas] = useState<Json[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { api('/admin/productos').then((r) => setFilas(r.productos as Json[])); }, []);
  async function guardar(p: Json, precio: string, stock: string) {
    await api('/admin/productos', 'PUT', { slug: p.slug, precio: precio === '' ? null : +precio, stock });
    setAviso(`Guardado: ${String(p.nombre)}. El precio nuevo se usa de inmediato en pedidos y búsqueda; la página del producto se actualiza en la próxima publicación del sitio.`);
    setTimeout(() => setAviso(null), 6000);
  }
  if (!filas) return <p>Cargando…</p>;
  const vis = filas.filter((p) => (String(p.nombre) + ' ' + String(p.sku ?? '')).toLowerCase().includes(filtro.toLowerCase())).slice(0, 60);
  return (
    <div>
      <p><input className="buscar" placeholder="Busca un producto por nombre o SKU…" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></p>
      {aviso && <p className="aviso">{aviso}</p>}
      <table className="tabla">
        <thead><tr><th>Producto</th><th>SKU</th><th>Precio (vacío = por cotización)</th><th>Disponibilidad</th><th></th></tr></thead>
        <tbody>
          {vis.map((p) => <FilaProducto key={String(p.slug)} p={p} onGuardar={guardar} />)}
        </tbody>
      </table>
      {vis.length === 60 && <p className="suave">Mostrando los primeros 60 — usa el buscador para encontrar el resto.</p>}
    </div>
  );
}
function FilaProducto({ p, onGuardar }: { p: Json; onGuardar: (p: Json, precio: string, stock: string) => Promise<void> }) {
  const [precio, setPrecio] = useState(p.precio == null ? '' : String(p.precio));
  const [stock, setStock] = useState(String(p.stock ?? 'instock'));
  const [guardando, setGuardando] = useState(false);
  return (
    <tr>
      <td><a href={`/producto/${String(p.slug)}/`} target="_blank" rel="noreferrer">{String(p.nombre)}</a></td>
      <td>{String(p.sku ?? '—')}</td>
      <td><input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="por cotización" /></td>
      <td><select value={stock} onChange={(e) => setStock(e.target.value)}><option value="instock">Disponible</option><option value="outofstock">Agotado</option></select></td>
      <td><button disabled={guardando} onClick={async () => { setGuardando(true); await onGuardar(p, precio, stock); setGuardando(false); }}>{guardando ? '…' : 'Guardar'}</button></td>
    </tr>
  );
}

export function App() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [tab, setTab] = useState<'mensajes' | 'pedidos' | 'productos'>('mensajes');
  useEffect(() => { api('/admin/yo').then((r) => setNombre(r.nombre as string)).catch(() => {}).finally(() => setListo(true)); }, []);
  if (!listo) return null;
  if (!nombre) return <Login onOk={setNombre} />;
  return (
    <div className="panel">
      <header className="barra">
        <strong>Panel de Ofitodo</strong>
        <nav>
          {(['mensajes', 'pedidos', 'productos'] as const).map((t) => (
            <button key={t} className={tab === t ? 'activa' : ''} onClick={() => setTab(t)}>
              {t === 'mensajes' ? 'Mensajes recibidos' : t === 'pedidos' ? 'Pedidos' : 'Productos'}
            </button>
          ))}
        </nav>
        <span className="suave">Hola, {nombre} · <a href="#salir" onClick={async (e) => { e.preventDefault(); await api('/admin/salir', 'POST'); location.reload(); }}>Salir</a></span>
      </header>
      <main className="contenido">
        {tab === 'mensajes' && <Mensajes />}
        {tab === 'pedidos' && <Pedidos />}
        {tab === 'productos' && <Productos />}
      </main>
    </div>
  );
}
