/* Helper para registrar eventos operativos de clubes (actividad del sistema). */
import pool from '../db.js';

export async function registrarActividadClub({
  tipo_evento,
  id_club = null,
  id_actor = null,
  descripcion,
  detalles = null,
  client = null,
}) {
  const executor = client || pool;
  try {
    await executor.query(
      `INSERT INTO actividad_clubes (tipo_evento, id_club, id_actor, descripcion, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [tipo_evento, id_club, id_actor, descripcion, detalles ? JSON.stringify(detalles) : null]
    );
  } catch (err) {
    console.error('Error al registrar actividad del club:', err);
  }
}
