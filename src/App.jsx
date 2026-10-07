/* Punto de entrada principal. Renderiza la barra de navegación, las rutas (inicio, dashboard por rol) y el modal de inicio de sesión. */
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { BarraNavegacion } from './components/layout/barra-navegacion/BarraNavegacion';
import { PiePagina } from './components/layout/PiePagina';
import { ModalInicioSesion } from './components/modals/ModalInicioSesion';
import { NavegacionInferiorMovil } from './components/layout/paneles-navegacion/NavegacionInferiorMovil';
import { RutaProtegida } from './components/layout/RutaProtegida';
import { PanelAlumno } from './pages/PanelAlumno';
import { PanelPresidente } from './pages/PanelPresidente';
import { PanelAdmin } from './pages/PanelAdmin';
import { PanelRectoria } from './pages/PanelRectoria';
import { PaginaInicio } from './pages/PaginaInicio';
import { DetalleClub } from './components/clubes/DetalleClub';
import PaginaEncuesta from './pages/PaginaEncuesta';
import { useClubes } from './hooks/useClubes';
import { useAuthRedirect } from './hooks/useAuthRedirect';
import { SplashScreen } from './components/ui/SplashScreen';
import { NAVBAR_HEIGHT, NAVBAR_HEIGHT_LOGO } from './constants/limites';

function App() {
  const { estaAutenticado, authReady, esAdmin, esPresidente, esRectoria, usuario, cerrarSesion, tieneInscripcionActiva } = useAutenticacion();
  const { tema, modoOscuro } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { clubesFiltrados, clubesLoading, categoriaActiva, setCategoriaActiva, estadoActivo, setEstadoActivo } = useClubes();
  const { redirigirPostLogin } = useAuthRedirect();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [catalogoKey] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  const handleScrollChange = useCallback((isScrolled) => {
    setHeroVisible(!isScrolled);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroVisible(window.scrollY <= 5);
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

  // Los cuatro paneles muestran el logotipo completo en la navbar; el detalle de
  // club conserva la variante compacta ("Volver al Portal"), y por eso su altura
  // coincide con NAVBAR_HEIGHT y no con la del logotipo de NAVBAR_HEIGHT_LOGO.
  const esRutaPanel = ['/dashboard', '/presidente/dashboard', '/admin/dashboard', '/rectoria/dashboard'].includes(location.pathname);
  const alturaNavbar = esRutaPanel ? NAVBAR_HEIGHT_LOGO : NAVBAR_HEIGHT;

  // La encuesta pública se monta FUERA del layout de abajo, a propósito: es la
  // única ruta que no vive dentro de la aplicación. El catálogo ("/" y
  // "/club/:id") también se puede ver sin sesión, pero se muestra con la navbar y
  // el botón de iniciar sesión; quien abre un enlace de encuesta no tiene por qué
  // ver menús que no puede usar. Por eso va con un return temprano y no como un
  // <Route> más.
  //
  // Este return tiene que declarar su propio <Routes>. Montar la página suelta
  // aquí fuera de cualquier <Route> la dejaba sin contexto de enrutado, y
  // useParams() devolvía {}: el slug llegaba como undefined y la pantalla pedía
  // `/api/encuestas/publico/undefined` aunque el enlace fuera correcto.
  //
  // El key en el pathname hace que cambiar de enlace remonte el componente y
  // que las respuestas de la encuesta anterior no queden pegadas.
  if (location.pathname.startsWith('/encuesta/')) {
    return (
      <Routes>
        <Route
          path="/encuesta/:slug"
          element={<PaginaEncuesta key={location.pathname} />}
        />
      </Routes>
    );
  }

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
      className={`min-h-screen font-sans transition-colors duration-300 pb-16 lg:pb-0 lg:pt-[var(--navbar-height)] ${tema.bg} ${tema.text}`}
      style={{ '--navbar-height': modoOscuro && location.pathname !== '/' ? `${alturaNavbar}px` : '0px' }}
    >
      <SplashScreen authReady={authReady} clubesLoading={clubesLoading} onFinish={() => setSplashDone(true)} />

      <BarraNavegacion
        splashActivo={!splashDone}
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
        mostrarLogo={esRutaPanel}
        onVolverCatalogo={irACatalogo}
        contenidoMax={location.pathname.startsWith('/club/') ? '7xl' : null}
        heroVisible={heroVisible}
        onScrollChange={handleScrollChange}
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
