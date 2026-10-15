import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireClubPresident, requirePresidenteDeLaSesion, requireCoordinacion } from '../middleware/auth.js';
import {
  getFechaInstitucional,
  aFechaISO,
  esMismaFechaInstitucional,
  esFechaPasadaInstitucional,
} from '../config/timezone.js';

const router = Router();

// Umbrales referenciales de participación (PBI-05 §29 — categorías
// alta/moderada/baja; los valores definitivos son de criterio institucional,
// 90/70 es la referencia acordada para V1 y coincide con colorPorcentaje del frontend).
const UMBRAL_BAJA_ASISTENCIA = 70;
const UMBRAL_ALTA_ASISTENCIA = 90;

function categoriaDePorcentaje(porcentaje) {
  if (porcentaje === null) return null;
  if (porcentaje >= UMBRAL_ALTA_ASISTENCIA) return 'alta';
  if (porcentaje >= UMBRAL_BAJA_ASISTENCIA) return 'moderada';
  return 'baja';
}

const ESTADOS_ASISTENCIA = ['presente', 'ausente', 'justificado'];

// Estados efectivos calculados en lectura (PBI-05 §17–§19):
// 'no_registrada' y 'no_completada' no se almacenan; se derivan de la fecha.
function estadoEfectivo(sesion) {
  if (sesion.estado === 'pendiente' && esFechaPasadaInstitucional(sesion.fecha)) {
    return 'no_registrada';
  }
  if (sesion.estado === 'en_progreso' && esFechaPasadaInstitucional(sesion.fecha)) {
    return 'no_completada';
  }
  return sesion.estado;
}

// Lista de integrantes de una sesión desde su snapshot histórico,
// con el estado de asistencia actual (si existe registro).
async function integrantesDeSesion(idSesion) {
  const result = await pool.query(
    `SELECT integrante->>'id_usuario' AS id_usuario,
            integrante->>'nombre_completo' AS nombre_completo,
            integrante->>'matricula' AS matricula,
            integrante->>'licenciatura' AS licenciatura,
            a.estado AS estado_asistencia,
            a.motivo_justificacion
     FROM sesiones s
     CROSS JOIN LATERAL jsonb_array_elements(s.integrantes_snapshot) AS integrante
     LEFT JOIN asistencias a
       ON a.id_sesion = s.id_sesion
      AND a.id_usuario = (integrante->>'id_usuario')::int
     WHERE s.id_sesion = $1
     ORDER BY integrante->>'nombre_completo'`,
    [idSesion]
  );
  return result.rows.map((r) => ({
    id_usuario: parseInt(r.id_usuario, 10),
    nombre_completo: r.nombre_completo,
    matricula: r.matricula,
    licenciatura: r.licenciatura,
    estado_asistencia: r.estado_asistencia || null,
    motivo_justificacion: r.motivo_justificacion || null,
  }));
}

// Requiere que la sesión corresponda a la fecha institucional de hoy
function exigirMismoDiaInstitucional(sesion) {
  if (!esMismaFechaInstitucional(sesion.fecha)) {
    return 'Solo se puede modificar la asistencia el día correspondiente a la sesión';
  }
  return null;
}

// Payload de detalle de sesión (compartido por presidente y Coordinación §27).
async function construirDetalleSesion(sesion) {
  const integrantes = await integrantesDeSesion(sesion.id_sesion);
  return {
    id_sesion: sesion.id_sesion,
    id_club: sesion.id_club,
    id_periodo: sesion.id_periodo,
    fecha: aFechaISO(sesion.fecha),
    hora_inicio: sesion.hora_inicio,
    hora_fin: sesion.hora_fin,
    lugar: sesion.lugar,
    estado: estadoEfectivo(sesion),
    estado_almacenado: sesion.estado,
    iniciada_en: sesion.iniciada_en,
    finalizada_en: sesion.finalizada_en,
    cancelada_en: sesion.cancelada_en,
    motivo_cancelacion: sesion.motivo_cancelacion,
    observacion_cancelacion: sesion.observacion_cancelacion,
    total_integrantes: integrantes.length,
    registradas: integrantes.filter((i) => i.estado_asistencia !== null).length,
    integrantes,
  };
}

