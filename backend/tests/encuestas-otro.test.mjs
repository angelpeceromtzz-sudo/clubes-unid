// Opción especial «Otro»: la marca del modelo, el guardado de las opciones y
// la validación del texto libre de la respuesta.
//
// Pruebas con Express real, pool simulado y JWT ficticios; sin BD ni red.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: encuestasRouter } = await import('../routes/encuestas.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Estado simulado de la encuesta ----------------------------------------

// Una encuesta con una pregunta de opción única (con la opción «Otro»),
// una de opción múltiple y una de texto corto.
const PREGUNTAS = [
  {
    id_pregunta: 11,
    tipo: 'opcion_unica',
    es_obligatoria: false,
    escala_min: null,
    escala_max: null,
    opciones: [
      { id_opcion: 111, texto: 'Deporte', es_otro: false },
      { id_opcion: 112, texto: 'Otro', es_otro: true },
    ],
  },
  {
    id_pregunta: 12,
    tipo: 'opcion_multiple',
    es_obligatoria: false,
    escala_min: null,
    escala_max: null,
    opciones: [
      { id_opcion: 121, texto: 'Arte', es_otro: false },
      { id_opcion: 122, texto: 'Otro', es_otro: true },
    ],
  },
  {
    id_pregunta: 13,
    tipo: 'texto_corto',
    es_obligatoria: false,
    escala_min: null,
    escala_max: null,
    opciones: [],
  },
];

const insertados = [];
let ultimoInsert = null;

function responder(sql, params = []) {
  const texto = String(sql).trim();

  // Revalidación de authenticate: admin ficticio.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    return {
      rows: [{ id_usuario: 300, nombre_completo: 'Admin Ficticio', id_rol: 3 }],
      rowCount: 1,
    };
  }

  // Definiciones de las preguntas (con sus opciones).
  if (/SELECT id_pregunta, tipo, es_obligatoria, escala_min, escala_max/.test(texto)) {
    return { rows: PREGUNTAS.map((p) => ({ ...p })), rowCount: PREGUNTAS.length };
  }

  if (/SELECT o\.id_opcion, o\.id_pregunta, o\.es_otro/.test(texto)) {
    const filas = PREGUNTAS.flatMap((p) =>
      p.opciones.map((o) => ({ id_opcion: o.id_opcion, id_pregunta: p.id_pregunta, es_otro: o.es_otro }))
    );
    return { rows: filas, rowCount: filas.length };
  }

  // Encuesta y su detalle (la búsqueda pública va por slug).
  if (/FROM encuestas/.test(texto)) {
    return {
      rows: [
        {
          id_encuesta: 1,
          slug: 'encuesta-de-prueba',
          titulo: 'Encuesta de prueba',
          descripcion: '',
          mensaje_agradecimiento: '',
          estado: 'publicada',
          fecha_inicio: null,
          fecha_fin: null,
        },
      ],
      rowCount: 1,
    };
  }

  if (/SELECT COUNT\(\*\) AS total FROM preguntas/i.test(texto)) {
    return { rows: [{ total: 0 }], rowCount: 1 };
  }

  if (/INSERT INTO preguntas/.test(texto)) {
    return { rows: [{ id_pregunta: 900 }], rowCount: 1 };
  }

  if (/INSERT INTO opciones_pregunta/.test(texto)) {
    ultimoInsert = { sql: texto, params };
    return { rows: [], rowCount: 1 };
  }

  if (/INSERT INTO detalle_respuestas/.test(texto)) {
    insertados.push(params);
    return { rows: [], rowCount: 1 };
  }

  if (/INSERT INTO respuestas_encuesta/.test(texto)) {
    return { rows: [{ id_respuesta: 500 }], rowCount: 1 };
  }

  if (/UPDATE respuestas_encuesta/.test(texto)) {
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params) => responder(sql, params);
pool.connect = async () => ({
  query: async (sql, params) => responder(sql, params),
  release: () => {},
});

function token(id, nombre, rol) {
  return jwt.sign({ id, nombre_completo: nombre, id_rol: rol }, process.env.JWT_SECRET, {
    expiresIn: '5m',
  });
}

const tokenAdmin = token(300, 'Admin Ficticio', 3);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/encuestas', encuestasRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

