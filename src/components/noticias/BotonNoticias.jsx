/* Botón "Noticias" del navbar con contador de publicaciones sin ver (0 a 9, luego "+9").
   Al pulsarlo navega a la página de noticias, donde se marca todo como visto. */
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { Icono } from '../ui/Icono';

export function BotonNoticias({ className = '' }) {
  const navigate = useNavigate();
  const { tema } = useTheme();
  const { noLeidas, marcarTodasLeidas } = useNoticias();

  function irANoticias() {
    marcarTodasLeidas();
    navigate('/noticias');
  }

  return (
    <button
      onClick={irANoticias}
      aria-label="Noticias"
      className={`relative inline-flex items-center gap-1.5 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
        noLeidas > 0
          ? 'text-white bg-amber-500 shadow-sm shadow-amber-500/30'
          : `${tema.btnInactive} hover:bg-amber-400/10`
      } ${className}`}
      title="Noticias"
    >
      <Icono nombre="newspaper" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span className="hidden sm:inline">Noticias</span>
      {noLeidas > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
          {noLeidas > 9 ? '+9' : noLeidas}
        </span>
      )}
    </button>
  );
}
