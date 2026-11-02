// Pruebas del módulo Asistencia V1 (PBI-05) fusionado sobre develop.
//
// Cubren los defectos detectados en la auditoría: filtro de estado del
// historial ANTES del LIMIT (+ paginación), carreras de iniciar/finalizar/
// cancelar (respuestas con id_sesion, nunca cuerpo vacío ni 500), bloqueo de
// escrituras con FOR UPDATE, validación estricta de ids, permisos de la V1
// (solo presidente; Coordinación §27 en lectura) y elegibilidad por fecha
// institucional. Servidor Express real con JWT y pool simulado en memoria;
// sin base de datos ni red externa. Los casos que requieren PostgreSQL real
// (orden SQL efectivo, fechas con zona horaria del servidor) quedan para la
// verificación con PG documentada en la entrega.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: pool } = await import('../db.js');
const { default: asistenciaRoutes } = await import('../routes/asistencia.js');
const { getFechaInstitucional } = await import('../config/timezone.js');
const jwt = (await import('jsonwebtoken')).default;
const express = (await import('express')).default;

const SECRET = process.env.JWT_SECRET;
const HOY = getFechaInstitucional();

function fechaDiasAtras(n) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Merida',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(Date.now() - n * 86400000));
}

// ============================================================
// Estado en memoria que hace de PostgreSQL
// ============================================================

const USUARIOS = new Map([
  [50, { id_usuario: 50, nombre_completo: 'Presidente del Club', id_rol: 2 }],
  [100, { id_usuario: 100, nombre_completo: 'Alumna Integrante', id_rol: 1 }],
  [60, { id_usuario: 60, nombre_completo: 'Vicepresidente', id_rol: 5 }],
  [10, { id_usuario: 10, nombre_completo: 'Rectoría', id_rol: 4 }],
]);

const CLUBES = new Map([
  [7, { id_club: 7, id_responsable_club: 50 }],
  [8, { id_club: 8, id_responsable_club: 99 }], // club ajeno al presidente 50
]);

let SESIONES = new Map();
let ASISTENCIAS = new Map(); // `${idSesion}:${idUsuario}` -> {estado, motivo_justificacion}
let PERIODO_ACTIVO = 1;
let consultas = [];
let transacciones = [];
let carreraIniciar = false;
let carreraFinalizar = false;
let carreraCancelar = false;
let forzarEstadoTx = null; // estado que "ve" el FOR UPDATE (carrera con cancelación)

function nuevaSesion(campos = {}) {
  const id = campos.id_sesion ?? (SESIONES.size + 1);
  const sesion = {
    id_sesion: id,
    id_club: 7,
    id_periodo: 1,
    id_horario: 100 + id,
    fecha: HOY,
    hora_inicio: '10:00:00',
    hora_fin: '11:00:00',
    lugar: 'Salón A',
    estado: 'pendiente',
    integrantes_snapshot: [
      { id_usuario: 100, nombre_completo: 'Alumna Integrante', matricula: 'A1', licenciatura: 'Ing.' },
      { id_usuario: 200, nombre_completo: 'Egresado Baja', matricula: 'B9', licenciatura: 'Ing.' },
    ],
    iniciada_en: null,
    finalizada_en: null,
    cancelada_en: null,
    motivo_cancelacion: null,
    observacion_cancelacion: null,
    cancelada_por: null,
    ...campos,
  };
  SESIONES.set(sesion.id_sesion, sesion);
  return sesion;
}

function registradasDe(idSesion) {
  let total = 0;
  for (const clave of ASISTENCIAS.keys()) {
    if (clave.startsWith(`${idSesion}:`)) total++;
  }
  return total;
}

function estadoEfectivo(s) {
  if (s.estado === 'pendiente' && s.fecha < HOY) return 'no_registrada';
  if (s.estado === 'en_progreso' && s.fecha < HOY) return 'no_completada';
  return s.estado;
}

