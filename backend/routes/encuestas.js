// Módulo de encuestas (PBI-10).
//
// El modelo es asimétrico a propósito: el ADMIN escribe autenticado, el ALUMNO
// responde sin sesión. La encuesta no guarda ni nombre ni matrícula —esa es la
// razón de que la tabla respuestas_encuesta no tenga esas columnas—, así que
// contestar no expone datos personales. La IP se lee para el rate limit, pero
// nunca se escribe en la base.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generarSlugLibre } from '../lib/slug.js';

const router = Router();

const ROLES_ESCRITURA = [3];
const ROLES_LECTURA = [3, 4];

// Los 5 tipos de la entrega 1. Los de la entrega 2 (número, ranking, matriz)
// se validan al añadir la interfaz: meterlos aquí sin frontend los dejaría
// aceptables por la API pero no pintables por el panel.
const TIPOS_VALIDOS = ['opcion_unica', 'opcion_multiple', 'texto_corto', 'texto_largo', 'escala'];

// Sólo estos dos llevan opciones. 'escala' tiene un rango, no una lista.
const TIPOS_CON_OPCIONES = ['opcion_unica', 'opcion_multiple'];

// Techo alineado con el esquema: detalle_respuestas.chk_detalle_texto corta en
// 2000. Validarlo aquí da un mensaje útil en vez de un 500 del CHECK.
const LONGITUD_TEXTO = {
  texto_corto: 200,
  texto_largo: 2000,
};

const MAX_PREGUNTAS_POR_ENCUESTA = 60;
const MAX_OPCIONES_POR_PREGUNTA = 30;

// chk_encuesta_estado. 'borrador' no es visible para el público ni por enlace:
// es el estado en el que el admin arma la encuesta antes de publicarla.
const ESTADOS = ['borrador', 'publicada', 'cerrada'];

// ===========================================================================
// Rate limit: 5 envíos por hora y por IP.
//
// Va por IP porque la respuesta es anónima: no hay sesión que sirva de
// identidad. Al no persistir la IP, este contador es la única huella del alumno.
const LIMITE_ENVIO_POR_HORA = 5;

const limiteEnvio = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: LIMITE_ENVIO_POR_HORA,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // En desarrollo hay varios alumnos detrás del mismo proxy, y frenar por IP
  // mataría la prueba manual. En producción sí aplica.
  skip: () => process.env.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Alcanzaste el límite de envíos por hora. Intenta más tarde.',
    });
  },
});

// ===========================================================================
// PÚBLICO — responder
// ===========================================================================

/**
 * GET /publico/:slug — definición de la encuesta, sin datos de quién la creó.
 *
 * Sólo expone estado = 'publicada', y filtra `es_visible` en SQL a propósito:
 * si el filtro viviera en el frontend, un alumno leería una pregunta ocultada
 * por el admin con un simple GET al JSON y la encuesta se desarmaría.
 */
