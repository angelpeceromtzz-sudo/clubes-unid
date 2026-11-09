import { Router } from 'express';
import pool from '../db.js';
import XLSX from 'xlsx';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';
import { esIdEntero, validarParamsEnteros } from '../lib/validarId.js';
import { crearLibroEjecutivo } from '../lib/reporteEjecutivoExcel.js';

const router = Router();

validarParamsEnteros(router);

// Todas las rutas requieren autenticación y rol admin/rectoría (Coordinación)
router.use(authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION));

// Encuestas agregadas para vista ejecutiva
router.get('/encuestas-ejecutivas', async (req, res) => {
  try {
    const { carrera } = req.query;

    const f = {
      carrera: carrera && esIdEntero(carrera) ? Number(carrera) : null,
    };

    const paramsResp = [];
    let idxResp = 1;
    let whereResp = 'WHERE 1=1';
    if (f.carrera) {
      whereResp += ` AND r.id_licenciatura = $${idxResp++}`;
      paramsResp.push(f.carrera);
    }

    const whereRespLimpio = whereResp === 'WHERE 1=1'
      ? ''
      : whereResp.replace('WHERE 1=1 AND', 'AND');

    const encuestas = await pool.query(
      `SELECT e.id_encuesta, e.titulo, e.estado, e.fecha_inicio, e.fecha_fin,
              (SELECT COUNT(*)::int FROM respuestas_encuesta r WHERE r.id_encuesta = e.id_encuesta ${whereRespLimpio}) AS total_respuestas
       FROM encuestas e
       ORDER BY e.fecha_creacion DESC`,
      paramsResp
    );

    const totalRespuestas = encuestas.rows.reduce((acc, e) => acc + e.total_respuestas, 0);

    const paramsLic = [];
    let idxLic = 1;
    let whereLic = 'WHERE r.id_licenciatura IS NOT NULL';
    if (f.carrera) {
      whereLic += ` AND r.id_licenciatura = $${idxLic++}`;
      paramsLic.push(f.carrera);
    }

    const porLicenciatura = await pool.query(
      `SELECT l.id_licenciatura, l.nombre, COUNT(*)::int AS respuestas
       FROM respuestas_encuesta r
       JOIN cat_licenciaturas l ON l.id_licenciatura = r.id_licenciatura
       ${whereLic}
       GROUP BY l.id_licenciatura, l.nombre
       ORDER BY respuestas DESC, l.nombre ASC`,
      paramsLic
    );



    const sinLicenciatura = await pool.query(
      `SELECT COUNT(*)::int AS respuestas
       FROM respuestas_encuesta r
       WHERE r.id_licenciatura IS NULL
         ${f.carrera ? 'AND r.id_licenciatura = $1' : ''}`,
      f.carrera ? [f.carrera] : []
    );
    const porFecha = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', fecha_envio), 'YYYY-MM-DD') AS dia,
                COUNT(*)::int AS respuestas
         FROM respuestas_encuesta r
         ${whereResp === 'WHERE 1=1' ? '' : whereResp.replace('WHERE 1=1 AND', 'WHERE')}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 30`,
      paramsResp
    );

    res.json({
      total_respuestas: totalRespuestas,
      encuestas: encuestas.rows,
      por_licenciatura: porLicenciatura.rows,
      sin_licenciatura: sinLicenciatura.rows[0]?.respuestas || 0,
      por_fecha: porFecha.rows.reverse(),
      actualizado_en: new Date().toISOString(),
      estado: encuestas.rows.length === 0 ? 'sin_datos' : 'ok',
      filtros_aplicados: f,
    });
  } catch (err) {
    console.error('Error al obtener encuestas ejecutivas:', err);
    res.status(500).json({ error: 'Error interno del servidor', estado: 'error' });
  }
});

// Estadísticas generales del ecosistema de clubes (situación actual).
// El filtro de club restringe el universo; el periodo NO se aplica aquí
// porque cupos e inscripciones activas actuales no reconstruyen un corte histórico.
router.get('/panel', async (req, res) => {
  try {
    const { id_club } = req.query;

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
    };

    const [
      totalAlumnos,
      alumnosInscritos,
      totalClubes,
      solicitudesPorStatus,
      ocupacion,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM usuarios WHERE id_rol = 1 AND deleted_at IS NULL'),
      pool.query(`
        SELECT COUNT(DISTINCT i.id_usuario)::int AS total
        FROM inscripciones i
        JOIN usuarios u ON u.id_usuario = i.id_usuario
        WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1
          AND ($1::int IS NULL OR i.id_club = $1)
      `, [f.id_club]),
      pool.query('SELECT COUNT(*)::int AS total FROM clubes WHERE id_estatus_club = 1'),
      pool.query(`
        SELECT COALESCE(json_agg(json_build_object('status', status, 'total', cnt)), '[]'::json) AS datos
        FROM (
          SELECT status, COUNT(*)::int AS cnt
          FROM formularios
          WHERE ($1::int IS NULL OR id_club = $1)
          GROUP BY status
        ) sub
      `, [f.id_club]),
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
          AND ($1::int IS NULL OR c.id_club = $1)
      `, [f.id_club]),
    ]);

    const stats = {
      totalAlumnos: totalAlumnos.rows[0].total,
      alumnosInscritos: alumnosInscritos.rows[0].total,
      totalClubes: totalClubes.rows[0].total,
      porcentajeOcupacion: ocupacion.rows[0].cupo_total > 0
        ? Math.round((ocupacion.rows[0].ocupado_total / ocupacion.rows[0].cupo_total) * 100)
        : 0,
      solicitudes: solicitudesPorStatus.rows[0].datos || [],
      filtros_aplicados: f,
      alcance: 'Situación actual: cupos e inscripciones activas al día de hoy.',
    };

    res.json(stats);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cupo máximo vs ocupado por club (situación actual; solo filtro de club).
