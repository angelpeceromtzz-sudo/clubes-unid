import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Obtener todas las convocatorias de un club (presidente)
router.get('/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `SELECT cv.id_convocatoria, cv.id_formulario, cv.id_club,
              cv.fecha, cv.hora, cv.lugar, cv.descripcion, cv.fecha_creacion,
              f.nombre_completo, f.matricula, f.status,
              f.bloque_asignado
       FROM convocatorias cv
       JOIN formularios f ON f.id_formulario = cv.id_formulario
       WHERE cv.id_club = $1
       ORDER BY cv.fecha DESC, cv.hora DESC`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener convocatorias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear una nueva convocatoria (presidente)
router.post('/', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_formulario, id_club, fecha, hora, lugar, descripcion } = req.body;

    if (!id_formulario || !id_club || !fecha || !hora || !lugar) {
      return res.status(400).json({ error: 'id_formulario, id_club, fecha, hora y lugar son obligatorios' });
    }

    const club = await pool.query(
      'SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    // Verificar que el formulario pertenece al club
    const form = await pool.query(
      'SELECT id_formulario, id_alumno FROM formularios WHERE id_formulario = $1 AND id_club = $2',
      [id_formulario, id_club],
    );

    if (form.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no pertenece a este club' });
    }

    const result = await pool.query(
      `INSERT INTO convocatorias (id_formulario, id_club, id_presidente, fecha, hora, lugar, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id_formulario, id_club, req.user.id, fecha, hora, lugar, descripcion || ''],
    );

    // Notificar al alumno sobre la convocatoria
    try {
      await pool.query(
        `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club)
         VALUES ($1, $2, $3, 'alumnos', NULL)`,
        [
          req.user.id,
          'Nueva convocatoria',
          `Has sido convocado a una reunión para "${club.rows[0].nombre_club}" el ${fecha} a las ${hora} en ${lugar}.`,
        ],
      );
    } catch (notifErr) {
      console.error('Error al crear notificación de convocatoria:', notifErr);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar una convocatoria (presidente)
router.delete('/:id', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;

    const conv = await pool.query(
      `SELECT cv.*, c.id_presidente
       FROM convocatorias cv
       JOIN clubes c ON c.id_club = cv.id_club
       WHERE cv.id_convocatoria = $1`,
      [id],
    );

    if (conv.rows.length === 0) {
      return res.status(404).json({ error: 'La convocatoria no existe' });
    }

    if (conv.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    await pool.query('DELETE FROM convocatorias WHERE id_convocatoria = $1', [id]);

    res.json({ message: 'Convocatoria eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
