import { describe, it, expect } from 'vitest';
import app from '../src/index.ts';

describe('api', () => {
  it('GET /api/health responde ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; servicio: string };
    expect(body.ok).toBe(true);
    expect(body.servicio).toBe('ofitodo-api');
  });

  it('rutas WordPress retiradas responden 410', async () => {
    for (const ruta of ['/wp-json/wp/v2/posts', '/xmlrpc.php', '/wp-cron.php']) {
      const res = await app.request(ruta);
      expect(res.status, ruta).toBe(410);
    }
  });

  it('login aún no implementado responde 501', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST' });
    expect(res.status).toBe(501);
  });
});
