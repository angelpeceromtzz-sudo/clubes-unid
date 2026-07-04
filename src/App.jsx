import { useState, useCallback } from 'react';
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
import { useClubes } from './hooks/useClubes';
import { useAuthRedirect } from './hooks/useAuthRedirect';

function App() {
  const { esAdmin, esPresidente, esRectoria, usuario, cerrarSesion, tieneInscripcionActiva } = useAutenticacion();
  const { tema } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { clubesFiltrados, clubesLoading, categoriaActiva, setCategoriaActiva } = useClubes();
  const { redirigirPostLogin } = useAuthRedirect();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [clubDetalleVisible, setClubDetalleVisible] = useState(false);
  const [catalogoKey, setCatalogoKey] = useState(0);

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
    redirigirPostLogin();
  }, [redirigirPostLogin]);

  function handleLogout() {
    cerrarSesion();
    navigate('/');
    setMenuAbierto(false);
  }

  useEffect(() => {
    if (location.pathname !== '/') {
      setClubDetalleVisible(false);
    }
  }, [location.pathname]);

  const mostrarFiltros = location.pathname === '/' && !clubDetalleVisible;

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
    if (clubDetalleVisible) {
      setCatalogoKey(k => k + 1);
    }
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${tema.bg} ${tema.text}`}>
      <BarraNavegacion
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        onLogoClick={irACatalogo}
        user={usuario}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
        onDashboardClick={irADashboard}
        mostrarFiltros={mostrarFiltros}
        onVolverCatalogo={irACatalogo}
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
            onClubDetalleChange={setClubDetalleVisible}
          />
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
