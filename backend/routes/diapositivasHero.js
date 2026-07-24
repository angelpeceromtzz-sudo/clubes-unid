// Rutas de diapositivas del hero — consulta pública y administración
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { v2 as cloudinary } from 'cloudinary';

function extraerPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  const match = url.match(/upload\/(?:v\d+\/)?(.+?)\.(jpg|jpeg|png|gif|webp|svg)$/);
  return match ? `clubs-unid/${match[1]}` : null;
}

async function eliminarEnCloudinary(url) {
  const publicId = extraerPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error al eliminar imagen de Cloudinary:', err.message);
  }
}

const router = Router();

// Lista diapositivas activas, ordenadas por orden (público)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_diapositiva, titulo, subtitulo, url_imagen,
              alineacion, orden, activa, fecha_creacion, fecha_actualizacion
       FROM diapositivas_hero
       WHERE activa = TRUE
       ORDER BY orden ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar diapositivas del hero:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista todas las diapositivas — admin (activas e inactivas)
router.get('/admin', authenticate, requireRole(3), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_diapositiva, titulo, subtitulo, url_imagen,
              alineacion, orden, activa, fecha_creacion, fecha_actualizacion
       FROM diapositivas_hero
       ORDER BY orden ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar todas las diapositivas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crea una diapositiva — admin
router.post('/', authenticate, requireRole(3), async (req, res) => {
  try {
    const { titulo, subtitulo, url_imagen, alineacion, orden, activa } = req.body;

    if (!titulo || !url_imagen) {
      return res.status(400).json({ error: 'Título e imagen son obligatorios' });
    }

    const result = await pool.query(
      `INSERT INTO diapositivas_hero (titulo, subtitulo, url_imagen, alineacion, orden, activa)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_diapositiva, titulo, subtitulo, url_imagen, alineacion, orden, activa, fecha_creacion, fecha_actualizacion`,
      [titulo, subtitulo || null, url_imagen, alineacion || 'izquierda', orden || 0, activa !== false]
    );

    const diapositiva = result.rows[0];

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'crear_diapositiva_hero',
      descripcion: `${req.user.nombre_completo} creó la diapositiva "${titulo}"`,
      entidadTipo: 'diapositiva_hero',
      entidadId: diapositiva.id_diapositiva,
      detalles: { titulo, alineacion: alineacion || 'izquierda' },
    });

    res.status(201).json(diapositiva);
  } catch (err) {
    console.error('Error al crear diapositiva:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Edita una diapositiva — admin
router.put('/:id', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, url_imagen, alineacion, orden, activa } = req.body;

    const actual = await pool.query(
      'SELECT url_imagen FROM diapositivas_hero WHERE id_diapositiva = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Diapositiva no encontrada' });
    }

    const urlAnterior = actual.rows[0].url_imagen;

    const result = await pool.query(
      `UPDATE diapositivas_hero
       SET titulo      = COALESCE($1, titulo),
           subtitulo   = COALESCE($2, subtitulo),
           url_imagen  = COALESCE($3, url_imagen),
           alineacion  = COALESCE($4, alineacion),
           orden       = COALESCE($5, orden),
           activa      = COALESCE($6, activa)
       WHERE id_diapositiva = $7
       RETURNING id_diapositiva, titulo, subtitulo, url_imagen, alineacion, orden, activa, fecha_creacion, fecha_actualizacion`,
      [titulo, subtitulo, url_imagen, alineacion, orden, activa, id]
    );

    if (url_imagen && url_imagen !== urlAnterior) {
      eliminarEnCloudinary(urlAnterior);
    }

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'actualizar_diapositiva_hero',
      descripcion: `${req.user.nombre_completo} actualizó la diapositiva ID ${id}`,
      entidadTipo: 'diapositiva_hero',
      entidadId: parseInt(id),
      detalles: { titulo, alineacion, activa },
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar diapositiva:', err);
    if (err.message && err.message.includes('Debe existir al menos una diapositiva activa')) {
      return res.status(400).json({ error: 'Debe existir al menos una diapositiva activa' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Elimina una diapositiva — admin
router.delete('/:id', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await pool.query(
      'SELECT id_diapositiva, titulo, url_imagen FROM diapositivas_hero WHERE id_diapositiva = $1',
      [id]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Diapositiva no encontrada' });
    }

    await pool.query('DELETE FROM diapositivas_hero WHERE id_diapositiva = $1', [id]);

    eliminarEnCloudinary(existe.rows[0].url_imagen);

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'eliminar_diapositiva_hero',
      descripcion: `${req.user.nombre_completo} eliminó la diapositiva "${existe.rows[0].titulo}"`,
      entidadTipo: 'diapositiva_hero',
      entidadId: parseInt(id),
      detalles: { titulo: existe.rows[0].titulo },
    });

    res.json({ message: 'Diapositiva eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar diapositiva:', err);
    if (err.message && err.message.includes('Debe existir al menos una diapositiva activa')) {
      return res.status(400).json({ error: 'Debe existir al menos una diapositiva activa' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
