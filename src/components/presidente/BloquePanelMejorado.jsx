import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';

export function PanelBloqueMejorado({ titulo, alumnos, seleccionados, onToggleSeleccion }) {
  const { modoOscuro } = useTheme();
  return (
    <div className={`${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} rounded-2xl border overflow-hidden`}>
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-3">
          <h3 className={`text-base font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            {titulo}
          </h3>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-600/30 text-slate-300 border border-slate-600/50">
            {alumnos.length} Alumno{alumnos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {alumnos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-500">
            <Icono nombre="users" className="h-10 w-10 mb-2 opacity-30" strokeWidth={1.5} />
            <p className="text-sm font-medium">Sin alumnos asignados</p>
            <p className="text-xs mt-0.5">Los alumnos con bloque asignado aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {alumnos.map((alumno) => (
              <div
                key={alumno.id_formulario}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}
              >
                <div
                  onClick={() => onToggleSeleccion(alumno.id_formulario)}
                  className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors shrink-0 ${
                    seleccionados.includes(alumno.id_formulario)
                      ? 'bg-emerald-500 border-emerald-500'
                      : modoOscuro ? 'border-slate-600 hover:border-slate-500' : 'border-slate-400 hover:border-slate-500'
                  }`}
                >
                  {seleccionados.includes(alumno.id_formulario) && (
                    <Icono nombre="check" className="h-full w-full text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  {alumno.nombre_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                    {alumno.nombre_completo}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{alumno.matricula}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
