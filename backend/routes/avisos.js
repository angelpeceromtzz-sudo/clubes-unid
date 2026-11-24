import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';
import { registrarActividadClub } from '../lib/clubActivity.js';
import { validarParamsEnteros } from '../lib/validarId.js';

const router = Router();
const REACCIONES_AVISO = ['like', 'love', 'clap'];

validarParamsEnteros(router);

// Obtiene los avisos de un club (público)
router.get('/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const result = await pool.query(
      `SELECT a.id_aviso, a.id_club, a.id_autor, a.titulo, a.contenido,
              a.fecha_publicacion, u.nombre_completo as autor,
              COALESCE((
                SELECT json_agg(json_build_object('reaccion', r.reaccion, 'total', r.total) ORDER BY r.reaccion)
                FROM (SELECT reaccion, COUNT(*)::int AS total FROM avisos_reacciones WHERE id_aviso = a.id_aviso GROUP BY reaccion) r
              ), '[]'::json) AS reacciones
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

// Consulta la reacción elegida por la persona en cada aviso del club.
router.get('/:clubId/mis-reacciones', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;
    const result = await pool.query(
      `SELECT r.id_aviso, r.reaccion
       FROM avisos_reacciones r
       JOIN avisos_clubes a ON a.id_aviso = r.id_aviso
       WHERE a.id_club = $1 AND r.id_usuario = $2`,
      [clubId, req.user.id]
    );
    res.json(Object.fromEntries(result.rows.map(({ id_aviso, reaccion }) => [id_aviso, reaccion])));
  } catch (err) {
    console.error('Error al consultar reacciones de avisos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registra, cambia o retira una reacción del aviso.
router.put('/:id/reaccion', authenticate, async (req, res) => {
  const { id } = req.params;
  const { reaccion } = req.body;
  if (reaccion !== null && !REACCIONES_AVISO.includes(reaccion)) {
    return res.status(400).json({ error: 'Reacción no válida' });
  }
  try {
    const avisoResult = await pool.query(
      `SELECT a.id_aviso, a.id_club, c.id_responsable_club, c.id_vicepresidente
       FROM avisos_clubes a JOIN clubes_operativos c ON c.id_club = a.id_club
       WHERE a.id_aviso = $1`, [id]
    );
    if (!avisoResult.rows[0]) return res.status(404).json({ error: 'Aviso no encontrado' });
    const aviso = avisoResult.rows[0];
    const esAdmin = req.user.id_rol === ROL_ADMIN || req.user.id_rol === ROL_COORDINACION;
    const esLider = aviso.id_responsable_club === req.user.id || aviso.id_vicepresidente === req.user.id;
    const esMiembro = (await pool.query(
      'SELECT 1 FROM inscripciones WHERE id_club = $1 AND id_usuario = $2 AND id_estatus_inscripcion = 1',
      [aviso.id_club, req.user.id]
    )).rows.length > 0;
    if (!esAdmin && !esLider && !esMiembro) return res.status(403).json({ error: 'Solo los miembros del club pueden reaccionar a sus avisos' });

    if (reaccion) {
      await pool.query(
        `INSERT INTO avisos_reacciones (id_aviso, id_usuario, reaccion) VALUES ($1, $2, $3)
         ON CONFLICT (id_aviso, id_usuario) DO UPDATE SET reaccion = EXCLUDED.reaccion`,
        [id, req.user.id, reaccion]
      );
    } else {
      await pool.query('DELETE FROM avisos_reacciones WHERE id_aviso = $1 AND id_usuario = $2', [id, req.user.id]);
    }
    const totales = (await pool.query(
      'SELECT reaccion, COUNT(*)::int AS total FROM avisos_reacciones WHERE id_aviso = $1 GROUP BY reaccion', [id]
    )).rows;
    res.json({ reaccion, totales });
  } catch (err) {
    console.error('Error al guardar reacción del aviso:', err);
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
      'SELECT id_responsable_club, id_vicepresidente FROM clubes_operativos WHERE id_club = $1',
      [id_club]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const club = clubResult.rows[0];
    const esPresidente = club.id_responsable_club === req.user.id;
    const esVicepresidente = club.id_vicepresidente === req.user.id;
    const esAdmin = req.user.id_rol === ROL_ADMIN || req.user.id_rol === ROL_COORDINACION;

    if (!esPresidente && !esVicepresidente && !esAdmin) {
      return res.status(403).json({ error: 'Solo el presidente, vicepresidente o admin pueden publicar avisos' });
    }

    const result = await pool.query(
      `INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id_club, req.user.id, titulo, contenido]
    );

    const aviso = result.rows[0];
    registrarActividadClub({
      tipo_evento: 'anuncio_club',
      id_club: Number(id_club),
      id_actor: req.user.id,
      descripcion: `${req.user.nombre_completo} publicó el aviso "${titulo}" en el club`,
      detalles: { titulo },
    });
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
      'SELECT a.*, c.id_responsable_club, c.id_vicepresidente FROM avisos_clubes a JOIN clubes_operativos c ON c.id_club = a.id_club WHERE a.id_aviso = $1',
      [id]
    );

    if (avisoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    const aviso = avisoResult.rows[0];
    const esPresidente = aviso.id_responsable_club === req.user.id;
    const esVicepresidente = aviso.id_vicepresidente === req.user.id;
    const esAdmin = req.user.id_rol === ROL_ADMIN || req.user.id_rol === ROL_COORDINACION;

    if (!esPresidente && !esVicepresidente && !esAdmin) {
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
