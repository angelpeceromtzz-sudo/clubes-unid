// Rutas de noticias — consulta pública y administración (admin / rectoría / responsable del mural)
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { registrarHistorial } from '../lib/audit.js';
import { eliminarImagenCloudinary } from '../lib/eliminarImagenCloudinary.js';
import { validarParamsEnteros } from '../lib/validarId.js';
import { fechaEventoValida, errorPeriodoEvento } from '../lib/fechasEvento.js';

// 3 admin · 4 rectoría · 6 responsable_mural. Los tres redactan; sólo
// rectoría (4) aprueba, rechaza u oculta. Ver `TRANSICIONES`.
const ROL_RECTORIA = 4;
const ROLES_EDITOR = [3, 4, 6];

// PBI-17: estados del flujo de aprobación previa.
const ESTADOS_NOTICIA = ['draft', 'pending', 'published', 'rejected'];
const MOTIVO_MAX = 500;

const CATEGORIAS_PERMITIDAS = ['promocion', 'evento', 'informativo'];
const CATEGORIAS_EVENTO = ['social', 'deportivo', 'cultural'];

const CAMPOS = `id_noticia, titulo, subtitulo, contenido, url_imagen, destacada,
                publicada, categoria, fecha_evento::text AS fecha_evento, fecha_fin_evento::text AS fecha_fin_evento,
                mostrar_en_mural, hora_evento, lugar_evento, categoria_evento,
                status, motivo_rechazo, fecha_revision,
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

function esEstadoValido(valor) {
  return typeof valor === 'string' && ESTADOS_NOTICIA.includes(valor);
}

// El motivo de rechazo es opcional: vacío => null. Devuelve el texto ya
// recortado o un error de validación para responder 400.
function validarMotivo(valor) {
  if (valor == null || valor === '') return { motivo: null, error: null };
  if (typeof valor !== 'string') return { motivo: null, error: 'El motivo debe ser texto' };
  const limpio = valor.trim();
  if (!limpio) return { motivo: null, error: null };
  if (limpio.length > MOTIVO_MAX) {
    return { motivo: null, error: `El motivo no puede exceder ${MOTIVO_MAX} caracteres` };
  }
  return { motivo: limpio, error: null };
}

// El responsable del mural sólo toca sus propias noticias; admin y rectoría
// trabajan sobre todo el periódico mural.
function puedeGestionar(req, noticia) {
  if (req.user.id_rol === ROL_RECTORIA || req.user.id_rol === 3) return true;
  return noticia.id_autor === req.user.id;
}

// Carga la noticia de la transición y valida que el rol tenga permitido
// moverla desde uno de `origenes`. Responde con el error apropiado o null.
async function cargarTransicion(req, res, origenes, etiqueta) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Noticia no válida' });
    return null;
  }
  const existe = await pool.query(
    'SELECT id_noticia, titulo, status, id_autor FROM noticias WHERE id_noticia = $1',
    [id]
  );
  if (existe.rows.length === 0) {
    res.status(404).json({ error: 'Noticia no encontrada' });
    return null;
  }
  const noticia = existe.rows[0];
  if (!origenes.includes(noticia.status)) {
    res.status(409).json({
      error: `No se puede ${etiqueta} una noticia en estado "${noticia.status}"`,
    });
    return null;
  }
  if (!puedeGestionar(req, noticia)) {
    res.status(403).json({ error: 'No tienes permisos sobre esta noticia' });
    return null;
  }
  return noticia;
}

const router = Router();

validarParamsEnteros(router);

// Lista noticias públicas, de la más reciente a la más antigua
router.get('/', async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite, 10) || 50, 200);
    const result = await pool.query(
      `SELECT ${CAMPOS}
       FROM noticias
       WHERE status = 'published' AND publicada = TRUE AND solo_calendario = FALSE
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
       WHERE status = 'published' AND publicada = TRUE AND categoria = 'evento' AND solo_calendario = FALSE
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
       WHERE status = 'published' AND publicada = TRUE AND mostrar_en_mural = TRUE AND solo_calendario = FALSE
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
       WHERE ie.id_usuario = $1 AND n.status = 'published' AND n.publicada = TRUE AND n.categoria = 'evento' AND n.solo_calendario = FALSE`,
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
       WHERE id_noticia = $1 AND categoria = 'evento' AND status = 'published' AND publicada = TRUE AND solo_calendario = FALSE`,
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

