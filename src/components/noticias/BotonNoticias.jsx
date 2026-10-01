/* Botón "Noticias" del navbar: a la derecha muestra un punto ámbar con la cantidad de
   publicaciones sin ver (1 a 9, luego "+9"). Al pulsarlo navega a la página de noticias,
   donde se marca todo como visto. */
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';

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
      className={`inline-flex items-center gap-1.5 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
        noLeidas > 0
          ? 'text-amber-400 hover:text-amber-300'
          : `${tema.btnInactive} hover:text-amber-400`
      } ${className}`}
      title="Noticias"
    >
      <span className="hidden sm:inline">Noticias</span>
      {noLeidas > 0 && (
        <span className="relative flex items-center justify-center min-w-[14px] h-[14px]">
          <span className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping" />
          <span className="relative min-w-[14px] h-[14px] px-[3px] rounded-full bg-amber-500 text-slate-950 text-[9px] font-black leading-none flex items-center justify-center">
            {noLeidas > 9 ? '+9' : noLeidas}
          </span>
        </span>
      )}
    </button>
  );
}
