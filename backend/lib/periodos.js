// Resolución centralizada del periodo institucional vigente.
// Usa la fecha institucional en America/Mexico_City, no la zona del servidor.
// Casos:
//   - 0 coincidentes: periodo = null (ausencia).
//   - 1 coincidente: ese periodo.
//   - varios: inconsistencia (no se desempata arbitrariamente).
import pool from '../db.js';

export async function fechaInstitucionalHoy(db = pool) {
  const result = await db.query(
    "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date AS hoy",
  );
  return result.rows[0]?.hoy ?? null;
}

export async function resolverPeriodoVigente(db = pool, fecha = null) {
  const fechaUso = fecha ?? (await fechaInstitucionalHoy(db));
  const result = await db.query(
    `SELECT id_periodo, nombre, fecha_inicio, fecha_fin, activo
     FROM periodos_actividad
     WHERE fecha_inicio <= $1::date AND fecha_fin >= $1::date
     ORDER BY id_periodo`,
    [fechaUso],
  );
  if (result.rows.length === 0) {
    return { periodo: null, inconsistencia: false, candidatos: [] };
  }
  if (result.rows.length === 1) {
    return { periodo: result.rows[0], inconsistencia: false, candidatos: result.rows };
  }
  return { periodo: null, inconsistencia: true, candidatos: result.rows };
}

export async function obtenerPeriodoVigenteId(db = pool, fecha = null) {
  const res = await resolverPeriodoVigente(db, fecha);
  if (res.inconsistencia) {
    const err = new Error('Configuración de periodos inconsistente: varios periodos coinciden con la fecha institucional');
    err.code = 'PERIODO_INCONSISTENTE';
    err.candidatos = res.candidatos;
    throw err;
  }
  return res.periodo?.id_periodo ?? null;
}