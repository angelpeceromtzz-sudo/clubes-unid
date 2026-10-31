import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireCoordinacion } from '../middleware/auth.js';
import { esIdEntero, validarParamsEnteros } from '../lib/validarId.js';
import XLSX from 'xlsx';

const router = Router();

validarParamsEnteros(router);

// Todas las rutas requieren autenticación y rol 4 (Rectoría)
router.use(authenticate, requireCoordinacion);

// Encuestas agregadas para vista ejecutiva
router.get('/encuestas-ejecutivas', async (req, res) => {
  try {
    const encuestas = await pool.query(
      `SELECT e.id_encuesta, e.titulo, e.estado, e.fecha_inicio, e.fecha_fin,
              (SELECT COUNT(*)::int FROM respuestas_encuesta r WHERE r.id_encuesta = e.id_encuesta) AS total_respuestas
       FROM encuestas e
       ORDER BY e.fecha_creacion DESC`
    );

    const totalRespuestas = encuestas.rows.reduce((acc, e) => acc + e.total_respuestas, 0);

    const porLicenciatura = await pool.query(
      `SELECT l.id_licenciatura, l.nombre, COUNT(*)::int AS respuestas
       FROM respuestas_encuesta r
       JOIN cat_licenciaturas l ON l.id_licenciatura = r.id_licenciatura
       GROUP BY l.id_licenciatura, l.nombre
       ORDER BY respuestas DESC, l.nombre ASC`
    );

    const porFecha = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', fecha_envio), 'YYYY-MM-DD') AS dia,
               COUNT(*)::int AS respuestas
        FROM respuestas_encuesta
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT 30`
    );

    res.json({
      total_respuestas: totalRespuestas,
      encuestas: encuestas.rows,
      por_licenciatura: porLicenciatura.rows,
      por_fecha: porFecha.rows.reverse(),
      actualizado_en: new Date().toISOString(),
      estado: encuestas.rows.length === 0 ? 'sin_datos' : 'ok',
    });
  } catch (err) {
    console.error('Error al obtener encuestas ejecutivas:', err);
    res.status(500).json({ error: 'Error interno del servidor', estado: 'error' });
  }
});

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
        c.horario,
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
    const { id_club, busqueda, carrera } = req.query;

    let sql = `
      SELECT f.id_formulario, f.id_club, c.nombre_club,
        f.nombre_completo, f.matricula, l.nombre AS carrera, f.cuatrimestre,
        f.status, f.bloque_asignado
      FROM formularios f
      JOIN clubes c ON c.id_club = f.id_club
      LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (id_club) {
      // H13: un id_club no numérico llegaba a PostgreSQL como parseInt → NaN
      // y terminaba en 500; ahora responde 400 antes de consultar.
      if (!esIdEntero(id_club)) {
        return res.status(400).json({ error: 'id_club inválido' });
      }
      sql += ` AND f.id_club = $${idx++}`;
      params.push(Number(id_club));
    }
    if (busqueda) {
      sql += ` AND (f.nombre_completo ILIKE $${idx} OR f.matricula ILIKE $${idx})`;
      params.push(`%${busqueda}%`);
      idx++;
    }
    if (carrera) {
      sql += ` AND l.nombre ILIKE $${idx++}`;
      params.push(`%${carrera}%`);
    }

    sql += ' ORDER BY c.nombre_club, f.nombre_completo';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener padrón:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asistencia agregada para vista ejecutiva (solo sesiones completadas)
router.get('/asistencia-ejecutiva', async (req, res) => {
  try {
    const { id_club, id_periodo } = req.query;

    let sql = `
      SELECT s.id_club, c.nombre_club,
        COUNT(*) FILTER (WHERE a.estado = 'presente')::int AS presentes,
        COUNT(*) FILTER (WHERE a.estado = 'ausente')::int AS ausentes,
        COUNT(*) FILTER (WHERE a.estado = 'justificado')::int AS justificadas,
        COUNT(*)::int AS total
      FROM sesiones s
      JOIN asistencias a ON a.id_sesion = s.id_sesion
      JOIN clubes c ON c.id_club = s.id_club
      WHERE s.estado = 'completada'
    `;
    const params = [];
    let idx = 1;

    if (id_club) {
      if (!esIdEntero(id_club)) {
        return res.status(400).json({ error: 'id_club inválido' });
      }
      sql += ` AND s.id_club = $${idx++}`;
      params.push(Number(id_club));
    }

    if (id_periodo) {
      if (!esIdEntero(id_periodo)) {
        return res.status(400).json({ error: 'id_periodo inválido' });
      }
      sql += ` AND s.id_periodo = $${idx++}`;
      params.push(Number(id_periodo));
    }

    sql += ' GROUP BY s.id_club, c.nombre_club ORDER BY c.nombre_club';

    const result = await pool.query(sql, params);

    const global = result.rows.reduce(
      (acc, r) => {
        acc.presentes += r.presentes;
        acc.ausentes += r.ausentes;
        acc.justificadas += r.justificadas;
        acc.total += r.total;
        return acc;
      },
      { presentes: 0, ausentes: 0, justificadas: 0, total: 0 }
    );

    const evaluadas = global.presentes + global.ausentes;
    const porcentaje = evaluadas > 0 ? Math.round((global.presentes / evaluadas) * 1000) / 10 : 0;

    res.json({
      global: { ...global, porcentaje },
      por_club: result.rows,
      actualizado_en: new Date().toISOString(),
      estado: result.rows.length === 0 ? 'sin_datos' : 'ok',
    });
  } catch (err) {
    console.error('Error al obtener asistencia ejecutiva:', err);
    res.status(500).json({ error: 'Error interno del servidor', estado: 'error' });
  }
});

// Listas de asistencia por bloque (formularios admitidos con bloque)
router.get('/asistencia/:id_club', async (req, res) => {
  try {
    const { id_club } = req.params;

    const result = await pool.query(`
      SELECT f.id_formulario, f.nombre_completo, f.matricula, l.nombre AS carrera,
        f.bloque_asignado, f.status
      FROM formularios f
      LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
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

// Exportación agregada de la vista ejecutiva (CSV y Excel)
router.get('/ejecutivo/exportar', async (req, res) => {
  try {
    const { formato = 'csv', id_club, id_periodo, carrera, estado } = req.query;

    if (!['csv', 'xlsx'].includes(formato)) {
      return res.status(400).json({ error: 'Formato inválido. Use csv o xlsx.' });
    }

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
      id_periodo: id_periodo && esIdEntero(id_periodo) ? Number(id_periodo) : null,
      carrera: carrera && esIdEntero(carrera) ? Number(carrera) : null,
      estado: estado || null,
    };

    // KPIs
    const [totalAlumnos, alumnosInscritos, totalClubes, ocupacion, postulaciones, asistencia, encuestas, porLicenciatura] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM usuarios WHERE id_rol = 1'),
      pool.query(`
        SELECT COUNT(DISTINCT i.id_usuario)::int AS total
        FROM inscripciones i
        JOIN usuarios u ON u.id_usuario = i.id_usuario
        WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1
        ${f.id_club ? 'AND i.id_club = $1' : ''}
      `, f.id_club ? [f.id_club] : []),
      pool.query('SELECT COUNT(*)::int AS total FROM clubes'),
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
        WHERE c.id_estatus_club = 1
      `),
      pool.query(`
        SELECT f.status, COUNT(*)::int AS total
        FROM formularios f
        WHERE 1=1
          ${f.id_club ? 'AND f.id_club = $1' : ''}
          ${f.carrera ? 'AND f.id_licenciatura = $' + ((f.id_club ? 2 : 1)) : ''}
          ${f.estado ? 'AND f.status = $' + ((f.id_club ? 2 : 1) + (f.carrera ? 1 : 0)) : ''}
        GROUP BY f.status
      `, [
        ...(f.id_club ? [f.id_club] : []),
        ...(f.carrera ? [f.carrera] : []),
        ...(f.estado ? [f.estado] : []),
      ]),
      pool.query(`
        SELECT s.id_club, c.nombre_club,
          COUNT(*) FILTER (WHERE a.estado = 'presente')::int AS presentes,
          COUNT(*) FILTER (WHERE a.estado = 'ausente')::int AS ausentes,
          COUNT(*) FILTER (WHERE a.estado = 'justificado')::int AS justificadas,
          COUNT(*)::int AS total
        FROM sesiones s
        JOIN asistencias a ON a.id_sesion = s.id_sesion
        JOIN clubes c ON c.id_club = s.id_club
        WHERE s.estado = 'completada'
          ${f.id_club ? 'AND s.id_club = $1' : ''}
          ${f.id_periodo ? 'AND s.id_periodo = $' + (f.id_club ? 2 : 1) : ''}
        GROUP BY s.id_club, c.nombre_club
        ORDER BY c.nombre_club
      `, [
        ...(f.id_club ? [f.id_club] : []),
        ...(f.id_periodo ? [f.id_periodo] : []),
      ]),
      pool.query(`
        SELECT e.id_encuesta, e.titulo, e.estado,
          (SELECT COUNT(*)::int FROM respuestas_encuesta r WHERE r.id_encuesta = e.id_encuesta) AS total_respuestas
        FROM encuestas e
        ORDER BY e.fecha_creacion DESC
      `),
      pool.query(`
        SELECT l.id_licenciatura, l.nombre, COUNT(*)::int AS respuestas
        FROM respuestas_encuesta r
        JOIN cat_licenciaturas l ON l.id_licenciatura = r.id_licenciatura
        GROUP BY l.id_licenciatura, l.nombre
        ORDER BY respuestas DESC, l.nombre ASC
      `),
    ]);

    const evaluadas = asistencia.rows.reduce((acc, r) => acc + r.presentes + r.ausentes, 0);
    const presentesTotal = asistencia.rows.reduce((acc, r) => acc + r.presentes, 0);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Métrica', 'Valor'],
      ['Alumnos registrados activos', totalAlumnos.rows[0].total],
      ['Alumnos con inscripción activa', alumnosInscritos.rows[0].total],
      ['Participación (%)', totalAlumnos.rows[0].total > 0 ? Math.round((alumnosInscritos.rows[0].total / totalAlumnos.rows[0].total) * 1000) / 10 : 0],
      ['Clubes activos', totalClubes.rows[0].total],
      ['Ocupación total (%)', ocupacion.rows[0].cupo_total > 0 ? Math.round((ocupacion.rows[0].ocupado_total / ocupacion.rows[0].cupo_total) * 100) : 0],
      ['Asistencia promedio (%)', evaluadas > 0 ? Math.round((presentesTotal / evaluadas) * 1000) / 10 : 0],
      ['Total respuestas de encuestas', encuestas.rows.reduce((acc, e) => acc + e.total_respuestas, 0)],
    ]), 'KPIs');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(postulaciones.rows), 'Postulaciones por estado');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(asistencia.rows), 'Asistencia por club');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(encuestas.rows), 'Encuestas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porLicenciatura.rows), 'Encuestas por licenciatura');

    const fecha = new Date().toISOString().slice(0, 10);
    if (formato === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets['KPIs']);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ejecutivo_${fecha}.csv"`);
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ejecutivo_${fecha}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Error al exportar ejecutivo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
