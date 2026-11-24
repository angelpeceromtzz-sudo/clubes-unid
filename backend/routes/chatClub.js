import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { esIdEntero, validarParamsEnteros } from '../lib/validarId.js';
import { limitadorChatLectura, limitadorChatPresencia } from '../lib/rateLimits.js';

const router = Router();
const MAX_CARACTERES = 400;
const ESPERA_ENVIO_SEGUNDOS = 4;
const INTERVALO_CONECTADO_SEGUNDOS = 45;
const FILTRO_CONTENIDO = /\b(?:porno\w*|pornograf[ií]a\w*|desnud[oa]s?|nudes?|xxx)\b/giu;

validarParamsEnteros(router);
for (const parametro of ['idMensaje', 'idUsuario']) {
  router.param(parametro, (req, res, next, valor) => {
    if (!esIdEntero(valor)) return res.status(400).json({ error: `${parametro} inválido` });
    next();
  });
}
router.use(authenticate);

const cantidadCaracteres = (texto) => Array.from(texto).length;
const censurarContenido = (texto) => texto.replace(FILTRO_CONTENIDO, '####');

async function consultarClub(db, idClub, idUsuario) {
  const { rows } = await db.query(`
    SELECT c.id_club, c.nombre_club, c.id_responsable_club, c.id_vicepresidente,
      (c.id_responsable_club = $2) AS es_responsable,
      (c.id_vicepresidente = $2) AS es_vicepresidente,
      EXISTS (SELECT 1 FROM inscripciones i WHERE i.id_club=c.id_club AND i.id_usuario=$2 AND i.id_estatus_inscripcion=1) AS es_miembro
    FROM clubes_operativos c WHERE c.id_club=$1`, [idClub, idUsuario]);
  const club = rows[0];
  if (!club) return { error: 'Club no encontrado', status: 404 };
  if (!club.es_responsable && !club.es_vicepresidente && !club.es_miembro) {
    return { error: 'Solo los miembros activos pueden entrar al chat del club', status: 403 };
  }
  return club;
}

async function validarMenciones(db, idClub, ids = []) {
  if (!Array.isArray(ids) || ids.length > 20 || ids.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1)) {
    return { error: 'Las menciones no son válidas' };
  }
  const unicos = [...new Set(ids.map(Number))];
  if (!unicos.length) return { ids: [] };
  const { rows } = await db.query(`
    SELECT u.id_usuario FROM usuarios u JOIN clubes_operativos c ON c.id_club=$1
    WHERE u.id_usuario = ANY($2::int[]) AND (
      u.id_usuario IN (c.id_responsable_club, c.id_vicepresidente) OR EXISTS (
        SELECT 1 FROM inscripciones i WHERE i.id_club=c.id_club AND i.id_usuario=u.id_usuario AND i.id_estatus_inscripcion=1
      ))`, [idClub, unicos]);
  if (rows.length !== unicos.length) return { error: 'Solo puedes mencionar miembros activos del club' };
  return { ids: unicos };
}

