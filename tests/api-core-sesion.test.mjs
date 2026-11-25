// Regresiones de aislamiento y atomicidad de sesión. Se empaqueta el módulo real
// con Vite y se crean dos instancias (pestañas) que comparten localStorage y un
// administrador de Web Locks FIFO determinista.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const CLAVE_SESION = 'unid_session';
const CLAVE_CUENTA = 'unid_trusted_account';
const DISPOSITIVO = 'a'.repeat(64);
const TOKEN_CONFIABLE_A = 'b'.repeat(64);
const TOKEN_CONFIABLE_B = 'd'.repeat(64);
let api;
let apiPestanaB;
let almacenamiento;
let llamadas;
let responderFetch;
let alEscribir;
let alLeer;

function crearLocks() {
  const colas = new Map();
  return {
    request(nombre, opciones, callback) {
      if (typeof opciones === 'function') {
        callback = opciones;
        opciones = {};
      }
      const anterior = colas.get(nombre) || Promise.resolve();
      const operacion = anterior.then(() => callback());
      const cola = operacion.then(() => undefined, () => undefined);
      colas.set(nombre, cola);
      cola.finally(() => {
        if (colas.get(nombre) === cola) colas.delete(nombre);
      });
      return operacion;
    },
  };
}

function jwtFicticio(payload) {
  return `cabecera.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.firma`;
}

function tokenAntiguo(idUsuario) {
  // La falta de generación fuerza la renovación sin depender del reloj.
  return jwtFicticio({ id: idUsuario, id_dispositivo_confiable: 1, exp: Math.floor(Date.now() / 1000) + 3600 });
}

function tokenVigente(idUsuario) {
  return jwtFicticio({ id: idUsuario, exp: Math.floor(Date.now() / 1000) + 3600 });
}

function sesion(idUsuario, token) {
  return { token, user: { id_usuario: idUsuario, nombre_completo: `Cuenta ${idUsuario}`, id_rol: 1 } };
}

function guardarCuenta(idUsuario, token = TOKEN_CONFIABLE_A) {
  almacenamiento.set(CLAVE_CUENTA, JSON.stringify({
    dispositivo_id: DISPOSITIVO,
    id_usuario: idUsuario,
    token,
    expira_en: new Date(Date.now() + 86400000).toISOString(),
  }));
}

