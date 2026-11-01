import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: usuariosRouter } = await import('../routes/usuarios.js');

let servidor;
let base;

const consultasPool = [];
const consultasCliente = [];
let consultasInscripciones = [];
let rollbackLlamado = false;
let commits = 0;
let rollos = 0;
let fallarAsignacion = false;
let auditorias = [];
let snapshot = null;

const usuarios = {
  100: { id_usuario: 100, nombre_completo: 'Admin', id_rol: 3, deleted_at: null },
  101: { id_usuario: 101, nombre_completo: 'Coordinacion', id_rol: 7, deleted_at: null },
  200: { id_usuario: 200, nombre_completo: 'Alumno', id_rol: 1, deleted_at: null },
  201: { id_usuario: 201, nombre_completo: 'Responsable', id_rol: 2, deleted_at: null },
  202: { id_usuario: 202, nombre_completo: 'Rectoria', id_rol: 4, deleted_at: null },
  300: { id_usuario: 300, nombre_completo: 'Admin2', id_rol: 3, deleted_at: null },
};

const clubes = {
  5: { id_club: 5, nombre_club: 'Club A', id_responsable_club: 201 },
  6: { id_club: 6, nombre_club: 'Club B', id_responsable_club: null },
  7: { id_club: 7, nombre_club: 'Club C', id_responsable_club: 999 },
};

function registrarConsulta(lista, sql, params) {
  const texto = String(sql);
  lista.push({ sql: texto, params: params || [] });
  if (/inscripciones|membres|postulacion/i.test(texto)) {
    consultasInscripciones.push({ sql: texto, params: params || [] });
  }
}

