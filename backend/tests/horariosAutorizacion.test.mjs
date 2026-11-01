// H16: autorización de las rutas reales de horarios contra el middleware.
//
// Tras PBI-11, las escrituras directas de horarios ya no se aplican: el
// endpoint responde 409 y exige enviar una propuesta para aprobación por
// Coordinación VIVE. Estas pruebas verifican ese nuevo contrato para las
// rutas reales montadas en Express.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: horariosRouter } = await import('../routes/horarios.js');

function responder(sql, params = []) {
  const texto = String(sql).trim();

  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const usuarios = {
      100: { id_usuario: 100, nombre_completo: 'Líder Ficticio', id_rol: 2 },
      200: { id_usuario: 200, nombre_completo: 'Líder Ajeno', id_rol: 2 },
      50: { id_usuario: 50, nombre_completo: 'Estudiante Ficticio', id_rol: 1 },
    };
    const fila = usuarios[params[0]];
    return fila ? { rows: [fila], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/SELECT id_presidente, id_vicepresidente FROM clubes WHERE id_club = \$1/.test(texto)) {
    const clubes = {
      5: { id_presidente: 100, id_vicepresidente: null },
      9: { id_presidente: 200, id_vicepresidente: null },
    };
    const fila = clubes[params[0]];
    return fila ? { rows: [fila], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/SELECT id_club FROM horarios_club WHERE id_horario = \$1/.test(texto)) {
    if (Number(params[0]) === 7) return { rows: [{ id_club: 5 }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }

  if (/SELECT id_club FROM clubes WHERE id_club = \$1 AND \(id_presidente/.test(texto)) {
    const [idClub, idUsuario] = params.map(Number);
    const lideres = { '5:100': true, '9:200': true };
    return lideres[`${idClub}:${idUsuario}`]
      ? { rows: [{ id_club: idClub }], rowCount: 1 }
      : { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params) => responder(sql, params);
pool.connect = async () => ({ query: responder, release: () => {} });

function token(id, nombre, rol) {
  return jwt.sign({ id, nombre_completo: nombre, id_rol: rol }, process.env.JWT_SECRET, { expiresIn: '5m' });
}
const tokenLider = token(100, 'Líder Ficticio', 2);
const tokenAjeno = token(200, 'Líder Ajeno', 2);
const tokenEstudiante = token(50, 'Estudiante Ficticio', 1);

const cuerpoHorario = {
  dias_semana: [1],
  hora_inicio: '10:00',
  hora_fin: '11:00',
  lugar: 'Cancha',
};

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/horarios', horariosRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

async function pedir(metodo, ruta, tokenUsuario, cuerpo) {
  return fetch(`${base}/api/horarios${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(tokenUsuario ? { authorization: `Bearer ${tokenUsuario}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
}

const MENSAJE_PROPUESTA = 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE';

test('POST: líder del club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('POST', '/club/5', tokenLider, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('POST: líder de otro club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('POST', '/club/5', tokenAjeno, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('POST: usuario sin rol líder recibe 403 del middleware', async () => {
  const r = await pedir('POST', '/club/5', tokenEstudiante, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('POST: identificador de club no numérico recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('POST', '/club/abc', tokenLider, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('PUT: líder del club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('PUT', '/7', tokenLider, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('PUT: líder de otro club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('PUT', '/7', tokenAjeno, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('PUT: usuario sin rol líder recibe 403 del middleware', async () => {
  const r = await pedir('PUT', '/7', tokenEstudiante, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('PUT: identificador de horario no numérico recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('PUT', '/abc', tokenLider, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('PUT: horario inexistente recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('PUT', '/999', tokenLider, cuerpoHorario);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('DELETE: líder del club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('DELETE', '/7', tokenLider);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('DELETE: líder de otro club recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('DELETE', '/7', tokenAjeno);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});

test('DELETE: usuario sin rol líder recibe 403 del middleware', async () => {
  const r = await pedir('DELETE', '/7', tokenEstudiante);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('DELETE: identificador de horario no numérico recibe 409 (escritura directa bloqueada)', async () => {
  const r = await pedir('DELETE', '/abc', tokenLider);
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, MENSAJE_PROPUESTA);
});
