import { Badge } from './Badge';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';

export function SeccionClubes({ clubesDetalle, cargando }) {
  const { modoOscuro } = useTheme();
  if (cargando) {
    return <Spinner className="py-20" />;
  }

  const estatusColor = (estatus) => {
    const map = { activo: 'emerald', proximamente: 'amber', inactivo: 'red' };
    return map[estatus] || 'slate';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Club</th>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Presidente</th>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Lugar</th>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Cupo</th>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Ocupado</th>
            <th className={`text-left py-3 px-3 font-bold text-xs uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>Estatus</th>
          </tr>
        </thead>
        <tbody>
          {clubesDetalle.length === 0 && (
            <tr><td colSpan={6} className="text-center py-10 text-slate-500">No hay clubes registrados</td></tr>
          )}
          {clubesDetalle.map(c => (
            <tr key={c.id_club} className={`border-b ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/20' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
              <td className="py-3 px-3">
                <p className="font-medium">{c.nombre_club}</p>
                <p className="text-xs text-slate-500">{c.categoria}</p>
              </td>
              <td className={`py-3 px-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{c.presidente}</td>
              <td className={`py-3 px-3 ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{c.lugar || '—'}</td>
              <td className="py-3 px-3 font-mono">{c.cupo_maximo}</td>
              <td className="py-3 px-3 font-mono">{c.cupo_ocupado}</td>
              <td className="py-3 px-3"><Badge texto={c.estatus} color={estatusColor(c.estatus)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
