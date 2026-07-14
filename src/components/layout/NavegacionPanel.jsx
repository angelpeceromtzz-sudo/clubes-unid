/* Panel de navegación con sidebar fijo en escritorio y tabs horizontales en móvil.
   Renderiza `children` como contenido principal sincronizado con `vistaActiva`. */
import { useTheme } from '../../contexts/ThemeContext';

export function NavegacionPanel({ elementosNav, vistaActiva, onVistaChange, children }) {
  const { modoOscuro } = useTheme();
  return (
    <>
      <style>{`.nav-tabs-hide-scroll::-webkit-scrollbar { display: none; }`}</style>
    <div className="flex min-h-screen">
      {/* Sidebar - visible en md+ */}
      <div className={`hidden md:flex flex-col shrink-0 w-64 border-r ${modoOscuro ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <nav className="sticky top-0 pt-6 px-3 space-y-1">
          {elementosNav.map((item) => {
            const activo = vistaActiva === item.key;
            return (
              <button
                key={item.key}
                onClick={() => !item.deshabilitado && onVistaChange(item.key)}
                disabled={item.deshabilitado}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  item.deshabilitado
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                } ${
                  activo
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                    : modoOscuro ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Tabs móviles */}
        <div className={`flex md:hidden gap-1 p-1 mb-6 rounded-full overflow-x-auto nav-tabs-hide-scroll ${modoOscuro ? 'bg-[#18223f]/60 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {elementosNav.map((item) => {
            const activo = vistaActiva === item.key;
            return (
              <button
                key={item.key}
                onClick={() => !item.deshabilitado && onVistaChange(item.key)}
                disabled={item.deshabilitado}
                className={`flex-1 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
                  item.deshabilitado
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                } ${
                  activo
                    ? 'bg-amber-400/20 text-slate-500'
                    : modoOscuro ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {children}
      </main>
    </div>
    </>
  );
}