// Historial de un club (compartido presidente / Coordinación).
async function obtenerHistorial(idClub, { estado, id_periodo, limit } = {}) {
  const limitFinal = Math.min(parseInt(limit, 10) || 50, 200);

  let sql = `
    SELECT s.id_sesion, s.fecha, s.hora_inicio, s.hora_fin, s.lugar,
           s.estado, s.iniciada_en, s.finalizada_en,
           s.cancelada_en, s.motivo_cancelacion, s.observacion_cancelacion,
           jsonb_array_length(s.integrantes_snapshot) AS total_integrantes,
           (SELECT COUNT(*) FROM asistencias a WHERE a.id_sesion = s.id_sesion) AS registradas
    FROM sesiones s
    WHERE s.id_club = $1`;
  const params = [idClub];
  let idx = 2;

  if (id_periodo) {
    sql += ` AND s.id_periodo = $${idx++}`;
    params.push(parseInt(id_periodo, 10));
  } else {
    const periodo = await obtenerPeriodoActivo();
    if (periodo) {
      sql += ` AND s.id_periodo = $${idx++}`;
      params.push(periodo);
    }
  }

  sql += ' ORDER BY s.fecha DESC, s.hora_inicio DESC LIMIT $' + idx;
  params.push(limitFinal);

  const result = await pool.query(sql, params);

  let filas = result.rows.map((s) => ({
    ...s,
    fecha: aFechaISO(s.fecha),
    estado: estadoEfectivo(s),
  }));

  if (estado) {
    filas = filas.filter((s) => s.estado === estado);
  }

  return filas;
}

