/* Punto de entrada principal. Renderiza la barra de navegación, las rutas (inicio, dashboard por rol) y el modal de inicio de sesión. */
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { BarraNavegacion } from './components/layout/BarraNavegacion';
import { PiePagina } from './components/layout/PiePagina';
import { ModalInicioSesion } from './components/modals/ModalInicioSesion';
import { NavegacionInferiorMovil } from './components/layout/NavegacionInferiorMovil';
import { RutaProtegida } from './components/layout/RutaProtegida';
import { PanelAlumno } from './pages/PanelAlumno';
import { PanelPresidente } from './pages/PanelPresidente';
import { PanelAdmin } from './pages/PanelAdmin';
import { PanelRectoria } from './pages/PanelRectoria';
import { PaginaInicio } from './pages/PaginaInicio';
import { DetalleClub } from './components/clubes/DetalleClub';
import { useClubes } from './hooks/useClubes';
import { useAuthRedirect } from './hooks/useAuthRedirect';
import { NAVBAR_HEIGHT } from './config/layout';

function App() {
  const { estaAutenticado, esAdmin, esPresidente, esRectoria, usuario, cerrarSesion, tieneInscripcionActiva } = useAutenticacion();
  const { tema } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { clubesFiltrados, clubesLoading, categoriaActiva, setCategoriaActiva, estadoActivo, setEstadoActivo } = useClubes();
  const { redirigirPostLogin } = useAuthRedirect();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [catalogoKey, setCatalogoKey] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    setHeroVisible(true);
    if (window.innerWidth < 768) return;
    const timer = setTimeout(() => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (!entry.isIntersecting) { setHeroVisible(false); observer.disconnect(); } },
        { threshold: 0 }
      );
      observer.observe(hero);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
    redirigirPostLogin();
  }, [redirigirPostLogin]);

  function handleLogout() {
    cerrarSesion();
    navigate('/');
    setMenuAbierto(false);
  }

  const mostrarFiltros = location.pathname === '/';

  function irADashboard() {
    if (esAdmin) {
      navigate('/admin/dashboard');
    } else if (esPresidente) {
      navigate('/presidente/dashboard');
    } else if (esRectoria) {
      navigate('/rectoria/dashboard');
    } else {
      navigate('/dashboard');
    }
    setMenuAbierto(false);
  }

  function irACatalogo() {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 pb-16 md:pb-0 md:pt-[var(--navbar-height)] ${tema.bg} ${tema.text}`}
      style={{ '--navbar-height': location.pathname === '/' ? '0px' : `${NAVBAR_HEIGHT}px` }}
    >
      <BarraNavegacion
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        estadoActivo={estadoActivo}
        setEstadoActivo={setEstadoActivo}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        onLogoClick={irACatalogo}
        user={usuario}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
        onDashboardClick={irADashboard}
        mostrarFiltros={mostrarFiltros}
        onVolverCatalogo={irACatalogo}
        heroVisible={heroVisible}
      />

      {showLogin && (
        <ModalInicioSesion onClose={handleLoginSuccess} />
      )}

      <Routes>
        <Route path="/" element={
          <PaginaInicio key={catalogoKey}
            clubes={clubesFiltrados}
            clubesLoading={clubesLoading}
            onLoginClick={() => setShowLogin(true)}
          />
        } />
        <Route path="/club/:id" element={
          <DetalleClub onLoginClick={() => setShowLogin(true)} />
        } />
        <Route path="/dashboard" element={
          <RutaProtegida>
            <PanelAlumno />
          </RutaProtegida>
        } />
        <Route path="/presidente/dashboard" element={
          <RutaProtegida requierePresidente>
            <PanelPresidente />
          </RutaProtegida>
        } />
        <Route path="/admin/dashboard" element={
          <RutaProtegida requiereAdmin>
            <PanelAdmin />
          </RutaProtegida>
        } />
        <Route path="/rectoria/dashboard" element={
          <RutaProtegida requiereRectoria>
            <PanelRectoria />
          </RutaProtegida>
        } />
      </Routes>

      <NavegacionInferiorMovil
        estaAutenticado={estaAutenticado}
        tieneInscripcionActiva={tieneInscripcionActiva}
        onLoginClick={() => setShowLogin(true)}
        onInicioClick={irACatalogo}
      />
      {location.pathname === '/' && <PiePagina />}
    </div>
  );
}

export default App;
