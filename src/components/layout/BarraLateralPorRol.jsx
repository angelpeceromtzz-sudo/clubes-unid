/* Barra lateral con el nombre del usuario, rol y navegación por pestañas.
   Se oculta en impresión y en móvil (hidden md:flex). */
import { useTheme } from '../../contexts/ThemeContext';

export function BarraLateralPorRol({ tituloRol, elementosNav, vistaActiva, onVistaChange, usuario, subtitulo }) {
  const { modoOscuro, sbBg, sbItemBase, sbItemActive, sbItemInactive } = useTheme();
  return (
    <aside className={`hidden md:flex w-64 shrink-0 flex-col border-r ${sbBg} print:hidden`}>
      <div className={`p-5 border-b ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${modoOscuro ? 'text-slate-500' : 'text-slate-500'}`}>
          {tituloRol}
        </p>
        <p className={`text-sm font-bold mt-0.5 truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {usuario?.nombre_completo}
        </p>
        {subtitulo && (
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-1">
            {subtitulo}
          </p>
        )}
      </div>
      <nav className="p-3 space-y-1">
        {elementosNav.map((item) => (
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
