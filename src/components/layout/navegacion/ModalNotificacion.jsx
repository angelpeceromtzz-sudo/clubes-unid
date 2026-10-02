import { ModalBase } from '../../ui/ModalBase';
import { Icono } from '../../ui/Icono';

export function ModalNotificacion({ notif, onClose, tema, modoOscuro, onEliminar }) {
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
