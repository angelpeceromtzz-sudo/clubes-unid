/* Punto de entrada principal. Renderiza la barra de navegación, las rutas (inicio, panel por rol) y el modal de inicio de sesión. */
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAutenticacion } from './contexts/AuthContext';
import { usePanelNav } from './contexts/PanelNavContext';
import { useNoticias } from './contexts/NoticiasContext';
import { useTheme } from './contexts/ThemeContext';
import { BarraNavegacion } from './components/layout/barra-navegacion/BarraNavegacion';
import { PiePagina } from './components/layout/PiePagina';
import { ModalInicioSesion } from './components/modals/ModalInicioSesion';
import { ModalNoticias } from './components/noticias/ModalNoticias';
import { ModalActualizaciones } from './components/noticias/ModalActualizaciones';
import { ModalConfirmacion } from './components/ui/ModalConfirmacion';
import { NavegacionInferiorMovil } from './components/layout/paneles-navegacion/NavegacionInferiorMovil';
import { RutaProtegida } from './components/layout/RutaProtegida';
import { PanelAlumno } from './pages/PanelAlumno';
import { PanelResponsableClub } from './pages/PanelResponsableClub';
import { PanelAdmin } from './pages/PanelAdmin';
import { PanelRectoria } from './pages/PanelRectoria';
import { PanelMural } from './pages/PanelMural';
import { PaginaInicio } from './pages/PaginaInicio';
import { PaginaCalendario } from './pages/PaginaCalendario';
import PaginaConoceClubs from './pages/PaginaConoceClubs';
import PaginaAcercaProyecto from './pages/PaginaAcercaProyecto';
import PaginaLandingGeneral from './pages/PaginaLandingGeneral';
import PaginaSelectorCampus from './pages/PaginaSelectorCampus';
import PaginaOferta from './pages/PaginaOferta';
import PaginaTerminosCondiciones from './pages/PaginaTerminosCondiciones';
import PaginaAvisoPrivacidad from './pages/PaginaAvisoPrivacidad';
import PaginaReportarProblemas from './pages/PaginaReportarProblemas';
import PaginaExperienciaEstudiantil from './pages/PaginaExperienciaEstudiantil';
import PaginaPerfilPreferencias from './pages/PaginaPerfilPreferencias';
import { FlujoOnboarding } from './components/onboarding/FlujoOnboarding';
import { DetalleClub } from './components/clubes/DetalleClub';
import PaginaEncuesta from './pages/PaginaEncuesta';
import { PaginaNoEncontrada } from './pages/PaginaNoEncontrada';
import { useAuthRedirect } from './hooks/useAuthRedirect';
import { useEstadoOnboarding } from './hooks/useEstadoOnboarding';
import { SplashScreen } from './components/ui/SplashScreen';
import { NAVBAR_HEIGHT, NAVBAR_HEIGHT_LOGO } from './constants/limites';

function RedireccionNoticias() {
  const { abrirActualizaciones } = useNoticias();
  const { authReady, estaAutenticado } = useAutenticacion();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authReady) return;
    if (!estaAutenticado) {
      navigate('/campus/campeche/portal', { replace: true });
      return;
    }
    const eventos = location.pathname === '/eventos' || new URLSearchParams(location.search).get('seccion') === 'eventos';
    abrirActualizaciones(eventos ? 'evento' : 'todos');
    navigate('/campus/campeche/portal', { replace: true });
  }, [abrirActualizaciones, authReady, estaAutenticado, location.pathname, location.search, navigate]);

  return null;
}

