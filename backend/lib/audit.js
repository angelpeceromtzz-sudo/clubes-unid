import pool from '../db.js';

export async function registrarHistorial({ idAdmin, adminNombre, accion, descripcion, entidadTipo, entidadId, detalles }) {
  try {
    await pool.query(
      `INSERT INTO historial_admin (id_admin, admin_nombre, accion, descripcion, entidad_tipo, entidad_id, detalles)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [idAdmin, adminNombre, accion, descripcion, entidadTipo || null, entidadId || null, detalles ? JSON.stringify(detalles) : null]
    );
  } catch (err) {
    console.error('Error al registrar historial:', err);
  }
}
