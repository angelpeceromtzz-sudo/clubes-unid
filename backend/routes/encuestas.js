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

// Los tipos de la entrega 1, más 'licenciatura'. Los de la entrega 2 (número,
// ranking, matriz) se validan al añadir la interfaz: meterlos aquí sin frontend
// los dejaría aceptables por la API pero no pintables por el panel.
const TIPOS_VALIDOS = [
  'opcion_unica',
  'opcion_multiple',
  'texto_corto',
  'texto_largo',
  'escala',
  'licenciatura',
];

// Sólo estos dos llevan opciones. 'escala' tiene un rango, no una lista, y
// 'licenciatura' sus opciones vienen del catálogo cat_licenciaturas, no de
// opciones_pregunta: por eso no entra en esta lista.
const TIPOS_CON_OPCIONES = ['opcion_unica', 'opcion_multiple'];

// Techo alineado con el esquema: detalle_respuestas.chk_detalle_texto corta en
// 2000. Validarlo aquí da un mensaje útil en vez de un 500 del CHECK.
const LONGITUD_TEXTO = {
  texto_corto: 200,
  texto_largo: 2000,
};

const MAX_PREGUNTAS_POR_ENCUESTA = 60;
const MAX_OPCIONES_POR_PREGUNTA = 30;

// Cuántos textos libres trae la respuesta de resultados. Es un techo de
// transporte, no de datos: el conteo real siempre viaja completo en
// `total_textos`, para que el panel pueda decir "mostrando 200 de 1,240" en vez
// de presentar el recorte como si fuera el total.
const LIMITE_TEXTOS_RESULTADOS = 200;

// chk_encuesta_estado. 'borrador' no es visible para el público ni por enlace:
// es el estado en el que el admin arma la encuesta antes de publicarla.
const ESTADOS = ['borrador', 'publicada', 'cerrada'];

// ===========================================================================
// Rate limit: 300 envíos por minuto y por IP.
//
// Protege contra ráfagas automatizadas, NO contra respuestas repetidas de una
// misma persona: son dos problemas distintos. Con encuestas anónimas no hay
// identidad y "una IP = un alumno" no se sostiene —el Wi-Fi de la universidad
// mete a decenas o cientos de alumnos detrás de la misma IP pública por NAT—,
// así que el límite se dimensiona al peor caso realista de esa red (100-300
// alumnos enviando en el mismo minuto), no a uno. Evitar duplicados será un
// mecanismo aparte, compatible con anonimato.
//
// El contador vive en memoria (store por defecto): se reinicia en cada deploy
// y es por instancia. Para frenar scripts en una instancia única es suficiente.
// Si algún día hay varias instancias, el límite efectivo se multiplica.
const LIMITE_ENVIO_POR_MINUTO = 300;

const limiteEnvio = rateLimit({
  windowMs: 60 * 1000,
  limit: LIMITE_ENVIO_POR_MINUTO,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // En desarrollo hay varios alumnos detrás del mismo proxy, y frenar por IP
  // mataría la prueba manual. En producción sí aplica.
  skip: () => process.env.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiados envíos desde tu red. Espera un momento e intenta nuevamente.',
    });
  },
});

// ===========================================================================
// PÚBLICO — responder
// ===========================================================================

/**
 * GET /publico/:slug — definición de la encuesta, sin datos de quién la creó.
 *
 * Sólo expone estado = 'publicada'. La lista de preguntas sale entera, sin
 * filtros: si el admin Guardó la encuesta, todas sus preguntas son públicas. No
 * hay ningún campo que permita esconder una sin borrarla.
 */
