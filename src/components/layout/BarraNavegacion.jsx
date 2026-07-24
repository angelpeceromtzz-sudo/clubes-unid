/* Barra de navegación superior con logo, filtro de estado (pills), dropdown de categoría, acciones de usuario y badge de notificaciones. Se oculta al hacer scroll hacia abajo en móvil. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import logoLobo from '../../assets/logo-lobo.svg';
import { Icono } from '../ui/Icono';
import { BadgeNotificaciones } from './BadgeNotificaciones';
import { MenuUsuario } from './MenuUsuario';
import { ModalBase } from '../ui/ModalBase';

const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];
const ESTADOS = ["Todos", "Abiertos", "Proximos", "Llenos"];

export function BarraNavegacion({
  categoriaActiva, setCategoriaActiva,
  estadoActivo, setEstadoActivo,
  menuAbierto, setMenuAbierto, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true, onVolverCatalogo,
  heroVisible = true,
  onScrollChange,
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

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <header
        className={`sticky top-0 md:fixed md:top-0 md:left-0 md:right-0 md:w-full z-50 border-b transition-colors duration-300 ${
          !scrolled && heroVisible
            ? 'bg-transparent border-transparent'
            : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md`
        }`}
      >
      <div className={`w-full px-6 sm:px-8 lg:px-12 xl:px-16 ${mostrarFiltros ? 'py-2 md:py-3' : 'py-1.5 md:py-3'} flex items-center justify-between gap-2 md:gap-3 md:grid md:grid-cols-3`}>
        <div className="flex items-center gap-2 md:justify-self-start">
          {mostrarFiltros ? (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={onLogoClick}
            >
              <img src={logoLobo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
              <div>
                <span className={`text-base sm:text-lg font-black tracking-tight transition-colors duration-300 ${tema.logoText}`}>
                  UNID
                </span>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-amber-400 font-black leading-tight">
                  Clubs Lobos Rojos
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogoClick}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer active:scale-95"
            >
              <Icono nombre="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.5} />
              Volver
            </button>
          )}
        </div>

        {mostrarFiltros ? (
          <div className="hidden md:flex items-center justify-center gap-2 md:justify-self-center">
            <nav className={`inline-flex items-center transition-colors duration-300 ${tema.navPill}`}>
              {ESTADOS.map((est) => (
                <button
                  key={est}
                  onClick={() => setEstadoActivo(est)}
                  className={`font-bold text-xs tracking-wide px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95 ${
                    estadoActivo === est ? tema.btnActive : tema.btnInactive
                  }`}
                >
                  {est}
                </button>
              ))}
              <div className={`w-px h-4 mx-1 ${modoOscuro ? 'bg-slate-600' : 'bg-slate-300'}`} />
              <div className="relative" ref={catDesktopRef}>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setMenuCategoria((v) => !v)}
                  className={`inline-flex items-center gap-1.5 font-bold text-xs tracking-wide px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95 rounded-full ${
                    categoriaActiva !== 'Todos' ? tema.btnActive : tema.btnInactive
                  }`}
                >
                  {labelCategoria}
                  <Icono nombre="chevron-down" strokeWidth={2.5} className={`h-3 w-3 transition-transform duration-200 ${menuCategoria ? 'rotate-180' : ''}`} />
                </button>
                {menuCategoria && (
                  <div
                    className={`absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border shadow-2xl py-1 transition-colors duration-300 ${tema.dropdownBg} ${tema.dropdownBorder}`}
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                  >
                    {CATEGORIAS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategoriaActiva(cat); setMenuCategoria(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg mx-1 ${tema.dropdownItem} ${tema.text} flex items-center justify-between`}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        {cat}
                        {categoriaActiva === cat && (
                          <Icono nombre="check" strokeWidth={2.5} className="h-4 w-4 text-amber-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
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

          {user && <BadgeNotificaciones className="flex md:hidden" />}

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
        !scrolled && heroVisible
          ? 'bg-transparent border-transparent'
          : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md`
      } ${mostrarHeader ? 'translate-y-0' : '-translate-y-full'}`}>
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <style>{`.nf-mobile-filter::-webkit-scrollbar { display: none; }`}</style>
          {ESTADOS.map((est) => (
            <button
              key={est}
              onClick={() => setEstadoActivo(est)}
              className={`nf-mobile-filter shrink-0 font-bold text-xs tracking-wide px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${
                estadoActivo === est ? tema.btnActive : tema.btnInactive
              }`}
            >
              {est}
            </button>
          ))}
          <div className="relative shrink-0" ref={catMobileRef}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMenuCategoria((v) => !v)}
              className={`nf-mobile-filter inline-flex items-center gap-1.5 font-bold text-xs tracking-wide px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${
                categoriaActiva !== 'Todos'
                  ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                  : modoOscuro
                    ? 'text-slate-300 border-slate-600'
                    : 'text-slate-600 border-slate-300'
              }`}
            >
              {labelCategoria}
              <Icono nombre="chevron-down" strokeWidth={2.5} className={`h-3 w-3 transition-transform duration-200 ${menuCategoria ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    )}

    {menuCategoria && esMobile && createPortal(
      <div
        className={`nf-mobile-cat-dropdown fixed z-50 w-48 rounded-xl border shadow-2xl py-1 ${tema.dropdownBg} ${tema.dropdownBorder}`}
        style={{ top: dropdownPos.top, left: dropdownPos.left, animation: 'dropdownIn 0.15s ease-out' }}
      >
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategoriaActiva(cat); setMenuCategoria(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg mx-1 ${tema.dropdownItem} ${tema.text} flex items-center justify-between`}
            style={{ width: 'calc(100% - 8px)' }}
          >
            {cat}
            {categoriaActiva === cat && (
              <Icono nombre="check" strokeWidth={2.5} className="h-4 w-4 text-amber-400" />
            )}
          </button>
        ))}
      </div>,
      document.body
    )}

    <ModalBase show={mostrarAyuda} onClose={() => setMostrarAyuda(false)} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Ayuda</h3>
        <button onClick={() => setMostrarAyuda(false)} className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>
      <div className={`space-y-4 text-sm leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
        <p>
          <strong className="text-amber-400">Clubs UNID</strong> es la plataforma de registro y gestión de clubs universitarios.
        </p>
        <div className={`space-y-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          <p><span className="text-amber-400 font-bold">•</span> Explora el catálogo y postúlate a hasta 3 clubs.</p>
          <p><span className="text-amber-400 font-bold">•</span> Sigue el estado de tus postulaciones en tu panel.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres presidente, gestiona solicitudes y convocatorias desde el dashboard.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres administrador, gestiona usuarios, clubs y roles.</p>
        </div>
        <p className={`text-xs pt-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          ¿Dudas o reportes? Contacta al administrador del sistema.
          contacto@red.unid.mx
        </p>
      </div>
    </ModalBase>
    </>
  );
}
