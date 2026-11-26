// Rutas de clubes — consulta pública y administración
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, requireClubLeader } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { registrarActividadClub } from '../lib/clubActivity.js';
import { validarParamsEnteros } from '../lib/validarId.js';
import { esImagenPortadaValida } from '../lib/validarUrl.js';

import convocatoriasInscripcion from './convocatoriasInscripcion.js';
import routerCatalogo from './actividades.js';
import { crearRouterConsultaActividad } from '../lib/actividadConsultaRouter.js';

const router = Router();
router.use('/:id/convocatoria', convocatoriasInscripcion);

validarParamsEnteros(router);

// Lista de clubes aptos para exposición pública (H6): sin estatus 3 (inactivo,
// filtro ahora también en servidor) y sin PII del presidente (id y nombre se
// retiran del SELECT público; el detalle público conserva lo que la página de
// club necesita). El panel admin usa GET /admin más abajo.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
              c.cupo_maximo, c.participacion,
              c.imagen_portada,
              c.id_estatus_club, e.nombre_estatus as estatus,
              c.estado_calculado,
              c.formularios_recibidos,
              c.max_postulaciones,
              c.fecha_apertura_programada,
              c.fecha_limite_cierre,
              c.fecha_creacion,
              COALESCE(
                (SELECT COUNT(*) FROM inscripciones i
                 JOIN usuarios u ON u.id_usuario = i.id_usuario
                 WHERE i.id_club = c.id_club
                   AND i.id_estatus_inscripcion = 1
                   AND u.id_rol = 1),
                0
              ) AS cupo_actual
       FROM clubes_con_estado c
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       WHERE c.id_estatus_club <> 3 AND c.estado_publicacion='publicada'
       ORDER BY c.id_club`
    );

    const nivelesResult = await pool.query(
      `SELECT cn.id_club, n.id_nivel, n.nombre_nivel
       FROM clubes_niveles cn
       JOIN cat_niveles n ON n.id_nivel = cn.id_nivel
       ORDER BY cn.id_club, n.id_nivel`
    );
    const nivelesPorClub = new Map();
    for (const fila of nivelesResult.rows) {
      if (!nivelesPorClub.has(fila.id_club)) nivelesPorClub.set(fila.id_club, []);
      nivelesPorClub.get(fila.id_club).push({ id_nivel: fila.id_nivel, nombre_nivel: fila.nombre_nivel });
    }

    const rows = result.rows.map((r) => ({
      ...r,
      cupo_actual: parseInt(r.cupo_actual) || 0,
      formularios_recibidos: parseInt(r.formularios_recibidos) || 0,
      niveles: nivelesPorClub.get(r.id_club) || [],
    }));

    res.json(rows);
  } catch (err) {
    console.error('Error al listar clubes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Bitácora compartida de clubes y actividades, con los permisos existentes.
router.use('/actividad', crearRouterConsultaActividad({ db: pool, autenticar: authenticate }));

// Lista completa para el panel admin (H6): incluye estatus 3 y los campos de
// presidente que el flujo de reasignación usa; requiere rol 3. El público usa
// GET / y no ve esos datos.
router.get('/admin', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
              c.cupo_maximo, c.id_responsable_club, c.participacion, c.lugar_actividades,
              c.estado_publicacion, c.estado_propuesta, c.propuesta,
              p.nombre_completo AS presidente_nombre,
              c.imagen_portada,
              c.id_estatus_club, e.nombre_estatus as estatus,
              EXISTS (SELECT 1 FROM horarios_club h WHERE h.id_club = c.id_club AND COALESCE(TRIM(h.lugar), '') <> '' AND h.hora_fin > h.hora_inicio) AS tiene_horarios_validos,
              c.estado_calculado,
              c.formularios_recibidos,
              c.max_postulaciones,
              c.fecha_apertura_programada,
              c.fecha_limite_cierre,
              c.fecha_creacion,
              COALESCE(
                (SELECT COUNT(*) FROM inscripciones i
                 JOIN usuarios u ON u.id_usuario = i.id_usuario
                 WHERE i.id_club = c.id_club
                   AND i.id_estatus_inscripcion = 1
                   AND u.id_rol = 1),
                0
              ) AS cupo_actual
       FROM clubes_con_estado c
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       LEFT JOIN usuarios p ON p.id_usuario = c.id_responsable_club
       ORDER BY c.id_club`
    );

    const nivelesResult = await pool.query(
      `SELECT cn.id_club, n.id_nivel, n.nombre_nivel
       FROM clubes_niveles cn
       JOIN cat_niveles n ON n.id_nivel = cn.id_nivel
       ORDER BY cn.id_club, n.id_nivel`
    );
    const nivelesPorClub = new Map();
    for (const fila of nivelesResult.rows) {
      if (!nivelesPorClub.has(fila.id_club)) nivelesPorClub.set(fila.id_club, []);
      nivelesPorClub.get(fila.id_club).push({ id_nivel: fila.id_nivel, nombre_nivel: fila.nombre_nivel });
    }

    const rows = result.rows.map((r) => ({
      ...r,
      cupo_actual: parseInt(r.cupo_actual) || 0,
      formularios_recibidos: parseInt(r.formularios_recibidos) || 0,
      niveles: nivelesPorClub.get(r.id_club) || [],
    }));

    res.json(rows);
  } catch (err) {
    console.error('Error al listar clubes (admin):', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtiene un club por ID con su cupo actual (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // H6b: el detalle público no expone el correo del presidente (sin consumidores
    // en frontend) ni el id del vicepresidente (el panel presidente lo toma de getMe).
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria, c.participacion,
              c.cupo_maximo, c.id_responsable_club,
              p.nombre_completo AS presidente_nombre,
              c.imagen_portada, c.horario,
              c.id_estatus_club, e.nombre_estatus as estatus,
              c.estado_calculado,
              c.formularios_recibidos,
              c.max_postulaciones, c.postulaciones_actuales,
              c.fecha_apertura_programada, c.fecha_limite_cierre,
              c.fecha_creacion,
              COALESCE(
                (SELECT COUNT(*) FROM inscripciones i
                 JOIN usuarios u ON u.id_usuario = i.id_usuario
                 WHERE i.id_club = c.id_club
                   AND i.id_estatus_inscripcion = 1
                   AND u.id_rol = 1),
                0
              ) AS cupo_actual
       FROM clubes_con_estado c
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       LEFT JOIN usuarios p ON p.id_usuario = c.id_responsable_club
       WHERE c.id_club = $1 AND c.estado_publicacion='publicada' AND c.id_estatus_club<>3`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const club = result.rows[0];
    club.cupo_actual = parseInt(club.cupo_actual) || 0;
    club.formularios_recibidos = parseInt(club.formularios_recibidos) || 0;

    const nivelesResult = await pool.query(
      `SELECT n.id_nivel, n.nombre_nivel
       FROM clubes_niveles cn
       JOIN cat_niveles n ON n.id_nivel = cn.id_nivel
       WHERE cn.id_club = $1
       ORDER BY n.id_nivel`,
      [id]
    );
    club.niveles = nivelesResult.rows;

    res.json(club);
  } catch (err) {
    console.error('Error al obtener club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambia el estatus de un club (solo admin)
router.put('/:id/estatus', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_estatus_club, password } = req.body;

    if (![1, 2, 3].includes(id_estatus_club)) {
      return res.status(400).json({ error: 'Estatus inválido' });
    }


    const result = await pool.query(
      `UPDATE clubes_operativos SET id_estatus_club = $1 WHERE id_club = $2
       RETURNING id_club, nombre_club, id_estatus_club`,
      [id_estatus_club, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const estatusResult = await pool.query(
      'SELECT nombre_estatus FROM cat_estatus_clubes WHERE id_estatus_club = $1',
      [id_estatus_club]
    );

    const estatusMap = { 1: 'Activo', 2: 'Próximamente', 3: 'Inactivo' };
    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'cambio_estatus_club',
      descripcion: `${req.user.nombre_completo} cambió el estatus del club ID ${id} a ${estatusMap[id_estatus_club] || 'desconocido'}`,
      entidadTipo: 'club',
      entidadId: parseInt(id),
      detalles: { id_estatus_club_nuevo: id_estatus_club },
    });

    res.json({
      ...result.rows[0],
      estatus: estatusResult.rows[0]?.nombre_estatus || 'desconocido',
    });
  } catch (err) {
    console.error('Error al cambiar estatus del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista los miembros inscritos en un club (autenticado)
router.get('/:id/miembros', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol, i.fecha_inscripcion
       FROM inscripciones i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE i.id_club = $1 AND i.id_estatus_inscripcion = 1
       ORDER BY i.fecha_inscripcion`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar miembros:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Compatibilidad: las escrituras anteriores usan la misma validación y revisión.
function guardarClubCatalogo(req,res,next) {
  const urlAnterior=req.url;
  const datos=req.body;
  if(!esImagenPortadaValida(datos.imagen_portada)) return res.status(400).json({error:'La imagen de portada debe ser una dirección HTTP o HTTPS válida o una ruta /uploads/'});
  req.body={...datos,tipo:'club',nombre:datos.nombre_club,url_imagen:datos.imagen_portada};
  req.url='/gestion/actividades'+(req.params.id ? '/'+req.params.id : '');
  const responder=res.json;
  res.json=function(datos){res.json=responder;return this.json(datos?.id_actividad ? {...datos,nombre_club:datos.nombre,imagen_portada:datos.url_imagen} : datos);};
  routerCatalogo(req,res,(error)=>{req.url=urlAnterior;res.json=responder;next(error);});
}
router.post('/',authenticate,requireRole(ROL_ADMIN,ROL_COORDINACION),guardarClubCatalogo);
router.put('/:id',authenticate,requireRole(ROL_ADMIN,ROL_COORDINACION),guardarClubCatalogo);

// Admin puede cerrar una convocatoria publicada.
router.post('/:id/cerrar-convocatoria', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const club = await client.query(
      'SELECT nombre_club, id_convocatoria_inscripcion_actual FROM clubes_operativos WHERE id_club = $1 FOR UPDATE',
      [id],
    );
    if (club.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });
    }
    await client.query(
      `UPDATE convocatorias_inscripcion SET cerrada_manualmente = TRUE
       WHERE id_convocatoria_inscripcion = $1 AND id_club = $2`,
      [club.rows[0].id_convocatoria_inscripcion_actual, id],
    );
    await client.query('COMMIT');

    const nombreClub = club.rows[0].nombre_club;
    registrarActividadClub({
      tipo_evento: 'convocatoria_cerrada',
      id_club: Number(id),
      id_actor: req.user.id,
      descripcion: `${nombreClub} cerró la convocatoria manualmente`,
      detalles: {},
    });

    const result = await pool.query(
      `SELECT c.estado_calculado, c.max_postulaciones, c.postulaciones_actuales,
              c.fecha_apertura_programada, c.fecha_limite_cierre,
              c.formularios_recibidos
       FROM clubes_con_estado c
       WHERE c.id_club = $1`,
      [id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al cerrar convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally { client.release(); }
});

// Asigna o remueve vicepresidente del club (solo presidente)
router.put('/:id/vicepresidente', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.body;

    const club = await pool.query(
      'SELECT id_club, id_vicepresidente FROM clubes_operativos WHERE id_club = $1 AND id_responsable_club = $2',
      [id, req.user.id]
    );
    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado o no eres el presidente' });
    }

    if (id_usuario) {
      const miembro = await pool.query(
        'SELECT id_usuario FROM inscripciones WHERE id_club = $1 AND id_usuario = $2 AND id_estatus_inscripcion = 1',
        [id, id_usuario]
      );
      if (miembro.rows.length === 0) {
        return res.status(400).json({ error: 'El usuario no es miembro activo de este club' });
      }
    }

    const result = await pool.query(
      `UPDATE clubes_operativos SET id_vicepresidente = $1 WHERE id_club = $2
       RETURNING id_club, id_vicepresidente`,
      [id_usuario || null, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al asignar vicepresidente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Historial de membresía del club (altas y bajas)
router.get('/:id/historial-membresia', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         i.id_inscripcion,
         i.id_usuario,
         u.nombre_completo,
         u.correo_institucional,
         i.fecha_inscripcion,
         i.fecha_baja,
         i.id_estatus_inscripcion,
         e.nombre_estatus
       FROM inscripciones i
       JOIN usuarios u ON u.id_usuario = i.id_usuario
       JOIN cat_estatus_inscripciones e ON e.id_estatus_inscripcion = i.id_estatus_inscripcion
       WHERE i.id_club = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial de membresía:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
