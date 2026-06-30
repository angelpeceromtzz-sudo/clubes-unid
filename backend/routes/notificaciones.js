import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    let clubIdPresidente = null;
    let clubIdAlumno = null;

    if (roleId === 2) {
      const pres = await pool.query('SELECT id_club FROM clubes WHERE id_presidente = $1', [userId]);
      if (pres.rows.length > 0) clubIdPresidente = pres.rows[0].id_club;
    }

    if (roleId === 1) {
      const ins = await pool.query(
        'SELECT id_club FROM inscripciones WHERE id_usuario = $1 AND id_estatus_inscripcion = 1 LIMIT 1',
        [userId]
      );
      if (ins.rows.length > 0) clubIdAlumno = ins.rows[0].id_club;
    }

    const result = await pool.query(
      `SELECT n.id_notificacion, n.id_emisor,
              u.nombre_completo AS emisor_nombre,
              r.nombre_rol AS emisor_rol,
              c.nombre_club AS club_nombre,
              n.titulo, n.mensaje, n.audiencia, n.id_club, n.fecha_creacion,
              CASE WHEN nl.id_notificacion IS NOT NULL THEN TRUE ELSE FALSE END AS leido
       FROM notificaciones n
       JOIN usuarios u ON u.id_usuario = n.id_emisor
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN clubes c ON c.id_club = n.id_club
       LEFT JOIN notificaciones_leidas nl ON nl.id_notificacion = n.id_notificacion AND nl.id_usuario = $1
       WHERE ($2 = 3)
          OR ($2 = 2 AND ((n.audiencia IN ('global', 'presidentes') AND n.id_destinatario IS NULL)
                       OR (n.audiencia = 'club' AND n.id_club = $3)
                       OR n.id_destinatario = $1))
          OR ($2 = 1 AND ((n.audiencia IN ('global', 'alumnos') AND n.id_destinatario IS NULL)
                       OR (n.audiencia = 'club' AND n.id_club = $4)
                       OR n.id_destinatario = $1))
       ORDER BY n.fecha_creacion DESC
       LIMIT 100`,
      [userId, roleId, clubIdPresidente, clubIdAlumno]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { titulo, mensaje, audiencia, id_club } = req.body;
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    if (!titulo || !mensaje || !audiencia) {
      return res.status(400).json({ error: 'titulo, mensaje y audiencia son obligatorios' });
    }

    const audienciasValidas = ['global', 'presidentes', 'alumnos', 'club'];
    if (!audienciasValidas.includes(audiencia)) {
      return res.status(400).json({ error: 'Audiencia no válida' });
    }

    if (audiencia === 'club' && !id_club) {
      return res.status(400).json({ error: 'id_club es obligatorio para audiencia club' });
    }

    if (roleId === 2) {
      if (audiencia !== 'club') {
        return res.status(403).json({ error: 'Los presidentes solo pueden enviar notificaciones a su club' });
      }
      const club = await pool.query('SELECT id_club FROM clubes WHERE id_presidente = $1', [userId]);
      if (club.rows.length === 0 || club.rows[0].id_club !== id_club) {
        return res.status(403).json({ error: 'No eres presidente de este club' });
      }
    }

    const result = await pool.query(
      `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, titulo, mensaje, audiencia, audiencia === 'club' ? id_club : null]
    );

    if (roleId === 3) {
      const audienciaLabel = { global: 'todos', presidentes: 'presidentes', alumnos: 'alumnos', club: 'club específico' };
      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion: 'enviar_anuncio',
        descripcion: `${req.user.nombre_completo} envió un anuncio "${titulo}" para audiencia: ${audienciaLabel[audiencia] || audiencia}`,
        entidadTipo: 'notificacion',
        entidadId: result.rows[0].id_notificacion,
        detalles: { titulo, audiencia, id_club },
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear notificacion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/leer', authenticate, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    const userId = req.user.id;

    await pool.query(
      'INSERT INTO notificaciones_leidas (id_notificacion, id_usuario) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [notifId, userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al marcar notificacion como leida:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
