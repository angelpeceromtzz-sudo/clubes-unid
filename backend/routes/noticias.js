// Rutas de noticias — consulta pública y administración (admin / rectoría)
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { v2 as cloudinary } from 'cloudinary';

const ROLES_EDITOR = [3, 4];

const CAMPOS = `id_noticia, titulo, contenido, url_imagen, destacada,
                publicada, tipo, fecha_evento, hora_evento, lugar_evento,
                id_autor, fecha_publicacion, fecha_actualizacion`;

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

// Lista noticias públicas, de la más reciente a la más antigua
router.get('/', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite, 10) || 50, 200);
    const result = await pool.query(
      `SELECT ${CAMPOS}
       FROM noticias
       WHERE publicada = TRUE
       ORDER BY fecha_publicacion DESC, id_noticia DESC
       LIMIT $1`,
      [limite]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar noticias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista todas las noticias (incluye borradores) — admin / rectoría
router.get('/admin', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}, autor_nombre
       FROM noticias
       LEFT JOIN usuarios u ON u.id_usuario = noticias.id_autor
       ORDER BY fecha_publicacion DESC, id_noticia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar noticias (admin):', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crea una noticia — admin / rectoría
router.post('/', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { titulo, contenido, url_imagen, destacada, publicada, tipo, fecha_evento, hora_evento, lugar_evento } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido es obligatorio' });
    }

    const result = await pool.query(
      `INSERT INTO noticias (titulo, contenido, url_imagen, destacada, publicada, tipo, fecha_evento, hora_evento, lugar_evento, id_autor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${CAMPOS}`,
      [
        titulo.trim(),
        contenido.trim(),
        url_imagen || null,
        destacada === true,
        publicada !== false,
        tipo === 'evento' ? 'evento' : 'noticia',
        fecha_evento || null,
        hora_evento || null,
        lugar_evento?.trim() || null,
        req.user.id,
      ]
    );

    const noticia = result.rows[0];

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'crear_noticia',
      descripcion: `${req.user.nombre_completo} creó la noticia "${noticia.titulo}"`,
      entidadTipo: 'noticia',
      entidadId: noticia.id_noticia,
      detalles: { titulo: noticia.titulo },
    });

    res.status(201).json(noticia);
  } catch (err) {
    console.error('Error al crear noticia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Edita una noticia — admin / rectoría
router.put('/:id', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, contenido, url_imagen, destacada, publicada, tipo, fecha_evento, hora_evento, lugar_evento } = req.body;

    if (titulo !== undefined && !titulo.trim()) {
      return res.status(400).json({ error: 'El título no puede quedar vacío' });
    }
    if (contenido !== undefined && !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido no puede quedar vacío' });
    }

    const actual = await pool.query(
      'SELECT url_imagen FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }

    const urlAnterior = actual.rows[0].url_imagen;

    const result = await pool.query(
      `UPDATE noticias
       SET titulo      = COALESCE($1, titulo),
           contenido   = COALESCE($2, contenido),
           url_imagen  = COALESCE($3, url_imagen),
           destacada   = COALESCE($4, destacada),
           publicada    = COALESCE($5, publicada),
           tipo         = COALESCE($6, tipo),
           fecha_evento = CASE WHEN $6 IS NULL THEN fecha_evento ELSE $7 END,
           hora_evento  = CASE WHEN $6 IS NULL THEN hora_evento ELSE $8 END,
           lugar_evento = CASE WHEN $6 IS NULL THEN lugar_evento ELSE $9 END
       WHERE id_noticia = $10
       RETURNING ${CAMPOS}`,
      [
        titulo !== undefined ? titulo.trim() : null,
        contenido !== undefined ? contenido.trim() : null,
        url_imagen !== undefined ? url_imagen : null,
        destacada === undefined ? null : destacada === true,
        publicada === undefined ? null : publicada === true,
        tipo === undefined ? null : tipo === 'evento' ? 'evento' : 'noticia',
        fecha_evento || null,
        hora_evento || null,
        lugar_evento?.trim() || null,
        id,
      ]
    );

    if (url_imagen && url_imagen !== urlAnterior) {
      eliminarEnCloudinary(urlAnterior);
    }

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'actualizar_noticia',
      descripcion: `${req.user.nombre_completo} actualizó la noticia "${result.rows[0].titulo}"`,
      entidadTipo: 'noticia',
      entidadId: parseInt(id),
      detalles: { titulo: result.rows[0].titulo },
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar noticia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Elimina una noticia — admin / rectoría
router.delete('/:id', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await pool.query(
      'SELECT id_noticia, titulo, url_imagen FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }

    await pool.query('DELETE FROM noticias WHERE id_noticia = $1', [id]);

    eliminarEnCloudinary(existe.rows[0].url_imagen);

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'eliminar_noticia',
      descripcion: `${req.user.nombre_completo} eliminó la noticia "${existe.rows[0].titulo}"`,
      entidadTipo: 'noticia',
      entidadId: parseInt(id),
      detalles: { titulo: existe.rows[0].titulo },
    });

    res.json({ message: 'Noticia eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar noticia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
