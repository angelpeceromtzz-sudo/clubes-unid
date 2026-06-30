import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.put('/:id/respuesta', authenticate, requireRole(1), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!['aceptar', 'rechazar'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión inválida. Debe ser "aceptar" o "rechazar"' });
    }

    const formulario = await pool.query(
      `SELECT f.*, c.nombre_club
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       WHERE f.id_formulario = $1 AND f.id_alumno = $2`,
      [id, req.user.id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe o no te pertenece' });
    }

    const form = formulario.rows[0];

    if (form.status !== 'Oferta enviada') {
      return res.status(400).json({
        error: `No puedes responder a esta postulación porque su estado actual es "${form.status}"`,
      });
    }

    if (form.fecha_expiracion && new Date(form.fecha_expiracion) < new Date()) {
      await pool.query(
        `UPDATE formularios
         SET status = 'Rechazado', motivo_rechazo = 'Oferta expirada (72h)', fecha_respuesta = NOW()
         WHERE id_formulario = $1`,
        [id],
      );
      return res.status(400).json({ error: 'La oferta ha expirado. Ya no puedes responder.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (decision === 'aceptar') {
        await client.query(
          `UPDATE formularios
           SET status = 'Miembro oficial', fecha_respuesta = NOW()
           WHERE id_formulario = $1`,
          [id],
        );

        const existente = await client.query(
          `SELECT id_inscripcion FROM inscripciones
           WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
           LIMIT 1`,
          [req.user.id],
        );
        if (existente.rows.length === 0) {
          await client.query(
            `INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
             VALUES ($1, $2, 1)`,
            [req.user.id, form.id_club],
          );
        }

        const otrasActivas = await client.query(
          `SELECT id_formulario, id_club, status
           FROM formularios
           WHERE id_alumno = $1
             AND id_formulario != $2
             AND status IN ('Oferta enviada', 'En revisión', 'Preseleccionado', 'Convocado')`,
          [req.user.id, id],
        );

        for (const otra of otrasActivas.rows) {
          await client.query(
            `UPDATE formularios
             SET status = 'Rechazado',
                 motivo_rechazo = 'El alumno aceptó otra oferta',
                 fecha_respuesta = NOW()
             WHERE id_formulario = $1`,
            [otra.id_formulario],
          );

          const clubInfo = await client.query(
            'SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1',
            [otra.id_club],
          );
          if (clubInfo.rows.length > 0) {
            await client.query(
              `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
               VALUES ($1, $2, $3, 'presidente', $4, $5)`,
              [
                req.user.id,
                `Cupo liberado: ${clubInfo.rows[0].nombre_club}`,
                `El alumno aceptó otra oferta. El cupo en "${clubInfo.rows[0].nombre_club}" ha quedado disponible.`,
                otra.id_club,
                clubInfo.rows[0].id_presidente,
              ],
            );
          }
        }

        await client.query(
          `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
           VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
          [
            req.user.id,
            `¡Bienvenido a ${form.nombre_club}!`,
            `¡Felicidades! Has aceptado la oferta de ingreso y ahora eres miembro oficial de "${form.nombre_club}".`,
            form.id_club,
            req.user.id,
          ],
        );
      } else {
        await client.query(
          `UPDATE formularios
           SET status = 'Rechazado', motivo_rechazo = 'Oferta rechazada por el alumno', fecha_respuesta = NOW()
           WHERE id_formulario = $1`,
          [id],
        );

        await client.query(
          `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
           VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
          [
            req.user.id,
            `Oferta rechazada: ${form.nombre_club}`,
            `Has rechazado la oferta de ingreso a "${form.nombre_club}". Puedes seguir explorando otros clubes.`,
            form.id_club,
            req.user.id,
          ],
        );

        const clubPres = await client.query(
          'SELECT id_presidente FROM clubes WHERE id_club = $1',
          [form.id_club],
        );
        if (clubPres.rows.length > 0) {
          await client.query(
            `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
             VALUES ($1, $2, $3, 'presidente', $4, $5)`,
            [
              req.user.id,
              `Cupo liberado: ${form.nombre_club}`,
              `El alumno rechazó la oferta de "${form.nombre_club}". El cupo ha quedado disponible.`,
              form.id_club,
              clubPres.rows[0].id_presidente,
            ],
          );
        }
      }

      await client.query('COMMIT');
      res.json({
        message: decision === 'aceptar'
          ? '¡Bienvenido al club! Has aceptado la oferta de ingreso.'
          : 'Has rechazado la oferta de ingreso.',
        status: decision === 'aceptar' ? 'Miembro oficial' : 'Rechazado',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al responder oferta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
