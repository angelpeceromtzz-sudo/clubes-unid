import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-ficticio-de-pruebas-expediente-qa';
process.env.DB_PASSWORD = 'ficticio';
process.env.RATE_LIMIT_GLOBAL_MINUTO = '12';
process.env.RATE_LIMIT_LECTURAS_MINUTO = '2';

const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: pool } = await import('../db.js');
const { default: expediente } = await import('../routes/expediente.js');

test('expedientes limita por usuario y por IP antes de consultar datos', async (t) => {
  let autenticaciones = 0;
  let consultas = 0;
  pool.query = async (sql, params) => {
    if (sql.includes('u.deleted_at IS NULL')) {
      autenticaciones += 1;
      return { rows: [{ id_usuario: Number(params[0]), id_rol: 3 }] };
    }
    consultas += 1;
    return { rows: [] };
  };
  const app = express();
  app.set('trust proxy', 1);
  app.use('/expediente', expediente);
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  const base = 'http://127.0.0.1:' + servidor.address().port + '/expediente';
  const pedir = (ruta, id, ip = '192.0.2.10') => fetch(base + ruta, {
    headers: { authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET), 'x-forwarded-for': ip },
  });

  assert.equal((await pedir('/buscar?q=ana', 100)).status, 200);
  assert.equal((await pedir('/200', 100)).status, 404);
  const antes = consultas;
  const limitada = await pedir('/buscar?q=ana', 100);
  assert.equal(limitada.status, 429);
  assert.ok(Number(limitada.headers.get('retry-after')) > 0);
  assert.match((await limitada.json()).error, /Demasiadas solicitudes/);
  assert.equal(consultas, antes, 'el límite evita consultar expedientes');
  assert.equal((await pedir('/buscar?q=ana', 101)).status, 200, 'otro usuario conserva su cuota');

  // Distintos usuarios no permiten eludir la cuota por IP anterior a authenticate.
  for (let indice = 0; indice < 12; indice += 1) {
    assert.equal((await pedir('/buscar?q=ana', 200 + indice, '192.0.2.20')).status, 200);
  }
  const authAntes = autenticaciones;
  const datosAntes = consultas;
  assert.equal((await pedir('/buscar?q=ana', 999, '192.0.2.20')).status, 429);
  assert.equal(autenticaciones, authAntes, 'el límite por IP precede a la revalidación de sesión');
  assert.equal(consultas, datosAntes);
});
