// Pruebas del flujo OTP completo.
//
// Se reemplazan el repositorio (otpStore) y el mailer por dobles en memoria.
// No se toca PostgreSQL ni se envían correos reales. El código se recupera del
// buzón mock, nunca de una respuesta HTTP ni de un log.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-otp-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';
process.env.AUTH_OTP_ENABLED = 'true';
process.env.OTP_PEPPER = 'pepper-ficticio-solo-para-pruebas';
process.env.OTP_EXPIRATION_MINUTES = '10';
process.env.OTP_MAIL_PROVIDER = 'mock';
// Umbrales altos para que las pruebas funcionales no choquen con 429.
process.env.RATE_LIMIT_OTP_SOLICITUD_IP_15MIN = '10000';
process.env.RATE_LIMIT_OTP_SOLICITUD_CUENTA_15MIN = '10000';
process.env.RATE_LIMIT_OTP_VERIFICACION_IP_15MIN = '10000';
process.env.RATE_LIMIT_OTP_VERIFICACION_CUENTA_15MIN = '10000';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: authRouter } = await import('../routes/auth.js');
const { otpStore } = await import('../lib/otpStore.js');
const { mailer } = await import('../lib/mailer.js');
const { generarHashOtp } = await import('../lib/otp.js');

const enviarCodigoOriginal = mailer.enviarCodigoOtp.bind(mailer);
const MENSAJE_SOLICITUD = 'Si el correo es válido, recibirás un código de acceso.';
const MENSAJE_VERIFICACION = 'Código inválido o expirado.';

let estado;
let servidor;
let base;

function clonar(fila) {
  return fila ? { ...fila } : null;
}

function reiniciarEstado() {
  estado = {
    codigos: [],
    usuarios: new Map(),
    siguienteOtpId: 1,
    siguienteUsuarioId: 100,
  };

  mailer.enviarCodigoOtp = enviarCodigoOriginal;
  mailer.limpiarEnviados();

  otpStore.invalidarYGuardar = async ({
    correo,
    codigoHash,
    expiraEn,
    maxIntentos,
    ip,
    userAgent,
  }) => {
    for (const codigo of estado.codigos) {
      if (codigo.correo_institucional === correo && codigo.consumido_en === null) {
        codigo.consumido_en = new Date();
      }
    }

    const fila = {
      id_otp: estado.siguienteOtpId,
      correo_institucional: correo,
      codigo_hash: codigoHash,
      expira_en: expiraEn instanceof Date ? expiraEn : new Date(expiraEn),
      intentos: 0,
      max_intentos: maxIntentos,
      consumido_en: null,
      creado_en: new Date(),
      ip_solicitud: ip,
      user_agent: userAgent,
    };

    estado.siguienteOtpId += 1;
    estado.codigos.push(fila);

    return { id_otp: fila.id_otp };
  };

  otpStore.buscarCodigoActivo = async ({ correo }) => {
    const activos = estado.codigos.filter(
      (codigo) => codigo.correo_institucional === correo && codigo.consumido_en === null,
    );

    return clonar(activos[activos.length - 1]);
  };

  otpStore.registrarIntentoFallido = async ({ idOtp, codigoHash }) => {
    const fila = estado.codigos.find((codigo) => codigo.id_otp === idOtp);

    if (!fila || fila.consumido_en !== null || fila.codigo_hash !== codigoHash) {
      return null;
    }

    fila.intentos += 1;

    if (fila.intentos >= fila.max_intentos) {
      fila.consumido_en = new Date();
    }

    return clonar(fila);
  };

  otpStore.consumirCodigo = async ({ idOtp, codigoHash }) => {
    const fila = estado.codigos.find((codigo) => codigo.id_otp === idOtp);

    if (
      !fila ||
      fila.codigo_hash !== codigoHash ||
      fila.consumido_en !== null ||
      new Date(fila.expira_en).getTime() <= Date.now() ||
      fila.intentos >= fila.max_intentos
    ) {
      return null;
    }

    fila.consumido_en = new Date();
    return { id_otp: fila.id_otp };
  };

  otpStore.marcarConsumido = async ({ idOtp, codigoHash }) => {
    const fila = estado.codigos.find((codigo) => codigo.id_otp === idOtp);

    if (fila && fila.codigo_hash === codigoHash && fila.consumido_en === null) {
      fila.consumido_en = new Date();
    }
  };

  otpStore.buscarUsuario = async ({ correo }) => {
    return clonar(estado.usuarios.get(correo));
  };

  otpStore.crearUsuarioOtp = async ({ correo, nombre }) => {
    if (estado.usuarios.has(correo)) {
      return null;
    }

    const usuario = {
      id_usuario: estado.siguienteUsuarioId,
      nombre_completo: nombre,
      correo_institucional: correo,
      institutional_id: null,
      id_rol: 1,
      deleted_at: null,
      rol: 'alumno',
      last_login: new Date(),
    };

    estado.siguienteUsuarioId += 1;
    estado.usuarios.set(correo, usuario);

    return clonar(usuario);
  };

  otpStore.actualizarLastLogin = async ({ idUsuario }) => {
    for (const usuario of estado.usuarios.values()) {
      if (usuario.id_usuario === idUsuario) {
        usuario.last_login = new Date();
      }
    }
  };

  otpStore.limpiarExpirados = async () => {};
}

