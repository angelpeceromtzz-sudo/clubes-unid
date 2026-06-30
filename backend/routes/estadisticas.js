import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación y rol 4 (Servicios Escolares)
router.use(authenticate, requireRole(4));

// Estadísticas generales del ecosistema de clubes
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalAlumnos,
      alumnosInscritos,
      totalClubes,
      solicitudesPorStatus,
      ocupacion,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM usuarios WHERE id_rol = 1'),
      pool.query(`
        SELECT COUNT(DISTINCT i.id_usuario)::int AS total
        FROM inscripciones i
        JOIN usuarios u ON u.id_usuario = i.id_usuario
        WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1
      `),
      pool.query('SELECT COUNT(*)::int AS total FROM clubes'),
      pool.query(`
        SELECT COALESCE(json_agg(json_build_object('status', status, 'total', cnt)), '[]'::json) AS datos
        FROM (
          SELECT status, COUNT(*)::int AS cnt
          FROM formularios
          GROUP BY status
        ) sub
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(c.cupo_maximo)::int, 0) AS cupo_total,
          COALESCE(SUM(sub.ocupado)::int, 0) AS ocupado_total
        FROM clubes c
        LEFT JOIN (
          SELECT i.id_club, COUNT(*)::int AS ocupado
          FROM inscripciones i
          JOIN usuarios u ON u.id_usuario = i.id_usuario
          WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1
          GROUP BY i.id_club
        ) sub ON sub.id_club = c.id_club
      `),
    ]);

    const stats = {
      totalAlumnos: totalAlumnos.rows[0].total,
      alumnosInscritos: alumnosInscritos.rows[0].total,
      totalClubes: totalClubes.rows[0].total,
      porcentajeOcupacion: ocupacion.rows[0].cupo_total > 0
        ? Math.round((ocupacion.rows[0].ocupado_total / ocupacion.rows[0].cupo_total) * 100)
        : 0,
      solicitudes: solicitudesPorStatus.rows[0].datos || [],
    };

    res.json(stats);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cupo máximo vs ocupado por club (para gráfica)
router.get('/ocupacion-clubes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id_club, c.nombre_club, c.cupo_maximo,
        COALESCE((
          SELECT COUNT(*)::int FROM inscripciones i
          JOIN usuarios u ON u.id_usuario = i.id_usuario
          WHERE i.id_club = c.id_club
            AND i.id_estatus_inscripcion = 1
            AND u.id_rol = 1
        ), 0) AS cupo_ocupado
      FROM clubes c
      WHERE c.id_estatus_club = 1
      ORDER BY c.nombre_club
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ocupación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Clubes con mayor número de integrantes
router.get('/top-clubes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id_club, c.nombre_club,
        COALESCE((
          SELECT COUNT(*)::int FROM inscripciones i
          JOIN usuarios u ON u.id_usuario = i.id_usuario
          WHERE i.id_club = c.id_club
            AND i.id_estatus_inscripcion = 1
            AND u.id_rol = 1
        ), 0) AS total_integrantes
      FROM clubes c
      WHERE c.id_estatus_club = 1
      ORDER BY total_integrantes DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener top clubes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Clubes con detalles para consulta (incluye presidente)
router.get('/clubes-detalle', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
        c.cupo_maximo, c.id_presidente,
        COALESCE(u.nombre_completo, 'Sin asignar') AS presidente,
        c.lugar, c.horario,
        c.id_estatus_club, e.nombre_estatus AS estatus,
        COALESCE((
          SELECT COUNT(*)::int FROM inscripciones i
          JOIN usuarios us ON us.id_usuario = i.id_usuario
          WHERE i.id_club = c.id_club
            AND i.id_estatus_inscripcion = 1
            AND us.id_rol = 1
        ), 0) AS cupo_ocupado
      FROM clubes c
      JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
      LEFT JOIN usuarios u ON u.id_usuario = c.id_presidente
      ORDER BY c.nombre_club
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener clubes detalle:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Padrón completo de alumnos por club (con filtros)
router.get('/padron', async (req, res) => {
  try {
    const { id_club, busqueda, carrera, turno } = req.query;

    let sql = `
      SELECT f.id_formulario, f.id_club, c.nombre_club,
        f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre,
        f.turno, f.status, f.bloque_asignado
      FROM formularios f
      JOIN clubes c ON c.id_club = f.id_club
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (id_club) {
      sql += ` AND f.id_club = $${idx++}`;
      params.push(parseInt(id_club, 10));
    }
    if (busqueda) {
      sql += ` AND (f.nombre_completo ILIKE $${idx} OR f.matricula ILIKE $${idx})`;
      params.push(`%${busqueda}%`);
      idx++;
    }
    if (carrera) {
      sql += ` AND f.carrera ILIKE $${idx++}`;
      params.push(`%${carrera}%`);
    }
    if (turno) {
      sql += ` AND f.turno = $${idx++}`;
      params.push(turno);
    }

    sql += ' ORDER BY c.nombre_club, f.nombre_completo';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener padrón:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listas de asistencia por bloque (formularios admitidos con bloque)
router.get('/asistencia/:id_club', async (req, res) => {
  try {
    const { id_club } = req.params;

    const result = await pool.query(`
      SELECT f.id_formulario, f.nombre_completo, f.matricula, f.carrera,
        f.turno, f.bloque_asignado, f.status
      FROM formularios f
      WHERE f.id_club = $1
        AND f.status IN ('Miembro oficial')
      ORDER BY f.bloque_asignado, f.nombre_completo
    `, [id_club]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener lista asistencia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