async function cargarChat(db, idClub, idUsuario, antes = null) {
  const club = await consultarClub(db, idClub, idUsuario);
  if (club.error) throw Object.assign(new Error(club.error), { status: club.status });

  const miembros = (await db.query(`
    SELECT u.id_usuario, u.nombre_completo, u.id_rol,
      (u.id_usuario=c.id_responsable_club) AS es_responsable,
      (u.id_usuario=c.id_vicepresidente) AS es_vicepresidente,
      (p.ultima_actividad > NOW() - ($2::int * INTERVAL '1 second')) AS conectado,
      (p.escribiendo_hasta > NOW()) AS escribiendo,
      EXISTS (SELECT 1 FROM club_chat_silencios s WHERE s.id_club=c.id_club AND s.id_usuario=u.id_usuario
        AND (s.silenciado_hasta IS NULL OR s.silenciado_hasta>NOW())) AS silenciado
    FROM clubes_operativos c JOIN usuarios u ON (
      u.id_usuario=c.id_responsable_club OR u.id_usuario=c.id_vicepresidente OR EXISTS (
        SELECT 1 FROM inscripciones i WHERE i.id_club=c.id_club AND i.id_usuario=u.id_usuario AND i.id_estatus_inscripcion=1
      ))
    LEFT JOIN club_chat_presencia p ON p.id_club=c.id_club AND p.id_usuario=u.id_usuario
    WHERE c.id_club=$1 AND u.deleted_at IS NULL
    ORDER BY conectado DESC, es_responsable DESC, es_vicepresidente DESC, u.nombre_completo`, [idClub, INTERVALO_CONECTADO_SEGUNDOS])).rows;

  const mensajes = (await db.query(`
    SELECT m.id_mensaje, m.id_club, m.id_autor, m.contenido, m.creado_en, m.editado_en,
      m.eliminado, u.nombre_completo AS autor, u.id_rol,
      (m.id_autor=c.id_responsable_club) AS es_responsable,
      (m.id_autor=c.id_vicepresidente) AS es_vicepresidente,
      EXISTS (SELECT 1 FROM club_chat_fijados f WHERE f.id_mensaje=m.id_mensaje) AS fijado,
      COALESCE((SELECT json_agg(json_build_object('id_usuario',x.id_usuario,'nombre',ux.nombre_completo))
        FROM club_chat_menciones x JOIN usuarios ux ON ux.id_usuario=x.id_usuario
        WHERE x.id_mensaje=m.id_mensaje), '[]'::json) AS menciones
    FROM club_chat_mensajes m JOIN usuarios u ON u.id_usuario=m.id_autor
      JOIN clubes_operativos c ON c.id_club=m.id_club
    WHERE m.id_club=$1 AND ($2::bigint IS NULL OR m.id_mensaje<$2)
    ORDER BY m.id_mensaje DESC LIMIT 61`, [idClub, antes])).rows;
  const masAnteriores = mensajes.length > 60;
  mensajes.splice(60);
  mensajes.reverse();

  const fijados = (await db.query(`
    SELECT m.id_mensaje, m.contenido, m.eliminado, u.nombre_completo AS autor
    FROM club_chat_fijados f JOIN club_chat_mensajes m ON m.id_mensaje=f.id_mensaje
      JOIN usuarios u ON u.id_usuario=m.id_autor
    WHERE m.id_club=$1 AND NOT m.eliminado ORDER BY f.creado_en DESC`, [idClub])).rows;
  const lectura = (await db.query('SELECT ultimo_mensaje_id FROM club_chat_lecturas WHERE id_club=$1 AND id_usuario=$2', [idClub, idUsuario])).rows[0]?.ultimo_mensaje_id || 0;
  const noLeidos = (await db.query(`SELECT COUNT(*)::int AS total, MIN(id_mensaje) AS primero
    FROM club_chat_mensajes WHERE id_club=$1 AND id_autor<>$2 AND id_mensaje>$3 AND NOT eliminado`, [idClub, idUsuario, lectura])).rows[0];
  return {
    club: { id_club: club.id_club, nombre_club: club.nombre_club, id_responsable_club: club.id_responsable_club, id_vicepresidente: club.id_vicepresidente },
    miembros,
    mensajes,
    mas_anteriores: masAnteriores,
    fijados,
    no_leidos: Number(noLeidos.total),
    primer_no_leido_id: noLeidos.primero ? Number(noLeidos.primero) : null,
    caracteres_maximos: MAX_CARACTERES,
    espera_envio_segundos: ESPERA_ENVIO_SEGUNDOS,
  };
}

async function registrarMenciones(db, idMensaje, ids) {
  for (const idUsuario of ids) {
    await db.query('INSERT INTO club_chat_menciones (id_mensaje,id_usuario) VALUES ($1,$2) ON CONFLICT DO NOTHING', [idMensaje, idUsuario]);
  }
}

