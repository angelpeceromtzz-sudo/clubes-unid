// Pruebas de integración de POST /api/notificaciones (auditoría H7, cierre).
//
// Cubren la ruta completa: middleware authenticate (JWT firmado con un
// secreto ficticio solo de prueba), express.json, la consulta simulada de
// club sobre el pool y el INSERT. El pool se sustituye por un stub que
// registra cada llamada: se verifica que las solicitudes denegadas no
// generan ninguna inserción y que las autorizadas insertan una sola vez con
// los valores normalizados.
//
// Datos y credenciales ficticios; no se usa base de datos ni red externa.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';
process.env.ADMIN_SECRET = 'secreto-admin-prueba';

const { default: pool } = await import('../db.js');
const { default: notificacionesRouter } = await import('../routes/notificaciones.js');
const jwt = (await import('jsonwebtoken')).default;
const express = (await import('express')).default;

const SECRET = process.env.JWT_SECRET;

// --- Stub del pool: registra llamadas y resuelve solo lo que la ruta usa ---
const llamadas = [];
const CLUB_PROPIO = { id_club: 7, id_responsable_club: 50, id_vicepresidente: 51 };
const CLUB_OTRO = { id_club: 8, id_responsable_club: 60, id_vicepresidente: 61 };

// Usuarios activos ficticios (id → fila). La revalidación de authenticate
// (H2) consulta usuarios con deleted_at IS NULL; el stub replica ese filtro.
const USUARIOS_ACTIVOS = new Map([
  [10, { id_usuario: 10, nombre_completo: 'Admin Ficticio', id_rol: 3 }],
  [11, { id_usuario: 11, nombre_completo: 'Rectoría Ficticia', id_rol: 4 }],
  [50, { id_usuario: 50, nombre_completo: 'Presidente Ficticio', id_rol: 2 }],
  [100, { id_usuario: 100, nombre_completo: 'Alumna Ficticia', id_rol: 1 }],
]);
// Desactivados: existen pero con deleted_at; la consulta filtrada no los devuelve.
const USUARIOS_DESACTIVADOS = new Set([200]);

pool.query = async (sql, params = []) => {
  const texto = String(sql).trim();
  llamadas.push({ sql: texto, params });
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const fila = USUARIOS_ACTIVOS.get(params[0]) ?? null;
    return { rows: fila ? [fila] : [], rowCount: fila ? 1 : 0 };
  }
  if (/FROM clubes WHERE id_club/.test(texto)) {
    const row = params[0] === CLUB_PROPIO.id_club ? CLUB_PROPIO
      : params[0] === CLUB_OTRO.id_club ? CLUB_OTRO
      : null;
    return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
  }
  if (/INSERT INTO notificaciones \(/.test(texto)) {
    return {
      rows: [{
        id_notificacion: 999,
        id_emisor: params[0],
        titulo: params[1],
        mensaje: params[2],
        audiencia: params[3],
        id_club: params[4],
        id_destinatario: params[5],
      }],
      rowCount: 1,
    };
  }
  // historial_admin y cualquier otra consulta: respuesta vacía inocua
  return { rows: [], rowCount: 0 };
};

function reiniciarRegistro() {
  llamadas.length = 0;
}
function insercionesNotificaciones() {
  return llamadas.filter((l) => /INSERT INTO notificaciones \(/.test(l.sql));
}
function llamadasDeRevalidacion() {
  return llamadas.filter((l) => /FROM usuarios u[\s\S]*deleted_at IS NULL/.test(l.sql));
}

// --- Servidor de prueba y cliente ---
let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/notificaciones', notificacionesRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor?.close();
});

function tokenDe(id, id_rol) {
  return jwt.sign(
    { id, nombre_completo: 'Usuario Ficticio', correo_institucional: 'ficticio@unid.mx', institutional_id: 'F000', id_rol, rol: 'test' },
    SECRET,
    { expiresIn: '5m' }
  );
}

