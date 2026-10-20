/* Botón secundario de las barras superiores de las páginas públicas
   (/conoce-clubs y /acerca-del-proyecto). Unifica altura, padding
   horizontal, tamaño y peso de letra, radio, alineación vertical de
   texto e iconos y estados hover/foco; el ancho se ajusta al contenido.
   En móvil la forma visible mide ~38px con px-3 (12px); el pseudo
   after expande el área táctil a ~44px sin cambiar el layout. Desde sm
   conserva 44px y px-4. Tratamiento secundario acordado: superficie
   azul #1E293F con borde #35435C en tema oscuro (hover #273858; se lee
   sobre el fondo #0b111e sin competir con el CTA ámbar) y píldora
   blanca con borde en tema claro. Solo para estas dos barras: no
   modifica botones del portal ni del sistema. */
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80';

const BASE =
  'relative inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 sm:min-h-[44px] sm:px-4 rounded-full text-xs font-bold whitespace-nowrap transition-colors duration-200 active:scale-[0.98] after:absolute after:-inset-y-[3px] after:inset-x-0 after:content-[""]';

export function BotonBarraPublica({ to, children, className = '' }) {
  const { modoOscuro } = useTheme();
  const superficie = modoOscuro
    ? 'bg-[#1E293F] border border-[#35435C] text-white hover:bg-[#273858]'
    : 'bg-white border border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50';

  return (
    <Link to={to} className={`${BASE} ${superficie} ${FOCO} ${className}`}>
      {children}
    </Link>
  );
}
