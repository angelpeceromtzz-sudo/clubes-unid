import { EventoIcon } from './EventoIcon';
import { configEvento, formatFecha } from '../../../constants/actividad';

export function TablaActividadDesktop({ eventos, modoOscuro, tableBg, thCls, tdCls, tdTitle }) {
  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-4 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
              <th className={`px-4 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Tipo</th>
              <th className={`px-4 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club o actividad</th>
              <th className={`px-4 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Actor</th>
              <th className={`px-4 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => {
              const cfg = configEvento(e.tipo_evento);
              return (
                <tr key={e.id_evento} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-4 py-3   font-mono text-xs ${tdCls}`}>{formatFecha(e.fecha_creacion)}</td>
                  <td className="px-4 py-3 ">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                      <EventoIcon path={cfg.icon} className="h-3 w-3 shrink-0" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${tdTitle}`}><p>{e.nombre_club || (e.origen === 'catalogo' ? 'Registro anterior' : 'Sistema')}</p>{e.tipo_recurso && <p className={`text-xs ${tdCls}`}>{e.tipo_recurso === 'actividad' ? 'Actividad' : 'Club'}{e.edicion_nombre ? ' · ' + e.edicion_nombre : ''}</p>}</td>
                  <td className={`px-4 py-3  text-xs ${tdCls}`}>{e.actor_nombre || '-'}</td>
                  <td className={`px-4 py-3 text-xs ${tdCls} max-w-md break-words`}>{e.descripcion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
