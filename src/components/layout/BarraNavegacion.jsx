import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import logoLobo from '../../assets/logo-lobo.svg';
import { Icono } from '../ui/Icono';
import { BadgeNotificaciones } from './BadgeNotificaciones';
import { MenuUsuario } from './MenuUsuario';
import { FiltrosEstado } from './navegacion/FiltrosEstado';
import { DesplegableCategoria } from './navegacion/DesplegableCategoria';
import { ModalAyuda } from './navegacion/ModalAyuda';

export function BarraNavegacion({
  categoriaActiva, setCategoriaActiva,
  estadoActivo, setEstadoActivo,
  menuAbierto, setMenuAbierto, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true, onVolverCatalogo,
  heroVisible = true, contenidoMax,
  onScrollChange,
  splashActivo = false,
}) {
  const { tema, modoOscuro } = useTheme();

  const [scrolled, setScrolled] = useState(() => window.scrollY > 5);
  const [mostrarHeader, setMostrarHeader] = useState(true);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [menuCategoria, setMenuCategoria] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [esMobile, setEsMobile] = useState(() => window.innerWidth < 768);
  const ultimoScrollY = useRef(0);
  const catDesktopRef = useRef(null);
  const catMobileRef = useRef(null);

  useClickOutside(catDesktopRef, menuCategoria, () => setMenuCategoria(false), '.nf-mobile-cat-dropdown');
  useClickOutside(catMobileRef, menuCategoria && esMobile, () => setMenuCategoria(false), '.nf-mobile-cat-dropdown');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrolled = currentScrollY > 5;
      setScrolled(isScrolled);
      if (onScrollChange) onScrollChange(isScrolled);
      if (currentScrollY > ultimoScrollY.current && currentScrollY > 80) {
        setMostrarHeader(false);
        setMenuCategoria(false);
      } else {
        setMostrarHeader(true);
      }
      ultimoScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScrollChange]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setEsMobile(e.matches);
    mq.addEventListener('change', handler);
    setEsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useLayoutEffect(() => {
    if (esMobile && menuCategoria && catMobileRef.current) {
      const rect = catMobileRef.current.getBoundingClientRect();
      const dropdownWidth = 192;
      const safePadding = 8;
      const left = rect.left + dropdownWidth > window.innerWidth
        ? window.innerWidth - dropdownWidth - safePadding
        : rect.left;
      setDropdownPos({ top: rect.bottom + 4, left });
    }
  }, [esMobile, menuCategoria]);

  const labelCategoria = categoriaActiva === 'Todos' ? 'Categorías' : `Categoría: ${categoriaActiva}`;
  const maxWidthClasses = { '7xl': 'max-w-7xl', '6xl': 'max-w-6xl' };

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <header
        className={`sticky top-0 border-b transition-colors duration-300 z-50 ${
          modoOscuro
            ? `lg:fixed lg:top-0 lg:left-0 lg:right-0 lg:w-full ${
                !scrolled && heroVisible
                  ? 'bg-transparent border-transparent'
                  : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md`
              }`
            : `${tema.headerBg} ${tema.headerBorder}`
        }`}
      >
      <div className={`${contenidoMax ? `${maxWidthClasses[contenidoMax]} mx-auto px-6` : 'w-full px-6 sm:px-8 lg:px-10 xl:px-16'} ${mostrarFiltros ? 'py-2.5 md:py-3' : 'py-1.5 md:py-3'} flex items-center justify-between gap-2 md:gap-4 lg:gap-6`}>
        <div className="flex items-center gap-4 md:gap-6">
          {mostrarFiltros ? (
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={onLogoClick}
            >
              <img src={logoLobo} alt="Logo" id="navbar-logo" className={`w-10 h-10 lg:w-12 lg:h-12 shrink-0 transition-opacity duration-200 ${splashActivo ? 'opacity-0' : 'opacity-100'}`} />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm sm:text-base lg:text-sm font-black tracking-tight transition-colors duration-300 ${tema.logoText}`}>
                    UNID
                  </span>
                  <span className="text-[9px] sm:text-[10px] lg:text-[9px] uppercase tracking-widest text-white font-black leading-tight">
                    Campeche
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] lg:text-[9px] uppercase tracking-widest text-amber-400 font-black leading-tight">
                  Clubs Lobos Rojos
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogoClick}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 md:bg-amber-400/10 md:border md:border-amber-400/20 md:px-3 md:py-1.5 md:rounded-full transition-colors cursor-pointer active:scale-95"
            >
              <Icono nombre="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.5} />
              Volver al Portal
            </button>
          )}

          {mostrarFiltros && (
            <>
              <FiltrosEstado estadoActivo={estadoActivo} setEstadoActivo={setEstadoActivo} variante="desktop" />
              <div className="relative hidden lg:block" ref={catDesktopRef}>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setMenuCategoria((v) => !v)}
                  className={`inline-flex items-center gap-1 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
                    categoriaActiva !== 'Todos'
                      ? 'rounded-full text-white bg-amber-500 shadow-sm shadow-amber-500/30'
                      : `rounded-md ${modoOscuro ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'}`
                  }`}
                >
                  {labelCategoria}
                  <Icono nombre="chevron-down" strokeWidth={2.5} className={`h-3 w-3 transition-transform duration-200 ${menuCategoria ? 'rotate-180' : ''}`} />
                </button>
                {menuCategoria && !esMobile && (
                  <div ref={catMobileRef}>
                    <DesplegableCategoria
                      categoriaActiva={categoriaActiva}
                      setCategoriaActiva={setCategoriaActiva}
                      menuCategoria={menuCategoria}
                      setMenuCategoria={setMenuCategoria}
                      esMobile={false}
                      dropdownPos={dropdownPos}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 lg:gap-4 ml-auto shrink-0">
          {user && (
            <div className="hidden lg:flex items-center gap-3">
              <BadgeNotificaciones />
              <button onClick={onDashboardClick} className={`p-2 rounded-full cursor-pointer ${modoOscuro ? 'md:bg-[#0b111e]/60 md:backdrop-blur-md md:hover:bg-[#0b111e]/70' : ''} ${tema.iconColor} hover:text-amber-400 transition-colors`} title="Dashboard">
                <Icono nombre="grid" className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          )}

          {user && <BadgeNotificaciones className="flex lg:hidden" />}

          <MenuUsuario
            user={user}
            menuAbierto={menuAbierto}
            setMenuAbierto={setMenuAbierto}
            onDashboardClick={onDashboardClick}
            onLogout={onLogout}
            onLoginClick={onLoginClick}
            onAyuda={() => setMostrarAyuda(true)}
          />
        </div>
      </div>
    </header>

    {mostrarFiltros && (
      <div className={`md:hidden sticky top-[57px] z-40 border-b transition-all duration-300 ${
        modoOscuro
          ? (!scrolled && heroVisible
              ? 'bg-transparent border-transparent'
              : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md`)
          : `${tema.headerBg} ${tema.headerBorder}`
      } ${mostrarHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <FiltrosEstado estadoActivo={estadoActivo} setEstadoActivo={setEstadoActivo} variante="mobile" />
      </div>
    )}

    {menuCategoria && esMobile && (
      <DesplegableCategoria
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        menuCategoria={menuCategoria}
        setMenuCategoria={setMenuCategoria}
        esMobile={true}
        dropdownPos={dropdownPos}
      />
    )}

    <ModalAyuda show={mostrarAyuda} onClose={() => setMostrarAyuda(false)} />
    </>
  );
}
