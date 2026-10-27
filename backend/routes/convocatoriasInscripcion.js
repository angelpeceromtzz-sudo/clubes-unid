import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, requireClubReader } from '../middleware/auth.js';
import { vencerInscripciones, MENSAJE_VENCIMIENTO } from '../lib/vencimientoConvocatorias.js';
import { clubEstaActivo, MENSAJE_CLUB_NO_ACTIVO } from '../lib/estadoClub.js';

const router = Router({ mergeParams: true });
const fallo = (status, message) => Object.assign(new Error(message), { status });

async function configuracion(client, id) {
  await vencerInscripciones(client, id);
  const actual = await client.query(
    `SELECT id_estatus_club, estado_calculado, max_postulaciones, postulaciones_actuales,
            fecha_apertura_programada, fecha_limite_cierre, formularios_recibidos,
            id_convocatoria_inscripcion_actual
     FROM clubes_con_estado WHERE id_club = $1`,
    [id],
  );
  if (!actual.rows.length) throw fallo(404, 'Club no encontrado');
  const solicitud = await client.query('SELECT * FROM solicitudes_convocatoria WHERE id_club = $1 ORDER BY id_solicitud DESC LIMIT 1', [id]);
  return { ...actual.rows[0], solicitud: solicitud.rows[0] || null };
}
function transaccion(handler) {
  return async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(req, client, res);
      await client.query('COMMIT');
      res.json(result);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (!err.status) console.error('Error en revisión de convocatoria:', err);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'No se pudo procesar la convocatoria' });
    } finally { client.release(); }
  };
}
async function notificar(client, emisor, club, titulo, mensaje, destinatario) {
  await client.query("INSERT INTO notificaciones(id_emisor,titulo,mensaje,audiencia,id_club,id_destinatario) VALUES ($1,$2,$3,'global',$4,$5)", [emisor, titulo, mensaje, club, destinatario]);
}
async function registrar(client, req, accion, detalles) {
  await client.query('INSERT INTO actividad_clubes(tipo_evento,id_club,id_actor,descripcion,detalles) VALUES ($1,$2,$3,$4,$5)',
    [accion, req.params.id, req.user.id, 'Revisión de convocatoria de inscripción', JSON.stringify(detalles)]);
}

router.get('/', authenticate, requireClubReader, async (req, res) => {
  try { res.json(await configuracion(pool, req.params.id)); }
  catch (err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'No se pudo cargar la convocatoria' }); }
});

// La propuesta se guarda aparte: nunca modifica las inscripciones publicadas.
router.put('/', authenticate, requireRole(2), transaccion(async (req, client) => {
  const club = (await client.query('SELECT * FROM clubes WHERE id_club = $1 FOR UPDATE', [req.params.id])).rows[0];
  if (!club) throw fallo(404, 'Club no encontrado');
  if (!clubEstaActivo(club)) throw fallo(409, MENSAJE_CLUB_NO_ACTIVO);
  if (club.id_presidente !== req.user.id) throw fallo(403, 'Solo el presidente de este club puede proponer la convocatoria');
  await vencerInscripciones(client, req.params.id);
  const pendiente = await client.query("SELECT id_solicitud FROM solicitudes_convocatoria WHERE id_club = $1 AND estado = 'pendiente'", [req.params.id]);
  if (pendiente.rows.length) throw fallo(409, 'Ya hay una convocatoria pendiente de revisión');
  const campos = ['fecha_apertura_programada', 'fecha_limite_cierre', 'max_postulaciones'];
  if (!campos.some((campo) => req.body[campo] !== undefined)) throw fallo(400, 'No se enviaron datos de convocatoria');
  const datos = Object.fromEntries(campos.map((campo) => [campo, req.body[campo] === undefined ? club[campo] : req.body[campo]]));
  for (const campo of campos.slice(0, 2)) {
    if (datos[campo] != null && (datos[campo] === '' || Number.isNaN(new Date(datos[campo]).getTime()) || (typeof datos[campo] !== 'string' && !(datos[campo] instanceof Date)))) throw fallo(400, 'Las fechas de convocatoria no son válidas');
  }
  if (datos.fecha_apertura_programada && datos.fecha_limite_cierre && new Date(datos.fecha_limite_cierre) <= new Date(datos.fecha_apertura_programada)) throw fallo(400, 'El cierre debe ser posterior a la apertura');
  if (datos.fecha_limite_cierre && new Date(datos.fecha_limite_cierre) <= new Date()) throw fallo(400, 'La fecha de cierre debe ser futura para enviar la propuesta a revisión');
  if (datos.max_postulaciones != null && (!Number.isInteger(datos.max_postulaciones) || datos.max_postulaciones < 1 || datos.max_postulaciones > 2147483647)) throw fallo(400, 'El límite de postulaciones debe ser un entero positivo');
  const s = (await client.query('INSERT INTO solicitudes_convocatoria(id_club,id_solicitante,configuracion) VALUES ($1,$2,$3) RETURNING *',
    [req.params.id, req.user.id, JSON.stringify(datos)])).rows[0];
  const admins = await client.query('SELECT id_usuario FROM usuarios WHERE id_rol = 3');
  for (const admin of admins.rows) await notificar(client, req.user.id, club.id_club, 'Convocatoria por revisar', club.nombre_club + ': el presidente solicitó aprobación de su convocatoria.', admin.id_usuario);
  await registrar(client, req, 'convocatoria_solicitada', { id_solicitud: s.id_solicitud, configuracion: datos });
  return configuracion(client, req.params.id);
}));