router.get('/publico/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const encuesta = await pool.query(
      `SELECT id_encuesta, titulo, descripcion, mensaje_agradecimiento, fecha_inicio, fecha_fin, estado FROM encuestas WHERE slug = $1`,
      [slug]
    );

    // Mismo 404 para "no existe" y para "existe pero está en borrador": no
    // revelamos la existencia de una encuesta que aún no se publicó.
    if (encuesta.rows.length === 0 || encuesta.rows[0].estado === 'borrador') {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    const e = encuesta.rows[0];
    if (e.estado === 'cerrada') {
      return res.status(410).json({ error: 'Esta encuesta ya se cerró' });
    }
    const ventana = comprobarVigencia(e);

    // `comprobarVigencia` devuelve null cuando la encuesta SÍ está en ventana, que
    // es el caso normal de uso, así que se pregunta por el null y no por
    // `ventana.error`: preguntar por .error sobre null tiraba el TypeError y el
    // enlace público devolvía 500 en vez de servir la encuesta.
    if (ventana) {
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
       WHERE p.id_encuesta = $1
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
 * El cuerpo acepta sólo `respuestas`. Cualquier otro campo se ignora en vez de
 * guardarse: si mañana alguien manda `{ nombre: 'Juan' }` no debe acabar en la
 * base.
 *
 * El programa ya no llega como campo aparte: viaja en `respuestas`, como la
 * respuesta a la pregunta de tipo 'licenciatura'. Si la encuesta no tiene esa
 * pregunta, no hay forma de mandar un programa y la columna queda en NULL.
 */
router.post('/publico/:slug', limiteEnvio, async (req, res) => {
  const { slug } = req.params;
  const { respuestas } = req.body;

  try {
    const encuesta = await pool.query(
      `SELECT id_encuesta, fecha_inicio, fecha_fin
       FROM encuestas
       WHERE slug = $1 AND estado = 'publicada'`,
      [slug]
    );

    if (encuesta.rows.length === 0 || encuesta.rows[0].estado === 'borrador') {
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }
    const e = encuesta.rows[0];
    if (e.estado === 'cerrada') {
      return res.status(410).json({ error: 'Esta encuesta ya se cerró' });
    }
    const ventana = comprobarVigencia(e);

    // `comprobarVigencia` devuelve null cuando la encuesta SÍ está en ventana, que
    // es el caso normal de uso, así que se pregunta por el null y no por
    // `ventana.error`: preguntar por .error sobre null tiraba el TypeError y el
    // enlace público devolvía 500 en vez de servir la encuesta.
    if (ventana) {
      return res.status(ventana.codigo).json({ error: ventana.error });
    }

    if (!Array.isArray(respuestas)) {
      return res.status(400).json({ error: 'Las respuestas deben ser una lista' });
    }

    if (respuestas.length > MAX_PREGUNTAS_POR_ENCUESTA) {
      return res.status(400).json({ error: 'Demasiadas respuestas en un solo envío' });
    }

    // Catálogo de la encuesta ya cargado. Este es el punto de control real: si llega
    // un id_pregunta de otra encuesta, no está en este mapa y el envío se rechaza.
    const definiciones = await cargarDefiniciones(e.id_encuesta);

    const validado = validarRespuestas(respuestas, definiciones);
    if (validado.error) {
      return res.status(400).json({ error: validado.error });
    }

    // El id sale de la respuesta ya validada por formato, pero que exista de
    // verdad se revisa aquí contra cat_licenciaturas y no antes: hacerlo al
    // revés dejaría el chequeo del catálogo duplicado, y un null (encuesta sin
    // pregunta de licenciatura) tiene que poder pasar sin problema.
    const idLicenciatura = await validarLicenciatura(validado.idLicenciatura);
    if (idLicenciatura.error) {
      return res.status(400).json({ error: idLicenciatura.error });
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
 * Carga preguntas y sus opciones en dos queries, no una por respuesta.
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
     WHERE id_encuesta = $1
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
    `SELECT o.id_opcion, o.id_pregunta
     FROM opciones_pregunta o
     JOIN preguntas p ON p.id_pregunta = o.id_pregunta
     WHERE p.id_encuesta = $1`,
    [idEncuesta]
  );

  // id_pregunta va en el SELECT por el agrupado del renglón de abajo, no por el
  // JOIN: sin esa columna `definiciones.get(undefined)` devuelve undefined y el
  // `?.` se come el error en silencio, dejando a cada pregunta con el Set de
  // opciones vacío. El síntoma es un 400 "Demasiadas opciones seleccionadas" en
  // cualquier pregunta de opción, porque `ids.length > opciones.size` compara
  // contra 0. Si se quita la columna, se quita también el `?.`.
  for (const o of opciones.rows) {
    const definicion = definiciones.get(o.id_pregunta);

    if (definicion) definicion.opciones.add(o.id_opcion);
  }

  return definiciones;
}

/**
 * Valida el lote de respuestas y lo aplana a filas de detalle_respuestas.
 *
 * Se valida todo ANTES de abrir la transacción: si algo está mal, no se ha
 * escrito nada todavía y no hace falta compensar a medias.
 *
 * `idLicenciatura` sale aparte de `filas` porque no es una fila de detalle sino
 * una columna de la respuesta. Una encuesta puede no tener pregunta de
 * licenciatura, y entonces vuelve null.
 *
 * @returns {{filas: object[], idLicenciatura: number|null}|{error: string}}
 */
function validarRespuestas(respuestas, definiciones) {
  const filas = [];
  let idLicenciatura = null;

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

    // La licenciatura no aporta filas: su valor va directo a la columna de la
    // respuesta. Se marca `respondida` igual que las demás, para que el chequeo
    // de obligatorias de abajo la trate como cualquier otra pregunta.
    if (valor.idLicenciatura != null) {
      idLicenciatura = valor.idLicenciatura;
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

  return { filas, idLicenciatura };
}

/**
 * Valida el valor de una respuesta y devuelve las filas de detalle a insertar.
 *
 * Una pregunta puede producir varias filas (opción múltiple) o ninguna (queda
 * en blanco, o es de tipo 'licenciatura'). Cada fila lleva exactamente uno de
 * los tres valores, como exige chk_detalle_valor.
 *
 * @returns {{vacio: boolean, filas: object[], idLicenciatura?: number}|{error: string}}
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

  // La licenciatura es el único tipo que no deja filas en detalle_respuestas: su
  // respuesta va a respuestas_encuesta.id_licenciatura, que es una columna de la
  // respuesta, no del detalle. chk_detalle_valor no tiene dónde meter un id de
  // catálogo, así que reutilizar detalle_respuestas habría pedido una columna
  // nueva, otro CHECK y otro índice para duplicar un dato que ya existe.
  // Aquí sólo se revisa el formato: que el id exista de verdad lo comprueba
  // validarLicenciatura(), que va contra cat_licenciaturas.
  if (tipo === 'licenciatura') {
    const id = Number(valorCrudo);

    if (!Number.isInteger(id)) {
      return { error: 'La respuesta de la licenciatura debe ser un id de programa' };
    }

    return { vacio: false, filas: [], idLicenciatura: id };
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

    // El rango viene de la fila que ya se cargó, así que no hace falta volver a
    // consultarlo ni a confiar en lo que mandó el cliente.
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
                 WHERE p.id_encuesta = e.id_encuesta) AS total_preguntas
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
      `SELECT p.id_pregunta, p.texto, p.ayuda, p.tipo, p.es_obligatoria,
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
 * GET /admin/:id/resultados — agregados de lo que ya respondieron.
 *
 * Sin resultados no hay nada que graficar, y una encuesta recién creada los
 * tiene en cero: eso es un estado normal, así que una encuesta sin respuestas
 * contesta 200 con totales en 0 y no un 404 ni un error.
 *
 * Son varias consultas y no una sola con joins. Cada agregado tiene su forma
 * (distribución por opción, eje de escala, muestra de textos) y encajarlas en un
 * mega-join produce un GROUP BY con una lista de columnas tan larga que hay que
 * desarmarla a mano para leer. Aquí se consulta una cosa por query y se arma el
 * objeto en JS, que es donde de todos modos hay que recorrer las preguntas para
 * meterles los conteos.
 *
 * Sobre la base: `detalle_respuestas` guarda exactamente uno de id_opcion, texto
 * o numero por fila (chk_detalle_valor), y una opción múltiple genera una fila
 * por opción marcada. Por eso toda pregunta se cuenta con COUNT(DISTINCT
 * id_respuesta) y no con COUNT(*): con COUNT(*) una pregunta de opción múltiple
 * sumaría respondents y las preguntas del mismo tipo no serían comparables.
 */
router.get(
  '/admin/:id/resultados',
  authenticate,
  requireRole(...ROLES_LECTURA),
  async (req, res) => {
    // Las otras rutas de admin pasan req.params.id crudo a la consulta, y un id
    // no numérico revienta el cast de Postgres como 500. Se valida aquí porque
    // esta ruta es la que el panel llama con un id que viene de la URL pegada.
    const idEncuesta = Number(req.params.id);
    const carreraFilter = req.query.carrera ? Number(req.query.carrera) : null;

    if (!Number.isInteger(idEncuesta)) {
      return res.status(400).json({ error: 'El id de la encuesta debe ser un número' });
    }
    if (req.query.carrera && !Number.isInteger(carreraFilter)) {
      return res.status(400).json({ error: 'El filtro de carrera debe ser un número' });
    }

    try {
      const encuesta = await pool.query(
        `SELECT id_encuesta, titulo, slug, estado
         FROM encuestas WHERE id_encuesta = $1`,
        [idEncuesta]
      );

      if (encuesta.rows.length === 0) {
        return res.status(404).json({ error: 'Encuesta no encontrada' });
      }

      // WHERE clause extra para respuestas
      const filterSQL = carreraFilter ? ' AND r.id_licenciatura = $2' : '';
      const queryArgs = carreraFilter ? [idEncuesta, carreraFilter] : [idEncuesta];

      // Todas las preguntas, con los conteos de cada una.
      const definicion = await pool.query(
        `SELECT p.id_pregunta, p.texto, p.tipo, p.es_obligatoria, p.orden,
                p.escala_min, p.escala_max, p.escala_min_texto, p.escala_max_texto,
                COALESCE(
                  (SELECT json_agg(json_build_object('id', o.id_opcion, 'texto', o.texto, 'orden', o.orden)
                                   ORDER BY o.orden ASC)
                   FROM opciones_pregunta o WHERE o.id_pregunta = p.id_pregunta),
                  '[]'::json
                ) AS opciones
         FROM preguntas p
         WHERE p.id_encuesta = $1
         ORDER BY p.orden ASC`,
        [idEncuesta]
      );

      const conteos = await pool.query(
        `SELECT d.id_pregunta,
                COUNT(DISTINCT d.id_respuesta)::int AS respuestas,
                COUNT(DISTINCT d.id_respuesta) FILTER (WHERE d.id_opcion IS NOT NULL)::int
                  AS respondientes,
                COUNT(*) FILTER (WHERE d.texto IS NOT NULL)::int AS total_textos
         FROM detalle_respuestas d
         JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
         WHERE r.id_encuesta = $1 ${filterSQL}
         GROUP BY d.id_pregunta`,
        queryArgs
      );

      const conteoOpciones = await pool.query(
        `SELECT d.id_pregunta, o.id_opcion, COUNT(DISTINCT d.id_respuesta)::int AS conteo
         FROM detalle_respuestas d
         JOIN opciones_pregunta o ON o.id_opcion = d.id_opcion
         JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
         WHERE r.id_encuesta = $1 ${filterSQL}
         GROUP BY d.id_pregunta, o.id_opcion`,
        queryArgs
      );

      const escala = await pool.query(
        `SELECT d.id_pregunta, d.numero, COUNT(DISTINCT d.id_respuesta)::int AS conteo
         FROM detalle_respuestas d
         JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
         WHERE r.id_encuesta = $1 AND d.numero IS NOT NULL ${filterSQL}
         GROUP BY d.id_pregunta, d.numero
         ORDER BY d.id_pregunta, d.numero`,
        queryArgs
      );

      const textosArgs = carreraFilter ? [idEncuesta, 200, carreraFilter] : [idEncuesta, 200];
      const textosFilterSQL = carreraFilter ? ' AND r.id_licenciatura = $3' : '';
      const textos = await pool.query(
        `SELECT id_pregunta, texto, fecha_envio
         FROM (
           SELECT d.id_pregunta, d.texto, r.fecha_envio,
                  ROW_NUMBER() OVER (
                    PARTITION BY d.id_pregunta
                    ORDER BY r.fecha_envio DESC, d.id_detalle DESC
                  ) AS rn
           FROM detalle_respuestas d
           JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
           WHERE r.id_encuesta = $1 AND d.texto IS NOT NULL ${textosFilterSQL}
         ) t
         WHERE rn <= $2
         ORDER BY id_pregunta, fecha_envio DESC`,
        textosArgs
      );

      // Además del total, la fecha de la respuesta más reciente: es lo que el
      // panel muestra como "Última respuesta" y sale gratis aquí, en la misma
      // consulta indexada que ya cuenta.
      const total = await pool.query(
        `SELECT COUNT(*)::int AS total, MAX(r.fecha_envio) AS ultima_respuesta
         FROM respuestas_encuesta r WHERE r.id_encuesta = $1 ${filterSQL}`,
        queryArgs
      );

      const porFecha = await pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('day', r.fecha_envio), 'YYYY-MM-DD') AS dia,
                COUNT(*)::int AS respuestas
         FROM respuestas_encuesta r
         WHERE r.id_encuesta = $1 ${filterSQL}
         GROUP BY 1
         ORDER BY 1`,
        queryArgs
      );

      const porLicenciatura = await pool.query(
        `SELECT l.id_licenciatura, l.nombre, COUNT(*)::int AS respuestas
         FROM respuestas_encuesta r
         JOIN cat_licenciaturas l ON l.id_licenciatura = r.id_licenciatura
         WHERE r.id_encuesta = $1 ${filterSQL}
         GROUP BY l.id_licenciatura, l.nombre
         ORDER BY respuestas DESC, l.nombre ASC`,
        queryArgs
      );

      res.json({
        encuesta: encuesta.rows[0],
        total_respuestas: total.rows[0].total,
        ultima_respuesta: total.rows[0].ultima_respuesta,
        por_fecha: porFecha.rows,
        por_licenciatura: porLicenciatura.rows,
        // Las respuestas sin programa no se pierden: restan del total y se
        // reportan aparte, porque "no dijo cuál" no es lo mismo que "dijo que sí".
        sin_licenciatura:
          total.rows[0].total -
          porLicenciatura.rows.reduce((suma, fila) => suma + fila.respuestas, 0),
        preguntas: armarResultadosPreguntas({
          definicion: definicion.rows,
          conteos: conteos.rows,
          conteoOpciones: conteoOpciones.rows,
          escala: escala.rows,
          textos: textos.rows,
          porLicenciatura: porLicenciatura.rows,
        }),
      });
    } catch (err) {
      console.error('Error al obtener resultados de la encuesta:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * Sondeo ligero para el refresco "en vivo" del panel de resultados.
 *
 * El panel lo llama cada unos segundos y sólo cuando el total cambió vuelve a
 * pedir `/resultados`, que son nueve consultas. Ésta es una sola sobre el
 * índice (id_encuesta, fecha_envio): si no entró respuestas nuevas, no cuesta
 * prácticamente nada y no se hace ninguna otra llamada.
 *
 * Acepta el mismo filtro `?carrera=` que el endpoint completo para que el
 * total que se compara sea del mismo ámbito que el panel (con filtro activo se
 * comparan totales filtrados, no globales).
 */
router.get(
  '/admin/:id/respuestas-recientes',
  authenticate,
  requireRole(...ROLES_LECTURA),
  async (req, res) => {
    const idEncuesta = Number(req.params.id);
    const carreraFilter = req.query.carrera ? Number(req.query.carrera) : null;

    if (!Number.isInteger(idEncuesta)) {
      return res.status(400).json({ error: 'El id de la encuesta debe ser un número' });
    }
    if (req.query.carrera && !Number.isInteger(carreraFilter)) {
      return res.status(400).json({ error: 'El filtro de carrera debe ser un número' });
    }

    try {
      const where = carreraFilter
        ? 'WHERE id_encuesta = $1 AND id_licenciatura = $2'
        : 'WHERE id_encuesta = $1';
      const args = carreraFilter ? [idEncuesta, carreraFilter] : [idEncuesta];

      const sondeo = await pool.query(
        `SELECT COUNT(*)::int AS total, MAX(fecha_envio) AS ultima
         FROM respuestas_encuesta
         ${where}`,
        args
      );

      res.json({ total: sondeo.rows[0].total, ultima: sondeo.rows[0].ultima });
    } catch (err) {
      console.error('Error al sondear respuestas recientes:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * Arma el arreglo `preguntas` de la respuesta, mezclando la definición de cada
 * pregunta con sus conteos.
 *
 * Se separa del route handler porque ahí lo que se lee son consultas; lo que se
 * decide son las bases de los porcentajes, y eso conviene poder leer de una vez.
 *
 * @returns {object[]} Una entrada por pregunta, en el mismo orden que la definición.
 */
function armarResultadosPreguntas({
  definicion,
  conteos,
  conteoOpciones,
  escala,
  textos,
  porLicenciatura,
}) {
  const mapaConteos = new Map(conteos.map((fila) => [fila.id_pregunta, fila]));
  const mapaTextos = new Map();
  for (const fila of textos) {
    if (!mapaTextos.has(fila.id_pregunta)) mapaTextos.set(fila.id_pregunta, []);
    mapaTextos.get(fila.id_pregunta).push({
      texto: fila.texto,
      fecha: fila.fecha_envio,
    });
  }

  return definicion.map((pregunta) => {
    const conteo = mapaConteos.get(pregunta.id_pregunta);
    const respuestas = conteo?.respuestas ?? 0;
    const respondientes = conteo?.respondientes ?? 0;

    const base = {
      id_pregunta: pregunta.id_pregunta,
      texto: pregunta.texto,
      tipo: pregunta.tipo,
      orden: pregunta.orden,
      es_obligatoria: pregunta.es_obligatoria,
      // Para las preguntas sin respuestas va en 0, no en null: el panel lo usa
      // como denominador de los porcentajes y null se colaría en la aritmética.
      respuestas,
    };

    if (pregunta.tipo === 'escala') {
      return {
        ...base,
        escala_min: pregunta.escala_min,
        escala_max: pregunta.escala_max,
        escala_min_texto: pregunta.escala_min_texto,
        escala_max_texto: pregunta.escala_max_texto,
        promedio: promedioEscala(escala, pregunta.id_pregunta),
        distribucion: distribucionEscala(escala, pregunta, respuestas),
      };
    }

    // La licenciatura no tiene filas en detalle_respuestas, así que no aparece en
    // `conteos` y su desglose es exactamente `porLicenciatura`, que el route ya
    // consultó para el filtro por carrera. Se reusa en vez de repetir la misma
    // consulta: los datos son los mismos por construcción, y dos consultas
    // Parecidas divergen en cuanto una cambia y la otra no.
    if (pregunta.tipo === 'licenciatura') {
      const porPrograma = porLicenciatura ?? [];

      // El total de la pregunta es el de quienes contestaron, no el de la
      // encuesta: quien eligió "Prefiero no decir" no tiene programa, y meterlo
      // en el denominador dejaría todas las barras abajo de 100 sin motivo. Los
      // que no contestaron se reportan aparte, en `sin_licenciatura`.
      const contestaron = porPrograma.reduce((suma, fila) => suma + fila.respuestas, 0);

      return {
        ...base,
        respuestas: contestaron,
        // Se devuelve con la misma forma que las opciones de una pregunta
        // de opción para que el panel reutilice su gráfica sin saber el tipo.
        opciones: porPrograma.map((fila) => ({
          id_opcion: fila.id_licenciatura,
          texto: fila.nombre,
          conteo: fila.respuestas,
          porcentaje: porcentaje(fila.respuestas, contestaron),
        })),
      };
    }

    if (pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'opcion_multiple') {
      const esMultiple = pregunta.tipo === 'opcion_multiple';

      // En opción única la base es la pregunta completa. En múltiple es
      // distinto: el porcentaje va sobre quienes marcaron algo, porque sumar
      // varios códigos sobre el total de respuestas pasa del 100% y una gráfica
      // de barras con eso arriba se vuelve inútil. Se manda `base` en la
      // respuesta para que el panel rotule la gráfica y no haya que suponerlo.
      const denominador = esMultiple ? respondientes : respuestas;

      const conteoPorOpcion = new Map(
        conteoOpciones
          .filter((fila) => fila.id_pregunta === pregunta.id_pregunta)
          .map((fila) => [fila.id_opcion, fila.conteo])
      );

      return {
        ...base,
        // Se manda sólo en múltiple: es el dato que explica el porcentaje, y en
        // única sería ruido.
        ...(esMultiple ? { respondientes, base: 'respondientes' } : {}),
        opciones: (pregunta.opciones ?? []).map((opcion) => ({
          id_opcion: opcion.id,
          texto: opcion.texto,
          orden: opcion.orden,
          conteo: conteoPorOpcion.get(opcion.id) ?? 0,
          porcentaje: porcentaje(conteoPorOpcion.get(opcion.id) ?? 0, denominador),
        })),
      };
    }

    // texto_corto y texto_largo: no hay distribución, sólo la muestra y el total
    // real. El panel los lista y avisa si está recortando.
    const totalTextos = conteo?.total_textos ?? 0;
    const muestra = mapaTextos.get(pregunta.id_pregunta) ?? [];

    return {
      ...base,
      total_textos: totalTextos,
      // La lista puede traer menos que total_textos por dos motivos: el recorte
      // del endpoint, o que la pregunta no esté entre las que se consultaron.
      // El panel compara ambos números para decidir qué aviso mostrar.
      truncados: totalTextos > muestra.length,
      limite_textos: LIMITE_TEXTOS_RESULTADOS,
      textos: muestra,
    };
  });
}

/**
 * Eje de la escala: todos los valores del rango, con cero en los que nadie
 * marcó, más los que se hayan quedado fuera del rango actual.
 *
 * Los que se escapan son un caso real, no paranoidía: `PUT /preguntas` deja
 * cambiar escala_min y escala_max sin tocar lo ya respondido, así que un admin
 * que estrecha 1-5 a 1-3 después de 50 respuestas deja 4 y 5 huérfanos. Si el
 * eje se armara sólo con el rango nuevo, esos conteos desaparecerían del
 * gráfico y la suma de las barras no cuadraría con las respuestas.
 */
function distribucionEscala(filas, pregunta, respuestas) {
  const min = pregunta.escala_min;
  const max = pregunta.escala_max;

  const observados = new Map();
  let promedio = null;

  for (const fila of filas) {
    if (fila.id_pregunta !== pregunta.id_pregunta) continue;
    observados.set(fila.numero, fila.conteo);
    promedio = fila.promedio;
  }

  const valores = new Set();
  for (let v = min; v <= max; v++) valores.add(v);
  for (const v of observados.keys()) valores.add(v);

  return [...valores]
    .sort((a, b) => a - b)
    .map((valor) => ({
      valor,
      conteo: observados.get(valor) ?? 0,
      porcentaje: porcentaje(observados.get(valor) ?? 0, respuestas),
    }));
}

/**
 * Promedio de la escala, ponderado por cuántas respuestas hay de cada valor.
 *
 * Se calcula aquí y no con AVG en SQL a propósito. Un `AVG(numero) OVER
 * (PARTITION BY id_pregunta)` sobre la consulta ya agrupada promedia los
 * VALORES DISTINTOS, no las respuestas: con valores 0, 3, 4 y 5 daría
 * (0+3+4+5)/4 = 3, cuando el promedio de las 6 respuestas es 20/6 = 3.33. La
 * media honesta necesita los pesos, y los pesos son justo lo que trae
 * `conteo`.
 *
 * @returns {number|null} Dos decimales, o null si nadie respondió la escala.
 */
function promedioEscala(filas, idPregunta) {
  let suma = 0;
  let total = 0;

  for (const fila of filas) {
    if (fila.id_pregunta !== idPregunta) continue;
    suma += fila.numero * fila.conteo;
    total += fila.conteo;
  }

  if (total === 0) return null;
  return Math.round((suma / total) * 100) / 100;
}

/** Porcentaje redondeado a un decimal. Base 0 devuelve 0 y no NaN. */
function porcentaje(conteo, base) {
  if (!base) return 0;
  return Math.round((conteo / base) * 1000) / 10;
}

/**
 * PUT /admin/:id — editar metadatos, cambiar estado y abrir/cerrar.
 *
 * COALESCE por columna para que un PUT no borre lo que el panel no mandó.
 */
router.put('/admin/:id', authenticate, requireRole(...ROLES_ESCRITURA), async (req, res) => {
  const { titulo, descripcion, mensaje_agradecimiento, estado, fecha_inicio, fecha_fin } = req.body;
    if (estado === 'publicada') {
      const q = await pool.query('SELECT COUNT(*) as total FROM preguntas WHERE id_encuesta = $1', [req.params.id]);
      if (parseInt(q.rows[0].total, 10) === 0) {
        return res.status(400).json({ error: 'No se puede publicar una encuesta sin preguntas.' });
      }
    }

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
 * sentencia basta. Ojo: la de respuestas_encuesta es RESTRICT, y por eso una
 * encuesta con respuestas normalmente no se puede borrar: hay que desactivarla
 * (`estado = 'cerrada'`), no borrarla.
 *
 * La excepción es el borrador: por diseño no recibe respuestas por su enlace
 * (el backend sólo sirve el estado publicada), así que las que tenga son
 * residuo de una prueba. Para poder descartarlo se borran primero sus
 * respuestas (CASCADE a detalle_respuestas) y luego la encuesta, todo en la
 * misma transacción. En publicada/cerrada con respuestas el RESTRICT se queda
 * y revienta con 23503 → 409.
 */
router.delete('/admin/:id', authenticate, requireRole(...ROLES_ESCRITURA), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const encuesta = await client.query(
      'SELECT estado FROM encuestas WHERE id_encuesta = $1 FOR UPDATE',
      [req.params.id]
    );

    if (encuesta.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Encuesta no encontrada' });
    }

    if (encuesta.rows[0].estado === 'borrador') {
      await client.query(
        'DELETE FROM respuestas_encuesta WHERE id_encuesta = $1',
        [req.params.id]
      );
    }

    await client.query('DELETE FROM encuestas WHERE id_encuesta = $1', [req.params.id]);
    await client.query('COMMIT');

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'No se puede borrar una encuesta que ya tiene respuestas. Ciérrala en su lugar.',
      });
    }
    console.error('Error al eliminar encuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
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

      // Una encuesta sólo puede tener una pregunta de licenciatura, porque todas
      // las respuestas caen en la misma columna
      // (respuestas_encuesta.id_licenciatura): con dos, la segunda pisaría a la
      // primera sin que nada avise. Este SELECT es sólo para dar un 400 legible;
      // el que de verdad cierra la puerta en la base es el índice parcial único
      // uq_pregunta_licenciatura de schema.sql, porque dos altas simultáneas
      // pueden pasar las dos por aquí.
      if (tipo === 'licenciatura') {
        const existentes = await client.query(
          `SELECT 1 FROM preguntas
           WHERE id_encuesta = $1 AND tipo = 'licenciatura'
           LIMIT 1`,
          [req.params.id]
        );

        if (existentes.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'La encuesta ya tiene una pregunta de licenciatura',
          });
        }
      }

      // `orden` es MAX+1 para que la pregunta salga al final. Se calcula en SQL y
      // no en JS para no depender del conteo que leyó el cliente.
      const pregunta = await client.query(
        `INSERT INTO preguntas (
           id_encuesta, texto, ayuda, tipo, es_obligatoria, orden,
           escala_min, escala_max, escala_min_texto, escala_max_texto)
         VALUES (
           $1, $2, $3, $4, $5,
           COALESCE((SELECT MAX(orden) + 1 FROM preguntas WHERE id_encuesta = $1), 1),
           $6, $7, $8, $9)
         RETURNING id_pregunta`,
        [req.params.id, texto.trim(), ayuda?.trim() || null, tipo,
         Boolean(es_obligatoria),
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

      // 23505 = uq_pregunta_licenciatura. Sólo llega si dos altas de la misma
      // pregunta cruzaron el SELECT de arriba a la vez; el índice es el que
      // cierra la puerta en serio, así que su mensaje sustituye al 500 genérico.
      if (err.code === '23505') {
        return res.status(400).json({
          error: 'La encuesta ya tiene una pregunta de licenciatura',
        });
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
 * `es_obligatoria` se resuelve con COALESCE en vez de un booleano plano: el panel
 * lo manda siempre, y calcular Boolean('false') saldría true, así que una
 * pregunta nunca dejaría de ser obligatoria.
 *
 * El tipo NO se cambia aquí. Cambiar 'texto_corto' por 'opcion_unica'
 * dejaría la pregunta sin opciones; el panel lo resuelve borrando y recreando.
 */
router.put(
  '/admin/preguntas/:idPregunta',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const { texto, ayuda, es_obligatoria, escala_min, escala_max,
            escala_min_texto, escala_max_texto } = req.body;

    try {
      const result = await pool.query(
        `UPDATE preguntas
         SET texto = COALESCE($2, texto),
             ayuda = $3,
             es_obligatoria = COALESCE($4, es_obligatoria),
             escala_min = COALESCE($5, escala_min),
             escala_max = COALESCE($6, escala_max),
             escala_min_texto = COALESCE($7, escala_min_texto),
             escala_max_texto = COALESCE($8, escala_max_texto)
         WHERE id_pregunta = $1
         RETURNING id_pregunta, texto, ayuda, tipo, es_obligatoria,
                   escala_min, escala_max, escala_min_texto, escala_max_texto`,
        [req.params.idPregunta,
         texto?.trim() ?? null,
         ayuda === undefined ? null : ayuda?.trim() || null,
         es_obligatoria === undefined ? null : Boolean(es_obligatoria),
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
 * PUT /admin/:id/preguntas/orden — guardar el orden de las preguntas.
 *
 * Recibe el arreglo COMPLETO de ids en el orden deseado, no un desplazamiento.
 * El panel manda los ids que ya tiene en pantalla, así que la validación de que
 * el conjunto sea el mismo que el de la base es lo que evita perder una pregunta
 * si alguien guarda un editor con la lista vieja.
 *
 * Sobre uq_pregunta_orden, que es UNIQUE (id_encuesta, orden) DEFERRABLE
 * INITIALLY DEFERRED: por lo regular un intercambio directo fallaría, porque en
 * algún momento intermedio hay dos preguntas con el mismo orden. Al ser
 * DEFERRABLE la comprobación se hace en el COMMIT, no en cada sentencia, así que
 * un solo UPDATE con un CASE para todas las filas resuelve el intercambio
 * entero. Por eso el BEGIN/COMMIT es obligatorio y no decorativo.
 */
router.put(
  '/admin/:id/preguntas/orden',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const { orden } = req.body;
    const idEncuesta = Number(req.params.id);

    if (!Number.isInteger(idEncuesta)) {
      return res.status(400).json({ error: 'El id de la encuesta no es un número' });
    }

    if (!Array.isArray(orden) || orden.length === 0) {
      return res.status(400).json({ error: 'Se debe enviar la lista de preguntas en orden' });
    }

    const ids = orden.map(Number);

    if (ids.some((id) => !Number.isInteger(id))) {
      return res.status(400).json({ error: 'La lista contiene un id que no es un número' });
    }

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'La lista de preguntas trae ids repetidos' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // FOR UPDATE porque entre leer el conjunto y escribir el orden otra
      // petición podría agregar o borrar una pregunta. El bloqueo mantiene a las
      // dos fuera hasta que esta termine.
      const actuales = await client.query(
        'SELECT id_pregunta FROM preguntas WHERE id_encuesta = $1 FOR UPDATE',
        [idEncuesta]
      );

      if (actuales.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Encuesta no encontrada' });
      }

      const actualesIds = new Set(actuales.rows.map((f) => f.id_pregunta));
      const iguales =
        actualesIds.size === ids.length && ids.every((id) => actualesIds.has(id));

      if (!iguales) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error:
            'La lista de preguntas no corresponde a esta encuesta. Vuelve a cargar y reintenta.',
        });
      }

      // Un CASE por id: una sola sentencia para todas las filas, que es lo que
      // hace posible el intercambio bajo la restricción DEFERRABLE.
      await client.query(
        `UPDATE preguntas p
         SET orden = nuevo.orden
         FROM (
           SELECT *
           FROM UNNEST($1::int[], $2::int[]) AS u(id_pregunta, orden)
         ) AS nuevo
         WHERE p.id_pregunta = nuevo.id_pregunta`,
        [ids, ids.map((_, i) => i + 1)]
      );

      await client.query('COMMIT');

      // Se devuelve el arreglo pedido y no el RETURNING del UPDATE: el orden de
      // salida de las filas de un UPDATE no está garantizado, y el cliente ya
      // sabe cuál pidió. Devolverlo en otro orden lo haría parecer un fallo.
      res.json({ orden: ids });
    } catch (err) {
      await client.query('ROLLBACK');

      // 23505 = uq_pregunta_orden. Si salta aquí es porque se cerró la
      // transacción sin recalcular la restricción; con DEFERRABLE eso no debería
      // pasar, y conviene que se note en el log en vez de tragárselo.
      if (err.code === '23505') {
        console.error('Conflicto de orden al reordenar preguntas:', err);
        return res.status(409).json({
          error: 'No se pudo guardar el orden. Vuelve a intentarlo.',
        });
      }

      if (err.code === '23503') {
        return res.status(404).json({ error: 'Encuesta no encontrada' });
      }

      console.error('Error al reordenar preguntas:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /admin/preguntas/:idPregunta/opciones/orden — guardar el orden de las opciones.
 *
 * Existe aparte del endpoint que reemplaza la lista porque ese otro borra y
 * vuelve a crear las opciones con ids nuevos, y fk_detalle_opcion es ON DELETE
 * RESTRICT: en cuanto la pregunta tiene una respuesta registrada, cualquier
 * reordenamiento se rechaza con 409. Aquí sólo se mueve la columna `orden` y los
 * id_opcion no cambian, así que reordenar funciona aunque la pregunta ya tenga
 * respuestas. Mismo criterio que el orden de las preguntas.
 */
router.put(
  '/admin/preguntas/:idPregunta/opciones/orden',
  authenticate,
  requireRole(...ROLES_ESCRITURA),
  async (req, res) => {
    const { orden } = req.body;
    const idPregunta = Number(req.params.idPregunta);

    if (!Number.isInteger(idPregunta)) {
      return res.status(400).json({ error: 'El id de la pregunta no es un número' });
    }

    if (!Array.isArray(orden) || orden.length === 0) {
      return res.status(400).json({ error: 'Se debe enviar la lista de opciones en orden' });
    }

    const ids = orden.map(Number);

    if (ids.some((id) => !Number.isInteger(id))) {
      return res.status(400).json({ error: 'La lista contiene un id que no es un número' });
    }

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'La lista de opciones trae ids repetidos' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pregunta = await client.query(
        'SELECT tipo FROM preguntas WHERE id_pregunta = $1 FOR UPDATE',
        [idPregunta]
      );

      if (pregunta.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      if (!TIPOS_CON_OPCIONES.includes(pregunta.rows[0].tipo)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Este tipo de pregunta no tiene opciones' });
      }

      const actuales = await client.query(
        'SELECT id_opcion FROM opciones_pregunta WHERE id_pregunta = $1 FOR UPDATE',
        [idPregunta]
      );

      const actualesIds = new Set(actuales.rows.map((o) => o.id_opcion));
      const iguales = actualesIds.size === ids.length && ids.every((id) => actualesIds.has(id));

      if (!iguales) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error:
            'La lista de opciones no corresponde a esta pregunta. Vuelve a cargar y reintenta.',
        });
      }

      // Un solo UPDATE para todas las filas, que es lo que hace posible el
      // intercambio bajo uq_opcion_orden (DEFERRABLE INITIALLY DEFERRED).
      await client.query(
        `UPDATE opciones_pregunta o
         SET orden = nuevo.orden
         FROM (
           SELECT *
           FROM UNNEST($1::int[], $2::int[]) AS u(id_opcion, orden)
         ) AS nuevo
         WHERE o.id_opcion = nuevo.id_opcion AND o.id_pregunta = $3`,
        [ids, ids.map((_, i) => i + 1), idPregunta]
      );

      await client.query('COMMIT');

      res.json({ orden: ids });
    } catch (err) {
      await client.query('ROLLBACK');

      if (err.code === '23505') {
        console.error('Conflicto de orden al reordenar opciones:', err);
        return res.status(409).json({
          error: 'No se pudo guardar el orden. Vuelve a intentarlo.',
        });
      }

      console.error('Error al reordenar opciones:', err);
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


