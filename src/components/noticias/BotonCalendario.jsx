import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function BotonCalendario({ className = '', colorClase = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tema } = useTheme();
  const seleccionado = location.pathname === '/calendario';

  return (
    <button
      data-tutorial="calendario"
      onClick={() => navigate('/calendario')}
      aria-label="Calendario"
      aria-current={seleccionado ? 'page' : undefined}
      title="Calendario"
      className={`inline-flex items-center gap-1.5 font-semibold text-xs lg:text-sm tracking-wide px-3 py-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${seleccionado ? 'bg-amber-400/15 text-amber-500 ring-1 ring-inset ring-amber-400/30' : `${colorClase || tema.btnInactive} hover:text-amber-500`} ${className}`}
    >
      <Icono nombre="calendar" className="h-5 w-5 lg:h-6 lg:w-6 shrink-0" strokeWidth={2} />
      <span className="hidden sm:inline">Calendario</span>
    </button>
  );
}
