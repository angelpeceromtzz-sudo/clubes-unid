import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useBloqueoScroll } from '../../hooks/useBloqueoScroll';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { Icono } from '../ui/Icono';

export function MenuUsuario({ user, menuAbierto, setMenuAbierto, onDashboardClick, onLogout, onLoginClick, onAyuda }) {
  const { modoOscuro, setModoOscuro, tema } = useTheme();
  const navigate = useNavigate();
  const { noLeidas, abrirActualizaciones } = useNoticias();
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, menuAbierto, () => setMenuAbierto(false));

  // En móvil el panel es de pantalla completa: se congela el scroll del fondo.
  // En escritorio es un dropdown (lg:absolute) y el scroll debe seguir activo.
  const esMovil = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  useBloqueoScroll(menuAbierto && esMovil);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {user && (
        <button
          onClick={() => setMenuAbierto((prev) => !prev)}
          className="hidden lg:flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 lg:ring-2 lg:ring-[#0b111e]/60 flex items-center justify-center text-white font-bold text-sm">
            {user.nombre_completo.charAt(0)}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''} ${modoOscuro ? 'text-white' : tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      <button
        onClick={() => { setMenuAbierto((prev) => !prev); }}
        className={`p-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${modoOscuro ? `${tema.iconColor} hover:text-amber-400 md:bg-[#0b111e]/60 md:backdrop-blur-md md:hover:bg-[#0b111e]/70` : `${tema.iconColor} hover:text-amber-400`} ${user ? 'lg:hidden' : ''}`}
        aria-label="Menú"
      >
        <Icono nombre="menu" className="h-6 w-6" strokeWidth={2} />
      </button>

      {menuAbierto && (
        <>
          <div className="fixed inset-0 z-40 touch-none overscroll-contain" onClick={() => setMenuAbierto(false)} />
          <div
            className={`fixed right-0 top-0 z-50 w-[70vw] border shadow-2xl py-2 px-1 lg:absolute lg:top-12 lg:w-56 transition-colors duration-300 ${tema.dropdownBg} ${tema.dropdownBorder}`}
            style={{ animation: 'dropdownIn 0.2s ease-out' }}
          >
            {user ? (
              <>
                <div className="flex items-center justify-end gap-3 px-4 py-3">
                  <div className="min-w-0 text-right">
                    <p className={`text-xs font-semibold truncate ${tema.text}`}>
                      {user.nombre_completo}
                    </p>
                  </div>
                  <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-base">
                    {user.nombre_completo.charAt(0)}
                  </div>
                </div>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onDashboardClick(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="grid" className="h-4 w-4" strokeWidth={2} />
                  Mi Dashboard
                </button>
                <div className="lg:hidden">
                  <div className={`h-px ${tema.headerBorder} mx-3`} />
                  <button
                    onClick={() => { abrirActualizaciones(); setMenuAbierto(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                  >
                    <Icono nombre="newspaper" className="h-4 w-4" strokeWidth={2} />
                    Noticias y eventos
                    {noLeidas > 0 && (
                      <span className="relative ml-auto flex items-center justify-center h-2 w-2 shrink-0">
                        <span className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping" />
                        <span className="relative h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { navigate('/calendario'); setMenuAbierto(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                  >
                    <Icono nombre="clock" className="h-4 w-4" strokeWidth={2} />
                    Calendario
                  </button>
                </div>
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
        </>
      )}
    </div>
  );
}
