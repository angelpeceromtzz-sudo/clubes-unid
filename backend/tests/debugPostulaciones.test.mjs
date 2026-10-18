// H14: GET /debug-postulaciones no devuelve err.message al cliente.
//
// Antes, un fallo de PostgreSQL en esa ruta respondía 500 con el mensaje
// literal del motor (detalle interno: nombres de tablas, sintaxis, etc.).
// Ahora el detalle queda en el log del servidor y la respuesta es la
// genérica del resto del backend.
// Prueba con Express real, pool simulado que lanza un error de BD y JWT
// ficticio; sin BD ni red.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: formulariosRouter } = await import('../routes/formularios.js');

const DETALLE_INTERNO = 'relation "formularios" does not exist';

function responder(sql) {
  const texto = String(sql).trim();

  // Revalidación de authenticate (H2): admin ficticio.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    return {
      rows: [{ id_usuario: 300, nombre_completo: 'Admin Ficticio', id_rol: 3 }],
      rowCount: 1,
    };
  }

  // La consulta del endpoint debug: aquí simularmos el fallo de BD.
  if (/ORDER BY f\.id_alumno, f\.fecha_envio DESC/.test(texto)) {
    throw new Error(DETALLE_INTERNO);
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql) => responder(sql);
pool.connect = async () => ({ query: responder, release: () => {} });

const tokenAdmin = jwt.sign(
  { id: 300, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/formularios', formulariosRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('GET /debug-postulaciones con fallo de BD responde 500 genérico sin err.message', async () => {
  const r = await fetch(`${base}/api/formularios/debug-postulaciones`, {
    headers: { authorization: `Bearer ${tokenAdmin}` },
  });
  assert.equal(r.status, 500);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Error interno del servidor');
  assert.ok(
    !JSON.stringify(cuerpo).includes(DETALLE_INTERNO),
    'el mensaje interno de PostgreSQL no debe llegar al cliente',
  );
});

test('GET /debug-postulaciones sigue exigiendo rol admin (autorización conservada)', async () => {
  const sinToken = await fetch(`${base}/api/formularios/debug-postulaciones`);
  assert.equal(sinToken.status, 401);
});
