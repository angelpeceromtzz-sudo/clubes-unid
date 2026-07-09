import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

const LIMITE_POSTULACIONES = 3;
const DIAS_VIGENCIA_OFERTA = 3;

const ESTATUS_VALIDOS = [
  'En revisión', 'Preseleccionado', 'Convocado',
  'Oferta enviada', 'Miembro oficial', 'Rechazado',
];

const ESTATUS_FLUJO = {
  'En revisión': ['Preseleccionado', 'Rechazado'],
  'Preseleccionado': ['Convocado', 'Rechazado'],
  'Convocado': ['Oferta enviada', 'Rechazado'],
  'Oferta enviada': [],
  'Miembro oficial': [],
  'Rechazado': [],
};

// DEBUG: endpoint sin auth para inspeccionar datos reales (SOLO LOCAL)
router.get('/debug-postulaciones', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id_formulario, f.id_club, f.id_alumno, f.bloque_asignado, f.status,
              f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno,
              f.fecha_envio, f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta,
              c.nombre_club, c.categoria,
              c.imagen_portada
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       ORDER BY f.id_alumno, f.fecha_envio DESC`
    );
    res.json({
      total: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Devuelve los id_club a los que el alumno ya envió formulario
router.get('/', authenticate, requireRole(1), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_club FROM formularios WHERE id_alumno = $1',
      [req.user.id],
    );
    res.json(result.rows.map((r) => r.id_club));
  } catch (err) {
    console.error('Error al obtener formularios del alumno:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve todas las postulaciones del alumno con datos completos
router.get('/mis-postulaciones', authenticate, requireRole(1), async (req, res) => {
  try {
    // 1. Expiracion on-read: marcar ofertas vencidas (>72h)
    await pool.query(
      `UPDATE formularios
       SET status = 'Rechazado', motivo_rechazo = 'Oferta expirada (72h)'
       WHERE id_alumno = $1
         AND status = 'Oferta enviada'
         AND fecha_expiracion < NOW()`,
      [req.user.id],
    );

    // 2. Obtener postulaciones completas
    const result = await pool.query(
      `SELECT f.id_formulario, f.id_club, f.bloque_asignado, f.status,
              f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno,
              f.fecha_envio, f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta,
              c.nombre_club, c.categoria,
              c.imagen_portada,
              (SELECT row_to_json(datos) FROM (
                SELECT cv.id_convocatoria, cv.bloque, cv.fecha, cv.hora, cv.lugar
                FROM convocatorias cv WHERE cv.id_convocatoria = f.id_convocatoria
              ) AS datos) AS convocatoria,
              (SELECT json_agg(json_build_object(
                'status_anterior', hp.status_anterior,
                'status_nuevo', hp.status_nuevo,
                'fecha_cambio', hp.fecha_cambio
              ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       WHERE f.id_alumno = $1
       ORDER BY f.fecha_envio DESC`,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener postulaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, requireRole(1), async (req, res) => {
  try {
    let {
      id_club,
      nombre_completo,
      matricula,
      carrera,
      cuatrimestre,
      turno,
      telefono_contacto,
      motivo_ingreso,
      experiencia_previa,
    } = req.body;

    const userDb = await pool.query(
      'SELECT institutional_id FROM usuarios WHERE id_usuario = $1',
      [req.user.id],
    );
    const institutionalIdDb = userDb.rows[0]?.institutional_id;
    if (institutionalIdDb) {
      matricula = institutionalIdDb;
    }

    if (!id_club || !nombre_completo || !matricula || !carrera || !cuatrimestre || !turno || !telefono_contacto || !motivo_ingreso) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar llenos' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validaciones iniciales fuera de la transacción (no requieren lock)
      const existente = await pool.query(
        'SELECT id_club, id_estatus_club FROM clubes WHERE id_club = $1',
        [id_club],
      );
      if (existente.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'El club no existe' });
      }
      if (existente.rows[0].id_estatus_club !== 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El club no está disponible para inscripciones' });
      }

      // Lock atómico: evitar race conditions en el límite
      const clubRow = await client.query(
        `SELECT estado_convocatoria, max_postulaciones, postulaciones_actuales
         FROM clubes WHERE id_club = $1 FOR UPDATE`,
        [id_club],
      );
      const club = clubRow.rows[0];

      if (club.estado_convocatoria !== 'abierta') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La convocatoria de este club está cerrada. No se aceptan nuevas postulaciones.' });
      }

      const maxPost = club.max_postulaciones;
      const actuales = club.postulaciones_actuales;
      if (maxPost !== null && actuales >= maxPost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Este club ha alcanzado el límite de postulaciones. La convocatoria está cerrada.' });
      }

      const activa = await client.query(
        `SELECT id_inscripcion FROM inscripciones
         WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
         LIMIT 1`,
        [req.user.id],
      );
      if (activa.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ya tienes una inscripción activa en un club' });
      }

      const duplicado = await client.query(
        `SELECT id_formulario FROM formularios
         WHERE id_alumno = $1 AND id_club = $2`,
        [req.user.id, id_club],
      );
      if (duplicado.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ya enviaste un formulario para este club' });
      }

      const totalFormularios = await client.query(
        'SELECT COUNT(*) as total FROM formularios WHERE id_alumno = $1',
        [req.user.id],
      );
      if (parseInt(totalFormularios.rows[0].total, 10) >= LIMITE_POSTULACIONES) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Has alcanzado el límite de ${LIMITE_POSTULACIONES} postulaciones` });
      }

      const result = await client.query(
        `INSERT INTO formularios (id_alumno, id_club, bloque_asignado,
          nombre_completo, matricula, carrera, cuatrimestre, turno,
          telefono_contacto, motivo_ingreso, experiencia_previa)
         VALUES ($1, $2, DEFAULT, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          req.user.id,
          id_club,
          nombre_completo,
          matricula,
          carrera,
          cuatrimestre,
          turno,
          telefono_contacto,
          motivo_ingreso,
          experiencia_previa || '',
        ],
      );

      const nuevasActuales = actuales + 1;
      if (maxPost !== null && nuevasActuales >= maxPost) {
        await client.query(
          `UPDATE clubes
           SET postulaciones_actuales = postulaciones_actuales + 1,
               estado_convocatoria = 'cerrada_por_limite'
           WHERE id_club = $1`,
          [id_club],
        );
      } else {
        await client.query(
          `UPDATE clubes SET postulaciones_actuales = postulaciones_actuales + 1 WHERE id_club = $1`,
          [id_club],
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Formulario enviado correctamente',
        formulario: result.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al crear formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve todos los formularios de un club (solo para el presidente de ese club)
router.get('/pendientes/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `SELECT f.id_formulario, f.id_alumno, f.id_club, f.fecha_envio, f.bloque_asignado,
              f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno,
              f.telefono_contacto, f.motivo_ingreso, f.experiencia_previa, f.status,
              f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta, f.motivo_rechazo,
              (SELECT json_agg(json_build_object(
                'status_anterior', hp.status_anterior,
                'status_nuevo', hp.status_nuevo,
                'fecha_cambio', hp.fecha_cambio
              ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       WHERE f.id_club = $1
         AND f.status NOT IN ('Miembro oficial', 'Rechazado')
       ORDER BY f.fecha_envio DESC`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener formularios del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve TODOS los formularios de un club (incluyendo Miembro oficial y Rechazado)
// con el historial de cambios, solo para el presidente de ese club
router.get('/todos/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `SELECT f.id_formulario, f.id_alumno, f.id_club, f.fecha_envio, f.bloque_asignado,
              f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno,
              f.telefono_contacto, f.motivo_ingreso, f.experiencia_previa, f.status,
              f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta, f.motivo_rechazo,
              (SELECT json_agg(json_build_object(
                'status_anterior', hp.status_anterior,
                'status_nuevo', hp.status_nuevo,
                'fecha_cambio', hp.fecha_cambio
              ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       WHERE f.id_club = $1
       ORDER BY f.fecha_envio DESC`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener todos los formularios del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualiza el estatus de un formulario (presidente — transiciones individuales)
router.put('/:id/estatus', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ESTATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `Estatus inválido. Debe ser uno de: ${ESTATUS_VALIDOS.join(', ')}` });
    }

    const formulario = await pool.query(
      `SELECT f.*, c.id_presidente, c.nombre_club
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       WHERE f.id_formulario = $1`,
      [id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe' });
    }

    const form = formulario.rows[0];

    if (form.id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const transicionesPermitidas = ESTATUS_FLUJO[form.status];
    if (!transicionesPermitidas || !transicionesPermitidas.includes(status)) {
      return res.status(400).json({
        error: `No puedes cambiar de "${form.status}" a "${status}". Transiciones permitidas: ${(transicionesPermitidas || ['ninguna']).join(', ')}`,
      });
    }

    if (status === 'Rechazado') {
      await pool.query(
        `UPDATE formularios
         SET status = $1,
             motivo_rechazo = 'Rechazado por el presidente'
         WHERE id_formulario = $2`,
        [status, id],
      );
    } else {
      await pool.query(
        'UPDATE formularios SET status = $1 WHERE id_formulario = $2',
        [status, id],
      );
    }

    // Notificación personal
    try {
      const mensajesNotificacion = {
        'Preseleccionado': `Has sido preseleccionado en "${form.nombre_club}". Pronto recibirás una convocatoria.`,
        'Rechazado': `Tu postulación en "${form.nombre_club}" ha sido rechazada.`,
      };

      if (mensajesNotificacion[status]) {
        await pool.query(
          `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
           VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
          [
            req.user.id,
            `Estatus actualizado: ${status}`,
            mensajesNotificacion[status],
            form.id_club,
            form.id_alumno,
          ],
        );
      }
    } catch (notifErr) {
      console.error('Error al crear notificación:', notifErr);
    }

    const actualizado = await pool.query(
      'SELECT * FROM formularios WHERE id_formulario = $1',
      [id],
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error('Error al actualizar estatus del formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignar bloque a un formulario (presidente)
router.put('/:id/bloque', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { bloque } = req.body;

    if (!bloque || !/^[A-Z]$/.test(bloque)) {
      return res.status(400).json({ error: 'Bloque inválido. Debe ser una letra A-Z.' });
    }

    const formulario = await pool.query(
      `SELECT f.*, c.id_presidente
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       WHERE f.id_formulario = $1`,
      [id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe' });
    }

    if (formulario.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `UPDATE formularios SET bloque_asignado = $1 WHERE id_formulario = $2 RETURNING *`,
      [bloque, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al asignar bloque:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Seleccionar ofertas finales para alumnos aprobados
router.post('/seleccionar', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club, aceptados } = req.body;
    if (!id_club || !Array.isArray(aceptados)) {
      return res.status(400).json({ error: 'id_club y aceptados[] son obligatorios' });
    }

    const club = await pool.query(
      'SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1',
      [id_club],
    );
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const convocados = await client.query(
        `SELECT id_formulario, id_alumno, nombre_completo
         FROM formularios
         WHERE id_club = $1 AND status = 'Convocado'`,
        [id_club],
      );

      let seleccionados = 0;
      for (const form of convocados.rows) {
        if (aceptados.includes(form.id_formulario)) {
          await client.query(
            `UPDATE formularios SET status = 'Oferta enviada', fecha_oferta = NOW(),
                fecha_expiracion = NOW() + INTERVAL '3 days'
             WHERE id_formulario = $1`,
            [form.id_formulario],
          );
          seleccionados++;
        } else {
          await client.query(
            `UPDATE formularios SET status = 'Rechazado',
                motivo_rechazo = 'No seleccionado en la evaluación final'
             WHERE id_formulario = $1`,
            [form.id_formulario],
          );
        }
      }

      await client.query('COMMIT');
      res.json({
        mensaje: `Selección finalizada: ${seleccionados} alumno(s) recibirán oferta`,
        total: convocados.rows.length,
        seleccionados,
        rechazados: convocados.rows.length - seleccionados,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en selección:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve todas las ofertas de ingreso enviadas a postulantes del club (presidente)
router.get('/ofertas/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `SELECT f.id_formulario, f.id_alumno, f.nombre_completo, f.matricula,
              f.status, f.fecha_oferta, f.fecha_respuesta, f.fecha_expiracion,
              f.motivo_rechazo
       FROM formularios f
       WHERE f.id_club = $1
         AND (f.status = 'Oferta enviada'
              OR f.status = 'Miembro oficial'
              OR (f.status = 'Rechazado'
                  AND f.motivo_rechazo IN ('Oferta rechazada por el alumno', 'Oferta expirada (72h)')))
       ORDER BY f.fecha_oferta DESC NULLS LAST`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial de ofertas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
