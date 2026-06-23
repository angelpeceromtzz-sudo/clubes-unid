import { NAV_ITEMS_PRESIDENTE } from '../admin/navItems';

export function PresidenteSidebar({ vistaActiva, onVistaChange, user, club, isDark, sbBg, sbItemBase, sbItemActive, sbItemInactive }) {
  return (
    <aside className={`hidden md:flex w-64 shrink-0 flex-col border-r ${sbBg} print:hidden`}>
      <div className="p-5 border-b border-slate-800">
        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Presidente
        </p>
        <p className={`text-sm font-bold mt-0.5 truncate ${isDark ? 'text-white' : 'text-white'}`}>
          {user.nombre_completo}
        </p>
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-1">
          {club.nombre_club}
        </p>
      </div>
      <nav className="p-3 space-y-1">
        {NAV_ITEMS_PRESIDENTE.map((item) => (
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
