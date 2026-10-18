// Pruebas de la imagen móvil opcional de las diapositivas del hero y de la
// limpieza de Cloudinary (await + identidad + candidatas post-escritura).
// Datos ficticios; pool simulado; `cloudinary.uploader.destroy` sustituido
// por un stub local (sin red externa).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: diapositivasRouter } = await import('../routes/diapositivasHero.js');
const { v2: cloudinary } = await import('cloudinary');

// Stub de Cloudinary: registra las destrucciones (sin red) y su orden
// respecto de las escrituras en BD.
const destrucciones = [];
const eventos = [];
cloudinary.uploader.destroy = async (publicId, opciones) => {
  destrucciones.push({ publicId, opciones });
  eventos.push('destroy');
  return { result: 'ok' };
};

const consultas = [];

// Candidatas que vería la limpieza tras la escritura (estado final de la
// tabla). Vacías por defecto = nadie más referencia los recursos.
let candidatasRefs = [];

const FILA_CON_MOVIL = {
  id_diapositiva: 1,
  titulo: 'Banner 1',
  subtitulo: null,
  url_imagen: 'https://res.cloudinary.com/demo/image/upload/v123/clubs-unid/banner-escritorio.jpg',
  url_imagen_movil: 'https://example.com/movil.jpg',
  orden: 1,
  activa: true,
  fecha_creacion: new Date(),
  fecha_actualizacion: new Date(),
};

