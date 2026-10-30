import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: historialRouter } = await import('../routes/historial.js');
const { default: clubesRouter } = await import('../routes/clubes.js');

const historialRows = [
  { id_historial: 1, id_admin: 100, admin_nombre: 'Admin', accion: 'crear_noticia', descripcion: 'Noticia creada', fecha: new Date('2026-01-10T10:00:00.000Z') },
  { id_historial: 2, id_admin: 101, admin_nombre: 'Coordinacion', accion: 'cambio_rol', descripcion: 'Rol cambiado', fecha: new Date('2026-02-15T10:00:00.000Z') },
];

const actividadRows = [
  { id_evento: 1, tipo_evento: 'anuncio_club', descripcion: 'Anuncio', fecha_creacion: new Date('2026-01-10T10:00:00.000Z'), nombre_club: 'Club A', actor_nombre: 'Admin' },
  { id_evento: 2, tipo_evento: 'convocatoria_publicada', descripcion: 'Convocatoria', fecha_creacion: new Date('2026-02-15T10:00:00.000Z'), nombre_club: 'Club B', actor_nombre: null },
  { id_evento: 3, tipo_evento: 'tipo_desconocido', descripcion: 'Evento raro', fecha_creacion: new Date('2026-03-01T10:00:00.000Z'), nombre_club: 'Club C', actor_nombre: 'Coord' },
];

function responder(sql, params = []) {
  const texto = String(sql);

  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    return { rows: [{ id_usuario: params[0], nombre_completo: 'Admin', id_rol: 3 }], rowCount: 1 };
  }

  if (/FROM historial_admin/.test(texto)) {
    const [desde, hasta, actor, accion] = params;
    let rows = [...historialRows];
    if (desde) rows = rows.filter((r) => r.fecha >= new Date(desde));
    if (hasta) {
      const limite = new Date(hasta);
      limite.setDate(limite.getDate() + 1);
      rows = rows.filter((r) => r.fecha < limite);
    }
    if (actor) rows = rows.filter((r) => r.admin_nombre.toLowerCase().includes(String(actor).toLowerCase()));
    if (accion) rows = rows.filter((r) => r.accion === accion);
    rows.sort((a, b) => b.fecha - a.fecha);
    return { rows, rowCount: rows.length };
  }

  if (/COUNT\(\*\)::int AS total[\s\S]*actividad_clubes/.test(texto)) {
    const [desde, hasta, actor, tipo, club] = params;
    let rows = [...actividadRows];
    if (desde) rows = rows.filter((r) => r.fecha_creacion >= new Date(desde));
    if (hasta) {
      const limite = new Date(hasta);
      limite.setDate(limite.getDate() + 1);
      rows = rows.filter((r) => r.fecha_creacion < limite);
    }
    if (actor) rows = rows.filter((r) => (r.actor_nombre || '').toLowerCase().includes(String(actor).toLowerCase()));
    if (tipo) rows = rows.filter((r) => r.tipo_evento === tipo);
    if (club) rows = rows.filter((r) => r.nombre_club === `Club ${club}` || r.id_club === club);
    return { rows: [{ total: rows.length }], rowCount: 1 };
  }

  if (/FROM actividad_clubes a/.test(texto)) {
    const [desde, hasta, actor, tipo, club, limit, offset] = params;
    let rows = [...actividadRows];
    if (desde) rows = rows.filter((r) => r.fecha_creacion >= new Date(desde));
    if (hasta) {
      const limite = new Date(hasta);
      limite.setDate(limite.getDate() + 1);
      rows = rows.filter((r) => r.fecha_creacion < limite);
    }
    if (actor) rows = rows.filter((r) => (r.actor_nombre || '').toLowerCase().includes(String(actor).toLowerCase()));
    if (tipo) rows = rows.filter((r) => r.tipo_evento === tipo);
    if (club) rows = rows.filter((r) => r.nombre_club === `Club ${club}`);
    rows.sort((a, b) => b.fecha_creacion - a.fecha_creacion);
    return { rows: rows.slice(offset, offset + limit), rowCount: rows.length };
  }

  return { rows: [], rowCount: 0 };
}

