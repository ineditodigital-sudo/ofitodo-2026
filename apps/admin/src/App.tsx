import { useEffect, useState, type FormEvent, type ReactNode, type ComponentType, type SVGProps } from 'react';
import { api, fmtDinero, fmtFecha } from './api.ts';
import { PageEditor } from './PageEditor.tsx';
import { Medios } from './Medios.tsx';
import * as Ic from './Icons.tsx';

const LOGO = 'https://ofitodo.com/wp-content/uploads/2025/12/logo-azul-3.webp';

/* Panel de Ofitodo — CMS a la medida. Todo en lenguaje humano, imposible de romper. */

type Tab = 'inicio' | 'paginas' | 'global' | 'tienda' | 'blog' | 'menus' | 'marca' | 'contacto' | 'mensajes' | 'pedidos' | 'medios' | 'ayuda';
const ESTADOS: Record<string, string> = { pendiente: 'Pendiente', confirmado: 'Confirmado', entregado: 'Entregado', cancelado: 'Cancelado', 'wc-processing': 'En proceso', 'wc-failed': 'Fallido' };

const ICON: Record<Tab, ComponentType<SVGProps<SVGSVGElement>>> = {
  inicio: Ic.IconInicio, paginas: Ic.IconPaginas, global: Ic.IconGlobal, tienda: Ic.IconTienda, blog: Ic.IconBlog, menus: Ic.IconMenus,
  marca: Ic.IconMarca, contacto: Ic.IconContacto, mensajes: Ic.IconMensajes, pedidos: Ic.IconPedidos, medios: Ic.IconImagenes, ayuda: Ic.IconAyuda,
};
const NOMBRE: Record<Tab, string> = {
  inicio: 'Inicio', paginas: 'Páginas', global: 'Encabezado y pie', tienda: 'Tienda', blog: 'Blog',
  menus: 'Menús', marca: 'Marca y colores', contacto: 'Contacto y redes', mensajes: 'Mensajes',
  pedidos: 'Pedidos', medios: 'Medios', ayuda: 'Ayuda',
};

