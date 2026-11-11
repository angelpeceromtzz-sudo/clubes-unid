import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { esIdEntero } from '../lib/validarId.js';
import { ROL_ADMIN, ROL_ALUMNO, ROL_COORDINACION, ROL_RECTORIA } from '../constants/roles.js';

const router = Router();

router.use(authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION));

const MIN_BUSQUEDA = 3;
const MAX_RESULTADOS = 25;

function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, '\\$&');
}

function resumirTrayectoria({ membresias, postulaciones, asistencia }) {
  const clubes = new Set([
    ...membresias.map(m => m.id_club),
    ...postulaciones.map(p => p.id_club),
    ...asistencia.map(a => a.id_club),
  ]);
  const totalSesiones = asistencia.reduce((suma, a) => suma + a.sesiones_registradas, 0);
  const asistidas = asistencia.reduce((suma, a) => suma + a.presentes + a.justificadas, 0);
  const fechas = [
    ...membresias.map(m => m.fecha_inscripcion),
    ...postulaciones.map(p => p.fecha_envio),
  ].filter(Boolean).sort();

  return {
    clubes_distintos: clubes.size,
    membresias_activas: membresias.filter(m => m.estatus === 'activo').length,
    total_postulaciones: postulaciones.length,
    sesiones_registradas: totalSesiones,
    sesiones_asistidas: asistidas,
    porcentaje_asistencia: totalSesiones > 0 ? Math.round((asistidas / totalSesiones) * 100) : null,
    primer_registro: fechas[0] || null,
    ultimo_registro: fechas[fechas.length - 1] || null,
  };
}

router.get('/buscar', async (req, res) => {
  try {
    const termino = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (termino.length < MIN_BUSQUEDA) {
      return res.status(400).json({ error: `Escribe al menos ${MIN_BUSQUEDA} caracteres para buscar` });
    }

    const patron = `%${escaparLike(termino)}%`;
    const result = await pool.query(`
      SELECT u.id_usuario, u.nombre_completo, u.correo_institucional, u.institutional_id,
        (u.deleted_at IS NOT NULL) AS cuenta_desactivada,
        (SELECT f.matricula FROM formularios f
          WHERE f.id_alumno = u.id_usuario
          ORDER BY f.fecha_envio DESC LIMIT 1) AS matricula
      FROM usuarios u
      WHERE u.id_rol = $1
        AND (
          u.nombre_completo ILIKE $2
          OR u.correo_institucional ILIKE $2
          OR u.institutional_id ILIKE $2
          OR EXISTS (
            SELECT 1 FROM formularios f
            WHERE f.id_alumno = u.id_usuario AND f.matricula ILIKE $2
          )
        )
      ORDER BY u.nombre_completo
      LIMIT $3`,
      [ROL_ALUMNO, patron, MAX_RESULTADOS]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al buscar expedientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdEntero(id)) {
      return res.status(400).json({ error: 'id de alumno inválido' });
    }

    const perfilResult = await pool.query(`
      SELECT u.id_usuario, u.nombre_completo, u.correo_institucional, u.institutional_id,
        u.fecha_registro, u.last_login, (u.deleted_at IS NOT NULL) AS cuenta_desactivada,
        f.matricula, f.cuatrimestre, l.nombre AS licenciatura
      FROM usuarios u
      LEFT JOIN LATERAL (
        SELECT matricula, cuatrimestre, id_licenciatura
        FROM formularios
        WHERE id_alumno = u.id_usuario
        ORDER BY fecha_envio DESC
        LIMIT 1
      ) f ON TRUE
      LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
      WHERE u.id_usuario = $1 AND u.id_rol = $2`,
      [id, ROL_ALUMNO]
    );
    if (perfilResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const [membresias, postulaciones, asistencia, sesiones] = await Promise.all([
      pool.query(`
        SELECT i.id_inscripcion, i.id_club, c.nombre_club, ei.nombre_estatus AS estatus,
          i.fecha_inscripcion, i.fecha_baja
        FROM inscripciones i
        JOIN clubes c ON c.id_club = i.id_club
        JOIN cat_estatus_inscripciones ei ON ei.id_estatus_inscripcion = i.id_estatus_inscripcion
        WHERE i.id_usuario = $1
        ORDER BY i.fecha_inscripcion DESC`,
        [id]
      ),
      pool.query(`
        SELECT f.id_formulario, f.id_club, c.nombre_club, f.status, f.bloque_asignado,
          f.fecha_envio, f.fecha_respuesta, f.motivo_rechazo
        FROM formularios f
        JOIN clubes c ON c.id_club = f.id_club
        WHERE f.id_alumno = $1
        ORDER BY f.fecha_envio DESC`,
        [id]
      ),
      pool.query(`
        SELECT s.id_club, c.nombre_club,
          COUNT(*)::int AS sesiones_registradas,
          COUNT(*) FILTER (WHERE a.estado = 'presente')::int AS presentes,
          COUNT(*) FILTER (WHERE a.estado = 'justificado')::int AS justificadas,
          COUNT(*) FILTER (WHERE a.estado = 'ausente')::int AS ausentes,
          TO_CHAR(MIN(s.fecha), 'YYYY-MM-DD') AS primera_sesion,
          TO_CHAR(MAX(s.fecha), 'YYYY-MM-DD') AS ultima_sesion
        FROM asistencias a
        JOIN sesiones s ON s.id_sesion = a.id_sesion
        JOIN clubes c ON c.id_club = s.id_club
        WHERE a.id_usuario = $1 AND s.estado <> 'cancelada'
        GROUP BY s.id_club, c.nombre_club
        ORDER BY MAX(s.fecha) DESC`,
        [id]
      ),
      pool.query(`
        SELECT s.id_sesion, s.id_club, c.nombre_club, p.nombre AS periodo,
          TO_CHAR(s.fecha, 'YYYY-MM-DD') AS fecha, s.hora_inicio, s.hora_fin,
          a.estado, a.motivo_justificacion
        FROM asistencias a
        JOIN sesiones s ON s.id_sesion = a.id_sesion
        JOIN clubes c ON c.id_club = s.id_club
        JOIN periodos_actividad p ON p.id_periodo = s.id_periodo
        WHERE a.id_usuario = $1 AND s.estado <> 'cancelada'
        ORDER BY s.fecha DESC, s.hora_inicio DESC`,
        [id]
      ),
    ]);

    const datos = {
      membresias: membresias.rows,
      postulaciones: postulaciones.rows,
      asistencia: asistencia.rows,
    };

    res.json({
      alumno: perfilResult.rows[0],
      resumen: resumirTrayectoria(datos),
      membresias: datos.membresias,
      postulaciones: datos.postulaciones,
      asistencia_por_club: datos.asistencia,
      sesiones: sesiones.rows,
    });
  } catch (err) {
    console.error('Error al obtener expediente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