// Estadísticas de un club por periodo (compartido presidente / Coordinación §25–§29).
async function calcularEstadisticasClub(idClub, idPeriodo) {
  const periodo = await pool.query(
    'SELECT id_periodo, nombre, fecha_inicio, fecha_fin FROM periodos_actividad WHERE id_periodo = $1',
    [idPeriodo]
  );

  const sesiones = await pool.query(
    `SELECT id_sesion, estado, fecha
     FROM sesiones
     WHERE id_club = $1 AND id_periodo = $2`,
    [idClub, idPeriodo]
  );

  const porEstado = { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0, no_registrada: 0, no_completada: 0 };
  for (const s of sesiones.rows) {
    porEstado[estadoEfectivo(s)] = (porEstado[estadoEfectivo(s)] || 0) + 1;
  }

  // Estadísticas por integrante desde sesiones COMPLETADAS (snapshot por sesión)
  const registros = await pool.query(
    `SELECT s.id_sesion, s.fecha, a.id_usuario, a.estado
     FROM sesiones s
     JOIN asistencias a ON a.id_sesion = s.id_sesion
     WHERE s.id_club = $1 AND s.id_periodo = $2 AND s.estado = 'completada'
     ORDER BY s.fecha ASC`,
    [idClub, idPeriodo]
  );

  // Mapear id_usuario -> nombre desde los snapshots de las sesiones del periodo
  const nombres = await pool.query(
    `SELECT DISTINCT ON (integrante->>'id_usuario')
            (integrante->>'id_usuario')::int AS id_usuario,
            integrante->>'nombre_completo' AS nombre_completo
     FROM sesiones s
     CROSS JOIN LATERAL jsonb_array_elements(s.integrantes_snapshot) AS integrante
     WHERE s.id_club = $1 AND s.id_periodo = $2
     ORDER BY integrante->>'id_usuario', s.fecha DESC`,
    [idClub, idPeriodo]
  );
  const mapaNombres = new Map(nombres.rows.map((n) => [n.id_usuario, n.nombre_completo]));

  const stats = new Map();
  const ultimosRegistros = new Map(); // id_usuario -> [{fecha, estado}] ordenado desc
  for (const r of registros.rows) {
    if (!stats.has(r.id_usuario)) {
      stats.set(r.id_usuario, { presentes: 0, ausentes: 0, justificadas: 0 });
      ultimosRegistros.set(r.id_usuario, []);
    }
    const s = stats.get(r.id_usuario);
    if (r.estado === 'presente') s.presentes++;
    else if (r.estado === 'ausente') s.ausentes++;
    else if (r.estado === 'justificado') s.justificadas++;
    ultimosRegistros.get(r.id_usuario).push({ fecha: aFechaISO(r.fecha), estado: r.estado });
  }

  const integrantes = [];
  let sumaPorcentajes = 0;
  let conDatos = 0;
  let bajaAsistencia = 0;
  let ausenciasConsecutivas3Mas = 0;

  for (const [idUsuario, s] of stats.entries()) {
    const denominador = s.presentes + s.ausentes; // justificadas fuera del denominador (§25)
    const porcentaje = denominador > 0 ? Math.round((s.presentes / denominador) * 1000) / 10 : null;

    // Ausencias consecutivas desde la sesión más reciente
    const cronologia = ultimosRegistros.get(idUsuario).slice().reverse(); // desc
    let consecutivas = 0;
    for (const reg of cronologia) {
      if (reg.estado === 'ausente') consecutivas++;
      else break;
    }

    if (porcentaje !== null) {
      sumaPorcentajes += porcentaje;
      conDatos++;
      if (porcentaje < UMBRAL_BAJA_ASISTENCIA) bajaAsistencia++;
    }
    if (consecutivas >= 3) ausenciasConsecutivas3Mas++;

    integrantes.push({
      id_usuario: idUsuario,
      nombre_completo: mapaNombres.get(idUsuario) || `Usuario ${idUsuario}`,
      presentes: s.presentes,
      ausentes: s.ausentes,
      justificadas: s.justificadas,
      porcentaje,
      categoria: categoriaDePorcentaje(porcentaje),
      ausencias_consecutivas: consecutivas,
    });
  }

  integrantes.sort((a, b) => (a.porcentaje ?? -1) - (b.porcentaje ?? -1));

  const totales = {
    presentes: [...stats.values()].reduce((acc, s) => acc + s.presentes, 0),
    ausentes: [...stats.values()].reduce((acc, s) => acc + s.ausentes, 0),
    justificadas: [...stats.values()].reduce((acc, s) => acc + s.justificadas, 0),
  };

  return {
    periodo: periodo.rows[0] || null,
    sesiones: {
      total: sesiones.rows.length,
      ...porEstado,
    },
    asistencia_promedio: conDatos > 0 ? Math.round((sumaPorcentajes / conDatos) * 10) / 10 : null,
    totales,
    indicadores: {
      umbral_baja_asistencia: UMBRAL_BAJA_ASISTENCIA,
      umbral_alta_asistencia: UMBRAL_ALTA_ASISTENCIA,
      integrantes_con_baja_asistencia: bajaAsistencia,
      integrantes_con_3_o_mas_ausencias_consecutivas: ausenciasConsecutivas3Mas,
      sesiones_no_registradas: porEstado.no_registrada || 0,
    },
    integrantes,
  };
}