// Lista las noticias del mural (incluye borradores) — admin / rectoría / responsable.
// El responsable del mural sólo ve las suyas ("sus noticias guardadas");
// admin y rectoría ven todo. `?status=` filtra por estado del flujo.
router.get('/admin', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { status } = req.query;
    const condiciones = ['noticias.solo_calendario = FALSE'];
    const parametros = [];

    if (req.user.id_rol !== 3 && req.user.id_rol !== ROL_RECTORIA) {
      parametros.push(req.user.id);
      condiciones.push(`noticias.id_autor = $${parametros.length}`);
    }

    if (status !== undefined) {
      if (!esEstadoValido(status)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }
      parametros.push(status);
      condiciones.push(`noticias.status = $${parametros.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT ${CAMPOS}, u.nombre_completo AS autor_nombre,
              (SELECT COUNT(*)::int FROM intereses_eventos ie WHERE ie.id_noticia = noticias.id_noticia) AS total_interesados
       FROM noticias
       LEFT JOIN usuarios u ON u.id_usuario = noticias.id_autor
       ${where}
       ORDER BY fecha_publicacion DESC, id_noticia DESC`,
      parametros
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar noticias (admin):', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crea una noticia — admin / rectoría / responsable del mural
router.post('/', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { titulo, subtitulo, contenido, url_imagen, destacada, categoria, fecha_evento, fecha_fin_evento, mostrar_en_mural, solo_calendario, hora_evento, lugar_evento, categoria_evento, status } = req.body;

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

    // PBI-17: sólo rectoría puede publicar directamente. Admin y responsable
    // del mural nacen en borrador y de ahí pasan por revisión.
    let statusFinal;
    if (req.user.id_rol === ROL_RECTORIA) {
      statusFinal = status ?? 'published';
      if (!esEstadoValido(statusFinal) || !['draft', 'published'].includes(statusFinal)) {
        return res.status(400).json({ error: 'Estado no válido para crear una noticia' });
      }
    } else {
      if (status !== undefined && status !== 'draft') {
        return res.status(403).json({ error: 'Sólo rectoría puede publicar directamente: guarda el borrador y envíalo a revisión' });
      }
      statusFinal = 'draft';
    }

    const result = await pool.query(
      `INSERT INTO noticias (titulo, subtitulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, hora_evento, lugar_evento, categoria_evento, status, id_autor, fecha_fin_evento, mostrar_en_mural)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING ${CAMPOS}`,
      [
        titulo.trim(),
        subtitulo?.trim() || null,
        contenidoFinal,
        url_imagen || null,
        destacada === true,
        statusFinal === 'published',
        categoriaFinal,
        categoriaFinal === 'evento' ? fecha_evento : null,
        categoriaFinal === 'evento' ? hora_evento || null : null,
        categoriaFinal === 'evento' ? lugar_evento?.trim() || null : null,
        categoriaFinal === 'evento' ? categoria_evento ?? 'social' : 'social',
        statusFinal,
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
      descripcion: `${req.user.nombre_completo} creó la noticia "${noticia.titulo}" (${statusFinal === 'published' ? 'publicada' : 'borrador'})`,
      entidadTipo: 'noticia',
      entidadId: noticia.id_noticia,
      detalles: { titulo: noticia.titulo, status: statusFinal },
    });

    res.status(201).json(noticia);
  } catch (err) {
    console.error('Error al crear noticia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Edita una noticia — admin / rectoría / responsable del mural
router.put('/:id', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, subtitulo, contenido, url_imagen, destacada, publicada, categoria, fecha_evento, fecha_fin_evento, mostrar_en_mural, solo_calendario, hora_evento, lugar_evento, categoria_evento, status } = req.body;

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

    // El estado sólo lo mueve rectoría desde aquí; el resto pasa por los
    // endpoints de revisión (enviar-revision / aprobar / rechazar / ocultar).
    let statusParam = null;
    if (status !== undefined) {
      if (req.user.id_rol !== ROL_RECTORIA) {
        return res.status(403).json({ error: 'Sólo rectoría puede cambiar el estado de una publicación' });
      }
      if (!esEstadoValido(status)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }
      statusParam = status;
    }

    const actual = await pool.query(
      'SELECT url_imagen, categoria, fecha_evento::text AS fecha_evento, fecha_fin_evento::text AS fecha_fin_evento, status, id_autor FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }
    const noticiaActual = actual.rows[0];
    if (!puedeGestionar(req, noticiaActual)) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta noticia' });
    }
    // El admin y el responsable corrigen borradores o rechazadas; mientras la
    // noticia está en revisión o publicada, el contenido lo decide rectoría.
    if (req.user.id_rol !== ROL_RECTORIA && !['draft', 'rejected'].includes(noticiaActual.status)) {
      return res.status(409).json({
        error: 'Sólo puedes editar borradores o noticias rechazadas; mientras esté en revisión o publicada el contenido lo valida rectoría',
      });
    }

    const categoriaFinal = categoria ?? noticiaActual.categoria;
    const fechaFinal = fecha_evento === undefined ? noticiaActual.fecha_evento : fecha_evento;
    const finFinal = fecha_fin_evento === undefined ? noticiaActual.fecha_fin_evento : fecha_fin_evento;
    if (categoriaFinal === 'evento') {
      const errorPeriodo = errorPeriodoEvento(fechaFinal, finFinal);
      if (errorPeriodo) return res.status(400).json({ error: errorPeriodo });
    }
    if ((categoria !== undefined || fecha_evento !== undefined) && categoriaFinal === 'evento' && !fechaFinal) {
      return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
    }
    if (categoriaFinal === 'evento' && fecha_evento !== undefined &&
        fecha_evento !== noticiaActual.fecha_evento && fecha_evento < hoyEnCampus()) {
      return res.status(400).json({ error: 'La fecha del evento no puede ser pasada' });
    }

    const urlAnterior = noticiaActual.url_imagen;

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
           status       = COALESCE($15, status),
           fecha_fin_evento = CASE WHEN $7 IS NOT NULL AND $7 <> 'evento' THEN NULL WHEN $17 THEN $18::date ELSE fecha_fin_evento END,
           mostrar_en_mural = COALESCE($19, mostrar_en_mural)
       WHERE id_noticia = $16
       RETURNING ${CAMPOS}`,
      [
        titulo !== undefined ? titulo.trim() : null,
        subtitulo === undefined ? null : subtitulo?.trim() || '',
        contenido !== undefined ? contenido.trim() : null,
        url_imagen !== undefined ? (url_imagen || null) : null,
        destacada === undefined ? null : destacada === true,
        // La bandera sólo la entiende rectoría; para los demás se ignora para
        // que un formulario viejo no pueda publicar por su cuenta.
        (publicada === undefined || req.user.id_rol !== ROL_RECTORIA) ? null : publicada === true,
        categoria === undefined ? null : categoria,
        fecha_evento !== undefined,
        fecha_evento || null,
        hora_evento !== undefined,
        hora_evento || null,
        lugar_evento !== undefined,
        lugar_evento?.trim() || null,
        categoriaFinal === 'evento' ? categoria_evento ?? null : 'social',
        statusParam,
        id,
        fecha_fin_evento !== undefined,
        fecha_fin_evento || null,
        mostrar_en_mural ?? null,
      ]
    );

    // Limpieza de Cloudinary: solo tras un UPDATE exitoso (si falla, el
    // recurso anterior se conserva) y verificando por identidad que otra
    // noticia no siga refiriendo el mismo recurso.
    if (result.rows.length > 0 && url_imagen && url_imagen !== urlAnterior) {
      const refs = await pool.query(
        'SELECT url_imagen FROM noticias WHERE url_imagen IS NOT NULL AND id_noticia <> $1',
        [id]
      );
      await eliminarImagenCloudinary(urlAnterior, {
        candidatas: refs.rows.map((f) => f.url_imagen),
      });
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

// Elimina una noticia — admin / rectoría; el responsable sólo las suyas y sin publicar.
router.delete('/:id', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await pool.query(
      'SELECT id_noticia, titulo, url_imagen, status, id_autor FROM noticias WHERE id_noticia = $1',
      [id]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia no encontrada' });
    }

    const noticia = existe.rows[0];
    if (!puedeGestionar(req, noticia)) {
      return res.status(403).json({ error: 'No tienes permisos sobre esta noticia' });
    }
    if (req.user.id_rol !== 3 && req.user.id_rol !== ROL_RECTORIA && noticia.status === 'published') {
      return res.status(409).json({
        error: 'No puedes eliminar una publicación ya publicada: pídele a rectoría que la oculte primero',
      });
    }

    await pool.query('DELETE FROM noticias WHERE id_noticia = $1', [id]);

    // La noticia ya no existe en BD: el recurso solo se destruye si ninguna
    // otra noticia lo sigue refiriendo (comparación por identidad de public_id).
    const refs = await pool.query(
      'SELECT url_imagen FROM noticias WHERE url_imagen IS NOT NULL'
    );
    await eliminarImagenCloudinary(existe.rows[0].url_imagen, {
      candidatas: refs.rows.map((f) => f.url_imagen),
    });

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion: 'eliminar_noticia',
      descripcion: `${req.user.nombre_completo} eliminó la noticia "${noticia.titulo}"`,
      entidadTipo: 'noticia',
      entidadId: parseInt(id),
      detalles: { titulo: noticia.titulo, status: noticia.status },
    });

    res.json({ message: 'Noticia eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar noticia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// PBI-17 — Transiciones del flujo de aprobación previa
// ============================================================
// Rectoría es la única autoridad que publica, rechaza u oculta. Admin y el
// responsable del mural sólo pueden llevar su noticia a revisión.

async function aplicarTransicion(req, res, { origenes, destino, etiqueta, accion, conMotivo = false }) {
  try {
    const noticia = await cargarTransicion(req, res, origenes, etiqueta);
    if (!noticia) return;

    let motivo = null;
    if (conMotivo) {
      const validado = validarMotivo(req.body?.motivo);
      if (validado.error) return res.status(400).json({ error: validado.error });
      motivo = validado.motivo;
    }

    const result = await pool.query(
      `UPDATE noticias
          SET status         = $1,
              motivo_rechazo = $2,
              fecha_revision = $3
        WHERE id_noticia = $4
        RETURNING ${CAMPOS}`,
      [
        destino,
        destino === 'rejected' ? motivo : null,
        destino === 'published' || destino === 'rejected' ? new Date() : null,
        noticia.id_noticia,
      ]
    );

    const actualizada = result.rows[0];

    registrarHistorial({
      idAdmin: req.user.id,
      adminNombre: req.user.nombre_completo,
      accion,
      descripcion: `${req.user.nombre_completo} ${etiqueta} la noticia "${noticia.titulo}"${motivo ? ` — motivo: ${motivo}` : ''}`,
      entidadTipo: 'noticia',
      entidadId: noticia.id_noticia,
      detalles: { status_anterior: noticia.status, status_nuevo: destino, motivo },
    });

    res.json(actualizada);
  } catch (err) {
    console.error(`Error al ${etiqueta} la noticia:`, err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Responsable / admin: listo para revisión.
router.post('/:id/enviar-revision', authenticate, requireRole(...ROLES_EDITOR), async (req, res) => {
  await aplicarTransicion(req, res, {
    origenes: ['draft', 'rejected'],
    destino: 'pending',
    etiqueta: 'enviar a revisión',
    accion: 'enviar_revision_noticia',
  });
});

// Sólo rectoría: pasa a publicada.
router.post('/:id/aprobar', authenticate, requireRole(ROL_RECTORIA), async (req, res) => {
  await aplicarTransicion(req, res, {
    origenes: ['pending'],
    destino: 'published',
    etiqueta: 'aprobar',
    accion: 'aprobar_noticia',
  });
});

// Sólo rectoría: pasa a rechazada, con motivo opcional.
router.post('/:id/rechazar', authenticate, requireRole(ROL_RECTORIA), async (req, res) => {
  await aplicarTransicion(req, res, {
    origenes: ['pending'],
    destino: 'rejected',
    etiqueta: 'rechazar',
    accion: 'rechazar_noticia',
    conMotivo: true,
  });
});

// Sólo rectoría: la saca del muro sin eliminarla.
router.post('/:id/ocultar', authenticate, requireRole(ROL_RECTORIA), async (req, res) => {
  await aplicarTransicion(req, res, {
    origenes: ['published'],
    destino: 'draft',
    etiqueta: 'ocultar',
    accion: 'ocultar_noticia',
  });
});

export default router;
