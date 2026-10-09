// Rutas de noticias — consulta pública y administración (admin / rectoría)
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { v2 as cloudinary } from 'cloudinary';

const ROLES_EDITOR = [3, 4];

const CATEGORIAS_PERMITIDAS = ['promocion', 'evento', 'informativo'];

const CAMPOS = `id_noticia, titulo, contenido, url_imagen, destacada,
                publicada, categoria, fecha_evento, hora_evento, lugar_evento,
                id_autor, fecha_publicacion, fecha_actualizacion`;

function fechaEventoValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

function errorDatosEvento(fecha, hora, lugar) {
  if (fecha != null && fecha !== '' && !fechaEventoValida(fecha)) return 'Fecha del evento no válida';
  if (hora != null && hora !== '' && (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora))) return 'Hora del evento no válida';
  if (lugar != null && (typeof lugar !== 'string' || lugar.length > 200)) return 'Lugar del evento no válido';
  return null;
}

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

// Todos los eventos publicados, sin depender del límite del feed de noticias.
router.get('/eventos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}
       FROM noticias
       WHERE publicada = TRUE AND categoria = 'evento'
       ORDER BY fecha_publicacion DESC, id_noticia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar eventos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista todas las noticias (incluye borradores) — admin / rectoría
router.get('/admin', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}, u.nombre_completo AS autor_nombre
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
    const { titulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, hora_evento, lugar_evento } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido es obligatorio' });
    }
    const categoriaFinal = categoria ?? 'informativo';
    if (!CATEGORIAS_PERMITIDAS.includes(categoriaFinal)) {
      return res.status(400).json({ error: 'Categoría no válida' });
    }
    if (categoriaFinal === 'evento') {
      const error = errorDatosEvento(fecha_evento, hora_evento, lugar_evento);
      if (error) return res.status(400).json({ error });
      if (!fecha_evento) return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
    }

    const result = await pool.query(
      `INSERT INTO noticias (titulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, hora_evento, lugar_evento, id_autor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${CAMPOS}`,
      [
        titulo.trim(),
        contenido.trim(),
        url_imagen || null,
        destacada === true,
        publicada !== false,
        categoriaFinal,
        categoriaFinal === 'evento' ? fecha_evento : null,
        categoriaFinal === 'evento' ? hora_evento || null : null,
        categoriaFinal === 'evento' ? lugar_evento?.trim() || null : null,
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
    const { titulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, hora_evento, lugar_evento } = req.body;

    if (titulo !== undefined && !titulo.trim()) {
      return res.status(400).json({ error: 'El título no puede quedar vacío' });
    }
    if (contenido !== undefined && !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido no puede quedar vacío' });
    }
    if (categoria !== undefined && !CATEGORIAS_PERMITIDAS.includes(categoria)) {
      return res.status(400).json({ error: 'Categoría no válida' });
    }
    const errorEvento = errorDatosEvento(fecha_evento, hora_evento, lugar_evento);
    if (errorEvento) return res.status(400).json({ error: errorEvento });

    const actual = await pool.query(
      'SELECT url_imagen, categoria, fecha_evento FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    const categoriaFinal = categoria ?? actual.rows[0].categoria;
    const fechaFinal = fecha_evento === undefined ? actual.rows[0].fecha_evento : fecha_evento;
    if ((categoria !== undefined || fecha_evento !== undefined) && categoriaFinal === 'evento' && !fechaFinal) {
      return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
    }

    const urlAnterior = actual.rows[0].url_imagen;

    const result = await pool.query(
      `UPDATE noticias
       SET titulo      = COALESCE($1, titulo),
           contenido   = COALESCE($2, contenido),
           url_imagen  = COALESCE($3, url_imagen),
           destacada   = COALESCE($4, destacada),
           publicada    = COALESCE($5, publicada),
           categoria    = COALESCE($6, categoria),
           fecha_evento = CASE WHEN $6 IS NOT NULL AND $6 <> 'evento' THEN NULL WHEN $7 THEN $8::date ELSE fecha_evento END,
           hora_evento  = CASE WHEN $6 IS NOT NULL AND $6 <> 'evento' THEN NULL WHEN $9 THEN $10::time ELSE hora_evento END,
           lugar_evento = CASE WHEN $6 IS NOT NULL AND $6 <> 'evento' THEN NULL WHEN $11 THEN $12 ELSE lugar_evento END
       WHERE id_noticia = $13
       RETURNING ${CAMPOS}`,
      [
        titulo !== undefined ? titulo.trim() : null,
        contenido !== undefined ? contenido.trim() : null,
        url_imagen !== undefined ? url_imagen : null,
        destacada === undefined ? null : destacada === true,
        publicada === undefined ? null : publicada === true,
        categoria === undefined ? null : categoria,
        fecha_evento !== undefined,
        fecha_evento || null,
        hora_evento !== undefined,
        hora_evento || null,
        lugar_evento !== undefined,
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
