/* Botón "Noticias" del navbar: ícono de libro a la izquierda y, a la derecha, un punto
   ámbar que solo aparece cuando hay publicaciones sin ver. Al pulsarlo navega a la
   página de noticias, donde se marca todo como visto. */
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { Icono } from '../ui/Icono';

export function BotonNoticias({ className = '' }) {
  const navigate = useNavigate();
  const { tema } = useTheme();
  const { noLeidas, marcarTodasLeidas } = useNoticias();
  const hayNuevas = noLeidas > 0;

  function irANoticias() {
    marcarTodasLeidas();
    navigate('/noticias');
  }

  return (
    <button
      onClick={irANoticias}
      aria-label={`Noticias${hayNuevas ? `, ${noLeidas} sin leer` : ''}`}
      className={`inline-flex items-center gap-1.5 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
        hayNuevas ? 'text-amber-400 hover:text-amber-300' : `${tema.btnInactive} hover:text-amber-400`
      } ${className}`}
      title="Noticias"
    >
      <Icono
        nombre="book"
        className={`h-3.5 w-3.5 shrink-0 ${hayNuevas ? 'text-amber-400' : ''}`}
        strokeWidth={2}
      />
      <span className="hidden sm:inline">Noticias</span>
      {hayNuevas && (
        <span className="relative flex items-center justify-center h-2 w-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping" />
          <span className="relative h-2 w-2 rounded-full bg-amber-500" />
        </span>
      )}
    </button>
  );
}
