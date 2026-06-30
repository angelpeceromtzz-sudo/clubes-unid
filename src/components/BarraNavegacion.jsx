import { useEffect, useRef, useState } from 'react';
import { useNotificaciones } from '../contexts/NotificationContext';
import { useClickOutside } from '../hooks/useClickOutside';
import logoLobo from '../assets/logo-lobo.svg';

const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];

export function BarraNavegacion({
  categoriaActiva, setCategoriaActiva, modoOscuro, setModoOscuro,
  menuAbierto, setMenuAbierto, tema, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true, onVolverCatalogo,
}) {
  const dropdownRef = useRef(null);
  const notificacionesRef = useRef(null);

  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const { notificaciones, noLeidas, marcarComoLeida } = useNotificaciones();

  useClickOutside(dropdownRef, menuAbierto, () => setMenuAbierto(false));
  useClickOutside(notificacionesRef, mostrarNotificaciones, () => setMostrarNotificaciones(false), '[aria-label="Notificaciones"]');

  const [mostrarHeader, setMostrarHeader] = useState(true);
  const ultimoScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > ultimoScrollY.current && currentScrollY > 80) {
        setMostrarHeader(false);
      } else {
        setMostrarHeader(true);
      }
      ultimoScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-transform duration-300 ${tema.headerBg} ${tema.headerBorder} ${mostrarHeader ? 'max-md:translate-y-0' : 'max-md:-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 md:grid md:grid-cols-3">
        <div className="flex items-center gap-2 md:justify-self-start">
          {!mostrarFiltros && (
            <button
              onClick={onLogoClick}
              className="flex md:hidden items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
              </svg>
              Volver
            </button>
          )}
          <div
            className={`flex items-center gap-2 cursor-pointer ${!mostrarFiltros ? 'hidden md:flex' : ''}`}
            onClick={onLogoClick}
          >
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
        </div>

            {user && (user.id_rol === 2 || user.id_rol === 3 || user.id_rol === 4) ? (
          <div className="hidden md:block md:justify-self-center" />
        ) : mostrarFiltros ? (
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
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95 md:justify-self-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            Volver al Catálogo
          </button>
        )}

        <div className="relative flex items-center gap-4 md:justify-self-end" ref={dropdownRef}>
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => { setMostrarNotificaciones((prev) => !prev); setMenuAbierto(false); }}
                className={`relative ${tema.iconColor} hover:text-amber-400 transition-colors`}
                aria-label="Notificaciones"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {noLeidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {noLeidas}
                  </span>
                )}
              </button>
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
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''} ${tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          <div className="relative flex md:hidden">
            <button
              onClick={() => { setMostrarNotificaciones((prev) => !prev); setMenuAbierto(false); }}
              className="relative p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 text-white hover:text-amber-400"
              aria-label="Notificaciones"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {noLeidas > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {noLeidas}
                </span>
              )}
            </button>
          </div>

          {mostrarNotificaciones && (
            <div
              ref={notificacionesRef}
              className={`absolute right-0 top-12 z-50 w-80 rounded-xl shadow-2xl py-3 px-2 max-h-[70vh] overflow-y-auto transition-colors duration-300 ${tema.dropdownBorder}`}
              style={{ animation: 'dropdownIn 0.2s ease-out' }}
            >
                <div className={`rounded-xl ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'} ${tema.dropdownBorder}`}>
                  <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                    Notificaciones {noLeidas > 0 && `(${noLeidas} sin leer)`}
                  </p>
                  <div className={`h-px ${tema.headerBorder} mx-3`} />
                  {notificaciones.length === 0 ? (
                    <p className={`px-4 py-6 text-sm text-center ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                      No hay notificaciones
                    </p>
                  ) : (
                    notificaciones.map((notif) => (
                      <button
                        key={notif.id_notificacion}
                        onClick={() => {
                          if (!notif.leido) marcarComoLeida(notif.id_notificacion);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors duration-200 rounded-lg flex flex-col gap-1.5 ${
                          modoOscuro ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'
                        } ${notif.leido ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-semibold leading-tight ${notif.leido ? 'text-slate-500' : modoOscuro ? 'text-slate-100' : 'text-slate-800'}`}>
                            {notif.titulo}
                          </span>
                          {!notif.leido && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                            notif.emisor_rol === 'admin' ? 'text-purple-400' : 'text-amber-400'
                          }`}>
                            {notif.emisor_rol === 'admin' ? '📢 Aviso Institucional' : `🏀 ${notif.club_nombre || 'Club'}`}
                          </span>
                          <span className={`text-[10px] ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                            {new Date(notif.fecha_creacion).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
          )}

          <button
            onClick={() => { setMenuAbierto((prev) => !prev); setMostrarNotificaciones(false); }}
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
