// Rutas de diapositivas del hero — consulta pública y administración
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
// Helper idéntico (mismo hash) al que añade fix/seguridad-fase1: al unificar
// ramas el merge es limpio y ambas quedan con la corrección del public_id
// doble, la comparación por identidad y el destroy con invalidate.
import { eliminarImagenCloudinary, mismaIdentidad } from '../lib/eliminarImagenCloudinary.js';

const router = Router();

// Lista diapositivas activas, ordenadas por orden (público)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_diapositiva, titulo, subtitulo, url_imagen, url_imagen_movil,
              orden, activa, fecha_creacion, fecha_actualizacion
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
      `SELECT id_diapositiva, titulo, subtitulo, url_imagen, url_imagen_movil,
              orden, activa, fecha_creacion, fecha_actualizacion
       FROM diapositivas_hero
       ORDER BY orden ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar todas las diapositivas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const MAX_BANNERS = 6;

// Crea una diapositiva — admin
router.post('/', authenticate, requireRole(3), async (req, res) => {
  try {
    const { titulo, subtitulo, url_imagen, url_imagen_movil, orden, activa } = req.body;

    if (!titulo || !url_imagen) {
      return res.status(400).json({ error: 'Título e imagen son obligatorios' });
    }

    const ordenNum = parseInt(orden, 10) || 1;
    if (ordenNum < 1 || ordenNum > MAX_BANNERS) {
      return res.status(400).json({ error: `El orden debe estar entre 1 y ${MAX_BANNERS}` });
    }

    const result = await pool.query(
      `INSERT INTO diapositivas_hero (titulo, subtitulo, url_imagen, url_imagen_movil, orden, activa)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_diapositiva, titulo, subtitulo, url_imagen, url_imagen_movil, orden, activa, fecha_creacion, fecha_actualizacion`,
      [titulo, subtitulo || null, url_imagen, url_imagen_movil || null, ordenNum, activa !== false]
    );

    const diapositiva = result.rows[0];

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'crear_diapositiva_hero',
      descripcion: `${req.user.nombre_completo} creó la diapositiva "${titulo}"`,
      entidadTipo: 'diapositiva_hero',
      entidadId: diapositiva.id_diapositiva,
      detalles: { titulo },
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
    const { titulo, subtitulo, url_imagen, orden, activa } = req.body;
    // Imagen móvil: string cambia la URL; '' la limpia (NULL); ausente la conserva.
    const incluyeMovil = Object.prototype.hasOwnProperty.call(req.body, 'url_imagen_movil');
    const urlImagenMovilNueva = incluyeMovil ? (req.body.url_imagen_movil || null) : null;

    if (orden !== undefined) {
      const ordenNum = parseInt(orden, 10);
      if (isNaN(ordenNum) || ordenNum < 1 || ordenNum > MAX_BANNERS) {
        return res.status(400).json({ error: `El orden debe estar entre 1 y ${MAX_BANNERS}` });
      }
    }

    const actual = await pool.query(
      'SELECT url_imagen, url_imagen_movil FROM diapositivas_hero WHERE id_diapositiva = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Diapositiva no encontrada' });
    }

    const urlAnterior = actual.rows[0].url_imagen;
    const urlMovilAnterior = actual.rows[0].url_imagen_movil;
    const urlMovilFinal = incluyeMovil ? urlImagenMovilNueva : urlMovilAnterior;
    // '' en escritorio no vacía la imagen obligatoria: viaja como null y
    // COALESCE conserva el valor actual (consistente con el manejo móvil).
    const urlImagenFinal = url_imagen || null;

    const result = await pool.query(
      `UPDATE diapositivas_hero
       SET titulo          = COALESCE($1, titulo),
           subtitulo       = COALESCE($2, subtitulo),
           url_imagen      = COALESCE($3, url_imagen),
           url_imagen_movil = $4,
           orden           = COALESCE($5, orden),
           activa          = COALESCE($6, activa)
       WHERE id_diapositiva = $7
       RETURNING id_diapositiva, titulo, subtitulo, url_imagen, url_imagen_movil, orden, activa, fecha_creacion, fecha_actualizacion`,
      [titulo, subtitulo, urlImagenFinal, urlMovilFinal, orden, activa, id]
    );

    // Limpieza SOLO tras el UPDATE exitoso (la BD ya guarda el estado nuevo);
    // candidatas = estado final de la tabla. Un recurso viejo no se destruye
    // si sigue referenciado por la otra columna u otra diapositiva
    // (identidad de public_id, no URL literal). `await`: la respuesta no se
    // adelanta a la limpieza (antes eran llamadas sin esperar).
    const limpiaEscritorio = Boolean(
      urlImagenFinal && urlAnterior && !mismaIdentidad(urlImagenFinal, urlAnterior),
    );
    const limpiaMovil = Boolean(
      urlMovilAnterior && !mismaIdentidad(urlMovilFinal, urlMovilAnterior),
    );
    if (limpiaEscritorio || limpiaMovil) {
      const refs = await pool.query(
        'SELECT url_imagen, url_imagen_movil FROM diapositivas_hero'
      );
      const candidatas = refs.rows
        .flatMap((f) => [f.url_imagen, f.url_imagen_movil])
        .filter(Boolean);
      if (limpiaEscritorio) {
        await eliminarImagenCloudinary(urlAnterior, { candidatas });
      }
      if (limpiaMovil) {
        await eliminarImagenCloudinary(urlMovilAnterior, { candidatas });
      }
    }

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'actualizar_diapositiva_hero',
      descripcion: `${req.user.nombre_completo} actualizó la diapositiva ID ${id}`,
      entidadTipo: 'diapositiva_hero',
      entidadId: parseInt(id),
      detalles: { titulo, activa },
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
      'SELECT id_diapositiva, titulo, url_imagen, url_imagen_movil FROM diapositivas_hero WHERE id_diapositiva = $1',
      [id]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Diapositiva no encontrada' });
    }

    await pool.query('DELETE FROM diapositivas_hero WHERE id_diapositiva = $1', [id]);

    // Limpieza SOLO tras el DELETE exitoso; candidatas = filas restantes
    // (estado post-borrado). `await` para que la respuesta no se adelante.
    const refs = await pool.query(
      'SELECT url_imagen, url_imagen_movil FROM diapositivas_hero'
    );
    const candidatas = refs.rows
      .flatMap((f) => [f.url_imagen, f.url_imagen_movil])
      .filter(Boolean);
    await eliminarImagenCloudinary(existe.rows[0].url_imagen, { candidatas });
    await eliminarImagenCloudinary(existe.rows[0].url_imagen_movil, { candidatas });

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
