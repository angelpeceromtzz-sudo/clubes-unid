import { useTheme } from '../../contexts/ThemeContext';

export function SeccionAsistencia({ clubesDetalle, clubAsistenciaId, seleccionarClubAsistencia, asistencia, cargando }) {
  const { modoOscuro } = useTheme();
  function imprimirLista() {
    window.print();
  }

  const alumnosBloqueA = asistencia.filter(a => a.bloque_asignado === 'A');
  const alumnosBloqueB = asistencia.filter(a => a.bloque_asignado === 'B');
  const alumnosBloqueE = asistencia.filter(a => a.bloque_asignado === 'E' || !a.bloque_asignado);

  const clubActual = clubesDetalle.find(c => c.id_club === parseInt(clubAsistenciaId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Seleccionar Club</label>
          <select value={clubAsistenciaId} onChange={e => seleccionarClubAsistencia(e.target.value)}
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 min-w-[200px]`}>
            <option value="">Seleccione un club</option>
            {clubesDetalle.map(c => <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>)}
          </select>
        </div>
        {asistencia.length > 0 && (
          <button onClick={imprimirLista}
            className="bg-amber-500 hover:bg-amber-400 text-[#0e162c] text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer">
            Imprimir Lista
          </button>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" /></div>
      ) : asistencia.length === 0 && clubAsistenciaId ? (
        <p className="text-center py-10 text-slate-500">No hay alumnos admitidos en este club</p>
      ) : asistencia.length === 0 ? null : (
        <div id="lista-asistencia-print" className="space-y-6 print:space-y-4">
          <div className="print-only hidden print:block text-center mb-4">
            <h2 className="text-xl font-black">Lista de Asistencia</h2>
            <p className="text-sm">{clubActual?.nombre_club || ''}</p>
            <p className="text-xs">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {[alumnosBloqueA, alumnosBloqueB, alumnosBloqueE].map((alumnos, i) => {
            const nombreBloque = ['A', 'B', 'E'][i];
            if (alumnos.length === 0) return null;
            return (
              <div key={nombreBloque} className={`rounded-xl border p-4 ${modoOscuro ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-white shadow-sm'} print:border-black print:bg-white print:text-black`}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'} print:text-black`}>Bloque {nombreBloque}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'} print:border-black`}>
                      <th className={`text-left py-2 px-2 font-bold text-xs uppercase ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} print:text-black`}>#</th>
                      <th className={`text-left py-2 px-2 font-bold text-xs uppercase ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} print:text-black`}>Nombre</th>
                      <th className={`text-left py-2 px-2 font-bold text-xs uppercase ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} print:text-black`}>Matrícula</th>
                      <th className={`text-left py-2 px-2 font-bold text-xs uppercase ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} print:text-black`}>Carrera</th>
                      <th className={`text-center py-2 px-2 font-bold text-xs uppercase ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} print:text-black`}>Asistió</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map((a, idx) => (
                      <tr key={a.id_formulario} className={`border-b ${modoOscuro ? 'border-slate-800/50' : 'border-slate-100'} print:border-gray-300`}>
                        <td className={`py-2 px-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}</td>
                        <td className="py-2 px-2 font-medium">{a.nombre_completo}</td>
                        <td className="py-2 px-2 font-mono text-xs">{a.matricula}</td>
                        <td className={`py-2 px-2 text-xs ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{a.carrera}</td>
                        <td className="py-2 px-2 text-center"><span className={`inline-block w-6 h-6 border ${modoOscuro ? 'border-slate-500' : 'border-slate-400'} rounded print:border-gray-500`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
