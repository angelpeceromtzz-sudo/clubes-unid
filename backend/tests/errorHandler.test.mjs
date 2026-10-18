// H15: manejador global de errores.
//
// Comprueba que el respaldo de errores (lib/errorHandler.js):
//   - convierte un error sin código en 500 JSON con el mensaje genérico
//     (nunca err.message ni el stack, que era el riesgo del manejador
//     por defecto de Express);
//   - conserva los 4xx intencionados (err.status del parseo de JSON malformado)
//     con un mensaje propio;
//   - está registrado en index.js (cableado de producción).
// Express real montado en un puerto efímero; sin BD ni red.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { default: express } = await import('express');
const { manejadorErroresGlobal } = await import('../lib/errorHandler.js');

const DETALLE_INTERNO = 'detalle-interno-de-la-bd-que-no-debe-filtrarse';

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());

  app.get('/api/explota', (req, res, next) => {
    next(new Error(DETALLE_INTERNO));
  });

  app.post('/api/malo-cliente', (req, res, next) => {
    const err = new Error('Unexpected token } in JSON');
    err.status = 400;
    next(err);
  });

  app.use(manejadorErroresGlobal);

  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('un error sin código responde 500 JSON genérico, sin err.message ni stack', async () => {
  const r = await fetch(`${base}/api/explota`);
  assert.equal(r.status, 500);
  assert.match(r.headers.get('content-type') || '', /application\/json/);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Error interno del servidor');
  const texto = JSON.stringify(cuerpo);
  assert.ok(!texto.includes(DETALLE_INTERNO), 'el mensaje interno no debe filtrarse');
  assert.ok(!texto.includes('at '), 'el stack no debe filtrarse');
});

test('un error con err.status 4xx conserva el código y responde mensaje genérico', async () => {
  const r = await fetch(`${base}/api/malo-cliente`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Solicitud inválida');
  assert.ok(!JSON.stringify(cuerpo).includes('Unexpected token'));
});

test('index.js registra el manejador global después del 404', async () => {
  const texto = await readFile(new URL('../index.js', import.meta.url), 'utf8');
  assert.match(texto, /app\.use\(manejadorErroresGlobal\)/);
  const pos404 = texto.indexOf('Ruta no encontrada');
  const posManejador = texto.indexOf('app.use(manejadorErroresGlobal)');
  assert.ok(pos404 > -1 && posManejador > pos404, 'el manejador va después del 404');
});

test('el 404 global responde sin método ni ruta y los registra en el log (H19)', async () => {
  const texto = await readFile(new URL('../index.js', import.meta.url), 'utf8');
  assert.match(
    texto,
    /res\.status\(404\)\.json\(\{ error: 'Ruta no encontrada' \}\)/,
    'la respuesta404 no debe interpolar método ni ruta',
  );
  assert.ok(
    !texto.includes('json({ error: `Ruta no encontrada:'),
    'el texto con método/ruta ya no se devuelve al cliente',
  );
  assert.match(
    texto,
    /console\.warn\(`Ruta no encontrada: \$\{req\.method\} \$\{req\.path\}`\)/,
    'el detalle método/ruta queda en el log del servidor',
  );
});