function responderCliente(sql, params = []) {
  const texto = String(sql).trim();
  registrarConsulta(consultasCliente, texto, params);

  if (/^BEGIN/i.test(texto)) {
    snapshot = {
      usuarios: Object.fromEntries(Object.entries(usuarios).map(([k, v]) => [k, { id_rol: v.id_rol }])),
      clubes: Object.fromEntries(Object.entries(clubes).map(([k, v]) => [k, { id_responsable_club: v.id_responsable_club }])),
    };
    return { rows: [], rowCount: 0 };
  }
  if (/^COMMIT/i.test(texto)) {
    commits += 1;
    snapshot = null;
    return { rows: [], rowCount: 0 };
  }
  if (/^ROLLBACK/i.test(texto)) {
    rollos += 1;
    rollbackLlamado = true;
    if (snapshot) {
      for (const [k, v] of Object.entries(snapshot.usuarios)) usuarios[k].id_rol = v.id_rol;
      for (const [k, v] of Object.entries(snapshot.clubes)) clubes[k].id_responsable_club = v.id_responsable_club;
      snapshot = null;
    }
    return { rows: [], rowCount: 0 };
  }

  if (/SELECT id_usuario, id_rol, deleted_at, nombre_completo FROM usuarios WHERE id_usuario = \$1/.test(texto)) {
    const u = usuarios[params[0]];
    return u ? { rows: [u], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/SELECT id_club, nombre_club, id_responsable_club FROM clubes WHERE id_club = \$1/.test(texto)) {
    const c = clubes[params[0]];
    return c ? { rows: [c], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/SELECT id_club FROM clubes WHERE id_responsable_club = \$1/.test(texto)) {
    const ids = Object.values(clubes)
      .filter((c) => c.id_responsable_club === params[0])
      .map((c) => ({ id_club: c.id_club }));
    return { rows: ids, rowCount: ids.length };
  }

  if (/UPDATE clubes SET id_responsable_club = NULL WHERE id_responsable_club = \$1 AND id_club <> \$2/.test(texto)) {
    for (const c of Object.values(clubes)) {
      if (c.id_responsable_club === params[0] && Number(c.id_club) !== Number(params[1])) c.id_responsable_club = null;
    }
    return { rows: [], rowCount: 1 };
  }

  if (/UPDATE usuarios SET id_rol = \$1 WHERE id_usuario = \$2/.test(texto)) {
    usuarios[params[1]].id_rol = params[0];
    return { rows: [], rowCount: 1 };
  }

  if (/UPDATE clubes SET id_responsable_club = \$1 WHERE id_club = \$2/.test(texto)) {
    if (fallarAsignacion) throw new Error('fallo simulado');
    clubes[params[1]].id_responsable_club = params[0];
    return { rows: [], rowCount: 1 };
  }

  if (/UPDATE clubes SET id_responsable_club = NULL WHERE id_responsable_club = \$1/.test(texto)) {
    for (const c of Object.values(clubes)) {
      if (c.id_responsable_club === params[0]) c.id_responsable_club = null;
    }
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

function responderPool(sql, params = []) {
  const texto = String(sql).trim();
  registrarConsulta(consultasPool, texto, params);

  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const u = usuarios[params[0]];
    return u ? { rows: [u], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/INSERT INTO historial_admin/.test(texto)) {
    auditorias.push({ sql: texto, params: params || [] });
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

function token(id, rol) {
  return jwt.sign({ id, nombre_completo: `Usuario ${id}`, id_rol: rol }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

before(async () => {
  pool.query = async (sql, params) => responderPool(sql, params);
  pool.connect = async () => ({
    query: async (sql, params) => responderCliente(sql, params),
    release: () => {},
  });

  const app = express();
  app.use(express.json());
  app.use('/api/usuarios', usuariosRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

function reiniciarEstado() {
  consultasPool.length = 0;
  consultasCliente.length = 0;
  consultasInscripciones.length = 0;
  rollbackLlamado = false;
  commits = 0;
  rollos = 0;
  fallarAsignacion = false;
  auditorias.length = 0;
  usuarios[200].id_rol = 1;
  usuarios[201].id_rol = 2;
  clubes[5].id_responsable_club = 201;
  clubes[6].id_responsable_club = null;
  clubes[7].id_responsable_club = 999;
}

async function pedir(tokenUsuario, idUsuario, body) {
  return fetch(`${base}/api/usuarios/${idUsuario}/asignar-club`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(tokenUsuario ? { authorization: `Bearer ${tokenUsuario}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test('admin puede asignar responsabilidad a un alumno', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 200, { id_club: 6 });
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.equal(cuerpo.nombre_club, 'Club B');
  assert.equal(usuarios[200].id_rol, 2);
  assert.equal(clubes[6].id_responsable_club, 200);
  assert.equal(consultasInscripciones.length, 0);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].params[2], 'asignar_responsable');
  assert.equal(auditorias[0].params[0], 100);
  assert.equal(auditorias[0].params[5], 200);
});

test('coordinacion puede asignar responsabilidad a un alumno', async () => {
  reiniciarEstado();
  const r = await pedir(token(101, 7), 200, { id_club: 6 });
  assert.equal(r.status, 200);
  assert.equal(usuarios[200].id_rol, 2);
  assert.equal(clubes[6].id_responsable_club, 200);
});

test('alumno no puede ejecutar el endpoint', async () => {
  reiniciarEstado();
  const r = await pedir(token(200, 1), 200, { id_club: 6 });
  assert.equal(r.status, 403);
});

test('responsable no puede ejecutar el endpoint sobre otro usuario', async () => {
  reiniciarEstado();
  const r = await pedir(token(201, 2), 200, { id_club: 6 });
  assert.equal(r.status, 403);
});

test('rectoria no puede ejecutar el endpoint', async () => {
  reiniciarEstado();
  const r = await pedir(token(202, 4), 200, { id_club: 6 });
  assert.equal(r.status, 403);
});

test('sin token responde 401', async () => {
  reiniciarEstado();
  const r = await pedir(null, 200, { id_club: 6 });
  assert.equal(r.status, 401);
});

test('no se puede modificar una cuenta de administrador', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 300, { id_club: 6 });
  assert.equal(r.status, 400);
});

test('no se puede modificar una cuenta de coordinacion', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 101, { id_club: 6 });
  assert.equal(r.status, 400);
});

test('no se puede modificar una cuenta de rectoria', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 202, { id_club: 6 });
  assert.equal(r.status, 400);
});

test('un club no acepta un segundo responsable', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 200, { id_club: 7 });
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /ya tiene un responsable/i);
});

test('un responsable no puede quedar asignado a dos clubes', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 201, { id_club: 6 });
  assert.equal(r.status, 200);
  assert.equal(clubes[5].id_responsable_club, null);
  assert.equal(clubes[6].id_responsable_club, 201);
});

test('reasignacion actualiza club anterior y nuevo en la misma transaccion', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 201, { id_club: 6 });
  assert.equal(r.status, 200);
  assert.equal(clubes[5].id_responsable_club, null);
  assert.equal(clubes[6].id_responsable_club, 201);
  assert.equal(usuarios[201].id_rol, 2);
  assert.equal(consultasInscripciones.length, 0);
  const auditoria = auditorias[0];
  assert.equal(auditoria.params[2], 'reasignar_responsable');
  assert.match(String(auditoria.params[3]), /Club B/);
});

test('retirar responsabilidad devuelve al usuario a alumno', async () => {
  reiniciarEstado();
  const r = await pedir(token(100, 3), 201, { id_club: null });
  assert.equal(r.status, 200);
  assert.equal(usuarios[201].id_rol, 1);
  assert.equal(clubes[5].id_responsable_club, null);
  assert.equal(consultasInscripciones.length, 0);
  assert.equal(auditorias.length, 1);
  assert.equal(auditorias[0].params[2], 'retirar_responsable');
  assert.equal(auditorias[0].params[6], null);
});

test('una falla en la asignacion revierte la transaccion', async () => {
  reiniciarEstado();
  fallarAsignacion = true;
  const r = await pedir(token(100, 3), 200, { id_club: 6 });
  assert.equal(r.status, 500);
  assert.equal(rollbackLlamado, true);
  assert.equal(clubes[6].id_responsable_club, null);
  assert.equal(usuarios[200].id_rol, 1);
  assert.equal(auditorias.length, 0);
});
