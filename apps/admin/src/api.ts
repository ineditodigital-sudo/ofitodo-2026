// Cliente de la API del panel. Misma cookie de sesión, mismo dominio.
// Reintenta una vez las mutaciones (el arranque en frío del CGI puede leer el cuerpo vacío).
export async function api(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<any> {
  const sep = ruta.includes('?') ? '&' : '?';
  const intento = async () => {
    const url = '/api' + ruta + sep + 'cb=' + Date.now() + Math.random().toString(36).slice(2, 6);
    const r = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      credentials: 'same-origin',
    });
    const j = await r.json();
    if (!r.ok || j.ok === false) throw new Error(j.mensaje ?? 'Ocurrió un error');
    return j;
  };
  // Reintenta hasta 2 veces (el arranque en frío del servidor puede fallar la 1ª petición)
  let ultimo: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await intento(); }
    catch (e) { ultimo = e; await new Promise((res) => setTimeout(res, 350 * (i + 1))); }
  }
  throw ultimo;
}

export const fmtDinero = (n: number | null) =>
  n == null ? 'por cotización' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
export const fmtFecha = (s: string) =>
  new Date(s.replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export interface Campo {
  id: string; tipo: 'texto' | 'imagen' | 'enlace'; etiqueta: string; seccion: string;
  valor?: string; src?: string; alt?: string; texto?: string; href?: string; target?: string;
}
export interface PaginaEditable { pagina: string; titulo: string; key: string; campos: Campo[]; }

// Sube una imagen (data URL) y devuelve su URL pública optimizada
export async function subirImagen(file: File): Promise<{ url: string; peso: number }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
  });
  return api('/admin/media', 'POST', { nombre: file.name, archivo: dataUrl });
}
