// Rutas de clubes — consulta pública y administración
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, requireClubLeader } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { registrarActividadClub } from '../lib/clubActivity.js';
import { eliminarImagenCloudinary } from '../lib/eliminarImagenCloudinary.js';
import { esImagenPortadaValida } from '../lib/validarUrl.js';
import { validarParamsEnteros } from '../lib/validarId.js';

import convocatoriasInscripcion from './convocatoriasInscripcion.js';

const CUPOS_CLUB_VALIDOS = [10, 15, 20, 25, 30, 40, 50];


function tieneCaracteresNoPermitidos(texto) {
  if (texto === null || texto === undefined) return false;
  const valor = String(texto).trim();
  if (valor === '') return false;
  return !/^[\p{L}\p{N}\s.,;:!?¿¡()\-'"\/#&]+$/u.test(valor);
}
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
       WHERE c.id_estatus_club <> 3
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

// Actividad de clubes — log de eventos operativos (solo admin/rectoría)
router.get('/actividad', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { desde, hasta, actor, tipo, club } = req.query;

    if (desde && (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || Number.isNaN(Date.parse(desde)))) {
      return res.status(400).json({ error: 'La fecha "desde" no es válida' });
    }
    if (hasta && (!/^\d{4}-\d{2}-\d{2}$/.test(hasta) || Number.isNaN(Date.parse(hasta)))) {
      return res.status(400).json({ error: 'La fecha "hasta" no es válida' });
    }
    if (desde && hasta && desde > hasta) {
      return res.status(400).json({ error: 'El rango de fechas no es válido' });
    }

    const clubId = club ? parseInt(club, 10) : null;
    if (club && (!Number.isFinite(clubId) || clubId <= 0)) {
      return res.status(400).json({ error: 'El club no es válido' });
    }

    const filtrosSql = `
      WHERE ($1::date IS NULL OR a.fecha_creacion >= $1::date)
        AND ($2::date IS NULL OR a.fecha_creacion < ($2::date + INTERVAL '1 day'))
        AND ($3::text IS NULL OR u.nombre_completo ILIKE '%' || $3 || '%')
        AND ($4::text IS NULL OR a.tipo_evento = $4)
        AND ($5::int IS NULL OR a.id_club = $5)
    `;

    const params = [desde || null, hasta || null, actor || null, tipo || null, clubId];

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM actividad_clubes a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_actor
       ${filtrosSql}`,
      params
    );
    const total = countResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const result = await pool.query(
      `SELECT a.id_evento, a.tipo_evento, a.descripcion, a.detalles, a.fecha_creacion,
              c.nombre_club,
              u.nombre_completo AS actor_nombre
       FROM actividad_clubes a
       LEFT JOIN clubes c ON c.id_club = a.id_club
       LEFT JOIN usuarios u ON u.id_usuario = a.id_actor
       ${filtrosSql}
       ORDER BY a.fecha_creacion DESC
       LIMIT $6 OFFSET $7`,
      [...params, limit, offset]
    );

    res.json({ eventos: result.rows, page, totalPages, total });
  } catch (err) {
    console.error('Error al obtener actividad de clubes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Opciones de filtro para actividad de clubes: solo valores con registros.
router.get('/actividad/filtros', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    const actores = await pool.query(
      `SELECT DISTINCT u.id_usuario AS id, u.nombre_completo AS nombre
       FROM actividad_clubes a
       JOIN usuarios u ON u.id_usuario = a.id_actor
       WHERE a.id_actor IS NOT NULL
       ORDER BY u.nombre_completo ASC`
    );
    const tipos = await pool.query(
      `SELECT DISTINCT a.tipo_evento AS tipo
       FROM actividad_clubes a
       WHERE a.tipo_evento IS NOT NULL AND a.tipo_evento <> ''
       ORDER BY a.tipo_evento ASC`
    );
    const clubes = await pool.query(
      `SELECT DISTINCT c.id_club AS id, c.nombre_club AS nombre
       FROM actividad_clubes a
       JOIN clubes c ON c.id_club = a.id_club
       WHERE a.id_club IS NOT NULL
       ORDER BY c.nombre_club ASC`
    );
    res.json({
      actores: actores.rows,
      tipos: tipos.rows.map((r) => r.tipo),
      clubes: clubes.rows,
    });
  } catch (err) {
    console.error('Error al obtener filtros de actividad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista completa para el panel admin (H6): incluye estatus 3 y los campos de
// presidente que el flujo de reasignación usa; requiere rol 3. El público usa
// GET / y no ve esos datos.
router.get('/admin', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
              c.cupo_maximo, c.id_responsable_club, c.participacion, c.lugar_actividades,
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
       WHERE c.id_club = $1`,
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
      `UPDATE clubes SET id_estatus_club = $1 WHERE id_club = $2
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

// Crea un nuevo club (solo admin)
router.post('/', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, participacion, niveles, lugar_actividades, password } = req.body;

    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET || password !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Contraseña de administrador incorrecta' });
    }

    if (!nombre_club || !descripcion || !categoria || !cupo_maximo) {
      return res.status(400).json({ error: 'Nombre, descripción, categoría y cupo máximo son obligatorios' });
    }

    const cupoNumero = Number(cupo_maximo);
    if (!Number.isInteger(cupoNumero) || !CUPOS_CLUB_VALIDOS.includes(cupoNumero)) {
      return res.status(400).json({ error: 'Cupo máximo inválido' });
    }

    if (tieneCaracteresNoPermitidos(nombre_club)) {
      return res.status(400).json({ error: 'El nombre del club no permite emojis ni caracteres especiales' });
    }
    if (descripcion && tieneCaracteresNoPermitidos(descripcion)) {
      return res.status(400).json({ error: 'La descripción no permite emojis ni caracteres especiales' });
    }
    if (lugar_actividades && tieneCaracteresNoPermitidos(lugar_actividades)) {
      return res.status(400).json({ error: 'El lugar de actividades no permite emojis ni caracteres especiales' });
    }

    if (tieneCaracteresNoPermitidos(nombre_club)) {
      return res.status(400).json({ error: 'El nombre del club no permite emojis ni caracteres especiales' });
    }
    if (descripcion && tieneCaracteresNoPermitidos(descripcion)) {
      return res.status(400).json({ error: 'La descripción no permite emojis ni caracteres especiales' });
    }
    if (lugar_actividades && tieneCaracteresNoPermitidos(lugar_actividades)) {
      return res.status(400).json({ error: 'El lugar de actividades no permite emojis ni caracteres especiales' });
    }

    const PARTICIPACION_VALIDA = ['masculina', 'femenina', 'mixta'];
    if (!participacion || !PARTICIPACION_VALIDA.includes(participacion)) {
      return res.status(400).json({ error: 'Participación inválida' });
    }

    if (!Array.isArray(niveles) || niveles.length === 0 || !niveles.every((n) => [1, 2, 3].includes(Number(n)))) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un nivel válido' });
    }

    // H10: la portada se renderiza en <img> de páginas públicas; solo http(s)
    // o rutas /uploads/ (consistencia con las imágenes de Cloudinary).
    if (!esImagenPortadaValida(imagen_portada)) {
      return res.status(400).json({ error: 'La imagen de portada debe ser una URL http(s) válida o una ruta /uploads/' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO clubes (nombre_club, descripcion, categoria, cupo_maximo, id_estatus_club, imagen_portada, participacion, lugar_actividades)
       VALUES ($1, $2, $3, $4, 2, $5, $6, $7)
       RETURNING id_club, nombre_club, descripcion, categoria, cupo_maximo, id_estatus_club, imagen_portada, participacion, lugar_actividades`,
      [nombre_club, descripcion, categoria, parseInt(cupo_maximo, 10), imagen_portada || null, participacion, lugar_actividades || null],
    );

    for (const idNivel of niveles) {
      await client.query(
        'INSERT INTO clubes_niveles (id_club, id_nivel) VALUES ($1, $2)',
        [result.rows[0].id_club, Number(idNivel)]
      );
    }

    await client.query('COMMIT');

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'crear_club',
      descripcion: `${req.user.nombre_completo} creó el club "${nombre_club}"`,
      entidadTipo: 'club',
      entidadId: result.rows[0].id_club,
      detalles: { nombre_club, categoria, cupo_maximo, participacion, niveles },
    });

    res.status(201).json({
      ...result.rows[0],
      estatus: 'activo',
      cupo_actual: 0,
      niveles: niveles.map((idNivel) => ({ id_nivel: Number(idNivel) })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Actualiza los datos de un club (solo admin)
router.put('/:id', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, participacion, niveles, lugar_actividades } = req.body;

    if (!nombre_club || !descripcion || !categoria || !cupo_maximo) {
      return res.status(400).json({ error: 'Nombre, descripción, categoría y cupo máximo son obligatorios' });
    }

    const cupoNumero = Number(cupo_maximo);
    if (!Number.isInteger(cupoNumero) || !CUPOS_CLUB_VALIDOS.includes(cupoNumero)) {
      return res.status(400).json({ error: 'Cupo máximo inválido' });
    }

    if (tieneCaracteresNoPermitidos(nombre_club)) {
      return res.status(400).json({ error: 'El nombre del club no permite emojis ni caracteres especiales' });
    }
    if (descripcion && tieneCaracteresNoPermitidos(descripcion)) {
      return res.status(400).json({ error: 'La descripción no permite emojis ni caracteres especiales' });
    }
    if (lugar_actividades && tieneCaracteresNoPermitidos(lugar_actividades)) {
      return res.status(400).json({ error: 'El lugar de actividades no permite emojis ni caracteres especiales' });
    }

    if (tieneCaracteresNoPermitidos(nombre_club)) {
      return res.status(400).json({ error: 'El nombre del club no permite emojis ni caracteres especiales' });
    }
    if (descripcion && tieneCaracteresNoPermitidos(descripcion)) {
      return res.status(400).json({ error: 'La descripción no permite emojis ni caracteres especiales' });
    }
    if (lugar_actividades && tieneCaracteresNoPermitidos(lugar_actividades)) {
      return res.status(400).json({ error: 'El lugar de actividades no permite emojis ni caracteres especiales' });
    }

    const PARTICIPACION_VALIDA = ['masculina', 'femenina', 'mixta'];
    if (!participacion || !PARTICIPACION_VALIDA.includes(participacion)) {
      return res.status(400).json({ error: 'Participación inválida' });
    }

    if (!Array.isArray(niveles) || niveles.length === 0 || !niveles.every((n) => [1, 2, 3].includes(Number(n)))) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un nivel válido' });
    }

    // H10: la portada se renderiza en <img> de páginas públicas; solo http(s)
    // o rutas /uploads/ (consistencia con las imágenes de Cloudinary).
    if (!esImagenPortadaValida(imagen_portada)) {
      return res.status(400).json({ error: 'La imagen de portada debe ser una URL http(s) válida o una ruta /uploads/' });
    }

    await client.query('BEGIN');

    // Portada anterior: necesaria para la limpieza de Cloudinary solo si el
    // UPDATE la reemplaza (se guarda el estado previo antes de tocar la fila).
    const previo = await client.query(
      'SELECT imagen_portada FROM clubes WHERE id_club = $1',
      [id]
    );
    const urlPortadaAnterior = previo.rows[0]?.imagen_portada || null;

    const result = await client.query(
      `UPDATE clubes
       SET nombre_club = $1, descripcion = $2, categoria = $3, cupo_maximo = $4,
           imagen_portada = COALESCE($5, imagen_portada), participacion = $6,
           lugar_actividades = $8
       WHERE id_club = $7
       RETURNING id_club, nombre_club, descripcion, categoria, cupo_maximo, id_estatus_club, imagen_portada, participacion, lugar_actividades`,
      [nombre_club, descripcion, categoria, parseInt(cupo_maximo, 10), imagen_portada || null, participacion, id, lugar_actividades || null],
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    await client.query('DELETE FROM clubes_niveles WHERE id_club = $1', [id]);
    for (const idNivel of niveles) {
      await client.query(
        'INSERT INTO clubes_niveles (id_club, id_nivel) VALUES ($1, $2)',
        [id, Number(idNivel)]
      );
    }

    await client.query('COMMIT');

    // Limpieza de Cloudinary: recién tras el COMMIT (si la transacción falló,
    // el recurso anterior se conserva). Solo si la portada cambió y ninguna
    // otra club sigue refiriendo el mismo recurso por identidad de public_id.
    const urlPortadaNueva = result.rows[0]?.imagen_portada || null;
    if (urlPortadaAnterior && urlPortadaNueva && urlPortadaAnterior !== urlPortadaNueva) {
      const refs = await pool.query(
        'SELECT imagen_portada FROM clubes WHERE imagen_portada IS NOT NULL AND id_club <> $1',
        [id]
      );
      await eliminarImagenCloudinary(urlPortadaAnterior, {
        candidatas: refs.rows.map((f) => f.imagen_portada),
      });
    }

    const estatusResult = await pool.query(
      'SELECT nombre_estatus FROM cat_estatus_clubes WHERE id_estatus_club = $1',
      [result.rows[0].id_estatus_club],
    );

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'actualizar_club',
      descripcion: `${req.user.nombre_completo} actualizó los datos del club ID ${id}`,
      entidadTipo: 'club',
      entidadId: parseInt(id),
      detalles: { nombre_club, categoria, cupo_maximo, participacion, niveles },
    });

    res.json({
      ...result.rows[0],
      estatus: estatusResult.rows[0]?.nombre_estatus || 'activo',
      niveles: niveles.map((idNivel) => ({ id_nivel: Number(idNivel) })),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Admin puede cerrar una convocatoria publicada.
router.post('/:id/cerrar-convocatoria', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), async (req, res) => {
  try {
    const { id } = req.params;

    const club = await pool.query(
      'SELECT nombre_club FROM clubes WHERE id_club = $1',
      [id],
    );
    if (club.rows.length === 0) return res.status(403).json({ error: 'No eres presidente ni vicepresidente de este club' });

    await pool.query(
      'UPDATE clubes SET cerrada_manualmente = TRUE WHERE id_club = $1',
      [id],
    );

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
    console.error('Error al cerrar convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asigna o remueve vicepresidente del club (solo presidente)
router.put('/:id/vicepresidente', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_usuario } = req.body;

    const club = await pool.query(
      'SELECT id_club, id_vicepresidente FROM clubes WHERE id_club = $1 AND id_responsable_club = $2',
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
      `UPDATE clubes SET id_vicepresidente = $1 WHERE id_club = $2
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
