import { clasesBadge } from '../../constants/colores';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function TarjetaClub({
  nombre, descripcion, categoria, cupoMaximo, cupoActual,
  imagen, onClick,
  idEstatusClub,
}) {
  const { modoOscuro } = useTheme();
  const esProximamente = idEstatusClub === 2;
  const lleno = cupoActual >= cupoMaximo;

  const c = modoOscuro
    ? {
        card: esProximamente
          ? "bg-[#0e162c]/50 border-slate-800/30 opacity-60"
          : "bg-[#0e162c] border-slate-800/50 hover:border-slate-700 hover:shadow-amber-400/5",
        title: esProximamente ? "text-slate-500" : "text-white",
        desc: esProximamente ? "text-slate-600" : "text-slate-400",
        divider: esProximamente ? "bg-slate-800/30" : "bg-slate-800",
        lugares: esProximamente ? "text-slate-600" : "text-slate-400",
      }
    : {
        card: esProximamente
          ? "bg-white/50 border-slate-200/50 opacity-60"
          : "bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-amber-500/10",
        title: esProximamente ? "text-slate-400" : "text-slate-900",
        desc: esProximamente ? "text-slate-400" : "text-slate-600",
        divider: esProximamente ? "bg-slate-200/50" : "bg-slate-200",
        lugares: esProximamente ? "text-slate-400" : "text-slate-600",
      };

  return (
    <div
      onClick={esProximamente ? undefined : onClick}
      className={`group rounded-2xl p-6 shadow-lg flex flex-col justify-between border cursor-pointer select-none ${
        esProximamente ? '' : 'hover:shadow-2xl transition-all duration-300 active:scale-[0.98]'
      } ${c.card}`}
    >
      <div>
        <div className={`overflow-hidden rounded-xl h-40 mb-5`}>
          <img
            src={imagen}
            alt={nombre}
            className={`w-full h-full object-cover ${esProximamente ? 'opacity-50' : 'transition-transform duration-500 group-hover:scale-105'}`}
          />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(categoria, modoOscuro)}`}>
            {categoria}
          </span>
          {esProximamente && (
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-slate-500 border-slate-500/30 bg-slate-500/10">
              Próximamente
            </span>
          )}
        </div>
        <h3 className={`text-lg font-bold ${c.title} ${esProximamente ? '' : 'group-hover:text-amber-400 transition-colors duration-200'}`}>
          {nombre}
        </h3>
        <p className={`text-xs mt-2 font-medium leading-relaxed line-clamp-3 ${c.desc}`}>
          {descripcion}
        </p>
      </div>

      <div>
        <div className={`h-px my-5 ${c.divider}`} />
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold tracking-wide ${lleno ? 'text-red-400' : c.lugares}`}>
            {esProximamente ? '— / —' : `Lugares: ${cupoActual} / ${cupoMaximo}`}
          </span>
          {!esProximamente && (
            <span className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1">
              Ver más
              <Icono nombre="chevron-right" strokeWidth={2} className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
