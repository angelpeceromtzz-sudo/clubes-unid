import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { validarCreacionNotificacion } from '../lib/notificacionPermisos.js';
import { limitadorNotificaciones } from '../lib/rateLimits.js';
import { validarParamsEnteros } from '../lib/validarId.js';

const router = Router();

validarParamsEnteros(router);

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    let clubIdPresidente = null;
    let clubIdAlumno = null;

    if (roleId === 2 || roleId === 5) {
      const pres = await pool.query('SELECT id_club FROM clubes WHERE id_responsable_club = $1 OR id_vicepresidente = $1', [userId]);
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
        LEFT JOIN notificaciones_eliminadas ne ON ne.id_notificacion = n.id_notificacion AND ne.id_usuario = $1
       WHERE ne.id_notificacion IS NULL
         AND n.id_emisor != $1
         AND (($2 IN (3, 4) AND ((n.audiencia = 'global' AND n.id_destinatario IS NULL)
                                OR n.id_destinatario = $1))
           OR ($2 = 2 AND ((n.audiencia IN ('global', 'presidentes') AND n.id_destinatario IS NULL AND (n.id_club IS NULL OR n.id_club = $3))
                        OR (n.audiencia = 'club' AND n.id_club = $3)
                        OR n.id_destinatario = $1))
           OR ($2 = 1 AND ((n.audiencia IN ('global', 'alumnos') AND n.id_destinatario IS NULL AND (n.id_club IS NULL OR n.id_club = $4))
                        OR (n.audiencia = 'club' AND n.id_club = $4)
                        OR n.id_destinatario = $1)))
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

// Actividad del sistema — solo admin/rectoría
router.get('/actividad', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM notificaciones');
    const total = countResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const result = await pool.query(
      `SELECT n.id_notificacion, n.id_emisor,
              u.nombre_completo AS emisor_nombre,
              r.nombre_rol AS emisor_rol,
              c.nombre_club AS club_nombre,
              n.titulo, n.mensaje, n.audiencia, n.id_club,
              n.fecha_creacion,
              dest.nombre_completo AS destinatario_nombre,
              dest.correo_institucional AS destinatario_correo
       FROM notificaciones n
       JOIN usuarios u ON u.id_usuario = n.id_emisor
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN clubes c ON c.id_club = n.id_club
       LEFT JOIN usuarios dest ON dest.id_usuario = n.id_destinatario
       ORDER BY n.fecha_creacion DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ notificaciones: result.rows, page, totalPages, total });
  } catch (err) {
    console.error('Error al obtener actividad del sistema:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 30/min por usuario (H5a), después de authenticate para usar la identidad
// revalidada y antes de la matriz de permisos (H7) y de cualquier escritura.
router.post('/', authenticate, limitadorNotificaciones, async (req, res) => {
  let conexion = null;
  try {
    const {
      titulo, mensaje, audiencia,
      id_club: idClub, id_destinatario: idDestinatario,
      mostrar_en_mural, url_imagen,
       password,
    } = req.body;
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 100 || typeof mensaje !== 'string' || !mensaje.trim() || !audiencia) {
      return res.status(400).json({ error: 'titulo, mensaje y audiencia son obligatorios' });
    }

    // Publicación en el mural: se realiza exclusivamente desde la sección
    // Mural digital por el responsable del mural. Los anuncios ya no se
    // agregan al mural para evitar publicaciones sin aprobación explícita.
    if (mostrar_en_mural !== undefined && typeof mostrar_en_mural !== 'boolean') {
      return res.status(400).json({ error: 'Opción de mural no válida' });
    }
    if (mostrar_en_mural) {
      return res.status(403).json({ error: 'La publicación en el mural se realiza desde la sección Mural digital' });
    }
    if (mostrar_en_mural && url_imagen != null && (typeof url_imagen !== 'string' || url_imagen.length > 500)) {
      return res.status(400).json({ error: 'Imagen del mural no válida' });
    }

    // Roles institucionales (admin/rectoría/coordinación) deben confirmar con
    // ADMIN_SECRET al publicar anuncios desde el panel de gestión.
    if ([ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION].includes(roleId)) {
      const ADMIN_SECRET = process.env.ADMIN_SECRET;
      if (!ADMIN_SECRET || password !== ADMIN_SECRET) {
        return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
      }
    }

    // Matriz de permisos por rol/audiencia/club/destinatario: lib/notificacionPermisos.js
    let clubRow = null;
    if (idClub !== null && idClub !== undefined) {
      const club = await pool.query(
        'SELECT id_club, id_responsable_club, id_vicepresidente FROM clubes WHERE id_club = $1',
        [idClub]
      );
      clubRow = club.rows[0] ?? null;
    }

    const evaluacion = validarCreacionNotificacion({
      idRol: roleId,
      idEmisor: userId,
      audiencia,
      idClub,
      idDestinatario,
      club: clubRow,
    });
    if (!evaluacion.permitido) {
      return res.status(evaluacion.status).json({ error: evaluacion.error });
    }

    // El aviso y su publicación en el mural se guardan juntos para evitar envíos parciales.
    if (mostrar_en_mural) {
      conexion = await pool.connect();
      await conexion.query('BEGIN');
    }
    const result = await (conexion || pool).query(
      `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, titulo.trim(), mensaje.trim(), audiencia, evaluacion.valores.id_club, evaluacion.valores.id_destinatario]
    );
    let publicacionMural = null;
    if (conexion) {
      const publicacion = await conexion.query(
        `INSERT INTO noticias (titulo, contenido, categoria, publicada, mostrar_en_mural, url_imagen,
       id_autor, status)
         VALUES ($1, $2, 'informativo', $5 = 'published', TRUE, $3, $4, $5) RETURNING *`,
        [titulo.trim(), mensaje.trim(), url_imagen || null, userId, roleId === 4 ? 'published' : 'draft']
      );
      publicacionMural = publicacion.rows[0];
      await conexion.query('COMMIT');
    }

    if (roleId === 3) {
      const audienciaLabel = { global: 'todos', presidentes: 'presidentes', alumnos: 'alumnos', club: 'club específico' };
      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion: 'enviar_anuncio',
        descripcion: `${req.user.nombre_completo} envió un anuncio "${titulo}" para audiencia: ${audienciaLabel[audiencia] || audiencia}`,
        entidadTipo: 'notificacion',
        entidadId: result.rows[0].id_notificacion,
        detalles: { titulo, audiencia, id_club: idClub },
      });
    }

    res.status(201).json({ ...result.rows[0], ...(publicacionMural ? { publicacion_mural: publicacionMural } : {}) });
  } catch (err) {
    if (conexion) await conexion.query('ROLLBACK').catch(() => {});
    console.error('Error al crear notificacion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conexion?.release();
  }
});

