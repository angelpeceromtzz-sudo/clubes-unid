/* Lista de los clubes más populares por número de inscritos. */
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function ClubesPopulares({ clubes }) {
  const { cardCls, tdTitle, tdCls, modoOscuro } = useTheme();

  const topClubes = [...clubes]
    .filter((c) => c.id_estatus_club === 1)
    .sort((a, b) => (b.cupo_actual || 0) - (a.cupo_actual || 0))
    .slice(0, 5);

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b border-amber-400/20 flex items-center justify-between">
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Clubes Más Populares
        </h3>
        <Icono nombre="star" strokeWidth={2} className="h-4 w-4 text-amber-400" />
      </div>

      {topClubes.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <p className={`text-sm ${modoOscuro ? 'text-amber-400/50' : 'text-amber-400/60'}`}>
            No hay clubes activos.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-amber-400/15">
          {topClubes.map((c, idx) => {
            const ocupado = c.cupo_actual || 0;
            const max = c.cupo_maximo || 1;
            const porcentaje = Math.min(Math.round((ocupado / max) * 100), 100);

            return (
              <div key={c.id_club} className="px-5 py-3.5 flex items-center gap-3">
                <span className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-xs font-black ${
                  idx === 0 ? 'bg-amber-400/25 text-amber-400' :
                  idx === 1 ? 'bg-amber-400/15 text-amber-400/70' :
                  'bg-amber-400/10 text-amber-400/50'
                }`}>
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold truncate ${tdTitle}`}>{c.nombre_club}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-amber-400/10">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums ${tdCls}`}>{ocupado}/{max}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
