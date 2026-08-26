import { useState, type FormEvent } from 'react';

// Acceso al panel. La sesión real se implementa en Fase S (módulo auth);
// por ahora la API responde que aún no está disponible, y eso se muestra en palabras simples.
export function App() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const data = (await res.json()) as { ok: boolean; mensaje?: string };
      if (!data.ok) setMensaje(data.mensaje ?? 'No se pudo iniciar sesión.');
    } catch {
      setMensaje('No hay conexión con el servidor. Intenta de nuevo en un momento.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <form onSubmit={entrar} className="acceso-tarjeta">
        <h1>Panel de Ofitodo</h1>
        <p className="acceso-sub">Administra tu sitio web</p>
        <label>
          Usuario o correo
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        {mensaje && <p role="alert" className="acceso-error">{mensaje}</p>}
      </form>
    </main>
  );
}
