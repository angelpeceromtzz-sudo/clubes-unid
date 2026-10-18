// H12: nuevas subidas SVG rechazadas con 400 en el endpoint del panel.
// El fileFilter de multer descarta el archivo ANTES de cualquier llamada a
// Cloudinary, así que estas pruebas no realizan red externa. Se verifica
// también que la lista de formatos permitidos del storage ya no incluye svg.
// Ruta real montada en Express con pool simulado y JWT ficticio (rol 3).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: uploadRouter } = await import('../routes/upload.js');

// Revalidación de authenticate (H2): admin ficticio activo.
pool.query = async (sql, params = []) => {
  const texto = String(sql).trim();
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    if (params[0] === 3) {
      return { rows: [{ id_usuario: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  return { rows: [], rowCount: 0 };
};
pool.connect = async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} });

const tokenAdmin = jwt.sign(
  { id: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use('/api/upload', uploadRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

async function subir(nombre, mimetype, contenido) {
  const datos = new FormData();
  datos.append('imagen', new File([contenido], nombre, { type: mimetype }));
  return fetch(`${base}/api/upload/imagen`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenAdmin}` },
    body: datos,
  });
}

test('POST /upload/imagen: un SVG nuevo responde 400', async () => {
  const r = await subir(
    'prueba.svg',
    'image/svg+xml',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
  );
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /formato no es válido/);
});

test('POST /upload/imagen: un mimetype fuera de lista también responde 400', async () => {
  const r = await subir('prueba.txt', 'text/plain', 'no soy una imagen');
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /formato no es válido/);
});

test('el storage ya no declara svg entre los formatos permitidos', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Sin comentarios: los propios comentarios del fix mencionan la palabra.
  const fuente = fs
    .readFileSync(path.join(__dirname, '..', 'routes', 'upload.js'), 'utf8')
    .replace(/\/\/[^\n]*/g, '');
  assert.ok(!fuente.includes("'svg'"), 'allowed_formats no debe incluir svg');
  assert.ok(!fuente.includes("'image/svg+xml'"), 'el fileFilter no debe aceptar image/svg+xml');
  // La lectura/limpieza de recursos existentes sí conserva svg.
  const hero = fs.readFileSync(path.join(__dirname, '..', 'routes', 'diapositivasHero.js'), 'utf8');
  assert.ok(hero.includes('svg'), 'la extracción de public_id de recursos existentes conserva svg');
});
