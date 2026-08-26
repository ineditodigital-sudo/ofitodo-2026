import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, fmtDinero, fmtFecha, subirImagen } from './api.ts';
import { PageEditor } from './PageEditor.tsx';

/* Panel de Ofitodo — CMS a la medida. Todo en lenguaje humano, imposible de romper.
   Módulos: Inicio · Páginas · Encabezado y pie · Tienda · Blog · Menús · Marca · Contacto · Mensajes · Pedidos · Medios · Ayuda */

type Tab = 'inicio' | 'paginas' | 'global' | 'tienda' | 'blog' | 'menus' | 'marca' | 'contacto' | 'mensajes' | 'pedidos' | 'medios' | 'ayuda';
const ESTADOS: Record<string, string> = { pendiente: 'Pendiente', confirmado: 'Confirmado', entregado: 'Entregado', cancelado: 'Cancelado', 'wc-processing': 'En proceso', 'wc-failed': 'Fallido' };

const ICON: Record<Tab, string> = {
  inicio: '◧', paginas: '▤', global: '⌂', tienda: '🛍', blog: '✎', menus: '☰',
  marca: '🎨', contacto: '☏', mensajes: '✉', pedidos: '📦', medios: '🖼', ayuda: '?',
};
const NOMBRE: Record<Tab, string> = {
  inicio: 'Inicio', paginas: 'Páginas', global: 'Encabezado y pie', tienda: 'Tienda', blog: 'Blog',
  menus: 'Menús', marca: 'Marca y colores', contacto: 'Contacto y redes', mensajes: 'Mensajes',
  pedidos: 'Pedidos', medios: 'Imágenes', ayuda: 'Ayuda',
};

export function App() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [tab, setTab] = useState<Tab>('inicio');
  useEffect(() => { api('/admin/yo').then((r) => setNombre(r.nombre)).catch(() => {}).finally(() => setListo(true)); }, []);
  if (!listo) return null;
  if (!nombre) return <Login onOk={setNombre} />;
  const grupos: [string, Tab[]][] = [
    ['Sitio', ['inicio', 'paginas', 'global', 'blog', 'menus']],
    ['Marca', ['marca', 'contacto', 'medios']],
    ['Tienda', ['tienda', 'pedidos', 'mensajes']],
    ['', ['ayuda']],
  ];
  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca-logo"><span className="logo-cuadro">O</span> Ofitodo</div>
        {grupos.map(([g, tabs]) => (
          <nav key={g} className="nav-grupo">
            {g && <div className="nav-grupo-tit">{g}</div>}
            {tabs.map((t) => (
              <button key={t} className={'nav-item' + (tab === t ? ' activo' : '')} onClick={() => setTab(t)}>
                <span className="nav-ico">{ICON[t]}</span>{NOMBRE[t]}
              </button>
            ))}
          </nav>
        ))}
        <div className="lateral-pie">
          <div className="usuario"><span className="usuario-ini">{(nombre[0] || 'A').toUpperCase()}</span><div><strong>{nombre}</strong><span>Administrador</span></div></div>
          <button className="btn-salir" onClick={async () => { await api('/admin/salir', 'POST'); location.reload(); }}>Salir</button>
        </div>
      </aside>
      <main className="principal">
        {tab === 'inicio' && <Inicio irA={setTab} />}
        {tab === 'paginas' && <Paginas soloGlobal={false} />}
        {tab === 'global' && <Paginas soloGlobal />}
        {tab === 'blog' && <Paginas soloBlog />}
        {tab === 'tienda' && <Tienda />}
        {tab === 'pedidos' && <Pedidos />}
        {tab === 'mensajes' && <Mensajes />}
        {tab === 'marca' && <Marca />}
        {tab === 'contacto' && <Contacto />}
        {tab === 'menus' && <Placeholder titulo="Menús" texto="El menú principal y el pie se editan hoy desde «Encabezado y pie» (cada enlace del menú es un botón editable). Un organizador de menú con arrastrar-y-soltar llega en la próxima versión." />}
        {tab === 'medios' && <Medios />}
        {tab === 'ayuda' && <Ayuda />}
      </main>
    </div>
  );
}

function Encabezado({ titulo, sub, extra }: { titulo: string; sub?: string; extra?: ReactNode }) {
  return <header className="cab"><div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>{extra}</header>;
}

