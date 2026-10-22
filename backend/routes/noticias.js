// Rutas de noticias — consulta pública y administración (admin / rectoría)
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { v2 as cloudinary } from 'cloudinary';
import { fechaEventoValida, errorPeriodoEvento } from '../lib/fechasEvento.js';

const ROLES_EDITOR = [3, 4];

const CATEGORIAS_PERMITIDAS = ['promocion', 'evento', 'informativo'];
const CATEGORIAS_EVENTO = ['social', 'deportivo', 'cultural'];

const CAMPOS = `id_noticia, titulo, subtitulo, contenido, url_imagen, destacada,
                publicada, categoria, fecha_evento::text AS fecha_evento, fecha_fin_evento::text AS fecha_fin_evento,
                mostrar_en_mural, hora_evento, lugar_evento, categoria_evento,
                id_autor, fecha_publicacion, fecha_actualizacion`;

function hoyEnCampus() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const fecha = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${fecha.year}-${fecha.month}-${fecha.day}`;
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
       WHERE publicada = TRUE AND solo_calendario = FALSE
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
      `SELECT ${CAMPOS},
              (SELECT COUNT(*)::int FROM intereses_eventos ie WHERE ie.id_noticia = noticias.id_noticia) AS total_interesados
       FROM noticias
       WHERE publicada = TRUE AND categoria = 'evento' AND solo_calendario = FALSE
       ORDER BY fecha_publicacion DESC, id_noticia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar eventos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Avisos del mural sin depender de la paginación del feed de noticias.
router.get('/mural', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS} FROM noticias
       WHERE publicada = TRUE AND mostrar_en_mural = TRUE AND solo_calendario = FALSE
       ORDER BY destacada DESC, fecha_publicacion DESC, id_noticia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar el mural:', err);
    res.status(500).json({ error: 'No se pudo cargar el mural' });
  }
});

