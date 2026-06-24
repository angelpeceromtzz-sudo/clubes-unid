import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

const LIMITE_POSTULACIONES = 3;

const ESTATUS_VALIDOS = ['Pendiente', 'En revisión', 'Preseleccionado', 'Convocado', 'Admitido', 'Rechazado'];
const ESTATUS_FLUJO = {
  'Pendiente': ['En revisión', 'Rechazado'],
  'En revisión': ['Preseleccionado', 'Rechazado'],
  'Preseleccionado': ['Convocado', 'Rechazado'],
  'Convocado': ['Admitido', 'Rechazado'],
  'Admitido': [],
  'Rechazado': [],
  'Aceptado': ['Rechazado'],
};

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
    const result = await pool.query(
      `SELECT f.id_formulario, f.id_club, f.bloque_asignado, f.status,
              f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno,
              f.fecha_envio, c.nombre_club, c.categoria,
              c.imagen_portada,
              (SELECT json_agg(json_build_object(
                'id_convocatoria', cv.id_convocatoria,
                'fecha', cv.fecha,
                'hora', cv.hora,
                'lugar', cv.lugar,
                'descripcion', cv.descripcion
              )) FROM convocatorias cv WHERE cv.id_formulario = f.id_formulario) AS convocatorias
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
    const {
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

    if (!id_club || !nombre_completo || !matricula || !carrera || !cuatrimestre || !turno || !telefono_contacto || !motivo_ingreso) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar llenos' });
    }

    const clubValido = await pool.query(
      'SELECT cupo_maximo, id_estatus_club FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (clubValido.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (clubValido.rows[0].id_estatus_club !== 1) {
      return res.status(400).json({ error: 'El club no está disponible para inscripciones' });
    }

    const activa = await pool.query(
      `SELECT id_inscripcion FROM inscripciones
       WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
       LIMIT 1`,
      [req.user.id],
    );

    if (activa.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una inscripción activa en un club' });
    }

    const duplicado = await pool.query(
      `SELECT id_formulario FROM formularios
       WHERE id_alumno = $1 AND id_club = $2`,
      [req.user.id, id_club],
    );

    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: 'Ya enviaste un formulario para este club' });
    }

    const totalFormularios = await pool.query(
      'SELECT COUNT(*) as total FROM formularios WHERE id_alumno = $1',
      [req.user.id],
    );

    if (parseInt(totalFormularios.rows[0].total, 10) >= LIMITE_POSTULACIONES) {
      return res.status(400).json({
        error: `Has alcanzado el límite de ${LIMITE_POSTULACIONES} postulaciones`,
      });
    }

    const result = await pool.query(
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

    res.status(201).json({
      message: 'Formulario enviado correctamente',
      formulario: result.rows[0],
    });
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
      `SELECT id_formulario, id_alumno, id_club, fecha_envio, bloque_asignado,
              nombre_completo, matricula, carrera, cuatrimestre, turno,
              telefono_contacto, motivo_ingreso, experiencia_previa, status
       FROM formularios
       WHERE id_club = $1
       ORDER BY fecha_envio DESC`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener formularios del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualiza el estatus de un formulario (nuevo flujo de estatus)
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

    const result = await pool.query(
      'UPDATE formularios SET status = $1 WHERE id_formulario = $2 RETURNING *',
      [status, id],
    );

    // Crear notificación personal para el alumno
    try {
      const mensajesNotificacion = {
        'En revisión': `Tu postulación en "${form.nombre_club}" está siendo revisada por el presidente.`,
        'Preseleccionado': `¡Felicidades! Has sido preseleccionado en "${form.nombre_club}". Pronto recibirás más información.`,
        'Convocado': `Has sido convocado a una reunión/entrevista para "${form.nombre_club}". Revisa los detalles en tus postulaciones.`,
        'Admitido': `¡Felicidades! Has sido admitido en "${form.nombre_club}". Bienvenido al club.`,
        'Rechazado': `Tu postulación en "${form.nombre_club}" ha sido rechazada. No te desanimes, hay más oportunidades.`,
      };

      if (mensajesNotificacion[status]) {
        await pool.query(
          `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club)
           VALUES ($1, $2, $3, 'alumnos', NULL)`,
          [
            req.user.id,
            `Estatus actualizado: ${status}`,
            mensajesNotificacion[status],
          ],
        );
      }
    } catch (notifErr) {
      console.error('Error al crear notificación de cambio de estatus:', notifErr);
    }

    // Si es Admitido, crear automáticamente la inscripción
    if (status === 'Admitido') {
      try {
        const inscripcionActiva = await pool.query(
          `SELECT id_inscripcion FROM inscripciones
           WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
           LIMIT 1`,
          [form.id_alumno],
        );

        if (inscripcionActiva.rows.length === 0) {
          await pool.query(
            `INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
             VALUES ($1, $2, 1)`,
            [form.id_alumno, form.id_club],
          );
        }
      } catch (inscErr) {
        console.error('Error al crear inscripción automática:', inscErr);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar estatus del formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignar manualmente un bloque a un formulario (presidente)
router.put('/:id/bloque', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { bloque } = req.body;

    if (!['A', 'B', 'E'].includes(bloque)) {
      return res.status(400).json({ error: 'Bloque inválido. Debe ser A, B o E' });
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
      'UPDATE formularios SET bloque_asignado = $1 WHERE id_formulario = $2 RETURNING *',
      [bloque, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al asignar bloque:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
