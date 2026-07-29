import { EVENTOS_CONFIG, DEFAULT_EVENTO, formatFecha } from '../../../constants/actividad';
import { EventoIcon } from './EventoIcon';

export function TarjetasActividadMobile({ eventos, modoOscuro, tdCls, tdTitle }) {
  const configEvento = (tipo) => EVENTOS_CONFIG[tipo] || DEFAULT_EVENTO;

  return (
    <div className="space-y-2 md:hidden">
      {eventos.map((e) => {
        const cfg = configEvento(e.tipo_evento);
        return (
          <div key={e.id_evento} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                <EventoIcon path={cfg.icon} className="h-3 w-3 shrink-0" />
                {cfg.label}
              </span>
              <span className={`text-[10px] font-mono ${tdCls}`}>{formatFecha(e.fecha_creacion)}</span>
            </div>
            <p className={`text-sm mb-1 ${tdTitle}`}>{e.descripcion}</p>
            <p className={`text-[11px] ${tdCls}`}>
              <span className={`font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Club:</span>{' '}
              {e.nombre_club || 'Sistema'}
              {e.actor_nombre && (
                <>
                  {' · '}
                  <span className={`font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Actor:</span>{' '}
                  {e.actor_nombre}
                </>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