async function postNotificacion(token, body) {
  const res = await fetch(`${base}/api/notificaciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// --- Casos ---

test('sin token: 401 y ninguna escritura', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(null, { titulo: 'x', mensaje: 'y', audiencia: 'global' });
  assert.equal(r.status, 401);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('alumno (rol 1) con audiencia global: 403, solo revalidación de sesión, sin inserciones', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(100, 1), { titulo: 'Prueba', mensaje: 'x', audiencia: 'global' });
  assert.equal(r.status, 403);
  assert.equal(llamadasDeRevalidacion().length, 1, 'authenticate revalida contra BD (H2)');
  assert.equal(llamadas.length, 1, 'la matriz debe rechazar sin más consultas (clubes) ni inserciones');
  assert.equal(insercionesNotificaciones().length, 0);
});

test('alumno (rol 1) intentando audiencia club: 403, sin inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(100, 1), { titulo: 'Prueba', mensaje: 'x', audiencia: 'club', id_club: 7 });
  assert.equal(r.status, 403);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('presidente de club 7 a su club: 201 con una inserción normalizada', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(50, 2), {
    titulo: 'Aviso', mensaje: 'Reunión', audiencia: 'club', id_club: 7,
  });
  assert.equal(r.status, 201);
  const inserciones = insercionesNotificaciones();
  assert.equal(inserciones.length, 1);
  assert.equal(inserciones[0].params[4], 7, 'id_club normalizado');
  assert.equal(inserciones[0].params[5], null, 'sin destinatario personal');
});

test('presidente del club 7 intentando el club 8: 403 y sin inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(50, 2), {
    titulo: 'Aviso', mensaje: 'x', audiencia: 'club', id_club: 8,
  });
  assert.equal(r.status, 403);
  assert.equal(insercionesNotificaciones().length, 0, 'un líder de otro club no debe insertar');
});

test('presidente con audiencia global: 403, solo revalidación de sesión, sin otras consultas', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(50, 2), { titulo: 'Aviso', mensaje: 'x', audiencia: 'global' });
  assert.equal(r.status, 403);
  assert.equal(llamadas.length, 1, 'solo la consulta de revalidación de authenticate (H2)');
  assert.equal(llamadasDeRevalidacion().length, 1);
});

test('presidente sin id_club: 400 y sin inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(50, 2), { titulo: 'Aviso', mensaje: 'x', audiencia: 'club' });
  assert.equal(r.status, 400);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('admin (rol 3) con audiencia global: 201 y una inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(10, 3), { titulo: 'Anuncio', mensaje: 'x', audiencia: 'global', password: 'secreto-admin-prueba' });
  assert.equal(r.status, 201);
  assert.equal(insercionesNotificaciones().length, 1);
});

test('admin a club inexistente: 404 y sin inserción (sin depender del FK)', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(10, 3), {
    titulo: 'Anuncio', mensaje: 'x', audiencia: 'club', id_club: 999, password: 'secreto-admin-prueba',
  });
  assert.equal(r.status, 404);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('admin con id_destinatario inválido: 400 y sin inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(10, 3), {
    titulo: 'Directo', mensaje: 'x', audiencia: 'global', id_destinatario: 'no-numerico', password: 'secreto-admin-prueba',
  });
  assert.equal(r.status, 400);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('audiencia desconocida: 400 y sin inserción', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(10, 3), { titulo: 'x', mensaje: 'y', audiencia: 'todos', password: 'secreto-admin-prueba' });
  assert.equal(r.status, 400);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('rectoría (rol 4) conserva la capacidad pre-existente de emitir global (decisión pendiente documentada)', async () => {
  reiniciarRegistro();
  const r = await postNotificacion(tokenDe(11, 4), { titulo: 'Aviso', mensaje: 'x', audiencia: 'global', password: 'secreto-admin-prueba' });
  assert.equal(r.status, 201);
  assert.equal(insercionesNotificaciones().length, 1);
});

// --- Revalidación H2 en la ruta ---

test('token con rol antiguo: el rol actual de la BD manda (alumno con token de admin → 403)', async () => {
  reiniciarRegistro();
  // El usuario 100 es alumno (rol 1) en la BD; el token fue firmado mintiendo id_rol: 3.
  const r = await postNotificacion(tokenDe(100, 3), { titulo: 'X', mensaje: 'y', audiencia: 'global' });
  assert.equal(r.status, 403);
  assert.equal(insercionesNotificaciones().length, 0);
});

test('usuario desactivado (sin fila activa en BD): 401 y sin inserción', async () => {
  reiniciarRegistro();
  // USUARIOS_DESACTIVADOS simula deleted_at: la consulta filtrada no devuelve la fila.
  assert.ok(USUARIOS_DESACTIVADOS.has(200));
  const r = await postNotificacion(tokenDe(200, 3), { titulo: 'X', mensaje: 'y', audiencia: 'global' });
  assert.equal(r.status, 401);
  assert.equal(insercionesNotificaciones().length, 0);
});
