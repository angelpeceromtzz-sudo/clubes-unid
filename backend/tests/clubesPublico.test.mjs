// Pruebas H6: el listado público de clubes no expone PII del presidente y
// filtra estatus 3 en servidor; el listado admin autenticado sí los incluye.
// Pool simulado; JWT ficticio; sin red externa.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: clubesRouter } = await import('../routes/clubes.js');

const consultas = [];

pool.query = async (sql, params = []) => {
  const texto = String(sql).trim();
  consultas.push({ sql: texto, params });

  // Revalidación de authenticate (H2): admin ficticio activo.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    if (params[0] === 3) {
      return { rows: [{ id_usuario: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (/FROM clubes_con_estado c[\s\S]*cat_estatus_clubes/.test(texto)) {
    // Fila representativa; los campos que no se pidan quedan ausentes.
    return {
      rows: [{
        id_club: 1,
        nombre_club: 'Club Ficticio',
        cupo_actual: '0',
        formularios_recibidos: '0',
      }],
      rowCount: 1,
    };
  }
  if (/FROM clubes_niveles cn/.test(texto)) {
    return { rows: [], rowCount: 0 };
  }
  return { rows: [], rowCount: 0 };
};

const token = jwt.sign(
  { id: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/clubes', clubesRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('GET público: filtra estatus 3 en servidor y no selecciona datos del presidente', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/clubes`);
  assert.equal(r.status, 200);
  const listado = consultas.find((c) => /FROM clubes_con_estado/.test(c.sql));
  assert.ok(listado.sql.includes('id_estatus_club <> 3'), 'debe filtrar estatus 3 en el WHERE');
  assert.ok(!/id_responsable_club/.test(listado.sql), 'no debe seleccionar id_responsable_club');
  assert.ok(!/presidente_nombre/.test(listado.sql), 'no debe seleccionar presidente_nombre');
  assert.ok(!/FROM usuarios p|LEFT JOIN usuarios/.test(listado.sql), 'no debe unirse a usuarios');
});

test('GET /admin: exige sesión y rol 3', async () => {
  const sinToken = await fetch(`${base}/api/clubes/admin`);
  assert.equal(sinToken.status, 401);
  const r = await fetch(`${base}/api/clubes/admin`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(r.status, 200);
});

test('GET /admin: el SELECT incluye estatus 3 y los campos de presidente', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/clubes/admin`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(r.status, 200);
  const listado = consultas.find((c) => /FROM clubes_con_estado/.test(c.sql));
  assert.ok(!/id_estatus_club <> 3/.test(listado.sql), 'el admin ve todos los estatus');
  assert.ok(/id_responsable_club/.test(listado.sql), 'el admin ve id_responsable_club');
  assert.ok(/presidente_nombre/.test(listado.sql), 'el admin ve presidente_nombre');
});

test('GET /:id público: no expone presidente_correo ni id_vicepresidente', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/clubes/1`);
  assert.equal(r.status, 200);
  const detalle = consultas.find((c) => /WHERE c\.id_club = \$1/.test(c.sql));
  assert.ok(detalle, 'debe ejecutar la consulta del detalle');
  assert.ok(!/presidente_correo|correo_institucional/.test(detalle.sql), 'no debe seleccionar el correo del presidente');
  assert.ok(!/id_vicepresidente/.test(detalle.sql), 'no debe seleccionar el id del vicepresidente');
  assert.ok(/presidente_nombre/.test(detalle.sql), 'conserva presidente_nombre para la tarjeta pública');
  assert.ok(/id_responsable_club/.test(detalle.sql), 'conserva id_responsable_club (gate de render y badge de panel)');
});
