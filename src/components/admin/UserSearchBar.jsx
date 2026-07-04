import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';

export function BarraBusquedaUsuarios({ busqueda, onChange }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="relative mb-4">
      <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
      <input
        type="text"
        value={busqueda}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por ID, nombre o correo..."
        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
          modoOscuro
            ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
        }`}
      />
    </div>
  );
}