router.get('/clubes/:idClub/chat', async (req, res) => {
  try {
    const antes = req.query.antes == null ? null : Number(req.query.antes);
    if (antes !== null && (!Number.isSafeInteger(antes) || antes < 1)) return res.status(400).json({ error: 'Referencia de historial no válida' });
    res.json(await cargarChat(pool, req.params.idClub, req.user.id, antes));
  }
  catch (error) {
    if (!error.status) console.error('Error al cargar el chat del club:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo cargar el chat' });
  }
});

router.put('/clubes/:idClub/presencia', limitadorChatPresencia, async (req, res) => {
  try {
    const club = await consultarClub(pool, req.params.idClub, req.user.id);
    if (club.error) return res.status(club.status).json({ error: club.error });
    if (req.body?.activo === false) {
      await pool.query('DELETE FROM club_chat_presencia WHERE id_club=$1 AND id_usuario=$2', [req.params.idClub, req.user.id]);
      return res.json({ ok: true, conectado: false });
    }
    const escribiendo = req.body?.escribiendo === true;
    await pool.query(`INSERT INTO club_chat_presencia (id_club,id_usuario,ultima_actividad,escribiendo_hasta)
      VALUES ($1,$2,NOW(),CASE WHEN $3 THEN NOW()+INTERVAL '6 seconds' ELSE NULL END)
      ON CONFLICT (id_club,id_usuario) DO UPDATE SET ultima_actividad=NOW(),
      escribiendo_hasta=CASE WHEN $3 THEN NOW()+INTERVAL '6 seconds' ELSE NULL END`, [req.params.idClub, req.user.id, escribiendo]);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: 'No se pudo actualizar la presencia' }); }
});

router.post('/clubes/:idClub/leer', limitadorChatLectura, async (req, res) => {
  const client = await pool.connect();
  try {
    const club = await consultarClub(client, req.params.idClub, req.user.id);
    if (club.error) { return res.status(club.status).json({ error: club.error }); }
    await client.query('BEGIN');
    await client.query(`INSERT INTO club_chat_lecturas (id_club,id_usuario,ultimo_mensaje_id)
      SELECT $1,$2,COALESCE(MAX(id_mensaje),0) FROM club_chat_mensajes WHERE id_club=$1
      ON CONFLICT (id_club,id_usuario) DO UPDATE SET ultimo_mensaje_id=GREATEST(club_chat_lecturas.ultimo_mensaje_id,EXCLUDED.ultimo_mensaje_id), actualizado_en=NOW()`, [req.params.idClub, req.user.id]);
    await client.query(`INSERT INTO notificaciones_leidas (id_notificacion,id_usuario)
      SELECT cn.id_notificacion,$2 FROM club_chat_notificaciones cn
      JOIN club_chat_mensajes m ON m.id_mensaje=cn.id_mensaje
      WHERE m.id_club=$1 AND cn.id_destinatario=$2 ON CONFLICT DO NOTHING`, [req.params.idClub, req.user.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: 'No se pudo marcar el chat como leído' }); }
  finally { client.release(); }
});

