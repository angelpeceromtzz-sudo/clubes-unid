// Pruebas de la cobertura de rate limiting (auditoría H5a + H8).
//
// Montan Express con el MISMO orden de index.js (CORS → limitador global →
// express.json → rutas) y los limitadores reales de lib/rateLimits.js, con
// umbrales pequeños inyectados por variables de entorno ANTES de los imports
// dinámicos (mismo patrón que el resto de la suite). Datos ficticios, sin
// red externa ni servicios desplegados; servidores en puerto efímero local.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';
process.env.RATE_LIMIT_GLOBAL_MINUTO = '4';
process.env.RATE_LIMIT_LOGIN_IP_15MIN = '2';
process.env.RATE_LIMIT_LOGIN_CUENTA_15MIN = '2';
process.env.RATE_LIMIT_ENCUESTAS_MINUTO = '2';
process.env.RATE_LIMIT_FORMULARIOS_HORA = '2';
process.env.RATE_LIMIT_NOTIFICACIONES_MINUTO = '2';

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const jwt = (await import('jsonwebtoken')).default;
const {
  crearLimitador,
  limitadorGlobal,
  limitadorLoginLocalIp,
  limitadorLoginLocalCuenta,
  limitadorEnvioEncuestas,
  limitadorFormularios,
} = await import('../lib/rateLimits.js');
const { default: pool } = await import('../db.js');
const { default: notificacionesRouter } = await import('../routes/notificaciones.js');

const ejecuciones = { formularios: 0, login: 0, envios: 0, notificacionesInsert: 0 };

function authFalso(req, res, next) {
  const id = req.headers['x-user-id'];
  if (!id) return res.status(401).json({ error: 'Token no proporcionado' });
  req.user = { id: Number(id), nombre_completo: 'Usuario Ficticio', id_rol: 3 };
  next();
}

function crearAppPrincipal() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors());
  app.use('/api', limitadorGlobal);
  app.use(express.json());
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/ok', (req, res) => res.json({ ok: true }));
  app.post('/api/formularios', authFalso, limitadorFormularios, (req, res) => {
    ejecuciones.formularios += 1;
    res.status(201).json({ ok: true });
  });
  app.post('/api/login-local', limitadorLoginLocalIp, limitadorLoginLocalCuenta, (req, res) => {
    ejecuciones.login += 1;
    res.json({ ok: true });
  });
  app.post('/api/encuestas/publico/x', limitadorEnvioEncuestas, (req, res) => {
    ejecuciones.envios += 1;
    res.status(201).json({ ok: true });
  });
  return app;
}

const servidores = [];
async function montar(app) {
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servidores.push(servidor);
  return `http://127.0.0.1:${servidor.address().port}`;
}

let base;

before(async () => {
  // Stub del pool solo para el montaje real del router de notificaciones.
  const USUARIOS = new Map([
    [10, { id_usuario: 10, nombre_completo: 'Admin Ficticio', id_rol: 3 }],
  ]);
  pool.query = async (sql, params = []) => {
    const texto = String(sql).trim();
    if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
      const fila = USUARIOS.get(params[0]) ?? null;
      return { rows: fila ? [fila] : [], rowCount: fila ? 1 : 0 };
    }
    if (/INSERT INTO notificaciones \(/.test(texto)) {
      ejecuciones.notificacionesInsert += 1;
      return { rows: [{ id_notificacion: 999 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
  base = await montar(crearAppPrincipal());
});

after(() => {
  for (const s of servidores) s.close();
});

const tokenAdmin = jwt.sign(
  { id: 10, nombre_completo: 'Admin Ficticio', id_rol: 3, rol: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

// --- Cobertura general ---

test('global: tráfico permitido, exceso con 429 JSON + Retry-After + RateLimit', async () => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${base}/api/ok`);
    assert.equal(r.status, 200, `petición ${i + 1} debe pasar`);
  }
  const r = await fetch(`${base}/api/ok`);
  assert.equal(r.status, 429);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /Demasiadas solicitudes/);
  assert.ok(r.headers.get('retry-after'), 'debe incluir Retry-After');
  assert.ok(r.headers.get('ratelimit'), 'debe incluir cabecera RateLimit (draft-7)');
});

test('global: health exento; OPTIONS de CORS no consume cuota', async () => {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${base}/api/health`);
    assert.equal(r.status, 200, 'health debe seguir respondiendo');
  }
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${base}/api/ok`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    });
    assert.ok(r.status === 204 || r.status === 200, `OPTIONS ${i + 1} no debe ser 429`);
  }
  // El preflight no consumió la cuota del GET /api/ok (agotada en el test anterior).
  const r = await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
  assert.equal(r.status, 200);
});

test('global: el tráfico anónimo también está cubierto (sin token llega 429, no 401)', async () => {
  const r = await fetch(`${base}/api/formularios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  // La IP del test agotó su cuota global en tests previos → el global responde
  // antes de llegar a la ruta; sin el global sería 401 por falta de token.
  assert.equal(r.status, 429);
});

// --- Operación protegida y separación de contadores ---

test('formularios por usuario: exceso rechazado sin ejecutar la operación', async () => {
  const antes = ejecuciones.formularios;
  for (let i = 0; i < 2; i++) {
    const r = await fetch(`${base}/api/formularios`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': '77', 'x-forwarded-for': '198.51.100.60' },
      body: '{}',
    });
    assert.equal(r.status, 201);
  }
  const r = await fetch(`${base}/api/formularios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': '77', 'x-forwarded-for': '198.51.100.60' },
    body: '{}',
  });
  assert.equal(r.status, 429);
  assert.equal(ejecuciones.formularios - antes, 2, 'solo se ejecutaron las 2 permitidas');
});

test('usuarios distintos con la misma IP no comparten el contador por usuario', async () => {
  // App sin el límite global de prueba para aislar el escenario de NAT.
  const app = express();
  app.set('trust proxy', 1);
  app.post('/api/formularios', authFalso, limitadorFormularios, (req, res) => res.status(201).json({ ok: true }));
  const b = await montar(app);
  for (const usuario of [201, 202, 203, 204, 205, 206, 207, 208, 209, 210]) {
    const r = await fetch(`${b}/api/formularios`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': String(usuario), 'x-forwarded-for': '198.51.100.61' },
      body: '{}',
    });
    assert.equal(r.status, 201, `el usuario ${usuario} debe poder operar`);
  }
});

test('separación de contadores: agotar el límite de formularios no bloquea /api/ok', async () => {
  // El usuario 77 ya agotó su cuota de formularios.
  const r429 = await fetch(`${base}/api/formularios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': '77', 'x-forwarded-for': '198.51.100.60' },
    body: '{}',
  });
  assert.equal(r429.status, 429);
  const rOk = await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '198.51.100.4' } });
  assert.equal(rOk.status, 200);
});

