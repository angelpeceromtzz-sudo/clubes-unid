/* Feed compacto de actividad reciente del sistema (basado en historial de admin). */
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Icono } from '../ui/Icono';
import { fechaRelativa } from '../../utils/formato';

const ACCIONES = {
  cambio_rol: { label: 'Cambio de Rol', icono: 'users', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  asignar_club: { label: 'Asignar Club', icono: 'clipboard', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  desasignar_club: { label: 'Desasignar Club', icono: 'clipboard', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  crear_club: { label: 'Crear Club', icono: 'plus', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  actualizar_club: { label: 'Actualizar Club', icono: 'edit', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  cambio_estatus_club: { label: 'Cambio Estatus', icono: 'zap', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  enviar_anuncio: { label: 'Enviar Anuncio', icono: 'bell', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  baja_usuario: { label: 'Dar de Baja', icono: 'trash', color: 'text-red-400', bg: 'bg-red-500/10' },
};

const DEFAULT = { label: 'Acción', icono: 'info', color: 'text-slate-400', bg: 'bg-slate-500/10' };

export function ActividadRecienteFeed({ historial, cargando }) {
  const { cardCls, tdTitle, tdCls, modoOscuro } = useTheme();
  const recientes = historial?.slice(0, 5) || [];

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Actividad Reciente
        </h3>
        <Icono nombre="zap" strokeWidth={2} className="h-4 w-4 text-amber-400" />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : recientes.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <p className={`text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            No hay actividad reciente.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.6)' }}>
          {recientes.map((h) => {
            const cfg = ACCIONES[h.accion] || DEFAULT;
            return (
              <div key={h.id_historial} className="px-5 py-3.5 flex items-start gap-3">
                <div className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full mt-0.5 ${cfg.bg}`}>
                  <Icono nombre={cfg.icono} strokeWidth={2} className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold ${tdTitle}`}>{h.admin_nombre}</span>
                    <span className={`text-[10px] ${tdCls}`}>{cfg.label.toLowerCase()}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${tdCls} line-clamp-2`}>{h.descripcion}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium whitespace-nowrap ${tdCls} mt-0.5`}>
                  {fechaRelativa(h.fecha)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
