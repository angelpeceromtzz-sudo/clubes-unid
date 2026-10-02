export const EVENTOS_CONFIG = {
  convocatoria_abierta: { label: 'Convocatoria Abierta', badge: 'bg-emerald-500/15 text-emerald-400', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  convocatoria_cerrada: { label: 'Convocatoria Cerrada', badge: 'bg-red-500/15 text-red-400', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
  anuncio_club: { label: 'Anuncio de Club', badge: 'bg-blue-500/15 text-blue-400', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  evento_creado: { label: 'Evento Actualizado', badge: 'bg-amber-500/15 text-amber-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ofertas_enviadas: { label: 'Ofertas Enviadas', badge: 'bg-purple-500/15 text-purple-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  convocatoria_generada: { label: 'Convocatoria Generada', badge: 'bg-cyan-500/15 text-cyan-400', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
};

export const DEFAULT_EVENTO = { label: 'Evento', badge: 'bg-slate-500/15 text-slate-400', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };

export function formatFecha(fecha) {
  return new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
