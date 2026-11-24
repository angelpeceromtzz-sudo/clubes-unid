import { leerSegundosReintento } from '../utils/reintentosHttp';
import { jwtRequiereRenovacion, jwtVencePronto } from '../utils/jwt';

// La URL por defecto es el backend de Render; VITE_API_URL permite apuntar a
// otro entorno (p. ej. http://localhost:4000/api en desarrollo local) sin
// cambiar código. Sin la variable, el comportamiento desplegado no cambia.
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const ID_DISPOSITIVO_KEY = 'unid_device_id';
const DISPOSITIVO_CONFIABLE_KEY = 'unid_trusted_account';
const EPOCA_SESION_KEY = 'unid_session_epoch';
const PREFIJO_BLOQUEO_RENOVACION = 'unid:trusted-account:renovar:';
const FORMATO_TOKEN_DISPOSITIVO = /^[a-f0-9]{64}$/i;
let renovacionPendiente = null;
let contadorEpoca = 0;

export function obtenerIdDispositivo() {
  try {
    let id = localStorage.getItem(ID_DISPOSITIVO_KEY);
    if (id && /^[a-f0-9]{64}$/i.test(id)) return id.toLowerCase();
    if (!globalThis.crypto?.getRandomValues) return null;
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(ID_DISPOSITIVO_KEY, id);
    return id;
  } catch {
    return null;
  }
}

export function obtenerCuentaConfiable() {
  try {
    const guardada = JSON.parse(localStorage.getItem(DISPOSITIVO_CONFIABLE_KEY) || 'null');
    if (
      !guardada?.token
      || !FORMATO_TOKEN_DISPOSITIVO.test(guardada.token)
      || !guardada?.id_usuario
      || !FORMATO_TOKEN_DISPOSITIVO.test(guardada.dispositivo_id || '')
    ) return null;

    return { ...guardada, token: guardada.token.toLowerCase() };
  } catch {
    return null;
  }
}

export function guardarCuentaConfiable(datos, usuario) {
  const dispositivoId = obtenerIdDispositivo();
  if (
    !dispositivoId
    || !FORMATO_TOKEN_DISPOSITIVO.test(datos?.token || '')
    || !usuario?.id_usuario
  ) return false;

  try {
    localStorage.setItem(DISPOSITIVO_CONFIABLE_KEY, JSON.stringify({
      dispositivo_id: dispositivoId,
      id_usuario: usuario.id_usuario,
      token: datos.token.toLowerCase(),
      expira_en: datos.expira_en,
    }));
    return true;
  } catch {
    return false;
  }
}

export function limpiarCuentaConfiable() {
  try {
    localStorage.removeItem(DISPOSITIVO_CONFIABLE_KEY);
  } catch {
    // El inicio de sesión normal sigue disponible si el navegador bloquea el almacenamiento.
  }
}

export async function revocarCuentaConfiableEnServidor() {
  const cuenta = obtenerCuentaConfiable();
  if (!cuenta) return;
  await fetch(`${API_BASE}/auth/otp/dispositivo/revocar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Device': cuenta.dispositivo_id,
      'X-Trusted-Device': cuenta.token,
    },
    keepalive: true,
  });
}

function generarEpocaSesion() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  contadorEpoca += 1;
  return `${Date.now().toString(36)}-${contadorEpoca.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function invalidarEpocaSesion() {
  const epoca = generarEpocaSesion();
  try {
    localStorage.setItem(EPOCA_SESION_KEY, epoca);
  } catch {
    // Si el almacenamiento no está disponible, tampoco se puede persistir una
    // sesión confiable; las rutas de login normal seguirán su propio manejo.
  }
  return epoca;
}

function leerEpocaSesion() {
  try {
    return localStorage.getItem(EPOCA_SESION_KEY);
  } catch {
    return null;
  }
}

export function capturarEpocaSesion() {
  return leerEpocaSesion();
}

export function conservaEpocaSesion(epoca) {
  return leerEpocaSesion() === epoca;
}

function exigirMismaEpoca(epoca) {
  if (leerEpocaSesion() === epoca) return;

  const error = new Error('La sesión cambió mientras se renovaba.');
  error.status = 409;
  throw error;
}

function mismaCuentaConfiable(actual, esperada) {
  return Boolean(
    actual
    && esperada
    && actual.dispositivo_id === esperada.dispositivo_id
    && Number(actual.id_usuario) === Number(esperada.id_usuario),
  );
}

function errorRenovacion(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

async function solicitarRenovacion(cuenta) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}/auth/otp/dispositivo/renovar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Device': cuenta.dispositivo_id,
        'X-Trusted-Device': cuenta.token,
      },
    });
  } catch {
    throw errorRenovacion('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.', 0);
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw errorRenovacion(datos?.error || 'No se pudo recuperar esta cuenta.', respuesta.status);
  }

  if (
    typeof datos?.token !== 'string'
    || !datos.token
    || !datos?.user
    || typeof datos?.dispositivo_confiable?.token !== 'string'
    || !FORMATO_TOKEN_DISPOSITIVO.test(datos.dispositivo_confiable.token)
  ) {
    throw errorRenovacion('El servidor no devolvió una renovación válida.', 502);
  }

  if (Number(datos.user.id_usuario) !== Number(cuenta.id_usuario)) {
    throw errorRenovacion('La cuenta recordada ya no coincide con este navegador.', 401);
  }

  return datos;
}

