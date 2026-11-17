import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: expedienteRouter } = await import('../routes/expediente.js');

const usuariosPorRol = {
  3: { id_usuario: 100, nombre_completo: 'Admin', id_rol: 3 },
  4: { id_usuario: 101, nombre_completo: 'Rectoria', id_rol: 4 },
  1: { id_usuario: 102, nombre_completo: 'Alumno', id_rol: 1 },
  2: { id_usuario: 104, nombre_completo: 'Presidente', id_rol: 2 },
  5: { id_usuario: 105, nombre_completo: 'Vicepresidente', id_rol: 5 },
  6: { id_usuario: 106, nombre_completo: 'Mural', id_rol: 6 },
  7: { id_usuario: 103, nombre_completo: 'Coordinacion', id_rol: 7 },
};

function responder(sql, params = []) {
  const texto = String(sql);

  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const usuario = Object.values(usuariosPorRol).find((u) => u.id_usuario === Number(params[0]));
    return usuario ? { rows: [usuario], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  if (/FROM usuarios u[\s\S]*u\.id_rol = \$1/.test(texto) && /ILIKE \$2/.test(texto)) {
    return {
      rows: [{ id_usuario: 200, nombre_completo: 'Ana Lopez', correo_institucional: 'ana@ejemplo.com', institutional_id: '2024001', cuenta_desactivada: false, matricula: '2024001' }],
      rowCount: 1,
    };
  }

  if (/FROM usuarios u[\s\S]*u\.id_rol = \$2/.test(texto)) {
    if (Number(params[0]) !== 200) return { rows: [], rowCount: 0 };
    return {
      rows: [{ id_usuario: 200, nombre_completo: 'Ana Lopez', correo_institucional: 'ana@ejemplo.com', institutional_id: '2024001', fecha_registro: new Date('2025-08-01T00:00:00Z'), last_login: null, cuenta_desactivada: false, matricula: '2024001', cuatrimestre: 3, licenciatura: 'Licenciatura en Arquitectura' }],
      rowCount: 1,
    };
  }

  if (/FROM inscripciones i/.test(texto)) {
    return {
      rows: [{ id_inscripcion: 1, id_club: 5, nombre_club: 'Club A', estatus: 'activo', fecha_inscripcion: new Date('2025-09-01T00:00:00Z'), fecha_baja: null }],
      rowCount: 1,
    };
  }

  if (/FROM formularios f[\s\S]*WHERE f\.id_alumno = \$1/.test(texto)) {
    return {
      rows: [{ id_formulario: 9, id_club: 5, nombre_club: 'Club A', status: 'Miembro oficial', bloque_asignado: 'A', fecha_envio: new Date('2025-08-20T00:00:00Z'), fecha_respuesta: null, motivo_rechazo: null }],
      rowCount: 1,
    };
  }

  if (/GROUP BY s\.id_club, c\.nombre_club/.test(texto)) {
    return {
      rows: [{ id_club: 5, nombre_club: 'Club A', sesiones_registradas: 4, presentes: 2, justificadas: 1, ausentes: 1, primera_sesion: '2025-09-05', ultima_sesion: '2025-12-05' }],
      rowCount: 1,
    };
  }

  if (/JOIN periodos_actividad p/.test(texto)) {
    return {
      rows: [{ id_sesion: 1, id_club: 5, nombre_club: 'Club A', periodo: 'Sep-Dic 2025', fecha: '2025-09-05', hora_inicio: '10:00:00', hora_fin: '12:00:00', estado: 'presente', motivo_justificacion: null }],
      rowCount: 1,
    };
  }

  return { rows: [], rowCount: 0 };
}

let servidor;
let base;

before(async () => {
  pool.query = async (sql, params) => responder(sql, params);

  const app = express();
  app.use(express.json());
  app.use('/api/expediente', expedienteRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor?.close();
});

function token(idRol) {
  const usuario = usuariosPorRol[idRol];
  return jwt.sign({ id: usuario.id_usuario, nombre_completo: usuario.nombre_completo, id_rol: idRol }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

async function pedir(ruta, idRol = 3) {
  return fetch(`${base}/api/expediente${ruta}`, {
    headers: idRol ? { authorization: `Bearer ${token(idRol)}` } : {},
  });
}

test('sin token responde 401', async () => {
  const res = await pedir('/buscar?q=ana', null);
  assert.equal(res.status, 401);
});

test('alumnos y roles sin acceso reciben 403', async () => {
  for (const rol of [1, 2, 5, 6]) {
    const res = await pedir('/buscar?q=ana', rol);
    assert.equal(res.status, 403, `rol ${rol}`);
  }
});

test('búsqueda con menos de 3 caracteres responde 400', async () => {
  const res = await pedir('/buscar?q=an', 3);
  assert.equal(res.status, 400);
});

test('Coordinación VIVE (admin), Rectoría y coordinación (rol 7) pueden buscar alumnos', async () => {
  for (const rol of [3, 4, 7]) {
    const res = await pedir('/buscar?q=ana', rol);
    assert.equal(res.status, 200);
    const datos = await res.json();
    assert.equal(datos[0].nombre_completo, 'Ana Lopez');
    assert.equal(datos[0].matricula, '2024001');
  }
});

test('id de expediente no numérico responde 400', async () => {
  const res = await pedir('/abc', 4);
  assert.equal(res.status, 400);
});

test('id que no corresponde a un alumno responde 404', async () => {
  const res = await pedir('/999', 4);
  assert.equal(res.status, 404);
});

test('expediente incluye trayectoria, asistencia y resumen', async () => {
  const res = await pedir('/200', 4);
  assert.equal(res.status, 200);
  const datos = await res.json();
  assert.equal(datos.alumno.matricula, '2024001');
  assert.equal(datos.membresias.length, 1);
  assert.equal(datos.postulaciones.length, 1);
  assert.equal(datos.asistencia_por_club.length, 1);
  assert.equal(datos.sesiones.length, 1);
  assert.equal(datos.resumen.clubes_distintos, 1);
  assert.equal(datos.resumen.membresias_activas, 1);
  assert.equal(datos.resumen.sesiones_registradas, 4);
  assert.equal(datos.resumen.sesiones_asistidas, 3);
  assert.equal(datos.resumen.porcentaje_asistencia, 75);
});
