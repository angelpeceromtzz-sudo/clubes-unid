export function PanelBloqueMejorado({ titulo, alumnos, isDark, seleccionados, onToggleSeleccion }) {
  return (
    <div className={`${isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} rounded-2xl border overflow-hidden`}>
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-3">
          <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">Sin alumnos asignados</p>
            <p className="text-xs mt-0.5">Los alumnos con bloque asignado aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {alumnos.map((alumno) => (
              <div
                key={alumno.id_formulario}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}
              >
                <div
                  onClick={() => onToggleSeleccion(alumno.id_formulario)}
                  className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors shrink-0 ${
                    seleccionados.includes(alumno.id_formulario)
                      ? 'bg-emerald-500 border-emerald-500'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-400 hover:border-slate-500'
                  }`}
                >
                  {seleccionados.includes(alumno.id_formulario) && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  {alumno.nombre_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
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