function respuestaRenovacion(idUsuario, token, tokenConfiable) {
  return new Response(JSON.stringify({
    token,
    user: { id_usuario: idUsuario, nombre_completo: `Cuenta ${idUsuario}`, id_rol: 1 },
    dispositivo_confiable: cuentaConfiable(tokenConfiable),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function cuentaConfiable(token) {
  return { token, expira_en: new Date(Date.now() + 86400000).toISOString() };
}

function llamadasRenovacion() {
  return llamadas.filter((item) => item.url.endsWith('/auth/otp/dispositivo/renovar'));
}

function autorizacionDe(url) {
  return llamadas.find((item) => item.url === url)?.options?.headers?.Authorization;
}

before(async () => {
  const entrada = fileURLToPath(new URL('../src/services/api-core.js', import.meta.url));
  const resultado = await build({
    configFile: false,
    logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_URL': '"http://api.test/api"' },
    build: {
      write: false,
      minify: false,
      lib: { entry: entrada, formats: ['es'], fileName: 'api-core-sesion' },
    },
  });
  const codigo = resultado[0].output.find((item) => item.type === 'chunk').code;
  const uri = `data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`;
  api = await import(uri);
  apiPestanaB = await import(`${uri}#pestana-b`);
});

beforeEach(() => {
  almacenamiento = new Map();
  alEscribir = null;
  alLeer = null;
  globalThis.localStorage = {
    getItem(clave) {
      const valor = almacenamiento.get(clave) ?? null;
      alLeer?.(clave, valor);
      return valor;
    },
    setItem(clave, valor) {
      almacenamiento.set(clave, String(valor));
      alEscribir?.(clave, String(valor));
    },
    removeItem(clave) { almacenamiento.delete(clave); },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { locks: crearLocks() },
  });
  globalThis.window = { dispatchEvent() {} };
  llamadas = [];
  responderFetch = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  globalThis.fetch = async (url, options = {}) => {
    llamadas.push({ url: String(url), options });
    return responderFetch(url, options);
  };
});

test('si otra pestaña cambia la cuenta durante la renovación, A falla con 409 y no sobrescribe B', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenB = tokenVigente(2);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);

  let resolverRenovacion;
  responderFetch = (url) => {
    if (url.endsWith('/auth/otp/dispositivo/renovar')) {
      return new Promise((resolve) => { resolverRenovacion = resolve; });
    }
    throw new Error('No debe enviarse la petición de datos tras cambiar de cuenta');
  };

  const solicitud = api.request('/recurso');
  await apiPestanaB.setSession(sesion(2, tokenB));
  resolverRenovacion(respuestaRenovacion(1, tokenVigente(1), 'c'.repeat(64)));

  await assert.rejects(solicitud, (error) => error.status === 409);
  assert.equal(llamadasRenovacion().length, 1);
  assert.equal(api.getToken(), tokenB, 'la sesión ganadora de B no debe sobrescribirse');
});

test('la validación y persistencia de renovación son atómicas frente a login cross-tab', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenRenovadoA = tokenVigente(1);
  const tokenB = tokenVigente(2);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);

  let enFaseFinal = false;
  let loginB;
  // En el código sin lock, este read ocurre después de validar época y antes de
  // persistir A: B ganaba y luego A la sobrescribía. Con lock, B espera y gana al final.
  alLeer = (clave) => {
    if (clave === CLAVE_CUENTA && enFaseFinal && !loginB) {
      loginB = apiPestanaB.setSession(sesion(2, tokenB));
    }
  };
  responderFetch = async (url) => {
    if (url.endsWith('/auth/otp/dispositivo/renovar')) {
      enFaseFinal = true;
      return respuestaRenovacion(1, tokenRenovadoA, 'c'.repeat(64));
    }
    throw new Error('Esta prueba solo renueva la sesión');
  };

  await api.renovarSesionConfiable();
  assert.ok(loginB, 'el login B debe haberse intentado en la ventana crítica');
  await loginB;
  assert.equal(api.getToken(), tokenB);
});

test('dos logins concurrentes dejan sesión y cuenta confiable del mismo ganador', async () => {
  const tokenA = tokenVigente(1);
  const tokenB = tokenVigente(2);
  const loginA = api.iniciarSesionAlmacenada(sesion(1, tokenA), {
    dispositivoConfiable: cuentaConfiable('c'.repeat(64)),
  });
  const loginB = apiPestanaB.iniciarSesionAlmacenada(sesion(2, tokenB), {
    dispositivoConfiable: cuentaConfiable('e'.repeat(64)),
  });
  await Promise.all([loginA, loginB]);

  assert.equal(api.getToken(), tokenB);
  const cuenta = api.obtenerCuentaConfiable();
  assert.equal(Number(cuenta.id_usuario), 2);
  assert.equal(cuenta.token, 'e'.repeat(64));
});

test('un login MSAL obsoleto no sobrescribe al ganador aunque espere el lock', async () => {
  const tokenA = tokenVigente(1);
  const tokenB = tokenVigente(2);
  await api.setSession(sesion(1, tokenA));
  const epocaAnterior = api.capturarEpocaSesion();

  const ganadora = apiPestanaB.iniciarSesionAlmacenada(sesion(2, tokenB), {
    dispositivoConfiable: cuentaConfiable('e'.repeat(64)),
  });
  const obsoleto = api.iniciarSesionAlmacenada(sesion(1, tokenA), {
    epocaEsperada: epocaAnterior,
    dispositivoConfiable: cuentaConfiable('c'.repeat(64)),
  });
  const [, resultadoObsoleto] = await Promise.all([ganadora, obsoleto]);

  assert.equal(resultadoObsoleto, null);
  assert.equal(api.getToken(), tokenB);
  assert.equal(Number(api.obtenerCuentaConfiable().id_usuario), 2);
});

