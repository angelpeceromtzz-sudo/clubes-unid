import { useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { Icono } from './ui/Icono';

export function NavegacionInferiorMovil({ estaAutenticado, tieneInscripcionActiva, onLoginClick, onInicioClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { esAdmin, esPresidente } = useAutenticacion();

  const enPanel = location.pathname !== '/';

  function irPanel() {
    if (esAdmin) navigate('/admin/dashboard');
    else if (esPresidente) navigate('/presidente/dashboard');
    else navigate('/dashboard');
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-slate-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        <button
          onClick={() => { onInicioClick?.(); navigate('/'); }}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${!enPanel ? 'text-amber-400' : 'text-white'}`}
        >
          <Icono nombre="home" strokeWidth={2} className="h-5 w-5" />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>

        {tieneInscripcionActiva && (
          <button
            onClick={irPanel}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${enPanel ? 'text-amber-400' : 'text-white'}`}
          >
            <Icono nombre="clipboard" strokeWidth={2} className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mi Club</span>
          </button>
        )}

        <button
          onClick={estaAutenticado ? irPanel : onLoginClick}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${estaAutenticado && enPanel ? 'text-amber-400' : 'text-white'}`}
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
