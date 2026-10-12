/* Enlace al portal institucional (LMS) del navbar: logo UNID + etiqueta "Portal".
   Abre en una pestaña nueva. */
import { useTheme } from '../../../contexts/ThemeContext';

const PORTAL_URL = 'https://unid.neolms.com/site';

export function BotonPortal({ className = '' }) {
  const { tema } = useTheme();
  return (
    <a
      href={PORTAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Portal"
      aria-label="Portal UNID"
      className={`hidden lg:inline-flex items-center gap-2 shrink-0 font-semibold text-xs lg:text-sm tracking-wide px-2 py-1 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${tema.btnInactive} hover:text-amber-400 ${className}`}
    >
      <img src="/LogoU.png" alt="UNID" className="h-6 w-6 lg:h-7 lg:w-7 object-contain shrink-0" />
      <span className="hidden sm:inline">Portal</span>
    </a>
  );
}
