import { useEffect, useRef, useState, useCallback } from 'react';
import { api, subirImagen, type Campo, type PaginaEditable } from './api.ts';

/* Editor de contenido con VISTA PREVIA EN VIVO:
   - izquierda: la propia página en un iframe; al hacer clic en un elemento se selecciona su campo
   - derecha: los campos editables agrupados por sección, en lenguaje humano
   - cada cambio se refleja al instante en la vista previa; Guardar borrador / Publicar */

const PREFIJO = (key: string) => (key === '_global' ? 'g:' : 'c:');

export function PageEditor({ pageKey, onSalir }: { pageKey: string; onSalir: () => void }) {
  const [pag, setPag] = useState<PaginaEditable | null>(null);
  const [cambios, setCambios] = useState<Record<string, Partial<Campo>>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'publicando'>('listo');
  const [aviso, setAviso] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { api(`/admin/pagina?key=${pageKey}`).then((r) => setPag(r.pagina)); }, [pageKey]);

  const slugPreview = pag ? (pageKey === '_global' ? '/nosotros/' : pag.pagina) : '/';

  const valorActual = useCallback((c: Campo, campo: keyof Campo): string => {
    const ch = cambios[c.id];
    if (ch && ch[campo] != null) return String(ch[campo]);
    return String(c[campo] ?? '');
  }, [cambios]);

  // Aplica un cambio en la vista previa (iframe, mismo origen)
  const patchPreview = useCallback((c: Campo, campo: string, valor: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const marca = PREFIJO(pageKey) + c.id;
    if (c.tipo === 'texto') {
      const el = doc.querySelector(`span[data-cms="${marca}"]`);
      if (el) el.textContent = valor;
    } else if (c.tipo === 'imagen') {
      const el = doc.querySelector(`img[data-cms="${marca}"]`) as HTMLImageElement | null;
      if (el) { if (campo === 'src') { el.src = valor; el.removeAttribute('srcset'); } if (campo === 'alt') el.alt = valor; }
    } else if (c.tipo === 'enlace') {
      const el = doc.querySelector(`a[data-cms="${marca}"]`) as HTMLAnchorElement | null;
      if (el) { if (campo === 'texto') el.textContent = valor; if (campo === 'href') el.setAttribute('href', valor); }
    }
  }, [pageKey]);

  function editar(c: Campo, campo: keyof Campo, valor: string) {
    setCambios((prev) => ({ ...prev, [c.id]: { ...prev[c.id], [campo]: valor } }));
    patchPreview(c, campo as string, valor);
  }

  // Al cargar el iframe: resaltar zonas editables y permitir clic para seleccionar
  function onIframeLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !pag) return;
    const st = doc.createElement('style');
    st.textContent = `[data-cms]{outline:1px dashed transparent;transition:outline .15s,background .15s;cursor:pointer}
      [data-cms]:hover{outline:2px dashed #6b7cff;background:rgba(107,124,255,.08)}
      [data-cms].of-sel{outline:2px solid #153a67;background:rgba(21,58,103,.10)}`;
    doc.head.appendChild(st);
    // aplicar los cambios ya hechos (borrador cargado)
    for (const c of pag.campos) {
      const ch = cambios[c.id]; if (!ch) continue;
      for (const k of Object.keys(ch)) patchPreview(c, k, String((ch as any)[k]));
    }
    doc.querySelectorAll('[data-cms]').forEach((el) => {
      (el as HTMLElement).addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const id = (el.getAttribute('data-cms') || '').replace(/^[cg]:/, '');
        setSel(id);
        const fila = document.getElementById('campo-' + id);
        fila?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fila?.querySelector('input,textarea')?.dispatchEvent(new Event('of-flash'));
      }, true);
    });
  }

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument; if (!doc) return;
    doc.querySelectorAll('[data-cms].of-sel').forEach((e) => e.classList.remove('of-sel'));
    if (sel) { const el = doc.querySelector(`[data-cms="${PREFIJO(pageKey)}${sel}"]`); el?.classList.add('of-sel'); }
  }, [sel, pageKey]);

  async function guardar(publicar: boolean) {
    if (!Object.keys(cambios).length) { setAviso('No hay cambios que guardar.'); return; }
    setEstado(publicar ? 'publicando' : 'guardando');
    try {
      const r = await api('/admin/pagina', 'PUT', { key: pageKey, cambios, publicar });
      setAviso(r.mensaje);
      if (publicar) setCambios({});
    } catch (e) { setAviso((e as Error).message); }
    finally { setEstado('listo'); setTimeout(() => setAviso(null), 6000); }
  }

  if (!pag) return <div className="ed-cargando">Cargando la página…</div>;

  const secciones = agrupar(pag.campos);
  const hayCambios = Object.keys(cambios).length > 0;

  return (
    <div className="editor2">
      <div className="ed-barra">
        <button className="btn-ghost" onClick={onSalir}>← Todas las páginas</button>
        <div className="ed-titulo"><strong>{pag.titulo}</strong><span>{pag.pagina}</span></div>
        <div className="ed-acciones">
          {aviso && <span className="ed-aviso">{aviso}</span>}
          <button className="btn-sec" disabled={!hayCambios || estado !== 'listo'} onClick={() => guardar(false)}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button className="btn-pri" disabled={!hayCambios || estado !== 'listo'} onClick={() => guardar(true)}>
            {estado === 'publicando' ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>
      <div className="ed-cuerpo">
        <div className="ed-preview">
          <div className="ed-preview-barra">Vista previa · haz clic en cualquier elemento para editarlo</div>
          <iframe ref={iframeRef} src={slugPreview} title="Vista previa" onLoad={onIframeLoad} />
        </div>
        <div className="ed-campos">
          {secciones.map(([sec, campos]) => (
            <section key={sec} className="ed-sec">
              {sec && <h4 className="ed-sec-tit">{sec}</h4>}
              {campos.map((c) => (
                <CampoEditor key={c.id} c={c} sel={sel === c.id} valor={valorActual} onSelect={() => setSel(c.id)} onEdit={editar} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function CampoEditor({ c, sel, valor, onSelect, onEdit }: {
  c: Campo; sel: boolean; valor: (c: Campo, k: keyof Campo) => string;
  onSelect: () => void; onEdit: (c: Campo, k: keyof Campo, v: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setSubiendo(true);
    try { const r = await subirImagen(f); onEdit(c, 'src', r.url); } catch (err) { alert((err as Error).message); }
    finally { setSubiendo(false); }
  }
  return (
    <div id={'campo-' + c.id} className={'campo' + (sel ? ' campo-sel' : '')} onFocusCapture={onSelect}>
      <label className="campo-lbl">{c.etiqueta}</label>
      {c.tipo === 'texto' && (
        valor(c, 'valor').length > 60
          ? <textarea rows={3} value={valor(c, 'valor')} onChange={(e) => onEdit(c, 'valor', e.target.value)} />
          : <input value={valor(c, 'valor')} onChange={(e) => onEdit(c, 'valor', e.target.value)} />
      )}
      {c.tipo === 'imagen' && (
        <div className="campo-img">
          {valor(c, 'src') && <img src={valor(c, 'src')} alt="" />}
          <div className="campo-img-acc">
            <label className="btn-file">{subiendo ? 'Subiendo…' : 'Cambiar imagen'}<input type="file" accept="image/*" hidden onChange={onFile} /></label>
            <input className="campo-alt" placeholder="Texto alternativo (describe la imagen)" value={valor(c, 'alt')} onChange={(e) => onEdit(c, 'alt', e.target.value)} />
          </div>
        </div>
      )}
      {c.tipo === 'enlace' && (
        <div className="campo-enlace">
          <input placeholder="Texto del botón/enlace" value={valor(c, 'texto')} onChange={(e) => onEdit(c, 'texto', e.target.value)} />
          <input placeholder="A dónde lleva (dirección web)" value={valor(c, 'href')} onChange={(e) => onEdit(c, 'href', e.target.value)} />
          <label className="campo-check"><input type="checkbox" checked={valor(c, 'target') === '_blank'} onChange={(e) => onEdit(c, 'target', e.target.checked ? '_blank' : '')} /> Abrir en otra pestaña</label>
        </div>
      )}
    </div>
  );
}

function agrupar(campos: Campo[]): [string, Campo[]][] {
  const map = new Map<string, Campo[]>();
  for (const c of campos) { const s = c.seccion || ''; if (!map.has(s)) map.set(s, []); map.get(s)!.push(c); }
  return [...map.entries()];
}
