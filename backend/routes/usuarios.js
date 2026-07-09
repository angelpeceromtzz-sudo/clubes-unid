import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';

const router = Router();

// Lista todos los usuarios (admin y rectoría)
router.get('/', authenticate, requireRole(3, 4), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol,
              i.id_inscripcion, c.nombre_club
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN inscripciones i ON i.id_usuario = u.id_usuario AND i.id_estatus_inscripcion = 1
       LEFT JOIN clubes c ON c.id_club = i.id_club
       ORDER BY u.id_usuario`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambia el rol de un usuario (solo admin, no puede auto-modificarse)
router.put('/:id/rol', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_rol } = req.body;

    if (![1, 2, 3, 4].includes(id_rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'No puedes modificar tu propio rol' });
    }

    const targetUser = await pool.query(
      'SELECT id_rol FROM usuarios WHERE id_usuario = $1',
      [id]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (targetUser.rows[0].id_rol === 3) {
      return res.status(403).json({ error: 'No puedes modificar el rol de otro administrador' });
    }

    // Si el usuario deja de ser presidente, limpiar su relación con el club
    if (targetUser.rows[0].id_rol === 2 && id_rol !== 2) {
      await pool.query(
        'UPDATE clubes SET id_presidente = NULL WHERE id_presidente = $1',
        [id],
      );
      await pool.query(
        `UPDATE inscripciones SET id_estatus_inscripcion = 2, fecha_baja = NOW()
         WHERE id_usuario = $1 AND id_estatus_inscripcion = 1`,
        [id],
      );
    }

    const result = await pool.query(
      `UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2
       RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
      [id_rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rolResult = await pool.query(
      'SELECT nombre_rol FROM cat_roles WHERE id_rol = $1',
      [id_rol]
    );

    const roles = { 1: 'Alumno', 2: 'Presidente', 3: 'Admin', 4: 'Rectoría' };
    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'cambio_rol',
      descripcion: `${req.user.nombre_completo} cambió el rol del usuario ID ${id} a ${roles[id_rol] || 'desconocido'}`,
      entidadTipo: 'usuario',
      entidadId: parseInt(id),
      detalles: { id_rol_anterior: targetUser.rows[0].id_rol, id_rol_nuevo: id_rol },
    });

    res.json({
      ...result.rows[0],
      rol: rolResult.rows[0]?.nombre_rol || 'desconocido',
    });
  } catch (err) {
    console.error('Error al cambiar rol:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asigna un presidente a un club (desasigna del club anterior)
router.put('/:id/asignar-club', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_club } = req.body;

    const usuario = await pool.query(
      'SELECT id_rol FROM usuarios WHERE id_usuario = $1',
      [id],
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rows[0].id_rol !== 2) {
      return res.status(400).json({ error: 'Solo puedes asignar club a un presidente' });
    }

    if (id_club) {
      const club = await pool.query(
        'SELECT id_club, id_presidente FROM clubes WHERE id_club = $1',
        [id_club],
      );

      if (club.rows.length === 0) {
        return res.status(404).json({ error: 'El club no existe' });
      }

      const presidenteAnterior = club.rows[0].id_presidente;

      // Limpia la inscripción del presidente anterior en este club
      if (presidenteAnterior && Number(presidenteAnterior) !== Number(id)) {
        await pool.query(
          `UPDATE inscripciones SET id_estatus_inscripcion = 2, fecha_baja = NOW()
           WHERE id_usuario = $1 AND id_club = $2 AND id_estatus_inscripcion = 1`,
          [presidenteAnterior, id_club],
        );
      }

      await pool.query(
        'UPDATE clubes SET id_presidente = NULL WHERE id_presidente = $1',
        [id],
      );

      await pool.query(
        'UPDATE clubes SET id_presidente = $1 WHERE id_club = $2',
        [id, id_club],
      );

      const activa = await pool.query(
        `SELECT id_inscripcion FROM inscripciones
         WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
         LIMIT 1`,
        [id],
      );

      if (activa.rows.length === 0) {
        await pool.query(
          `INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
           VALUES ($1, $2, 1)`,
          [id, id_club],
        );
      } else {
        await pool.query(
          `UPDATE inscripciones SET id_club = $1
           WHERE id_inscripcion = $2`,
          [id_club, activa.rows[0].id_inscripcion],
        );
      }

      const clubNombre = await pool.query(
        'SELECT nombre_club FROM clubes WHERE id_club = $1',
        [id_club],
      );

      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion: 'asignar_club',
        descripcion: `${req.user.nombre_completo} asignó el club "${clubNombre.rows[0]?.nombre_club}" al usuario ID ${id}`,
        entidadTipo: 'usuario',
        entidadId: parseInt(id),
        detalles: { id_club },
      });

      return res.json({ message: 'Club asignado correctamente', nombre_club: clubNombre.rows[0]?.nombre_club });
    }

    await pool.query('UPDATE clubes SET id_presidente = NULL WHERE id_presidente = $1', [id]);
    await pool.query(
      `UPDATE inscripciones SET id_estatus_inscripcion = 2, fecha_baja = NOW()
       WHERE id_usuario = $1 AND id_estatus_inscripcion = 1`,
      [id],
    );

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'desasignar_club',
      descripcion: `${req.user.nombre_completo} desasignó al presidente ID ${id} de su club`,
      entidadTipo: 'usuario',
      entidadId: parseInt(id),
    });

    res.json({ message: 'Presidente desasignado del club', nombre_club: null });
  } catch (err) {
    console.error('Error al asignar club al presidente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Acción de admin protegida por contraseña: promover o degradar administradores
router.post('/admin-action', authenticate, requireRole(3), async (req, res) => {
  try {
    const { targetUserId, action, password } = req.body;
    const ADMIN_SECRET = process.env.ADMIN_SECRET;

    if (!ADMIN_SECRET || password !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Contraseña incorrecta' });
    }

    if (!targetUserId || !['promote', 'demote'].includes(action)) {
      return res.status(400).json({ error: 'Solicitud inválida' });
    }

    const targetId = parseInt(targetUserId);
    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'No puedes modificarte a ti mismo' });
    }

    const targetUser = await pool.query(
      'SELECT id_rol, nombre_completo FROM usuarios WHERE id_usuario = $1',
      [targetId],
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (action === 'promote') {
      if (targetUser.rows[0].id_rol === 3) {
        return res.status(400).json({ error: 'El usuario ya es administrador' });
      }
      const result = await pool.query(
        `UPDATE usuarios SET id_rol = 3 WHERE id_usuario = $1
         RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
        [targetId],
      );
      const rolResult = await pool.query(
        'SELECT nombre_rol FROM cat_roles WHERE id_rol = 3',
      );
      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion: 'promover_admin',
        descripcion: `${req.user.nombre_completo} promovió a "${targetUser.rows[0].nombre_completo}" como administrador`,
        entidadTipo: 'usuario',
        entidadId: targetId,
        detalles: { id_rol_nuevo: 3 },
      });
      res.json({ ...result.rows[0], rol: rolResult.rows[0]?.nombre_rol || 'admin' });
    } else {
      if (targetUser.rows[0].id_rol !== 3) {
        return res.status(400).json({ error: 'El usuario no es administrador' });
      }
      const result = await pool.query(
        `UPDATE usuarios SET id_rol = 1 WHERE id_usuario = $1
         RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
        [targetId],
      );
      const rolResult = await pool.query(
        'SELECT nombre_rol FROM cat_roles WHERE id_rol = 1',
      );
      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion: 'degradar_admin',
        descripcion: `${req.user.nombre_completo} degradó al administrador "${targetUser.rows[0].nombre_completo}" a alumno`,
        entidadTipo: 'usuario',
        entidadId: targetId,
        detalles: { id_rol_nuevo: 1 },
      });
      res.json({ ...result.rows[0], rol: rolResult.rows[0]?.nombre_rol || 'alumno' });
    }
  } catch (err) {
    console.error('Error en admin-action:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reactivar usuario con soft delete (solo admin)
router.patch('/:id/reactivar', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await pool.query(
      `SELECT id_usuario, nombre_completo, correo_institucional, deleted_at
       FROM usuarios WHERE id_usuario = $1`,
      [id],
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = usuario.rows[0];

    if (!row.deleted_at) {
      return res.status(400).json({ error: 'El usuario ya está activo' });
    }

    await pool.query(
      `UPDATE usuarios SET deleted_at = NULL WHERE id_usuario = $1`,
      [id],
    );

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'reactivar_usuario',
      descripcion: `${req.user.nombre_completo} reactivó al usuario "${row.nombre_completo}" (ID ${id})`,
      entidadTipo: 'usuario',
      entidadId: parseInt(id),
    });

    res.json({
      message: 'Usuario reactivado correctamente',
      user: {
        id_usuario: row.id_usuario,
        nombre_completo: row.nombre_completo,
        correo_institucional: row.correo_institucional,
      },
    });
  } catch (err) {
    console.error('Error al reactivar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
