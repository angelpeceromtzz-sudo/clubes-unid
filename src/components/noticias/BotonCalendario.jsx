import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function BotonCalendario({ className = '' }) {
  const navigate = useNavigate();
  const { tema } = useTheme();

  return (
    <button
      onClick={() => navigate('/calendario')}
      aria-label="Calendario"
      title="Calendario"
      className={`inline-flex items-center gap-1.5 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${tema.btnInactive} hover:text-amber-400 ${className}`}
    >
      <Icono nombre="calendar" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span className="hidden sm:inline">Calendario</span>
    </button>
  );
}