async function renovarDentroDeBloque(epoca, cuentaInicial) {
  exigirMismaEpoca(epoca);

  let cuenta = obtenerCuentaConfiable();
  if (!mismaCuentaConfiable(cuenta, cuentaInicial)) {
    throw errorRenovacion('La cuenta recordada cambió antes de la renovación.', 409);
  }

  for (let intento = 0; intento < 2; intento += 1) {
    exigirMismaEpoca(epoca);
    const tokenUtilizado = cuenta.token;
    let datos;

    try {
      datos = await solicitarRenovacion(cuenta);
    } catch (err) {
      if (Number(err?.status) !== 401 && Number(err?.status) !== 403) throw err;

      // Otra pestaña pudo rotar el token y dejar esta respuesta como 401. Sólo
      // se borra si la cuenta sigue siendo exactamente la que usamos; si cambió
      // se reintenta una vez con el token más reciente.
      exigirMismaEpoca(epoca);
      const cuentaActual = obtenerCuentaConfiable();
      if (!mismaCuentaConfiable(cuentaActual, cuentaInicial)) throw err;

      if (cuentaActual.token !== tokenUtilizado && intento === 0) {
        cuenta = cuentaActual;
        continue;
      }

      if (cuentaActual.token === tokenUtilizado) limpiarCuentaConfiable();
      throw err;
    }

    exigirMismaEpoca(epoca);

    // Verificación inmediatamente anterior a escribir. Si una tercera pestaña
    // ya dejó un token distinto del utilizado y del recibido, su renovación es
    // más reciente: no sobrescribimos ni token confiable ni sesión.
    const cuentaActual = obtenerCuentaConfiable();
    if (!mismaCuentaConfiable(cuentaActual, cuentaInicial)) {
      throw errorRenovacion('La cuenta recordada cambió durante la renovación.', 409);
    }

    const tokenRecibido = datos.dispositivo_confiable.token;
    if (cuentaActual.token !== tokenUtilizado && cuentaActual.token !== tokenRecibido) {
      const sesionActual = getSession();
      exigirMismaEpoca(epoca);
      const idSesionActual = sesionActual?.user?.id_usuario ?? sesionActual?.user?.id;
      if (
        !sesionActual?.token
        || !sesionActual?.user
        || Number(idSesionActual) !== Number(cuentaInicial.id_usuario)
      ) {
        throw errorRenovacion('No hay una sesión vigente de la cuenta renovada.', 409);
      }

      // Otra pestaña completó una renovación más reciente. Devolvemos su estado
      // actual, nunca el token/usuario recibido por esta respuesta más antigua.
      return {
        token: sesionActual.token,
        user: sesionActual.user,
        dispositivo_confiable: {
          token: cuentaActual.token,
          expira_en: cuentaActual.expira_en,
        },
        sesionRenovada: true,
        sesionNoPersistida: true,
      };
    }

    exigirMismaEpoca(epoca);
    persistirSesion({ token: datos.token, user: datos.user });
    guardarCuentaConfiable(datos.dispositivo_confiable, datos.user);
    window.dispatchEvent(new CustomEvent('clubsunid:session-refreshed', { detail: datos.user }));
    return { ...datos, sesionRenovada: true };
  }

  throw errorRenovacion('No se pudo completar la renovación de la sesión.', 409);
}

function ejecutarConBloqueRenovacion(dispositivoId, callback) {
  const locks = globalThis.navigator?.locks;
  if (typeof locks?.request === 'function') {
    return locks.request(`${PREFIJO_BLOQUEO_RENOVACION}${dispositivoId}`, { mode: 'exclusive' }, callback);
  }
  return callback();
}

