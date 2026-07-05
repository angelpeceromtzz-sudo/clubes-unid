import { useRef, useState, useMemo } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTheme } from '../../contexts/ThemeContext';
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';

function ModalNotificacion({ notif, onClose, tema, modoOscuro, onEliminar }) {
  if (!notif) return null;
  return (
    <ModalBase show={!!notif} onClose={onClose} maxWidth="max-w-lg">
      <button
        onClick={onClose}
        className={`absolute top-3 left-3 z-10 transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
      >
        <Icono nombre="close" strokeWidth={2} className="h-5 w-5" />
      </button>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
            notif.emisor_rol === 'admin' ? 'bg-purple-500/20' : 'bg-amber-500/20'
          }`}>
            <Icono nombre="bell" className={`h-5 w-5 ${notif.emisor_rol === 'admin' ? 'text-purple-400' : 'text-amber-400'}`} strokeWidth={2} />
          </span>
          <div>
            <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
              {notif.titulo}
            </h3>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              notif.emisor_rol === 'admin' ? 'text-purple-400' : 'text-amber-400'
            }`}>
              {notif.emisor_rol === 'admin' ? 'Aviso Institucional' : notif.club_nombre || 'Club'}
            </span>
          </div>
        </div>
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
        {notif.mensaje}
      </p>
      <div className={`flex items-center justify-between mt-6 pt-4 ${modoOscuro ? 'border-t border-slate-700/50' : 'border-t border-slate-200'}`}>
        <span className={`text-xs ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          {new Date(notif.fecha_creacion).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
        <button
          onClick={() => { onEliminar(notif.id_notificacion); onClose(); }}
          className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Icono nombre="trash" strokeWidth={2} className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </ModalBase>
  );
}

export function BadgeNotificaciones({ className = '' }) {
  const { modoOscuro, tema } = useTheme();
  const { notificaciones, noLeidas, marcarComoLeida, marcarTodasLeidas, eliminarNotificacion } = useNotificaciones();
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [notifModal, setNotifModal] = useState(null);
  const notificacionesRef = useRef(null);

  useClickOutside(notificacionesRef, mostrarNotificaciones, () => setMostrarNotificaciones(false), '[aria-label="Notificaciones"]');

  const ordenadas = useMemo(() => {
    const noLeidasList = [];
    const leidasList = [];
    for (const n of notificaciones) {
      if (n.leido) {
        leidasList.push(n);
      } else {
        noLeidasList.push(n);
      }
    }
    return [...noLeidasList, ...leidasList];
  }, [notificaciones]);

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
          className={`absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl shadow-2xl transition-colors duration-300 ${tema.dropdownBorder}`}
          style={{ animation: 'dropdownIn 0.2s ease-out' }}
        >
          <div className={`rounded-xl overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'} ${tema.dropdownBorder}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${modoOscuro ? 'border-b border-slate-700/50' : 'border-b border-slate-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Notificaciones {noLeidas > 0 && `(${noLeidas} sin leer)`}
              </p>
              {noLeidas > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); marcarTodasLeidas(); }}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Leer todas
                </button>
              )}
            </div>
            <div
              className="overflow-y-auto"
              style={{
                maxHeight: 'min(60vh, 480px)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {ordenadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <Icono nombre="bell" className={`h-8 w-8 mb-2 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} strokeWidth={1.5} />
                  <p className={`text-sm text-center ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                    No hay notificaciones
                  </p>
                </div>
              ) : (
                ordenadas.map((notif) => (
                  <div
                    key={notif.id_notificacion}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!notif.leido) marcarComoLeida(notif.id_notificacion);
                      setNotifModal(notif);
                      setMostrarNotificaciones(false);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); marcarComoLeida(notif.id_notificacion); setNotifModal(notif); setMostrarNotificaciones(false); } }}
                    className={`group relative w-full text-left px-4 py-3 transition-colors duration-200 flex flex-col gap-1.5 cursor-pointer ${
                      notif.leido
                        ? modoOscuro ? 'opacity-50' : 'opacity-50'
                        : modoOscuro ? 'bg-slate-800/40' : 'bg-amber-50/50'
                    } ${modoOscuro ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-semibold leading-tight ${notif.leido ? (modoOscuro ? 'text-slate-500' : 'text-slate-400') : (modoOscuro ? 'text-slate-100' : 'text-slate-800')}`}>
                        {notif.titulo}
                      </span>
                      {!notif.leido && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${modoOscuro ? (notif.leido ? 'text-slate-600' : 'text-slate-400') : (notif.leido ? 'text-slate-400' : 'text-slate-500')}`}>
                      {notif.mensaje}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                          notif.emisor_rol === 'admin' ? 'text-purple-400' : 'text-amber-400'
                        }`}>
                          {notif.emisor_rol === 'admin' ? '📢 Aviso' : `🏀 ${notif.club_nombre || 'Club'}`}
                        </span>
                        <span className={`text-[10px] ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                          {new Date(notif.fecha_creacion).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarNotificacion(notif.id_notificacion); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Eliminar notificación"
                      >
                        <Icono nombre="trash" strokeWidth={2} className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ModalNotificacion
        notif={notifModal}
        onClose={() => setNotifModal(null)}
        tema={tema}
        modoOscuro={modoOscuro}
        onEliminar={eliminarNotificacion}
      />
    </div>
  );
}