router.post('/clubes/:idClub/mensajes', async (req, res) => {
  const client = await pool.connect();
  try {
    const idClub = Number(req.params.idClub);
    const textoOriginal = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!textoOriginal) { return res.status(400).json({ error: 'Escribe un mensaje antes de enviarlo' }); }
    if (cantidadCaracteres(textoOriginal) > MAX_CARACTERES) { return res.status(400).json({ error: 'El mensaje supera el límite de 400 caracteres' }); }
    const menciones = await validarMenciones(client, idClub, req.body?.menciones || []);
    if (menciones.error) { return res.status(400).json({ error: menciones.error }); }
    const club = await consultarClub(client, idClub, req.user.id);
    if (club.error) { return res.status(club.status).json({ error: club.error }); }
    const silenciado = (await client.query(`SELECT 1 FROM club_chat_silencios WHERE id_club=$1 AND id_usuario=$2
      AND (silenciado_hasta IS NULL OR silenciado_hasta>NOW())`, [idClub, req.user.id])).rows.length > 0;
    if (silenciado) { return res.status(403).json({ error: 'El responsable del club ha pausado temporalmente tu participación en el chat' }); }

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1,$2)', [idClub, req.user.id]);
    // La membresía y el silencio pueden cambiar mientras esperamos el lock.
    const clubActual = await consultarClub(client, idClub, req.user.id);
    if (clubActual.error) throw Object.assign(new Error(clubActual.error), { status: clubActual.status });
    const silenciadoActual = (await client.query(`SELECT 1 FROM club_chat_silencios WHERE id_club=$1 AND id_usuario=$2
      AND (silenciado_hasta IS NULL OR silenciado_hasta>NOW())`, [idClub, req.user.id])).rows.length > 0;
    if (silenciadoActual) throw Object.assign(new Error('El responsable del club ha pausado temporalmente tu participación en el chat'), { status: 403 });
    const ultimo = (await client.query(`SELECT EXTRACT(EPOCH FROM (NOW()-MAX(creado_en))) AS segundos
      FROM club_chat_mensajes WHERE id_club=$1 AND id_autor=$2`, [idClub, req.user.id])).rows[0].segundos;
    if (ultimo !== null && Number(ultimo) < ESPERA_ENVIO_SEGUNDOS) {
      const espera = Math.ceil(ESPERA_ENVIO_SEGUNDOS - Number(ultimo));
      await client.query('ROLLBACK');
      return res.status(429).json({ error: `Espera ${espera} segundos antes de enviar otro mensaje`, espera_segundos: espera });
    }
    const contenido = censurarContenido(textoOriginal);
    const mensaje = (await client.query(`INSERT INTO club_chat_mensajes (id_club,id_autor,contenido)
      VALUES ($1,$2,$3) RETURNING id_mensaje, id_club, id_autor, contenido, creado_en, editado_en, eliminado`, [idClub, req.user.id, contenido])).rows[0];
    await registrarMenciones(client, mensaje.id_mensaje, menciones.ids);

    const destinatarios = (await client.query(`SELECT DISTINCT u.id_usuario FROM usuarios u JOIN clubes_operativos c ON c.id_club=$1
      WHERE u.id_usuario<>$2 AND u.deleted_at IS NULL AND (
        u.id_usuario IN (c.id_responsable_club,c.id_vicepresidente) OR EXISTS (
          SELECT 1 FROM inscripciones i WHERE i.id_club=c.id_club AND i.id_usuario=u.id_usuario AND i.id_estatus_inscripcion=1
        )) AND NOT EXISTS (SELECT 1 FROM club_chat_presencia p WHERE p.id_club=c.id_club AND p.id_usuario=u.id_usuario
          AND p.ultima_actividad>NOW()-INTERVAL '45 seconds')`, [idClub, req.user.id])).rows;
    const extracto = contenido.length > 120 ? `${contenido.slice(0, 117)}…` : contenido;
    for (const { id_usuario: destinatario } of destinatarios) {
      const esMencion = menciones.ids.includes(destinatario);
      const notificacion = (await client.query(`INSERT INTO notificaciones (id_emisor,titulo,mensaje,audiencia,id_club,id_destinatario)
        VALUES ($1,$2,$3,'global',$4,$5) RETURNING id_notificacion`, [req.user.id,
        esMencion ? `Te mencionaron en ${clubActual.nombre_club}` : `Nuevo mensaje en ${clubActual.nombre_club}`,
        `${req.user.nombre_completo}: ${extracto}`, idClub, destinatario])).rows[0];
      await client.query('INSERT INTO club_chat_notificaciones (id_notificacion,id_mensaje,id_destinatario) VALUES ($1,$2,$3)', [notificacion.id_notificacion, mensaje.id_mensaje, destinatario]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ...mensaje, autor: req.user.nombre_completo, id_rol: req.user.id_rol,
      es_responsable: clubActual.es_responsable, es_vicepresidente: clubActual.es_vicepresidente,
      fijado: false, menciones: menciones.ids.map((id) => ({ id_usuario: id })) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (!error.status) console.error('Error al enviar mensaje del chat:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo enviar el mensaje' });
  } finally { client.release(); }
});

