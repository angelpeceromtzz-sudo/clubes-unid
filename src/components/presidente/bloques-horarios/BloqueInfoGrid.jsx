import { useTheme } from '../../../contexts/ThemeContext';

export function BloqueInfoGrid({ fecha, hora, lugar }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Fecha</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Hora</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {hora ? hora.slice(0, 5) : '—'}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Lugar</p>
        <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {lugar || '—'}
        </p>
      </div>
    </div>
  );
}
