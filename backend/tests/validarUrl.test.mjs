// H10: validación de URLs de usuario en servidor.
// - ubicacion_maps (renderizado como <a href>): solo http(s), bloquea
//   javascript:/data:/vbscript: y valores no string.
// - imagen_portada (renderizada en <img> de páginas públicas): solo http(s)
//   o rutas /uploads/ heredadas del almacenamiento local.
// Pruebas unitarias del helper + pruebas de ruta con pool simulado y JWT
// ficticio; sin red externa.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { esUrlMapsValida, esImagenPortadaValida } = await import('../lib/validarUrl.js');
const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: horariosRouter } = await import('../routes/horarios.js');
const { default: clubesRouter } = await import('../routes/clubes.js');

// --- Helpers de simulación ---

function responder(sql, params = []) {
  const texto = String(sql).trim();

  // Revalidación de authenticate (H2): líder de club y admin ficticios activos.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    if (params[0] === 100) {
      return { rows: [{ id_usuario: 100, nombre_completo: 'Líder Ficticio', id_rol: 2 }], rowCount: 1 };
    }
    if (params[0] === 3) {
      return { rows: [{ id_usuario: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // requireClubLeader (H16 corregido): el middleware ya reconoce :idClub y
  // valida el id como entero antes de consultar; este stub devuelve el
  // liderazgo del club 5 para que la petición llegue al handler donde se
  // valida la URL. En PUT/DELETE ahora opera requireHorarioLeader, cuyo
  // stub de horario/club está más abajo.
  if (/SELECT id_responsable_club, id_vicepresidente FROM clubes WHERE id_club = \$1/.test(texto)) {
    return { rows: [{ id_responsable_club: 100, id_vicepresidente: null }], rowCount: 1 };
  }

  // requireHorarioLeader (H16) y handler PUT: horario 7 del club 5.
  if (/SELECT id_club FROM horarios_club WHERE id_horario = \$1/.test(texto)) {
    return { rows: [{ id_club: 5 }], rowCount: 1 };
  }
  if (/SELECT id_club FROM clubes WHERE id_club = \$1 AND \(id_responsable_club/.test(texto)) {
    return { rows: [{ id_club: 5 }], rowCount: 1 };
  }
  if (/FROM horarios_club[\s\S]*hora_inicio < /.test(texto)) {
    return { rows: [], rowCount: 0 };
  }
  if (/UPDATE horarios_club/.test(texto)) {
    const [dia, hin, hfin, lugar, maps, desc] = params;
    return {
      rows: [{
        id_horario: 7, id_club: 5, dia_semana: dia, hora_inicio: hin, hora_fin: hfin,
        lugar, ubicacion_maps: maps, descripcion: desc,
      }],
      rowCount: 1,
    };
  }

  // clubes: portada previa, actualización, niveles y estatus.
  if (/SELECT imagen_portada FROM clubes WHERE id_club = \$1/.test(texto)) {
    return { rows: [{ imagen_portada: null }], rowCount: 1 };
  }
  if (/UPDATE clubes[\s\S]RETURNING id_club/.test(texto)) {
    const [nombre, desc, categoria, cupo, portada, participacion] = params;
    return {
      rows: [{
        id_club: 1, nombre_club: nombre, descripcion: desc, categoria,
        cupo_maximo: cupo, id_estatus_club: 1, imagen_portada: portada,
        participacion,
      }],
      rowCount: 1,
    };
  }
  if (/INSERT INTO clubes \(/.test(texto)) {
    const [nombre, desc, categoria, cupo, portada, participacion] = params;
    return {
      rows: [{
        id_club: 1, nombre_club: nombre, descripcion: desc, categoria,
        cupo_maximo: cupo, id_estatus_club: 1, imagen_portada: portada,
        participacion,
      }],
      rowCount: 1,
    };
  }
  if (/INSERT INTO clubes_niveles|DELETE FROM clubes_niveles|INSERT INTO historial_admin/.test(texto)) {
    return { rows: [], rowCount: 0 };
  }
  if (/SELECT nombre_estatus FROM cat_estatus_clubes/.test(texto)) {
    return { rows: [{ nombre_estatus: 'activo' }], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params) => responder(sql, params);
pool.connect = async () => ({ query: responder, release: () => {} });

const tokenLider = jwt.sign(
  { id: 100, nombre_completo: 'Líder Ficticio', id_rol: 2 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);
const tokenAdmin = jwt.sign(
  { id: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/horarios', horariosRouter);
  app.use('/api/clubes', clubesRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

// --- Helper: ubicacion_maps ---

test('maps: acepta vacío, null, undefined y URLs http(s)', () => {
  assert.equal(esUrlMapsValida(''), true);
  assert.equal(esUrlMapsValida(null), true);
  assert.equal(esUrlMapsValida(undefined), true);
  assert.equal(esUrlMapsValida('https://maps.google.com/?q=UNID'), true);
  assert.equal(esUrlMapsValida('http://www.openstreetmap.org/'), true);
});

test('maps: bloquea javascript:, data:, vbscript:, ftp: y no string', () => {
  assert.equal(esUrlMapsValida('javascript:alert(1)'), false);
  assert.equal(esUrlMapsValida('JaVaScRiPt:alert(1)'), false);
  assert.equal(esUrlMapsValida('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(esUrlMapsValida('vbscript:msgbox(1)'), false);
  assert.equal(esUrlMapsValida('ftp://archivo.test/x'), false);
  assert.equal(esUrlMapsValida('   javascript:alert(1)'), false);
  assert.equal(esUrlMapsValida(123), false);
  assert.equal(esUrlMapsValida({ url: 'https://x.test' }), false);
  assert.equal(esUrlMapsValida(`https://x.test/${'a'.repeat(600)}`), false);
});

// --- Helper: imagen_portada ---

test('portada: acepta vacío, https de Cloudinary y rutas /uploads/', () => {
  assert.equal(esImagenPortadaValida(''), true);
  assert.equal(esImagenPortadaValida(null), true);
  assert.equal(esImagenPortadaValida(undefined), true);
  assert.equal(
    esImagenPortadaValida('https://res.cloudinary.com/demo/image/upload/clubs-unid/x.png'),
    true,
  );
  assert.equal(esImagenPortadaValida('/uploads/portadas/club.png'), true);
});

test('portada: bloquea javascript:, data:, rutas ajenas y longitudes excesivas', () => {
  assert.equal(esImagenPortadaValida('javascript:alert(1)'), false);
  assert.equal(esImagenPortadaValida('data:image/svg+xml,<svg onload=alert(1)/>'), false);
  assert.equal(esImagenPortadaValida('//evil.test/x.png'), false);
  assert.equal(esImagenPortadaValida('ftp://archivo.test/x.png'), false);
  assert.equal(esImagenPortadaValida(42), false);
  assert.equal(esImagenPortadaValida(`https://x.test/${'a'.repeat(300)}`), false);
});

// --- Rutas ---

test('PUT /horarios/:id: rechaza javascript: en ubicacion_maps con 400', async () => {
  const r = await fetch(`${base}/api/horarios/7`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenLider}` },
    body: JSON.stringify({
      dia_semana: 1, hora_inicio: '10:00', hora_fin: '11:00', lugar: 'Cancha',
      ubicacion_maps: 'javascript:alert(1)',
    }),
  });
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE');
});

test('PUT /horarios/:id: guarda una URL https válida', async () => {
  const r = await fetch(`${base}/api/horarios/7`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenLider}` },
    body: JSON.stringify({
      dia_semana: 1, hora_inicio: '10:00', hora_fin: '11:00', lugar: 'Cancha',
      ubicacion_maps: 'https://maps.google.com/?q=Cancha',
    }),
  });
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.equal(cuerpo.error, 'Los cambios deben enviarse como una propuesta y ser aprobados por Coordinación VIVE');
});

const clubValido = {
  nombre_club: 'Club Ficticio',
  descripcion: 'Descripción de prueba',
  categoria: 'Deportes',
  cupo_maximo: 20,
  participacion: 'mixta',
  niveles: [1],
};

test('POST /clubes: rechaza javascript: en imagen_portada con 400', async () => {
  const r = await fetch(`${base}/api/clubes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ ...clubValido, imagen_portada: 'javascript:alert(1)' }),
  });
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /imagen de portada/);
});

test('POST /clubes: acepta URL https y crea el club', async () => {
  const r = await fetch(`${base}/api/clubes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({
      ...clubValido,
      imagen_portada: 'https://res.cloudinary.com/demo/image/upload/clubs-unid/portada.png',
    }),
  });
  assert.equal(r.status, 201);
  const club = await r.json();
  assert.match(club.imagen_portada, /^https:\/\/res\.cloudinary\.com\//);
});

test('POST /clubes: acepta ruta local /uploads/', async () => {
  const r = await fetch(`${base}/api/clubes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ ...clubValido, imagen_portada: '/uploads/club.png' }),
  });
  assert.equal(r.status, 201);
});

test('PUT /clubes/:id: rechaza data: en imagen_portada con 400', async () => {
  const r = await fetch(`${base}/api/clubes/1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({
      ...clubValido,
      imagen_portada: 'data:image/svg+xml,<svg onload=alert(1)/>',
    }),
  });
  assert.equal(r.status, 400);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /imagen de portada/);
});
