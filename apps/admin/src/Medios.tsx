import { useEffect, useState, useRef } from 'react';
import { api, subirImagen, fmtFecha } from './api.ts';
import * as Ic from './Icons.tsx';

/* Medios — repositorio de todo el material audiovisual del sitio:
   la biblioteca completa (imágenes, videos y documentos) + lo que se sube desde el panel. */

interface Medio {
  id: string | number; nombre: string; archivo: string; url: string; thumb: string;
  tipo: 'imagen' | 'video' | 'documento' | 'otro'; alt: string; fecha: string; origen: 'sitio' | 'panel'; peso?: number;
}
const TIPOS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'imagen', nombre: 'Imágenes' },
  { id: 'video', nombre: 'Videos' },
  { id: 'documento', nombre: 'Documentos' },
];
const kb = (n?: number) => (n ? (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB') : '');

export function Medios() {
  const [datos, setDatos] = useState<{ medios: Medio[]; total: number; paginas: number; conteos: any } | null>(null);
  const [q, setQ] = useState(''); const [tipo, setTipo] = useState('todos'); const [pagina, setPagina] = useState(1);
  const [sel, setSel] = useState<Medio | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const tRef = useRef<any>(null);

  const cargar = (p = pagina, busq = q, t = tipo) =>
    api(`/admin/medios?pagina=${p}&q=${encodeURIComponent(busq)}&tipo=${t}`).then(setDatos);
  useEffect(() => { cargar(1, '', 'todos'); }, []);

  function buscar(v: string) {
    setQ(v); setPagina(1);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => cargar(1, v, tipo), 320);
  }
  function filtrar(t: string) { setTipo(t); setPagina(1); cargar(1, q, t); }
  function irPagina(p: number) { setPagina(p); cargar(p, q, tipo); window.scrollTo({ top: 0 }); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setSubiendo(true);
    try { for (const f of files) await subirImagen(f); await cargar(1, '', tipo); setPagina(1); setQ(''); }
    catch (x) { alert((x as Error).message); } finally { setSubiendo(false); }
  }
  function copiar(url: string) {
    const abs = url.startsWith('http') ? url : location.origin + url;
    navigator.clipboard?.writeText(abs).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); });
  }

  return (
    <div>
      <header className="cab">
        <div><h1>Medios</h1><p>Todas las imágenes, videos y documentos de tu sitio en un solo lugar</p></div>
        <label className="btn-pri">{subiendo ? 'Subiendo…' : 'Subir archivos'}<input type="file" accept="image/*,video/*,.pdf" multiple hidden onChange={onFile} disabled={subiendo} /></label>
      </header>

      <div className="med-barra">
        <div className="pg-buscar med-buscar">
          <Ic.IconBuscar />
          <input placeholder="Buscar por nombre de archivo…" value={q} onChange={(e) => buscar(e.target.value)} />
          {q && <button className="pg-buscar-x" onClick={() => buscar('')}>×</button>}
        </div>
        <div className="med-tabs">
          {TIPOS.map((t) => <button key={t.id} className={'med-tab' + (tipo === t.id ? ' activo' : '')} onClick={() => filtrar(t.id)}>{t.nombre}</button>)}
        </div>
      </div>

      {!datos ? <Cargando /> : (
        <>
          <p className="med-info">{datos.total.toLocaleString('es-MX')} archivo{datos.total === 1 ? '' : 's'}{q && ' encontrados'} · {datos.conteos.subidos} subidos desde el panel</p>
          {datos.medios.length === 0
            ? <div className="vacio-ilus"><span className="vacio-ico"><Ic.IconImagenes /></span><p>No encontramos archivos con ese nombre.</p></div>
            : <div className="med-grid">
              {datos.medios.map((m) => (
                <button key={String(m.id)} className={'med-card' + (sel?.id === m.id ? ' activo' : '')} onClick={() => setSel(m)} title={m.nombre}>
                  <span className="med-thumb">
                    {m.tipo === 'imagen'
                      ? <img src={m.thumb} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = m.url; }} />
                      : <span className={'med-ph ' + m.tipo}>{m.tipo === 'video' ? 'VIDEO' : 'PDF'}</span>}
                    {m.origen === 'panel' && <span className="med-badge">nuevo</span>}
                  </span>
                  <span className="med-nombre">{m.nombre}</span>
                </button>
              ))}
            </div>}
          {datos.paginas > 1 && (
            <div className="med-pag">
              <button className="btn-sec" disabled={pagina === 1} onClick={() => irPagina(pagina - 1)}>Anterior</button>
              <span>Página {pagina} de {datos.paginas}</span>
              <button className="btn-sec" disabled={pagina >= datos.paginas} onClick={() => irPagina(pagina + 1)}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {sel && (
        <div className="med-modal" onClick={() => setSel(null)}>
          <div className="med-panel" onClick={(e) => e.stopPropagation()}>
            <button className="med-cerrar" onClick={() => setSel(null)}>×</button>
            <div className="med-vista">
              {sel.tipo === 'imagen' ? <img src={sel.url} alt={sel.alt} />
                : sel.tipo === 'video' ? <video src={sel.url} controls />
                  : <div className="med-doc"><Ic.IconPaginas /><span>{sel.archivo}</span></div>}
            </div>
            <div className="med-detalle">
              <h3>{sel.nombre}</h3>
              <dl className="med-dl">
                <div><dt>Archivo</dt><dd>{sel.archivo}</dd></div>
                <div><dt>Tipo</dt><dd style={{ textTransform: 'capitalize' }}>{sel.tipo}</dd></div>
                {sel.fecha && <div><dt>Fecha</dt><dd>{sel.fecha}</dd></div>}
                {sel.peso ? <div><dt>Peso</dt><dd>{kb(sel.peso)}</dd></div> : null}
                {sel.alt && <div><dt>Descripción</dt><dd>{sel.alt}</dd></div>}
                <div><dt>Origen</dt><dd>{sel.origen === 'panel' ? 'Subido desde el panel' : 'Biblioteca del sitio'}</dd></div>
              </dl>
              <label className="med-lbl">Dirección del archivo</label>
              <div className="med-url"><input readOnly value={sel.url} onFocus={(e) => e.target.select()} />
                <button className="btn-pri chico" onClick={() => copiar(sel.url)}>{copiado ? 'Copiado' : 'Copiar'}</button></div>
              <a className="btn-sec med-abrir" href={sel.url} target="_blank" rel="noreferrer">Abrir en una pestaña nueva</a>
              <p className="suave med-nota">Para usar esta imagen en una página, ve a <b>Páginas</b>, haz clic en la imagen que quieras cambiar y elige «Cambiar imagen».</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Cargando() { return <div className="cargando"><span className="spinner" /> Cargando…</div>; }