// Las páginas públicas (landing y acerca) cambian entre sí como documentos
// separados: al navegar se vuelve al inicio de la página de destino, igual
// que un enlace tradicional. El sitio declara scroll-behavior: smooth en CSS,
// así que se fuerza «instant» para que el salto de ruta no se anime.
function ScrollAlInicio() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  const { estaAutenticado, authReady, esAdmin, esCoordinacion, esResponsableClub, esRectoria, esResponsableMural, usuario, cerrarSesion, tieneInscripcionActiva } = useAutenticacion();
  const { itemsNav: panelItemsNav, onNavChange: panelOnNavChange } = usePanelNav();
  const { actualizacionesAbiertas } = useNoticias();
  const { tema, modoOscuro } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const clubesLoading = false;
  const { redirigirPostLogin } = useAuthRedirect();
  const { estado: estadoOnboarding, esAlumno: esAlumnoOnboarding, marcarCompletado: marcarCompletadoOnboarding, marcarOmitido: marcarOmitidoOnboarding } = useEstadoOnboarding(usuario);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const [catalogoKey] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [onboardingAbierto, setOnboardingAbierto] = useState(false);
  const [onboardingDescartado, setOnboardingDescartado] = useState(false);

  const debeAbrirOnboarding =
    authReady && estaAutenticado && esAlumnoOnboarding && estadoOnboarding === 'pendiente' && !onboardingAbierto && !onboardingDescartado;

  const onboardingAbiertoEfectivo =
    onboardingAbierto || debeAbrirOnboarding;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnboardingDescartado(false);
  }, [usuario?.id_usuario]);

  useEffect(() => {
    if (!onboardingAbiertoEfectivo) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [onboardingAbiertoEfectivo]);

  // El estado del onboarding es derivado de `debeAbrirOnboarding`; no se
  // sincroniza con setState dentro de un effect. La condición se calcula
  // directamente en el render para evitar cascadas de render.

  const handleScrollChange = useCallback((isScrolled) => {
    setHeroVisible(!isScrolled);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroVisible(window.scrollY <= 5);
  }, [location.pathname]);

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
    if (!actualizacionesAbiertas && location.pathname !== '/noticias' && location.pathname !== '/calendario') redirigirPostLogin();
  }, [redirigirPostLogin, location.pathname, actualizacionesAbiertas]);

   function handleLogout() {
    cerrarSesion();
    navigate('/campus/campeche/portal');
    setMenuAbierto(false);
    setConfirmarLogout(false);
  }

  const mostrarFiltros = location.pathname === '/campus/campeche/portal';

  // La landing /conoce-clubs y la página /acerca-del-proyecto se montan
  // fuera del layout del sistema con este return temprano (mismo patrón que
  // la encuesta): informativas, sin navbar del sistema.
  const esLandingGeneral = location.pathname === '/';
  const esConocenos = location.pathname === '/conocenos';
  const esSelectorCampus = location.pathname === '/campus';
  const esOferta = location.pathname === '/oferta';
  const esExperienciaEstudiantil = location.pathname === '/experiencia-estudiantil';
  const esLegal = ['/terminos', '/privacidad', '/reportar-problemas'].includes(location.pathname);
  const esLandingCampeche = location.pathname === '/campus/campeche';
  const esAcercaProyecto = location.pathname === '/acerca-del-proyecto';
  const esLandingStandalone = esLandingGeneral || esConocenos || esSelectorCampus || esOferta || esExperienciaEstudiantil || esLandingCampeche || esAcercaProyecto || esLegal || onboardingAbierto;

  // Los cuatro paneles muestran el logotipo completo en la navbar; el detalle de
  // club conserva la variante compacta ("Volver al Portal"), y por eso su altura
  // coincide con NAVBAR_HEIGHT y no con la del logotipo de NAVBAR_HEIGHT_LOGO.
  const esRutaPanel = ['/panel', '/campus/campeche/portal/responsable-de-club/panel', '/admin/panel', '/rectoria/panel', '/mural/panel'].includes(location.pathname);
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
  //
  // El catch-all es respaldo del return temprano: cualquier /encuesta/... que
  // no sea un slug válido (vacío, segmentos extra) recibe la 404 en vez de
  // una pantalla en blanco sin navbar.
  if (location.pathname.startsWith('/encuesta/')) {
    return (
      <Routes>
        <Route
          path="/encuesta/:slug"
          element={<PaginaEncuesta key={location.pathname} />}
        />
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Routes>
    );
  }

  // La landing /conoce-clubs y /acerca-del-proyecto son informativas y se
  // montan fuera del layout del sistema (mismo patrón que la encuesta): sin
  // navbar ni menú hamburguesa, sin navegación inferior, splash ni popups.
  // Cada una lleva su propia barra de marca; permisos y rutas del resto no
  // cambian. El guard es igualdad exacta: si este return se ejecuta, el
  // pathname es literalmente una de las dos rutas y su <Route> siempre
  // coincide; las variantes (p. ej. la versión mal escrita de acerca) caen
  // en el layout del sistema y su catch-all 404.
  if (location.pathname === '/conoce-clubs') {
    return <Navigate to="/campus/campeche" replace />;
  }

  if (location.pathname === '/acerca-del-proyecto') {
    return <Navigate to="/conocenos" replace />;
  }

  if (esLandingStandalone) {
    return (
      <>
        <ScrollAlInicio />
        <Routes>
          {esLandingGeneral && <Route path="/" element={<PaginaLandingGeneral />} />}
          {esConocenos && <Route path="/conocenos" element={<PaginaAcercaProyecto />} />}
          {esSelectorCampus && <Route path="/campus" element={<PaginaSelectorCampus />} />}
          {esOferta && <Route path="/oferta" element={<PaginaOferta />} />}
          {esExperienciaEstudiantil && <Route path="/experiencia-estudiantil" element={<PaginaExperienciaEstudiantil />} />}
          {esLegal && <Route path="/terminos" element={<PaginaTerminosCondiciones />} />}
          {esLegal && <Route path="/privacidad" element={<PaginaAvisoPrivacidad />} />}
          {esLegal && <Route path="/reportar-problemas" element={<PaginaReportarProblemas />} />}
          {esLandingCampeche && <Route path="/campus/campeche" element={<PaginaConoceClubs onLoginClick={() => setShowLogin(true)} />} />}
        </Routes>
        {showLogin && <ModalInicioSesion onClose={handleLoginSuccess} />}
      </>
    );
  }

  function irAPanel() {
    if (esCoordinacion) {
      navigate('/admin/panel');
    } else if (esAdmin) {
      navigate('/admin/panel');
    } else if (esResponsableClub) {
      navigate('/campus/campeche/portal/responsable-de-club/panel');
    } else if (esRectoria) {
      navigate('/rectoria/panel');
    } else if (esResponsableMural) {
      navigate('/mural/panel');
    } else {
      navigate('/panel');
    }
    setMenuAbierto(false);
  }

   function irACatalogo() {
    navigate('/campus/campeche/portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

return (
      <div
        className={`min-h-dvh font-sans transition-colors duration-300 overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0 ${esLandingGeneral ? '' : 'lg:pt-[var(--navbar-height)]'} ${tema.bg} ${tema.text}`}
      style={{ '--navbar-height': modoOscuro && !esLandingGeneral && !esOferta && location.pathname !== '/campus/campeche/portal' ? `${alturaNavbar}px` : '0px' }}
    >
      <SplashScreen authReady={authReady} clubesLoading={clubesLoading} onFinish={() => setSplashDone(true)} />

      {!esLandingGeneral && !esOferta && (
        <BarraNavegacion
          splashActivo={!splashDone}
          menuAbierto={menuAbierto}
          setMenuAbierto={setMenuAbierto}
          onLogoClick={irACatalogo}
          user={usuario}
          onLoginClick={() => setShowLogin(true)}
          onLogout={() => setConfirmarLogout(true)}
          onPanelClick={irAPanel}
          mostrarFiltros={mostrarFiltros}
          mostrarNoticias={mostrarFiltros || location.pathname === '/admin/panel'}
          mostrarLogo={esRutaPanel}
          onVolverCatalogo={irACatalogo}
          contenidoMax={location.pathname.startsWith('/campus/campeche/portal/club/') ? '7xl' : null}
          heroVisible={heroVisible}
          onScrollChange={handleScrollChange}
          itemsNav={panelItemsNav}
          onNavChange={panelOnNavChange}
          ocultarHamburguesa={true}
        />
      )}

      {!onboardingAbiertoEfectivo && estaAutenticado && !(location.pathname === '/calendario' && new URLSearchParams(location.search).get('vista') === 'mural') && <ModalNoticias />}
      {!onboardingAbiertoEfectivo && estaAutenticado && <ModalActualizaciones onLoginClick={() => setShowLogin(true)} />}

      <ModalConfirmacion
        show={confirmarLogout}
        titulo="Cerrar sesión"
        mensaje="¿Seguro que quieres cerrar sesión?"
        textoConfirmar="Cerrar sesión"
        textoCancelar="Cancelar"
        tamanoTextoBoton="text-xs"
        onConfirmar={handleLogout}
        onCancelar={() => setConfirmarLogout(false)}
      />

      {showLogin && (
        <ModalInicioSesion onClose={handleLoginSuccess} />
      )}

      {onboardingAbiertoEfectivo && (
        <div className="fixed inset-0 z-[1000] flex items-stretch justify-center overflow-y-auto bg-slate-50 dark:bg-[#0b111e] p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex min-h-[100dvh] w-full items-center justify-center px-4 py-6 sm:px-6">
            <FlujoOnboarding
              onCompletar={() => {
                marcarCompletadoOnboarding();
                setOnboardingAbierto(false);
              }}
              onOmitir={() => {
                marcarOmitidoOnboarding();
                setOnboardingAbierto(false);
              }}
              onSalir={() => {
                setOnboardingDescartado(true);
                setOnboardingAbierto(false);
              }}
            />
          </div>
        </div>
      )}

      <Routes>
        <Route path="/campus/campeche/portal" element={
          <PaginaInicio key={catalogoKey} />
        } />
        <Route path="/noticias" element={<RedireccionNoticias />} />
        <Route path="/eventos" element={<RedireccionNoticias />} />
        <Route path="/calendario" element={<PaginaCalendario onLoginClick={() => setShowLogin(true)} />} />
        {/* Compatibilidad: la landing anterior de Campeche ahora vive en
            /campus/campeche. */}
        <Route path="/conoce-clubs" element={<Navigate to="/campus/campeche" replace />} />
        <Route path="/acerca-del-proyecto" element={<Navigate to="/conocenos" replace />} />
        <Route path="/conocenos" element={<PaginaAcercaProyecto />} />
        <Route path="/oferta" element={<PaginaOferta />} />
        <Route path="/terminos" element={<PaginaTerminosCondiciones />} />
        <Route path="/privacidad" element={<PaginaAvisoPrivacidad />} />
        <Route path="/reportar-problemas" element={<PaginaReportarProblemas />} />
        <Route path="/experiencia-estudiantil" element={<PaginaExperienciaEstudiantil />} />
        <Route path="/perfil/preferencias" element={
          <RutaProtegida requiereAlumno>
            <PaginaPerfilPreferencias />
          </RutaProtegida>
        } />        <Route path="/campus/campeche/portal/club/:id" element={
          <DetalleClub onLoginClick={() => setShowLogin(true)} />
        } />
        <Route path="/panel" element={
          <RutaProtegida>
            <PanelAlumno />
          </RutaProtegida>
        } />
        <Route path="/campus/campeche/portal/responsable-de-club/panel" element={
          <RutaProtegida requierePresidente>
            <PanelResponsableClub />
          </RutaProtegida>
        } />
        <Route path="/admin/panel" element={
          <RutaProtegida requiereAdminOCoordinacion>
            <PanelAdmin />
          </RutaProtegida>
        } />
        <Route path="/rectoria/panel" element={
          <RutaProtegida requiereRectoria>
            <PanelRectoria />
          </RutaProtegida>
        } />
        <Route path="/campus/campeche/coordinacion/panel" element={
          <RutaProtegida requiereAdminOCoordinacion>
            <PanelAdmin />
          </RutaProtegida>
        } />
        <Route path="/mural/panel" element={
          <RutaProtegida requiereResponsableMural>
            <PanelMural />
          </RutaProtegida>
        } />
        {/* Catch-all: cualquier ruta desconocida (incluida la versión mal
            escrita de /acerca-del-proyecto, sin alias ni redirección) sirve
            la 404 personalizada con la navbar del sistema. */}
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Routes>

      {!onboardingAbiertoEfectivo && (
        <NavegacionInferiorMovil
          estaAutenticado={estaAutenticado}
          tieneInscripcionActiva={tieneInscripcionActiva}
          onLoginClick={() => setShowLogin(true)}
          onInicioClick={irACatalogo}
        />
      )}
      {location.pathname === '/campus/campeche/portal' && <PiePagina />}
    </div>
  );
}

export default App;
