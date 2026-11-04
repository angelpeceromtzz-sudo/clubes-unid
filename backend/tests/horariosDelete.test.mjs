// Pruebas del DELETE /api/horarios/:id tras la llegada del módulo de
// asistencia (PBI-05): sesiones.id_horario tiene ON DELETE RESTRICT, por lo
// que intentar borrar un horario con sesiones generadas es un conflicto de
// negocio (409) y no un error interno (500). Datos ficticios; pool simulado.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: pool } = await import('../db.js');
const { default: horariosRoutes } = await import('../routes/horarios.js');
const jwt = (await import('jsonwebtoken')).default;
const express = (await import('express')).default;

const SECRET = process.env.JWT_SECRET;

let horarioConSesiones = true;
let borrarFallaConRestriccion = false;
let consultas = [];

async function responder(sql, params = []) {
  const q = String(sql);
  consultas.push({ sql: q.trim(), params });

  if (/FROM usuarios u/.test(q)) {
    return {
      rows: [{ id_usuario: 50, nombre_completo: 'Presidente del Club', id_rol: 2 }],
      rowCount: 1,
    };
  }

  if (/SELECT id_club FROM horarios_club WHERE id_horario/.test(q)) {
    return { rows: [{ id_club: 7 }], rowCount: 1 };
  }

  if (/FROM clubes WHERE id_club = \$1 AND \(id_responsable_club/.test(q)) {
    return { rows: [{ id_club: 7 }], rowCount: 1 };
  }

  if (/DELETE FROM horarios_club/.test(q)) {
    if (borrarFallaConRestriccion || horarioConSesiones) {
      const err = new Error('llave foránea violada: sesiones.id_horario');
      err.code = '23503';
      throw err;
    }
    return { rows: [{ id_horario: params[0] }], rowCount: 1 };
  }

  if (/SELECT id_club FROM horarios_club WHERE/.test(q)) {
    return { rows: [{ id_club: 7 }], rowCount: 1 };
  }

  if (/UPDATE horarios_club/.test(q)) {
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params = []) => responder(sql, params);

const app = express();
app.use(express.json());
app.use('/api/horarios', horariosRoutes);
const servidor = app.listen(0);
await new Promise((resolve) => servidor.once('listening', resolve));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
after(() => servidor.close());

function tokenLider() {
  return jwt.sign(
    {
      id: 50,
      nombre_completo: 'Presidente del Club',
      correo_institucional: 'ficticio@unid.mx',
      institutional_id: 'F000',
      id_rol: 2,
      rol: 'presidente',
    },
    SECRET,
    { expiresIn: '5m' }
  );
}

async function borrar(id) {
  const res = await fetch(`${BASE}/api/horarios/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenLider()}` },
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
  horarioConSesiones = true;
  borrarFallaConRestriccion = false;
  consultas = [];
});

test('borrar horario con sesiones de asistencia: 409 (escritura directa bloqueada)', async () => {
  const r = await borrar(101);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE');
});

test('borrar horario simulando error 23503: 409', async () => {
  borrarFallaConRestriccion = true;
  const r = await borrar(101);
  assert.equal(r.status, 409);
});

test('borrar horario sin sesiones: 409 (escritura directa bloqueada)', async () => {
  horarioConSesiones = false;
  borrarFallaConRestriccion = false;
  const r = await borrar(101);
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE');
});
