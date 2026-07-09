import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';

const router = Router();

router.post('/asignar-alumno', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id_usuario, id_club } = req.body;

    if (!id_usuario || !id_club) {
      return res.status(400).json({ error: 'id_usuario y id_club son obligatorios' });
    }

    const userResult = await pool.query(
      'SELECT id_usuario, id_rol, nombre_completo FROM usuarios WHERE id_usuario = $1',
      [id_usuario]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (userResult.rows[0].id_rol !== 1) {
      return res.status(400).json({ error: 'Solo se puede asignar alumnos (rol=1) a un club' });
    }

    const clubResult = await pool.query(
      'SELECT id_club, nombre_club, cupo_maximo FROM clubes WHERE id_club = $1 AND id_estatus_club = 1',
      [id_club]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club no disponible o no está activo' });
    }

    const club = clubResult.rows[0];

    const activaResult = await pool.query(
      'SELECT i.id_inscripcion, c.nombre_club as club_anterior FROM inscripciones i LEFT JOIN clubes c ON c.id_club = i.id_club WHERE i.id_usuario = $1 AND i.id_estatus_inscripcion = 1 LIMIT 1',
      [id_usuario]
    );

    if (activaResult.rows.length > 0) {
      await pool.query(
        'UPDATE inscripciones SET id_estatus_inscripcion = 2, fecha_baja = NOW() WHERE id_inscripcion = $1',
        [activaResult.rows[0].id_inscripcion]
      );
    }

    const cupoResult = await pool.query(
      `SELECT COUNT(*) as count FROM inscripciones i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       WHERE i.id_club = $1 AND i.id_estatus_inscripcion = 1 AND u.id_rol = 1`,
      [id_club]
    );

    if (parseInt(cupoResult.rows[0].count) >= club.cupo_maximo) {
      return res.status(400).json({ error: 'El club ha alcanzado su cupo máximo' });
    }

    const result = await pool.query(
      `INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
       VALUES ($1, $2, 1)
       RETURNING *`,
      [id_usuario, id_club]
    );

    const huboReasignacion = activaResult.rows.length > 0;
    const accion = huboReasignacion ? 'reasignar_alumno' : 'asignar_alumno';
    const clubAnterior = huboReasignacion ? activaResult.rows[0].club_anterior : null;
    const descripcion = huboReasignacion
      ? `${req.user.nombre_completo} reasignó al usuario "${userResult.rows[0].nombre_completo}" del club "${clubAnterior}" al club "${club.nombre_club}"`
      : `${req.user.nombre_completo} asignó al usuario "${userResult.rows[0].nombre_completo}" al club "${club.nombre_club}"`;

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion,
      descripcion,
      entidadTipo: 'inscripcion',
      entidadId: result.rows[0].id_inscripcion,
    });

    res.status(201).json({
      message: huboReasignacion
        ? `Alumno reasignado del club "${clubAnterior}" al club "${club.nombre_club}" correctamente`
        : `Alumno asignado al club "${club.nombre_club}" correctamente`,
      inscripcion: result.rows[0],
    });
  } catch (err) {
    console.error('Error al asignar alumno a club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
