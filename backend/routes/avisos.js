// Rutas de avisos — CRUD de avisos por club
import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Obtiene los avisos de un club (público)
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const result = await pool.query(
      `SELECT a.id_aviso, a.id_club, a.id_autor, a.titulo, a.contenido,
              a.fecha_publicacion, u.nombre_completo as autor
       FROM avisos_clubes a
       JOIN usuarios u ON u.id_usuario = a.id_autor
       WHERE a.id_club = $1
       ORDER BY a.fecha_publicacion DESC`,
      [clubId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar avisos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crea un aviso (solo presidente del club o admin)
router.post('/', authenticate, async (req, res) => {
  try {
    const { id_club, titulo, contenido } = req.body;

    if (!id_club || !titulo || !contenido) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const clubResult = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const club = clubResult.rows[0];
    const esPresidente = club.id_presidente === req.user.id;
    const esAdmin = req.user.id_rol === 3;

    if (!esPresidente && !esAdmin) {
      return res.status(403).json({ error: 'Solo el presidente del club puede publicar avisos' });
    }

    const result = await pool.query(
      `INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id_club, req.user.id, titulo, contenido]
    );

    const aviso = result.rows[0];
    res.status(201).json({
      ...aviso,
      autor: req.user.nombre_completo,
    });
  } catch (err) {
    console.error('Error al crear aviso:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Elimina un aviso (solo presidente del club o admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const avisoResult = await pool.query(
      'SELECT a.*, c.id_presidente FROM avisos_clubes a JOIN clubes c ON c.id_club = a.id_club WHERE a.id_aviso = $1',
      [id]
    );

    if (avisoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    const aviso = avisoResult.rows[0];
    const esPresidente = aviso.id_presidente === req.user.id;
    const esAdmin = req.user.id_rol === 3;

    if (!esPresidente && !esAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este aviso' });
    }

    await pool.query('DELETE FROM avisos_clubes WHERE id_aviso = $1', [id]);
    res.json({ message: 'Aviso eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar aviso:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

// ✦ A