pool.query = async (sql, params = []) => {
  const texto = String(sql).trim();
  consultas.push({ sql: texto, params });
  // Revalidación de authenticate (H2, fix/seguridad-fase1): el authenticate
  // combinado consulta la BD; sin esta rama el token ficticio recibiría 401.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    if (params[0] === 3) {
      return { rows: [{ id_usuario: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  const verbo = texto.split(/\s+/)[0];
  if (verbo === 'UPDATE' || verbo === 'DELETE' || verbo === 'INSERT') eventos.push(verbo);

  if (/FROM diapositivas_hero[\s\S]*WHERE activa = TRUE/.test(texto)) {
    return { rows: [FILA_CON_MOVIL], rowCount: 1 };
  }
  if (/FROM diapositivas_hero[\s\S]*ORDER BY orden ASC/.test(texto)) {
    return { rows: [FILA_CON_MOVIL], rowCount: 1 };
  }
  // Lectura previa de la fila (PUT): estado anterior.
  if (texto.startsWith('SELECT url_imagen, url_imagen_movil FROM diapositivas_hero WHERE')) {
    return {
      rows: [{ url_imagen: FILA_CON_MOVIL.url_imagen, url_imagen_movil: FILA_CON_MOVIL.url_imagen_movil }],
      rowCount: 1,
    };
  }
  // Candidatas post-escritura (PUT/DELETE): estado final controlado por el test.
  if (texto === 'SELECT url_imagen, url_imagen_movil FROM diapositivas_hero') {
    return { rows: candidatasRefs, rowCount: candidatasRefs.length };
  }
  if (/SELECT id_diapositiva, titulo, url_imagen, url_imagen_movil FROM diapositivas_hero/.test(texto)) {
    return { rows: [{ id_diapositiva: 1, titulo: 'Banner 1', url_imagen: FILA_CON_MOVIL.url_imagen, url_imagen_movil: FILA_CON_MOVIL.url_imagen_movil }], rowCount: 1 };
  }
  if (/INSERT INTO diapositivas_hero/.test(texto)) {
    return {
      rows: [{
        id_diapositiva: 2,
        titulo: params[0],
        subtitulo: params[1],
        url_imagen: params[2],
        url_imagen_movil: params[3],
        orden: params[4],
        activa: params[5],
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date(),
      }],
      rowCount: 1,
    };
  }
  if (/UPDATE diapositivas_hero/.test(texto)) {
    return {
      rows: [{
        id_diapositiva: 1,
        titulo: params[0] ?? 'Banner 1',
        subtitulo: params[1],
        url_imagen: params[2] ?? FILA_CON_MOVIL.url_imagen,
        url_imagen_movil: params[3],
        orden: params[4] ?? 1,
        activa: params[5] ?? true,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date(),
      }],
      rowCount: 1,
    };
  }
  if (/DELETE FROM diapositivas_hero/.test(texto)) {
    return { rows: [], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
};

const token = jwt.sign(
  { id: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/diapositivas-hero', diapositivasRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

const encabezadoAuth = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

test('GET público devuelve url_imagen_movil', async () => {
  const r = await fetch(`${base}/api/diapositivas-hero`);
  assert.equal(r.status, 200);
  const filas = await r.json();
  assert.equal(filas[0].url_imagen_movil, 'https://example.com/movil.jpg');
});

test('GET admin devuelve url_imagen_movil y exige sesión', async () => {
  const sinToken = await fetch(`${base}/api/diapositivas-hero/admin`);
  assert.equal(sinToken.status, 401);
  const r = await fetch(`${base}/api/diapositivas-hero/admin`, { headers: encabezadoAuth });
  assert.equal(r.status, 200);
  const filas = await r.json();
  assert.equal(filas[0].url_imagen_movil, FILA_CON_MOVIL.url_imagen_movil);
});

test('POST crea sin imagen móvil (NULL) cuando no se envía', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero`, {
    method: 'POST',
    headers: encabezadoAuth,
    body: JSON.stringify({ titulo: 'Nuevo', url_imagen: 'https://example.com/nuevo.jpg', orden: 2 }),
  });
  assert.equal(r.status, 201);
  const fila = await r.json();
  assert.equal(fila.url_imagen_movil, null);
  const insert = consultas.find((c) => c.sql.startsWith('INSERT INTO'));
  assert.equal(insert.params[3], null);
});

test('POST crea con imagen móvil cuando se envía', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero`, {
    method: 'POST',
    headers: encabezadoAuth,
    body: JSON.stringify({
      titulo: 'Nuevo 2',
      url_imagen: 'https://example.com/nuevo2.jpg',
      url_imagen_movil: 'https://example.com/nuevo2-movil.jpg',
      orden: 3,
    }),
  });
  assert.equal(r.status, 201);
  const fila = await r.json();
  assert.equal(fila.url_imagen_movil, 'https://example.com/nuevo2-movil.jpg');
});

test('PUT con url_imagen_movil nueva la establece', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero/1`, {
    method: 'PUT',
    headers: encabezadoAuth,
    body: JSON.stringify({ url_imagen_movil: 'https://example.com/movil-nueva.jpg' }),
  });
  assert.equal(r.status, 200);
  const fila = await r.json();
  assert.equal(fila.url_imagen_movil, 'https://example.com/movil-nueva.jpg');
});

test('PUT con url_imagen_movil vacío la limpia (NULL)', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero/1`, {
    method: 'PUT',
    headers: encabezadoAuth,
    body: JSON.stringify({ url_imagen_movil: '' }),
  });
  assert.equal(r.status, 200);
  const fila = await r.json();
  assert.equal(fila.url_imagen_movil, null);
  const update = consultas.find((c) => c.sql.startsWith('UPDATE'));
  assert.equal(update.params[3], null);
});

test('PUT sin url_imagen_movil la conserva (no envía la clave)', async () => {
  consultas.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero/1`, {
    method: 'PUT',
    headers: encabezadoAuth,
    body: JSON.stringify({ titulo: 'Solo título' }),
  });
  assert.equal(r.status, 200);
  const update = consultas.find((c) => c.sql.startsWith('UPDATE'));
  // Conserva el valor actual de la fila (stub: movil.jpg).
  assert.equal(update.params[3], FILA_CON_MOVIL.url_imagen_movil);
});

test('DELETE elimina la diapositiva con sus dos imágenes', async () => {
  consultas.length = 0;
  destrucciones.length = 0;
  eventos.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero/1`, {
    method: 'DELETE',
    headers: encabezadoAuth,
  });
  assert.equal(r.status, 200);
  const borrar = consultas.find((c) => c.sql.startsWith('DELETE FROM'));
  assert.ok(borrar, 'debe ejecutarse el DELETE');
  // Destrucción tras el borrado en BD y sin carpeta duplicada (bug H6-Cloudinary).
  assert.equal(destrucciones.length, 1, 'debe destruir el recurso de escritorio');
  assert.equal(destrucciones[0].publicId, 'clubs-unid/banner-escritorio');
  assert.deepEqual(destrucciones[0].opciones, { invalidate: true });
  assert.ok(
    eventos.lastIndexOf('destroy') > eventos.indexOf('DELETE'),
    'destroy debe ocurrir después del DELETE',
  );
});

test("PUT url_imagen '' no vacía la imagen de escritorio (viaja como null)", async () => {
  consultas.length = 0;
  destrucciones.length = 0;
  const r = await fetch(`${base}/api/diapositivas-hero/1`, {
    method: 'PUT',
    headers: encabezadoAuth,
    body: JSON.stringify({ url_imagen: '' }),
  });
  assert.equal(r.status, 200);
  const update = consultas.find((c) => c.sql.startsWith('UPDATE'));
  assert.equal(update.params[2], null, "'' debe viajar como null para que COALESCE conserve la imagen");
  assert.equal(destrucciones.length, 0, 'no debe intentar destruir recursos');
});

test('PUT reemplaza el escritorio y destruye el recurso viejo tras el UPDATE', async () => {
  consultas.length = 0;
  destrucciones.length = 0;
  eventos.length = 0;
  // Estado post-UPDATE simulado: la fila ya apunta a la nueva imagen.
  const nueva = 'https://res.cloudinary.com/demo/image/upload/v999/clubs-unid/banner-nuevo.jpg';
  candidatasRefs = [{ url_imagen: nueva, url_imagen_movil: FILA_CON_MOVIL.url_imagen_movil }];
  try {
    const r = await fetch(`${base}/api/diapositivas-hero/1`, {
      method: 'PUT',
      headers: encabezadoAuth,
      body: JSON.stringify({ url_imagen: nueva }),
    });
    assert.equal(r.status, 200);
    assert.equal(destrucciones.length, 1, 'debe destruir el recurso reemplazado');
    assert.equal(destrucciones[0].publicId, 'clubs-unid/banner-escritorio', 'sin carpeta duplicada');
    assert.deepEqual(destrucciones[0].opciones, { invalidate: true });
    assert.ok(
      eventos.lastIndexOf('destroy') > eventos.indexOf('UPDATE'),
      'destroy debe ocurrir después del UPDATE',
    );
  } finally {
    candidatasRefs = [];
  }
});

test('PUT no destruye un recurso que la columna móvil sigue refiriendo (identidad)', async () => {
  consultas.length = 0;
  destrucciones.length = 0;
  // La móvil apunta al mismo identificador de recurso que el escritorio viejo
  // (misma carpeta/archivo, distinta versión).
  candidatasRefs = [{
    url_imagen: 'https://res.cloudinary.com/demo/image/upload/v999/clubs-unid/banner-nuevo.jpg',
    url_imagen_movil: 'https://res.cloudinary.com/demo/image/upload/v777/clubs-unid/banner-escritorio.jpg',
  }];
  try {
    const r = await fetch(`${base}/api/diapositivas-hero/1`, {
      method: 'PUT',
      headers: encabezadoAuth,
      body: JSON.stringify({
        url_imagen: 'https://res.cloudinary.com/demo/image/upload/v999/clubs-unid/banner-nuevo.jpg',
      }),
    });
    assert.equal(r.status, 200);
    assert.equal(destrucciones.length, 0, 'no debe destruir: la móvil aún usa ese recurso');
  } finally {
    candidatasRefs = [];
  }
});

test('DELETE conserva el recurso si otra diapositiva lo sigue refiriendo', async () => {
  consultas.length = 0;
  destrucciones.length = 0;
  candidatasRefs = [{
    url_imagen: 'https://res.cloudinary.com/demo/image/upload/v123/clubs-unid/banner-escritorio.jpg',
    url_imagen_movil: null,
  }];
  try {
    const r = await fetch(`${base}/api/diapositivas-hero/1`, {
      method: 'DELETE',
      headers: encabezadoAuth,
    });
    assert.equal(r.status, 200);
    assert.equal(destrucciones.length, 0, 'no debe destruir: otra diapositiva usa la misma imagen');
  } finally {
    candidatasRefs = [];
  }
});