function agregarUsuario({
  correo,
  id_rol = 1,
  rol = 'alumno',
  nombre = 'Usuario Ficticio',
  deleted_at = null,
  institutional_id = null,
}) {
  const usuario = {
    id_usuario: estado.siguienteUsuarioId,
    nombre_completo: nombre,
    correo_institucional: correo,
    institutional_id,
    id_rol,
    deleted_at,
    rol,
    last_login: null,
  };

  estado.siguienteUsuarioId += 1;
  estado.usuarios.set(correo, usuario);

  return usuario;
}

function agregarCodigo({
  correo,
  codigo = '123456',
  expiraEn = new Date(Date.now() + 10 * 60 * 1000),
  intentos = 0,
  maxIntentos = 5,
  consumidoEn = null,
}) {
  const fila = {
    id_otp: estado.siguienteOtpId,
    correo_institucional: correo,
    codigo_hash: generarHashOtp(codigo),
    expira_en: expiraEn instanceof Date ? expiraEn : new Date(expiraEn),
    intentos,
    max_intentos: maxIntentos,
    consumido_en: consumidoEn,
    creado_en: new Date(),
    ip_solicitud: null,
    user_agent: null,
  };

  estado.siguienteOtpId += 1;
  estado.codigos.push(fila);

  return fila;
}

function ultimoCodigoEnviado() {
  const enviados = mailer.obtenerEnviados();
  return enviados[enviados.length - 1]?.codigo;
}

