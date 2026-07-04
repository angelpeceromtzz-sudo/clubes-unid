import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import logoLobo from '../../assets/logo-lobo.svg';
import { Icono } from '../ui/Icono';
import { BadgeNotificaciones } from './BadgeNotificaciones';
import { MenuUsuario } from './MenuUsuario';

const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];

export function BarraNavegacion({
  categoriaActiva, setCategoriaActiva,
  menuAbierto, setMenuAbierto, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true, onVolverCatalogo,
}) {
  const { tema } = useTheme();

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
              <Icono nombre="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.5} />
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
            <Icono nombre="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.5} />
            Volver al Catálogo
          </button>
        )}

        <div className="flex items-center gap-4 md:justify-self-end">
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <BadgeNotificaciones />
              <button onClick={onDashboardClick} className={`${tema.iconColor} hover:text-amber-400 transition-colors`} title="Dashboard">
                <Icono nombre="grid" className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          )}

          <BadgeNotificaciones className="flex md:hidden" />

          <MenuUsuario
            user={user}
            menuAbierto={menuAbierto}
            setMenuAbierto={setMenuAbierto}
            onDashboardClick={onDashboardClick}
            onLogout={onLogout}
            onLoginClick={onLoginClick}
          />
        </div>
      </div>
    </header>
    </>
  );
}