router.post('/revision', authenticate, requireRole(3), transaccion(async (req, client, res) => {
  const { accion, id_solicitud } = req.body;
  const observaciones = typeof req.body.observaciones === 'string' ? req.body.observaciones.trim() : '';
  if (!['aprobar', 'rechazar'].includes(accion) || !Number.isInteger(id_solicitud)) throw fallo(400, 'Selecciona la solicitud y una decisión válida');
  if (observaciones.length > 2000 || (accion === 'rechazar' && !observaciones)) throw fallo(400, 'Explica las correcciones necesarias, en hasta 2000 caracteres');
  const club = (await client.query('SELECT * FROM clubes WHERE id_club = $1 FOR UPDATE', [req.params.id])).rows[0];
  if (!club) throw fallo(404, 'Club no encontrado');
  if (accion === 'aprobar' && !clubEstaActivo(club)) throw fallo(409, MENSAJE_CLUB_NO_ACTIVO);
  await vencerInscripciones(client, req.params.id);
  const s = (await client.query('SELECT * FROM solicitudes_convocatoria WHERE id_club = $1 AND id_solicitud = $2 FOR UPDATE', [req.params.id, id_solicitud])).rows[0];
  if (!s) throw fallo(404, 'Solicitud no encontrada');
  if (s.estado === 'vencido') {
    res.status(409);
    return { error: MENSAJE_VENCIMIENTO, ...await configuracion(client, req.params.id) };
  }
  if (s.estado !== 'pendiente') throw fallo(409, 'Esta solicitud ya fue revisada');
  if (accion === 'aprobar' && club.id_presidente !== s.id_solicitante) throw fallo(409, 'Cambió la presidencia. El presidente actual debe presentar una nueva convocatoria');
  if (accion === 'aprobar') {
    const c = s.configuracion;
    const normalizarFecha = (valor) => valor == null ? null : new Date(valor).toISOString();
    const cambioApertura = normalizarFecha(c.fecha_apertura_programada) !== normalizarFecha(club.fecha_apertura_programada);
    const crearCiclo = !club.id_convocatoria_inscripcion_actual || cambioApertura;
    let idCiclo = club.id_convocatoria_inscripcion_actual;

    if (crearCiclo) {
      const fechaPublicacion = !club.id_convocatoria_inscripcion_actual && !cambioApertura
        ? (club.fecha_apertura_programada || new Date())
        : new Date();
      const ciclo = await client.query(
        `INSERT INTO convocatorias_inscripcion
           (id_club, id_solicitud, fecha_apertura_programada, fecha_limite_cierre,
            max_postulaciones, fecha_publicacion)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_convocatoria_inscripcion`,
        [club.id_club, s.id_solicitud, c.fecha_apertura_programada, c.fecha_limite_cierre,
          c.max_postulaciones, fechaPublicacion],
      );
      idCiclo = ciclo.rows[0].id_convocatoria_inscripcion;
      await client.query(
        `UPDATE formularios SET id_convocatoria_inscripcion = $1
         WHERE id_club = $2 AND id_convocatoria_inscripcion IS NULL AND fecha_envio >= $3`,
        [idCiclo, club.id_club, fechaPublicacion],
      );
    } else {
      await client.query(
        `UPDATE convocatorias_inscripcion
         SET fecha_apertura_programada = $1, fecha_limite_cierre = $2, max_postulaciones = $3
         WHERE id_convocatoria_inscripcion = $4`,
        [c.fecha_apertura_programada, c.fecha_limite_cierre, c.max_postulaciones, idCiclo],
      );
    }

    await client.query(
      `UPDATE clubes
       SET fecha_apertura_programada = $1, fecha_limite_cierre = $2, max_postulaciones = $3,
           id_convocatoria_inscripcion_actual = $4,
           postulaciones_actuales = (SELECT COUNT(*)::int FROM formularios WHERE id_convocatoria_inscripcion = $4),
           cerrada_manualmente = CASE WHEN fecha_apertura_programada IS DISTINCT FROM $1::timestamptz THEN FALSE ELSE cerrada_manualmente END
       WHERE id_club = $5`,
      [c.fecha_apertura_programada, c.fecha_limite_cierre, c.max_postulaciones, idCiclo, req.params.id],
    );
  }
  await client.query('UPDATE solicitudes_convocatoria SET estado=$1,id_revisor=$2,observaciones=$3,fecha_revision=NOW() WHERE id_solicitud=$4',
    [accion === 'aprobar' ? 'aprobado' : 'rechazado', req.user.id, observaciones || null, id_solicitud]);
  await notificar(client, req.user.id, club.id_club, accion === 'aprobar' ? 'Convocatoria aprobada' : 'Convocatoria por corregir',
    club.nombre_club + ': ' + (accion === 'aprobar' ? 'Coordinación aprobó y publicó la convocatoria.' : observaciones), club.id_presidente);
  await registrar(client, req, accion === 'aprobar' ? 'convocatoria_aprobada' : 'convocatoria_rechazada', { id_solicitud, observaciones });
  return configuracion(client, req.params.id);
}));
export default router;
