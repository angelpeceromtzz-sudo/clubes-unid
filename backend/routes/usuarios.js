import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ALUMNO, ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION, ROL_RESPONSABLE_CLUB, ROL_RESPONSABLE_MURAL } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { ESTATUS_INSCRIPCION } from '../lib/estatusInscripcion.js';
import { validarParamsEnteros } from '../lib/validarId.js';

const router = Router();

validarParamsEnteros(router);

// Perfil público de un usuario (cualquier usuario autenticado puede verlo).
// Respeta las preferencias de visibilidad de fecha de nacimiento y teléfono.
router.get('/:id/perfil', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.institutional_id, u.id_rol, r.nombre_rol as rol,
              u.id_licenciatura, u.fecha_nacimiento, u.biografia,
              u.fecha_nacimiento_publica, u.telefono_celular, u.telefono_publico,
              u.facebook_url, u.x_url, u.instagram_url, u.sitio_web_url, u.intereses_publicos
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1 AND u.deleted_at IS NULL`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const row = result.rows[0];
    const esPropio = Number(req.user.id) === id;

    const [interesesRes, reconocimientosRes] = await Promise.all([
      pool.query(
        `SELECT ci.nombre FROM usuario_categorias_interes uci
           JOIN cat_categorias_interes ci ON ci.id_categoria_interes = uci.id_categoria_interes
          WHERE uci.id_usuario = $1
         UNION ALL
         SELECT cai.nombre FROM usuario_actividades_interes uai
           JOIN cat_actividades_interes cai ON cai.id_actividad = uai.id_actividad
          WHERE uai.id_usuario = $1
         ORDER BY 1`,
        [id],
      ),
      pool.query(
        `SELECT er.id_reconocimiento, er.id_edicion, er.tipo_actividad AS plantilla,
                COALESCE(i.nombre, er.nombre_actividad) AS actividad,
                er.nombre_edicion AS edicion, er.anio,
                COALESCE(i.imagen, er.insignia_key) AS insignia_key,
                er.otorgada_en, er.oculta, er.id_insignia
           FROM expediente_reconocimientos er
           LEFT JOIN insignias i ON i.id_insignia = er.id_insignia
          WHERE er.id_usuario = $1
          ORDER BY er.anio DESC, er.otorgada_en DESC`,
        [id],
      ),
    ]);

    // Visitantes: solo lo que el usuario marcó como público o lo que siempre es
    // público (correo, matrícula, biografía, enlaces y reconocimientos). Se filtra
    // en servidor. El dueño ve además sus intereses, sea cual sea su visibilidad.
    const reconocimientos = esPropio
      ? reconocimientosRes.rows
      : reconocimientosRes.rows.filter((r) => !r.oculta);
    res.json({
      id_usuario: row.id_usuario,
      nombre_completo: row.nombre_completo,
      correo_institucional: row.correo_institucional,
      institutional_id: row.institutional_id,
      biografia: row.biografia,
      fecha_nacimiento: row.fecha_nacimiento_publica ? row.fecha_nacimiento : null,
      telefono_celular: row.telefono_publico ? row.telefono_celular : null,
      facebook_url: row.facebook_url,
      x_url: row.x_url,
      instagram_url: row.instagram_url,
      sitio_web_url: row.sitio_web_url,
      reconocimientos,
      intereses: interesesRes.rows.map((r) => r.nombre),
      es_alumno: row.id_rol === ROL_ALUMNO,
    });
  } catch (err) {
    console.error('Error al obtener perfil público:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista los usuarios activos (admin y rectoría). Los desactivados se ocultan;
// se consultan por separado en GET /desactivados para su reactivación.
router.get('/', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol,
              i.id_inscripcion, c.nombre_club
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN inscripciones i ON i.id_usuario = u.id_usuario AND i.id_estatus_inscripcion = 1
       LEFT JOIN clubes_operativos c ON c.id_club = i.id_club
       WHERE u.deleted_at IS NULL
       ORDER BY u.id_usuario`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista los usuarios desactivados (soft-deleted) para su reactivación manual.
// Son los que ya no deben aparecer en GET /usuarios, pero el admin necesita
// verlos aquí para poder reactivarlos con PATCH /:id/reactivar.
router.get('/desactivados', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol,
              u.deleted_at as fecha_baja
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.deleted_at IS NOT NULL
       ORDER BY u.deleted_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios desactivados:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambia el rol de un usuario (solo admin, no puede auto-modificarse)
router.put('/:id/rol', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_rol, password } = req.body;

    if (![ROL_ALUMNO, ROL_RESPONSABLE_CLUB, ROL_RECTORIA, ROL_RESPONSABLE_MURAL, ROL_COORDINACION].includes(id_rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET || password !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'No puedes modificar tu propio rol' });
    }

    const targetUser = await pool.query(
      'SELECT id_rol, deleted_at FROM usuarios WHERE id_usuario = $1',
      [id]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (targetUser.rows[0].deleted_at) {
      return res.status(400).json({ error: 'No puedes modificar el rol de un usuario desactivado' });
    }

    if (targetUser.rows[0].id_rol === ROL_ADMIN) {
      return res.status(403).json({ error: 'No puedes modificar el rol de otro administrador' });
    }

    // Si el usuario deja de ser presidente, limpiar su relación con el club
    if (targetUser.rows[0].id_rol === 2 && id_rol !== 2) {
      await pool.query(
        'UPDATE clubes_operativos SET id_responsable_club = NULL WHERE id_responsable_club = $1',
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

    const roles = { 1: 'Alumno', 2: 'Responsable del club', 3: 'Admin', 4: 'Rectoría', 5: 'Vicepresidente', 6: 'Responsable de Mural', 7: 'Coordinación' };
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
router.put('/:id/asignar-club', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const client = await pool.connect();
  let enTransaccion = false;
  try {
    const { id } = req.params;
    const { id_club } = req.body;
    const userId = parseInt(id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Usuario inválido' });
    }

    await client.query('BEGIN');
    enTransaccion = true;

    const usuarioRes = await client.query(
      'SELECT id_usuario, id_rol, deleted_at, nombre_completo FROM usuarios WHERE id_usuario = $1',
      [userId],
    );

    if (usuarioRes.rows.length === 0) {
      await client.query('ROLLBACK');
      enTransaccion = false;
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarioRes.rows[0];

    if (usuario.deleted_at) {
      await client.query('ROLLBACK');
      enTransaccion = false;
      return res.status(400).json({ error: 'No puedes asignar una responsabilidad a un usuario desactivado' });
    }

    if (usuario.id_rol !== ROL_ALUMNO && usuario.id_rol !== ROL_RESPONSABLE_CLUB) {
      await client.query('ROLLBACK');
      enTransaccion = false;
      return res.status(400).json({ error: 'Solo puedes asignar responsabilidad a un alumno o a un responsable del club' });
    }

    if (id_club) {
      const clubRes = await client.query(
        'SELECT id_club, nombre_club, id_responsable_club FROM clubes_operativos WHERE id_club = $1',
        [id_club],
      );

      if (clubRes.rows.length === 0) {
        await client.query('ROLLBACK');
        enTransaccion = false;
        return res.status(404).json({ error: 'El club no existe' });
      }

      const club = clubRes.rows[0];

      if (club.id_responsable_club && Number(club.id_responsable_club) !== userId) {
        await client.query('ROLLBACK');
        enTransaccion = false;
        return res.status(400).json({ error: 'El club ya tiene un responsable asignado' });
      }

      const previosRes = await client.query(
        'SELECT id_club FROM clubes_operativos WHERE id_responsable_club = $1',
        [userId],
      );
      const teniaOtroClub = previosRes.rows.some((c) => Number(c.id_club) !== Number(id_club));

      await client.query(
        'UPDATE clubes_operativos SET id_responsable_club = NULL WHERE id_responsable_club = $1 AND id_club <> $2',
        [userId, id_club],
      );

      if (usuario.id_rol === ROL_ALUMNO) {
        await client.query(
          'UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2',
          [ROL_RESPONSABLE_CLUB, userId],
        );
      }

      await client.query(
        'UPDATE clubes_operativos SET id_responsable_club = $1 WHERE id_club = $2',
        [userId, id_club],
      );

      await client.query('COMMIT');
      enTransaccion = false;

      const accion = teniaOtroClub ? 'reasignar_responsable' : 'asignar_responsable';
      const descripcion = teniaOtroClub
        ? `${req.user.nombre_completo} reasignó al responsable ID ${userId} al club "${club.nombre_club}"`
        : `${req.user.nombre_completo} asignó el club "${club.nombre_club}" al usuario ID ${userId}`;

      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo,
        accion,
        descripcion,
        entidadTipo: 'usuario',
        entidadId: userId,
        detalles: { id_club },
      });

      return res.json({ message: 'Responsabilidad asignada correctamente', nombre_club: club.nombre_club });
    }

    await client.query('UPDATE clubes_operativos SET id_responsable_club = NULL WHERE id_responsable_club = $1', [userId]);

    if (usuario.id_rol === ROL_RESPONSABLE_CLUB) {
      await client.query(
        'UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2',
        [ROL_ALUMNO, userId],
      );
    }

    await client.query('COMMIT');
    enTransaccion = false;

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'retirar_responsable',
      descripcion: `${req.user.nombre_completo} retiró la responsabilidad del usuario ID ${userId}`,
      entidadTipo: 'usuario',
      entidadId: userId,
    });

    res.json({ message: 'Responsabilidad retirada correctamente', nombre_club: null });
  } catch (err) {
    if (enTransaccion) {
      await client.query('ROLLBACK').catch(() => {});
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El usuario o el club ya tiene una responsabilidad asignada' });
    }
    console.error('Error al asignar responsabilidad de club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});



// Acción de admin protegida por contraseña: promover o degradar administradores
router.post('/admin-action', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
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
      if (targetUser.rows[0].id_rol === ROL_ADMIN) {
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

// Desactivación reversible: conserva el registro y el historial del usuario.
// La clave administrativa se valida aquí, no solo en la interfaz.
router.patch('/:id/desactivar', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || req.body?.password !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
  }

  const client = await pool.connect();
  let enTransaccion = false;
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'No puedes desactivarte a ti mismo' });
    }

    // LEFT JOIN con clubes para saber si el usuario es presidente de algún
    // club y advertírselo al admin en la respuesta.
    const usuario = await client.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional, u.deleted_at, u.id_rol,
              c.nombre_club
       FROM usuarios u
       LEFT JOIN clubes_operativos c ON c.id_responsable_club = u.id_usuario
       WHERE u.id_usuario = $1`,
      [id],
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = usuario.rows[0];

    // Si ya estaba desactivado, aviso. No es error grave, pero mejor
    // que el admin sepa que no pasó nada.
    if (row.deleted_at) {
      return res.status(400).json({ error: 'El usuario ya está desactivado' });
    }

    await client.query('BEGIN');
    enTransaccion = true;

    // Baja atómica: marca la fecha, cierra la inscripción activa y libera
    // presidencia/vicepresidencia. Todo o nada.
    await client.query(
      `UPDATE usuarios SET deleted_at = NOW() WHERE id_usuario = $1`,
      [id],
    );
    await client.query(
      `UPDATE inscripciones SET id_estatus_inscripcion = ${ESTATUS_INSCRIPCION.BAJA}, fecha_baja = NOW()
       WHERE id_usuario = $1 AND id_estatus_inscripcion = ${ESTATUS_INSCRIPCION.ACTIVO}`,
      [id],
    );
    await client.query(
      `UPDATE clubes_operativos SET id_responsable_club = NULL WHERE id_responsable_club = $1`,
      [id],
    );
    await client.query(
      `UPDATE clubes_operativos SET id_vicepresidente = NULL WHERE id_vicepresidente = $1`,
      [id],
    );

    await client.query('COMMIT');
    enTransaccion = false;

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'desactivar_usuario',
      descripcion: `${req.user.nombre_completo} desactivó al usuario "${row.nombre_completo}" (ID ${id})`,
      entidadTipo: 'usuario',
      entidadId: parseInt(id),
    });

    const respuesta = {
      message: 'Usuario desactivado correctamente',
      user: {
        id_usuario: row.id_usuario,
        nombre_completo: row.nombre_completo,
        correo_institucional: row.correo_institucional,
      },
    };

    // Si era presidente, su club se queda sin presidente a propósito.
    // Esto ya no depende del ON DELETE SET NULL: la baja es un UPDATE,
    // así que esa FK (schema.sql:101) no se dispara.
    if (row.nombre_club) {
      respuesta.warning = `El usuario era presidente del club "${row.nombre_club}". El club se ha quedado sin presidente.`;
    }

    res.json(respuesta);
  } catch (err) {
    if (enTransaccion) {
      await client.query('ROLLBACK');
    }
    console.error('Error al desactivar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// La reactivación es manual y exclusiva del admin a propósito: si un
// usuario fue desactivado, no quiero que reactivar dependa de que
// Microsoft lo autentique. El admin revisa el caso y decide.
router.patch('/:id/reactivar', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
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
