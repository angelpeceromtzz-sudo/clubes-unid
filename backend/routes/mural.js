import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { fechaEventoValida } from '../lib/fechasEvento.js';

const router = Router();
const CAMPOS = `id_publicacion, titulo, subtitulo, contenido, url_imagen, enlace_url, enlace_texto,
  publicada, destacada, fecha_retiro::text AS fecha_retiro, fecha_creacion, fecha_actualizacion`;
const EDITABLES = ['titulo', 'subtitulo', 'contenido', 'url_imagen', 'enlace_url', 'enlace_texto', 'publicada', 'destacada', 'fecha_retiro'];
const CAMPOS_PUBLICOS = { titulo: '', subtitulo: null, contenido: '', url_imagen: null, enlace_url: null,
  enlace_texto: null, publicada: false, destacada: false, fecha_retiro: null };

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
  if (typeof datos.publicada !== 'boolean' || typeof datos.destacada !== 'boolean') return 'Las opciones de publicación no son válidas';
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
      WHERE publicada = TRUE AND (fecha_retiro IS NULL OR fecha_retiro >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date)
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
router.use(authenticate, requireRole(3, 4, 6));
router.get('/admin', async (_req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS} FROM publicaciones_mural ORDER BY fecha_creacion DESC, id_publicacion DESC`);
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
  const datos = { ...CAMPOS_PUBLICOS };
  for (const campo of EDITABLES) if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
  const error = validar(datos);
  if (error) return res.status(400).json({ error });
  try {
    const resultado = await pool.query(`INSERT INTO publicaciones_mural
      (${EDITABLES.join(', ')}, id_autor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${CAMPOS}`,
    [...valores(datos), req.user.id]);
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
    const actual = await pool.query(`SELECT ${CAMPOS} FROM publicaciones_mural WHERE id_publicacion = $1`, [req.params.id]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    const datos = { ...actual.rows[0] };
    for (const campo of EDITABLES) if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    const error = validar(datos);
    if (error) return res.status(400).json({ error });
    const resultado = await pool.query(`UPDATE publicaciones_mural SET
      ${EDITABLES.map((campo, i) => `${campo} = $${i + 1}`).join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_publicacion = $10 RETURNING ${CAMPOS}`, [...valores(datos), req.params.id]);
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
    const resultado = await pool.query('DELETE FROM publicaciones_mural WHERE id_publicacion = $1 RETURNING titulo', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Publicación no encontrada' });
    await auditar(req, Number(req.params.id), 'eliminó una publicación del mural', resultado.rows[0].titulo);
    res.json({ mensaje: 'Publicación eliminada' });
  } catch (err) {
    console.error('Error al eliminar publicación del mural:', err);
    res.status(500).json({ error: 'No se pudo eliminar la publicación' });
  }
});
export default router;