router.get('/eventos/intereses/mios', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ie.id_noticia FROM intereses_eventos ie
       JOIN noticias n ON n.id_noticia = ie.id_noticia
       WHERE ie.id_usuario = $1 AND n.publicada = TRUE AND n.categoria = 'evento' AND n.solo_calendario = FALSE`,
      [req.user.id]
    );
    res.json(result.rows.map((fila) => fila.id_noticia));
  } catch (err) {
    console.error('Error al listar intereses de eventos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/eventos/:id/interes', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Evento no válido' });
    const evento = await pool.query(
      `SELECT COALESCE(fecha_fin_evento, fecha_evento)::text AS fecha_evento FROM noticias
       WHERE id_noticia = $1 AND categoria = 'evento' AND publicada = TRUE AND solo_calendario = FALSE`,
      [id]
    );
    if (evento.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    if (!evento.rows[0].fecha_evento || evento.rows[0].fecha_evento < hoyEnCampus()) {
      return res.status(400).json({ error: 'Este evento ya finalizó' });
    }
    await pool.query(
      `INSERT INTO intereses_eventos (id_noticia, id_usuario) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );
    const total = await pool.query('SELECT COUNT(*)::int AS total FROM intereses_eventos WHERE id_noticia = $1', [id]);
    res.json({ interesado: true, total_interesados: total.rows[0].total });
  } catch (err) {
    console.error('Error al registrar interés en evento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista todas las noticias (incluye borradores) — admin / rectoría
router.get('/admin', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS}, u.nombre_completo AS autor_nombre,
              (SELECT COUNT(*)::int FROM intereses_eventos ie WHERE ie.id_noticia = noticias.id_noticia) AS total_interesados
       FROM noticias
       LEFT JOIN usuarios u ON u.id_usuario = noticias.id_autor
       WHERE solo_calendario = FALSE
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
    const { titulo, subtitulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, fecha_fin_evento, mostrar_en_mural, solo_calendario, hora_evento, lugar_evento, categoria_evento } = req.body;

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 200) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (solo_calendario !== undefined && typeof solo_calendario !== 'boolean') return res.status(400).json({ error: 'Opción de calendario no válida' });
    if (solo_calendario) return res.status(400).json({ error: 'Las fechas académicas se guardan desde Calendario académico, no como eventos' });
    const contenidoFinal = typeof contenido === 'string' ? contenido.trim() : '';
    if (!contenidoFinal) {
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
      if (fecha_evento < hoyEnCampus()) return res.status(400).json({ error: 'La fecha del evento no puede ser pasada' });
      if (!CATEGORIAS_EVENTO.includes(categoria_evento ?? 'social')) return res.status(400).json({ error: 'Categoría del evento no válida' });
      const errorPeriodo = errorPeriodoEvento(fecha_evento, fecha_fin_evento);
      if (errorPeriodo) return res.status(400).json({ error: errorPeriodo });
    }
    if (mostrar_en_mural !== undefined && typeof mostrar_en_mural !== 'boolean') return res.status(400).json({ error: 'Opción de mural no válida' });

    const result = await pool.query(
      `INSERT INTO noticias (titulo, subtitulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, hora_evento, lugar_evento, categoria_evento, id_autor, fecha_fin_evento, mostrar_en_mural)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${CAMPOS}`,
      [
        titulo.trim(),
        subtitulo?.trim() || null,
        contenidoFinal,
        url_imagen || null,
        destacada === true,
        publicada !== false,
        categoriaFinal,
        categoriaFinal === 'evento' ? fecha_evento : null,
        categoriaFinal === 'evento' ? hora_evento || null : null,
        categoriaFinal === 'evento' ? lugar_evento?.trim() || null : null,
        categoriaFinal === 'evento' ? categoria_evento ?? 'social' : 'social',
        req.user.id,
        categoriaFinal === 'evento' ? fecha_fin_evento || null : null,
        mostrar_en_mural === true,
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
    const { titulo, subtitulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, fecha_fin_evento, mostrar_en_mural, solo_calendario, hora_evento, lugar_evento, categoria_evento } = req.body;

    if (titulo !== undefined && (typeof titulo !== 'string' || !titulo.trim() || titulo.length > 200)) {
      return res.status(400).json({ error: 'El título no puede quedar vacío' });
    }
    if (contenido !== undefined && (typeof contenido !== 'string' || !contenido.trim())) {
      return res.status(400).json({ error: 'El contenido no puede quedar vacío' });
    }
    if (categoria !== undefined && !CATEGORIAS_PERMITIDAS.includes(categoria)) {
      return res.status(400).json({ error: 'Categoría no válida' });
    }
    const errorEvento = errorDatosEvento(fecha_evento, hora_evento, lugar_evento);
    if (errorEvento) return res.status(400).json({ error: errorEvento });
    if (categoria_evento !== undefined && !CATEGORIAS_EVENTO.includes(categoria_evento)) {
      return res.status(400).json({ error: 'Categoría del evento no válida' });
    }
    if (mostrar_en_mural !== undefined && typeof mostrar_en_mural !== 'boolean') return res.status(400).json({ error: 'Opción de mural no válida' });
    if (solo_calendario !== undefined && typeof solo_calendario !== 'boolean') return res.status(400).json({ error: 'Opción de calendario no válida' });
    if (solo_calendario) return res.status(400).json({ error: 'Las fechas académicas se guardan desde Calendario académico, no como eventos' });

    const actual = await pool.query(
      'SELECT url_imagen, categoria, fecha_evento::text AS fecha_evento, fecha_fin_evento::text AS fecha_fin_evento FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    const categoriaFinal = categoria ?? actual.rows[0].categoria;
    const fechaFinal = fecha_evento === undefined ? actual.rows[0].fecha_evento : fecha_evento;
    const finFinal = fecha_fin_evento === undefined ? actual.rows[0].fecha_fin_evento : fecha_fin_evento;
    if (categoriaFinal === 'evento') {
      const errorPeriodo = errorPeriodoEvento(fechaFinal, finFinal);
      if (errorPeriodo) return res.status(400).json({ error: errorPeriodo });
    }
    if ((categoria !== undefined || fecha_evento !== undefined) && categoriaFinal === 'evento' && !fechaFinal) {
      return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
    }
    if (categoriaFinal === 'evento' && fecha_evento !== undefined &&
        fecha_evento !== actual.rows[0].fecha_evento && fecha_evento < hoyEnCampus()) {
      return res.status(400).json({ error: 'La fecha del evento no puede ser pasada' });
    }

    const urlAnterior = actual.rows[0].url_imagen;

    const result = await pool.query(
      `UPDATE noticias
       SET titulo      = COALESCE($1, titulo),
           subtitulo   = COALESCE($2, subtitulo),
           contenido   = COALESCE($3, contenido),
           url_imagen  = COALESCE($4, url_imagen),
           destacada   = COALESCE($5, destacada),
           publicada    = COALESCE($6, publicada),
           categoria    = COALESCE($7, categoria),
           fecha_evento = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN NULL WHEN $8 THEN $9::date ELSE fecha_evento END,
           hora_evento  = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN NULL WHEN $10 THEN $11::time ELSE hora_evento END,
           lugar_evento = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN NULL WHEN $12 THEN $13 ELSE lugar_evento END,
           categoria_evento = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN 'social' ELSE COALESCE($14, categoria_evento) END,
           fecha_fin_evento = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN NULL WHEN $16 THEN $17::date ELSE fecha_fin_evento END,
           mostrar_en_mural = COALESCE($18, mostrar_en_mural)
       WHERE id_noticia = $15
       RETURNING ${CAMPOS}`,
      [
        titulo !== undefined ? titulo.trim() : null,
        subtitulo === undefined ? null : subtitulo?.trim() || '',
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
        categoriaFinal === 'evento' ? categoria_evento ?? null : 'social',
        id,
        fecha_fin_evento !== undefined,
        fecha_fin_evento || null,
        mostrar_en_mural ?? null,
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
