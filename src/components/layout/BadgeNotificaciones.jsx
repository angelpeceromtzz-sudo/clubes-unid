import { useRef, useState } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function BadgeNotificaciones({ className = '' }) {
  const { modoOscuro, tema } = useTheme();
  const { notificaciones, noLeidas, marcarComoLeida } = useNotificaciones();
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const notificacionesRef = useRef(null);

  useClickOutside(notificacionesRef, mostrarNotificaciones, () => setMostrarNotificaciones(false), '[aria-label="Notificaciones"]');

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setMostrarNotificaciones((prev) => !prev)}
        className={`relative ${tema.iconColor} hover:text-amber-400 transition-colors`}
        aria-label="Notificaciones"
      >
        <Icono nombre="bell" className="h-6 w-6 md:h-5 md:w-5" strokeWidth={2} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {noLeidas}
          </span>
        )}
      </button>

      {mostrarNotificaciones && (
        <div
          ref={notificacionesRef}
          className={`absolute right-0 top-12 z-50 w-80 rounded-xl shadow-2xl py-3 px-2 max-h-[70vh] overflow-y-auto transition-colors duration-300 ${tema.dropdownBorder}`}
          style={{ animation: 'dropdownIn 0.2s ease-out' }}
        >
          <div className={`rounded-xl ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'} ${tema.dropdownBorder}`}>
            <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              Notificaciones {noLeidas > 0 && `(${noLeidas} sin leer)`}
            </p>
            <div className={`h-px ${tema.headerBorder} mx-3`} />
            {notificaciones.length === 0 ? (
              <p className={`px-4 py-6 text-sm text-center ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                No hay notificaciones
              </p>
            ) : (
              notificaciones.map((notif) => (
                <button
                  key={notif.id_notificacion}
                  onClick={() => {
                    if (!notif.leido) marcarComoLeida(notif.id_notificacion);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors duration-200 rounded-lg flex flex-col gap-1.5 ${
                    modoOscuro ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                  } ${notif.leido ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold leading-tight ${notif.leido ? 'text-slate-500' : modoOscuro ? 'text-slate-100' : 'text-slate-800'}`}>
                      {notif.titulo}
                    </span>
                    {!notif.leido && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed line-clamp-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                    {notif.mensaje}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                      notif.emisor_rol === 'admin' ? 'text-purple-400' : 'text-amber-400'
                    }`}>
                      {notif.emisor_rol === 'admin' ? '📢 Aviso Institucional' : `🏀 ${notif.club_nombre || 'Club'}`}
                    </span>
                    <span className={`text-[10px] ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                      {new Date(notif.fecha_creacion).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
