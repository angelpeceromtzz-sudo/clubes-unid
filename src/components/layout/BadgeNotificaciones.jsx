import { useRef, useState, useMemo, useCallback } from 'react';
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
  const { notificaciones, noLeidas, marcarComoLeida, marcarTodasLeidas, eliminarNotificacion, eliminarVariasNotificaciones } = useNotificaciones();
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [notifModal, setNotifModal] = useState(null);
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const notificacionesRef = useRef(null);
  const timeoutExito = useRef(null);

  useClickOutside(notificacionesRef, mostrarNotificaciones, () => { setMostrarNotificaciones(false); setSeleccionando(false); setSeleccionados([]); }, '[aria-label="Notificaciones"]');

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

  const mostrarExito = useCallback((msg) => {
    setMensajeExito(msg);
    if (timeoutExito.current) clearTimeout(timeoutExito.current);
    timeoutExito.current = setTimeout(() => setMensajeExito(''), 3000);
  }, []);

  function toggleSeleccion(id) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSeleccionarTodo() {
    if (seleccionados.length === ordenadas.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(ordenadas.map((n) => n.id_notificacion));
    }
  }

  function entrarSeleccion() {
    setSeleccionando(true);
    setSeleccionados([]);
  }

  function salirSeleccion() {
    setSeleccionando(false);
    setSeleccionados([]);
  }

  async function confirmarEliminarSeleccion() {
    setEliminando(true);
    try {
      const total = await eliminarVariasNotificaciones(seleccionados);
      mostrarExito(`${total} notificación${total !== 1 ? 'es' : ''} eliminada${total !== 1 ? 's' : ''} correctamente`);
    } catch {
      // silent
    }
    setEliminando(false);
    setConfirmarEliminar(false);
    setSeleccionados([]);
    setSeleccionando(false);
  }

  async function eliminarUna(id) {
    await eliminarNotificacion(id);
    mostrarExito('Notificación eliminada correctamente');
  }

  const todosSeleccionados = seleccionados.length === ordenadas.length && ordenadas.length > 0;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setMostrarNotificaciones((prev) => { if (prev) { setSeleccionando(false); setSeleccionados([]); setMensajeExito(''); } return !prev; })}
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

            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${modoOscuro ? 'border-b border-slate-700/50' : 'border-b border-slate-200'}`}>
              {seleccionando ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSeleccionarTodo}
                    className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                      todosSeleccionados
                        ? 'bg-amber-400 border-amber-400'
                        : modoOscuro ? 'border-slate-600' : 'border-slate-400'
                    }`}
                  >
                    {todosSeleccionados && (
                      <Icono nombre="check" className="h-3 w-3 text-[#0e162c]" strokeWidth={3} />
                    )}
                  </button>
                  <span className={`text-xs font-semibold ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                    {seleccionados.length} seleccionada{seleccionados.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <p className={`text-xs font-semibold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Notificaciones {noLeidas > 0 && `(${noLeidas} sin leer)`}
                </p>
              )}
              <div className="flex items-center gap-2">
                {!seleccionando && ordenadas.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); entrarSeleccion(); }}
                    className="text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Seleccionar
                  </button>
                )}
                {seleccionando ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); salirSeleccion(); }}
                    className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                ) : noLeidas > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); marcarTodasLeidas(); }}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Leer todas
                  </button>
                )}
              </div>
            </div>

            {/* Success message */}
            {mensajeExito && (
              <div className={`px-4 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border-b ${modoOscuro ? 'border-emerald-500/20' : 'border-emerald-500/20'}`}>
                {mensajeExito}
              </div>
            )}

            {/* Select all / Bulk actions bar */}
            {seleccionando && seleccionados.length > 0 && (
              <div className={`px-4 py-2 flex items-center justify-between border-b ${modoOscuro ? 'border-slate-700/50 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  onClick={toggleSeleccionarTodo}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1"
                >
                  <Icono nombre="trash" strokeWidth={2} className="h-3 w-3" />
                  Borrar seleccionados
                </button>
              </div>
            )}

            {/* List */}
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
                      if (seleccionando) {
                        toggleSeleccion(notif.id_notificacion);
                      } else {
                        if (!notif.leido) marcarComoLeida(notif.id_notificacion);
                        setNotifModal(notif);
                        setMostrarNotificaciones(false);
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!seleccionando) { marcarComoLeida(notif.id_notificacion); setNotifModal(notif); setMostrarNotificaciones(false); } } }}
                    className={`group relative w-full text-left px-4 py-3 transition-colors duration-200 flex flex-col gap-1.5 cursor-pointer ${
                      seleccionando && seleccionados.includes(notif.id_notificacion)
                        ? modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100/70'
                        : notif.leido
                          ? modoOscuro ? 'opacity-50' : 'opacity-50'
                          : modoOscuro ? 'bg-slate-800/40' : 'bg-amber-50/50'
                    } ${modoOscuro ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {seleccionando && (
                        <div
                          className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 transition-colors flex items-center justify-center ${
                            seleccionados.includes(notif.id_notificacion)
                              ? 'bg-amber-400 border-amber-400'
                              : modoOscuro ? 'border-slate-600' : 'border-slate-400'
                          }`}
                        >
                          {seleccionados.includes(notif.id_notificacion) && (
                            <Icono nombre="check" className="h-3 w-3 text-[#0e162c]" strokeWidth={3} />
                          )}
                        </div>
                      )}
                      <span className={`text-sm font-semibold leading-tight flex-1 ${notif.leido ? (modoOscuro ? 'text-slate-500' : 'text-slate-400') : (modoOscuro ? 'text-slate-100' : 'text-slate-800')}`}>
                        {notif.titulo}
                      </span>
                      {!notif.leido && !seleccionando && (
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
                      {!seleccionando && (
                        <button
                          onClick={(e) => { e.stopPropagation(); eliminarUna(notif.id_notificacion); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                          title="Eliminar notificación"
                        >
                          <Icono nombre="trash" strokeWidth={2} className="h-3.5 w-3.5" />
                        </button>
                      )}
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
        onEliminar={eliminarUna}
      />

      {/* Confirmación eliminar seleccionados */}
      <ModalBase show={confirmarEliminar} onClose={() => !eliminando && setConfirmarEliminar(false)} maxWidth="max-w-sm">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${modoOscuro ? 'bg-red-500/10' : 'bg-red-100'}`}>
            <Icono nombre="alert-triangle" strokeWidth={2} className={`h-7 w-7 ${modoOscuro ? 'text-red-400' : 'text-red-500'}`} />
          </div>
          <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
            ¿Eliminar notificaciones?
          </h3>
          <p className={`text-sm mb-6 ${tema.subtitle}`}>
            Se eliminarán {seleccionados.length} notificación{seleccionados.length !== 1 ? 'es' : ''} de tu bandeja. Esta acción no se puede deshacer.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmarEliminar(false)}
              disabled={eliminando}
              className="flex-1 border rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
              style={{ borderColor: modoOscuro ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.5)', color: modoOscuro ? '#94a3b8' : '#64748b' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarEliminarSeleccion}
              disabled={eliminando}
              className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2.5 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  );
}
