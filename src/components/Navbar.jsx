// Barra de navegación superior con filtros, perfil y menú desplegable
import { useEffect, useRef, useState } from 'react';
import logoLobo from '../assets/logo-lobo.svg';

const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];

// Componente de navegación principal de la aplicación
export function Navbar({
  categoriaActiva, setCategoriaActiva, modoOscuro, setModoOscuro,
  menuAbierto, setMenuAbierto, tema, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true, onVolverCatalogo,
}) {
  const dropdownRef = useRef(null);

  // Cierra el menú desplegable al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    }

    if (menuAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAbierto, setMenuAbierto]);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [notificaciones, setNotificaciones] = useState([
    { id: 1, mensaje: 'Bienvenido a Clubes UNID', leida: false },
    { id: 2, mensaje: 'Nuevo club disponible: Club de Robótica', leida: false },
    { id: 3, mensaje: 'Tu inscripción está siendo procesada', leida: false },
  ]);
  const notifNoLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-transform duration-300 ${tema.headerBg} ${tema.headerBorder} ${showHeader ? 'max-md:translate-y-0' : 'max-md:-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 md:grid md:grid-cols-3">
        {/* Logo y nombre de la institución */}
        <div className="flex items-center gap-2 cursor-pointer md:justify-self-start" onClick={onLogoClick}>
          <img src={logoLobo} alt="Logo" className="w-10 h-10" />
          <div>
            <span className={`text-base sm:text-lg font-black tracking-tight transition-colors duration-300 ${tema.logoText}`}>
              UNID
            </span>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-amber-400 font-bold leading-tight">
              Clubs Lobos Rojos
            </p>
          </div>
        </div>

        {/* Filtros de categoría o botón de volver al catálogo */}
        {mostrarFiltros ? (
          <nav className={`hidden md:inline-flex items-center transition-colors duration-300 md:justify-self-center ${tema.navPill}`}>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`font-bold text-xs tracking-wide px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95 ${
                  categoriaActiva === cat ? tema.btnActive : tema.btnInactive
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        ) : (
          <button
            onClick={onVolverCatalogo}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95 md:justify-self-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            Volver al Catálogo
          </button>
        )}

        {/* Perfil de usuario, notificaciones y menú desplegable */}
        <div className="relative flex items-center gap-4 md:justify-self-end" ref={dropdownRef}>
          {/* Desktop: perfil de usuario autenticado */}
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <button onClick={onDashboardClick} className={`${tema.iconColor} hover:text-amber-400 transition-colors`} title="Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className={`text-sm font-medium hidden sm:inline transition-colors duration-300 ${tema.profileText}`}>
                  {user.nombre_completo}
                </span>
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.nombre_completo.charAt(0)}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? "rotate-180" : ""} ${tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Notificaciones (solo mobile) */}
          <div className="relative flex md:hidden">
            <button
              onClick={() => { setShowNotificaciones((prev) => !prev); setMenuAbierto(false); }}
              className="relative p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 text-white hover:text-amber-400"
              aria-label="Notificaciones"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifNoLeidas > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {notifNoLeidas}
                </span>
              )}
            </button>
            {showNotificaciones && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotificaciones(false)} />
                <div
                  className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-700 shadow-2xl py-2 px-1 bg-[#0e162c]"
                  style={{ animation: 'dropdownIn 0.2s ease-out' }}
                >
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Notificaciones</p>
                  {notificaciones.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No hay notificaciones</p>
                  ) : (
                    notificaciones.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          setNotificaciones((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
                          );
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 rounded-lg hover:bg-slate-700/50 flex items-start gap-3 ${
                          notif.leida ? 'text-slate-500' : 'text-slate-200 font-medium'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.leida ? 'bg-transparent' : 'bg-amber-400'}`} />
                        <span>{notif.mensaje}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Hamburguesa universal: visible en mobile siempre, en desktop solo si NO hay sesión */}
          <button
            onClick={() => { setMenuAbierto((prev) => !prev); setShowNotificaciones(false); }}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${tema.iconColor} hover:text-amber-400 hover:bg-slate-700/50 ${user ? 'md:hidden' : ''}`}
            aria-label="Menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuAbierto ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Menú desplegable */}
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
                      onClick={onDashboardClick}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Mi Dashboard
                    </button>
                    <div className={`h-px ${tema.headerBorder} mx-3`} />
                    <button
                      onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {modoOscuro ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        )}
                      </svg>
                      Alternar el modo oscuro
                    </button>
                    <div className={`h-px ${tema.headerBorder} mx-3`} />
                    <button
                      onClick={() => { onLogout(); setMenuAbierto(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { onLoginClick(); setMenuAbierto(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Iniciar Sesión
                    </button>
                    <div className={`h-px ${tema.headerBorder} mx-3`} />
                    <button
                      onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {modoOscuro ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        )}
                      </svg>
                      {modoOscuro ? 'Modo Claro' : 'Modo Oscuro'}
                    </button>
                    <div className={`h-px ${tema.headerBorder} mx-3`} />
                    <button
                      onClick={() => { setMenuAbierto(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                      Ayuda
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

// ✦ A
