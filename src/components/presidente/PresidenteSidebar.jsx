import { ELEMENTOS_NAV_PRESIDENTE } from '../admin/navItems';
import { useTheme } from '../../contexts/ThemeContext';

export function BarraLateralPresidente({ vistaActiva, onVistaChange, user, club }) {
  const { modoOscuro, sbBg, sbItemBase, sbItemActive, sbItemInactive } = useTheme();
  return (
    <aside className={`hidden md:flex w-64 shrink-0 flex-col border-r ${sbBg} print:hidden`}>
      <div className={`p-5 border-b ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-500' : 'text-slate-500'}`}>
          Presidente
        </p>
        <p className={`text-sm font-bold mt-0.5 truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {user.nombre_completo}
        </p>
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-1">
          {club.nombre_club}
        </p>
      </div>
      <nav className="p-3 space-y-1">
        {ELEMENTOS_NAV_PRESIDENTE.map((item) => (
          <button
            key={item.key}
            onClick={() => onVistaChange(item.key)}
            className={`${sbItemBase} ${vistaActiva === item.key ? sbItemActive : sbItemInactive} w-full text-left`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