async function pedir(ruta, cuerpo) {
  const respuesta = await fetch(`${base}/api/auth/otp/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  return {
    status: respuesta.status,
    cuerpo: await respuesta.json().catch(() => ({})),
    headers: respuesta.headers,
  };
}

const solicitar = (correo) => pedir('solicitar', { correo });
const verificar = (correo, codigo) => pedir('verificar', { correo, codigo });

before(async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/auth', authRouter);

  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

beforeEach(() => reiniciarEstado());

test('solicita un código para un correo válido @red.unid.mx sin revelar datos', async () => {
  const respuesta = await solicitar('alumno@red.unid.mx');

  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.cuerpo, { message: MENSAJE_SOLICITUD });
  assert.equal(mailer.obtenerEnviados().length, 1);

  const enviado = mailer.obtenerEnviados()[0];
  assert.equal(enviado.correo, 'alumno@red.unid.mx');
  assert.match(enviado.codigo, /^\d{6}$/);

  const fila = estado.codigos[0];
  assert.equal(fila.correo_institucional, 'alumno@red.unid.mx');
  assert.match(fila.codigo_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(fila.codigo_hash, enviado.codigo);
  assert.equal(Object.values(fila).includes(enviado.codigo), false, 'no debe guardar el código en claro');
  assert.ok(fila.ip_solicitud);
});

test('la respuesta HTTP nunca contiene el código OTP', async () => {
  const respuesta = await solicitar('alumno@red.unid.mx');
  const codigo = ultimoCodigoEnviado();

  assert.equal(respuesta.status, 200);
  assert.match(codigo, /^\d{6}$/);
  assert.equal(JSON.stringify(respuesta.cuerpo).includes(codigo), false);
  assert.equal(
    [...respuesta.headers].map(([clave, valor]) => `${clave}:${valor}`).join(' ').includes(codigo),
    false,
  );
});

test('acepta también el dominio @unid.mx', async () => {
  const respuesta = await solicitar('alumno@unid.mx');

  assert.equal(respuesta.status, 200);
  assert.equal(mailer.obtenerEnviados().length, 1);
  assert.equal(mailer.obtenerEnviados()[0].correo, 'alumno@unid.mx');
});

test('normaliza el correo antes de almacenar y enviar', async () => {
  const respuesta = await solicitar('  ALUMNO@RED.UNID.MX  ');

  assert.equal(respuesta.status, 200);
  assert.equal(mailer.obtenerEnviados()[0].correo, 'alumno@red.unid.mx');
  assert.equal(estado.codigos[0].correo_institucional, 'alumno@red.unid.mx');
});

test('rechaza dominios y formatos inválidos sin generar código ni correo', async () => {
  const invalidos = [
    'alumno@gmail.com',
    'alumno@otro-unid.mx',
    'alumno@sub.red.unid.mx',
    'alumno@unid.mx.otrodominio.com',
    'alumno@red.unid.mx.evil.com',
    'sinarroba',
    'alumno @red.unid.mx',
    'alumno@@red.unid.mx',
    '',
    null,
  ];

  for (const correo of invalidos) {
    const respuesta = await solicitar(correo);
    assert.equal(respuesta.status, 400, `debe rechazar ${JSON.stringify(correo)}`);
  }

  assert.equal(mailer.obtenerEnviados().length, 0);
  assert.equal(estado.codigos.length, 0);
});

test('la respuesta de solicitud es idéntica para cuenta existente e inexistente', async () => {
  agregarUsuario({ correo: 'existe@red.unid.mx' });

  const existente = await solicitar('existe@red.unid.mx');
  const inexistente = await solicitar('nuevo@red.unid.mx');

  assert.equal(existente.status, inexistente.status);
  assert.deepEqual(existente.cuerpo, inexistente.cuerpo);
});

test('verifica el código correcto y conserva el rol existente de la BD', async () => {
  const usuario = agregarUsuario({
    correo: 'presidente@red.unid.mx',
    id_rol: 2,
    rol: 'presidente',
    nombre: 'Presidente Ficticio',
    institutional_id: 'P-001',
  });

  await solicitar(usuario.correo_institucional);
  const codigo = ultimoCodigoEnviado();
  const respuesta = await verificar(usuario.correo_institucional, codigo);

  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.cuerpo.token);
  assert.equal(respuesta.cuerpo.user.id_usuario, usuario.id_usuario);
  assert.equal(respuesta.cuerpo.user.id_rol, 2);
  assert.equal(respuesta.cuerpo.user.rol, 'presidente');
  assert.equal(respuesta.cuerpo.user.correo_institucional, usuario.correo_institucional);

  const payload = jwt.verify(respuesta.cuerpo.token, process.env.JWT_SECRET);
  assert.equal(payload.id, usuario.id_usuario);
  assert.equal(payload.id_rol, 2);
  assert.equal(payload.rol, 'presidente');

  assert.equal(estado.usuarios.get(usuario.correo_institucional).id_rol, 2);
  assert.ok(estado.usuarios.get(usuario.correo_institucional).last_login);
});

test('verifica el código correcto para vicepresidente y conserva su rol', async () => {
  const usuario = agregarUsuario({
    correo: 'vice@red.unid.mx',
    id_rol: 5,
    rol: 'vicepresidente',
  });

  await solicitar(usuario.correo_institucional);
  const respuesta = await verificar(usuario.correo_institucional, ultimoCodigoEnviado());

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.cuerpo.user.id_rol, 5);
  assert.equal(respuesta.cuerpo.user.rol, 'vicepresidente');
});

test('crea como alumno un usuario inexistente solo después de verificar', async () => {
  const correo = 'nuevo.alumno@red.unid.mx';

  await solicitar(correo);
  assert.equal(estado.usuarios.has(correo), false, 'no debe crear la cuenta al solicitar');

  const respuesta = await verificar(correo, ultimoCodigoEnviado());

  assert.equal(respuesta.status, 200);
  assert.equal(estado.usuarios.get(correo).id_rol, 1);
  assert.equal(estado.usuarios.get(correo).rol, 'alumno');
  assert.equal(respuesta.cuerpo.user.id_rol, 1);
  assert.equal(respuesta.cuerpo.user.rol, 'alumno');
});

test('rechaza un código incorrecto con mensaje genérico y suma un intento', async () => {
  const usuario = agregarUsuario({ correo: 'alumno@red.unid.mx' });
  await solicitar(usuario.correo_institucional);
  const codigo = ultimoCodigoEnviado();
  const incorrecto = codigo === '000000' ? '111111' : '000000';

  const respuesta = await verificar(usuario.correo_institucional, incorrecto);

  assert.equal(respuesta.status, 401);
  assert.deepEqual(respuesta.cuerpo, { error: MENSAJE_VERIFICACION });
  assert.equal(estado.codigos[0].intentos, 1);
  assert.equal(estado.codigos[0].consumido_en, null);
});

test('rechaza un código expirado y lo marca como consumido', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });
  agregarCodigo({
    correo,
    codigo: '123456',
    expiraEn: new Date(Date.now() - 1000),
  });

  const respuesta = await verificar(correo, '123456');

  assert.equal(respuesta.status, 401);
  assert.deepEqual(respuesta.cuerpo, { error: MENSAJE_VERIFICACION });
  assert.notEqual(estado.codigos[0].consumido_en, null);
});

test('permite como máximo cinco intentos y luego invalida el código', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });
  await solicitar(correo);
  const codigo = ultimoCodigoEnviado();
  const incorrecto = codigo === '000000' ? '111111' : '000000';

  for (let intento = 1; intento <= 5; intento += 1) {
    const respuesta = await verificar(correo, incorrecto);
    assert.equal(respuesta.status, 401);
    assert.equal(estado.codigos[0].intentos, intento);
  }

  assert.notEqual(estado.codigos[0].consumido_en, null);

  const sexto = await verificar(correo, codigo);
  assert.equal(sexto.status, 401);
  assert.equal(sexto.cuerpo.token, undefined);
});

test('no permite reutilizar un código consumido', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });
  await solicitar(correo);
  const codigo = ultimoCodigoEnviado();

  const primera = await verificar(correo, codigo);
  const segunda = await verificar(correo, codigo);

  assert.equal(primera.status, 200);
  assert.equal(segunda.status, 401);
  assert.equal(segunda.cuerpo.token, undefined);
});

test('solicitar un código nuevo invalida el anterior', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });

  await solicitar(correo);
  const codigoAnterior = ultimoCodigoEnviado();

  await solicitar(correo);
  const codigoNuevo = ultimoCodigoEnviado();

  const conAnterior = await verificar(correo, codigoAnterior);
  const conNuevo = await verificar(correo, codigoNuevo);

  assert.equal(conAnterior.status, 401);
  assert.equal(conNuevo.status, 200);
});

test('admin (rol 3) no recibe código ni puede iniciar sesión por OTP', async () => {
  const correo = 'admin@red.unid.mx';
  agregarUsuario({ correo, id_rol: 3, rol: 'admin' });

  const solicitud = await solicitar(correo);
  assert.equal(solicitud.status, 200);
  assert.deepEqual(solicitud.cuerpo, { message: MENSAJE_SOLICITUD });
  assert.equal(mailer.obtenerEnviados().length, 0);

  agregarCodigo({ correo, codigo: '123456' });
  const verificacion = await verificar(correo, '123456');

  assert.equal(verificacion.status, 401);
  assert.deepEqual(verificacion.cuerpo, { error: MENSAJE_VERIFICACION });
  assert.equal(verificacion.cuerpo.token, undefined);
});

test('rectoría (rol 4) no recibe código ni puede iniciar sesión por OTP', async () => {
  const correo = 'rectoria@red.unid.mx';
  agregarUsuario({ correo, id_rol: 4, rol: 'rectoria' });

  await solicitar(correo);
  assert.equal(mailer.obtenerEnviados().length, 0);

  agregarCodigo({ correo, codigo: '123456' });
  const verificacion = await verificar(correo, '123456');

  assert.equal(verificacion.status, 401);
  assert.equal(verificacion.cuerpo.token, undefined);
});

test('una cuenta desactivada no recibe código ni puede iniciar sesión por OTP', async () => {
  const correo = 'baja@red.unid.mx';
  agregarUsuario({ correo, deleted_at: new Date() });

  await solicitar(correo);
  assert.equal(mailer.obtenerEnviados().length, 0);

  agregarCodigo({ correo, codigo: '123456' });
  const verificacion = await verificar(correo, '123456');

  assert.equal(verificacion.status, 401);
  assert.equal(verificacion.cuerpo.token, undefined);
});

test('los mensajes de verificación no permiten enumerar usuarios', async () => {
  const existente = 'existe@red.unid.mx';
  const inexistente = 'no-existe@red.unid.mx';

  agregarUsuario({ correo: existente });
  agregarCodigo({ correo: existente, codigo: '123456' });
  agregarCodigo({ correo: inexistente, codigo: '654321' });

  const a = await verificar(existente, '000000');
  const b = await verificar(inexistente, '000000');

  assert.equal(a.status, b.status);
  assert.deepEqual(a.cuerpo, b.cuerpo);
  assert.equal(a.cuerpo.token, undefined);
  assert.equal(b.cuerpo.token, undefined);
});

test('el JWT emitido es compatible con el contrato actual', async () => {
  const correo = 'alumno@red.unid.mx';
  const usuario = agregarUsuario({
    correo,
    id_rol: 1,
    rol: 'alumno',
    nombre: 'Alumno Ficticio',
    institutional_id: 'A-001',
  });

  await solicitar(correo);
  const respuesta = await verificar(correo, ultimoCodigoEnviado());
  const payload = jwt.verify(respuesta.cuerpo.token, process.env.JWT_SECRET);

  assert.equal(payload.id, usuario.id_usuario);
  assert.equal(payload.nombre_completo, 'Alumno Ficticio');
  assert.equal(payload.correo_institucional, correo);
  assert.equal(payload.institutional_id, 'A-001');
  assert.equal(payload.id_rol, 1);
  assert.equal(payload.rol, 'alumno');
  assert.equal(payload.exp - payload.iat, 24 * 60 * 60);

  assert.deepEqual(Object.keys(respuesta.cuerpo.user).sort(), [
    'correo_institucional',
    'id_rol',
    'id_usuario',
    'institutional_id',
    'nombre_completo',
    'rol',
  ]);
});

test('el fallo del mailer no rompe la respuesta ni filtra el código', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });

  let codigoIntentado = null;
  mailer.enviarCodigoOtp = async ({ codigo }) => {
    codigoIntentado = codigo;
    throw new Error('fallo de red ficticio');
  };

  const errores = [];
  const errorOriginal = console.error;
  console.error = (...args) => errores.push(args.join(' '));

  let respuesta;
  try {
    respuesta = await solicitar(correo);
  } finally {
    console.error = errorOriginal;
  }

  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.cuerpo, { message: MENSAJE_SOLICITUD });
  assert.equal(JSON.stringify(respuesta.cuerpo).includes(codigoIntentado), false);
  assert.equal(errores.join(' ').includes(codigoIntentado), false);
  assert.notEqual(estado.codigos[0].consumido_en, null);
});

test('dos verificaciones concurrentes: solo una consume el código', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });
  await solicitar(correo);
  const codigo = ultimoCodigoEnviado();

  const [a, b] = await Promise.all([verificar(correo, codigo), verificar(correo, codigo)]);
  const estados = [a.status, b.status].sort((x, y) => x - y);

  assert.deepEqual(estados, [200, 401]);
  const exitosas = [a, b].filter((r) => r.status === 200);
  assert.equal(exitosas.length, 1);
  assert.ok(exitosas[0].cuerpo.token);
});

test('no consume el código si una solicitud nueva lo reemplaza entre lectura y consumo', async () => {
  const correo = 'alumno@red.unid.mx';
  agregarUsuario({ correo });
  await solicitar(correo);
  const codigoAnterior = ultimoCodigoEnviado();
  const consumirOriginal = otpStore.consumirCodigo;

  // Simula el upsert de una nueva solicitud sobre la misma fila activa justo
  // después de que la verificación leyó el código anterior y antes de que lo
  // consuma. El consumo debe fallar porque el hash ya no coincide.
  otpStore.consumirCodigo = async (args) => {
    const fila = estado.codigos.find((codigo) => codigo.id_otp === args.idOtp);
    if (fila) {
      fila.codigo_hash = generarHashOtp('999999');
      fila.intentos = 0;
      fila.expira_en = new Date(Date.now() + 10 * 60 * 1000);
    }

    return consumirOriginal(args);
  };

  const respuesta = await verificar(correo, codigoAnterior);

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.cuerpo.token, undefined);
});

test('los endpoints responden 503 cuando AUTH_OTP_ENABLED no está activo', async () => {
  const anterior = process.env.AUTH_OTP_ENABLED;

  try {
    delete process.env.AUTH_OTP_ENABLED;
    const sinVariable = await solicitar('alumno@red.unid.mx');
    assert.equal(sinVariable.status, 503);

    process.env.AUTH_OTP_ENABLED = 'false';
    const enFalse = await verificar('alumno@red.unid.mx', '123456');
    assert.equal(enFalse.status, 503);
  } finally {
    process.env.AUTH_OTP_ENABLED = anterior;
  }

  assert.equal(mailer.obtenerEnviados().length, 0);
});

test('sin OTP_PEPPER el endpoint falla cerrado con 503', async () => {
  const anterior = process.env.OTP_PEPPER;
  delete process.env.OTP_PEPPER;

  try {
    const respuesta = await solicitar('alumno@red.unid.mx');
    assert.equal(respuesta.status, 503);
  } finally {
    process.env.OTP_PEPPER = anterior;
  }

  assert.equal(mailer.obtenerEnviados().length, 0);
});
