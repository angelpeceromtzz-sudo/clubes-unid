import { leerSegundosReintento } from '../utils/reintentosHttp';

// La URL por defecto es el backend de Render; VITE_API_URL permite apuntar a
// otro entorno (p. ej. http://localhost:4000/api en desarrollo local) sin
// cambiar código. Sin la variable, el comportamiento desplegado no cambia.
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const ID_DISPOSITIVO_KEY = 'unid_device_id';
const DISPOSITIVO_CONFIABLE_KEY = 'unid_trusted_account';
let renovacionPendiente = null;

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
    if (!guardada?.token || !guardada?.id_usuario || !/^[a-f0-9]{64}$/i.test(guardada.dispositivo_id || '')) return null;
    return guardada;
  } catch {
    return null;
  }
}

export function guardarCuentaConfiable(datos, usuario) {
  const dispositivoId = obtenerIdDispositivo();
  if (!dispositivoId || !datos?.token || !usuario?.id_usuario) return false;
  try {
    localStorage.setItem(DISPOSITIVO_CONFIABLE_KEY, JSON.stringify({
      dispositivo_id: dispositivoId,
      id_usuario: usuario.id_usuario,
      token: datos.token,
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
  });
}

function jwtVencePronto(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || payload.exp * 1000 <= Date.now() + 3 * 60 * 1000;
  } catch {
    return true;
  }
}

export function renovarSesionConfiable() {
  if (renovacionPendiente) return renovacionPendiente;
  const cuenta = obtenerCuentaConfiable();
  if (!cuenta) return Promise.reject(new Error('No hay una cuenta recordada en este navegador.'));

  renovacionPendiente = (async () => {
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
      const error = new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
      error.status = 0;
      throw error;
    }

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) limpiarCuentaConfiable();
      const error = new Error(datos?.error || 'No se pudo recuperar esta cuenta.');
      error.status = respuesta.status;
      throw error;
    }

    if (Number(datos?.user?.id_usuario) !== Number(cuenta.id_usuario)) {
      limpiarCuentaConfiable();
      const error = new Error('La cuenta recordada ya no coincide con este navegador.');
      error.status = 401;
      throw error;
    }

    setSession({ token: datos.token, user: datos.user });
    guardarCuentaConfiable(datos.dispositivo_confiable, datos.user);
    window.dispatchEvent(new CustomEvent('clubsunid:session-refreshed', { detail: datos.user }));
    return datos;
  })().finally(() => {
    renovacionPendiente = null;
  });

  return renovacionPendiente;
}

async function tokenParaSolicitud() {
  const sesion = getSession();
  if (!sesion?.token || !jwtVencePronto(sesion.token)) return sesion?.token || null;

  const cuenta = obtenerCuentaConfiable();
  const idUsuario = sesion.user?.id_usuario ?? sesion.user?.id;
  if (!cuenta || Number(cuenta.id_usuario) !== Number(idUsuario)) return sesion.token;

  try {
    const renovada = await renovarSesionConfiable();
    return renovada.token;
  } catch {
    return sesion.token;
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

export function setSession(data) {
  localStorage.setItem('unid_session', JSON.stringify(data));
}

export function clearSession() {
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
