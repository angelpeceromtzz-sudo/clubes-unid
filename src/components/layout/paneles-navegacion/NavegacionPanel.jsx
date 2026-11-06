/* Panel de navegación con sidebar fijo en escritorio y tabs horizontales en móvil.
   Soporta elementos con `children` para submenús desplegables. */
import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { NAVBAR_HEIGHT_LOGO } from '../../../constants/limites';

export function NavegacionPanel({ elementosNav, vistaActiva, onVistaChange, children }) {
  const { modoOscuro } = useTheme();
  const [abiertos, setAbiertos] = useState(() => new Set());
  const [cerrados, setCerrados] = useState(() => new Set());
  const [sidebarAbierto, setSidebarAbierto] = useState(true);

  const tieneAdmin = elementosNav.some((i) => i.key === 'gestion-clubes');
  const itemUsuarios = elementosNav.find((i) => i.key === 'usuarios');
  const itemGestionClubes = elementosNav.find((i) => i.key === 'gestion-clubes');
  const itemResumen = elementosNav.find((i) => i.key === 'resumen');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCerrados(new Set());
  }, [vistaActiva]);

  const esActivo = (key) => vistaActiva === key;

  const toggleGrupo = (item, autoAbierto) => {
    if (autoAbierto) {
      setCerrados((prev) => {
        const siguiente = new Set(prev);
        if (siguiente.has(item.key)) siguiente.delete(item.key);
        else siguiente.add(item.key);
        return siguiente;
      });
    } else {
      setAbiertos((prev) => {
        const siguiente = new Set(prev);
        if (siguiente.has(item.key)) siguiente.delete(item.key);
        else siguiente.add(item.key);
        return siguiente;
      });
    }
  };

  const renderBoton = (item, compacto = false, anidado = false) => {
    const activo = esActivo(item.key);
    const baseClases = compacto
      ? `flex-1 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
          item.deshabilitado ? 'text-slate-600 cursor-not-allowed opacity-50' : 'cursor-pointer'
        } ${activo ? 'bg-amber-400/20 text-amber-400' : modoOscuro ? 'text-slate-400' : 'text-slate-500'}`
      : `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
          anidado ? 'ml-3' : ''
        } ${
          item.deshabilitado
            ? 'text-slate-600 cursor-not-allowed opacity-50'
            : 'cursor-pointer'
        } ${
          activo
            ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
            : modoOscuro
              ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`;

    return (
      <button
        key={item.key}
        onClick={() => !item.deshabilitado && onVistaChange(item.key)}
        disabled={item.deshabilitado}
        className={baseClases}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
        </svg>
        <span>{item.label}</span>
      </button>
    );
  };

  const renderGrupo = (item, compacto = false) => {
    const activoHijo = item.children.some((hijo) => esActivo(hijo.key));
    const autoAbierto = activoHijo;
    const estaAbierto = autoAbierto ? !cerrados.has(item.key) : abiertos.has(item.key);

    return (
      <div key={item.key} className="space-y-1">
        <button
          type="button"
          aria-expanded={estaAbierto}
          aria-controls={`grupo-${item.key}`}
          onClick={() => toggleGrupo(item, autoAbierto)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
            modoOscuro ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {item.key !== 'gestion-clubes' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
          )}
          <span className="flex-1 text-left">{item.label}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${estaAbierto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {estaAbierto && (
          <div id={`grupo-${item.key}`} role="group" className="space-y-1">
            {item.children.map((hijo) => renderBoton(hijo, compacto, true))}
          </div>
        )}
      </div>
    );
  };

  const renderElemento = (item, compacto = false) =>
    item.children ? renderGrupo(item, compacto) : renderBoton(item, compacto);

  return (
    <div className="flex min-h-screen">
      <div
        className={`hidden md:flex flex-col shrink-0 border-r sticky self-start overflow-y-auto transition-all duration-300 ${sidebarAbierto ? 'w-64' : 'w-12'} ${modoOscuro ? 'bg-[#0a1128] border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}
        style={{ top: `${NAVBAR_HEIGHT_LOGO}px`, height: `calc(100vh - ${NAVBAR_HEIGHT_LOGO}px)`, direction: 'rtl', scrollbarColor: '#fbbf24 transparent', scrollbarWidth: 'thin' }}
      >
        <div style={{ direction: 'ltr' }} className="flex flex-col">
          <button
            type="button"
            onClick={() => setSidebarAbierto((prev) => !prev)}
            className={`m-2 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${modoOscuro ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-700/80 hover:shadow-sm' : 'text-amber-500 hover:text-amber-600 hover:bg-slate-200 hover:shadow-sm'}`}
            aria-label={sidebarAbierto ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}
          >
            {sidebarAbierto ? 'Cerrar' : 'Abrir'}
          </button>
          {sidebarAbierto && (
            <nav className="pt-2 px-3 space-y-1">
              {tieneAdmin && (
                 <>
                   <div className={`px-4 py-2 text-xs font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                     ADMINISTRAR
                   </div>
                   <button
                     onClick={() => onVistaChange('resumen')}
                     className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                       vistaActiva === 'resumen'
                         ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                         : modoOscuro
                           ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
                           : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                     }`}
                   >
                     {itemResumen && (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d={itemResumen.icon} />
                       </svg>
                     )}
                     <span>Mi Dashboard</span>
                   </button>
                   {itemUsuarios && renderBoton(itemUsuarios, false)}
                    <div className="h-px mx-3 my-1 border-t border-amber-400/40" />
                   {itemGestionClubes && renderGrupo(itemGestionClubes, false)}
                 </>
               )}
               {elementosNav
                 .filter((i) => !tieneAdmin || !['resumen', 'usuarios', 'gestion-clubes'].includes(i.key))
                 .map((item) => (
                   <div key={item.key}>
                     {item.key === 'calendario' && (
                       <div className="h-px mx-3 my-1 border-t border-amber-400/40" />
                     )}
                     {renderElemento(item, false)}
                   </div>
                 ))}
            </nav>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}