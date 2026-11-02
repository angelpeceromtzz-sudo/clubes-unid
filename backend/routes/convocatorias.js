import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, requireClubReader } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';
import { generarListaAsistencia } from '../lib/asistenciaTemplate.js';
import { registrarActividadClub } from '../lib/clubActivity.js';
import { validarParamsEnteros } from '../lib/validarId.js';
import { vencerBloques, FECHA_EVALUACION_SQL, MENSAJE_VENCIMIENTO } from '../lib/vencimientoConvocatorias.js';
import { clubEstaActivo, MENSAJE_CLUB_NO_ACTIVO } from '../lib/estadoClub.js';

const router = Router();

validarParamsEnteros(router);

const DIAS_VIGENCIA_OFERTA = 3; // 72 horas

function distribuirEnBloques(cantidad) {
  if (cantidad <= 0) return [];
  const totalBloques = Math.ceil(cantidad / 20);
  const base = Math.floor(cantidad / totalBloques);
  const resto = cantidad % totalBloques;
  const distribucion = [];
  for (let i = 0; i < totalBloques; i++) {
    distribucion.push(i < resto ? base + 1 : base);
  }
  return distribucion;
}

const NOMBRES_BLOQUES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Vista previa de cuántos bloques se generarán
router.get('/preview/:id_club', authenticate, requireClubReader, async (req, res) => {
  try {
    const { id_club } = req.params;
    const club = await pool.query('SELECT id_club FROM clubes WHERE id_club = $1', [id_club]);
    if (club.rows.length === 0) return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });

    const preseleccionados = await pool.query(
      `SELECT COUNT(*) as total FROM formularios WHERE id_club = $1 AND status = 'Preseleccionado'`,
      [id_club],
    );
    const total = parseInt(preseleccionados.rows[0].total, 10);
    const distribucion = distribuirEnBloques(total);
    const bloques = distribucion.map((cantidad, i) => ({
      bloque: NOMBRES_BLOQUES[i],
      alumnos: cantidad,
    }));

    res.json({ total, bloques });
  } catch (err) {
    console.error('Error en preview:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Generar convocatorias a partir de preseleccionados
router.post('/generar', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.body;
    if (!id_club) return res.status(400).json({ error: 'id_club es obligatorio' });

    const club = await pool.query(
      `SELECT id_club, nombre_club, id_responsable_club, id_estatus_club,
              id_convocatoria_inscripcion_actual
       FROM clubes WHERE id_club = $1 AND id_responsable_club = $2`,
      [id_club, req.user.id],
    );
    if (club.rows.length === 0) return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });
    if (!clubEstaActivo(club.rows[0])) return res.status(409).json({ error: MENSAJE_CLUB_NO_ACTIVO });

    const idCiclo = club.rows[0].id_convocatoria_inscripcion_actual;
    const preseleccionados = await pool.query(
      `SELECT id_formulario, id_alumno, nombre_completo FROM formularios
       WHERE id_club = $1 AND status = 'Preseleccionado'
         AND id_convocatoria_inscripcion = $2
       ORDER BY fecha_envio ASC`,
      [id_club, idCiclo],
    );

    if (preseleccionados.rows.length === 0) {
      return res.status(400).json({ error: 'No hay alumnos preseleccionados' });
    }

    const pendientes = await pool.query(
      `SELECT COUNT(*) as total FROM formularios
       WHERE id_club = $1 AND status = 'En revisión'
         AND id_convocatoria_inscripcion = $2`,
      [id_club, idCiclo],
    );
    if (parseInt(pendientes.rows[0].total, 10) > 0) {
      return res.status(400).json({
        error: `Debes procesar todos los formularios (Preseleccionar o Rechazar) antes de generar las convocatorias. Quedan ${pendientes.rows[0].total} formulario(s) en revisión.`,
      });
    }

    const distribucion = distribuirEnBloques(preseleccionados.rows.length);
    const periodo = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const clubBloqueado = (await client.query(
        'SELECT id_estatus_club, id_convocatoria_inscripcion_actual FROM clubes WHERE id_club = $1 FOR UPDATE',
        [id_club],
      )).rows[0];
      if (!clubEstaActivo(clubBloqueado)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MENSAJE_CLUB_NO_ACTIVO }); }
      if (clubBloqueado.id_convocatoria_inscripcion_actual !== idCiclo) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'La convocatoria cambió mientras se generaban los bloques. Intenta de nuevo.' });
      }
      const asignadas = await client.query(
        `SELECT id_formulario FROM formularios
         WHERE id_club = $1 AND status = 'Preseleccionado'
           AND id_convocatoria_inscripcion = $2 AND id_convocatoria IS NOT NULL`,
        [id_club, idCiclo],
      );
      if (asignadas.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Los alumnos preseleccionados ya tienen bloques de convocatoria asignados' }); }

      let idx = 0;
      for (let b = 0; b < distribucion.length; b++) {
        const bloqueNombre = NOMBRES_BLOQUES[b];
        const numAlumnos = distribucion[b];

        const conv = await client.query(
          `INSERT INTO convocatorias
             (id_club, id_responsable_club, fecha, hora, lugar, bloque, periodo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id_convocatoria`,
          [
            id_club,
            club.rows[0].id_responsable_club,
            null,
            null,
            null,
            bloqueNombre,
            periodo,
          ],
        );
        const idConv = conv.rows[0].id_convocatoria;

        for (let a = 0; a < numAlumnos; a++) {
          const form = preseleccionados.rows[idx];
          await client.query(
            `UPDATE formularios
             SET id_convocatoria = $1
             WHERE id_formulario = $2`,
            [idConv, form.id_formulario],
          );
          idx++;
        }
      }

      await client.query('COMMIT');
      registrarActividadClub({
        tipo_evento: 'convocatoria_generada',
        id_club: Number(id_club),
        id_actor: req.user.id,
        descripcion: `Se generaron ${distribucion.length} bloque(s) de convocatoria para ${preseleccionados.rows.length} alumno(s)`,
        detalles: { bloques: distribucion.length, alumnos: preseleccionados.rows.length },
      });
      res.json({
        mensaje: `Convocatorias generadas: ${distribucion.length} bloque(s) para ${preseleccionados.rows.length} alumno(s)`,
        bloques: distribucion.map((cantidad, i) => ({
          bloque: NOMBRES_BLOQUES[i],
          alumnos: cantidad,
        })),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al generar convocatorias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar convocatorias de un club
router.get('/:id_club', authenticate, requireClubReader, async (req, res) => {
  try {
    const { id_club } = req.params;
    const club = await pool.query('SELECT id_club, id_estatus_club FROM clubes WHERE id_club = $1', [id_club]);
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (!clubEstaActivo(club.rows[0])) return res.json([]);
    await vencerBloques(pool, id_club);

    const convocatorias = await pool.query(
      `SELECT c.*, ${FECHA_EVALUACION_SQL} AS fecha_evaluacion,
              (SELECT json_agg(json_build_object(
                'id_formulario', f.id_formulario,
                'id_alumno', f.id_alumno,
                'nombre_completo', f.nombre_completo,
                'matricula', f.matricula
              ) ORDER BY f.fecha_envio ASC)
               FROM formularios f
               WHERE f.id_convocatoria = c.id_convocatoria
                 AND f.status IN ('Preseleccionado', 'Convocado')) AS alumnos
       FROM convocatorias c
       WHERE c.id_club = $1
       ORDER BY c.bloque ASC`,
      [id_club],
    );

    res.json(convocatorias.rows);
  } catch (err) {
    console.error('Error al listar convocatorias:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar fecha, hora, lugar de una convocatoria
router.put('/:id', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, lugar } = req.body;

    const conv = await pool.query(
      `SELECT c.*, cl.id_estatus_club FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 AND cl.id_responsable_club = $2`,
      [id, req.user.id],
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Convocatoria no encontrada' });
    if (!clubEstaActivo(conv.rows[0])) return res.status(409).json({ error: MENSAJE_CLUB_NO_ACTIVO });
    await vencerBloques(pool, conv.rows[0].id_club);
    if (conv.rows[0].estado_revision === 'pendiente') {
      conv.rows[0] = (await pool.query('SELECT * FROM convocatorias WHERE id_convocatoria = $1', [id])).rows[0];
    }
    if (conv.rows[0].estado_revision === 'pendiente') return res.status(409).json({ error: 'Espera la revisión de Coordinación antes de editar' });
    if (conv.rows[0].enviada) return res.status(409).json({ error: 'La convocatoria ya fue enviada. No se pueden cambiar sus datos sin emitir una nueva convocatoria' });
    if (fecha !== undefined && (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(fecha + 'T12:00:00Z').getTime()) || new Date(fecha + 'T12:00:00Z').toISOString().slice(0,10) !== fecha)) return res.status(400).json({ error: 'Fecha no válida' });
    if (hora !== undefined && (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora))) return res.status(400).json({ error: 'Hora no válida' });
    if (lugar !== undefined && (typeof lugar !== 'string' || !lugar.trim() || lugar.length > 200)) return res.status(400).json({ error: 'Escribe un lugar de hasta 200 caracteres' });

    const result = await pool.query(
      `UPDATE convocatorias
       SET fecha = COALESCE($1, fecha),
           hora = COALESCE($2, hora),
           lugar = COALESCE($3, lugar), estado_revision = 'preparacion', observaciones = NULL, id_revisor = NULL, fecha_revision = NULL
       WHERE id_convocatoria = $4 AND enviada = FALSE AND estado_revision IN ('preparacion','rechazado','vencido')
         AND EXISTS (SELECT 1 FROM clubes cl WHERE cl.id_club = convocatorias.id_club AND cl.id_responsable_club = $5)
       RETURNING *, ((fecha + hora) AT TIME ZONE 'America/Mexico_City') AS fecha_evaluacion`,
      [fecha || null, hora || null, lugar || null, id, req.user.id],
    );
    if (!result.rows.length) return res.status(409).json({ error: 'La convocatoria fue publicada por otra solicitud y ya no puede editarse' });

    registrarActividadClub({
      tipo_evento: 'evento_creado',
      id_club: conv.rows[0].id_club,
      id_actor: req.user.id,
      descripcion: `Convocatoria del bloque ${conv.rows[0].bloque} actualizada`,
      detalles: { fecha, hora, lugar, bloque: conv.rows[0].bloque },
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar convocatoria:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// El presidente solicita revisión. No se notifica a alumnos ni se publica todavía.
router.post('/:id/solicitar-revision', authenticate, requireRole(2), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = (await client.query(`SELECT c.*, ${FECHA_EVALUACION_SQL} <= clock_timestamp() AS vencida, cl.id_responsable_club AS presidente_actual, cl.id_estatus_club FROM convocatorias c JOIN clubes cl ON cl.id_club=c.id_club WHERE c.id_convocatoria=$1 FOR UPDATE OF c, cl`, [req.params.id])).rows[0];
    if (!c || c.presidente_actual !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Solo el presidente del club puede solicitar revisión' }); }
    if (!clubEstaActivo(c)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MENSAJE_CLUB_NO_ACTIVO }); }
    if (c.enviada || !['preparacion','rechazado'].includes(c.estado_revision)) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La convocatoria ya está en revisión o publicada' }); }
    if (!c.fecha || !c.hora || !c.lugar) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Completa fecha, hora y lugar antes de solicitar revisión' }); }
    if (c.vencida) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La fecha y hora de evaluación deben ser futuras para enviar a revisión' }); }
    const result = await client.query("UPDATE convocatorias SET estado_revision='pendiente', observaciones=NULL, id_revisor=NULL, fecha_revision=NULL WHERE id_convocatoria=$1 RETURNING *", [req.params.id]);
    await client.query("INSERT INTO notificaciones(id_emisor,titulo,mensaje,audiencia,id_club,id_destinatario) SELECT $1,'Convocatoria por revisar',$2,'global',$3,id_usuario FROM usuarios WHERE id_rol=3", [req.user.id, 'El presidente solicitó revisión del bloque ' + c.bloque, c.id_club]);
    await client.query('INSERT INTO actividad_clubes(tipo_evento,id_club,id_actor,descripcion,detalles) VALUES ($1,$2,$3,$4,$5)', ['convocatoria_solicitada', c.id_club, req.user.id, 'Convocatoria enviada a revisión', JSON.stringify({ id_convocatoria: c.id_convocatoria })]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); console.error(err); res.status(500).json({ error: 'No se pudo enviar a revisión' }); }
  finally { client.release(); }
});

router.post('/:id/rechazar', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const observaciones = typeof req.body.observaciones === 'string' ? req.body.observaciones.trim() : '';
  if (!observaciones || observaciones.length > 2000) return res.status(400).json({ error: 'Explica las correcciones necesarias, en hasta 2000 caracteres' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query("UPDATE convocatorias SET estado_revision='rechazado',observaciones=$1,id_revisor=$2,fecha_revision=NOW() WHERE id_convocatoria=$3 AND estado_revision='pendiente' AND enviada=FALSE RETURNING *", [observaciones, req.user.id, req.params.id]);
    if (!result.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La convocatoria no está pendiente de revisión' }); }
    const c = result.rows[0];
    await client.query("INSERT INTO notificaciones(id_emisor,titulo,mensaje,audiencia,id_club,id_destinatario) SELECT $1,'Convocatoria por corregir',$2,'presidentes',id_club,id_responsable_club FROM clubes WHERE id_club=$3 AND id_responsable_club IS NOT NULL", [req.user.id, observaciones, c.id_club]);
    await client.query('INSERT INTO actividad_clubes(tipo_evento,id_club,id_actor,descripcion,detalles) VALUES ($1,$2,$3,$4,$5)', ['convocatoria_rechazada', c.id_club, req.user.id, observaciones, JSON.stringify({ id_convocatoria: c.id_convocatoria })]);
    await client.query('COMMIT'); res.json(c);
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); console.error(err); res.status(500).json({ error: 'No se pudo devolver la convocatoria' }); }
  finally { client.release(); }
});

// Admin aprueba y envía la convocatoria a todo un bloque
router.post('/:id/enviar', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { id } = req.params;

    const conv = await client.query(
      `SELECT c.*, ${FECHA_EVALUACION_SQL} <= clock_timestamp() AS vencida, cl.nombre_club, cl.id_club, cl.id_estatus_club
       FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 FOR UPDATE OF c, cl`,
      [id],
    );
    if (conv.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Convocatoria no encontrada' }); }
    const c = conv.rows[0];
    if (!clubEstaActivo(c)) { await client.query('ROLLBACK'); return res.status(409).json({ error: MENSAJE_CLUB_NO_ACTIVO }); }
    if (c.estado_revision === 'vencido' || (!c.enviada && c.estado_revision === 'pendiente' && c.vencida)) {
      await vencerBloques(client, c.id_club, c.id_convocatoria);
      await client.query('COMMIT');
      return res.status(409).json({ error: MENSAJE_VENCIMIENTO });
    }
    if (c.enviada || c.estado_revision !== 'pendiente') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Solo pueden publicarse convocatorias enviadas a revisión por el presidente' }); }

    if (!c.fecha || !c.hora || !c.lugar) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Debes establecer fecha, hora y lugar antes de enviar la convocatoria' });
    }

    const alumnos = await client.query(
      `SELECT id_alumno, nombre_completo FROM formularios WHERE id_convocatoria = $1 AND status = 'Preseleccionado'`,
      [id],
    );
    if (!alumnos.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'No hay alumnos preseleccionados pendientes en este bloque' }); }

    const fechaTexto = c.fecha
      ? c.fecha.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : 'Por definir';
    const horaTexto = c.hora ? c.hora.slice(0, 5) : 'Por definir';

    for (const alumno of alumnos.rows) {
      await client.query(
        `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
         VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
        [
          req.user.id,
          `Convocatoria: ${c.nombre_club} - Bloque ${c.bloque}`,
          `Has sido convocado a una evaluación presencial para "${c.nombre_club}".\nBloque: ${c.bloque}\nLugar: ${c.lugar}\nFecha: ${fechaTexto}\nHora: ${horaTexto}`,
          c.id_club,
          alumno.id_alumno,
        ],
      );
    }

    await client.query(
      "UPDATE convocatorias SET enviada = TRUE, estado_revision = 'aprobado', id_revisor = $2, fecha_revision = NOW() WHERE id_convocatoria = $1",
      [id, req.user.id],
    );

    await client.query(
      `UPDATE formularios SET status = 'Convocado' WHERE id_convocatoria = $1 AND status = 'Preseleccionado'`,
      [id],
    );
    await registrarActividadClub({ tipo_evento: 'convocatoria_publicada', id_club: c.id_club, id_actor: req.user.id,
      descripcion: `Coordinación VIVE publicó el bloque ${c.bloque}`, detalles: { id_convocatoria: Number(id), alumnos: alumnos.rows.length }, client });
    await client.query('COMMIT');

    res.json({ mensaje: `Convocatoria enviada a ${alumnos.rows.length} alumno(s)` });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al enviar convocatoria:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally { client?.release(); }
});

// Generar lista de asistencia para imprimir
router.get('/:id/asistencia', authenticate, requireRole(2, 3, 5), async (req, res) => {
  try {
    const { id } = req.params;

    const conv = await pool.query(
      `SELECT c.*, cl.nombre_club
       FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 AND ($3::boolean OR cl.id_responsable_club = $2 OR cl.id_vicepresidente = $2)`,
      [id, req.user.id, req.user.id_rol === ROL_ADMIN || req.user.id_rol === ROL_COORDINACION],
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Convocatoria no encontrada' });
    const c = conv.rows[0];

    const alumnos = await pool.query(
      `SELECT nombre_completo, matricula FROM formularios
       WHERE id_convocatoria = $1
       ORDER BY fecha_envio ASC`,
      [id],
    );

    const html = generarListaAsistencia(c.nombre_club, c.bloque, c.fecha, c.hora, c.lugar, alumnos.rows);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Error al generar asistencia:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Enviar ofertas a alumnos aprobados en selección final
router.post('/ofertas', authenticate, requireRole(2, 5), async (req, res) => {
  try {
    const { id_club, aprobados } = req.body;
    if (!id_club || !Array.isArray(aprobados)) {
      return res.status(400).json({ error: 'id_club y aprobados[] son obligatorios' });
    }

    const club = await pool.query(
      'SELECT id_club, nombre_club FROM clubes WHERE id_club = $1 AND (id_responsable_club = $2 OR id_vicepresidente = $2)',
      [id_club, req.user.id],
    );
    if (club.rows.length === 0) return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });
    const nombreClub = club.rows[0].nombre_club;

    const convocados = await pool.query(
      `SELECT id_formulario, id_alumno, nombre_completo
       FROM formularios
       WHERE id_club = $1 AND status = 'Convocado'`,
      [id_club],
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let ofertados = 0;
      for (const form of convocados.rows) {
        if (aprobados.includes(form.id_formulario)) {
          await client.query(
            `UPDATE formularios
             SET status = 'Oferta enviada',
                 fecha_oferta = NOW(),
                 fecha_expiracion = NOW() + INTERVAL '1 day' * $1
             WHERE id_formulario = $2`,
            [DIAS_VIGENCIA_OFERTA, form.id_formulario],
          );
          ofertados++;

          await client.query(
            `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
             VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
            [
              req.user.id,
              `Oferta de ingreso: ${nombreClub}`,
              `"${nombreClub}" te ha extendido una oferta de ingreso. Tienes ${DIAS_VIGENCIA_OFERTA} días para aceptarla desde tu panel de postulaciones.`,
              id_club,
              form.id_alumno,
            ],
          );
        } else {
          await client.query(
            `UPDATE formularios
             SET status = 'Rechazado', motivo_rechazo = 'No seleccionado en la evaluaci\u00f3n final'
             WHERE id_formulario = $1`,
            [form.id_formulario],
          );

          await client.query(
            `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
             VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
            [
              req.user.id,
              `Postulaci\u00f3n en ${nombreClub}`,
              `Tu postulaci\u00f3n en "${nombreClub}" ha concluido. No fuiste seleccionado en esta ocasi\u00f3n.`,
              id_club,
              form.id_alumno,
            ],
          );
        }
      }

      await client.query('COMMIT');
      registrarActividadClub({
        tipo_evento: 'ofertas_enviadas',
        id_club: Number(id_club),
        id_actor: req.user.id,
        descripcion: `Se enviaron ${ofertados} oferta(s) de ingreso de ${nombreClub}`,
        detalles: { ofertados, rechazados: convocados.rows.length - ofertados, total: convocados.rows.length },
      });
      res.json({
        mensaje: `Ofertas enviadas a ${ofertados} alumno(s)`,
        total: convocados.rows.length,
        ofertados,
        rechazados: convocados.rows.length - ofertados,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al enviar ofertas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