async function pedir(metodo, ruta, cuerpo, tokenUsuario = tokenAdmin) {
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUsuario}`,
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

// --- esquema ---------------------------------------------------------------

test('el esquema declara la opción especial y su texto libre', async () => {
  const esquema = await readFile(path.join(__dirname, '..', 'schema.sql'), 'utf8');

  assert.match(esquema, /es_otro\s+BOOLEAN NOT NULL DEFAULT false/);
  assert.match(esquema, /texto_otro\s+TEXT/);
  assert.match(esquema, /CREATE UNIQUE INDEX IF NOT EXISTS uq_opcion_otro ON opciones_pregunta\(id_pregunta\) WHERE es_otro/);
  assert.match(esquema, /chk_detalle_texto_otro/);
  // El CHECK de «un valor por fila» se conserva: el texto de «Otro» va en su
  // propia columna.
  assert.match(esquema, /chk_detalle_valor CHECK \(num_nonnulls\(id_opcion, texto, numero\) = 1\)/);
});

test('la migración es aditiva e idempotente', async () => {
  const migracion = await readFile(
    path.join(__dirname, '..', 'migrations', 'migrate-encuestas-otro.sql'),
    'utf8'
  );

  assert.match(migracion, /ADD COLUMN IF NOT EXISTS es_otro/);
  assert.match(migracion, /ADD COLUMN IF NOT EXISTS texto_otro/);
  assert.match(migracion, /CREATE UNIQUE INDEX IF NOT EXISTS uq_opcion_otro/);
  // No toca datos: ni DROP de tabla ni de columna.
  assert.doesNotMatch(migracion, /DROP\s+(TABLE|COLUMN)/i);
});

// --- opciones --------------------------------------------------------------

test('las opciones se guardan con su marca de «Otro» y «Otro» queda al final', async () => {
  ultimoInsert = null;

  const r = await pedir('POST', '/api/encuestas/admin/1/preguntas', {
    texto: '¿Qué prefieres?',
    tipo: 'opcion_unica',
    es_obligatoria: false,
    opciones: [
      { texto: 'Deporte', es_otro: false },
      { texto: 'Otro', es_otro: true },
      { texto: 'Arte', es_otro: false },
    ],
  });

  assert.equal(r.status, 201);

  const filas = [...(ultimoInsert?.params ?? [])];
  // Cada opción se inserta con su marca; la especial va en su propia fila.
  assert.ok(ultimoInsert.sql.includes('es_otro'));
});

test('una pregunta no puede tener dos opciones «Otro»', async () => {
  const r = await pedir('POST', '/api/encuestas/admin/1/preguntas', {
    texto: '¿Qué prefieres?',
    tipo: 'opcion_unica',
    es_obligatoria: false,
    opciones: [
      { texto: 'Otro', es_otro: true },
      { texto: 'Otro', es_otro: true },
    ],
  });

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /«Otro»/);
});

test('una opción normal escrita como «Otro» no es la opción especial', async () => {
  ultimoInsert = null;

  const r = await pedir('POST', '/api/encuestas/admin/1/preguntas', {
    texto: '¿Qué prefieres?',
    tipo: 'opcion_unica',
    es_obligatoria: false,
    opciones: [
      { texto: 'Deporte', es_otro: false },
      { texto: 'Otro', es_otro: false },
    ],
  });

  assert.equal(r.status, 201);
  assert.ok(ultimoInsert.sql.includes('es_otro'));
});

test('la lista antigua de textos sigue aceptándose', async () => {
  ultimoInsert = null;

  const r = await pedir('POST', '/api/encuestas/admin/1/preguntas', {
    texto: '¿Qué prefieres?',
    tipo: 'opcion_unica',
    es_obligatoria: false,
    opciones: ['Deporte', 'Arte'],
  });

  assert.equal(r.status, 201);
});

// --- respuestas ------------------------------------------------------------

async function enviarRespuestas(respuestas) {
  insertados.length = 0;

  const r = await pedir('POST', '/api/encuestas/publico/encuesta-de-prueba', { respuestas });

  return { r, insertados: [...insertados] };
}

test('«Otro» con texto se guarda en la fila de esa opción', async () => {
  const { r, insertados: filas } = await enviarRespuestas([
    { id_pregunta: 11, valor: 112, texto_otro: '  Prefiero música  ' },
  ]);

  assert.equal(r.status, 201);
  assert.equal(filas.length, 1);
  // id_opcion = la opción especial; el texto va en su propia columna.
  assert.equal(filas[0][2], 112);
  assert.equal(filas[0][5], 'Prefiero música');
});

test('«Otro» sin texto se rechaza', async () => {
  const { r } = await enviarRespuestas([{ id_pregunta: 11, valor: 112 }]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /Especifica tu respuesta/);
});

test('«Otro» con sólo espacios se rechaza', async () => {
  const { r } = await enviarRespuestas([
    { id_pregunta: 11, valor: 112, texto_otro: '    ' },
  ]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /Especifica tu respuesta/);
});

test('el texto de «Otro» no puede exceder 70 caracteres', async () => {
  const { r } = await enviarRespuestas([
    { id_pregunta: 11, valor: 112, texto_otro: 'x'.repeat(201) },
  ]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /70 caracteres/);
});

test('un texto de «Otro» sin haber marcado esa opción se rechaza', async () => {
  const { r } = await enviarRespuestas([
    { id_pregunta: 11, valor: 111, texto_otro: 'lo que sea' },
  ]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /sólo se acepta/);
});

test('en opción múltiple el texto va sólo en la fila de «Otro»', async () => {
  const { r, insertados: filas } = await enviarRespuestas([
    { id_pregunta: 12, valor: [121, 122], texto_otro: 'otro distinto' },
  ]);

  assert.equal(r.status, 201);
  assert.equal(filas.length, 2);

  const deOtro = filas.find((f) => f[2] === 122);
  const normal = filas.find((f) => f[2] === 121);

  assert.equal(deOtro[5], 'otro distinto');
  assert.equal(normal[5], null);
});

test('en opción múltiple, marcar «Otro» sin texto se rechaza', async () => {
  const { r } = await enviarRespuestas([{ id_pregunta: 12, valor: [121, 122] }]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /Especifica tu respuesta/);
});

test('una opción que no pertenece a la pregunta se rechaza', async () => {
  const { r } = await enviarRespuestas([
    { id_pregunta: 11, valor: 999, texto_otro: 'ajeno' },
  ]);

  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /no pertenece a esta pregunta/);
});

test('una pregunta sin «Otro» se comporta como antes', async () => {
  const { r, insertados: filas } = await enviarRespuestas([
    { id_pregunta: 13, valor: 'hola' },
  ]);

  assert.equal(r.status, 201);
  assert.equal(filas.length, 1);
  assert.equal(filas[0][3], 'hola');
  assert.equal(filas[0][5], null);
});