export function renovarSesionConfiable() {
  if (renovacionPendiente) return renovacionPendiente;

  const cuentaInicial = obtenerCuentaConfiable();
  if (!cuentaInicial) {
    return Promise.reject(new Error('No hay una cuenta recordada en este navegador.'));
  }

  const epoca = leerEpocaSesion();
  renovacionPendiente = ejecutarConBloqueRenovacion(
    cuentaInicial.dispositivo_id,
    () => renovarDentroDeBloque(epoca, cuentaInicial),
  ).finally(() => {
    renovacionPendiente = null;
  });

  return renovacionPendiente;
}

async function tokenParaSolicitud() {
  const sesion = getSession();
  if (!sesion?.token) return null;

  // Un JWT confiable antiguo puede seguir vigente, pero el servidor ya lo
  // rechaza por no tener generación: se renueva desde el arranque, no al expirar.
  if (!jwtRequiereRenovacion(sesion.token) && !jwtVencePronto(sesion.token)) return sesion.token;

  const cuenta = obtenerCuentaConfiable();
  const idUsuario = sesion.user?.id_usuario ?? sesion.user?.id;
  if (!cuenta || Number(cuenta.id_usuario) !== Number(idUsuario)) return sesion.token;

  try {
    await renovarSesionConfiable();
    // Si otra pestaña ganó la carrera, usamos su sesión vigente. Si hubo logout
    // o login nuevo, getSession refleja ese estado en vez del token capturado.
    return getSession()?.token || null;
  } catch {
    return getSession()?.token || null;
  }
}

export function getToken() {
  try {
    const raw = localStorage.getItem('unid_session');
    if (raw) {
      const session = JSON.parse(raw);
      return session.token || null;
    }
    return null;
  } catch {
    return null;
  }
}

function persistirSesion(data) {
  localStorage.setItem('unid_session', JSON.stringify(data));
}

// Un login crea una época nueva. Toda renovación que capturó la anterior queda
// invalidada, incluso si su respuesta llega después desde otra pestaña.
export function setSession(data) {
  invalidarEpocaSesion();
  persistirSesion(data);
}

export function iniciarSesionAlmacenada(data) {
  setSession(data);
}

export function clearSession() {
  invalidarEpocaSesion();
  localStorage.removeItem('unid_session');
}

export function getSession() {
  try {
    const raw = localStorage.getItem('unid_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cuerpoErrorControlado(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const cuerpo = {};

  if (typeof data.error === 'string') {
    cuerpo.error = data.error;
  }

  if (data.requiere_nombre === true) {
    cuerpo.requiere_nombre = true;
  }

  return Object.keys(cuerpo).length > 0 ? cuerpo : null;
}

export async function request(endpoint, options = {}) {
  const token = await tokenParaSolicitud();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    // H19: un fallo de red (sin conexión, DNS) llega como texto crudo en
    // inglés ('Failed to fetch'); aquí se traduce a un mensaje propio y se
    // marca status 0 para que el consumidor pueda distinguirlo.
    console.error('[API] Sin conexión en %s:', endpoint, err);
    const error = new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
    error.status = 0;
    throw error;
  }

  let data;
  const contentType = res.headers.get('content-type') || '';
  const reintentarEnSegundos = leerSegundosReintento(res);

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    console.error('[API] Respuesta no-JSON desde %s:', endpoint, text.slice(0, 500));
    // H19: el texto técnico no se pinta en la UI; el detalle queda en la consola.
    const error = new Error('El servidor no respondió correctamente. Intenta de nuevo en unos momentos.');
    error.status = res.status;
    error.mensajeServidor = `status ${res.status} con contenido no-JSON`;
    error.reintentarEnSegundos = reintentarEnSegundos;
    throw error;
  }

  if (!res.ok) {
    const servidor = typeof data?.error === 'string' && data.error ? data.error : null;
    // H19: los fallos sistémicos llevan mensaje propio (el 500 del backend y
    // el 404 global no son texto pensado para pintarse); el resto de 4xx son
    // mensajes de contrato de la API —validación, credenciales, permisos— ya
    // redactados en español para la persona usuaria, y se conservan tal cual.
    let mensaje = servidor;
    if (res.status >= 500) {
      mensaje = 'El servidor tuvo un problema. Intenta de nuevo en unos momentos.';
    } else if (res.status === 404 && servidor?.startsWith('Ruta no encontrada')) {
      mensaje = 'La operación solicitada no está disponible.';
    } else if (!mensaje) {
      mensaje = `Error ${res.status} en la solicitud`;
    }
    const error = new Error(mensaje);
    error.status = res.status;
    error.mensajeServidor = servidor;
    error.cuerpo = cuerpoErrorControlado(data);
    error.reintentarEnSegundos = reintentarEnSegundos;
    throw error;
  }

  return data;
}
