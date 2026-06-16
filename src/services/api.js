// Servicio de API — abstrae las llamadas HTTP al backend
const API_BASE = '/api';

// Recupera el token JWT desde localStorage
function getToken() {
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

// Guarda la sesión (token + usuario) en localStorage
export function setSession(data) {
  localStorage.setItem('unid_session', JSON.stringify(data));
}

// Elimina la sesión del almacenamiento local
export function clearSession() {
  localStorage.removeItem('unid_session');
}

// Obtiene los datos de sesión almacenados
export function getSession() {
  try {
    const raw = localStorage.getItem('unid_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Petición HTTP genérica con autenticación incluida
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data;
}

// Métodos de API organizados por recurso
export const api = {
  login: (correo, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    }),

  getClubes: () => request('/clubes'),

  getClub: (id) => request(`/clubes/${id}`),

  updateClubEstatus: (id, id_estatus_club) =>
    request(`/clubes/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ id_estatus_club }),
    }),

  getUsuarios: () => request('/usuarios'),

  updateUserRol: (id, id_rol) =>
    request(`/usuarios/${id}/rol`, {
      method: 'PUT',
      body: JSON.stringify({ id_rol }),
    }),

  getInscripcionActiva: () => request('/inscripciones/activa'),

  createInscripcion: (id_club) =>
    request('/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ id_club }),
    }),

  getAvisos: (clubId) => request(`/avisos/${clubId}`),

  createAviso: (id_club, titulo, contenido) =>
    request('/avisos', {
      method: 'POST',
      body: JSON.stringify({ id_club, titulo, contenido }),
    }),

  deleteAviso: (id) =>
    request(`/avisos/${id}`, { method: 'DELETE' }),

  getMiembros: (clubId) => request(`/clubes/${clubId}/miembros`),

  removeFromClub: (userId) =>
    request(`/inscripciones/${userId}`, { method: 'DELETE' }),
};

// ✦ A
