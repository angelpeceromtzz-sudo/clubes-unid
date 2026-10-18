// H16: autorización de las rutas reales de horarios contra el middleware.
//
// El middleware es la primera capa que decide (se ejecuta antes del handler),
// por lo que estas pruebas demuestran que conserva las restricciones
// actuales ANTES de retirar la verificación inline duplicada del handler:
//   - club propio (líder sobre el club del horario) → pasa;
//   - club ajeno → 403 con el mensaje del middleware
//     ('No eres líder de este club', distinto del inline
//      'No eres presidente ni vicepresidente de este club');
//   - usuario sin permisos (rol ≠ 2/5) → 403 del middleware;
//   - identificador inválido → 400 (antes un 'abc' llegaba a PostgreSQL y
//     terminaba en 500 por error de casteo).
// Rutas montadas en un Express real con pool simulado y JWT ficticio;
// sin red externa y sin tocar ninguna base de datos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: horariosRouter } = await import('../routes/horarios.js');

// --- Escenario ficticio ---
// Líder (id 100, rol 2) preside el club 5; Ajeno (id 200, rol 2) preside el
// club 9; Estudiante (id 50, rol 1) no lidera nada. El horario 7 pertenece
// al club 5.

function responder(sql, params = []) {
  const texto = String(sql).trim();

  // Revalidación de authenticate (H2).
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const usuarios = {
      100: { id_usuario: 100, nombre_completo: 'Líder Ficticio', id_rol: 2 },
      200: { id_usuario: 200, nombre_completo: 'Líder Ajeno', id_rol: 2 },
      50: { id_usuario: 50, nombre_completo: 'Estudiante Ficticio', id_rol: 1 },
    };
    const fila = usuarios[params[0]];
    return fila ? { rows: [fila], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  // requireClubLeader (POST /club/:idClub): liderazgo por club.
  if (/SELECT id_presidente, id_vicepresidente FROM clubes WHERE id_club = \$1/.test(texto)) {
    const clubes = {
      5: { id_presidente: 100, id_vicepresidente: null },
      9: { id_presidente: 200, id_vicepresidente: null },
    };
    const fila = clubes[params[0]];
    return fila ? { rows: [fila], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  // requireHorarioLeader y handler PUT: club real del horario.
  if (/SELECT id_club FROM horarios_club WHERE id_horario = \$1/.test(texto)) {
    if (Number(params[0]) === 7) return { rows: [{ id_club: 5 }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }

  // Liderazgo explícito sobre el club resuelto (middleware y handler).
  if (/SELECT id_club FROM clubes WHERE id_club = \$1 AND \(id_presidente/.test(texto)) {
    const [idClub, idUsuario] = params.map(Number);
    const lideres = { '5:100': true, '9:200': true };
    return lideres[`${idClub}:${idUsuario}`]
      ? { rows: [{ id_club: idClub }], rowCount: 1 }
      : { rows: [], rowCount: 0 };
  }

  // Conflicto de horario: siempre sin conflicto en estas pruebas.
  if (/FROM horarios_club[\s\S]*hora_inicio < /.test(texto)) {
    return { rows: [], rowCount: 0 };
  }

  if (/INSERT INTO horarios_club \(/.test(texto)) {
    const [idClub, dia, hin, hfin, lugar, maps, desc] = params;
    return {
      rows: [{
        id_horario: 10, id_club: Number(idClub), dia_semana: dia,
        hora_inicio: hin, hora_fin: hfin, lugar,
        ubicacion_maps: maps, descripcion: desc,
      }],
      rowCount: 1,
    };
  }

  if (/UPDATE horarios_club/.test(texto)) {
    const [dia, hin, hfin, lugar, maps, desc] = params;
    return {
      rows: [{
        id_horario: 7, id_club: 5, dia_semana: dia, hora_inicio: hin,
        hora_fin: hfin, lugar, ubicacion_maps: maps, descripcion: desc,
      }],
      rowCount: 1,
    };
  }

  if (/DELETE FROM horarios_club/.test(texto)) {
    return { rows: [{ id_horario: Number(params[0]) }], rowCount: 1 };
  }

  // BEGIN / COMMIT / ROLLBACK y cualquier otra consulta de la ruta.
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

// --- POST /club/:idClub (antes respondía siempre 400 por :idClub) ---

test('POST: líder del club crea horarios en su club (club propio)', async () => {
  const r = await pedir('POST', '/club/5', tokenLider, cuerpoHorario);
  assert.equal(r.status, 201);
  const filas = await r.json();
  assert.equal(filas.length, 1);
  assert.equal(filas[0].id_club, 5);
});

test('POST: líder de otro club recibe 403 del middleware (club ajeno)', async () => {
  const r = await pedir('POST', '/club/5', tokenAjeno, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No eres líder de este club');
});

test('POST: usuario sin rol líder recibe 403 del middleware (sin permisos)', async () => {
  const r = await pedir('POST', '/club/5', tokenEstudiante, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('POST: identificador de club no numérico responde 400 (antes 500)', async () => {
  const r = await pedir('POST', '/club/abc', tokenLider, cuerpoHorario);
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'id_club inválido');
});

// --- PUT /:id ---

test('PUT: líder del club del horario lo actualiza (club propio)', async () => {
  const r = await pedir('PUT', '/7', tokenLider, cuerpoHorario);
  assert.equal(r.status, 200);
  const horario = await r.json();
  assert.equal(horario.id_club, 5);
});

test('PUT: líder de otro club recibe 403 del middleware (club ajeno)', async () => {
  const r = await pedir('PUT', '/7', tokenAjeno, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No eres líder de este club');
});

test('PUT: usuario sin rol líder recibe 403 del middleware (sin permisos)', async () => {
  const r = await pedir('PUT', '/7', tokenEstudiante, cuerpoHorario);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('PUT: identificador de horario no numérico responde 400', async () => {
  const r = await pedir('PUT', '/abc', tokenLider, cuerpoHorario);
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'id de horario inválido');
});

test('PUT: horario inexistente responde 404 desde el middleware', async () => {
  const r = await pedir('PUT', '/999', tokenLider, cuerpoHorario);
  assert.equal(r.status, 404);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Horario no encontrado');
});

// --- DELETE /:id ---

test('DELETE: líder del club del horario lo elimina (club propio)', async () => {
  const r = await pedir('DELETE', '/7', tokenLider);
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.match(cuerpo.mensaje, /eliminado/);
});

test('DELETE: líder de otro club recibe 403 del middleware (club ajeno)', async () => {
  const r = await pedir('DELETE', '/7', tokenAjeno);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No eres líder de este club');
});

test('DELETE: usuario sin rol líder recibe 403 del middleware (sin permisos)', async () => {
  const r = await pedir('DELETE', '/7', tokenEstudiante);
  assert.equal(r.status, 403);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'No tienes permisos para esta acción');
});

test('DELETE: identificador de horario no numérico responde 400', async () => {
  const r = await pedir('DELETE', '/abc', tokenLider);
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'id de horario inválido');
});