function filasIntegrantes(idSesion) {
  const s = SESIONES.get(idSesion);
  if (!s) return [];
  return s.integrantes_snapshot.map((i) => {
    const reg = ASISTENCIAS.get(`${idSesion}:${i.id_usuario}`) || null;
    return {
      id_usuario: i.id_usuario,
      nombre_completo: i.nombre_completo,
      matricula: i.matricula,
      licenciatura: i.licenciatura,
      estado_asistencia: reg ? reg.estado : null,
      motivo_justificacion: reg ? reg.motivo_justificacion : null,
    };
  });
}

async function responder(sql, params = []) {
  const q = String(sql);
  consultas.push({ sql: q.trim(), params });

  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(q.trim())) {
    transacciones.push(q.trim());
    return { rows: [], rowCount: 0 };
  }

  if (/FROM usuarios u/.test(q)) {
    const fila = USUARIOS.get(params[0]) ?? null;
    return { rows: fila ? [fila] : [], rowCount: fila ? 1 : 0 };
  }

  if (/INSERT INTO asistencias/.test(q)) {
    const [idSesion, idUsuario, estado, motivo] = params;
    ASISTENCIAS.set(`${idSesion}:${idUsuario}`, { estado, motivo_justificacion: motivo ?? null });
    return { rows: [], rowCount: 1 };
  }

  if (/SELECT codigo FROM cat_motivos_cancelacion/.test(q)) {
    const permitidos = ['falta_de_interes', 'otro', 'clima_adverso'];
    return { rows: permitidos.includes(params[0]) ? [{ codigo: params[0] }] : [], rowCount: 0 };
  }

  if (/COUNT\(\*\)::int AS total FROM asistencias/.test(q)) {
    return { rows: [{ total: registradasDe(params[0]) }], rowCount: 1 };
  }

  if (/SELECT \* FROM sesiones WHERE id_sesion = \$1/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    if (q.includes('AND id_club')) {
      const coincide = s && (!params[1] || s.id_club === parseInt(params[1], 10));
      return { rows: coincide ? [s] : [], rowCount: coincide ? 1 : 0 };
    }
    return { rows: s ? [s] : [], rowCount: s ? 1 : 0 };
  }

  if (/FOR UPDATE/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    if (!s) return { rows: [], rowCount: 0 };
    return {
      rows: [{ estado: forzarEstadoTx ?? s.estado, integrantes_snapshot: s.integrantes_snapshot }],
      rowCount: 1,
    };
  }

  if (/SET estado = 'en_progreso'/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    if (carreraIniciar) {
      // Otra petición ganó: el estado ya cambió y esta UPDATE no afecta filas.
      s.estado = 'en_progreso';
      s.iniciada_en = '2026-01-01T00:00:00Z';
      carreraIniciar = false;
      return { rows: [], rowCount: 0 };
    }
    if (!s || s.estado !== 'pendiente') return { rows: [], rowCount: 0 };
    s.estado = 'en_progreso';
    s.iniciada_en = '2026-01-01T00:00:00Z';
    return { rows: [{ id_sesion: s.id_sesion, estado: s.estado, iniciada_en: s.iniciada_en }], rowCount: 1 };
  }

  if (/SET estado = 'completada'/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    if (carreraFinalizar) {
      s.estado = 'completada';
      s.finalizada_en = '2026-01-01T00:01:00Z';
      carreraFinalizar = false;
      return { rows: [], rowCount: 0 };
    }
    if (!s || s.estado !== 'en_progreso') return { rows: [], rowCount: 0 };
    s.estado = 'completada';
    s.finalizada_en = '2026-01-01T00:01:00Z';
    return { rows: [{ id_sesion: s.id_sesion, estado: s.estado, finalizada_en: s.finalizada_en }], rowCount: 1 };
  }

  if (/SET estado = 'cancelada'/.test(q)) {
    const s = SESIONES.get(parseInt(params[3], 10));
    if (carreraCancelar) {
      carreraCancelar = false;
      return { rows: [], rowCount: 0 }; // otra cancelación/cambio ganó
    }
    if (!s || s.estado !== 'pendiente') return { rows: [], rowCount: 0 };
    s.estado = 'cancelada';
    s.cancelada_en = '2026-01-01T00:02:00Z';
    s.motivo_cancelacion = params[0];
    s.observacion_cancelacion = params[1];
    s.cancelada_por = params[2];
    return {
      rows: [
        {
          id_sesion: s.id_sesion,
          estado: s.estado,
          cancelada_en: s.cancelada_en,
          motivo_cancelacion: s.motivo_cancelacion,
          observacion_cancelacion: s.observacion_cancelacion,
        },
      ],
      rowCount: 1,
    };
  }

  if (/SELECT id_sesion, estado, iniciada_en FROM sesiones WHERE id_sesion = \$1/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    return { rows: s ? [{ id_sesion: s.id_sesion, estado: s.estado, iniciada_en: s.iniciada_en }] : [], rowCount: 0 };
  }

  if (/SELECT id_sesion, estado, finalizada_en FROM sesiones WHERE id_sesion = \$1/.test(q)) {
    const s = SESIONES.get(parseInt(params[0], 10));
    return { rows: s ? [{ id_sesion: s.id_sesion, estado: s.estado, finalizada_en: s.finalizada_en }] : [], rowCount: 0 };
  }

  if (/WITH sesiones_filtradas/.test(q)) {
    // Réplica fiel del SQL: estado efectivo, filtro de estado y paginación
    // ocurren ANTES de devolver filas. Sin la cláusula de estado en el SQL
    // (código V1), el límite recorta primero y el filtro JS posterior pierde
    // coincidencias.
    const filtradoEnSql = /estado_efectivo = \$\d+/.test(q);
    const clubId = params[0];
    const periodoSql = params.length === 5 ? params[1] : null;
    const [estadoParam, limitParam, offsetParam] = params.slice(-3);
    const limit = parseInt(limitParam, 10) || 50;
    const offset = parseInt(offsetParam, 10) || 0;

    let filas = [...SESIONES.values()].filter((s) => s.id_club === clubId);
    if (periodoSql) filas = filas.filter((s) => s.id_periodo === parseInt(periodoSql, 10));
    filas = filas.map((s) => ({ ...s, estado_efectivo: estadoEfectivo(s) }));
    if (filtradoEnSql && estadoParam) {
      filas = filas.filter((s) => s.estado_efectivo === estadoParam);
    }
    filas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
    filas = filas.slice(offset, offset + limit);

    return {
      rows: filas.map((s) => ({
        id_sesion: s.id_sesion,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        lugar: s.lugar,
        estado: s.estado_efectivo,
        iniciada_en: s.iniciada_en,
        finalizada_en: s.finalizada_en,
        cancelada_en: s.cancelada_en,
        motivo_cancelacion: s.motivo_cancelacion,
        observacion_cancelacion: s.observacion_cancelacion,
        total_integrantes: s.integrantes_snapshot.length,
        registradas: registradasDe(s.id_sesion),
      })),
      rowCount: filas.length,
    };
  }

  if (/CROSS JOIN LATERAL jsonb_array_elements/.test(q)) {
    return { rows: filasIntegrantes(parseInt(params[0], 10)), rowCount: 0 };
  }

  if (/AND s\.fecha = \$2::date/.test(q)) {
    const filas = [...SESIONES.values()].filter(
      (s) => s.id_club === params[0] && s.fecha === params[1]
    );
    return {
      rows: filas.map((s) => ({
        id_sesion: s.id_sesion,
        id_club: s.id_club,
        id_horario: s.id_horario,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        lugar: s.lugar,
        estado: estadoEfectivo(s),
        iniciada_en: s.iniciada_en,
        finalizada_en: s.finalizada_en,
        cancelada_en: s.cancelada_en,
        motivo_cancelacion: s.motivo_cancelacion,
        total_integrantes: s.integrantes_snapshot.length,
        registradas: registradasDe(s.id_sesion),
      })),
      rowCount: filas.length,
    };
  }

  if (/generar_sesiones_periodo_club/.test(q)) {
    return { rows: [{ ok: true }], rowCount: 1 };
  }

  if (/SELECT id_responsable_club FROM clubes WHERE id_club = \$1/.test(q)) {
    const c = CLUBES.get(parseInt(params[0], 10));
    return { rows: c ? [{ id_responsable_club: c.id_responsable_club }] : [], rowCount: 0 };
  }

  if (/SELECT id_club FROM clubes WHERE id_responsable_club = \$1/.test(q)) {
    const club = [...CLUBES.values()].find((c) => c.id_responsable_club === params[0]);
    return { rows: club ? [{ id_club: club.id_club }] : [], rowCount: 0 };
  }

  if (/SELECT id_club FROM clubes WHERE id_club = \$1/.test(q)) {
    const c = CLUBES.get(parseInt(params[0], 10));
    return { rows: c ? [{ id_club: c.id_club }] : [], rowCount: 0 };
  }

  if (/SELECT id_periodo FROM periodos_actividad WHERE activo = TRUE/.test(q)) {
    return { rows: PERIODO_ACTIVO ? [{ id_periodo: PERIODO_ACTIVO }] : [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params = []) => responder(sql, params);
pool.connect = async () => ({
  query: (sql, params = []) => responder(sql, params),
  release: () => {},
});

// ============================================================
// Servidor Express real con el router montado
// ============================================================

const app = express();
app.use(express.json());
app.use('/api/asistencia', asistenciaRoutes);
const servidor = app.listen(0);
await new Promise((resolve) => servidor.once('listening', resolve));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
after(() => servidor.close());

function token(claims) {
  return jwt.sign(
    {
      id: 50,
      nombre_completo: 'Presidente del Club',
      correo_institucional: 'ficticio@unid.mx',
      institutional_id: 'F000',
      id_rol: 2,
      rol: 'presidente',
      ...claims,
    },
    SECRET,
    { expiresIn: '5m' }
  );
}

async function pedir(metodo, ruta, { claims, body, token: tokenCustom } = {}) {
  // Por defecto se autentica como presidente (dueño del club 7); las pruebas
  // de otros roles envían claims explícitos.
  const t = tokenCustom ?? token(claims ?? { id: 50, id_rol: 2 });
  const res = await fetch(`${BASE}/api/asistencia${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* cuerpo vacío */
  }
  return { status: res.status, body: json };
}

beforeEach(() => {
  SESIONES = new Map();
  ASISTENCIAS = new Map();
  PERIODO_ACTIVO = 1;
  consultas = [];
  transacciones = [];
  carreraIniciar = false;
  carreraFinalizar = false;
  carreraCancelar = false;
  forzarEstadoTx = null;
});

// ============================================================
// Permisos (V1: solo presidente; Coordinación §27 solo lectura)
// ============================================================

test('alumno sin rol de presidente: 403 en historial', async () => {
  const r = await pedir('GET', '/historial', { claims: { id: 100, id_rol: 1 } });
  assert.equal(r.status, 403);
});

test('vicepresidente sin acceso en Asistencia V1: 403 en historial', async () => {
  const r = await pedir('GET', '/historial', { claims: { id: 60, id_rol: 5 } });
  assert.equal(r.status, 403);
});

test('rectoría (rol 4) sí lee el historial de cualquier club (§27)', async () => {
  nuevaSesion({ fecha: fechaDiasAtras(2), estado: 'completada' });
  const r = await pedir('GET', '/coordinacion/clubes/7/historial', { claims: { id: 10, id_rol: 4 } });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
  assert.equal(r.body.length, 1);
});

// ============================================================
// Validación estricta de ids (H13)
// ============================================================

test('sesión con id no estrictamente numérico (12abc): 400', async () => {
  const r = await pedir('GET', '/sesiones/12abc', {});
  assert.equal(r.status, 400);
});

test('club de coordinación con id "7x": 400 (no 500 ni consulta)', async () => {
  const r = await pedir('GET', '/coordinacion/clubes/7x/historial', { claims: { id: 10, id_rol: 4 } });
  assert.equal(r.status, 400);
});

test('historial con limit/offset/id_periodo no numéricos: 400', async () => {
  for (const q of ['?limit=grande', '?offset=-1', '?id_periodo=1x']) {
    const r = await pedir('GET', `/historial${q}`, {});
    assert.equal(r.status, 400, `esperaba 400 para ${q}`);
  }
});

test('historial con estado desconocido: 400 con el catálogo de estados', async () => {
  const r = await pedir('GET', '/historial?estado=inventado', {});
  assert.equal(r.status, 400);
  assert.match(r.body.error, /no_registrada/);
});

// ============================================================
// Historial: filtro de estado ANTES del LIMIT + paginación
// ============================================================

test('historial filtra el estado en SQL antes del LIMIT y pagina con OFFSET', async () => {
  // 5 completadas antiguas + 5 pendientes recientes (orden DESC por fecha).
  for (let i = 0; i < 5; i++) {
    nuevaSesion({ id_sesion: 10 + i, fecha: fechaDiasAtras(30 + i), estado: 'completada' });
    nuevaSesion({ id_sesion: 20 + i, fecha: fechaDiasAtras(i), estado: 'pendiente' });
  }

  const r = await pedir('GET', '/historial?estado=completada&limit=3', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 3, 'debe devolver 3 completadas aunque los primeros sean pendientes');
  assert.ok(r.body.every((f) => f.estado === 'completada'));
  assert.deepEqual(
    r.body.map((f) => f.id_sesion),
    [10, 11, 12]
  );

  // El filtro vive en el SQL y el límite se aplica después: si el estado se
  // filtrara en JS tras el LIMIT (código V1), llegarían 3 pendientes y el
  // filtro las descartaría dejando 0.
  const consultaHistorial = consultas.find((c) => c.sql.includes('WITH sesiones_filtradas'));
  assert.ok(consultaHistorial, 'el historial debe usar el CTE con estado efectivo');
  const idxEstado = consultaHistorial.sql.indexOf('estado_efectivo = $');
  const idxLimit = consultaHistorial.sql.indexOf('LIMIT $');
  assert.ok(idxEstado > 0 && idxEstado < idxLimit, 'el filtro de estado debe ir antes del LIMIT');
  assert.match(consultaHistorial.sql, /OFFSET \$\d+/);

  // Paginación: offset=1 descarta la completada más reciente.
  const r2 = await pedir('GET', '/historial?estado=completada&limit=3&offset=1', {});
  assert.equal(r2.status, 200);
  assert.deepEqual(
    r2.body.map((f) => f.id_sesion),
    [11, 12, 13]
  );
});

test('historial: sesión pasada nunca iniciada queda como no_registrada y el snapshot conserva a quien ya no está en el club', async () => {
  // El integrante 200 "egresó": no está en usuarios activos, pero su nombre
  // vive en el snapshot de la sesión (composición histórica §23).
  USUARIOS.delete(200);
  nuevaSesion({ id_sesion: 3, fecha: fechaDiasAtras(10), estado: 'pendiente' });

  const r = await pedir('GET', '/historial', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(r.body[0].estado, 'no_registrada');
  assert.equal(r.body[0].total_integrantes, 2, 'el snapshot conserva a los integrantes de ese día');
  assert.equal(r.body[0].registradas, 0);
  USUARIOS.set(200, { id_usuario: 200, nombre_completo: 'Egresado Baja', id_rol: 1 });
});

// ============================================================
// Sesiones de hoy + generación on-demand
// ============================================================

test('sesiones de hoy sin periodo activo: 400 con mensaje institucional', async () => {
  PERIODO_ACTIVO = null;
  const r = await pedir('GET', '/sesiones/hoy', {});
  assert.equal(r.status, 400);
  assert.match(r.body.error, /periodo de actividad/i);
});

test('sesiones de hoy genera y devuelve las de la fecha institucional', async () => {
  nuevaSesion({ id_sesion: 1 });
  nuevaSesion({ id_sesion: 2, fecha: fechaDiasAtras(3), estado: 'completada' });
  const r = await pedir('GET', '/sesiones/hoy', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1, 'solo las de hoy');
  assert.equal(r.body[0].id_sesion, 1);
  assert.ok(consultas.some((c) => /generar_sesiones_periodo_club/.test(c.sql)), 'generación transparente');
});

// ============================================================
// Iniciar: carrera / elegibilidad por fecha
// ============================================================

test('iniciar en carrera (doble-tap): responde 200 con en_progreso, nunca vacío ni 500', async () => {
  const s = nuevaSesion({ id_sesion: 5 });
  carreraIniciar = true;
  const r = await pedir('POST', '/sesiones/5/iniciar', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.estado, 'en_progreso');
  assert.equal(r.body.id_sesion, 5);
  assert.equal(s.estado, 'en_progreso');
});

test('iniciar sesión de días anteriores: 403 (solo el día institucional de la sesión)', async () => {
  nuevaSesion({ id_sesion: 6, fecha: fechaDiasAtras(2) });
  const r = await pedir('POST', '/sesiones/6/iniciar', {});
  assert.equal(r.status, 403);
  assert.match(r.body.error, /día correspondiente/);
});

// ============================================================
// Registros: FOR UPDATE, validaciones y rollback
// ============================================================

test('registros en sesión en progreso: FOR UPDATE + COMMIT y conteos correctos', async () => {
  nuevaSesion({ id_sesion: 7, estado: 'en_progreso' });
  const r = await pedir('PUT', '/sesiones/7/registros', {
    body: { registros: [{ id_usuario: 100, estado: 'presente', motivo_justificacion: null }] },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { registradas: 1, total_integrantes: 2 });
  assert.ok(consultas.some((c) => /FOR UPDATE/.test(c.sql)), 'la sesión debe bloquearse en la transacción');
  assert.deepEqual(transacciones, ['BEGIN', 'COMMIT']);
});

test('registros cuando la sesión fue cancelada en paralelo: 400 con ROLLBACK (sin escrituras)', async () => {
  nuevaSesion({ id_sesion: 8, estado: 'en_progreso' });
  forzarEstadoTx = 'cancelada';
  const r = await pedir('PUT', '/sesiones/8/registros', {
    body: { registros: [{ id_usuario: 100, estado: 'presente', motivo_justificacion: null }] },
  });
  assert.equal(r.status, 400);
  assert.equal(ASISTENCIAS.size, 0, 'no debe persistirse nada sobre la sesión cancelada');
  assert.deepEqual(transacciones, ['BEGIN', 'ROLLBACK']);
});

test('registros con justificado sin motivo: 400 con ROLLBACK', async () => {
  nuevaSesion({ id_sesion: 9, estado: 'en_progreso' });
  const r = await pedir('PUT', '/sesiones/9/registros', {
    body: { registros: [{ id_usuario: 100, estado: 'justificado', motivo_justificacion: '   ' }] },
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /motivo/i);
  assert.deepEqual(transacciones, ['BEGIN', 'ROLLBACK']);
});

test('registros de un usuario fuera del snapshot: 400', async () => {
  nuevaSesion({ id_sesion: 11, estado: 'en_progreso' });
  const r = await pedir('PUT', '/sesiones/11/registros', {
    body: { registros: [{ id_usuario: 999, estado: 'presente', motivo_justificacion: null }] },
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /999/);
});

// ============================================================
// Finalizar: idempotencia y carrera
// ============================================================

test('finalizar con integrantes sin registrar: 400 con conteos', async () => {
  nuevaSesion({ id_sesion: 12, estado: 'en_progreso' });
  ASISTENCIAS.set('12:100', { estado: 'presente', motivo_justificacion: null });
  const r = await pedir('POST', '/sesiones/12/finalizar', {});
  assert.equal(r.status, 400);
  assert.equal(r.body.pendientes, 1);
  assert.equal(r.body.registradas, 1);
  assert.equal(r.body.total_integrantes, 2);
});

test('finalizar en carrera: respuesta idempotente completa con id_sesion y resumen', async () => {
  const s = nuevaSesion({ id_sesion: 13, estado: 'en_progreso' });
  for (const i of s.integrantes_snapshot) {
    ASISTENCIAS.set(`13:${i.id_usuario}`, { estado: i.id_usuario === 100 ? 'presente' : 'ausente', motivo_justificacion: null });
  }
  carreraFinalizar = true;
  const r = await pedir('POST', '/sesiones/13/finalizar', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.id_sesion, 13, 'la respuesta de carrera debe incluir id_sesion');
  assert.equal(r.body.estado, 'completada');
  assert.deepEqual(r.body.resumen, { presentes: 1, ausentes: 1, justificadas: 0 });
});

test('finalizar dos veces: la segunda obtiene el resumen vigente (idempotente)', async () => {
  const s = nuevaSesion({ id_sesion: 14, estado: 'completada', finalizada_en: '2026-01-01T00:01:00Z' });
  for (const i of s.integrantes_snapshot) {
    ASISTENCIAS.set(`14:${i.id_usuario}`, { estado: 'presente', motivo_justificacion: null });
  }
  const r = await pedir('POST', '/sesiones/14/finalizar', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.id_sesion, 14);
  assert.equal(r.body.estado, 'completada');
  assert.deepEqual(r.body.resumen, { presentes: 2, ausentes: 0, justificadas: 0 });
});

// ============================================================
// Cancelar: reglas §20–§22 y carrera
// ============================================================

test('cancelar sesión pasada: 403', async () => {
  nuevaSesion({ id_sesion: 15, fecha: fechaDiasAtras(1) });
  const r = await pedir('PUT', '/sesiones/15/cancelar', { body: { motivo: 'otro', observacion: 'x' } });
  assert.equal(r.status, 403);
});

test('cancelar sesión con registros de asistencia: 400', async () => {
  const s = nuevaSesion({ id_sesion: 16 });
  ASISTENCIAS.set('16:100', { estado: 'presente', motivo_justificacion: null });
  const r = await pedir('PUT', '/sesiones/16/cancelar', { body: { motivo: 'otro', observacion: 'x' } });
  assert.equal(r.status, 400);
  assert.equal(s.estado, 'pendiente', 'la sesión no cambia de estado');
});

test('cancelar con motivo fuera del catálogo: 400; motivo "otro" sin observación: 400', async () => {
  nuevaSesion({ id_sesion: 17 });
  const r1 = await pedir('PUT', '/sesiones/17/cancelar', { body: { motivo: 'se_me_acabaron_los_integrantes' } });
  assert.equal(r1.status, 400);
  const r2 = await pedir('PUT', '/sesiones/17/cancelar', { body: { motivo: 'otro', observacion: '  ' } });
  assert.equal(r2.status, 400);
});

test('cancelar en carrera: 400 con cuerpo de error, nunca 200 con cuerpo vacío', async () => {
  const s = nuevaSesion({ id_sesion: 18 });
  carreraCancelar = true;
  const r = await pedir('PUT', '/sesiones/18/cancelar', { body: { motivo: 'otro', observacion: 'x' } });
  assert.equal(r.status, 400);
  assert.ok(r.body && r.body.error, 'debe responder un JSON con error');
});

// ============================================================
// Estadísticas: validación de periodo
// ============================================================

test('estadísticas sin periodo activo ni id_periodo: 400', async () => {
  PERIODO_ACTIVO = null;
  const r = await pedir('GET', '/estadisticas/club', {});
  assert.equal(r.status, 400);
});

test('estadísticas con id_periodo no numérico: 400', async () => {
  const r = await pedir('GET', '/estadisticas/club?id_periodo=1x', {});
  assert.equal(r.status, 400);
});

// ============================================================
// Decisiones de negocio pendientes (PBI-05 no versionado):
// NO se cambia el comportamiento hasta que la institución lo defina.
// Quedan como casos reproducibles para cuando se resuelvan.
// ============================================================

test.todo('§23 retroactividad: generar sesiones de un periodo activado hoy no debe retroceder a sesiones pasadas no iniciadas (hoy se generan; definir política institucional)');

test.todo('§edición de horario: editar/eliminar un horario no debe alterar sesiones futuras ya generadas con snapshot anterior (hoy la edición solo afecta horarios_club; definir efecto sobre sesiones futuras)');

test.todo('§29 umbrales de categoría: 90/70 son referencia V1; los definitivos son criterio institucional (los valores quedan fijos en el código hasta que se confirmen)');