function Login({ onOk }: { onOk: (n: string) => void }) {
  const [u, setU] = useState(''); const [c, setC] = useState('');
  const [err, setErr] = useState<string | null>(null); const [load, setLoad] = useState(false);
  async function entrar(e: FormEvent) {
    e.preventDefault(); setLoad(true); setErr(null);
    try { const r = await api('/admin/login', 'POST', { usuario: u, contrasena: c }); onOk(r.nombre); }
    catch (x) { setErr((x as Error).message); } finally { setLoad(false); }
  }
  return (
    <main className="acceso">
      <form onSubmit={entrar} className="acceso-tarjeta">
        <div className="marca-logo grande"><span className="logo-cuadro">O</span> Ofitodo</div>
        <p className="acceso-sub">Administra tu sitio web</p>
        <label>Usuario o correo<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></label>
        <label>Contraseña<input type="password" value={c} onChange={(e) => setC(e.target.value)} autoComplete="current-password" required /></label>
        <button disabled={load}>{load ? 'Entrando…' : 'Entrar'}</button>
        {err && <p role="alert" className="acceso-error">{err}</p>}
        <p className="acceso-sub chico">Usa tu mismo usuario y contraseña de siempre.</p>
      </form>
    </main>
  );
}

function Inicio({ irA }: { irA: (t: Tab) => void }) {
  const [r, setR] = useState<any>(null);
  useEffect(() => { api('/admin/resumen').then(setR).catch(() => setR({})); }, []);
  if (!r) return <Cargando />;
  return (
    <div>
      <Encabezado titulo="Hola de nuevo 👋" sub="Un vistazo rápido a tu sitio y tu tienda" />
      <div className="kpis">
        <button className="kpi" onClick={() => irA('pedidos')}><span className="kpi-ico azul">📦</span><strong>{r.pedidosPendientes ?? 0}</strong><span>pedidos por atender</span></button>
        <button className="kpi" onClick={() => irA('mensajes')}><span className="kpi-ico verde">✉</span><strong>{r.mensajesNoLeidos ?? 0}</strong><span>mensajes sin leer</span></button>
        <button className="kpi" onClick={() => irA('paginas')}><span className="kpi-ico morado">▤</span><strong>{r.cambiosPendientes ?? 0}</strong><span>cambios por publicar</span></button>
        <button className="kpi" onClick={() => irA('tienda')}><span className="kpi-ico naranja">🛍</span><strong>—</strong><span>administrar tienda</span></button>
      </div>
      <div className="dos-col">
        <Card titulo="Últimos pedidos">
          {r.ultimosPedidos?.length ? <ul className="lista-simple">{r.ultimosPedidos.map((p: any) => <li key={p.numero}>#{p.numero} · {fmtDinero(p.total)} · {ESTADOS[p.estado] ?? p.estado} · {fmtFecha(p.creado)}</li>)}</ul> : <Vacio texto="Aún no hay pedidos." />}
        </Card>
        <Card titulo="Últimos mensajes">
          {r.ultimosMensajes?.length ? <ul className="lista-simple">{r.ultimosMensajes.map((m: any) => <li key={m.id}>{Number(m.leido) ? '' : '🔵 '}{m.formulario} · {fmtFecha(m.creado)}</li>)}</ul> : <Vacio texto="Aún no hay mensajes." />}
        </Card>
      </div>
      <Card titulo="¿Cómo funciona tu sitio?">
        <p><strong>Al instante:</strong> precios y disponibilidad de productos, estados de pedidos y mensajes.</p>
        <p><strong>Con «Publicar»:</strong> textos, imágenes, botones, colores y SEO — quedan guardados y se ven en el sitio en la siguiente actualización (unos minutos).</p>
      </Card>
    </div>
  );
}

function Paginas({ soloGlobal, soloBlog }: { soloGlobal?: boolean; soloBlog?: boolean }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(soloGlobal ? '_global' : null);
  useEffect(() => { api('/admin/paginas-editables').then((r) => setLista(r.paginas)); }, []);
  if (soloGlobal) return <div className="editor-full"><PageEditor pageKey="_global" onSalir={() => { }} /></div>;
  if (abierta) return <div className="editor-full"><PageEditor pageKey={abierta} onSalir={() => setAbierta(null)} /></div>;
  if (!lista) return <Cargando />;
  const esBlog = (p: any) => p.slug && /^\/(mobiliario|proyecto|estaciones|consultorios|sala|bancas|stand|manuel)/.test(p.slug);
  const items = lista.filter((p) => p.key !== '_global').filter((p) => (soloBlog ? esBlog(p) : true));
  return (
    <div>
      <Encabezado titulo={soloBlog ? 'Blog' : 'Páginas'} sub="Elige una página para editar sus textos, imágenes, botones y enlaces con vista previa en vivo" />
      <div className="grid-paginas">
        {items.map((p) => (
          <button key={p.key} className="pagina-card" onClick={() => setAbierta(p.key)}>
            <div className="pagina-card-tit">{p.titulo}</div>
            <div className="pagina-card-slug">{p.slug}</div>
            <div className="pagina-card-pie"><span>{p.campos} elementos editables</span>{p.borrador && <span className="pill-borrador">borrador</span>}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Tienda() {
  const [filas, setFilas] = useState<any[] | null>(null);
  const [filtro, setFiltro] = useState(''); const [aviso, setAviso] = useState<string | null>(null);
  const cargar = () => api('/admin/productos').then((r) => setFilas(r.productos));
  useEffect(() => { cargar(); }, []);
  if (!filas) return <Cargando />;
  const vis = filas.filter((p) => (p.nombre + ' ' + (p.sku ?? '')).toLowerCase().includes(filtro.toLowerCase())).slice(0, 60);
  async function guardar(p: any, precio: string, stock: string) {
    await api('/admin/productos', 'PUT', { slug: p.slug, precio: precio === '' ? null : +precio, stock });
    setAviso('Guardado. Precio y disponibilidad ya están activos.'); setTimeout(() => setAviso(null), 5000); cargar();
  }
  return (
    <div>
      <Encabezado titulo="Tienda" sub="Precio y disponibilidad se aplican al instante" />
      <div className="barra-buscar"><input placeholder="Busca un producto por nombre o SKU…" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
      {aviso && <p className="aviso">{aviso}</p>}
      <div className="lista">
        {vis.map((p) => <FilaProducto key={p.slug} p={p} onGuardar={guardar} />)}
      </div>
      {vis.length === 60 && <p className="suave">Mostrando 60 — usa el buscador (hay {filas.length}).</p>}
    </div>
  );
}
function FilaProducto({ p, onGuardar }: { p: any; onGuardar: (p: any, pr: string, st: string) => Promise<void> }) {
  const [precio, setPrecio] = useState(p.precio == null ? '' : String(p.precio));
  const [stock, setStock] = useState(p.stock ?? 'instock'); const [g, setG] = useState(false);
  return (
    <div className="card fila-prod">
      {p.imagen && <img src={String(p.imagen).replace(/(\.\w+)$/, '-150x150$1')} alt="" width={48} height={48} />}
      <div className="fila-prod-info"><strong>{p.nombre}</strong><span className="suave">{p.sku ?? ''}</span></div>
      <input className="in-precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="cotización" />
      <select value={stock} onChange={(e) => setStock(e.target.value)}><option value="instock">Disponible</option><option value="outofstock">Agotado</option></select>
      <a className="ver" href={`/producto/${p.slug}/`} target="_blank" rel="noreferrer">ver ↗</a>
      <button className="btn-pri chico" disabled={g} onClick={async () => { setG(true); await onGuardar(p, precio, stock); setG(false); }}>{g ? '…' : 'Guardar'}</button>
    </div>
  );
}

function Pedidos() {
  const [filas, setFilas] = useState<any[] | null>(null);
  const cargar = () => api('/admin/pedidos').then((r) => setFilas(r.pedidos));
  useEffect(() => { cargar(); }, []);
  if (!filas) return <Cargando />;
  if (!filas.length) return <><Encabezado titulo="Pedidos" /><Vacio texto="Todavía no hay pedidos. Cuando alguien compre contra entrega, aparecerá aquí." /></>;
  return (
    <div>
      <Encabezado titulo="Pedidos" sub="Pago contra entrega" />
      <div className="lista">
        {filas.map((p) => {
          const cli = JSON.parse(p.cliente); const items = JSON.parse(p.items);
          return (
            <details key={p.id} className="card">
              <summary><strong>Pedido #{p.numero}</strong> · {fmtDinero(p.total)} · {fmtFecha(p.creado)}
                <select value={p.estado} onClick={(e) => e.stopPropagation()} onChange={async (e) => { await api('/admin/pedidos', 'PUT', { id: p.id, estado: e.target.value }); cargar(); }}>
                  {Object.entries(ESTADOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </summary>
              <p><strong>{cli.billing_first_name} {cli.billing_last_name}</strong> · {cli.billing_phone} · {cli.billing_email}</p>
              <p>{cli.billing_address_1} {cli.billing_address_2 || ''}, {cli.billing_city}, {cli.billing_state}, CP {cli.billing_postcode}</p>
              {cli.order_comments && <p>Notas: {cli.order_comments}</p>}
              <ul>{items.map((it: any, i: number) => <li key={i}>{it.nombre} × {it.qty} = {fmtDinero(it.subtotal)}</li>)}</ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Mensajes() {
  const [filas, setFilas] = useState<any[] | null>(null);
  useEffect(() => { api('/admin/mensajes').then((r) => setFilas(r.mensajes)); }, []);
  if (!filas) return <Cargando />;
  if (!filas.length) return <><Encabezado titulo="Mensajes" /><Vacio texto="Aún no hay mensajes de los formularios del sitio." /></>;
  return (
    <div>
      <Encabezado titulo="Mensajes recibidos" sub="Lo que llega por los formularios del sitio (también te llega por correo)" />
      <div className="lista">
        {filas.map((m) => (
          <details key={m.id} className="card" onToggle={(e) => (e.target as HTMLDetailsElement).open && !Number(m.leido) && (m.leido = 1, api('/admin/mensajes', 'PUT', { id: m.id, leido: 1 }).catch(() => {}))}>
            <summary>{Number(m.leido) ? '' : '🔵 '}<strong>{m.formulario}</strong> · {fmtFecha(m.creado)} <span className="suave">desde {m.pagina || 'el sitio'}</span></summary>
            <dl>{Object.entries(JSON.parse(m.datos)).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v) || '—'}</dd></div>)}</dl>
          </details>
        ))}
      </div>
    </div>
  );
}

function Marca() {
  const [aj, setAj] = useState<any>(null); const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { api('/admin/ajustes').then((r) => setAj({ tema: r.tema, sitio: r.sitio })); }, []);
  if (!aj) return <Cargando />;
  const t = aj.tema; const setColor = (k: string, v: string) => setAj((a: any) => ({ ...a, tema: { ...a.tema, colores: { ...a.tema.colores, [k]: v } } }));
  async function guardar() { await api('/admin/ajustes', 'PUT', { clave: 'tema', valor: aj.tema }); setAviso('Guardado. Se aplica en la próxima actualización del sitio.'); setTimeout(() => setAviso(null), 6000); }
  const nombresColor: Record<string, string> = { primario: 'Color principal', primarioOscuro: 'Principal oscuro', primarioClaro: 'Principal claro', acento: 'Acento', acentoAlterno: 'Acento alterno', textoFuerte: 'Texto fuerte', texto: 'Texto', textoSuave: 'Texto suave', fondo: 'Fondo', borde: 'Bordes' };
  return (
    <div>
      <Encabezado titulo="Marca y colores" sub="Los colores de tu sitio. Toca un color para cambiarlo." extra={<button className="btn-pri" onClick={guardar}>Guardar cambios</button>} />
      {aviso && <p className="aviso">{aviso}</p>}
      <Card titulo="Colores de marca">
        <div className="colores-grid">
          {Object.entries(t.colores).map(([k, v]) => (
            <label key={k} className="color-item">
              <input type="color" value={String(v)} onChange={(e) => setColor(k, e.target.value)} />
              <div><strong>{nombresColor[k] ?? k}</strong><span>{String(v)}</span></div>
            </label>
          ))}
        </div>
      </Card>
      <Card titulo="Tipografías">
        <p className="suave">Títulos: <strong>{t.tipografias?.titulos}</strong> · Cuerpo: <strong>{t.tipografias?.cuerpo}</strong></p>
        <p className="suave">El cambio de tipografías desde el panel llega en la próxima versión (hoy se ajusta con el equipo para garantizar que el sitio siga viéndose bien).</p>
      </Card>
    </div>
  );
}

function Contacto() {
  const [aj, setAj] = useState<any>(null); const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => { api('/admin/ajustes').then((r) => setAj(r.sitio)); }, []);
  if (!aj) return <Cargando />;
  const c = aj.contacto || {}; const redes = aj.redes || {};
  const setC = (k: string, v: string) => setAj((a: any) => ({ ...a, contacto: { ...a.contacto, [k]: v } }));
  const setRed = (k: string, v: string) => setAj((a: any) => ({ ...a, redes: { ...a.redes, [k]: v } }));
  async function guardar() { await api('/admin/ajustes', 'PUT', { clave: 'sitio', valor: aj }); setAviso('Guardado. Se aplica en la próxima actualización del sitio.'); setTimeout(() => setAviso(null), 6000); }
  return (
    <div>
      <Encabezado titulo="Contacto y redes" sub="Teléfonos, correo, WhatsApp y redes sociales" extra={<button className="btn-pri" onClick={guardar}>Guardar cambios</button>} />
      {aviso && <p className="aviso">{aviso}</p>}
      <Card titulo="Contacto">
        <Campo lbl="WhatsApp (con lada, ej. +52449…)" v={c.whatsapp || ''} on={(v) => setC('whatsapp', v)} />
        <Campo lbl="Correo de ventas" v={c.correoVentas || ''} on={(v) => setC('correoVentas', v)} />
        <Campo lbl="Teléfonos (separados por coma)" v={(c.telefonos || []).join(', ')} on={(v) => setAj((a: any) => ({ ...a, contacto: { ...a.contacto, telefonos: v.split(',').map((s) => s.trim()).filter(Boolean) } }))} />
      </Card>
      <Card titulo="Redes sociales">
        {['facebook', 'instagram', 'linkedin', 'tiktok'].map((r) => <Campo key={r} lbl={r[0].toUpperCase() + r.slice(1)} v={redes[r] || ''} on={(v) => setRed(r, v)} />)}
      </Card>
    </div>
  );
}

function Medios() {
  const [subida, setSubida] = useState<{ url: string; peso: number } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; setSubiendo(true);
    try { setSubida(await subirImagen(f)); } catch (x) { alert((x as Error).message); } finally { setSubiendo(false); }
  }
  return (
    <div>
      <Encabezado titulo="Imágenes" sub="Sube una imagen y copia su dirección para usarla donde quieras" />
      <Card titulo="Subir imagen">
        <label className="btn-file grande">{subiendo ? 'Subiendo y optimizando…' : 'Elegir imagen'}<input type="file" accept="image/*" hidden onChange={onFile} /></label>
        {subida && <div className="subida-ok"><img src={subida.url} alt="" /><div><p>Lista ✔ ({Math.round(subida.peso / 1024)} KB)</p><input readOnly value={subida.url} onFocus={(e) => e.target.select()} /></div></div>}
        <p className="suave">Las imágenes se optimizan solas para que el sitio cargue rápido.</p>
      </Card>
    </div>
  );
}

function Ayuda() {
  return (
    <div>
      <Encabezado titulo="Ayuda" />
      <Card titulo="¿Qué puedo hacer desde aquí?">
        <p>· <strong>Páginas</strong>: edita textos, imágenes, botones y enlaces de cada página, viendo el cambio en vivo.</p>
        <p>· <strong>Encabezado y pie</strong>: el logo, el menú, los datos del pie y las redes que salen en todas las páginas.</p>
        <p>· <strong>Marca y colores</strong>: los colores de tu sitio con un selector visual.</p>
        <p>· <strong>Contacto y redes</strong>: teléfonos, WhatsApp, correo y redes sociales.</p>
        <p>· <strong>Tienda</strong>: precios y disponibilidad (al instante) y datos de productos.</p>
        <p>· <strong>Pedidos y Mensajes</strong>: lo que llega de tus clientes.</p>
      </Card>
      <Card titulo="Sobre «Guardar borrador» y «Publicar»">
        <p><strong>Guardar borrador</strong> reserva tus cambios sin mostrarlos todavía. <strong>Publicar</strong> los aplica al sitio (se ven en unos minutos). Nunca se pierde nada y el sitio no se puede romper: solo editas contenido.</p>
      </Card>
      <Card titulo="¿Necesitas ayuda?"><p>Escríbenos: cristian.castaneda@maindsoft.net</p></Card>
    </div>
  );
}

/* --- piezas reutilizables --- */
function Card({ titulo, children }: { titulo?: string; children: ReactNode }) { return <section className="card bloque">{titulo && <h3>{titulo}</h3>}{children}</section>; }
function Campo({ lbl, v, on }: { lbl: string; v: string; on: (v: string) => void }) { return <label className="campo2"><span>{lbl}</span><input value={v} onChange={(e) => on(e.target.value)} /></label>; }
function Cargando() { return <div className="cargando">Cargando…</div>; }
function Vacio({ texto }: { texto: string }) { return <p className="vacio">{texto}</p>; }
function Placeholder({ titulo, texto }: { titulo: string; texto: string }) { return <div><Encabezado titulo={titulo} /><Card>{<p>{texto}</p>}</Card></div>; }
