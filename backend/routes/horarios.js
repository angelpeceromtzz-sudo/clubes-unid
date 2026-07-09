import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/club/:idClub', async (req, res) => {
  try {
    const { idClub } = req.params;
    const result = await pool.query(
      `SELECT id_horario, id_club, fecha, hora, lugar, ubicacion_maps
       FROM horarios_club
       WHERE id_club = $1
       ORDER BY fecha DESC, hora DESC`,
      [idClub]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar horarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/club/:idClub', authenticate, async (req, res) => {
  try {
    const { idClub } = req.params;
    const { fecha, hora, lugar, ubicacion_maps } = req.body;

    if (!fecha || !hora || !lugar) {
      return res.status(400).json({ error: 'Fecha, hora y lugar son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO horarios_club (id_club, fecha, hora, lugar, ubicacion_maps)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_horario, id_club, fecha, hora, lugar, ubicacion_maps`,
      [idClub, fecha, hora, lugar, ubicacion_maps || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, lugar, ubicacion_maps } = req.body;

    const result = await pool.query(
      `UPDATE horarios_club
       SET fecha = $1, hora = $2, lugar = $3, ubicacion_maps = $4
       WHERE id_horario = $5
       RETURNING id_horario, id_club, fecha, hora, lugar, ubicacion_maps`,
      [fecha, hora, lugar, ubicacion_maps || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM horarios_club WHERE id_horario = $1 RETURNING id_horario',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    res.json({ mensaje: 'Horario eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
