/* Navegación inferior fija para móvil con acceso a inicio, panel del club y perfil/inicio de sesión. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { Icono } from '../ui/Icono';

export function NavegacionInferiorMovil({ estaAutenticado, tieneInscripcionActiva, onLoginClick, onInicioClick }) {
  const { modoOscuro } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { esAdmin, esPresidente } = useAutenticacion();

  const [mostrarNav, setMostrarNav] = useState(true);
  const ultimoScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > ultimoScrollY.current && currentScrollY > 80) {
        setMostrarNav(false);
      } else {
        setMostrarNav(true);
      }
      ultimoScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const enPanel = location.pathname !== '/';

  function irPanel() {
    if (esAdmin) navigate('/admin/dashboard');
    else if (esPresidente) navigate('/presidente/dashboard');
    else navigate('/dashboard');
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom border-t transition-transform duration-300 ${mostrarNav ? 'translate-y-0' : 'translate-y-full'} ${modoOscuro ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
      <div className="flex items-center justify-around py-2 px-4">
        <button
          onClick={() => { onInicioClick?.(); navigate('/'); }}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${!enPanel ? 'text-amber-400' : modoOscuro ? 'text-white' : 'text-slate-600'}`}
        >
          <Icono nombre="home" strokeWidth={2} className="h-5 w-5" />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>

        {tieneInscripcionActiva && (
          <button
            onClick={irPanel}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${enPanel ? 'text-amber-400' : modoOscuro ? 'text-white' : 'text-slate-600'}`}
          >
            <Icono nombre="clipboard" strokeWidth={2} className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mi Club</span>
          </button>
        )}

        <button
          onClick={estaAutenticado ? irPanel : onLoginClick}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${estaAutenticado && enPanel ? 'text-amber-400' : modoOscuro ? 'text-white' : 'text-slate-600'}`}
        >
          {estaAutenticado ? (
            <Icono nombre="profile" strokeWidth={2} className="h-5 w-5" />
          ) : (
            <Icono nombre="logout" strokeWidth={2} className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">{estaAutenticado ? 'Perfil' : 'Iniciar Sesión'}</span>
        </button>
      </div>
    </nav>
  );
}
