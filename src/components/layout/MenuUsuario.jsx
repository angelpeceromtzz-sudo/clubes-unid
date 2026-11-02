import { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
// import { useBloqueoScroll } from '../../hooks/useBloqueoScroll';
import { useTheme } from '../../contexts/ThemeContext';
// import { useNoticias } from '../../contexts/NoticiasContext';
import { Icono } from '../ui/Icono';

export function MenuUsuario({ user, menuAbierto, setMenuAbierto, onDashboardClick, onLogout, onLoginClick, onAyuda, itemsNav = [], onNavChange, ocultarHamburguesa = false }) {
  const { modoOscuro, setModoOscuro, tema } = useTheme();
// const { noLeidas } = useNoticias();
  const dropdownRef = useRef(null);
  const [gruposAbiertos, setGruposAbiertos] = useState(new Set());

  useClickOutside(dropdownRef, menuAbierto, () => setMenuAbierto(false));

  // En móvil (por debajo de md, 768px) el panel es de pantalla completa: se
  // congela el scroll del fondo. Desde md en adelante es un dropdown
  // (md:absolute) y el scroll debe seguir activo, igual que en escritorio.
// const esMovil = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
// useBloqueoScroll(menuAbierto && esMovil);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {user && user.nombre_completo && (
        <button
          onClick={() => setMenuAbierto((prev) => !prev)}
          className="hidden md:flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 md:ring-2 md:ring-[#0b111e]/60 flex items-center justify-center text-white font-bold text-sm">
            {user.nombre_completo?.charAt(0) || '?'}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''} ${modoOscuro ? 'text-white' : tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

{!ocultarHamburguesa && (
      <button
        onClick={() => { setMenuAbierto((prev) => !prev); }}
        className={`p-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${modoOscuro ? `${tema.iconColor} hover:text-amber-400 md:bg-[#0b111e]/60 md:backdrop-blur-md md:hover:bg-[#0b111e]/70` : `${tema.iconColor} hover:text-amber-400`} ${user && user.nombre_completo ? 'md:hidden' : ''}`}
        aria-label="Menú"
        style={{ border: '2px solid red' }}
      >
        <Icono nombre="menu" className="h-6 w-6" strokeWidth={2} />
      </button>
    )}

      {menuAbierto && (
        <>
          <div
            className={`fixed ${ocultarHamburguesa ? 'left-[70vw] right-0' : 'left-0 right-[70vw]'} top-0 bottom-0 z-40 touch-none overscroll-contain`}
            onClick={() => setMenuAbierto(false)}
          />
          <div
            className={`fixed ${ocultarHamburguesa ? 'left-0' : 'right-0'} top-0 z-50 w-[70vw] max-h-[90dvh] overflow-y-scroll overflow-x-hidden overscroll-contain border shadow-2xl py-2 px-1 md:absolute md:left-auto md:right-0 md:top-12 md:w-72 md:h-auto md:max-h-none md:overflow-visible transition-colors duration-300 ${tema.dropdownBg} ${tema.dropdownBorder}`}
            style={{ animation: 'dropdownIn 0.2s ease-out', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', scrollbarColor: '#fbbf24 transparent', scrollbarWidth: 'thin' }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          dir={ocultarHamburguesa ? 'rtl' : undefined}
          >
            <div dir="ltr">
              {user ? (
              <>
                <div className="flex items-center gap-4 px-4 py-3 mb-2">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-base">
                    {user.nombre_completo?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className={`text-sm font-semibold truncate ${tema.text}`}>
                      {user.nombre_completo}
                    </p>
                  </div>
                </div>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                {!itemsNav.some((i) => i.key === 'gestion-clubes') && (
                  <button
                    onClick={() => { onDashboardClick(); setMenuAbierto(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                  >
                    <Icono nombre="grid" className="h-4 w-4" strokeWidth={2} />
                    Mi Dashboard
                  </button>
                )}
                {itemsNav.length > 0 && (
                  <div className="md:hidden">
                    <div className={`h-px ${tema.headerBorder} mx-3`} />
                    {itemsNav.filter((item) => item.key !== 'resumen').map((item) => {
                    if (item.key === 'usuarios') return null;
                    if (item.key === 'gestion-clubes') {
                      const itemUsuarios = itemsNav.find((i) => i.key === 'usuarios');
                      return (
                        <div key={item.key}>
                          <div className={`px-4 py-2 text-xs font-black uppercase tracking-wider ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                            ADMINISTRAR
                          </div>
                          <button
                             onClick={() => { onDashboardClick(); setMenuAbierto(false); }}
                             className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                           >
                             <Icono nombre="grid" className="h-4 w-4" strokeWidth={2} />
                             Mi Dashboard
                           </button>
                           {itemUsuarios && (
                            <button
                              onClick={() => { onNavChange?.(itemUsuarios.key); setMenuAbierto(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={itemUsuarios.icon} />
                              </svg>
                              {itemUsuarios.label}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setGruposAbiertos((prev) => {
                              const siguiente = new Set(prev);
                              if (siguiente.has(item.key)) siguiente.delete(item.key);
                              else siguiente.add(item.key);
                              return siguiente;
                            })}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${tema.dropdownItem} ${tema.text}`}
                          >
                            <span>Gestor de Clubs</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${gruposAbiertos.has(item.key) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {gruposAbiertos.has(item.key) && item.children.map((hijo) => (
                            <button
                              key={hijo.key}
                              onClick={() => { onNavChange?.(hijo.key); setMenuAbierto(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3 ml-3`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={hijo.icon} />
                              </svg>
                              {hijo.label}
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div key={item.key}>
                        {item.key === 'calendario' && (
                          <div className={`h-px mx-3 my-1 border-t border-amber-400/40`} />
                        )}
                        <button
                          onClick={() => { onNavChange?.(item.key); setMenuAbierto(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          {item.label}
                        </button>
                      </div>
                    );
                  })}
                    <div className={`h-px mx-3 my-1 border-t border-amber-400/40`} />
                  </div>
                )}
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  {modoOscuro ? (
                    <Icono nombre="sun" className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Icono nombre="moon" className="h-4 w-4" strokeWidth={2} />
                  )}
                  {modoOscuro ? 'Modo Claro' : 'Modo Oscuro'}
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onAyuda(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="help" className="h-4 w-4" strokeWidth={2} />
                  Ayuda
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onLogout(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="login" className="h-4 w-4" strokeWidth={2} />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { onLoginClick(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="logout" className="h-4 w-4" strokeWidth={2} />
                  Iniciar Sesión
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  {modoOscuro ? (
                    <Icono nombre="sun" className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Icono nombre="moon" className="h-4 w-4" strokeWidth={2} />
                  )}
                  {modoOscuro ? 'Modo Claro' : 'Modo Oscuro'}
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onAyuda(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="help" className="h-4 w-4" strokeWidth={2} />
                  Ayuda
                </button>
              </>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
