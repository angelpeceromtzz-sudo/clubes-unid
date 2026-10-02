import { useRef, useState, useMemo } from 'react';
import { useNotificaciones } from '../../contexts/NotificationContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { ModalNotificacion } from './navegacion/ModalNotificacion';
import { ElementoNotificacion } from './navegacion/ElementoNotificacion';

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
      if (n.leido) leidasList.push(n);
      else noLeidasList.push(n);
    }
    return [...noLeidasList, ...leidasList];
  }, [notificaciones]);

  function handleLeer(notif) {
    if (!notif.leido) marcarComoLeida(notif.id_notificacion);
    setNotifModal(notif);
    setMostrarNotificaciones(false);
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setMostrarNotificaciones((prev) => !prev)}
        className={`relative p-2 rounded-full cursor-pointer ${modoOscuro ? 'md:bg-[#0b111e]/60 md:backdrop-blur-md md:hover:bg-[#0b111e]/70' : ''} ${tema.iconColor} hover:text-amber-400 transition-colors`}
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
                  <ElementoNotificacion
                    key={notif.id_notificacion}
                    notif={notif}
                    modoOscuro={modoOscuro}
                    onLeer={handleLeer}
                    onEliminar={eliminarNotificacion}
                  />
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
