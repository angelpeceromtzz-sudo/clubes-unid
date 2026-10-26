import { leerSegundosReintento } from '../utils/reintentosHttp';

// La URL por defecto es el backend de Render; VITE_API_URL permite apuntar a
// otro entorno (p. ej. http://localhost:4000/api en desarrollo local) sin
// cambiar código. Sin la variable, el comportamiento desplegado no cambia.
export const API_BASE = (import.meta.env.VITE_API_URL || 'https://clubsunid-develop.onrender.com/api').replace(/\/+$/, '');

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
  const token = getToken();
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
    console.error(`[API] Sin conexión en ${endpoint}:`, err);
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
    console.error(`[API] Respuesta no-JSON desde ${endpoint}:`, text.slice(0, 500));
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
