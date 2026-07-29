import { useTheme } from '../../../contexts/ThemeContext';
import { Badge } from '../../ui/Badge';

export function BloqueHeader({ bloque, totalAlumnos, enviada }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shrink-0">
          {bloque}
        </div>
        <div>
          <h3 className={`text-base font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            Bloque {bloque}
          </h3>
          <p className="text-xs text-slate-500">{totalAlumnos} alumno{totalAlumnos !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {enviada && <Badge texto="Enviada" color="emerald" />}
    </div>
  );
}