test('un clear MSAL obsoleto no borra el login ganador', async () => {
  const tokenA = tokenVigente(1);
  const tokenB = tokenVigente(2);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);
  const epocaAnterior = api.capturarEpocaSesion();

  const ganadora = apiPestanaB.iniciarSesionAlmacenada(sesion(2, tokenB), {
    dispositivoConfiable: cuentaConfiable('e'.repeat(64)),
  });
  const limpio = api.clearSession({ epocaEsperada: epocaAnterior, limpiarCuenta: true });
  const [, resultadoLimpio] = await Promise.all([ganadora, limpio]);

  assert.equal(resultadoLimpio, false);
  assert.equal(api.getToken(), tokenB);
  assert.equal(Number(api.obtenerCuentaConfiable().id_usuario), 2);
});

test('si no se puede persistir la época, el login falla sin escribir una sesión parcial', async () => {
  const escribir = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = (clave, valor) => {
    if (clave === 'unid_session_epoch') throw new Error('cuota llena');
    return escribir(clave, valor);
  };

  await assert.rejects(api.setSession(sesion(1, tokenVigente(1))), /cuota llena/);
  assert.equal(api.getToken(), null);
});

test('logout explícito borra sesión y cuenta confiable juntas', async () => {
  await api.iniciarSesionAlmacenada(sesion(1, tokenVigente(1)), {
    dispositivoConfiable: cuentaConfiable('c'.repeat(64)),
  });
  assert.ok(api.obtenerCuentaConfiable());

  assert.equal(await api.clearSession({ limpiarCuenta: true }), true);
  assert.equal(api.getToken(), null);
  assert.equal(api.obtenerCuentaConfiable(), null);
});

test('la limpieza por cuenta discrepante no borra un token confiable ya rotado', async () => {
  await api.setSession(sesion(1, tokenVigente(1)));
  guardarCuenta(1, TOKEN_CONFIABLE_A);
  const epoca = api.capturarEpocaSesion();
  const esperada = api.obtenerCuentaConfiable();
  guardarCuenta(1, TOKEN_CONFIABLE_B);

  assert.equal(await api.limpiarCuentaConfianzaSiCoincide(esperada, epoca), false);
  assert.equal(api.obtenerCuentaConfiable().token, TOKEN_CONFIABLE_B);
});

test('una petición de B no comparte la renovación pendiente de A', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenB = tokenAntiguo(2);
  const tokenRenovadoB = tokenVigente(2);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);

  let resolverA;
  let resolverB;
  let avisarA;
  let avisarB;
  const aInicio = new Promise((resolve) => { avisarA = resolve; });
  const bInicio = new Promise((resolve) => { avisarB = resolve; });
  responderFetch = (url, options) => {
    if (!url.endsWith('/auth/otp/dispositivo/renovar')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const confiable = options.headers['X-Trusted-Device'];
    if (confiable === TOKEN_CONFIABLE_A) {
      avisarA();
      return new Promise((resolve) => { resolverA = resolve; });
    }
    assert.equal(confiable, TOKEN_CONFIABLE_B);
    avisarB();
    return new Promise((resolve) => { resolverB = resolve; });
  };

  const solicitudA = api.request('/recurso-a');
  await aInicio;
  // Mismo módulo/pestaña a propósito: detecta el antiguo Map/promesa global.
  await api.setSession(sesion(2, tokenB));
  guardarCuenta(2, TOKEN_CONFIABLE_B);
  const solicitudB = api.request('/recurso-b');
  await bInicio;
  assert.equal(llamadasRenovacion().length, 2, 'B inicia su propia renovación sin esperar ni compartir A');

  resolverA(respuestaRenovacion(1, tokenVigente(1), 'c'.repeat(64)));
  await assert.rejects(solicitudA, (error) => error.status === 409);
  resolverB(respuestaRenovacion(2, tokenRenovadoB, 'e'.repeat(64)));
  assert.deepEqual(await solicitudB, { ok: true });

  assert.deepEqual(llamadasRenovacion().map((item) => item.options.headers['X-Trusted-Device']), [TOKEN_CONFIABLE_A, TOKEN_CONFIABLE_B]);
  assert.equal(autorizacionDe('http://api.test/api/recurso-a'), undefined);
  assert.equal(autorizacionDe('http://api.test/api/recurso-b'), `Bearer ${tokenRenovadoB}`);
  assert.equal(api.getToken(), tokenRenovadoB);
});

