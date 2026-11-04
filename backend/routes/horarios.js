import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';
import { validarPropuesta, limpiarDetalle, conflictosPropuesta } from '../lib/propuestasHorario.js';

const router = Router();
const CAMPOS = `s.*, s.vigencia_inicio::text AS vigencia_inicio, s.vigencia_fin::text AS vigencia_fin,
  c.nombre_club, u.nombre_completo AS solicitante_nombre`;
const SELECTOR = `SELECT ${CAMPOS} FROM solicitudes_horario s JOIN clubes c ON c.id_club = s.id_club
  JOIN usuarios u ON u.id_usuario = s.id_solicitante`;
function fallo(status, message, extra = {}) { return Object.assign(new Error(message), { status, extra }); }
function idValido(valor) { return /^\d+$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0; }
async function transaccion(res, trabajo) {
  let client;
  try { client = await pool.connect(); await client.query('BEGIN'); const resultado = await trabajo(client); await client.query('COMMIT'); res.json(resultado); }
  catch (err) { if (client) await client.query('ROLLBACK').catch(() => {}); if (!err.status) console.error('Error en propuesta de horario:', err); res.status(err.status || (err.code === '23505' ? 409 : 500)).json({ error: err.status ? err.message : err.code === '23505' ? 'Ya hay una propuesta activa para este club' : 'No se pudo completar la operación', ...err.extra }); }
  finally { client?.release(); }
}
async function presidente(client, req, idClub) {
  const result = await client.query('SELECT id_club, id_responsable_club, version_horario FROM clubes WHERE id_club = $1', [idClub]);
  if (!result.rows.length) throw fallo(404, 'Club no encontrado');
  if (req.user.id_rol !== 2 || Number(result.rows[0].id_responsable_club) !== Number(req.user.id)) throw fallo(403, 'Solo el presidente de este club puede preparar y enviar propuestas');
  return result.rows[0];
}
async function obtener(client, id) {
  const result = await client.query('SELECT *, vigencia_inicio::text AS vigencia_inicio, vigencia_fin::text AS vigencia_fin FROM solicitudes_horario WHERE id_solicitud = $1 FOR UPDATE', [id]);
  if (!result.rows.length) throw fallo(404, 'Propuesta no encontrada');
  return result.rows[0];
}
async function historial(client, req, s, accion, observaciones = null) {
  await client.query('INSERT INTO historial_solicitudes_horario (id_solicitud, id_actor, accion, observaciones) VALUES ($1,$2,$3,$4)', [s.id_solicitud, req.user.id, accion, observaciones]);
}
async function validarConflictos(client, s) {
  const error = validarPropuesta(s);
  if (error) throw fallo(400, error);
  const resultado = await conflictosPropuesta(client, s);
  if (resultado.error) throw fallo(resultado.conflictos.length ? 409 : 400, resultado.error, { conflictos: resultado.conflictos });
  return resultado;
}

