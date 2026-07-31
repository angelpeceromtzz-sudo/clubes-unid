import { EventoIcon } from './EventoIcon';
import { EVENTOS_CONFIG, DEFAULT_EVENTO, formatFecha } from '../../../constants/actividad';

export function TablaActividadDesktop({ eventos, modoOscuro, tableBg, thCls, tdCls, tdTitle }) {
  const configEvento = (tipo) => EVENTOS_CONFIG[tipo] || DEFAULT_EVENTO;

  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-4 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
              <th className={`px-4 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Tipo</th>
              <th className={`px-4 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
              <th className={`px-4 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Actor</th>
              <th className={`px-4 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => {
              const cfg = configEvento(e.tipo_evento);
              return (
                <tr key={e.id_evento} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${tdCls}`}>{formatFecha(e.fecha_creacion)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                      <EventoIcon path={cfg.icon} className="h-3 w-3 shrink-0" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${tdTitle}`}>{e.nombre_club || 'Sistema'}</td>
                  <td className={`px-4 py-3 text-xs ${tdCls}`}>{e.actor_nombre || '-'}</td>
                  <td className={`px-4 py-3 text-xs ${tdCls} max-w-xs break-words`}>{e.descripcion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
