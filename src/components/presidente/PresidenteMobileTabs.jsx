import { NAV_ITEMS_PRESIDENTE } from '../admin/navItems';

export function PresidenteMobileTabs({ vistaActiva, onVistaChange, isDark }) {
  return (
    <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
      {NAV_ITEMS_PRESIDENTE.map((item) => (
        <button
          key={item.key}
          onClick={() => onVistaChange(item.key)}
          className={`whitespace-nowrap text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
            vistaActiva === item.key
              ? 'bg-amber-400 text-[#0e162c]'
              : isDark
              ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
              : 'bg-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
