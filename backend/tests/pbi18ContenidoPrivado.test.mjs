// PBI-18: noticias, eventos y calendario requieren sesión; el mural público
// sigue disponible sin token. Pool simulado y JWT efímero, sin red externa.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.JWT_SECRET = randomUUID();
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: noticiasRouter } = await import('../routes/noticias.js');
const { default: calendarioRouter } = await import('../routes/calendario.js');
const { default: muralRouter } = await import('../routes/mural.js');

pool.query = async (sql) => {
  const texto = String(sql);

  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1/.test(texto)) {
    return { rows: [{ id_usuario: 1, nombre_completo: 'Alumno Ficticio', id_rol: 1 }] };
  }
  if (/FROM noticias/.test(texto)) {
    return { rows: [{ id_noticia: 1, titulo: 'Contenido privado', categoria: 'informativo' }] };
  }
  if (/FROM fechas_calendario/.test(texto)) {
    return { rows: [{ id_fecha: 1, titulo: 'Examen final', tipo_fecha: 'examen' }] };
  }
  if (/FROM publicaciones_mural/.test(texto)) {
    return { rows: [{ id_publicacion: 1, titulo: 'Aviso público del mural' }] };
  }
  if (/FROM configuracion_mural/.test(texto)) {
    return { rows: [{ url_publica: null }] };
  }
  return { rows: [] };
};

const token = jwt.sign(
  { id: 1, nombre_completo: 'Alumno Ficticio', id_rol: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/noticias', noticiasRouter);
  app.use('/api/calendario', calendarioRouter);
  app.use('/api/mural', muralRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

test('noticias, eventos y avisos de noticias exigen sesión y no se cachean', async () => {
  for (const ruta of ['/api/noticias', '/api/noticias/eventos', '/api/noticias/mural']) {
    const sinSesion = await fetch(`${base}${ruta}`);
    assert.equal(sinSesion.status, 401, ruta);

    const conSesion = await fetch(`${base}${ruta}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(conSesion.status, 200, ruta);
    assert.equal(conSesion.headers.get('cache-control'), 'private, no-store', ruta);
  }
});

test('el calendario académico exige sesión y no se cachea', async () => {
  assert.equal((await fetch(`${base}/api/calendario`)).status, 401);

  const conSesion = await fetch(`${base}/api/calendario`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(conSesion.status, 200);
  assert.equal(conSesion.headers.get('cache-control'), 'private, no-store');
});

test('el mural público y su configuración siguen disponibles sin sesión', async () => {
  const publicaciones = await fetch(`${base}/api/mural`);
  assert.equal(publicaciones.status, 200);
  assert.deepEqual((await publicaciones.json()).map((item) => item.titulo), ['Aviso público del mural']);

  const configuracion = await fetch(`${base}/api/mural/config`);
  assert.equal(configuracion.status, 200);
  assert.deepEqual(await configuracion.json(), { url_publica: null });
});