test('dos pestañas de la misma cuenta/época serializan la renovación y usan el token rotado', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenIntermedio = tokenVigente(1);
  const tokenFinal = tokenVigente(1);
  const confiableIntermedio = 'c'.repeat(64);
  const confiableFinal = 'e'.repeat(64);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);

  let resolverPrimero;
  let resolverSegundo;
  let avisarPrimero;
  let avisarSegundo;
  const primeroInicio = new Promise((resolve) => { avisarPrimero = resolve; });
  const segundoInicio = new Promise((resolve) => { avisarSegundo = resolve; });
  responderFetch = (url, options) => {
    if (!url.endsWith('/auth/otp/dispositivo/renovar')) throw new Error('solo se espera renovación');
    if (options.headers['X-Trusted-Device'] === TOKEN_CONFIABLE_A) {
      avisarPrimero();
      return new Promise((resolve) => { resolverPrimero = resolve; });
    }
    assert.equal(options.headers['X-Trusted-Device'], confiableIntermedio);
    avisarSegundo();
    return new Promise((resolve) => { resolverSegundo = resolve; });
  };

  const primera = api.renovarSesionConfiable();
  const segunda = apiPestanaB.renovarSesionConfiable();
  await primeroInicio;
  resolverPrimero(respuestaRenovacion(1, tokenIntermedio, confiableIntermedio));
  await primera;
  await segundoInicio;
  resolverSegundo(respuestaRenovacion(1, tokenFinal, confiableFinal));
  await segunda;

  assert.deepEqual(llamadasRenovacion().map((item) => item.options.headers['X-Trusted-Device']), [TOKEN_CONFIABLE_A, confiableIntermedio]);
  assert.equal(api.getToken(), tokenFinal);
  assert.equal(api.obtenerCuentaConfiable().token, confiableFinal);
});

test('dos peticiones de la misma cuenta y época sí comparten una sola renovación', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenRenovado = tokenVigente(1);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);

  let resolver;
  let avisarInicio;
  const inicio = new Promise((resolve) => { avisarInicio = resolve; });
  responderFetch = (url) => url.endsWith('/auth/otp/dispositivo/renovar')
    ? new Promise((resolve) => { resolver = resolve; avisarInicio(); })
    : new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const primera = api.request('/recurso-1');
  const segunda = api.request('/recurso-2');
  await inicio;
  assert.equal(llamadasRenovacion().length, 1);
  resolver(respuestaRenovacion(1, tokenRenovado, 'c'.repeat(64)));
  await Promise.all([primera, segunda]);

  assert.equal(llamadasRenovacion().length, 1);
  assert.equal(autorizacionDe('http://api.test/api/recurso-1'), `Bearer ${tokenRenovado}`);
  assert.equal(autorizacionDe('http://api.test/api/recurso-2'), `Bearer ${tokenRenovado}`);
});

