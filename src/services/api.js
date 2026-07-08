
// Servicio de API — abstrae las llamadas HTTP al backend
const API_BASE = 'https://clubes-unid.onrender.com/api';

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
    throw new Error(data.error || `Error ${res.status} en la solicitud`);
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),

  login: (correo, contrasena) =>
    request('/auth/login-local', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    }),

  loginMicrosoft: (accessToken) =>
    request('/auth/login-microsoft', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  getClubes: () => request('/clubes'),

  getClub: (id) => request(`/clubes/${id}`),

  updateClubEstatus: (id, id_estatus_club) =>
    request(`/clubes/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ id_estatus_club }),
    }),

  createClub: (data) =>
    request('/clubes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClub: (id, data) =>
    request(`/clubes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  asignarClubAPresidente: (userId, clubId) =>
    request(`/usuarios/${userId}/asignar-club`, {
      method: 'PUT',
      body: JSON.stringify({ id_club: clubId }),
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

  getMisFormularios: () => request('/formularios'),

  getSolicitudesPendientes: (clubId) => request(`/formularios/pendientes/${clubId}`),

  getAllSolicitudes: (clubId) => request(`/formularios/todos/${clubId}`),

  actualizarEstatusSolicitud: (id, status) =>
    request(`/formularios/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getMe: () => request('/auth/me'),

  createFormulario: (data) =>
    request('/formularios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getNotificaciones: () => request('/notificaciones'),

  createNotificacion: (titulo, mensaje, audiencia, id_club, id_destinatario) =>
    request('/notificaciones', {
      method: 'POST',
      body: JSON.stringify({ titulo, mensaje, audiencia, id_club, id_destinatario }),
    }),

  marcarNotificacionLeida: (id) =>
    request(`/notificaciones/${id}/leer`, { method: 'POST' }),

  getHistorial: () => request('/historial'),

  getMisPostulaciones: () => request('/formularios/mis-postulaciones'),

  getConvocatorias: (clubId) => request(`/convocatorias/${clubId}`),

  getVistaPrevia: (clubId) => request(`/convocatorias/preview/${clubId}`),

  generarConvocatorias: (id_club) =>
    request('/convocatorias/generar', {
      method: 'POST',
      body: JSON.stringify({ id_club }),
    }),

  actualizarConvocatoria: (id, data) =>
    request(`/convocatorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  enviarConvocatoria: (id) =>
    request(`/convocatorias/${id}/enviar`, {
      method: 'POST',
    }),

  createConvocatoria: (data) =>
    request('/convocatorias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteConvocatoria: (id) =>
    request(`/convocatorias/${id}`, { method: 'DELETE' }),

  asignarBloque: (formularioId, bloque) =>
    request(`/formularios/${formularioId}/bloque`, {
      method: 'PUT',
      body: JSON.stringify({ bloque }),
    }),

  seleccionarOfertas: (id_club, aceptados) =>
    request('/formularios/seleccionar', {
      method: 'POST',
      body: JSON.stringify({ id_club, aceptados }),
    }),

  enviarOfertas: (id_club, aprobados) =>
    request('/convocatorias/ofertas', {
      method: 'POST',
      body: JSON.stringify({ id_club, aprobados }),
    }),

  responderOferta: (id_formulario, decision) =>
    request(`/ofertas/${id_formulario}/respuesta`, {
      method: 'PUT',
      body: JSON.stringify({ decision }),
    }),

  uploadImagen: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('imagen', file);
    const res = await fetch(`${API_BASE}/upload/imagen`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al subir imagen' }));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  },

  marcarTodasNotificacionesLeidas: () =>
    request('/notificaciones/leer-todas', { method: 'POST' }),

  eliminarNotificacion: (id) =>
    request(`/notificaciones/${id}`, { method: 'DELETE' }),

  createUser: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteUser: (id) =>
    request(`/usuarios/${id}`, { method: 'DELETE' }),

  adminAction: (targetUserId, action, password) =>
    request('/usuarios/admin-action', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, action, password }),
    }),

  getConvocatoriaClub: (clubId) => request(`/clubes/${clubId}/convocatoria`),

  actualizarConfiguracionConvocatoria: (clubId, data) =>
    request(`/clubes/${clubId}/convocatoria`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getHistorialOfertas: (clubId) => request(`/formularios/ofertas/${clubId}`),
};

// ✦ A
