import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole(3), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_historial, id_admin, admin_nombre, accion, descripcion,
              entidad_tipo, entidad_id, detalles, fecha
       FROM historial_admin
       ORDER BY fecha DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
