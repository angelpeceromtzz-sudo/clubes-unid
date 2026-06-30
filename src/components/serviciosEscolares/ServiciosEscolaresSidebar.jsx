import { ELEMENTOS_NAV_SERVICIOS_ESCOLARES } from '../admin/navItems';
import { useAutenticacion } from '../../contexts/AuthContext';

export function BarraLateralServiciosEscolares({ vistaActiva, onCambiarVista, tema }) {
  const { usuario } = useAutenticacion();

  return (
    <aside className={`hidden md:flex flex-col w-64 shrink-0 border-r ${tema.headerBorder} ${tema.headerBg}`}>
      <div className={`px-6 py-5 border-b ${tema.headerBorder}`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${tema.subtitle}`}>Servicios Escolares</p>
        <p className={`text-sm font-semibold mt-0.5 ${tema.text}`}>{usuario?.nombre_completo}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ELEMENTOS_NAV_SERVICIOS_ESCOLARES.map((item) => (
          <button
            key={item.key}
            onClick={() => onCambiarVista(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left cursor-pointer
              ${vistaActiva === item.key
                ? 'bg-amber-400/10 text-amber-400 shadow-sm'
                : `${tema.text} ${tema.isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-100'}`
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
