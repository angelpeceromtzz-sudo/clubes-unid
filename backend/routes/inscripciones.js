import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';

const router = Router();

// Obtiene la inscripción activa del usuario autenticado
router.get('/activa', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.nombre_club, c.descripcion, c.cupo_maximo,
              c.id_presidente, c.imagen_portada as imagen,
              c.id_estatus_club, e.nombre_estatus as estatus_club,
              c.fecha_creacion
       FROM inscripciones i
       JOIN clubes c ON c.id_club = i.id_club
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       WHERE i.id_usuario = $1 AND i.id_estatus_inscripcion = 1
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener inscripción activa:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crea una nueva inscripción (con validaciones de cupo y duplicados)
router.post('/', authenticate, async (req, res) => {
  try {
    const { id_club } = req.body;

    if (!id_club) {
      return res.status(400).json({ error: 'ID del club es obligatorio' });
    }

    if (req.user.id_rol === 3) {
      return res.status(403).json({ error: 'Los administradores no pueden inscribirse a clubes' });
    }

    const clubResult = await pool.query(
      'SELECT cupo_maximo FROM clubes WHERE id_club = $1 AND id_estatus_club = 1',
      [id_club]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club no disponible' });
    }

    const activa = await pool.query(
      `SELECT id_inscripcion FROM inscripciones
       WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
       LIMIT 1`,
      [req.user.id]
    );

    if (activa.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una inscripción activa' });
    }

    const cupoResult = await pool.query(
      `SELECT COUNT(*) as count FROM inscripciones i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       WHERE i.id_club = $1 AND i.id_estatus_inscripcion = 1 AND u.id_rol = 1`,
      [id_club]
    );

    if (parseInt(cupoResult.rows[0].count) >= clubResult.rows[0].cupo_maximo) {
      return res.status(400).json({ error: 'El club ha alcanzado su cupo máximo' });
    }

    const result = await pool.query(
      `INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
       VALUES ($1, $2, 1)
       RETURNING *`,
      [req.user.id, id_club]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear inscripción:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Da de baja a un usuario de su club actual (solo admin)
router.delete('/:userId', authenticate, requireRole(3), async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `UPDATE inscripciones
       SET id_estatus_inscripcion = 2, fecha_baja = NOW()
       WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
       RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'El usuario no tiene una inscripción activa' });
    }

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'baja_usuario',
      descripcion: `${req.user.nombre_completo} dio de baja al usuario ID ${userId} del club`,
      entidadTipo: 'usuario',
      entidadId: parseInt(userId),
    });

    res.json({ message: 'Usuario dado de baja del club exitosamente' });
  } catch (err) {
    console.error('Error al dar de baja:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