export function App() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [tab, setTab] = useState<Tab>('inicio');
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  useEffect(() => { api('/admin/yo').then((r) => setNombre(r.nombre)).catch(() => {}).finally(() => setListo(true)); }, []);
  function irA(t: Tab) { setTab(t); setEditorAbierto(false); setMenuAbierto(false); }
  if (!listo) return null;
  if (!nombre) return <Login onOk={setNombre} />;
  const grupos: [string, Tab[]][] = [
    ['Sitio', ['inicio', 'paginas', 'global', 'blog', 'menus']],
    ['Marca', ['marca', 'contacto', 'medios']],
    ['Tienda', ['tienda', 'pedidos', 'mensajes']],
    ['', ['ayuda']],
  ];
  // El padding solo se quita cuando el editor de página ocupa toda la pantalla
  const aPantallaCompleta = editorAbierto || tab === 'global';
  return (
    <div className={'app' + (menuAbierto ? ' menu-abierto' : '')}>
      <div className="movil-barra">
        <button className="movil-menu" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"><Ic.IconMenus /></button>
        <img className="logo-img movil-logo" src={LOGO} alt="Ofitodo" />
        <span className="usuario-ini chico">{(nombre[0] || 'A').toUpperCase()}</span>
      </div>
      <div className="lateral-fondo" onClick={() => setMenuAbierto(false)} />
      <aside className="lateral">
        <div className="marca-logo">
          <img className="logo-img" src={LOGO} alt="Ofitodo" />
          <span className="marca-sub">Panel de administración</span>
          <button className="lateral-cerrar" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">×</button>
        </div>
        <div className="nav-scroll">
          {grupos.map(([g, tabs]) => (
            <nav key={g} className="nav-grupo">
              {g && <div className="nav-grupo-tit">{g}</div>}
              {tabs.map((t) => { const I = ICON[t]; return (
                <button key={t} className={'nav-item' + (tab === t ? ' activo' : '')} onClick={() => irA(t)}>
                  <span className="nav-ico"><I /></span>{NOMBRE[t]}
                </button>
              ); })}
            </nav>
          ))}
        </div>
        <div className="lateral-pie">
          <div className="usuario"><span className="usuario-ini">{(nombre[0] || 'A').toUpperCase()}</span><div className="usuario-txt"><strong>{nombre}</strong><span>Administrador</span></div></div>
          <button className="btn-salir" onClick={async () => { await api('/admin/salir', 'POST'); location.reload(); }}><Ic.IconSalir /> Cerrar sesión</button>
        </div>
      </aside>
      <main className="principal">
        <div className={'contenido-scroll' + (aPantallaCompleta ? ' sin-pad' : '')}>
          {tab === 'inicio' && <Inicio irA={irA} nombre={nombre} />}
          {tab === 'paginas' && <Paginas onEditor={setEditorAbierto} />}
          {tab === 'global' && <Paginas soloGlobal onEditor={setEditorAbierto} />}
          {tab === 'blog' && <Paginas soloBlog onEditor={setEditorAbierto} />}
          {tab === 'tienda' && <Tienda />}
          {tab === 'pedidos' && <Pedidos />}
          {tab === 'mensajes' && <Mensajes />}
          {tab === 'marca' && <Marca />}
          {tab === 'contacto' && <Contacto />}
          {tab === 'menus' && <Placeholder titulo="Menús" texto="El menú principal y el pie se editan desde «Encabezado y pie»: cada enlace del menú es un botón editable con vista previa en vivo. Un organizador con arrastrar-y-soltar llega en la próxima versión." />}
          {tab === 'medios' && <Medios />}
          {tab === 'ayuda' && <Ayuda />}
        </div>
      </main>
    </div>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const map: Record<string, string> = { pendiente: 'amarillo', confirmado: 'azul', entregado: 'verde', cancelado: 'gris', 'wc-processing': 'azul', 'wc-failed': 'rojo' };
  return <span className={'pill pill-' + (map[estado] || 'gris')}>{ESTADOS[estado] ?? estado}</span>;
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
        <img className="logo-img grande" src={LOGO} alt="Ofitodo" />
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

function Inicio({ irA, nombre }: { irA: (t: Tab) => void; nombre: string }) {
  const [r, setR] = useState<any>(null);
  useEffect(() => { api('/admin/resumen').then(setR).catch(() => setR({})); }, []);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  if (!r) return <Cargando />;
  return (
    <div>
      <div className="hero">
        <div className="hero-txt">
          <h1>{saludo}, {nombre.split(' ')[0]}</h1>
          <p>Este es el panel de tu sitio. Desde aquí administras todo sin conocimientos técnicos.</p>
          <div className="hero-acc">
            <button className="btn-blanco" onClick={() => irA('paginas')}><Ic.IconPaginas /> Editar páginas</button>
            <button className="btn-blanco-ghost" onClick={() => irA('tienda')}>Administrar tienda</button>
          </div>
        </div>
        <div className="hero-deco"><Ic.IconInicio /></div>
      </div>
      <div className="kpis">
        <KpiCard color="azul" icon={<Ic.IconPedidos />} valor={r.pedidosPendientes ?? 0} label="pedidos por atender" onClick={() => irA('pedidos')} />
        <KpiCard color="verde" icon={<Ic.IconMensajes />} valor={r.mensajesNoLeidos ?? 0} label="mensajes sin leer" onClick={() => irA('mensajes')} />
        <KpiCard color="morado" icon={<Ic.IconPaginas />} valor={r.cambiosPendientes ?? 0} label="cambios por publicar" onClick={() => irA('paginas')} />
        <KpiCard color="naranja" icon={<Ic.IconTienda />} valor={'Tienda'} label="precios y productos" onClick={() => irA('tienda')} />
      </div>
      <div className="dos-col">
        <Card titulo="Últimos pedidos" accion={r.ultimosPedidos?.length ? <button className="link-accion" onClick={() => irA('pedidos')}>Ver todos</button> : undefined}>
          {r.ultimosPedidos?.length ? <ul className="lista-mov">{r.ultimosPedidos.map((p: any) => (
            <li key={p.numero}><span className="mov-ico azul"><Ic.IconPedidos /></span><div className="mov-info"><strong>Pedido #{p.numero}</strong><span>{fmtFecha(p.creado)}</span></div><div className="mov-der"><span className="mov-monto">{fmtDinero(p.total)}</span><EstadoPill estado={p.estado} /></div></li>
          ))}</ul> : <VacioIlustrado icon={<Ic.IconPedidos />} texto="Aún no hay pedidos. Aparecerán aquí cuando alguien compre." />}
        </Card>
        <Card titulo="Últimos mensajes" accion={r.ultimosMensajes?.length ? <button className="link-accion" onClick={() => irA('mensajes')}>Ver todos</button> : undefined}>
          {r.ultimosMensajes?.length ? <ul className="lista-mov">{r.ultimosMensajes.map((m: any) => (
            <li key={m.id}><span className="mov-ico verde"><Ic.IconMensajes /></span><div className="mov-info"><strong>{m.formulario}</strong><span>{fmtFecha(m.creado)}</span></div>{!Number(m.leido) && <span className="pill pill-azul">nuevo</span>}</li>
          ))}</ul> : <VacioIlustrado icon={<Ic.IconMensajes />} texto="Aún no hay mensajes de los formularios." />}
        </Card>
      </div>
      <div className="tip">
        <div className="tip-ico"><Ic.IconAyuda /></div>
        <div><strong>¿Cómo funciona?</strong> Los precios de productos y estados de pedidos cambian <b>al instante</b>. Los textos, imágenes, botones y colores del sitio se guardan y aparecen al pulsar <b>«Publicar»</b> (tardan unos minutos en verse).</div>
      </div>
    </div>
  );
}

function KpiCard({ color, icon, valor, label, onClick }: { color: string; icon: ReactNode; valor: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={'kpi kpi-' + color} onClick={onClick}>
      <div className="kpi-top"><span className={'kpi-ico ' + color}>{icon}</span><span className="kpi-flecha"><Ic.IconFlecha /></span></div>
      <strong>{valor}</strong><span>{label}</span>
    </button>
  );
}

const PRINCIPALES = ['/', '/nosotros/', '/productos/', '/tienda/', '/sectores/', '/contactanos/', '/blog/', '/soluciones/', '/descargar-catalogo/'];
const GRUPOS_PAG = [
  { id: 'principales', nombre: 'Páginas principales', color: 'azul' },
  { id: 'sectores', nombre: 'Muebles por sector', color: 'verde' },
  { id: 'proyectos', nombre: 'Proyectos y espacios', color: 'morado' },
  { id: 'legales', nombre: 'Avisos legales', color: 'gris' },
  { id: 'otras', nombre: 'Otras páginas', color: 'naranja' },
];
const GRUPOS_BLOG = [
  { id: 'articulos', nombre: 'Artículos del blog', color: 'azul' },
  { id: 'proyectos', nombre: 'Proyectos publicados', color: 'morado' },
];
function catPagina(p: any): string {
  if (PRINCIPALES.includes(p.slug)) return 'principales';
  if (/^\/muebles-para-/.test(p.slug)) return 'sectores';
  if (/privacidad|seguridad|aviso/.test(p.slug)) return 'legales';
  if (/interior-design|proyecto|sala-espera|destacad/.test(p.slug)) return 'proyectos';
  return 'otras';
}

function Paginas({ soloGlobal, soloBlog, onEditor }: { soloGlobal?: boolean; soloBlog?: boolean; onEditor?: (v: boolean) => void }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(soloGlobal ? '_global' : null);
  const [q, setQ] = useState('');
  useEffect(() => { api('/admin/paginas-editables').then((r) => setLista(r.paginas)); }, []);
  useEffect(() => () => onEditor?.(false), []);
  function abrir(k: string | null) { setAbierta(k); onEditor?.(!!k); }
  if (soloGlobal) return <div className="editor-full"><PageEditor pageKey="_global" onSalir={() => { }} /></div>;
  if (abierta) return <div className="editor-full"><PageEditor pageKey={abierta} onSalir={() => abrir(null)} /></div>;
  if (!lista) return <Cargando />;

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtro = norm(q.trim());
  let items = lista.filter((p) => p.key !== '_global').filter((p) => (soloBlog ? p.tipo === 'post' : p.tipo !== 'post'));
  if (filtro) items = items.filter((p) => norm(p.titulo + ' ' + p.slug).includes(filtro));

  const grupos = soloBlog ? GRUPOS_BLOG : GRUPOS_PAG;
  const catDe = soloBlog ? (p: any) => (/^\/proyecto/.test(p.slug) ? 'proyectos' : 'articulos') : catPagina;
  const porGrupo = new Map<string, any[]>();
  for (const p of items) { const c = catDe(p); if (!porGrupo.has(c)) porGrupo.set(c, []); porGrupo.get(c)!.push(p); }
  // ordenar principales por el orden curado
  porGrupo.get('principales')?.sort((a, b) => {
    const ia = PRINCIPALES.indexOf(a.slug), ib = PRINCIPALES.indexOf(b.slug);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  for (const [k, arr] of porGrupo) if (k !== 'principales') arr.sort((a, b) => a.titulo.localeCompare(b.titulo));

  const totalPub = lista.filter((p) => p.borrador).length;
  return (
    <div>
      <Encabezado titulo={soloBlog ? 'Entradas del blog' : 'Páginas del sitio'}
        sub="Haz clic en una página para editar sus textos, imágenes y botones con vista previa en vivo"
        extra={totalPub > 0 ? <span className="pill pill-amarillo">{totalPub} con cambios sin publicar</span> : undefined} />
      <div className="pg-buscar">
        <Ic.IconBuscar />
        <input placeholder={`Buscar entre ${items.length} ${soloBlog ? 'entradas' : 'páginas'}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="pg-buscar-x" onClick={() => setQ('')}>×</button>}
      </div>
      {items.length === 0 && <VacioIlustrado icon={<Ic.IconBuscar />} texto="No encontramos ninguna página con ese nombre." />}
      {grupos.map((g) => {
        const arr = porGrupo.get(g.id); if (!arr || !arr.length) return null;
        return (
          <section key={g.id} className="pg-grupo">
            <div className="pg-grupo-cab"><span className={'pg-grupo-punto ' + g.color} /><h3>{g.nombre}</h3><span className="pg-grupo-num">{arr.length}</span></div>
            <div className="pg-grid">
              {arr.map((p) => (
                <button key={p.key} className="pg-card" onClick={() => abrir(p.key)}>
                  <span className={'pg-ico ' + g.color}><Ic.IconPaginas /></span>
                  <span className="pg-body"><strong>{p.titulo}</strong><span className="pg-slug">{p.slug}</span></span>
                  <span className="pg-meta">
                    {p.borrador && <span className="pill pill-amarillo">borrador</span>}
                    <span className="pg-count">{p.campos} elementos</span>
                    <span className="pg-edit">Editar<Ic.IconFlecha /></span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
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
  if (!filas.length) return <><Encabezado titulo="Pedidos" /><VacioIlustrado icon={<Ic.IconPedidos />} texto="Todavía no hay pedidos. Cuando alguien compre contra entrega, aparecerá aquí." /></>;
  return (
    <div>
      <Encabezado titulo="Pedidos" sub="Pago contra entrega" />
      <div className="lista">
        {filas.map((p) => {
          const cli = JSON.parse(p.cliente); const items = JSON.parse(p.items);
          return (
            <details key={p.id} className="card acordeon">
              <summary>
                <span className="mov-ico azul"><Ic.IconPedidos /></span>
                <div className="ped-info"><strong>Pedido #{p.numero}</strong><span className="suave">{cli.billing_first_name} {cli.billing_last_name} · {fmtFecha(p.creado)}</span></div>
                <span className="ped-monto">{fmtDinero(p.total)}</span>
                <EstadoPill estado={p.estado} />
                <select className="ped-select" value={p.estado} onClick={(e) => e.stopPropagation()} onChange={async (e) => { await api('/admin/pedidos', 'PUT', { id: p.id, estado: e.target.value }); cargar(); }}>
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
  if (!filas.length) return <><Encabezado titulo="Mensajes" /><VacioIlustrado icon={<Ic.IconMensajes />} texto="Aún no hay mensajes de los formularios del sitio." /></>;
  return (
    <div>
      <Encabezado titulo="Mensajes recibidos" sub="Lo que llega por los formularios del sitio (también te llega por correo)" />
      <div className="lista">
        {filas.map((m) => (
          <details key={m.id} className="card acordeon" onToggle={(e) => (e.target as HTMLDetailsElement).open && !Number(m.leido) && (m.leido = 1, api('/admin/mensajes', 'PUT', { id: m.id, leido: 1 }).catch(() => {}))}>
            <summary>
              <span className="mov-ico verde"><Ic.IconMensajes /></span>
              <div className="ped-info"><strong>{m.formulario}</strong><span className="suave">{fmtFecha(m.creado)} · desde {m.pagina || 'el sitio'}</span></div>
              {Number(m.leido) ? null : <span className="pill pill-azul">nuevo</span>}
            </summary>
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
function Card({ titulo, children, accion }: { titulo?: string; children: ReactNode; accion?: ReactNode }) {
  return <section className="card bloque">{titulo && <div className="card-cab"><h3>{titulo}</h3>{accion}</div>}{children}</section>;
}
function Campo({ lbl, v, on }: { lbl: string; v: string; on: (v: string) => void }) { return <label className="campo2"><span>{lbl}</span><input value={v} onChange={(e) => on(e.target.value)} /></label>; }
function Cargando() { return <div className="cargando"><span className="spinner" /> Cargando…</div>; }
function Vacio({ texto }: { texto: string }) { return <p className="vacio">{texto}</p>; }
function VacioIlustrado({ icon, texto }: { icon: ReactNode; texto: string }) { return <div className="vacio-ilus"><span className="vacio-ico">{icon}</span><p>{texto}</p></div>; }
function Placeholder({ titulo, texto }: { titulo: string; texto: string }) { return <div><Encabezado titulo={titulo} /><Card>{<p className="suave">{texto}</p>}</Card></div>; }