router.get('/publico/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const encuesta = await pool.query(
      `SELECT id_encuesta, titulo, descripcion, mensaje_agradecimiento,
              fecha_inicio, fecha_fin
       FROM encuestas
       WHERE slug = $1 AND estado = 'publicada'`,
      [slug]
    );

    // Mismo 404 para "no existe" y para "existe pero está en borrador": no
    // revelamos la existencia de una encuesta que aún no se publicó.
    if (encuesta.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    const e = encuesta.rows[0];
    const ventana = comprobarVigencia(e);

    if (ventana.error) {
      return res.status(ventana.codigo).json({ error: ventana.error });
    }

    const preguntas = await pool.query(
      `SELECT p.id_pregunta, p.texto, p.ayuda, p.tipo, p.es_obligatoria,
              p.escala_min, p.escala_max, p.escala_min_texto, p.escala_max_texto,
              COALESCE(
                (SELECT json_agg(json_build_object('id', o.id_opcion, 'texto', o.texto)
                                 ORDER BY o.orden ASC)
                 FROM opciones_pregunta o WHERE o.id_pregunta = p.id_pregunta),
                '[]'::json
              ) AS opciones
       FROM preguntas p
       WHERE p.id_encuesta = $1 AND p.es_visible = TRUE
       ORDER BY p.orden ASC`,
      [e.id_encuesta]
    );

    res.json({
      titulo: e.titulo,
      descripcion: e.descripcion,
      mensaje_agradecimiento: e.mensaje_agradecimiento,
      fecha_fin: e.fecha_fin,
      preguntas: preguntas.rows,
    });
  } catch (err) {
    console.error('Error al obtener encuesta pública:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /publico/:slug — enviar respuestas.
 *
 * El cuerpo acepta sólo `id_licenciatura` y `respuestas`. Cualquier otro campo
 * se ignora en vez de guardarse: si mañana alguien manda `{ nombre: 'Juan' }`
 * no debe acabar en la base.
 */
router.post('/publico/:slug', limiteEnvio, async (req, res) => {
  const { slug } = req.params;
  const { id_licenciatura, respuestas } = req.body;

  try {
    const encuesta = await pool.query(
      `SELECT id_encuesta, fecha_inicio, fecha_fin
       FROM encuestas
       WHERE slug = $1 AND estado = 'publicada'`,
      [slug]
    );

    if (encuesta.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    const e = encuesta.rows[0];
    const ventana = comprobarVigencia(e);

    if (ventana.error) {
      return res.status(ventana.codigo).json({ error: ventana.error });
    }

    if (!Array.isArray(respuestas)) {
      return res.status(400).json({ error: 'Las respuestas deben ser una lista' });
    }

    if (respuestas.length > MAX_PREGUNTAS_POR_ENCUESTA) {
      return res.status(400).json({ error: 'Demasiadas respuestas en un solo envío' });
    }

    const idLicenciatura = await validarLicenciatura(id_licenciatura);
    if (idLicenciatura.error) {
      return res.status(400).json({ error: idLicenciatura.error });
    }

    // Catálogo de la encuesta YA filtrado por es_visible. Este es el punto de
    // control real: si llega un id_pregunta de otra encuesta, o de una pregunta
    // oculta, no está en este mapa y el envío se rechaza.
    const definiciones = await cargarDefiniciones(e.id_encuesta);

    const validado = validarRespuestas(respuestas, definiciones);
    if (validado.error) {
      return res.status(400).json({ error: validado.error });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const envio = await client.query(
        `INSERT INTO respuestas_encuesta (id_encuesta, id_licenciatura)
         VALUES ($1, $2)
         RETURNING id_respuesta`,
        [e.id_encuesta, idLicenciatura.valor]
      );

      const idRespuesta = envio.rows[0].id_respuesta;

      // detalle_respuestas guarda UN valor por fila y chk_detalle_valor exige
      // exactamente uno de (id_opcion, texto, numero). Por eso la opción
      // múltiple no va como array: se inserta una fila por opción marcada.
      for (const fila of validado.filas) {
        await client.query(
          `INSERT INTO detalle_respuestas
             (id_respuesta, id_pregunta, id_opcion, texto, numero)
           VALUES ($1, $2, $3, $4, $5)`,
          [idRespuesta, fila.id_pregunta, fila.id_opcion, fila.texto, fila.numero]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({ message: 'Respuestas enviadas' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al guardar respuestas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Traduce el estado del enlace a un error HTTP.
 *
 * 410 y no 403 al estar vencida: la encuesta no se va a reabrir, así que
 * reintentar no tiene sentido y el frontend puede mostrar "cerrada" en vez de
 * un error genérico.
 *
 * @returns {{error: string, codigo: number}|null}
 */
function comprobarVigencia(encuesta) {
  const ahora = Date.now();
  const inicio = encuesta.fecha_inicio ? new Date(encuesta.fecha_inicio).getTime() : null;
  const fin = encuesta.fecha_fin ? new Date(encuesta.fecha_fin).getTime() : null;

  if (inicio !== null && ahora < inicio) {
    return { codigo: 403, error: 'Esta encuesta todavía no está disponible' };
  }

  if (fin !== null && ahora > fin) {
    return { codigo: 410, error: 'Esta encuesta ya se cerró' };
  }

  return null;
}

/**
 * Valida la licenciatura opcional contra el catálogo.
 *
 * Va contra `cat_licenciaturas` y no contra lo que manda el cliente, por la
 * misma razón que en el formulario de clubes: el id viene del navegador.
 *
 * @returns {Promise<{valor: number|null}|{error: string}>}
 */
async function validarLicenciatura(idLicenciatura) {
  if (idLicenciatura === undefined || idLicenciatura === null || idLicenciatura === '') {
    return { valor: null };
  }

  const n = Number(idLicenciatura);
  if (!Number.isInteger(n) || n <= 0) {
    return { error: 'Licenciatura inválida' };
  }

  const existe = await pool.query(
    'SELECT id_licenciatura FROM cat_licenciaturas WHERE id_licenciatura = $1',
    [n]
  );

  if (existe.rows.length === 0) {
    return { error: 'La licenciatura seleccionada no existe' };
  }

  return { valor: n };
}

/**
 * Carga preguntas visibles y sus opciones en dos queries, no una por respuesta.
 *
 * Devuelve un Map para que validar sea O(1) por respuesta y no necesite ir a la
 * base: un POST con 40 respuestas no debe disparar 80 queries.
 *
 * @returns {Promise<Map<number, object>>}
 */
async function cargarDefiniciones(idEncuesta) {
  const preguntas = await pool.query(
    `SELECT id_pregunta, tipo, es_obligatoria, escala_min, escala_max
     FROM preguntas
     WHERE id_encuesta = $1 AND es_visible = TRUE
     ORDER BY orden ASC`,
    [idEncuesta]
  );

  const definiciones = new Map(
    preguntas.rows.map((p) => [
      p.id_pregunta,
      { ...p, opciones: new Set(), respondida: false },
    ])
  );

  if (definiciones.size === 0) return definiciones;

  const opciones = await pool.query(
    `SELECT o.id_opcion
     FROM opciones_pregunta o
     JOIN preguntas p ON p.id_pregunta = o.id_pregunta
     WHERE p.id_encuesta = $1 AND p.es_visible = TRUE`,
    [idEncuesta]
  );

  for (const o of opciones.rows) {
    definiciones.get(o.id_pregunta)?.opciones.add(o.id_opcion);
  }

  return definiciones;
}

/**
 * Valida el lote de respuestas y lo aplana a filas de detalle_respuestas.
 *
 * Se valida todo ANTES de abrir la transacción: si algo está mal, no se ha
 * escrito nada todavía y no hace falta compensar a medias.
 *
 * @returns {{filas: object[]}|{error: string}}
 */
function validarRespuestas(respuestas, definiciones) {
  const filas = [];

  for (const r of respuestas) {
    const idPregunta = Number(r?.id_pregunta);

    if (!Number.isInteger(idPregunta) || !definiciones.has(idPregunta)) {
      return { error: `La pregunta ${r?.id_pregunta} no pertenece a esta encuesta` };
    }

    const definicion = definiciones.get(idPregunta);
    const valor = valorDeRespuesta(r.valor, definicion);

    if (valor.error) {
      return { error: valor.error };
    }

    if (valor.vacio) {
      // Sin respuesta. Más abajo se comprueba si era obligatoria.
      continue;
    }

    definicion.respondida = true;
    filas.push(...valor.filas);
  }

  // Una obligatoria sin contestar es un error, esté ausente del POST o en blanco.
  // El segundo caso importa: si sólo miráramos el bucle de arriba, un cliente
  // que mandara la pregunta vacía pasaría por una encuesta completa.
  for (const d of definiciones.values()) {
    if (d.es_obligatoria && !d.respondida) {
      return { error: 'Hay preguntas obligatorias sin responder' };
    }
  }

  return { filas };
}

/**
 * Valida el valor de una respuesta y devuelve las filas de detalle a insertar.
 *
 * Una pregunta puede producir varias filas (opción múltiple) o ninguna (queda
 * en blanco). Cada fila lleva exactamente uno de los tres valores, como exige
 * chk_detalle_valor.
 *
 * @returns {{vacio: boolean, filas: object[]}|{error: string}}
 */
function valorDeRespuesta(valorCrudo, definicion) {
  const { tipo, opciones } = definicion;

  const vacio =
    valorCrudo === undefined ||
    valorCrudo === null ||
    (typeof valorCrudo === 'string' && valorCrudo.trim() === '') ||
    (Array.isArray(valorCrudo) && valorCrudo.length === 0);

  if (vacio) {
    return { vacio: true, filas: [] };
  }

  if (tipo === 'texto_corto' || tipo === 'texto_largo') {
    if (typeof valorCrudo !== 'string') {
      return { error: 'La respuesta debe ser texto' };
    }

    const maximo = LONGITUD_TEXTO[tipo];
    if (valorCrudo.length > maximo) {
      return { error: `La respuesta no puede exceder ${maximo} caracteres` };
    }

    return {
      vacio: false,
      filas: [{ id_pregunta: definicion.id_pregunta, texto: valorCrudo.trim() }],
    };
  }

  if (tipo === 'escala') {
    const n = Number(valorCrudo);

    if (!Number.isInteger(n)) {
      return { error: 'La respuesta de la escala debe ser un número entero' };
    }

    // El rango se leyó de la fila ya filtrada por es_visible, así que no hace
    // falta volver a consultarlo ni a confiar en lo que mandó el cliente.
    const min = definicion.escala_min ?? 0;
    const max = definicion.escala_max ?? 10;

    if (n < min || n > max) {
      return { error: `La respuesta debe estar entre ${min} y ${max}` };
    }

    return { vacio: false, filas: [{ id_pregunta: definicion.id_pregunta, numero: n }] };
  }

  if (tipo === 'opcion_unica') {
    const id = Number(valorCrudo);

    if (!opciones.has(id)) {
      return { error: 'La opción seleccionada no pertenece a esta pregunta' };
    }

    return { vacio: false, filas: [{ id_pregunta: definicion.id_pregunta, id_opcion: id }] };
  }

  if (tipo === 'opcion_multiple') {
    if (!typeof valorCrudo.join === 'function') {
      return { error: 'La respuesta debe ser una lista de opciones' };
    }

    // El Set quita duplicados antes de validar: sin él, marcar dos veces la
    // misma opción saltaría en uq_detalle_opcion con un 500 feo en vez de un 400.
    const ids = [...new Set(valorCrudo.map(Number))];

    if (ids.length > opciones.size) {
      return { error: 'Demasiadas opciones seleccionadas' };
    }

    for (const id of ids) {
      if (!opciones.has(id)) {
        return { error: 'Alguna opción seleccionada no pertenece a esta pregunta' };
      }
    }

    return {
      vacio: false,
      filas: ids.map((id) => ({ id_pregunta: definicion.id_pregunta, id_opcion: id })),
    };
  }

  return { error: `Tipo de pregunta no soportado: ${tipo}` };
}

// ===========================================================================
// ADMIN — gestión de encuestas
// ===========================================================================

/** GET /admin — listar todas, con conteo de respuestas y de preguntas vivas. */
router.get('/admin', authenticate, requireRole(...ROLES_LECTURA), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id_encuesta, e.slug, e.titulo, e.descripcion, e.estado,
              e.fecha_inicio, e.fecha_fin, e.fecha_creacion,
              (SELECT COUNT(*) FROM respuestas_encuesta r
                WHERE r.id_encuesta = e.id_encuesta) AS total_respuestas,
              (SELECT COUNT(*) FROM preguntas p
                WHERE p.id_encuesta = e.id_encuesta AND p.es_visible = TRUE) AS total_preguntas
       FROM encuestas e
       ORDER BY e.fecha_creacion DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar encuestas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /admin — crear encuesta vacía.
 *
 * Nace en 'borrador': el enlace no responde hasta que el admin la publica, para
 * no repartir un link a una encuesta a medio armar.
 */
router.post('/admin', authenticate, requireRole(...ROLES_ESCRITURA), async (req, res) => {
  const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;

  if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  if (titulo.length > 200) {
    return res.status(400).json({ error: 'El título no puede exceder 200 caracteres' });
  }

  const fechas = validarFechas(fecha_inicio, fecha_fin);
  if (fechas.error) {
    return res.status(400).json({ error: fechas.error });
  }

  try {
    const slug = await generarSlugLibre(pool);

    const result = await pool.query(
      `INSERT INTO encuestas (titulo, descripcion, slug, id_creador, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_encuesta, slug, titulo, descripcion, estado,
                 fecha_inicio, fecha_fin, fecha_creacion`,
      [titulo.trim(), descripcion?.trim() || null, slug, req.user.id,
       fechas.inicio, fechas.fin]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear encuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/** GET /admin/:id — encuesta completa, incluidas las preguntas ocultas. */
router.get('/admin/:id', authenticate, requireRole(...ROLES_LECTURA), async (req, res) => {
  try {
    const encuesta = await pool.query(
      `SELECT id_encuesta, slug, titulo, descripcion, mensaje_agradecimiento, estado,
              fecha_inicio, fecha_fin, fecha_creacion
       FROM encuestas WHERE id_encuesta = $1`,
      [req.params.id]
    );

    if (encuesta.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    const preguntas = await pool.query(
      `SELECT p.id_pregunta, p.texto, p.ayuda, p.tipo, p.es_obligatoria, p.es_visible,
              p.orden, p.escala_min, p.escala_max,
              p.escala_min_texto, p.escala_max_texto,
              COALESCE(
                (SELECT json_agg(json_build_object('id', o.id_opcion, 'texto', o.texto)
                                 ORDER BY o.orden ASC)
                 FROM opciones_pregunta o WHERE o.id_pregunta = p.id_pregunta),
                '[]'::json
              ) AS opciones
       FROM preguntas p
       WHERE p.id_encuesta = $1
       ORDER BY p.orden ASC`,
      [req.params.id]
    );

    res.json({ ...encuesta.rows[0], preguntas: preguntas.rows });
  } catch (err) {
    console.error('Error al obtener encuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /admin/:id — editar metadatos, cambiar estado y abrir/cerrar.
 *
 * COALESCE por columna para que un PUT no borre lo que el panel no mandó.
 */
router.put('/admin/:id', authenticate, requireRole(...ROLES_ESCRITURA), async (req, res) => {
  const { titulo, descripcion, mensaje_agradecimiento, estado, fecha_inicio, fecha_fin } = req.body;

  if (estado !== undefined && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Debe ser uno de: ${ESTADOS.join(', ')}` });
  }

  const fechas = validarFechas(fecha_inicio, fecha_fin);
  if (fechas.error) {
    return res.status(400).json({ error: fechas.error });
  }

  try {
    const result = await pool.query(
      `UPDATE encuestas
       SET titulo = COALESCE($2, titulo),
           descripcion = $3,
           mensaje_agradecimiento = $4,
           estado = COALESCE($5, estado),
           fecha_inicio = $6,
           fecha_fin = $7
       WHERE id_encuesta = $1
       RETURNING id_encuesta, slug, titulo, descripcion, mensaje_agradecimiento,
                 estado, fecha_inicio, fecha_fin`,
      [req.params.id,
       titulo?.trim() ?? null,
       descripcion === undefined ? null : descripcion?.trim() || null,
       mensaje_agradecimiento === undefined ? null : mensaje_agradecimiento?.trim() || null,
       estado ?? null,
       fechas.inicio,
       fechas.fin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar encuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /admin/:id — borrar encuesta con preguntas y respuestas.
 *
 * Las FK del esquema son CASCADE hasta detalle_respuestas, así que una sola
 * sentencia basta. Ojo: la de respuestas_encuesta es RESTRICT, y por eso borrar
 * una encuesta con respuestas tiene que desactivar (`estado = 'cerrada'`), no
 * borrar.
 */
router.delete('/admin/:id', authenticate, requireRole(...ROLES_ESCRITURA), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM encuestas WHERE id_encuesta = $1 RETURNING id_encuesta',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede borrar una encuesta que ya tiene respuestas. Ciérrala en su lugar.',
      });
    }
    console.error('Error al eliminar encuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Valida el par de fechas de vigencia.
 *
 * Devuelve ambas en NULL si el panel mandó cadenas vacías, que es lo que
 * devuelve un <input type="datetime-local"> sin tocar. Si no se limpian a NULL,
 * Postgres rechaza '' como timestamp.
 *
 * @returns {{inicio: string|null, fin: string|null}|{error: string}}
 */
function validarFechas(fecha_inicio, fecha_fin) {
  const inicio = fecha_inicio ? new Date(fecha_inicio) : null;
  const fin = fecha_fin ? new Date(fecha_fin) : null;

  if (inicio && Number.isNaN(inicio.getTime())) {
    return { error: 'La fecha de inicio no es válida' };
  }

  if (fin && Number.isNaN(fin.getTime())) {
    return { error: 'La fecha de cierre no es válida' };
  }

  // chk_encuesta_vigencia exige lo mismo, pero avisarlo aquí es mucho más útil
  // que dejar que reviente un CHECK.
  if (inicio && fin && fin <= inicio) {
    return { error: 'La fecha de cierre debe ser posterior a la de inicio' };
  }

  return { inicio: inicio ? inicio.toISOString() : null, fin: fin ? fin.toISOString() : null };
}

/**
 * POST /admin/:id/preguntas — añadir una pregunta.
 *
 * Las opciones se insertan en la misma transacción que la pregunta: si una de
 * las dos falla, no queda una pregunta de opción múltiple sin opciones, que es
 * justo el estado que rompería el formulario público.
 */
router.post(
  '/admin/:id/preguntas',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const {
      texto,
      ayuda,
      tipo,
      es_obligatoria,
      es_visible,
      escala_min,
      escala_max,
      escala_min_texto,
      escala_max_texto,
      opciones,
    } = req.body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return res.status(400).json({ error: 'El texto de la pregunta es obligatorio' });
    }

    if (texto.length > 500) {
      return res.status(400).json({ error: 'La pregunta no puede exceder 500 caracteres' });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        error: `Tipo de pregunta no válido. Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }

    // chk_pregunta_escala exige min/max sólo en 'escala' y los prohibisce en el
    // resto. Por eso los cuatro van a NULL cuando el tipo no es escala, en vez
    // de "si viene, lo paso": mandar min=1 con un texto dejaría sin escala.
    let min = null;
    let max = null;
    let minTexto = null;
    let maxTexto = null;

    if (tipo === 'escala') {
      min = escala_min ?? 0;
      max = escala_max ?? 5;

      // Mismos límites que el CHECK: 0..10 y max > min.
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 10 || min >= max) {
        return res.status(400).json({
          error: 'El rango de la escala es inválido: debe ir de 0 a 10, con el máximo mayor que el mínimo',
        });
      }

      minTexto = escala_min_texto?.trim() || null;
      maxTexto = escala_max_texto?.trim() || null;
    }

    const opcionesLimpias = sanitizarOpciones(opciones);
    if (opcionesLimpias.error) {
      return res.status(400).json({ error: opcionesLimpias.error });
    }

    const llevaOpciones = TIPOS_CON_OPCIONES.includes(tipo);
    if (llevaOpciones && opcionesLimpias.valores.length < 2) {
      return res.status(400).json({ error: 'Una pregunta de opción necesita al menos 2 opciones' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const total = await client.query(
        'SELECT COUNT(*) AS total FROM preguntas WHERE id_encuesta = $1',
        [req.params.id]
      );

      if (total.rows[0].total >= MAX_PREGUNTAS_POR_ENCUESTA) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `La encuesta no puede tener más de ${MAX_PREGUNTAS_POR_ENCUESTA} preguntas`,
        });
      }

      // `orden` es MAX+1 para que la pregunta salga al final. Se calcula en SQL y
      // no en JS para no depender del conteo que leyó el cliente.
      const pregunta = await client.query(
        `INSERT INTO preguntas (
           id_encuesta, texto, ayuda, tipo, es_obligatoria, es_visible, orden,
           escala_min, escala_max, escala_min_texto, escala_max_texto)
         VALUES (
           $1, $2, $3, $4, $5, $6,
           COALESCE((SELECT MAX(orden) + 1 FROM preguntas WHERE id_encuesta = $1), 1),
           $7, $8, $9, $10)
         RETURNING id_pregunta`,
        [req.params.id, texto.trim(), ayuda?.trim() || null, tipo,
         Boolean(es_obligatoria),
         es_visible === undefined ? true : Boolean(es_visible),
         min, max, minTexto, maxTexto]
      );

      const idPregunta = pregunta.rows[0].id_pregunta;

      if (llevaOpciones) {
        for (const [i, textoOpcion] of opcionesLimpias.valores.entries()) {
          await client.query(
            'INSERT INTO opciones_pregunta (id_pregunta, texto, orden) VALUES ($1, $2, $3)',
            [idPregunta, textoOpcion, i + 1]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({ id_pregunta: idPregunta });
    } catch (err) {
      await client.query('ROLLBACK');

      // 23503 = la encuesta no existe.
      if (err.code === '23503') {
        return res.status(404).json({ error: 'Encuesta no encontrada' });
      }

      console.error('Error al crear pregunta:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /admin/preguntas/:idPregunta — editar.
 *
 * `es_visible` y `es_obligatoria` se resuelven con COALESCE en vez de un
 * booleano plano: el panel los manda siempre, y calcular Boolean('false')
 * saldría true, así que una pregunta nunca se ocultaría ni dejaría de ser
 * obligatoria.
 *
 * El tipo NO se cambia aquí. Cambiar 'texto_corto' por 'opcion_unica'
 * dejaría la pregunta sin opciones; el panel lo resuelve borrando y recreando.
 */
router.put(
  '/admin/preguntas/:idPregunta',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const { texto, ayuda, es_obligatoria, es_visible, escala_min, escala_max,
            escala_min_texto, escala_max_texto } = req.body;

    try {
      const result = await pool.query(
        `UPDATE preguntas
         SET texto = COALESCE($2, texto),
             ayuda = $3,
             es_obligatoria = COALESCE($4, es_obligatoria),
             es_visible = COALESCE($5, es_visible),
             escala_min = COALESCE($6, escala_min),
             escala_max = COALESCE($7, escala_max),
             escala_min_texto = COALESCE($8, escala_min_texto),
             escala_max_texto = COALESCE($9, escala_max_texto)
         WHERE id_pregunta = $1
         RETURNING id_pregunta, texto, ayuda, tipo, es_obligatoria, es_visible,
                   escala_min, escala_max, escala_min_texto, escala_max_texto`,
        [req.params.idPregunta,
         texto?.trim() ?? null,
         ayuda === undefined ? null : ayuda?.trim() || null,
         es_obligatoria === undefined ? null : Boolean(es_obligatoria),
         es_visible === undefined ? null : Boolean(es_visible),
         escala_min ?? null,
         escala_max ?? null,
         escala_min_texto?.trim() || null,
         escala_max_texto?.trim() || null]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error al actualizar pregunta:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * DELETE /admin/preguntas/:idPregunta — borrar.
 *
 * fk_detalle_pregunta es ON DELETE RESTRICT, no CASCADE: con respuestas ya
 * registradas la pregunta no se puede borrar porque se perdería el histórico.
 * En ese caso se responde 409 diciendo que la oculten, que es la operación que
 * el admin realmente quiere (dejar de preguntarla sin perder los datos).
 */
router.delete(
  '/admin/preguntas/:idPregunta',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM preguntas WHERE id_pregunta = $1 RETURNING id_pregunta',
        [req.params.idPregunta]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      res.json({ ok: true });
    } catch (err) {
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'Esta pregunta ya tiene respuestas registradas, así que no se puede borrar. Ocúltala para que deje de mostrarse.',
        });
      }

      console.error('Error al eliminar pregunta:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * PUT /admin/preguntas/:idPregunta/opciones — reemplazar la lista de opciones.
 *
 * Sólo para preguntas de tipo opción. Reemplaza enteras porque editar la lista
 * a medias (borrar una opción que ya tiene respuestas) dispararía el RESTRICT
 * de fk_detalle_opcion; el panel debe avisar de eso antes de guardar.
 */
router.put(
  '/admin/preguntas/:idPregunta/opciones',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const pregunta = await pool.query(
      'SELECT tipo FROM preguntas WHERE id_pregunta = $1',
      [req.params.idPregunta]
    );

    if (pregunta.rows.length === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    if (!TIPOS_CON_OPCIONES.includes(pregunta.rows[0].tipo)) {
      return res.status(400).json({ error: 'Este tipo de pregunta no tiene opciones' });
    }

    const opciones = sanitizarOpciones(req.body.opciones);
    if (opciones.error) {
      return res.status(400).json({ error: opciones.error });
    }

    if (opciones.valores.length < 2) {
      return res.status(400).json({ error: 'Una pregunta de opción necesita al menos 2 opciones' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM opciones_pregunta WHERE id_pregunta = $1', [
        req.params.idPregunta,
      ]);

      for (const [i, texto] of opciones.valores.entries()) {
        await client.query(
          'INSERT INTO opciones_pregunta (id_pregunta, texto, orden) VALUES ($1, $2, $3)',
          [req.params.idPregunta, texto, i + 1]
        );
      }

      await client.query('COMMIT');

      res.json({ opciones: opciones.valores });
    } catch (err) {
      await client.query('ROLLBACK');

      if (err.code === '23503') {
        return res.status(409).json({
          error: 'Alguna de esas opciones ya tiene respuestas registradas. No se pueden quitar.',
        });
      }

      console.error('Error al actualizar opciones:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
      client.release();
    }
  }
);

/**
 * Valida y normaliza la lista de opciones que envía el panel.
 *
 * Descarta vacíos y repetidos en vez de fallar: el editor deja el campo en
 * blanco al quitar una opción, y rechazar el guardado por eso sería molesto.
 *
 * @returns {{valores: string[]}|{error: string}}
 */
function sanitizarOpciones(opciones) {
  if (opciones === undefined || opciones === null) {
    return { valores: [] };
  }

  if (!Array.isArray(opciones)) {
    return { error: 'Las opciones deben ser una lista' };
  }

  if (opciones.length > MAX_OPCIONES_POR_PREGUNTA) {
    return { error: `Una pregunta no puede tener más de ${MAX_OPCIONES_POR_PREGUNTA} opciones` };
  }

  const valores = [];
  const vistos = new Set();

  for (const o of opciones) {
    const texto = String(o ?? '').trim();

    if (texto.length === 0) continue;

    if (texto.length > 300) {
      return { error: 'Una opción no puede exceder 300 caracteres' };
    }

    const clave = texto.toLowerCase();
    if (vistos.has(clave)) continue;

    vistos.add(clave);
    valores.push(texto);
  }

  return { valores };
}

export default router;


