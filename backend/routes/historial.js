import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';

const router = Router();

function fechaValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor));
}

router.get('/', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    const { desde, hasta, actor, accion } = req.query;

    if (desde && !fechaValida(desde)) {
      return res.status(400).json({ error: 'La fecha "desde" no es válida' });
    }
    if (hasta && !fechaValida(hasta)) {
      return res.status(400).json({ error: 'La fecha "hasta" no es válida' });
    }
    if (desde && hasta && desde > hasta) {
      return res.status(400).json({ error: 'El rango de fechas no es válido' });
    }

    const result = await pool.query(
      `SELECT id_historial, id_admin, admin_nombre, accion, descripcion,
              entidad_tipo, entidad_id, detalles, fecha
       FROM historial_admin
       WHERE ($1::date IS NULL OR fecha >= $1::date)
         AND ($2::date IS NULL OR fecha < ($2::date + INTERVAL '1 day'))
         AND ($3::text IS NULL OR admin_nombre ILIKE '%' || $3 || '%')
         AND ($4::text IS NULL OR accion = $4)
       ORDER BY fecha DESC
       LIMIT 200`,
      [desde || null, hasta || null, actor || null, accion || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
