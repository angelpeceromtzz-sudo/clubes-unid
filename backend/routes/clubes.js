// Rutas de clubes — consulta pública y administración
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';

const router = Router();

// Lista todos los clubes con su cupo actual calculado (público)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
              c.cupo_maximo, c.id_presidente,
              c.imagen_portada,
              c.id_estatus_club, e.nombre_estatus as estatus,
              c.estado_convocatoria,
              c.fecha_creacion,
              COALESCE(
                (SELECT COUNT(*) FROM inscripciones i
                 JOIN usuarios u ON u.id_usuario = i.id_usuario
                 WHERE i.id_club = c.id_club
                   AND i.id_estatus_inscripcion = 1
                   AND u.id_rol = 1),
                0
              ) AS cupo_actual
       FROM clubes c
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       ORDER BY c.id_club`
    );

    const rows = result.rows.map((r) => ({
      ...r,
      cupo_actual: parseInt(r.cupo_actual) || 0,
    }));

    res.json(rows);
  } catch (err) {
    console.error('Error al listar clubes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtiene un club por ID con su cupo actual (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria,
              c.cupo_maximo, c.id_presidente,
              c.imagen_portada, c.lugar, c.horario,
              c.id_estatus_club, e.nombre_estatus as estatus,
              c.estado_convocatoria, c.max_postulaciones, c.postulaciones_actuales,
              c.fecha_creacion,
              COALESCE(
                (SELECT COUNT(*) FROM inscripciones i
                 JOIN usuarios u ON u.id_usuario = i.id_usuario
                 WHERE i.id_club = c.id_club
                   AND i.id_estatus_inscripcion = 1
                   AND u.id_rol = 1),
                0
              ) AS cupo_actual
       FROM clubes c
       JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
       WHERE c.id_club = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }

    const club = result.rows[0];
    club.cupo_actual = parseInt(club.cupo_actual) || 0;

    res.json(club);
  } catch (err) {
    console.error('Error al obtener club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambia el estatus de un club (solo admin)
router.put('/:id/estatus', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_estatus_club } = req.body;

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
router.post('/', authenticate, requireRole(3), async (req, res) => {
  try {
    const { nombre_club, categoria, cupo_maximo, imagen_portada } = req.body;

    if (!nombre_club || !categoria || !cupo_maximo) {
      return res.status(400).json({ error: 'Nombre, categoría y cupo máximo son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO clubes (nombre_club, categoria, cupo_maximo, id_estatus_club, imagen_portada)
       VALUES ($1, $2, $3, 1, $4)
       RETURNING id_club, nombre_club, categoria, cupo_maximo, id_estatus_club, imagen_portada`,
      [nombre_club, categoria, parseInt(cupo_maximo, 10), imagen_portada || null],
    );

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'crear_club',
      descripcion: `${req.user.nombre_completo} creó el club "${nombre_club}"`,
      entidadTipo: 'club',
      entidadId: result.rows[0].id_club,
      detalles: { nombre_club, categoria, cupo_maximo },
    });

    res.status(201).json({ ...result.rows[0], estatus: 'activo', cupo_actual: 0 });
  } catch (err) {
    console.error('Error al crear club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualiza los datos de un club (solo admin)
router.put('/:id', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_club, categoria, cupo_maximo, imagen_portada } = req.body;

    if (!nombre_club || !categoria || !cupo_maximo) {
      return res.status(400).json({ error: 'Nombre, categoría y cupo máximo son obligatorios' });
    }

    const result = await pool.query(
      `UPDATE clubes
       SET nombre_club = $1, categoria = $2, cupo_maximo = $3, imagen_portada = COALESCE($4, imagen_portada)
       WHERE id_club = $5
       RETURNING id_club, nombre_club, categoria, cupo_maximo, id_estatus_club, imagen_portada`,
      [nombre_club, categoria, parseInt(cupo_maximo, 10), imagen_portada || null, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
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
      detalles: { nombre_club, categoria, cupo_maximo },
    });

    res.json({ ...result.rows[0], estatus: estatusResult.rows[0]?.nombre_estatus || 'activo' });
  } catch (err) {
    console.error('Error al actualizar club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtiene configuración de convocatoria del club (presidente)
router.get('/:id/convocatoria', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const club = await pool.query(
      `SELECT estado_convocatoria, max_postulaciones, postulaciones_actuales
       FROM clubes WHERE id_club = $1 AND id_presidente = $2`,
      [id, req.user.id],
    );
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado o no eres el presidente' });
    res.json(club.rows[0]);
  } catch (err) {
    console.error('Error al obtener convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualiza configuración de convocatoria (presidente)
// estado: 'abierta' | 'cerrada_manual' | 'cerrada_por_limite'
// reiniciar_periodo: true solo cuando se inicia un nuevo período
router.put('/:id/convocatoria', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, max_postulaciones, reiniciar_periodo } = req.body;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id],
    );
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });

    if (!['abierta', 'cerrada_manual', 'cerrada_por_limite'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser: abierta, cerrada_manual o cerrada_por_limite' });
    }

    const updates = ["estado_convocatoria = $1"];
    const params = [estado];
    let idx = 2;

    if (max_postulaciones !== undefined) {
      updates.push(`max_postulaciones = $${idx}`);
      params.push(max_postulaciones || null);
      idx++;
    }

    if (reiniciar_periodo === true) {
      updates.push(`postulaciones_actuales = $${idx}`);
      params.push(0);
      idx++;
    }

    params.push(id);
    await pool.query(
      `UPDATE clubes SET ${updates.join(', ')} WHERE id_club = $${idx}`,
      params,
    );

    const result = await pool.query(
      `SELECT estado_convocatoria, max_postulaciones, postulaciones_actuales
       FROM clubes WHERE id_club = $1`,
      [id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar convocatoria:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