// Listar anuncios creados por el usuario actual (roles institucionales)
router.get('/mis-anuncios', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.id_rol;
    if (![ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION].includes(roleId)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const result = await pool.query(
      `SELECT n.id_notificacion, n.titulo, n.mensaje, n.audiencia, n.id_club,
              n.id_destinatario, n.fecha_creacion,
              c.nombre_club
       FROM notificaciones n
       LEFT JOIN clubes c ON c.id_club = n.id_club
       WHERE n.id_emisor = $1
       ORDER BY n.fecha_creacion DESC
       LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar mis anuncios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Editar un anuncio (no afecta el estado de lectura de los destinatarios)
router.put('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    if (![ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION].includes(roleId)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const { titulo, mensaje, audiencia, id_club, password } = req.body;

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET || password !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
    }

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 100 ||
        typeof mensaje !== 'string' || !mensaje.trim()) {
      return res.status(400).json({ error: 'titulo y mensaje son obligatorios' });
    }
    if (!['global', 'presidentes', 'alumnos', 'club'].includes(audiencia)) {
      return res.status(400).json({ error: 'Audiencia no válida' });
    }

    const existing = await client.query(
      'SELECT id_notificacion, id_emisor FROM notificaciones WHERE id_notificacion = $1',
      [notifId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }
    if (existing.rows[0].id_emisor !== userId) {
      return res.status(403).json({ error: 'Solo puedes modificar tus propios anuncios' });
    }

    const clubIdFinal = audiencia === 'club' ? (Number.isInteger(id_club) ? id_club : null) : null;

    const result = await client.query(
      `UPDATE notificaciones
       SET titulo = $1, mensaje = $2, audiencia = $3, id_club = $4
       WHERE id_notificacion = $5
       RETURNING *`,
      [titulo.trim(), mensaje.trim(), audiencia, clubIdFinal, notifId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al editar anuncio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
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

// Marcar todas las notificaciones como leídas
router.post('/leer-todas', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    let clubId = null;
    if (roleId === 2) {
      const pres = await pool.query('SELECT id_club FROM clubes WHERE id_responsable_club = $1', [userId]);
      if (pres.rows.length > 0) clubId = pres.rows[0].id_club;
    }
    if (roleId === 1) {
      const ins = await pool.query(
        'SELECT id_club FROM inscripciones WHERE id_usuario = $1 AND id_estatus_inscripcion = 1 LIMIT 1',
        [userId]
      );
      if (ins.rows.length > 0) clubId = ins.rows[0].id_club;
    }

    const notifs = await pool.query(
      `SELECT n.id_notificacion
       FROM notificaciones n
       LEFT JOIN notificaciones_leidas nl ON nl.id_notificacion = n.id_notificacion AND nl.id_usuario = $1
       WHERE nl.id_notificacion IS NULL
         AND n.id_emisor != $1
         AND (($2 IN (3, 4) AND ((n.audiencia = 'global' AND n.id_destinatario IS NULL)
                                OR n.id_destinatario = $1))
           OR ($2 = 2 AND ((n.audiencia IN ('global', 'presidentes') AND n.id_destinatario IS NULL AND (n.id_club IS NULL OR n.id_club = $3))
                        OR (n.audiencia = 'club' AND n.id_club = $3)
                        OR n.id_destinatario = $1))
           OR ($2 = 1 AND ((n.audiencia IN ('global', 'alumnos') AND n.id_destinatario IS NULL AND (n.id_club IS NULL OR n.id_club = $3))
                        OR (n.audiencia = 'club' AND n.id_club = $3)
                        OR n.id_destinatario = $1)))`,
      [userId, roleId, clubId]
    );

    for (const row of notifs.rows) {
      await pool.query(
        'INSERT INTO notificaciones_leidas (id_notificacion, id_usuario) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [row.id_notificacion, userId]
      );
    }

    res.json({ ok: true, marcadas: notifs.rows.length });
  } catch (err) {
    console.error('Error al marcar todas como leidas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar todas las notificaciones (solo admin)
router.delete('/all', authenticate, async (req, res) => {
  try {
    if (req.user.id_rol !== 3) return res.status(403).json({ error: 'Solo administradores' });
    await pool.query('DELETE FROM notificaciones_eliminadas');
    await pool.query('DELETE FROM notificaciones_leidas');
    const r = await pool.query('DELETE FROM notificaciones');
    res.json({ ok: true, eliminadas: r.rowCount });
  } catch (err) {
    console.error('Error al eliminar notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ocultar notificación para el usuario (soft-delete por usuario)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    const userId = req.user.id;
    const roleId = req.user.id_rol;

    const notif = await pool.query(
      'SELECT id_notificacion FROM notificaciones WHERE id_notificacion = $1',
      [notifId]
    );

    if (notif.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await pool.query(
      'INSERT INTO notificaciones_eliminadas (id_notificacion, id_usuario) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [notifId, userId]
    );

    res.json({ ok: true, oculta: true });
  } catch (err) {
    console.error('Error al ocultar notificacion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
