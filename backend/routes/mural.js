import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { fechaEventoValida } from '../lib/fechasEvento.js';

const router = Router();
const ROL_ADMIN = 3;
const ROL_RECTORIA = 4;
const ROL_RESPONSABLE_MURAL = 6;

const CAMPOS = `id_publicacion, titulo, subtitulo, contenido, url_imagen, enlace_url, enlace_texto,
  publicada, destacada, fecha_retiro::text AS fecha_retiro, status, motivo_rechazo,
  id_revisor, fecha_revision::text AS fecha_revision, enviado_revision_at::text AS enviado_revision_at,
  id_autor, fecha_creacion, fecha_actualizacion`;
const EDITABLES = ['titulo', 'subtitulo', 'contenido', 'url_imagen', 'enlace_url', 'enlace_texto', 'destacada', 'fecha_retiro'];
const CAMPOS_PUBLICOS = { titulo: '', subtitulo: null, contenido: '', url_imagen: null, enlace_url: null,
  enlace_texto: null, destacada: false, fecha_retiro: null };

function urlValida(valor, imagen = false) {
  if (typeof valor !== 'string') return false;
  if (imagen && /^\/uploads\/[\w./-]+$/.test(valor) && !valor.includes('..')) return true;
  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function validar(datos) {
  for (const [campo, maximo] of [['titulo', 200], ['contenido', 20000]]) {
    if (typeof datos[campo] !== 'string' || !datos[campo].trim() || datos[campo].length > maximo) {
      return campo === 'titulo' ? 'Escribe un título de hasta 200 caracteres' : 'Escribe el contenido (máximo 20,000 caracteres)';
    }
  }
  for (const [campo, maximo] of [['subtitulo', 300], ['enlace_texto', 80]]) {
    if (datos[campo] != null && (typeof datos[campo] !== 'string' || datos[campo].length > maximo)) return 'El resumen o el texto del enlace es demasiado largo';
  }
  for (const [campo, maximo] of [['enlace_url', 2048], ['url_imagen', 500]]) {
    if (datos[campo] != null && (typeof datos[campo] !== 'string' || datos[campo].length > maximo || (datos[campo] && !urlValida(datos[campo], campo === 'url_imagen')))) return 'Usa una dirección http o https válida para la imagen y el enlace';
  }
  if (typeof datos.destacada !== 'boolean') return 'Las opciones de publicación no son válidas';
  if (datos.fecha_retiro != null && datos.fecha_retiro !== '' && !fechaEventoValida(datos.fecha_retiro)) return 'La fecha de retiro no es válida';
  return null;
}

function valores(datos) {
  return EDITABLES.map((campo) => typeof datos[campo] === 'string' ? datos[campo].trim() || null : datos[campo]);
}

function auditar(req, id, accion, titulo) {
  return registrarHistorial({ idAdmin: req.user.id, adminNombre: req.user.nombre_completo,
    accion, descripcion: `${req.user.nombre_completo} ${accion} "${titulo}"`, entidadTipo: 'mural', entidadId: id });
}

router.get('/', async (_req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS} FROM publicaciones_mural
      WHERE status = 'published' AND publicada = TRUE AND (fecha_retiro IS NULL OR fecha_retiro >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date)
      ORDER BY destacada DESC, fecha_creacion DESC, id_publicacion DESC`);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al consultar el mural:', err);
    res.status(500).json({ error: 'No se pudieron cargar las publicaciones del mural' });
  }
});

router.get('/config', async (_req, res) => {
  try {
    const resultado = await pool.query('SELECT url_publica FROM configuracion_mural WHERE id = 1');
    res.json(resultado.rows[0] || { url_publica: null });
  } catch (err) {
    console.error('Error al consultar enlace del mural:', err);
    res.status(500).json({ error: 'No se pudo cargar el enlace público' });
  }
});

// Toda escritura y la consulta de borradores requieren un editor autorizado.
router.use(authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_RESPONSABLE_MURAL));

router.get('/admin', async (req, res) => {
  try {
    const rol = req.user.id_rol;
    let resultado;
    if (rol === ROL_RESPONSABLE_MURAL) {
      // El responsable ve sus propias publicaciones en cualquier estado.
      resultado = await pool.query(
        `SELECT ${CAMPOS} FROM publicaciones_mural WHERE id_autor = $1 ORDER BY fecha_creacion DESC, id_publicacion DESC`,
        [req.user.id]
      );
    } else {
      // Coordinación (admin) y rectoría ven la bandeja de revisión.
      resultado = await pool.query(
        `SELECT ${CAMPOS} FROM publicaciones_mural WHERE status = 'pending' ORDER BY enviado_revision_at DESC, fecha_creacion DESC`
      );
    }
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al administrar el mural:', err);
    res.status(500).json({ error: 'No se pudieron cargar las publicaciones' });
  }
});

router.put('/config', async (req, res) => {
  const { url_publica } = req.body;
  if (url_publica !== null && (typeof url_publica !== 'string' || url_publica.length > 2048 || !urlValida(url_publica))) {
    return res.status(400).json({ error: 'Escribe la dirección http o https donde está publicado el sitio' });
  }
  let enlace = null;
  if (url_publica !== null) {
    const url = new URL(url_publica);
    url.pathname = '/calendario';
    url.search = '?vista=mural';
    url.hash = '';
    enlace = url.href;
  }
  try {
    const resultado = await pool.query(`INSERT INTO configuracion_mural (id, url_publica) VALUES (1, $1)
      ON CONFLICT (id) DO UPDATE SET url_publica = EXCLUDED.url_publica RETURNING url_publica`, [enlace]);
    await auditar(req, 1, 'actualizó el enlace del mural', enlace || 'Dirección automática');
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al guardar enlace del mural:', err);
    res.status(500).json({ error: 'No se pudo guardar el enlace público' });
  }
});

router.post('/', async (req, res) => {
  // Solo el rol responsable del mural puede crear contenido del mural.
  if (req.user.id_rol !== ROL_RESPONSABLE_MURAL) {
    return res.status(403).json({ error: 'Solo el responsable del mural puede crear publicaciones' });
  }
  const datos = { ...CAMPOS_PUBLICOS };
  for (const campo of EDITABLES) if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
  const error = validar(datos);
  if (error) return res.status(400).json({ error });
  try {
    const resultado = await pool.query(
      `INSERT INTO publicaciones_mural
      (${EDITABLES.join(', ')}, publicada, id_autor, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, FALSE, $9, 'draft') RETURNING ${CAMPOS}`,
      [...valores(datos), req.user.id]
    );
    await auditar(req, resultado.rows[0].id_publicacion, 'creó una publicación del mural', datos.titulo);
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al crear publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo guardar la publicación' });
  }
});

router.use('/:id', (req, res, next) => {
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) < 1) return res.status(400).json({ error: 'Publicación no válida' });
  next();
});

router.put('/:id', async (req, res) => {
  try {
    const rol = req.user.id_rol;
    // Coordinación y rectoría no editan contenido del mural.
    if (rol !== ROL_RESPONSABLE_MURAL) {
      return res.status(403).json({ error: 'Solo el responsable del mural puede editar el contenido' });
    }
    const actual = await pool.query(
      `SELECT ${CAMPOS} FROM publicaciones_mural WHERE id_publicacion = $1`,
      [req.params.id]
    );
    if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    const publicacionActual = actual.rows[0];
    // Solo el autor puede editar sus publicaciones.
    if (publicacionActual.id_autor !== req.user.id) {
      return res.status(403).json({ error: 'No puedes editar una publicación de otro responsable' });
    }
    // El responsable solo edita borradores o rechazadas; si edita una publicada,
    // pasa nuevamente a revisión.
    if (!['draft', 'rejected', 'published'].includes(publicacionActual.status)) {
      return res.status(409).json({ error: 'Sólo puedes editar borradores, rechazadas o publicaciones (éstas últimas pasan a revisión)' });
    }

    const datos = { ...publicacionActual };
    for (const campo of EDITABLES) if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    const error = validar(datos);
    if (error) return res.status(400).json({ error });

    const nuevoStatus = publicacionActual.status === 'published' ? 'pending' : publicacionActual.status;
    const limpiarRechazo = nuevoStatus !== 'rejected';

    const n = EDITABLES.length;
    const resultado = await pool.query(
      `UPDATE publicaciones_mural SET
      ${EDITABLES.map((campo, i) => `${campo} = $${i + 1}`).join(', ')},
      status = $${n + 1},
      motivo_rechazo = CASE WHEN $${n + 2} THEN NULL ELSE motivo_rechazo END,
      fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_publicacion = $${n + 3} RETURNING ${CAMPOS}`,
      [...valores(datos), nuevoStatus, limpiarRechazo, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    await auditar(req, resultado.rows[0].id_publicacion, 'editó una publicación del mural', datos.titulo);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al editar publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo actualizar la publicación' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rol = req.user.id_rol;
    if (rol !== ROL_RESPONSABLE_MURAL) {
      return res.status(403).json({ error: 'Solo el responsable del mural puede eliminar publicaciones' });
    }
    const actual = await pool.query('SELECT titulo, id_autor, status FROM publicaciones_mural WHERE id_publicacion = $1', [req.params.id]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    const publicacionActual = actual.rows[0];
    if (publicacionActual.id_autor !== req.user.id) {
      return res.status(403).json({ error: 'No puedes eliminar una publicación de otro responsable' });
    }
    if (!['draft', 'rejected'].includes(publicacionActual.status)) {
      return res.status(409).json({ error: 'Sólo puedes eliminar borradores o publicaciones rechazadas' });
    }
    const resultado = await pool.query('DELETE FROM publicaciones_mural WHERE id_publicacion = $1 RETURNING titulo', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    await auditar(req, Number(req.params.id), 'eliminó una publicación del mural', resultado.rows[0].titulo);
    res.json({ mensaje: 'Publicación eliminada' });
  } catch (err) {
    console.error('Error al eliminar publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo eliminar la publicación' });
  }
});

// Enviar una publicación del mural a aprobación (responsable del mural).
router.post('/:id/enviar-aprobacion', async (req, res) => {
  try {
    if (req.user.id_rol !== ROL_RESPONSABLE_MURAL) {
      return res.status(403).json({ error: 'Solo el responsable del mural puede enviar a aprobación' });
    }
    const actual = await pool.query('SELECT id_publicacion, titulo, id_autor, status FROM publicaciones_mural WHERE id_publicacion = $1', [req.params.id]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    const publicacionActual = actual.rows[0];
    if (publicacionActual.id_autor !== req.user.id) {
      return res.status(403).json({ error: 'No puedes enviar a aprobación una publicación de otro responsable' });
    }
    if (!['draft', 'rejected'].includes(publicacionActual.status)) {
      return res.status(409).json({ error: 'Solo se pueden enviar a aprobación borradores o publicaciones rechazadas' });
    }
    const resultado = await pool.query(
      `UPDATE publicaciones_mural
       SET status = 'pending', enviado_revision_at = CURRENT_TIMESTAMP, motivo_rechazo = NULL,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_publicacion = $1 RETURNING ${CAMPOS}`,
      [req.params.id]
    );
    await auditar(req, resultado.rows[0].id_publicacion, 'envió a aprobación una publicación del mural', publicacionActual.titulo);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al enviar a aprobación:', err);
    res.status(500).json({ error: 'No se pudo enviar la publicación a aprobación' });
  }
});

// Aprobar y publicar una publicación del mural (Coordinación / admin).
router.post('/:id/aprobar', async (req, res) => {
  try {
    if (req.user.id_rol !== ROL_ADMIN) {
      return res.status(403).json({ error: 'Solo Coordinación puede aprobar publicaciones del mural' });
    }
    const resultado = await pool.query(
      `UPDATE publicaciones_mural
       SET status = 'published', publicada = TRUE, id_revisor = $2, fecha_revision = CURRENT_TIMESTAMP,
           motivo_rechazo = NULL, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_publicacion = $1 AND status = 'pending' RETURNING ${CAMPOS}`,
      [req.params.id, req.user.id]
    );
    if (!resultado.rows.length) {
      const actual = await pool.query('SELECT id_publicacion, titulo, status FROM publicaciones_mural WHERE id_publicacion = $1', [req.params.id]);
      if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
      const situacion = actual.rows[0].status === 'published' ? 'ya fue aprobada' : actual.rows[0].status === 'rejected' ? 'fue devuelta para correcciones' : 'ya no está pendiente de revisión';
      return res.status(409).json({ error: `Esta publicación ${situacion}. Se actualizará la bandeja.`, status: actual.rows[0].status });
    }
    await auditar(req, resultado.rows[0].id_publicacion, 'aprobó una publicación del mural', resultado.rows[0].titulo);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al aprobar publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo aprobar la publicación' });
  }
});

// Devolver una publicación del mural con observaciones (Coordinación / admin).
router.post('/:id/devolver', async (req, res) => {
  try {
    if (req.user.id_rol !== ROL_ADMIN) {
      return res.status(403).json({ error: 'Solo Coordinación puede devolver publicaciones del mural' });
    }
    const { motivo } = req.body;
    if (typeof motivo !== 'string' || !motivo.trim()) {
      return res.status(400).json({ error: 'Escribe las observaciones para devolver la publicación' });
    }
    if (motivo.length > 2000) {
      return res.status(400).json({ error: 'Las observaciones son demasiado largas' });
    }
    const resultado = await pool.query(
      `UPDATE publicaciones_mural
       SET status = 'rejected', id_revisor = $2, fecha_revision = CURRENT_TIMESTAMP,
           motivo_rechazo = $3, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_publicacion = $1 AND status = 'pending' RETURNING ${CAMPOS}`,
      [req.params.id, req.user.id, motivo.trim()]
    );
    if (!resultado.rows.length) {
      const actual = await pool.query('SELECT id_publicacion, titulo, status FROM publicaciones_mural WHERE id_publicacion = $1', [req.params.id]);
      if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
      const situacion = actual.rows[0].status === 'published' ? 'ya fue aprobada' : actual.rows[0].status === 'rejected' ? 'ya fue devuelta para correcciones' : 'ya no está pendiente de revisión';
      return res.status(409).json({ error: `Esta publicación ${situacion}. Se actualizará la bandeja.`, status: actual.rows[0].status });
    }
    await auditar(req, resultado.rows[0].id_publicacion, 'devolvó una publicación del mural', resultado.rows[0].titulo);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al devolver publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo devolver la publicación' });
  }
});

export default router;