router.get('/ocupacion-clubes', async (req, res) => {
  try {
    const { id_club } = req.query;

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
    };

    const params = [];
    let idx = 1;
    let whereC = 'WHERE c.id_estatus_club = 1';
    let whereI = 'WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1 AND i.id_club = c.id_club';

    if (f.id_club) {
      whereC += ` AND c.id_club = $${idx++}`;
      whereI += ` AND i.id_club = $${idx++}`;
      params.push(f.id_club, f.id_club);
    }

    const result = await pool.query(`
      SELECT c.id_club, c.nombre_club, c.cupo_maximo,
        COALESCE((
          SELECT COUNT(*)::int FROM inscripciones i
          JOIN usuarios u ON u.id_usuario = i.id_usuario
          ${whereI}
        ), 0) AS cupo_ocupado
      FROM clubes c
      ${whereC}
      ORDER BY c.nombre_club
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ocupación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Clubes con mayor número de integrantes (situación actual; solo filtro de club).
router.get('/top-clubes', async (req, res) => {
  try {
    const { id_club } = req.query;

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
    };

    const params = [];
    let idx = 1;
    let whereC = 'WHERE c.id_estatus_club = 1';
    let whereI = 'WHERE i.id_club = c.id_club AND i.id_estatus_inscripcion = 1 AND u.id_rol = 1';

    if (f.id_club) {
      whereC += ` AND c.id_club = $${idx++}`;
      whereI += ` AND i.id_club = $${idx++}`;
      params.push(f.id_club, f.id_club);
    }

    const result = await pool.query(`
      SELECT c.id_club, c.nombre_club,
        COALESCE((
          SELECT COUNT(*)::int FROM inscripciones i
          JOIN usuarios u ON u.id_usuario = i.id_usuario
          ${whereI}
        ), 0) AS total_integrantes
      FROM clubes c
      ${whereC}
      ORDER BY total_integrantes DESC
      LIMIT 10
    `, params);
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
        c.cupo_maximo, c.id_responsable_club,
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
      LEFT JOIN usuarios u ON u.id_usuario = c.id_responsable_club
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

    for (const [nombre, valor] of Object.entries({ id_club, id_periodo, carrera })) {
      if (valor !== undefined && valor !== '' && !esIdEntero(valor)) {
        return res.status(400).json({ error: `El filtro ${nombre} debe ser un entero positivo.` });
      }
    }
    if (estado !== undefined && typeof estado !== 'string') {
      return res.status(400).json({ error: 'El estado de postulación no es válido.' });
    }

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
      id_periodo: id_periodo && esIdEntero(id_periodo) ? Number(id_periodo) : null,
      carrera: carrera && esIdEntero(carrera) ? Number(carrera) : null,
      estado: estado || null,
    };

    const [clubFiltro, periodoFiltro, licenciaturaFiltro] = await Promise.all([
      f.id_club ? pool.query('SELECT nombre_club FROM clubes WHERE id_club = $1', [f.id_club]) : null,
      f.id_periodo ? pool.query('SELECT nombre, fecha_inicio, fecha_fin FROM periodos_actividad WHERE id_periodo = $1', [f.id_periodo]) : null,
      f.carrera ? pool.query('SELECT nombre FROM cat_licenciaturas WHERE id_licenciatura = $1', [f.carrera]) : null,
    ]);
    if ([clubFiltro, periodoFiltro, licenciaturaFiltro].some((resultado) => resultado && !resultado.rows.length)) {
      return res.status(404).json({ error: 'Uno de los filtros seleccionados ya no está disponible.' });
    }
    const periodo = periodoFiltro?.rows[0];
    const paramsFormularios = [];
    const condicionesFormularios = [];
    for (const [columna, valor] of [['f.id_club', f.id_club], ['f.id_licenciatura', f.carrera], ['f.status', f.estado]]) {
      if (valor) condicionesFormularios.push(`${columna} = $${paramsFormularios.push(valor)}`);
    }
    const paramsInscripciones = f.id_club ? [f.id_club] : [];
    const condicionesInscripciones = f.id_club ? ['i.id_club = $1'] : [];
    if (periodo) {
      condicionesFormularios.push(`f.fecha_envio >= $${paramsFormularios.push(periodo.fecha_inicio)}::date`);
      condicionesFormularios.push(`f.fecha_envio < ($${paramsFormularios.push(periodo.fecha_fin)}::date + INTERVAL '1 day')`);
      condicionesInscripciones.push(`i.fecha_inscripcion >= $${paramsInscripciones.push(periodo.fecha_inicio)}::date`);
      condicionesInscripciones.push(`i.fecha_inscripcion < ($${paramsInscripciones.push(periodo.fecha_fin)}::date + INTERVAL '1 day')`);
    }
    const whereFormularios = condicionesFormularios.length ? `AND ${condicionesFormularios.join(' AND ')}` : '';
    const whereInscripciones = condicionesInscripciones.length ? `AND ${condicionesInscripciones.join(' AND ')}` : '';

    // KPIs y secciones.
    const [
      totalAlumnos,
      alumnosInscritos,
      totalClubes,
      ocupacion,
      postulaciones,
      asistencia,
      encuestas,
      porLicenciatura,
      sinLicenciatura,
      evolucionPostulaciones,
      evolucionInscripciones,
      clubesOcupacion,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM usuarios WHERE id_rol = 1 AND deleted_at IS NULL'),
      pool.query(`
        SELECT COUNT(DISTINCT i.id_usuario)::int AS total
        FROM inscripciones i
        JOIN usuarios u ON u.id_usuario = i.id_usuario
        WHERE i.id_estatus_inscripcion = 1 AND u.id_rol = 1
        ${f.id_club ? 'AND i.id_club = $1' : ''}
      `, f.id_club ? [f.id_club] : []),
      pool.query('SELECT COUNT(*)::int AS total FROM clubes WHERE id_estatus_club = 1'),
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
          ${whereFormularios}
        GROUP BY f.status
        ORDER BY f.status
      `, paramsFormularios),
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
          (SELECT COUNT(*)::int FROM respuestas_encuesta r WHERE r.id_encuesta = e.id_encuesta ${f.carrera ? 'AND r.id_licenciatura = $1' : ''}) AS total_respuestas
        FROM encuestas e
        ORDER BY e.fecha_creacion DESC
      `, f.carrera ? [f.carrera] : []),
      pool.query(`
        SELECT l.id_licenciatura, l.nombre, COUNT(*)::int AS respuestas
        FROM respuestas_encuesta r
        JOIN cat_licenciaturas l ON l.id_licenciatura = r.id_licenciatura
        WHERE r.id_licenciatura IS NOT NULL
          ${f.carrera ? 'AND r.id_licenciatura = $1' : ''}
        GROUP BY l.id_licenciatura, l.nombre
        ORDER BY respuestas DESC, l.nombre ASC
      `, f.carrera ? [f.carrera] : []),
      pool.query(`
        SELECT COUNT(*)::int AS respuestas
        FROM respuestas_encuesta r
        WHERE r.id_licenciatura IS NULL
          ${f.carrera ? 'AND r.id_licenciatura = $1' : ''}
      `, f.carrera ? [f.carrera] : []),
      pool.query(`
        SELECT to_char(f.fecha_envio, 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM formularios f
        WHERE f.fecha_envio >= NOW() - INTERVAL '6 months'
          ${whereFormularios}
        GROUP BY mes
        ORDER BY mes
      `, paramsFormularios),
      pool.query(`
        SELECT to_char(i.fecha_inscripcion, 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM inscripciones i
        WHERE i.id_estatus_inscripcion = 1
          AND i.fecha_inscripcion >= NOW() - INTERVAL '6 months'
          ${whereInscripciones}
        GROUP BY mes
        ORDER BY mes
      `, paramsInscripciones),
      pool.query(`
        SELECT c.id_club, c.nombre_club, c.cupo_maximo,
          COALESCE((
            SELECT COUNT(*)::int FROM inscripciones i
            JOIN usuarios u ON u.id_usuario = i.id_usuario
            WHERE i.id_club = c.id_club AND i.id_estatus_inscripcion = 1 AND u.id_rol = 1
          ), 0) AS cupo_ocupado
        FROM clubes c
        WHERE c.id_estatus_club = 1
          ${f.id_club ? 'AND c.id_club = $1' : ''}
        ORDER BY c.nombre_club
      `, f.id_club ? [f.id_club] : []),
    ]);

    const generadoEn = new Date();
    const fecha = generadoEn.toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
    const wb = crearLibroEjecutivo({
      generadoEn,
      filtros: f,
      nombresFiltros: { club: clubFiltro?.rows[0]?.nombre_club, periodo: periodo?.nombre, licenciatura: licenciaturaFiltro?.rows[0]?.nombre },
      totalAlumnos: totalAlumnos.rows[0].total,
      alumnosInscritos: alumnosInscritos.rows[0].total,
      totalClubes: totalClubes.rows[0].total,
      ocupacion: ocupacion.rows[0],
      postulaciones: postulaciones.rows,
      asistencia: asistencia.rows,
      encuestas: encuestas.rows,
      porLicenciatura: porLicenciatura.rows,
      sinLicenciatura: sinLicenciatura.rows[0]?.respuestas || 0,
      evolucionPostulaciones: evolucionPostulaciones.rows,
      evolucionInscripciones: evolucionInscripciones.rows,
      clubes: clubesOcupacion.rows,
    });

    if (formato === 'csv') {
      const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(wb.Sheets['Alcance']) + '\r\n' + XLSX.utils.sheet_to_csv(wb.Sheets['KPIs']);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ejecutivo_${fecha}.csv"`);
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', compression: true });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ejecutivo_${fecha}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('Error al exportar ejecutivo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
