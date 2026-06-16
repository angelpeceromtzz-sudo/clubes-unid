export function MobileBottomNav({ isAuthenticated, tieneInscripcionActiva, view, onNavigate, onLoginClick }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-slate-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        <button
          onClick={() => onNavigate('catalogo')}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${view === 'catalogo' ? 'text-amber-400' : 'text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">Inicio</span>
        </button>

        {tieneInscripcionActiva && (
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${view === 'dashboard' || view === 'admin' ? 'text-amber-400' : 'text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-[10px] font-medium">Mi Club</span>
          </button>
        )}

        <button
          onClick={isAuthenticated ? () => onNavigate('dashboard') : onLoginClick}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${isAuthenticated && (view === 'dashboard' || view === 'admin') ? 'text-amber-400' : 'text-white'}`}
        >
          {isAuthenticated ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
          <span className="text-[10px] font-medium">{isAuthenticated ? 'Perfil' : 'Iniciar Sesión'}</span>
        </button>
      </div>
    </nav>
  );
}
