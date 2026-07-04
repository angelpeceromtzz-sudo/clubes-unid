import { useState } from 'react';
import { Badge } from './Badge';
import { useTheme } from '../../contexts/ThemeContext';

export function SeccionPadron({ padron, filtrosPadron, aplicarFiltrosPadron, clubesDetalle, cargando }) {
  const { modoOscuro } = useTheme();

  async function exportarCSV() {
    if (padron.length === 0) return;
    const headers = ['Nombre Completo', 'Matrícula', 'Carrera', 'Cuatrimestre', 'Turno', 'Club', 'Estado', 'Bloque'];
    const filas = padron.map(f => [
      f.nombre_completo, f.matricula, f.carrera, f.cuatrimestre, f.turno, f.nombre_club, f.status, f.bloque_asignado || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...filas].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padron_clubes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Club</label>
          <select value={filtrosPadron.id_club} onChange={e => aplicarFiltrosPadron({ id_club: e.target.value })}
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50`}>
            <option value="">Todos</option>
            {clubesDetalle.map(c => <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Buscar</label>
          <input type="text" value={filtrosPadron.busqueda} onChange={e => aplicarFiltrosPadron({ busqueda: e.target.value })}
            placeholder="Nombre o matrícula"
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 w-48`} />
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Carrera</label>
          <input type="text" value={filtrosPadron.carrera} onChange={e => aplicarFiltrosPadron({ carrera: e.target.value })}
            placeholder="Filtrar por carrera"
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 w-40`} />
        </div>
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Turno</label>
          <select value={filtrosPadron.turno} onChange={e => aplicarFiltrosPadron({ turno: e.target.value })}
            className={`${modoOscuro ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50`}>
            <option value="">Todos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Mixto">Mixto</option>
          </select>
        </div>
        <button onClick={exportarCSV} disabled={padron.length === 0}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all cursor-pointer">
          Exportar CSV
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Nombre</th>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Matrícula</th>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Carrera</th>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Turno</th>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Club</th>
                <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {padron.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-500">Sin resultados</td></tr>
              )}
              {padron.map(f => (
                <tr key={`${f.id_formulario}-${f.id_club}`} className={`border-b ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/20' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                  <td className="py-3 px-3 font-medium">{f.nombre_completo}</td>
                  <td className="py-3 px-3 font-mono text-xs">{f.matricula}</td>
                  <td className={`py-3 px-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{f.carrera}</td>
                  <td className={`py-3 px-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{f.turno}</td>
                  <td className={`py-3 px-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{f.nombre_club}</td>
                  <td className="py-3 px-3"><Badge texto={f.status} color={
                    f.status === 'Miembro oficial' || f.status === 'Oferta emitida' ? 'emerald' : f.status === 'Rechazado' || f.status === 'Oferta rechazada' ? 'red' : f.status === 'Postulado' ? 'amber' : 'blue'
                  } /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">{padron.length} registro(s)</p>
        </div>
      )}
    </div>
  );
}