router.put('/clubes/:idClub/mensajes/:idMensaje', async (req, res) => {
  const client = await pool.connect();
  try {
    const texto = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!texto || cantidadCaracteres(texto) > MAX_CARACTERES) { return res.status(400).json({ error: 'El mensaje debe tener entre 1 y 400 caracteres' }); }
    await client.query('BEGIN');
    const club = await consultarClub(client, req.params.idClub, req.user.id);
    if (club.error) throw Object.assign(new Error(club.error), { status: club.status });
    // Edición y borrado bloquean la misma fila: una eliminación concurrente
    // queda visible al terminar la espera y nunca puede sobrescribirse después.
    const mensaje = (await client.query('SELECT id_autor, eliminado FROM club_chat_mensajes WHERE id_mensaje=$1 AND id_club=$2 FOR UPDATE', [req.params.idMensaje, req.params.idClub])).rows[0];
    if (!mensaje) throw Object.assign(new Error('Mensaje no encontrado'), { status: 404 });
    if (mensaje.id_autor !== req.user.id) throw Object.assign(new Error('Solo puedes editar tus propios mensajes'), { status: 403 });
    if (mensaje.eliminado) throw Object.assign(new Error('Este mensaje ya fue eliminado'), { status: 409 });
    const menciones = await validarMenciones(client, Number(req.params.idClub), req.body?.menciones || []);
    if (menciones.error) throw Object.assign(new Error(menciones.error), { status: 400 });
    const actualizado = (await client.query(`UPDATE club_chat_mensajes SET contenido=$1,editado_en=NOW()
      WHERE id_mensaje=$2 AND id_club=$3 AND id_autor=$4 AND NOT eliminado RETURNING *`,
    [censurarContenido(texto), req.params.idMensaje, req.params.idClub, req.user.id])).rows[0];
    if (!actualizado) throw Object.assign(new Error('Este mensaje ya fue eliminado'), { status: 409 });
    await client.query('DELETE FROM club_chat_menciones WHERE id_mensaje=$1', [req.params.idMensaje]);
    await registrarMenciones(client, Number(req.params.idMensaje), menciones.ids);
    await client.query(`UPDATE notificaciones n
      SET mensaje=LEFT(u.nombre_completo || ': ' || m.contenido, 140)
      FROM club_chat_notificaciones cn
      JOIN club_chat_mensajes m ON m.id_mensaje=cn.id_mensaje
      JOIN usuarios u ON u.id_usuario=m.id_autor
      WHERE n.id_notificacion=cn.id_notificacion AND m.id_mensaje=$1`, [req.params.idMensaje]);
    await client.query('COMMIT');
    res.json(actualizado);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (!error.status) console.error('Error al editar mensaje del chat:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo editar el mensaje' });
  }
  finally { client.release(); }
});

router.delete('/clubes/:idClub/mensajes/:idMensaje', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const club = await consultarClub(client, req.params.idClub, req.user.id);
    if (club.error) throw Object.assign(new Error(club.error), { status: club.status });
    const mensaje = (await client.query('SELECT id_autor FROM club_chat_mensajes WHERE id_mensaje=$1 AND id_club=$2 FOR UPDATE', [req.params.idMensaje, req.params.idClub])).rows[0];
    if (!mensaje) throw Object.assign(new Error('Mensaje no encontrado'), { status: 404 });
    if (mensaje.id_autor !== req.user.id && !club.es_responsable) throw Object.assign(new Error('Solo puedes eliminar tus propios mensajes'), { status: 403 });
    await client.query(`UPDATE club_chat_mensajes SET contenido='Mensaje eliminado',eliminado=TRUE,editado_en=NULL
      WHERE id_mensaje=$1 AND id_club=$2`, [req.params.idMensaje, req.params.idClub]);
    await client.query(`UPDATE notificaciones n SET mensaje='Mensaje eliminado'
      FROM club_chat_notificaciones cn WHERE n.id_notificacion=cn.id_notificacion AND cn.id_mensaje=$1`, [req.params.idMensaje]);
    await client.query('DELETE FROM club_chat_menciones WHERE id_mensaje=$1', [req.params.idMensaje]);
    await client.query('DELETE FROM club_chat_fijados WHERE id_mensaje=$1', [req.params.idMensaje]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (!error.status) console.error('Error al eliminar mensaje del chat:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo eliminar el mensaje' });
  }
  finally { client.release(); }
});

