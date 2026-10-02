import { Icono } from '../../ui/Icono';

export function ElementoNotificacion({ notif, modoOscuro, onLeer, onEliminar }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onLeer(notif)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLeer(notif); } }}
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
          onClick={(e) => { e.stopPropagation(); onEliminar(notif.id_notificacion); }}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
          title="Eliminar notificación"
        >
          <Icono nombre="trash" strokeWidth={2} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
