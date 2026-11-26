import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, requireClubLeader } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { calcularEstadoClub } from '../lib/estadoClub.js';
import { limitadorFormularios } from '../lib/rateLimits.js';
import { validarParamsEnteros } from '../lib/validarId.js';

const router = Router();

validarParamsEnteros(router);

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
  'Oferta enviada': ['Rechazado'],
  'Miembro oficial': [],
  'Rechazado': [],
};

// DEBUG: endpoint de inspección. Restringido a administradores para evitar fugas en producción.
router.get('/debug-postulaciones', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id_formulario, f.id_club, f.id_alumno, f.bloque_asignado, f.status,
              f.nombre_completo, f.matricula, l.nombre AS carrera, f.cuatrimestre,
               f.fecha_envio, f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta,
               c.nombre_club, c.categoria,
               c.imagen_portada
        FROM formularios f
        JOIN clubes_operativos c ON c.id_club = f.id_club
        LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
        ORDER BY f.id_alumno, f.fecha_envio DESC`
    );
    res.json({
      total: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    // H14: err.message (detalle interno de PostgreSQL) ya no se devuelve al
    // cliente; queda el log en el servidor y la respuesta genérica.
    console.error('Error al listar debug-postulaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve los id_club a los que el alumno ya envió formulario
router.get('/', authenticate, requireRole(1), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT f.id_club
       FROM formularios f
       JOIN clubes_operativos c ON c.id_club = f.id_club
       WHERE f.id_alumno = $1
         AND f.id_convocatoria_inscripcion = c.id_convocatoria_inscripcion_actual`,
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
              f.nombre_completo, f.matricula, l.nombre AS carrera, f.cuatrimestre,
               f.fecha_envio, f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta,
               c.nombre_club, c.categoria,
               c.imagen_portada, c.id_estatus_club,
               (SELECT row_to_json(datos) FROM (
                 SELECT cv.id_convocatoria, cv.bloque, cv.fecha, cv.hora, cv.lugar
                 FROM convocatorias cv
                 WHERE cv.id_convocatoria = f.id_convocatoria AND c.id_estatus_club = 1
               ) AS datos) AS convocatoria,
               (SELECT json_agg(json_build_object(
                 'status_anterior', hp.status_anterior,
                 'status_nuevo', hp.status_nuevo,
                 'fecha_cambio', hp.fecha_cambio
               ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       JOIN clubes_operativos c ON c.id_club = f.id_club
       LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
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

// 5 postulaciones/hora por usuario autenticado (H5a): complementa el límite
// de negocio de 3 postulaciones por convocatoria y frena el spam automatizado
// desde una cuenta real. IP no sirve como clave por el NAT del campus.
router.post('/', authenticate, requireRole(1), limitadorFormularios, async (req, res) => {
  try {
    let {
      id_club,
      nombre_completo,
      matricula,
      id_licenciatura,
      cuatrimestre,
      telefono_contacto,
      motivo_ingreso,
      experiencia_previa,
      respuestas_extra = {},
    } = req.body;

    if (!respuestas_extra || typeof respuestas_extra !== 'object' || Array.isArray(respuestas_extra)) {
      return res.status(400).json({ error: 'Las respuestas adicionales deben tener formato de objeto' });
    }

    // No confío en la matrícula que viene del frontend. Si el usuario
    // tiene institutional_id en la base de datos, uso ese valor, sin
    // importar lo que el cliente haya enviado. Esto evita que alguien
    // se registre con una matrícula que no es la suya. Tampoco confío
    // en el JWT por si está cacheado — hago una consulta fresca a la DB.
    const userDb = await pool.query(
      'SELECT institutional_id FROM usuarios WHERE id_usuario = $1',
      [req.user.id],
    );
    const institutionalIdDb = userDb.rows[0]?.institutional_id;
    if (institutionalIdDb) {
      matricula = institutionalIdDb;
    }

    if (!id_club || !nombre_completo || !matricula || !id_licenciatura || !cuatrimestre || !telefono_contacto || !motivo_ingreso) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar llenos' });
    }

    // La carrera dejó de ser un VARCHAR libre para ser una FK al catálogo: sin
    // esto cada postulación escribiría su propia variante ('Ing. en Sistemas',
    // 'Ingeniería en Sistemas', ...) y después no se puede filtrar por programa.
    // Mismo motivo que con la matrícula: no confío en el id que manda el cliente.
    id_licenciatura = Number(id_licenciatura);
    if (!Number.isInteger(id_licenciatura) || id_licenciatura <= 0) {
      return res.status(400).json({ error: 'Selecciona una licenciatura válida' });
    }

    const licenciaturaValida = await pool.query(
      'SELECT id_licenciatura FROM cat_licenciaturas WHERE id_licenciatura = $1',
      [id_licenciatura],
    );
    if (licenciaturaValida.rows.length === 0) {
      return res.status(400).json({ error: 'La licenciatura seleccionada no existe' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validaciones iniciales fuera de la transacción (no requieren lock)
      const existente = await pool.query(
        "SELECT id_club, id_estatus_club FROM clubes_operativos WHERE id_club = $1 AND estado_publicacion='publicada'",
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
        `SELECT id_convocatoria_inscripcion_actual
         FROM clubes_operativos WHERE id_club = $1 FOR UPDATE`,
        [id_club],
      );
      const cicloActual = clubRow.rows[0]?.id_convocatoria_inscripcion_actual;
      const cicloRow = cicloActual
        ? await client.query(
          `SELECT fecha_apertura_programada, fecha_limite_cierre, max_postulaciones, cerrada_manualmente
           FROM convocatorias_inscripcion
           WHERE id_convocatoria_inscripcion = $1 AND id_club = $2
           FOR UPDATE`,
          [cicloActual, id_club],
        )
        : { rows: [] };
      const ciclo = cicloRow.rows[0] || {};
      const maxPost = ciclo.max_postulaciones;
      const conteoActual = await client.query(
        `SELECT COUNT(*)::int AS total FROM formularios
         WHERE id_club = $1 AND id_convocatoria_inscripcion = $2`,
        [id_club, cicloActual],
      );
      const actuales = conteoActual.rows[0].total;

      const estadoCalculado = calcularEstadoClub({
        cerradaManualmente: ciclo.cerrada_manualmente === true,
        fechaAperturaProgramada: ciclo.fecha_apertura_programada,
        fechaLimiteCierre: ciclo.fecha_limite_cierre,
        maxPostulaciones: maxPost,
        postulacionesActuales: actuales,
      });

      if (estadoCalculado !== 'abierto' || !cicloActual) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La convocatoria de este club no está abierta. No se aceptan nuevas postulaciones.' });
      }

      // La lista se consulta dentro de la transacción y se bloquea mientras se
      // guarda la postulación: no aceptamos IDs inexistentes, de otro club o
      // preguntas que dejaron de estar activas.
      const preguntasActivas = await client.query(
        `SELECT id_pregunta, etiqueta, tipo, configuracion, obligatorio
         FROM club_formulario_preguntas
         WHERE id_club = $1 AND activo = TRUE
         ORDER BY id_pregunta
         FOR SHARE`,
        [id_club],
      );
      const preguntasPorId = new Map(preguntasActivas.rows.map((pregunta) => [String(pregunta.id_pregunta), pregunta]));
      for (const [clave, valor] of Object.entries(respuestas_extra)) {
        const pregunta = preguntasPorId.get(clave);
        if (!/^\d+$/.test(clave) || !pregunta) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La pregunta ${clave} no existe, no pertenece al club o ya no está activa` });
        }
        if (valor !== null && typeof valor !== 'string' && typeof valor !== 'number') {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La respuesta para "${pregunta.etiqueta}" no es válida` });
        }
        const texto = valor == null ? '' : String(valor).trim();
        if (pregunta.obligatorio && !texto) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Responde la pregunta obligatoria: ${pregunta.etiqueta}` });
        }
        if (!texto) continue;
        if (pregunta.tipo === 'seleccion' && !(pregunta.configuracion?.opciones || []).includes(texto)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La respuesta para "${pregunta.etiqueta}" no está entre las opciones permitidas` });
        }
        if (pregunta.tipo === 'numero') {
          const numero = Number(texto);
          if (!Number.isFinite(numero)
              || (pregunta.configuracion?.min != null && numero < Number(pregunta.configuracion.min))
              || (pregunta.configuracion?.max != null && numero > Number(pregunta.configuracion.max))) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `La respuesta numérica para "${pregunta.etiqueta}" está fuera del rango permitido` });
          }
        }
        if (pregunta.tipo === 'fecha' && !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `La fecha para "${pregunta.etiqueta}" no es válida` });
        }
      }
      for (const pregunta of preguntasActivas.rows) {
        const respuesta = respuestas_extra[pregunta.id_pregunta];
        if (pregunta.obligatorio && (respuesta == null || String(respuesta).trim() === '')) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Responde la pregunta obligatoria: ${pregunta.etiqueta}` });
        }
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
         WHERE id_alumno = $1 AND id_club = $2 AND id_convocatoria_inscripcion = $3`,
        [req.user.id, id_club, cicloActual],
      );
      if (duplicado.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ya enviaste un formulario para este club' });
      }

      // Limpiar ofertas expiradas antes de contar (lazy expiry)
      await client.query(
        `UPDATE formularios
         SET status = 'Rechazado', motivo_rechazo = 'Oferta expirada (72h)'
         WHERE id_alumno = $1
           AND status = 'Oferta enviada'
           AND fecha_expiracion < NOW()`,
        [req.user.id],
      );

      const totalFormularios = await client.query(
        `SELECT COUNT(*) as total FROM formularios
         WHERE id_alumno = $1
           AND status NOT IN ('Miembro oficial', 'Rechazado')`,
        [req.user.id],
      );
      if (parseInt(totalFormularios.rows[0].total, 10) >= LIMITE_POSTULACIONES) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Has alcanzado el límite de ${LIMITE_POSTULACIONES} postulaciones` });
      }

      const result = await client.query(
        `INSERT INTO formularios (id_alumno, id_club, id_convocatoria_inscripcion, bloque_asignado,
          nombre_completo, matricula, id_licenciatura, cuatrimestre,
          telefono_contacto, motivo_ingreso, experiencia_previa)
         VALUES ($1, $2, $3, DEFAULT, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          req.user.id,
          id_club,
          cicloActual,
          nombre_completo,
          matricula,
          id_licenciatura,
          cuatrimestre,
          telefono_contacto,
          motivo_ingreso,
          experiencia_previa || '',
        ],
      );

      for (const pregunta of preguntasActivas.rows) {
        const respuesta = respuestas_extra[pregunta.id_pregunta];
        if (respuesta == null || String(respuesta).trim() === '') continue;
        const valor = pregunta.tipo === 'numero' ? Number(respuesta) : String(respuesta);
        await client.query(
          `INSERT INTO formulario_respuestas_extra
             (id_formulario, id_pregunta, id_club, etiqueta_snapshot, tipo_snapshot, configuracion_snapshot, respuesta)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [result.rows[0].id_formulario, pregunta.id_pregunta, Number(id_club), pregunta.etiqueta,
            pregunta.tipo, JSON.stringify(pregunta.configuracion), JSON.stringify(valor)],
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
    if (err.code === '23505' && err.constraint === 'uq_formulario_alumno_club_ciclo') {
      return res.status(409).json({ error: 'Ya enviaste un formulario para este club en este ciclo' });
    }
    console.error('Error al crear formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve todos los formularios de un club (solo para el presidente de ese club)
router.get('/pendientes/:id_club', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_club FROM clubes_operativos WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    const result = await pool.query(
      `SELECT f.id_formulario, f.id_alumno, f.id_club, f.fecha_envio, f.bloque_asignado,
f.nombre_completo, f.matricula, l.nombre AS carrera, f.cuatrimestre,
               f.telefono_contacto, f.motivo_ingreso, f.experiencia_previa,
               (f.respuestas_extra || COALESCE((SELECT jsonb_object_agg(r.id_pregunta::text, r.respuesta)
                 FROM formulario_respuestas_extra r WHERE r.id_formulario = f.id_formulario), '{}'::jsonb)) AS respuestas_extra,
               (SELECT jsonb_object_agg(r.id_pregunta::text, r.etiqueta_snapshot)
                 FROM formulario_respuestas_extra r WHERE r.id_formulario = f.id_formulario) AS respuestas_extra_preguntas,
               f.status,
               f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta, f.motivo_rechazo,
               (SELECT json_agg(json_build_object(
                 'status_anterior', hp.status_anterior,
                 'status_nuevo', hp.status_nuevo,
                 'fecha_cambio', hp.fecha_cambio
               ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       JOIN clubes_operativos c ON c.id_club = f.id_club
       LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
       WHERE f.id_club = $1
         AND f.id_convocatoria_inscripcion = c.id_convocatoria_inscripcion_actual
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
router.get('/todos/:id_club', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_club FROM clubes_operativos WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    const result = await pool.query(
      `SELECT f.id_formulario, f.id_alumno, f.id_club, f.fecha_envio, f.bloque_asignado,
               f.nombre_completo, f.matricula, l.nombre AS carrera, f.cuatrimestre,
               f.telefono_contacto, f.motivo_ingreso, f.experiencia_previa,
               (f.respuestas_extra || COALESCE((SELECT jsonb_object_agg(r.id_pregunta::text, r.respuesta)
                 FROM formulario_respuestas_extra r WHERE r.id_formulario = f.id_formulario), '{}'::jsonb)) AS respuestas_extra,
               (SELECT jsonb_object_agg(r.id_pregunta::text, r.etiqueta_snapshot)
                 FROM formulario_respuestas_extra r WHERE r.id_formulario = f.id_formulario) AS respuestas_extra_preguntas,
               f.status,
               f.fecha_oferta, f.fecha_expiracion, f.fecha_respuesta, f.motivo_rechazo,
               (SELECT json_agg(json_build_object(
                 'status_anterior', hp.status_anterior,
                 'status_nuevo', hp.status_nuevo,
                 'fecha_cambio', hp.fecha_cambio
) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
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
router.put('/:id/estatus', authenticate, requireRole(2, 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Convocar es consecuencia de la aprobación de admin, no una transición manual.
    if (status === 'Convocado') return res.status(409).json({ error: 'El alumno será convocado cuando admin apruebe y publique su convocatoria' });

    if (!ESTATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `Estatus inválido. Debe ser uno de: ${ESTATUS_VALIDOS.join(', ')}` });
    }

    const formulario = await pool.query(
      `SELECT f.*, c.nombre_club, l.nombre AS carrera,
          (SELECT json_agg(json_build_object(
            'status_anterior', hp.status_anterior,
            'status_nuevo', hp.status_nuevo,
            'fecha_cambio', hp.fecha_cambio
          ) ORDER BY hp.fecha_cambio ASC) FROM historial_postulacion hp WHERE hp.id_formulario = f.id_formulario) AS historial
       FROM formularios f
       JOIN clubes_operativos c ON c.id_club = f.id_club
       LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
       WHERE f.id_formulario = $1`,
      [id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe' });
    }

    const form = formulario.rows[0];

    const club = await pool.query(
      'SELECT id_club FROM clubes_operativos WHERE id_club = $1 AND (id_responsable_club = $2 OR id_vicepresidente = $2)',
      [form.id_club, req.user.id]
    );
    if (club.rows.length === 0) {
      return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });
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
      registrarHistorial({
        idAdmin: req.user.id,
        adminNombre: req.user.nombre_completo || 'Sistema',
        accion: 'error_notificacion',
        descripcion: `Error al crear notificación de estatus "${status}" para alumno ID ${form.id_alumno}: ${notifErr.message}`,
        entidadTipo: 'notificacion',
        detalles: { error: notifErr.message, status, id_alumno: form.id_alumno, id_club: form.id_club },
      });
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
router.put('/:id/bloque', authenticate, requireRole(2, 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { bloque } = req.body;

    if (!bloque || !/^[A-Z]$/.test(bloque)) {
      return res.status(400).json({ error: 'Bloque inválido. Debe ser una letra A-Z.' });
    }

    const formulario = await pool.query(
      `SELECT f.*
       FROM formularios f
       WHERE f.id_formulario = $1`,
      [id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe' });
    }

    const form = formulario.rows[0];
    const club = await pool.query(
      'SELECT id_club FROM clubes_operativos WHERE id_club = $1 AND (id_responsable_club = $2 OR id_vicepresidente = $2)',
      [form.id_club, req.user.id]
    );
    if (club.rows.length === 0) {
      return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });
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
router.post('/seleccionar', authenticate, requireRole(2, 5), async (req, res) => {
  try {
    const { id_club, aceptados } = req.body;
    if (!id_club || !Array.isArray(aceptados)) {
      return res.status(400).json({ error: 'id_club y aceptados[] son obligatorios' });
    }

    const club = await pool.query(
      `SELECT id_club, nombre_club, id_convocatoria_inscripcion_actual
       FROM clubes_operativos WHERE id_club = $1 AND (id_responsable_club = $2 OR id_vicepresidente = $2)`,
      [id_club, req.user.id],
    );
    if (club.rows.length === 0) return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const convocados = await client.query(
        `SELECT id_formulario, id_alumno, nombre_completo
         FROM formularios
         WHERE id_club = $1 AND status = 'Convocado'
           AND id_convocatoria_inscripcion = $2`,
        [id_club, club.rows[0].id_convocatoria_inscripcion_actual],
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
router.get('/ofertas/:id_club', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_club FROM clubes_operativos WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
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