router.put('/clubes/:idClub/mensajes/:idMensaje/fijado', async (req, res) => {
  try {
    const club = await consultarClub(pool, req.params.idClub, req.user.id);
    if (club.error) return res.status(club.status).json({ error: club.error });
    if (!club.es_responsable) return res.status(403).json({ error: 'Solo el responsable puede fijar mensajes' });
    const existe = (await pool.query('SELECT 1 FROM club_chat_mensajes WHERE id_mensaje=$1 AND id_club=$2 AND NOT eliminado', [req.params.idMensaje, req.params.idClub])).rows.length > 0;
    if (!existe) return res.status(404).json({ error: 'Mensaje no disponible' });
    if (req.body?.fijado === true) await pool.query('INSERT INTO club_chat_fijados (id_mensaje,id_fijado_por) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.idMensaje, req.user.id]);
    else await pool.query('DELETE FROM club_chat_fijados WHERE id_mensaje=$1', [req.params.idMensaje]);
    res.json({ ok: true, fijado: req.body?.fijado === true });
  } catch (error) { res.status(500).json({ error: 'No se pudo actualizar el mensaje fijado' }); }
});

router.put('/clubes/:idClub/miembros/:idUsuario/silencio', async (req, res) => {
  try {
    const club = await consultarClub(pool, req.params.idClub, req.user.id);
    if (club.error) return res.status(club.status).json({ error: club.error });
    if (!club.es_responsable) return res.status(403).json({ error: 'Solo el responsable puede silenciar integrantes' });
    const idObjetivo = Number(req.params.idUsuario);
    if (idObjetivo === Number(req.user.id) || idObjetivo === Number(club.id_responsable_club) || idObjetivo === Number(club.id_vicepresidente)) return res.status(400).json({ error: 'No puedes silenciar a una persona responsable del club' });
    const miembro = (await pool.query('SELECT 1 FROM inscripciones WHERE id_club=$1 AND id_usuario=$2 AND id_estatus_inscripcion=1', [req.params.idClub, idObjetivo])).rows.length > 0;
    if (!miembro) return res.status(404).json({ error: 'Solo puedes silenciar a miembros activos del club' });
    if (req.body?.silenciado === true) {
      const duracion = req.body?.duracion_minutos ?? null;
      if (duracion !== null && ![60, 1440, 10080].includes(Number(duracion))) {
        return res.status(400).json({ error: 'Duración de silencio no válida' });
      }
      await pool.query(`INSERT INTO club_chat_silencios (id_club,id_usuario,id_moderador,silenciado_hasta)
        VALUES ($1,$2,$3,CASE WHEN $4::int IS NULL THEN NULL ELSE NOW()+($4::int*INTERVAL '1 minute') END)
        ON CONFLICT (id_club,id_usuario) DO UPDATE SET id_moderador=EXCLUDED.id_moderador,
          creado_en=NOW(),silenciado_hasta=EXCLUDED.silenciado_hasta`,
      [req.params.idClub, idObjetivo, req.user.id, duracion]);
    }
    else await pool.query('DELETE FROM club_chat_silencios WHERE id_club=$1 AND id_usuario=$2', [req.params.idClub, idObjetivo]);
    res.json({ ok: true, silenciado: req.body?.silenciado === true });
  } catch (error) { res.status(500).json({ error: 'No se pudo actualizar el silencio' }); }
});

export default router;
