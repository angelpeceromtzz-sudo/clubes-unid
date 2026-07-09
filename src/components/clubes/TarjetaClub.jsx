/* Tarjeta de club en el catálogo: imagen, categoría, nombre, descripción, badge de convocatoria. Soporta estado "próximamente". */
import { clasesBadge } from '../../constants/colores';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { obtenerUrlImagen } from '../../utils/imagen';

export function TarjetaClub({
  nombre, descripcion, categoria, cupoMaximo, cupoActual,
  imagen, onClick,
  idEstatusClub, estadoConvocatoria,
}) {
  const { modoOscuro } = useTheme();
  const esProximamente = idEstatusClub === 2;
  const convocatoriaAbierta = estadoConvocatoria === 'abierta';

  const c = modoOscuro
    ? {
        card: esProximamente
          ? "bg-[#0e162c]/50 border-slate-800/30 opacity-60"
          : "bg-[#0e162c] border-slate-800/50 hover:border-slate-700 hover:shadow-amber-400/5",
        title: esProximamente ? "text-slate-500" : "text-white",
        desc: esProximamente ? "text-slate-600" : "text-slate-400",
        divider: esProximamente ? "bg-slate-800/30" : "bg-slate-800",
      }
    : {
        card: esProximamente
          ? "bg-white/50 border-slate-200/50 opacity-60"
          : "bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-amber-500/10",
        title: esProximamente ? "text-slate-400" : "text-slate-900",
        desc: esProximamente ? "text-slate-400" : "text-slate-600",
        divider: esProximamente ? "bg-slate-200/50" : "bg-slate-200",
      };

  return (
    <div
      onClick={esProximamente ? undefined : onClick}
      className={`group rounded-2xl p-6 shadow-lg flex flex-col justify-between border cursor-pointer select-none ${
        esProximamente ? '' : 'hover:shadow-2xl transition-all duration-300 active:scale-[0.98]'
      } ${c.card}`}
    >
      <div>
        <div className={`overflow-hidden rounded-xl h-40 mb-5 flex items-center justify-center`}>
          {obtenerUrlImagen(imagen) ? (
            <img
              src={obtenerUrlImagen(imagen)}
              alt={nombre}
              className={`w-full h-full object-cover ${esProximamente ? 'opacity-50' : 'transition-transform duration-500 group-hover:scale-105'}`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <svg className={`w-12 h-12 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
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
          {!esProximamente && convocatoriaAbierta ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <Icono nombre="check-circle" strokeWidth={2} className="h-3.5 w-3.5" />
              <span className="md:hidden">Abierta</span>
              <span className="hidden md:inline">Convocatoria abierta</span>
            </span>
          ) : !esProximamente ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-red-500/10 border-red-500/30 text-red-400">
              <Icono nombre="lock" strokeWidth={2} className="h-3.5 w-3.5" />
              <span className="md:hidden">Cerrada</span>
              <span className="hidden md:inline">Convocatoria cerrada</span>
            </span>
          ) : (
            <span className="text-xs font-bold tracking-wide text-slate-500">— / —</span>
          )}
          {!esProximamente && (
            <span className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1">
              Ver detalles
              <Icono nombre="chevron-right" strokeWidth={2} className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
