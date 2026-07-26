/* Ruta del dashboard de admin: métricas agregadas, últimas inscripciones y tendencia. */
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard-data', authenticate, requireRole(3), async (req, res) => {
  try {
    const [
      solicitudesPendientes,
      ultimasInscripciones,
      inscripcionesPorMes,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM formularios
         WHERE status IN ('Pendiente', 'En revisión')`
      ),
      pool.query(
        `SELECT f.nombre_completo, c.nombre_club, f.fecha_creacion, f.status
         FROM formularios f
         JOIN clubes c ON c.id_club = f.id_club
         ORDER BY f.fecha_creacion DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT to_char(f.fecha_creacion, 'YYYY-MM') AS mes,
                COUNT(*)::int AS total
         FROM formularios f
         WHERE f.fecha_creacion >= NOW() - INTERVAL '6 months'
         GROUP BY mes
         ORDER BY mes`
      ),
    ]);

    const mesesLargo = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    };

    const chartData = inscripcionesPorMes.rows.map((r) => ({
      mes: mesesLargo[r.mes.slice(5)] || r.mes,
      total: r.total,
    }));

    res.json({
      solicitudesPendientes: solicitudesPendientes.rows[0].total,
      ultimasInscripciones: ultimasInscripciones.rows,
      inscripcionesPorMes: chartData,
    });
  } catch (err) {
    console.error('Error al obtener datos del dashboard admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
