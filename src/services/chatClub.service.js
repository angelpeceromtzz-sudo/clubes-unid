import { request } from './api-core';

export const chatClubService = {
  obtenerChatClub: (idClub, antes = null) => request(`/chat-clubes/clubes/${idClub}/chat${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`),
  actualizarPresenciaChat: (idClub, escribiendo = false, activo = true) => request(`/chat-clubes/clubes/${idClub}/presencia`, {
    method: 'PUT', body: JSON.stringify({ escribiendo, activo }),
  }),
  marcarChatClubLeido: (idClub) => request(`/chat-clubes/clubes/${idClub}/leer`, { method: 'POST' }),
  enviarMensajeChat: (idClub, contenido, menciones) => request(`/chat-clubes/clubes/${idClub}/mensajes`, {
    method: 'POST', body: JSON.stringify({ contenido, menciones }),
  }),
  editarMensajeChat: (idClub, idMensaje, contenido, menciones) => request(`/chat-clubes/clubes/${idClub}/mensajes/${idMensaje}`, {
    method: 'PUT', body: JSON.stringify({ contenido, menciones }),
  }),
  eliminarMensajeChat: (idClub, idMensaje) => request(`/chat-clubes/clubes/${idClub}/mensajes/${idMensaje}`, { method: 'DELETE' }),
  fijarMensajeChat: (idClub, idMensaje, fijado) => request(`/chat-clubes/clubes/${idClub}/mensajes/${idMensaje}/fijado`, {
    method: 'PUT', body: JSON.stringify({ fijado }),
  }),
  silenciarMiembroChat: (idClub, idUsuario, silenciado, duracionMinutos = null) => request(`/chat-clubes/clubes/${idClub}/miembros/${idUsuario}/silencio`, {
    method: 'PUT', body: JSON.stringify({ silenciado, duracion_minutos: duracionMinutos }),
  }),
};
