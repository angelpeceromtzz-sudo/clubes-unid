export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

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

export async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    console.error(`[API] Respuesta no-JSON desde ${endpoint}:`, text.slice(0, 500));
    throw new Error(`El servidor respondió con HTML/text (status ${res.status}). Revisa la consola.`);
  }

  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status} en la solicitud`);
    // Se adjunta el status para poder distinguir casos sin parsear el mensaje.
    // El mensaje de la encuesta usa 410 (cerrada) contra 404 (no existe) y 403
    // (aún no disponible), y los tres muestran pantallas distintas.
    error.status = res.status;
    throw error;
  }

  return data;
}
