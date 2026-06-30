import { ELEMENTOS_NAV_SERVICIOS_ESCOLARES } from '../admin/navItems';

export function PestanasMovilServiciosEscolares({ vistaActiva, onCambiarVista, isDark }) {
  return (
    <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
      {ELEMENTOS_NAV_SERVICIOS_ESCOLARES.map((item) => (
        <button
          key={item.key}
          onClick={() => onCambiarVista(item.key)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 shrink-0 cursor-pointer
            ${vistaActiva === item.key
              ? 'bg-amber-400 text-[#0e162c] shadow-sm'
              : isDark
              ? 'bg-slate-800/50 text-slate-400 hover:text-white'
              : 'bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
          </svg>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
