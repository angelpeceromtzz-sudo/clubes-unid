/* Selector de cuatrimestre (PBI-05 §5) para historial y estadísticas.
   Valor vacío = periodo activo (comportamiento por defecto del backend). */
import { useTheme } from '../../contexts/ThemeContext';

export function SelectorPeriodoAsistencia({ periodos, valor, onChange }) {
  const { modoOscuro } = useTheme();
  if (!periodos || periodos.length === 0) return null;

  return (
    <div className="mb-4">
      <select
        value={valor || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Seleccionar periodo (cuatrimestre)"
        className={`w-full sm:w-auto min-w-[220px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer ${
          modoOscuro
            ? 'bg-[#18223f] border-slate-700 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <option value="">Periodo activo</option>
        {periodos.map((p) => (
          <option key={p.id_periodo} value={p.id_periodo}>
            {p.nombre}
            {p.activo ? ' (activo)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
