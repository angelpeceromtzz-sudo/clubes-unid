import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { BarraNavegacion } from './components/BarraNavegacion';
import { PiePagina } from './components/PiePagina';
import { ModalInicioSesion } from './components/ModalInicioSesion';
import { NavegacionInferiorMovil } from './components/NavegacionInferiorMovil';
import { RutaProtegida } from './components/RutaProtegida';
import { PanelAlumno } from './pages/PanelAlumno';
import { PanelPresidente } from './pages/PanelPresidente';
import { PanelAdmin } from './pages/PanelAdmin';
import { PanelRectoria } from './pages/PanelRectoria';
import { PaginaInicio } from './pages/PaginaInicio';
import { api, getSession } from './services/api';

function App() {
  const { estaAutenticado, esAdmin, esPresidente, esRectoria, usuario, cerrarSesion, refrescarInscripcionActiva, tieneInscripcionActiva } = useAutenticacion();
  const { modoOscuro, setModoOscuro, tema } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [clubes, setClubes] = useState([]);
  const [clubesLoading, setClubesLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [clubDetalleVisible, setClubDetalleVisible] = useState(false);
  const [catalogoKey, setCatalogoKey] = useState(0);

  useEffect(() => {
    async function loadClubes() {
      try {
        const data = await api.getClubes();
        setClubes(data);
      } catch {
        setClubes([]);
      } finally {
        setClubesLoading(false);
      }
    }
    loadClubes();
    const session = getSession();
    if (session?.user) {
      refrescarInscripcionActiva();
    }
  }, [refrescarInscripcionActiva]);

  const autenticacionAnterior = useRef(estaAutenticado);
  const [redireccionPendiente, setRedireccionPendiente] = useState(false);

  useEffect(() => {
    if (estaAutenticado && !autenticacionAnterior.current) {
      const sesion = getSession();
      if (sesion?.user) {
        const { id_rol } = sesion.user;
        if (id_rol === 4) {
          navigate('/rectoria/dashboard', { replace: true });
        } else if (id_rol === 3) {
          navigate('/admin/dashboard', { replace: true });
        } else if (id_rol === 2) {
          navigate('/presidente/dashboard', { replace: true });
        } else if (id_rol === 1 && tieneInscripcionActiva) {
          navigate('/dashboard', { replace: true });
        } else if (id_rol === 1) {
          setRedireccionPendiente(true);
        } else {
          console.warn('[ROUTING] Rol desconocido:', id_rol);
          navigate('/', { replace: true });
        }
      }
    }
    autenticacionAnterior.current = estaAutenticado;
  }, [estaAutenticado, navigate, tieneInscripcionActiva]);

  useEffect(() => {
    if (redireccionPendiente && tieneInscripcionActiva) {
      navigate('/dashboard', { replace: true });
      setRedireccionPendiente(false);
    }
  }, [redireccionPendiente, tieneInscripcionActiva, navigate]);

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
    const session = getSession();
    if (session?.user) {
      const { id_rol } = session.user;
      if (id_rol === 4) {
        navigate('/rectoria/dashboard', { replace: true });
      } else if (id_rol === 3) {
        navigate('/admin/dashboard', { replace: true });
      } else if (id_rol === 2) {
        navigate('/presidente/dashboard', { replace: true });
      } else if (id_rol === 1) {
        api.getInscripcionActiva().then((insc) => {
          if (insc) navigate('/dashboard', { replace: true });
        }).catch(() => {});
      }
    }
  }, [navigate]);

  function handleLogout() {
    cerrarSesion();
    navigate('/');
    setMenuAbierto(false);
  }

  const clubesFiltrados = clubes
    .filter((club) => club.id_estatus_club !== 3)
    .filter(
      (club) =>
        categoriaActiva === 'Todos' || club.categoria === categoriaActiva
    );

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
