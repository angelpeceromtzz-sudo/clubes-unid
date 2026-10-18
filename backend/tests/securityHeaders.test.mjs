// Pruebas de las cabeceras de seguridad del backend (H5b).
// Middleware puro montado en Express local; sin BD, sin red externa.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { default: express } = await import('express');
const { cabecerasSeguridad } = await import('../lib/securityHeaders.js');

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(cabecerasSeguridad);
  app.get('/api/saludo', (req, res) => res.json({ ok: true }));
  app.use((req, res) => res.status(404).json({ error: 'no existe' }));
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('las respuestas llevan las cabeceras de seguridad', async () => {
  const r = await fetch(`${base}/api/saludo`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(r.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(r.headers.get('x-permitted-cross-domain-policies'), 'none');
});

test('las respuestas 404 también llevan las cabeceras', async () => {
  const r = await fetch(`${base}/api/inexistente`);
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('cross-origin-resource-policy'), 'cross-origin');
});