// Las consultas públicas nunca exponen propuestas o borradores.
router.get('/club/:idClub', async (req, res) => {
  if (!idValido(req.params.idClub)) return res.status(400).json({ error: 'Club no válido' });
  try {
    const result = await pool.query(`SELECT id_horario, id_club, dia_semana, hora_inicio, hora_fin,
      lugar, ubicacion_maps, descripcion, id_espacio, vigencia_inicio::text AS vigencia_inicio, vigencia_fin::text AS vigencia_fin
      FROM horarios_club WHERE id_club = $1
      AND (vigencia_inicio IS NULL OR vigencia_inicio <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date)
      AND (vigencia_fin IS NULL OR vigencia_fin >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date)
      ORDER BY dia_semana, hora_inicio`, [req.params.idClub]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'No se pudieron cargar los horarios oficiales' }); }
});
router.use(authenticate);
router.get('/espacios', requireRole(2, 3, ROL_COORDINACION), async (_req, res) => {
  try { res.json((await pool.query('SELECT id_espacio, nombre FROM espacios_club ORDER BY nombre')).rows); }
  catch { res.status(500).json({ error: 'No se pudieron cargar los espacios' }); }
});
router.post('/espacios', requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  if (typeof req.body.nombre !== 'string' || !req.body.nombre.trim() || req.body.nombre.length > 200) return res.status(400).json({ error: 'Escribe un nombre de espacio de hasta 200 caracteres' });
  try { const result = await pool.query('INSERT INTO espacios_club(nombre) VALUES ($1) RETURNING id_espacio, nombre', [req.body.nombre.trim()]); res.status(201).json(result.rows[0]); }
  catch (err) { res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'Ya existe ese espacio en el catálogo' : 'No se pudo registrar el espacio' }); }
});
router.get('/solicitudes', requireRole(ROL_ADMIN, ROL_COORDINACION), async (_req, res) => {
  try { res.json((await pool.query(`${SELECTOR} ORDER BY CASE s.estado WHEN 'pendiente' THEN 0 ELSE 1 END, s.fecha_actualizacion DESC`)).rows); }
  catch { res.status(500).json({ error: 'No se pudieron cargar las propuestas' }); }
});
router.get('/solicitudes/club/:idClub', requireRole(2, 3, ROL_COORDINACION), async (req, res) => {
  if (!idValido(req.params.idClub)) return res.status(400).json({ error: 'Club no válido' });
  try {
    if (req.user.id_rol !== 3 && req.user.id_rol !== ROL_COORDINACION) await presidente(pool, req, req.params.idClub);
    const result = await pool.query(`${SELECTOR} WHERE s.id_club = $1 ORDER BY s.fecha_actualizacion DESC`, [req.params.idClub]);
    res.json(result.rows);
  } catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'No se pudieron cargar las propuestas' }); }
});
router.post('/solicitudes/club/:idClub', requireRole(2), async (req, res) => {
  if (!idValido(req.params.idClub)) return res.status(400).json({ error: 'Club no válido' });
  const error = validarPropuesta(req.body);
  if (error) return res.status(400).json({ error });
  await transaccion(res, async (client) => {
    const club = await presidente(client, req, req.params.idClub);
    const detalle = limpiarDetalle(req.body.detalle);
    const result = await client.query(`INSERT INTO solicitudes_horario
      (id_club, id_solicitante, version_base, detalle, vigencia_inicio, vigencia_fin)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *, vigencia_inicio::text AS vigencia_inicio, vigencia_fin::text AS vigencia_fin`,
    [club.id_club, req.user.id, club.version_horario, JSON.stringify(detalle), req.body.vigencia_inicio, req.body.vigencia_fin || null]);
    await historial(client, req, result.rows[0], 'creada'); return result.rows[0];
  });
});
router.use('/solicitudes/:id', (req, res, next) => idValido(req.params.id) ? next() : res.status(400).json({ error: 'Propuesta no válida' }));
router.put('/solicitudes/:id', requireRole(2), async (req, res) => {
  const error = validarPropuesta(req.body);
  if (error) return res.status(400).json({ error });
  await transaccion(res, async (client) => {
    const s = await obtener(client, req.params.id); const club = await presidente(client, req, s.id_club);
    if (!['borrador', 'rechazado'].includes(s.estado)) throw fallo(409, 'Retira la propuesta pendiente antes de editarla, o crea una nueva versión del horario aprobado');
    const result = await client.query(`UPDATE solicitudes_horario SET detalle = $1, vigencia_inicio = $2,
      vigencia_fin = $3, estado = 'borrador', version_base = $4, id_revisor = NULL, observaciones = NULL,
      fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_solicitud = $5 RETURNING *, vigencia_inicio::text AS vigencia_inicio, vigencia_fin::text AS vigencia_fin`,
    [JSON.stringify(limpiarDetalle(req.body.detalle)), req.body.vigencia_inicio, req.body.vigencia_fin || null, club.version_horario, s.id_solicitud]);
    await historial(client, req, s, 'editada'); return result.rows[0];
  });
});
router.post('/solicitudes/:id/enviar', requireRole(2), async (req, res) => {
  await transaccion(res, async (client) => {
    const s = await obtener(client, req.params.id); const club = await presidente(client, req, s.id_club);
    if (s.estado !== 'borrador') throw fallo(409, 'Solo se pueden enviar propuestas en borrador');
    if (s.version_base !== club.version_horario) throw fallo(409, 'Cambió el horario oficial. Guarda de nuevo la propuesta antes de enviarla');
    await validarConflictos(client, s);
    const result = await client.query(`UPDATE solicitudes_horario SET estado = 'pendiente', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_solicitud = $1 RETURNING *, vigencia_inicio::text AS vigencia_inicio, vigencia_fin::text AS vigencia_fin`, [s.id_solicitud]);
    await historial(client, req, s, 'enviada');
    await client.query(`INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
      SELECT $1, 'Horario pendiente de aprobación', 'Hay una propuesta de horario para revisar en Coordinación VIVE.', 'global', $2, id_usuario FROM usuarios WHERE id_rol = 3`, [req.user.id, s.id_club]);
    return result.rows[0];
  });
});
router.post('/solicitudes/:id/retirar', requireRole(2), async (req, res) => {
  await transaccion(res, async (client) => {
    const s = await obtener(client, req.params.id); await presidente(client, req, s.id_club);
    if (s.estado !== 'pendiente') throw fallo(409, 'Solo se puede retirar una propuesta pendiente');
    const result = await client.query(`UPDATE solicitudes_horario SET estado = 'borrador', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_solicitud = $1 RETURNING *`, [s.id_solicitud]);
    await historial(client, req, s, 'retirada'); return result.rows[0];
  });
});
router.post('/solicitudes/:id/revision', requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const { accion, observaciones } = req.body;
  if (!['aprobar', 'rechazar'].includes(accion) || (observaciones != null && (typeof observaciones !== 'string' || observaciones.length > 2000)) || (accion === 'rechazar' && !observaciones?.trim())) return res.status(400).json({ error: 'Selecciona una acción e incluye observaciones para rechazar' });
  await transaccion(res, async (client) => {
    // Serializa la reserva de espacios; dos aprobaciones no pueden superar a la vez la validación.
    await client.query('LOCK TABLE horarios_club IN SHARE ROW EXCLUSIVE MODE');
    const s = await obtener(client, req.params.id);
    if (s.estado !== 'pendiente') throw fallo(409, 'Esta propuesta ya fue revisada o retirada');
    if (accion === 'aprobar') {
      const club = await client.query('SELECT version_horario FROM clubes WHERE id_club = $1 FOR UPDATE', [s.id_club]);
      if (club.rows[0].version_horario !== s.version_base) throw fallo(409, 'La propuesta se basa en una versión anterior del horario');
      const { espacios } = await validarConflictos(client, s);
      await client.query('DELETE FROM horarios_club WHERE id_club = $1 AND vigencia_inicio >= $2::date', [s.id_club, s.vigencia_inicio]);
      await client.query(`UPDATE horarios_club SET vigencia_fin = LEAST(COALESCE(vigencia_fin, 'infinity'::date), $2::date - 1)
        WHERE id_club = $1 AND (vigencia_inicio IS NULL OR vigencia_inicio < $2::date)
        AND (vigencia_fin IS NULL OR vigencia_fin >= $2::date)`, [s.id_club, s.vigencia_inicio]);
      for (const h of s.detalle) {
        const espacio = espacios.find((e) => e.id_espacio === h.id_espacio);
        await client.query(`INSERT INTO horarios_club (id_club, dia_semana, hora_inicio, hora_fin, lugar, id_espacio, descripcion, vigencia_inicio, vigencia_fin, ubicacion_maps)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [s.id_club, h.dia_semana, h.hora_inicio, h.hora_fin, espacio.nombre, h.id_espacio, h.descripcion, s.vigencia_inicio, s.vigencia_fin, h.ubicacion_maps || '']);
      }
      await client.query('UPDATE clubes SET version_horario = version_horario + 1 WHERE id_club = $1', [s.id_club]);
    }
    const estado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
    const result = await client.query(`UPDATE solicitudes_horario SET estado = $1, id_revisor = $2, observaciones = $3,
      fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_solicitud = $4 RETURNING *`, [estado, req.user.id, observaciones?.trim() || null, s.id_solicitud]);
    await historial(client, req, s, estado, observaciones?.trim());
    await client.query(`INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
      SELECT $1, $2, $3, 'presidentes', id_club, id_responsable_club FROM clubes WHERE id_club = $4 AND id_responsable_club IS NOT NULL`,
    [req.user.id, `Horario ${estado}`, observaciones?.trim() || 'Coordinación VIVE aprobó el horario. Ya es visible para la comunidad.', s.id_club]);
    return result.rows[0];
  });
});
// Las antiguas escrituras directas no pueden saltarse la aprobación.
for (const [metodo, ruta] of [['post', '/club/:idClub'], ['put', '/:id'], ['delete', '/:id']]) {
  router[metodo](ruta, requireRole(2, 3), (_req, res) => res.status(409).json({ error: 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE' }));
}
export default router;
