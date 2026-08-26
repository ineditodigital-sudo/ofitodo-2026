import { Hono } from 'hono';

export type Env = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) =>
  c.json({ ok: true, servicio: 'ofitodo-api', version: '0.1.0' })
);

// Autenticación del panel — se implementa en Fase S (módulo auth):
// verificación phpass/bcrypt de los 3 admins migrados + re-hash argon2id + sesión en DB.
app.post('/api/auth/login', (c) =>
  c.json({ ok: false, mensaje: 'Autenticación pendiente de implementar (Fase S).' }, 501)
);

// Compatibilidad WordPress retirada (docs/excepciones.md #3)
app.all('/wp-json/*', (c) => c.body(null, 410));
app.all('/xmlrpc.php', (c) => c.body(null, 410));
app.all('/wp-cron.php', (c) => c.body(null, 410));

export default app;
