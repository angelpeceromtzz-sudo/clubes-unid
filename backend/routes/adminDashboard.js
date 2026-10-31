/* Ruta del dashboard de admin: métricas agregadas, últimas inscripciones y tendencia. */
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireCoordinacion } from '../middleware/auth.js';
import { esIdEntero } from '../lib/validarId.js';

const router = Router();

router.get('/dashboard-data', authenticate, requireCoordinacion, async (req, res) => {
  try {
    const { id_club, id_periodo, carrera, estado } = req.query;

    const f = {
      id_club: id_club && esIdEntero(id_club) ? Number(id_club) : null,
      id_periodo: id_periodo && esIdEntero(id_periodo) ? Number(id_periodo) : null,
      carrera: carrera && esIdEntero(carrera) ? Number(carrera) : null,
      estado: estado || null,
    };

    let periodo = null;
    if (f.id_periodo) {
      const r = await pool.query('SELECT fecha_inicio, fecha_fin FROM periodos_actividad WHERE id_periodo = $1', [f.id_periodo]);
      if (r.rows.length) periodo = r.rows[0];
    }

    const filtrosFormularios = [];
    const paramsFormularios = [];
    let idxForm = 1;

    if (f.id_club) {
      filtrosFormularios.push(`f.id_club = $${idxForm++}`);
      paramsFormularios.push(f.id_club);
    }

    if (f.carrera) {
      filtrosFormularios.push(`f.id_licenciatura = $${idxForm++}`);
      paramsFormularios.push(f.carrera);
    }

    if (f.estado) {
      filtrosFormularios.push(`f.status = $${idxForm++}`);
      paramsFormularios.push(f.estado);
    }

    if (periodo) {
      filtrosFormularios.push(`f.fecha_envio >= $${idxForm++} AND f.fecha_envio <= $${idxForm++}`);
      paramsFormularios.push(periodo.fecha_inicio, periodo.fecha_fin);
    }

    const whereFormularios = filtrosFormularios.length ? `AND ${filtrosFormularios.join(' AND ')}` : '';

    const filtrosInscripciones = [];
    const paramsInscripciones = [];
    let idxIns = 1;

    if (f.id_club) {
      filtrosInscripciones.push(`i.id_club = $${idxIns++}`);
      paramsInscripciones.push(f.id_club);
    }

    if (periodo) {
      filtrosInscripciones.push(`i.fecha_inscripcion >= $${idxIns++} AND i.fecha_inscripcion <= $${idxIns++}`);
      paramsInscripciones.push(periodo.fecha_inicio, periodo.fecha_fin);
    }

    const whereInscripciones = filtrosInscripciones.length ? `AND ${filtrosInscripciones.join(' AND ')}` : '';

    const [
      solicitudesPendientes,
      ultimasInscripciones,
      postulacionesPorMes,
      inscripcionesPorMes,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM formularios f
         WHERE f.status IN ('Pendiente', 'En revisión') ${whereFormularios}`,
        paramsFormularios
      ),
      pool.query(
        `SELECT f.nombre_completo, c.nombre_club, f.fecha_envio, f.status
         FROM formularios f
         JOIN clubes c ON c.id_club = f.id_club
         ${whereFormularios ? 'WHERE ' + whereFormularios.replace(/^AND /, '') : ''}
         ORDER BY f.fecha_envio DESC
         LIMIT 5`,
        paramsFormularios
      ),
      pool.query(
        `SELECT to_char(f.fecha_envio, 'YYYY-MM') AS mes,
                 COUNT(*)::int AS total
          FROM formularios f
          WHERE f.fecha_envio >= NOW() - INTERVAL '6 months'
            ${whereFormularios}
         GROUP BY mes
         ORDER BY mes`,
        paramsFormularios
      ),
      pool.query(
        `SELECT to_char(i.fecha_inscripcion, 'YYYY-MM') AS mes,
                 COUNT(*)::int AS total
          FROM inscripciones i
          WHERE i.id_estatus_inscripcion = 1
            AND i.fecha_inscripcion >= NOW() - INTERVAL '6 months'
            ${whereInscripciones}
         GROUP BY mes
         ORDER BY mes`,
        paramsInscripciones
      ),
    ]);

    const mesesLargo = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    };

    const chartPostulaciones = postulacionesPorMes.rows.map((r) => ({
      clave: r.mes,
      mes: `${mesesLargo[r.mes.slice(5)] || r.mes} ${r.mes.slice(0, 4)}`,
      total: r.total,
    }));

    const chartInscripciones = inscripcionesPorMes.rows.map((r) => ({
      clave: r.mes,
      mes: `${mesesLargo[r.mes.slice(5)] || r.mes} ${r.mes.slice(0, 4)}`,
      total: r.total,
    }));

    res.json({
      solicitudesPendientes: solicitudesPendientes.rows[0].total,
      ultimasInscripciones: ultimasInscripciones.rows,
      postulacionesPorMes: chartPostulaciones,
      inscripcionesPorMes: chartInscripciones,
      filtros_aplicados: { id_club: id_club || null, carrera: carrera || null, estado: estado || null },
      actualizado_en: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error al obtener datos del dashboard admin:', err);
    res.status(500).json({ error: 'Error interno del servidor', estado: 'error' });
  }
});

export default router;
