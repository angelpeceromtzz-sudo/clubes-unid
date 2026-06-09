const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];

export function Navbar({ categoriaActiva, setCategoriaActiva, modoOscuro, setModoOscuro, menuAbierto, setMenuAbierto, tema }) {
  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${tema.headerBg} ${tema.headerBorder}`}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 100" className="h-10 w-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35 45 L20 20 L40 35 L50 25 L60 35 L80 20 L65 45 Q75 50 80 60 L85 75 L70 80 L65 70 L60 85 L50 75 L40 85 L35 70 L30 80 L15 75 L20 60 Q25 50 35 45Z" fill="#FBBF24" />
            <circle cx="38" cy="52" r="4.5" fill="#0e162c" />
            <circle cx="62" cy="52" r="4.5" fill="#0e162c" />
            <ellipse cx="50" cy="68" rx="7" ry="4.5" fill="#0e162c" />
          </svg>
          <div>
            <span className={`text-base sm:text-lg font-black tracking-tight transition-colors duration-300 ${tema.logoText}`}>
              UNID
            </span>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-amber-400 font-bold leading-tight">
              Campus de Clubes Lobos Rojos
            </p>
          </div>
        </div>

        <nav className={`inline-flex items-center transition-colors duration-300 ${tema.navPill}`}>
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

        <div className="relative flex items-center gap-4">
          <button className={`${tema.iconColor} hover:text-amber-400 transition-colors text-lg`} title="Notificaciones">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className={`${tema.iconColor} hover:text-amber-400 transition-colors text-lg`} title="Correo">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={() => setMenuAbierto((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className={`text-sm font-medium hidden sm:inline transition-colors duration-300 ${tema.profileText}`}>
              Ángel Antonio Pecero M.
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${menuAbierto ? "rotate-180" : ""} ${tema.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(false)} />
              <div className={`absolute right-0 top-12 z-50 w-56 rounded-xl border shadow-2xl py-2 transition-colors duration-300 ${tema.dropdownBg} ${tema.dropdownBorder}`}>
                <button
                  onClick={() => { setModoOscuro((prev) => !prev); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
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
                <button className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ayuda
                </button>
                <button
                  onClick={() => { window.print(); setMenuAbierto(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprime esta página
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Español
                </button>
                <div className={`h-px ${tema.headerBorder} mx-3`} />
                <button className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${tema.dropdownItem} ${tema.text} flex items-center gap-3`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