// Estadísticas individuales (compartido presidente / Coordinación).
async function calcularEstadisticasIntegrante(idClub, idPeriodo, idUsuario) {
  const registros = await pool.query(
    `SELECT s.fecha, a.estado
     FROM sesiones s
     JOIN asistencias a ON a.id_sesion = s.id_sesion AND a.id_usuario = $3
     WHERE s.id_club = $1 AND s.id_periodo = $2 AND s.estado = 'completada'
     ORDER BY s.fecha DESC`,
    [idClub, idPeriodo, idUsuario]
  );

  let presentes = 0;
  let ausentes = 0;
  let justificadas = 0;
  let ausenciasConsecutivas = 0;
  let contandoAusencias = true;

  for (const r of registros.rows) {
    if (r.estado === 'presente') presentes++;
    else if (r.estado === 'ausente') ausentes++;
    else if (r.estado === 'justificado') justificadas++;

    if (contandoAusencias && r.estado === 'ausente') ausenciasConsecutivas++;
    else contandoAusencias = false;
  }

  const denominador = presentes + ausentes;
  const porcentaje = denominador > 0 ? Math.round((presentes / denominador) * 1000) / 10 : null;

  return {
    id_usuario: idUsuario,
    id_periodo: idPeriodo,
    presentes,
    ausentes,
    justificadas,
    porcentaje,
    ausencias_consecutivas: ausenciasConsecutivas,
    sesiones_completadas: registros.rows.length,
  };
}

