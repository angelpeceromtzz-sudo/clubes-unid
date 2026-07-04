import { useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function MenuUsuario({ user, menuAbierto, setMenuAbierto, onDashboardClick, onLogout, onLoginClick, onAyuda }) {
  const { modoOscuro, setModoOscuro, tema } = useTheme();
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, menuAbierto, () => setMenuAbierto(false));

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {user && (
        <button
          onClick={() => setMenuAbierto((prev) => !prev)}
          className="hidden md:flex items-center gap-2 cursor-pointer"
        >
          <span className={`text-sm font-medium hidden sm:inline transition-colors duration-300 ${tema.profileText}`}>
            {user.nombre_completo}
          </span>
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
            {user.nombre_completo.charAt(0)}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''} ${tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      <button
        onClick={() => { setMenuAbierto((prev) => !prev); }}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${tema.iconColor} hover:text-amber-400 ${modoOscuro ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200'} ${user ? 'md:hidden' : ''}`}
        aria-label="Menú"
      >
        {menuAbierto ? (
          <Icono nombre="close" className="h-6 w-6" strokeWidth={2} />
        ) : (
          <Icono nombre="menu" className="h-6 w-6" strokeWidth={2} />
        )}
      </button>

      {menuAbierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
          <div
            className={`absolute right-0 top-12 z-50 w-56 rounded-xl border shadow-2xl py-2 px-1 transition-colors duration-300 ${tema.dropdownBg} ${tema.dropdownBorder}`}
            style={{ animation: 'dropdownIn 0.2s ease-out' }}
          >
            {user ? (
              <>
                <button
                  onClick={() => { onDashboardClick(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="grid" className="h-4 w-4" strokeWidth={2} />
                  Mi Dashboard
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  {modoOscuro ? (
                    <Icono nombre="sun" className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Icono nombre="moon" className="h-4 w-4" strokeWidth={2} />
                  )}
                  Alternar el modo oscuro
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onAyuda(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="help" className="h-4 w-4" strokeWidth={2} />
                  Ayuda
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { onLogout(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="login" className="h-4 w-4" strokeWidth={2} />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { onLoginClick(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <Icono nombre="logout" className="h-4 w-4" strokeWidth={2} />
                  Iniciar Sesión
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button
                  onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
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
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
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