let servidorHistorial;
let baseHistorial;
let servidorActividad;
let baseActividad;

before(async () => {
  pool.query = async (sql, params) => responder(sql, params);

  const appH = express();
  appH.use(express.json());
  appH.use('/api/historial', historialRouter);
  servidorHistorial = await new Promise((resolve) => {
    const s = appH.listen(0, '127.0.0.1', () => resolve(s));
  });
  baseHistorial = `http://127.0.0.1:${servidorHistorial.address().port}`;

  const appA = express();
  appA.use(express.json());
  appA.use('/api/clubes', clubesRouter);
  servidorActividad = await new Promise((resolve) => {
    const s = appA.listen(0, '127.0.0.1', () => resolve(s));
  });
  baseActividad = `http://127.0.0.1:${servidorActividad.address().port}`;
});

after(() => {
  servidorHistorial?.close();
  servidorActividad?.close();
});

function token() {
  return jwt.sign({ id: 100, nombre_completo: 'Admin', id_rol: 3 }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

async function pedirHistorial(query = '') {
  return fetch(`${baseHistorial}/api/historial${query ? `?${query}` : ''}`, {
    headers: { authorization: `Bearer ${token()}` },
  });
}

async function pedirActividad(query = '') {
  return fetch(`${baseActividad}/api/clubes/actividad${query ? `?${query}` : ''}`, {
    headers: { authorization: `Bearer ${token()}` },
  });
}

test('historial: filtro individual por accion', async () => {
  const r = await pedirHistorial('accion=cambio_rol');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.length, 1);
  assert.equal(data[0].accion, 'cambio_rol');
});

test('historial: filtros combinados', async () => {
  const r = await pedirHistorial('desde=2026-02-01&actor=Coordinacion');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.length, 1);
  assert.equal(data[0].admin_nombre, 'Coordinacion');
});

test('historial: rango inclusivo de fechas', async () => {
  const r = await pedirHistorial('desde=2026-01-10&hasta=2026-01-10');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.length, 1);
  assert.equal(data[0].id_historial, 1);
});

test('historial: fecha invalida responde 400', async () => {
  const r = await pedirHistorial('desde=2026-99-99');
  assert.equal(r.status, 400);
});

test('historial: rango invalido responde 400', async () => {
  const r = await pedirHistorial('desde=2026-02-01&hasta=2026-01-01');
  assert.equal(r.status, 400);
});

test('actividad: filtro individual por tipo', async () => {
  const r = await pedirActividad('tipo=anuncio_club');
  const data = await r.json();
  assert.equal(r.status, 200);
  assert.equal(data.eventos.length, 1);
  assert.equal(data.eventos[0].tipo_evento, 'anuncio_club');
});

test('actividad: filtros combinados', async () => {
  const r = await pedirActividad('desde=2026-02-01&actor=Coord');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 1);
  assert.equal(data.eventos[0].actor_nombre, 'Coord');
});

test('actividad: rango inclusivo de fechas', async () => {
  const r = await pedirActividad('desde=2026-01-10&hasta=2026-01-10');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 1);
  assert.equal(data.eventos[0].id_evento, 1);
});

test('actividad: actor NULL se conserva', async () => {
  const r = await pedirActividad('actor=zzz');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 0);
  const r2 = await pedirActividad('');
  const data2 = await r2.json();
  assert.ok(data2.eventos.some((e) => e.actor_nombre === null));
});

test('actividad: tipo desconocido no rompe la respuesta', async () => {
  const r = await pedirActividad('tipo=tipo_desconocido');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 1);
});

test('actividad: paginacion con filtros conserva total', async () => {
  const r = await pedirActividad('tipo=anuncio_club&page=1');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.total, 1);
  assert.equal(data.totalPages, 1);
});

test('actividad: actor inexistente devuelve vacio', async () => {
  const r = await pedirActividad('actor=no-existe');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 0);
});

test('actividad: club inexistente devuelve vacio', async () => {
  const r = await pedirActividad('club=999');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.eventos.length, 0);
});

test('actividad: fecha invalida responde 400', async () => {
  const r = await pedirActividad('desde=2026-99-99');
  assert.equal(r.status, 400);
});
