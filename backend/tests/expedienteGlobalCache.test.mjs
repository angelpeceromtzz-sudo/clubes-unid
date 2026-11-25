// El 429 global se emite antes del router del expediente: la política de caché
// debe estar registrada antes en index.js y cubrir ese camino real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.RATE_LIMIT_GLOBAL_MINUTO = '2';

const { default: express } = await import('express');
const { limitadorGlobal } = await import('../lib/rateLimits.js');
const { noCacheExpediente } = await import('../lib/cacheExpediente.js');

let servidor;
let base;

before(async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(noCacheExpediente);
  app.use('/api', limitadorGlobal);
  app.use('/api/expediente', (req, res) => res.json({ ok: true }));
  app.use('/api/health', (req, res) => res.json({ ok: true }));
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('el 429 del limitador global sobre /api/expediente es private,no-store', async () => {
  const ip = '192.0.2.77';
  const pedir = (ruta) => fetch(`${base}${ruta}`, { headers: { 'x-forwarded-for': ip } });

  assert.equal((await pedir('/api/expediente/buscar?q=ana')).status, 200);
  assert.equal((await pedir('/api/expediente/200')).status, 200);
  const limitada = await pedir('/API/EXPEDIENTE/mis-reconocimientos');
  assert.equal(limitada.status, 429);
  assert.equal(limitada.headers.get('cache-control'), 'private, no-store');
});

test('la política se limita al expediente y no cambia health', async () => {
  const salud = await fetch(`${base}/api/health`, { headers: { 'x-forwarded-for': '192.0.2.78' } });
  assert.equal(salud.status, 200);
  assert.equal(salud.headers.get('cache-control'), null);
});

test('index.js registra la política antes del limitador global', () => {
  const indice = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const politica = indice.indexOf('app.use(noCacheExpediente);');
  const limitador = indice.indexOf("app.use('/api', limitadorGlobal);");
  assert.ok(politica >= 0);
  assert.ok(limitador > politica, 'el 429 global debe heredar Cache-Control');
});
