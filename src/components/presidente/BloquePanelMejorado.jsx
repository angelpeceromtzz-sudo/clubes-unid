import { useState } from 'react';

export function PanelBloqueMejorado({ titulo, alumnos, isDark }) {
  const [editando, setEditando] = useState(false);
  const [lugar, setLugar] = useState('');
  const [hora, setHora] = useState('');
  const [asistencia, setAsistencia] = useState({});

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
        <button
          onClick={() => setEditando((p) => !p)}
          className="text-indigo-400 hover:text-indigo-300 transition-colors p-2 rounded-lg hover:bg-indigo-400/10 cursor-pointer"
          title="Editar lugar y hora"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
          {editando ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1"> Lugar de Cita</p>
                <input
                  type="text"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Ej: Edificio A, Salón 101"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isDark ? 'bg-[#0e162c] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">⏰ Hora de Cita</p>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isDark ? 'bg-[#0e162c] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className={`${lugar ? (isDark ? 'text-slate-300' : 'text-slate-700') : 'text-slate-500 italic'}`}>
                  {lugar || 'No especificado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>⏰</span>
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  {hora || <span className="text-slate-500 italic">No especificado</span>}
                </span>
              </div>
            </>
          )}
        </div>

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
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  {alumno.nombre_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {alumno.nombre_completo}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{alumno.matricula}</p>
                </div>
                <div
                  onClick={() => setAsistencia((prev) => ({ ...prev, [alumno.id_formulario]: !prev[alumno.id_formulario] }))}
                  className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors shrink-0 ${
                    asistencia[alumno.id_formulario]
                      ? 'bg-emerald-500 border-emerald-500'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-400 hover:border-slate-500'
                  }`}
                >
                  {asistencia[alumno.id_formulario] && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.print()}
          className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Generar Lista de Asistencia
        </button>
      </div>
    </div>
  );
}