test('un login nuevo de la misma cuenta tampoco comparte la promesa de la época anterior', async () => {
  const tokenViejo = tokenAntiguo(1);
  const tokenNuevo = tokenAntiguo(1);
  const tokenRenovado = tokenVigente(1);
  await api.setSession(sesion(1, tokenViejo));
  guardarCuenta(1);

  let resolverViejo;
  let resolverNuevo;
  let avisarNuevo;
  const nuevoInicio = new Promise((resolve) => { avisarNuevo = resolve; });
  responderFetch = (url, options) => {
    if (!url.endsWith('/auth/otp/dispositivo/renovar')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (options.headers['X-Trusted-Device'] === TOKEN_CONFIABLE_A) {
      return new Promise((resolve) => { resolverViejo = resolve; });
    }
    avisarNuevo();
    return new Promise((resolve) => { resolverNuevo = resolve; });
  };

  const solicitudVieja = api.request('/viejo');
  await api.clearSession();
  await api.setSession(sesion(1, tokenNuevo));
  guardarCuenta(1, TOKEN_CONFIABLE_B);
  const solicitudNueva = api.request('/nuevo');
  await nuevoInicio;
  assert.equal(llamadasRenovacion().length, 2, 'la época nueva tiene lock y promesa propios');

  resolverViejo(respuestaRenovacion(1, tokenVigente(1), 'c'.repeat(64)));
  await assert.rejects(solicitudVieja, (error) => error.status === 409);
  resolverNuevo(respuestaRenovacion(1, tokenRenovado, 'e'.repeat(64)));
  await solicitudNueva;

  assert.equal(llamadasRenovacion().length, 2);
  assert.equal(autorizacionDe('http://api.test/api/viejo'), undefined);
  assert.equal(autorizacionDe('http://api.test/api/nuevo'), `Bearer ${tokenRenovado}`);
});

test('la renovación normal de la misma cuenta permite enviar la petición con su token renovado', async () => {
  const tokenA = tokenAntiguo(1);
  const tokenRenovado = tokenVigente(1);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);
  responderFetch = async (url) => url.endsWith('/auth/otp/dispositivo/renovar')
    ? respuestaRenovacion(1, tokenRenovado, 'c'.repeat(64))
    : new Response(JSON.stringify({ recurso: 'de A' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  assert.deepEqual(await api.request('/recurso'), { recurso: 'de A' });
  assert.equal(autorizacionDe('http://api.test/api/recurso'), `Bearer ${tokenRenovado}`);
  assert.equal(api.getToken(), tokenRenovado);
});

test('un fallo de renovación conserva el flujo de la misma cuenta con su token capturado', async () => {
  const tokenA = tokenAntiguo(1);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);
  responderFetch = async (url) => url.endsWith('/auth/otp/dispositivo/renovar')
    ? new Response(JSON.stringify({ error: 'No disponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    : new Response(JSON.stringify({ recurso: 'respuesta normal' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  assert.deepEqual(await api.request('/recurso'), { recurso: 'respuesta normal' });
  assert.equal(autorizacionDe('http://api.test/api/recurso'), `Bearer ${tokenA}`);
});

test('también bloquea el cambio de cuenta en el camino sin renovación', async () => {
  await api.setSession(sesion(1, tokenVigente(1)));
  // El login de B entra al lock antes que la comprobación final de request().
  const loginB = apiPestanaB.setSession(sesion(2, tokenVigente(2)));
  const solicitud = api.request('/recurso');
  await loginB;

  await assert.rejects(solicitud, (error) => error.status === 409);
  assert.equal(llamadas.length, 0, 'no debe enviarse ni el token A ni el token B');
});

test('una petición anónima no adopta una cuenta que inicia sesión mientras espera', async () => {
  const loginB = apiPestanaB.setSession(sesion(2, tokenVigente(2)));
  const solicitud = api.request('/recurso');
  await loginB;

  await assert.rejects(solicitud, (error) => error.status === 409);
  assert.equal(llamadas.length, 0);
});

test('sin Web Locks se conserva el flujo normal de una sola pestaña', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  const tokenA = tokenAntiguo(1);
  const tokenRenovado = tokenVigente(1);
  await api.setSession(sesion(1, tokenA));
  guardarCuenta(1);
  responderFetch = async (url) => url.endsWith('/auth/otp/dispositivo/renovar')
    ? respuestaRenovacion(1, tokenRenovado, 'c'.repeat(64))
    : new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  assert.deepEqual(await api.request('/recurso'), { ok: true });
  assert.equal(autorizacionDe('http://api.test/api/recurso'), `Bearer ${tokenRenovado}`);
});