// GET /api/asistencia/periodo/activo — periodo de actividad vigente
router.get('/periodo/activo', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_periodo, nombre, fecha_inicio, fecha_fin, activo FROM periodos_actividad WHERE activo = TRUE LIMIT 1'
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error al obtener periodo activo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/sesiones/hoy — sesiones de hoy del club del presidente.
// La generación de sesiones es automática e idempotente (on-demand).
router.get('/sesiones/hoy', authenticate, requireClubPresident, async (req, res) => {
  try {
    const idClub = req.idClub;
    const idPeriodoActivo = await obtenerPeriodoActivo();
    if (!idPeriodoActivo) {
      return res.status(400).json({
        error: 'No hay un periodo de actividad activo. Configura el periodo institucional antes de usar Asistencia.',
      });
    }

    // Generación transparente e idempotente (el usuario nunca la invoca)
    await pool.query('SELECT generar_sesiones_periodo_club($1, $2)', [idPeriodoActivo, idClub]);

    const hoy = getFechaInstitucional();
    const result = await pool.query(
      `SELECT s.id_sesion, s.id_club, s.id_horario, s.fecha, s.hora_inicio, s.hora_fin,
              s.lugar, s.estado, s.iniciada_en, s.finalizada_en,
              s.cancelada_en, s.motivo_cancelacion,
              jsonb_array_length(s.integrantes_snapshot) AS total_integrantes,
              (SELECT COUNT(*) FROM asistencias a WHERE a.id_sesion = s.id_sesion) AS registradas
       FROM sesiones s
       WHERE s.id_club = $1 AND s.fecha = $2::date
       ORDER BY s.hora_inicio ASC`,
      [idClub, hoy]
    );

    res.json(
      result.rows.map((s) => ({
        ...s,
        fecha: aFechaISO(s.fecha),
        estado: estadoEfectivo(s),
      }))
    );
  } catch (err) {
    console.error('Error al obtener sesiones de hoy:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/sesiones/:id — detalle de sesión + integrantes (snapshot)
router.get('/sesiones/:id', authenticate, requirePresidenteDeLaSesion, async (req, res) => {
  try {
    res.json(await construirDetalleSesion(req.sesion));
  } catch (err) {
    console.error('Error al obtener sesión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/asistencia/sesiones/:id/iniciar — inicio explícito de la toma (PBI-05 §10)
router.post('/sesiones/:id/iniciar', authenticate, requirePresidenteDeLaSesion, async (req, res) => {
  try {
    const sesion = req.sesion;

    const errorDia = exigirMismoDiaInstitucional(sesion);
    if (errorDia) return res.status(403).json({ error: errorDia });

    if (sesion.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Esta sesión ya fue iniciada o no admite inicio' });
    }

    const result = await pool.query(
      `UPDATE sesiones
       SET estado = 'en_progreso', iniciada_en = NOW()
       WHERE id_sesion = $1 AND estado = 'pendiente'
       RETURNING id_sesion, estado, iniciada_en`,
      [sesion.id_sesion]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al iniciar asistencia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/asistencia/sesiones/:id/registros — upsert en lote de asistencias.
// Autoguardado: el presidente registra y el backend persiste inmediatamente.
router.put('/sesiones/:id/registros', authenticate, requirePresidenteDeLaSesion, async (req, res) => {
  const client = await pool.connect();
  try {
    const sesion = req.sesion;
    const { registros } = req.body;

    const errorDia = exigirMismoDiaInstitucional(sesion);
    if (errorDia) return res.status(403).json({ error: errorDia });

    if (!['en_progreso', 'completada'].includes(sesion.estado)) {
      return res.status(400).json({
        error: 'La sesión debe estar "En progreso" para registrar asistencia. Usa "Iniciar asistencia" primero.',
      });
    }

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un registro de asistencia' });
    }

    // Integrantes válidos = snapshot de la sesión (composición histórica)
    const snapshot = await pool.query(
      'SELECT integrantes_snapshot FROM sesiones WHERE id_sesion = $1',
      [sesion.id_sesion]
    );
    const idsValidos = new Set(
      snapshot.rows[0].integrantes_snapshot.map((i) => i.id_usuario)
    );

    for (const r of registros) {
      if (!Number.isInteger(r.id_usuario) || !idsValidos.has(r.id_usuario)) {
        return res.status(400).json({
          error: `El usuario ${r.id_usuario} no forma parte de la lista de esta sesión`,
        });
      }
      if (!ESTADOS_ASISTENCIA.includes(r.estado)) {
        return res.status(400).json({
          error: `Estado inválido "${r.estado}". Debe ser: ${ESTADOS_ASISTENCIA.join(', ')}`,
        });
      }
      if (r.estado === 'justificado' && (!r.motivo_justificacion || !String(r.motivo_justificacion).trim())) {
        return res.status(400).json({
          error: 'El estado "Justificado" requiere un motivo',
        });
      }
    }

    await client.query('BEGIN');
    for (const r of registros) {
      await client.query(
        `INSERT INTO asistencias (id_sesion, id_usuario, estado, motivo_justificacion)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id_sesion, id_usuario) DO UPDATE SET
           estado = EXCLUDED.estado,
           motivo_justificacion = EXCLUDED.motivo_justificacion,
           actualizada_en = NOW()`,
        [sesion.id_sesion, r.id_usuario, r.estado, r.motivo_justificacion || null]
      );
    }
    await client.query('COMMIT');

    const integrantes = await integrantesDeSesion(sesion.id_sesion);
    res.json({
      registradas: integrantes.filter((i) => i.estado_asistencia !== null).length,
      total_integrantes: integrantes.length,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar asistencias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// POST /api/asistencia/sesiones/:id/finalizar — solo con todos los integrantes registrados
router.post('/sesiones/:id/finalizar', authenticate, requirePresidenteDeLaSesion, async (req, res) => {
  try {
    const sesion = req.sesion;

    const errorDia = exigirMismoDiaInstitucional(sesion);
    if (errorDia) return res.status(403).json({ error: errorDia });

    if (sesion.estado !== 'en_progreso') {
      return res.status(400).json({ error: 'Solo se puede finalizar una sesión "En progreso"' });
    }

    const integrantes = await integrantesDeSesion(sesion.id_sesion);
    const pendientes = integrantes.filter((i) => i.estado_asistencia === null);

    if (pendientes.length > 0) {
      return res.status(400).json({
        error: `No se puede finalizar: ${pendientes.length} integrante(s) sin registrar`,
        pendientes: pendientes.length,
        registradas: integrantes.length - pendientes.length,
        total_integrantes: integrantes.length,
      });
    }

    const result = await pool.query(
      `UPDATE sesiones
       SET estado = 'completada', finalizada_en = NOW()
       WHERE id_sesion = $1 AND estado = 'en_progreso'
       RETURNING id_sesion, estado, finalizada_en`,
      [sesion.id_sesion]
    );

    const resumen = {
      presentes: integrantes.filter((i) => i.estado_asistencia === 'presente').length,
      ausentes: integrantes.filter((i) => i.estado_asistencia === 'ausente').length,
      justificadas: integrantes.filter((i) => i.estado_asistencia === 'justificado').length,
    };

    res.json({ ...result.rows[0], resumen });
  } catch (err) {
    console.error('Error al finalizar asistencia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/asistencia/sesiones/:id/cancelar — cancelación con motivo (PBI-05 §20–§22)
// Permitida: sesión de hoy o próxima sesión futura, sin registros de asistencia.
router.put('/sesiones/:id/cancelar', authenticate, requirePresidenteDeLaSesion, async (req, res) => {
  try {
    const sesion = req.sesion;
    const { motivo, observacion } = req.body;

    if (esFechaPasadaInstitucional(sesion.fecha)) {
      return res.status(403).json({ error: 'No se pueden cancelar sesiones de días anteriores' });
    }

    if (sesion.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se puede cancelar una sesión pendiente' });
    }

    const conRegistros = await pool.query(
      'SELECT COUNT(*)::int AS total FROM asistencias WHERE id_sesion = $1',
      [sesion.id_sesion]
    );
    if (conRegistros.rows[0].total > 0) {
      return res.status(400).json({
        error: 'La sesión ya contiene registros de asistencia y no puede cancelarse',
      });
    }

    const catalogo = await pool.query(
      'SELECT codigo FROM cat_motivos_cancelacion WHERE codigo = $1',
      [motivo]
    );
    if (catalogo.rows.length === 0) {
      return res.status(400).json({ error: 'Motivo de cancelación inválido' });
    }
    if (motivo === 'otro' && (!observacion || !String(observacion).trim())) {
      return res.status(400).json({ error: 'El motivo "Otro" requiere describir el motivo en observación' });
    }

    const result = await pool.query(
      `UPDATE sesiones
       SET estado = 'cancelada',
           cancelada_en = NOW(),
           motivo_cancelacion = $1,
           observacion_cancelacion = $2,
           cancelada_por = $3
       WHERE id_sesion = $4 AND estado = 'pendiente'
       RETURNING id_sesion, estado, cancelada_en, motivo_cancelacion, observacion_cancelacion`,
      [motivo, observacion || null, req.user.id, sesion.id_sesion]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al cancelar sesión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/historial — sesiones pasadas del club del presidente
router.get('/historial', authenticate, requireClubPresident, async (req, res) => {
  try {
    res.json(await obtenerHistorial(req.idClub, req.query));
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/estadisticas/club — estadísticas del club (PBI-05 §25–§29)
router.get('/estadisticas/club', authenticate, requireClubPresident, async (req, res) => {
  try {
    const idPeriodo = req.query.id_periodo
      ? parseInt(req.query.id_periodo, 10)
      : await obtenerPeriodoActivo();

    if (!idPeriodo) {
      return res.status(400).json({ error: 'No hay un periodo de actividad activo' });
    }

    res.json(await calcularEstadisticasClub(req.idClub, idPeriodo));
  } catch (err) {
    console.error('Error al obtener estadísticas del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/estadisticas/integrante/:userId — estadísticas individuales
router.get('/estadisticas/integrante/:userId', authenticate, requireClubPresident, async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.userId, 10);
    if (!Number.isInteger(idUsuario)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const idPeriodo = req.query.id_periodo
      ? parseInt(req.query.id_periodo, 10)
      : await obtenerPeriodoActivo();

    if (!idPeriodo) {
      return res.status(400).json({ error: 'No hay un periodo de actividad activo' });
    }

    res.json(await calcularEstadisticasIntegrante(req.idClub, idPeriodo, idUsuario));
  } catch (err) {
    console.error('Error al obtener estadísticas del integrante:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/periodos — catálogo de periodos de actividad (selector de cuatrimestre §5)
router.get('/periodos', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_periodo, nombre, fecha_inicio, fecha_fin, activo FROM periodos_actividad ORDER BY fecha_inicio DESC, id_periodo DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener periodos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// Coordinación (PBI-05 §27–§28): lectura de historial y
// estadísticas de cualquier club para admin/rectoría.
// ============================================================

// Valida :clubId y lo deja en req.idClub; responde 404 si no existe.
async function exigirClubParametro(req, res) {
  const idClub = parseInt(req.params.clubId, 10);
  if (!Number.isInteger(idClub)) {
    res.status(400).json({ error: 'ID de club inválido' });
    return null;
  }
  const club = await pool.query('SELECT id_club FROM clubes WHERE id_club = $1', [idClub]);
  if (club.rows.length === 0) {
    res.status(404).json({ error: 'Club no encontrado' });
    return null;
  }
  req.idClub = idClub;
  return idClub;
}

// GET /api/asistencia/coordinacion/clubes/:clubId/historial
router.get('/coordinacion/clubes/:clubId/historial', authenticate, requireCoordinacion, async (req, res) => {
  try {
    const idClub = await exigirClubParametro(req, res);
    if (!idClub) return;
    res.json(await obtenerHistorial(idClub, req.query));
  } catch (err) {
    console.error('Error en historial de coordinación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/coordinacion/clubes/:clubId/sesiones/:id
router.get('/coordinacion/clubes/:clubId/sesiones/:id', authenticate, requireCoordinacion, async (req, res) => {
  try {
    const idClub = await exigirClubParametro(req, res);
    if (!idClub) return;

    const idSesion = parseInt(req.params.id, 10);
    if (!Number.isInteger(idSesion)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }

    const sesion = await pool.query(
      'SELECT * FROM sesiones WHERE id_sesion = $1 AND id_club = $2',
      [idSesion, idClub]
    );
    if (sesion.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada en este club' });
    }

    res.json(await construirDetalleSesion(sesion.rows[0]));
  } catch (err) {
    console.error('Error en detalle de coordinación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/coordinacion/clubes/:clubId/estadisticas
router.get('/coordinacion/clubes/:clubId/estadisticas', authenticate, requireCoordinacion, async (req, res) => {
  try {
    const idClub = await exigirClubParametro(req, res);
    if (!idClub) return;

    const idPeriodo = req.query.id_periodo
      ? parseInt(req.query.id_periodo, 10)
      : await obtenerPeriodoActivo();

    if (!idPeriodo) {
      return res.status(400).json({ error: 'No hay un periodo de actividad activo' });
    }

    res.json(await calcularEstadisticasClub(idClub, idPeriodo));
  } catch (err) {
    console.error('Error en estadísticas de coordinación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/coordinacion/clubes/:clubId/estadisticas/integrante/:userId
router.get('/coordinacion/clubes/:clubId/estadisticas/integrante/:userId', authenticate, requireCoordinacion, async (req, res) => {
  try {
    const idClub = await exigirClubParametro(req, res);
    if (!idClub) return;

    const idUsuario = parseInt(req.params.userId, 10);
    if (!Number.isInteger(idUsuario)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const idPeriodo = req.query.id_periodo
      ? parseInt(req.query.id_periodo, 10)
      : await obtenerPeriodoActivo();

    if (!idPeriodo) {
      return res.status(400).json({ error: 'No hay un periodo de actividad activo' });
    }

    res.json(await calcularEstadisticasIntegrante(idClub, idPeriodo, idUsuario));
  } catch (err) {
    console.error('Error en estadísticas de integrante (coordinación):', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function obtenerPeriodoActivo() {
  const result = await pool.query(
    'SELECT id_periodo FROM periodos_actividad WHERE activo = TRUE LIMIT 1'
  );
  return result.rows[0]?.id_periodo || null;
}

export default router;
