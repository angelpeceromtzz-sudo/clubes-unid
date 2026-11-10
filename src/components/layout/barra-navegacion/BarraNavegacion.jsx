import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScrollHeader } from '../../../hooks/useScrollHeader';
import { Icono } from '../../ui/Icono';
import { BadgeNotificaciones } from '../BadgeNotificaciones';
import { MenuUsuario } from '../MenuUsuario';
import { Logotipo } from './Logotipo';
import { ModalAyuda } from '../navegacion/ModalAyuda';
import { BotonNoticias } from '../../noticias/BotonNoticias';
import { BotonCalendario } from '../../noticias/BotonCalendario';
import { BotonPortal } from './BotonPortal';

export function BarraNavegacion({
  menuAbierto, setMenuAbierto, onLogoClick,
  user, onLoginClick, onLogout, onPanelClick,
  mostrarFiltros = true,
  mostrarNoticias = false,
  mostrarLogo = false,
  heroVisible = true, contenidoMax,
  onScrollChange,
  splashActivo = false,
  itemsNav = [],
  onNavChange,
}) {
  const { tema, modoOscuro } = useTheme();
  const { scrolled } = useScrollHeader(onScrollChange);

  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  const maxWidthClasses = { '7xl': 'max-w-7xl', '6xl': 'max-w-6xl' };

  // El logotipo se muestra donde caben los filtros (el catálogo) y en los cuatro
  // paneles; donde no, se muestra la variante compacta "Volver al Portal".
  // (La landing /conoce-clubs no usa esta navbar: se monta con su propia barra.)
  const muestroLogo = mostrarFiltros || mostrarLogo;

  return (
    <>
      <header className={`sticky top-0 transition-colors duration-300 z-50 ${
        modoOscuro
          ? `lg:fixed lg:top-0 lg:left-0 lg:right-0 lg:w-full ${
              !scrolled && heroVisible
                ? 'border-transparent bg-gradient-to-b from-slate-950/100 via-slate-950/75 to-slate-950/0 backdrop-blur-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md border-b`
            }`
          : `${tema.headerBg} ${tema.headerBorder} border-b`
      }`}>
        {/* En los paneles el logo se alinea con los íconos/texto del sidebar: su
            nav usa px-3 y cada ítem px-4, o sea 28px desde el borde (pl-7). El
            padding derecho sigue siendo responsive; sólo cambia el izquierdo.
            En móvil el sidebar no existe, así que se conserva el px-6 base. */}
        <div className={`${
          contenidoMax
            ? `${maxWidthClasses[contenidoMax]} mx-auto px-6`
            : mostrarLogo
              ? 'w-full pl-6 md:pl-7 pr-6 sm:pr-8 lg:pr-10 xl:pr-16'
              : 'w-full px-6 sm:px-8 lg:px-10 xl:px-16'
        } h-16 flex items-center justify-between gap-2 md:gap-4 lg:gap-6`}>
          <div className="flex items-center gap-0 md:gap-2">
            <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className={`md:hidden p-1 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${modoOscuro ? 'text-white hover:text-amber-400' : 'text-slate-900 hover:text-amber-500'}`}
                aria-label="Menú"
              >
                <Icono nombre="menu" className="h-5 w-5" strokeWidth={2} />
              </button>
            {muestroLogo ? (
              <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={onLogoClick}>
                <Logotipo splashActivo={splashActivo} />
              </div>
            ) : (
              <div className="flex items-center shrink-0 cursor-pointer" onClick={onLogoClick} aria-label="Clubs UNID">
                <img draggable={false} src="/branding/lobounid.png" alt="Lobo UNID" className="h-8 sm:h-10 w-auto object-contain self-center" />
                <img draggable={false} src="/branding/clubs-unid.png" alt="Clubs UNID" className="h-9 sm:h-12 w-auto object-contain self-center -ml-1 sm:ml-0" />
              </div>
            )}
            {mostrarNoticias && user && (
              <div className="hidden md:flex items-center gap-0 shrink-0">
                <BotonNoticias colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />
                <BotonCalendario colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 ml-auto shrink-0">
            {mostrarNoticias && user && (
              <div className="flex md:hidden items-center gap-0 shrink-0">
                <BotonNoticias colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />
                <BotonCalendario colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />
              </div>
            )}
            <BotonPortal />
            {user && (
              <div className="hidden lg:flex items-center gap-3">
                <BadgeNotificaciones colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />
                <button onClick={onPanelClick}
                  className={`p-2 rounded-full cursor-pointer ${modoOscuro ? tema.btnInactive : 'bg-transparent text-[#0B1535] hover:text-amber-500 rounded-full'} hover:text-amber-500 transition-colors`}
                  title="Panel"
                >
                  <Icono nombre="grid" className="h-6 w-6" strokeWidth={2} />
                </button>
              </div>
            )}
            {user && <BadgeNotificaciones className="flex lg:hidden" variante="modal" colorClase={modoOscuro ? '' : 'text-[#0B1535]'} />}

            {!user && (
              <button
                onClick={() => setMenuAbierto((prev) => !prev)}
                className={`hidden md:inline-flex p-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${modoOscuro ? 'text-white hover:text-amber-400' : 'text-slate-900 hover:text-amber-500'}`}
                aria-label="Menú"
              >
                <Icono nombre="menu" className="h-5 w-5" strokeWidth={2} />
              </button>
            )}

            <MenuUsuario
              user={user}
              menuAbierto={menuAbierto}
              setMenuAbierto={setMenuAbierto}
              onPanelClick={onPanelClick}
              onLogout={onLogout}
              onLoginClick={onLoginClick}
              onAyuda={() => setMostrarAyuda(true)}
              itemsNav={itemsNav}
              onNavChange={onNavChange}
              ocultarHamburguesa={true}
            />
          </div>
        </div>
      </header>

      <ModalAyuda show={mostrarAyuda} onClose={() => setMostrarAyuda(false)} />
    </>
  );
}
