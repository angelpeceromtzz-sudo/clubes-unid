import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScrollHeader } from '../../../hooks/useScrollHeader';
import { Icono } from '../../ui/Icono';
import { BadgeNotificaciones } from '../BadgeNotificaciones';
import { MenuUsuario } from '../MenuUsuario';
import { Logotipo } from './Logotipo';
import { ModalAyuda } from '../navegacion/ModalAyuda';
import { BotonNoticias } from '../../noticias/BotonNoticias';

export function BarraNavegacion({
  menuAbierto, setMenuAbierto, onLogoClick,
  user, onLoginClick, onLogout, onDashboardClick,
  mostrarFiltros = true,
  heroVisible = true, contenidoMax,
  onScrollChange,
  splashActivo = false,
}) {
  const { tema, modoOscuro } = useTheme();
  const { scrolled } = useScrollHeader(onScrollChange);

  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  const maxWidthClasses = { '7xl': 'max-w-7xl', '6xl': 'max-w-6xl' };

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
        <div className={`${contenidoMax ? `${maxWidthClasses[contenidoMax]} mx-auto px-6` : 'w-full px-6 sm:px-8 lg:px-10 xl:px-16'} py-2.5 md:py-3 flex items-center justify-between gap-2 md:gap-4 lg:gap-6`}>
          <div className="flex items-center gap-4 md:gap-6">
            {mostrarFiltros ? (
              <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={onLogoClick}>
                <Logotipo splashActivo={splashActivo} />
              </div>
            ) : (
              <button onClick={onLogoClick}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 md:bg-amber-400/10 md:border md:border-amber-400/20 md:px-3 md:py-1.5 md:rounded-full transition-colors cursor-pointer active:scale-95"
              >
                <Icono nombre="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.5} />
                Volver al Portal
              </button>
            )}

            {mostrarFiltros && (
              <div className="hidden lg:block shrink-0">
                <BotonNoticias />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 ml-auto shrink-0">
            {mostrarFiltros && <BotonNoticias className="lg:hidden" />}
            {user && (
              <div className="hidden lg:flex items-center gap-3">
                <BadgeNotificaciones />
                <button onClick={onDashboardClick}
                  className={`p-2 rounded-full cursor-pointer ${modoOscuro ? 'md:bg-[#0b111e]/60 md:backdrop-blur-md md:hover:bg-[#0b111e]/70' : ''} ${tema.iconColor} hover:text-amber-400 transition-colors`}
                  title="Dashboard"
                >
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

      <ModalAyuda show={mostrarAyuda} onClose={() => setMostrarAyuda(false)} />
    </>
  );
}
