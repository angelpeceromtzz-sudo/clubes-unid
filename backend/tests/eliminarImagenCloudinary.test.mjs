// Pruebas del helper de limpieza de Cloudinary (A2):
// - extraerPublicId no duplica la carpeta (bug de doble clubs-unid/).
// - mismaIdentidad compara por public_id, no por URL literal.
// - eliminarImagenCloudinary: no destruye si otra candidata refiere el mismo
//   recurso; destruye con invalidate si está libre; tolera 'not found'.
// Sin red: cloudinary.uploader.destroy se sustituye por un stub.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PASSWORD = 'ficticio';

const cloudinary = (await import('cloudinary')).v2;
const {
  extraerPublicId,
  mismaIdentidad,
  eliminarImagenCloudinary,
  esUrlCloudinary,
} = await import('../lib/eliminarImagenCloudinary.js');

const destroyCalls = [];
let destroyResultado = { result: 'ok' };
let destroyError = null;

cloudinary.uploader.destroy = async (publicId, options) => {
  destroyCalls.push({ publicId, options });
  if (destroyError) throw destroyError;
  return destroyResultado;
};

beforeEach(() => {
  destroyCalls.length = 0;
  destroyResultado = { result: 'ok' };
  destroyError = null;
});

test('extraerPublicId: la carpeta del upload no se duplica', () => {
  // Caso real: upload.js fija folder clubs-unid, la secure_url ya la incluye.
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/v1712345678/clubs-unid/abc123xy.jpg'),
    'clubs-unid/abc123xy',
  );
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/v1712345678/clubs-unid/abc123xy.webp'),
    'clubs-unid/abc123xy',
  );
});

test('extraerPublicId: sin carpeta en la URL se antepone una sola vez', () => {
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/v1/abc123.jpg'),
    'clubs-unid/abc123',
  );
});

test('extraerPublicId: maneja query string, mayúsculas y transformación en URL', () => {
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/abc.jpg?_x=1'),
    'clubs-unid/abc',
  );
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/abc.JPG'),
    'clubs-unid/abc',
  );
  assert.equal(
    extraerPublicId('https://res.cloudinary.com/demo/image/upload/w_1920,c_limit/v1/clubs-unid/abc.jpg'),
    'clubs-unid/abc',
  );
});

test('extraerPublicId: URLs no válidas devuelven null', () => {
  assert.equal(extraerPublicId(null), null);
  assert.equal(extraerPublicId(''), null);
  assert.equal(extraerPublicId('https://example.com/archivo.jpg'), null);
  assert.equal(extraerPublicId('https://res.cloudinary.com/demo/image/list/abc.jpg'), null);
});

// --- H18: hostname por partes en vez de substring ---

test('esUrlCloudinary: acepta hosts de Cloudinary por etiquetas del hostname', () => {
  assert.equal(esUrlCloudinary('https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/a.jpg'), true);
  assert.equal(esUrlCloudinary('http://res.cloudinary.com/demo/a.jpg'), true);
  assert.equal(esUrlCloudinary('https://cloudinary.com/app'), true);
});

test('esUrlCloudinary: rechaza el patrón de substring de CodeQL (H18)', () => {
  assert.equal(esUrlCloudinary('https://atacante.test/upload/v1/x.jpg?q=cloudinary.com'), false);
  assert.equal(esUrlCloudinary('https://noescloudinary.com/a.jpg'), false);
  assert.equal(esUrlCloudinary('https://cloudinary.com.evil.test/a.jpg'), false);
  assert.equal(esUrlCloudinary('javascript:alert(1)'), false);
  assert.equal(esUrlCloudinary('data:text/html,x'), false);
  assert.equal(esUrlCloudinary('//res.cloudinary.com/a.jpg'), false);
  assert.equal(esUrlCloudinary('no-es-url'), false);
  assert.equal(esUrlCloudinary(null), false);
  assert.equal(esUrlCloudinary(123), false);
});

test('extraerPublicId (H18): un URL ajeno con cloudinary.com en el query devuelve null', () => {
  // Antes: el substring del query pasaba el check, el split de query dejaba
  // la URL ajena y el resultado era clubs-unid/x.jpg (asset propio).
  assert.equal(extraerPublicId('https://atacante.test/upload/v1/x.jpg?q=cloudinary.com'), null);
});

test('mismaIdentidad: compara por public_id, no por URL literal', () => {
  // Misma imagen con y sin versión: distinta URL literal, misma identidad.
  assert.equal(
    mismaIdentidad(
      'https://res.cloudinary.com/demo/image/upload/v111/clubs-unid/foto.jpg',
      'https://res.cloudinary.com/demo/image/upload/clubs-unid/foto.jpg',
    ),
    true,
  );
  // Distinta imagen.
  assert.equal(
    mismaIdentidad(
      'https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/a.jpg',
      'https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/b.jpg',
    ),
    false,
  );
  // No-Cloudinary no compara.
  assert.equal(mismaIdentidad('https://example.com/a.jpg', 'https://example.com/a.jpg'), false);
});

test('eliminarImagenCloudinary: destruye con public_id correcto e invalidate', async () => {
  const r = await eliminarImagenCloudinary(
    'https://res.cloudinary.com/demo/image/upload/v9/clubs-unid/figura.png',
  );
  assert.equal(r.eliminada, true);
  assert.equal(destroyCalls.length, 1);
  assert.equal(destroyCalls[0].publicId, 'clubs-unid/figura');
  assert.deepEqual(destroyCalls[0].options, { invalidate: true });
});

test('eliminarImagenCloudinary: no destruye si otra candidata refiere el mismo recurso', async () => {
  // La "vieja" y la "nueva" son la misma identidad (distinta versión): no borrar.
  const r = await eliminarImagenCloudinary(
    'https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/figura.jpg',
    {
      candidatas: [
        'https://res.cloudinary.com/demo/image/upload/v2/clubs-unid/figura.jpg',
      ],
    },
  );
  assert.equal(r.eliminada, false);
  assert.equal(r.motivo, 'referenciada');
  assert.equal(destroyCalls.length, 0);
});

test('eliminarImagenCloudinary: destruye si las candidatas son recursos distintos', async () => {
  const r = await eliminarImagenCloudinary(
    'https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/vieja.jpg',
    {
      candidatas: [
        'https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/nueva.jpg',
      ],
    },
  );
  assert.equal(r.eliminada, true);
  assert.equal(destroyCalls[0].publicId, 'clubs-unid/vieja');
});

test('eliminarImagenCloudinary: no lanza ante errores ni ante not found', async () => {
  destroyResultado = { result: 'not found' };
  const r1 = await eliminarImagenCloudinary('https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/x.jpg');
  assert.equal(r1.eliminada, false);
  assert.equal(r1.resultado, 'not found');

  destroyError = new Error('fallo de red ficticio');
  const r2 = await eliminarImagenCloudinary('https://res.cloudinary.com/demo/image/upload/v1/clubs-unid/x.jpg');
  assert.equal(r2.eliminada, false);
  assert.equal(r2.motivo, 'error');

  // URL no destructible: no toca Cloudinary.
  const r3 = await eliminarImagenCloudinary('https://example.com/x.jpg');
  assert.equal(r3.motivo, 'sin-public-id');
});