// --- Identidad: login doble límite y tokens ---

test('login-local: límite por IP y por cuenta (correo) con contadores separados', async () => {
  const post = (ip, correo) => fetch(`${base}/api/login-local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ correo, contrasena: 'ficticia' }),
  });
  // Cuenta A en IP1: 2 intentos (umbral por IP y por cuenta) → 3ª bloqueada.
  assert.equal((await post('198.51.100.20', 'victima@unid.mx')).status, 200);
  assert.equal((await post('198.51.100.20', 'victima@unid.mx')).status, 200);
  assert.equal((await post('198.51.100.20', 'victima@unid.mx')).status, 429);
  // La cuenta sigue bloqueada aunque el atacante cambie de IP.
  assert.equal((await post('198.51.100.21', 'victima@unid.mx')).status, 429);
  // Otra cuenta con IP nueva: cuota propia (la clave por cuenta no se elude
  // con la IP, ni la IP se elude con cuentas distintas dentro de su ventana).
  assert.equal((await post('198.51.100.22', 'otra@unid.mx')).status, 200);
  assert.equal((await post('198.51.100.22', 'otra@unid.mx')).status, 200);
  assert.equal((await post('198.51.100.22', 'otra@unid.mx')).status, 429);
});

// --- Envío de encuestas: activo sin NODE_ENV (H8) ---

test('envío de encuestas: activo con NODE_ENV ausente', async () => {
  delete process.env.NODE_ENV;
  const envio = () => fetch(`${base}/api/encuestas/publico/x`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.30' },
    body: JSON.stringify({ respuestas: [] }),
  });
  assert.equal((await envio()).status, 201);
  assert.equal((await envio()).status, 201);
  assert.equal((await envio()).status, 429);
});

test('envío de encuestas: activo con NODE_ENV=development (entorno público protegido)', async () => {
  process.env.NODE_ENV = 'development';
  const r = await fetch(`${base}/api/encuestas/publico/x`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.31' },
    body: JSON.stringify({ respuestas: [] }),
  });
  assert.equal(r.status, 201);
  assert.equal((await fetch(`${base}/api/encuestas/publico/x`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.31' },
    body: JSON.stringify({ respuestas: [] }),
  })).status, 201);
  assert.equal((await fetch(`${base}/api/encuestas/publico/x`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.31' },
    body: JSON.stringify({ respuestas: [] }),
  })).status, 429);
});

// --- Manipulación de encabezados de proxy e IPv6 ---

test('X-Forwarded-For: con trust proxy=1 solo cuenta la IP más cercana al proxy', async () => {
  // El cliente spoofea entradas a la izquierda; el valor usado es el último
  // (en producción, la IP que agrega el proxy de Render).
  const cuota = () => fetch(`${base}/api/ok`, {
    headers: { 'x-forwarded-for': `1.1.1.1, 198.51.100.50` },
  });
  assert.equal((await cuota()).status, 200);
  assert.equal((await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '2.2.2.2, 198.51.100.50' } })).status, 200);
  assert.equal((await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '198.51.100.50' } })).status, 200);
  assert.equal((await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '3.3.3.3, 198.51.100.50' } })).status, 200, '4ª petición de esa IP pasa (umbral 4)');
  assert.equal((await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '4.4.4.4, 198.51.100.50' } })).status, 429, 'la cuota es de 198.51.100.50 pese al spoofing');
  // Otra IP de la derecha: contador separado.
  assert.equal((await fetch(`${base}/api/ok`, { headers: { 'x-forwarded-for': '198.51.100.51' } })).status, 200);
});

test('IPv6: la clave agrupa por red /56 (ipv6Subnet de express-rate-limit v8)', async () => {
  const local = crearLimitador({ identifier: 't-ipv6', windowMs: 60_000, limit: 2 });
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', local);
  app.get('/api/ok', (req, res) => res.json({ ok: true }));
  const b = await montar(app);
  const get = (ip) => fetch(`${b}/api/ok`, { headers: { 'x-forwarded-for': ip } });
  // Misma red /56 (2001:db8:aaaa:00..), interfaces distintas → mismo contador.
  assert.equal((await get('2001:db8:aaaa:1:1::1')).status, 200);
  assert.equal((await get('2001:db8:aaaa:1:2::1')).status, 200);
  assert.equal((await get('2001:db8:aaaa:1:3::1')).status, 429);
  // Otra red /56 → cuota propia.
  assert.equal((await get('2001:db8:bbbb:1::1')).status, 200);
});

// --- Recuperación y escenario campus ---

test('recuperación: la cuota se libera al terminar la ventana', async () => {
  const local = crearLimitador({ identifier: 't-ventana', windowMs: 150, limit: 2 });
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', local);
  app.get('/api/ok', (req, res) => res.json({ ok: true }));
  const b = await montar(app);
  const get = () => fetch(`${b}/api/ok`);
  assert.equal((await get()).status, 200);
  assert.equal((await get()).status, 200);
  assert.equal((await get()).status, 429);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await get()).status, 200, 'tras la ventana vuelve a permitir');
});

test('escenario campus ficticio: 20 peticiones de 10 usuarios detrás de una IP no se bloquean con el umbral holgado', async () => {
  const globalCampus = crearLimitador({ identifier: 't-campus', windowMs: 60_000, limit: 50 });
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', globalCampus);
  app.get('/api/ok', (req, res) => res.json({ ok: true }));
  const b = await montar(app);
  for (let usuario = 1; usuario <= 10; usuario++) {
    for (let llamada = 0; llamada < 2; llamada++) {
      const r = await fetch(`${b}/api/ok`, { headers: { 'x-forwarded-for': '10.20.30.40' } });
      assert.equal(r.status, 200, `usuario ${usuario} llamada ${llamada} no debe bloquearse`);
    }
  }
});

test('campus combinado: 50 usuarios con la misma IP pasan por global + por ruta sin bloquearse entre sí', async () => {
  // Montaje equivalente al de index.js (global antes de express.json, ruta con
  // su limitador después de auth) pero con un global holgado: 50 usuarios
  // reales detrás del NAT del campus, cada uno con su cuota por usuario.
  const globalHolgado = crearLimitador({ identifier: 't-campus-combinado', windowMs: 60_000, limit: 200 });
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', globalHolgado);
  app.use(express.json());
  app.post('/api/formularios', authFalso, limitadorFormularios, (req, res) => {
    ejecuciones.formularios += 1;
    res.status(201).json({ ok: true });
  });
  const b = await montar(app);
  const enviar = (usuario) => fetch(`${b}/api/formularios`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': String(usuario),
      'x-forwarded-for': '10.99.0.1',
    },
    body: '{}',
  });

  // 50 usuarios × 2 envíos = 100 peticiones desde la misma IP: todas pasan.
  const antes = ejecuciones.formularios;
  for (let usuario = 301; usuario <= 350; usuario++) {
    for (let envio = 0; envio < 2; envio++) {
      const r = await enviar(usuario);
      assert.equal(r.status, 201, `usuario ${usuario} envío ${envio + 1} debe pasar`);
    }
  }
  assert.equal(ejecuciones.formularios - antes, 100, 'las 100 operaciones se ejecutaron');

  // La 3.ª de cada usuario cae por su límite individual, sin tocar a los demás.
  for (let usuario = 301; usuario <= 350; usuario++) {
    const r = await enviar(usuario);
    assert.equal(r.status, 429, `usuario ${usuario} debe agotar su cuota propia`);
  }
  // Un usuario nuevo (51.º) sigue operando: el bloqueo no es de la IP.
  assert.equal((await enviar(351)).status, 201);
  assert.equal((await enviar(351)).status, 201);
});

// --- Montaje real del router de notificaciones ---

test('router real de notificaciones: el límite por usuario corta antes de insertar', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/notificaciones', notificacionesRouter);
  const b = await montar(app);
  const enviar = () => fetch(`${b}/api/notificaciones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ titulo: 'Aviso', mensaje: 'x', audiencia: 'global' }),
  });
  const antes = ejecuciones.notificacionesInsert;
  assert.equal((await enviar()).status, 201);
  assert.equal((await enviar()).status, 201);
  const tercera = await enviar();
  assert.equal(tercera.status, 429);
  assert.equal(ejecuciones.notificacionesInsert - antes, 2, 'solo las dos permitidas insertaron');
});
