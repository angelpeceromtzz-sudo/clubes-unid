import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from './contexts/AuthContext';
import { BarraNavegacion } from './components/BarraNavegacion';
import { PiePagina } from './components/PiePagina';
import { ModalInicioSesion } from './components/ModalInicioSesion';
import { NavegacionInferiorMovil } from './components/NavegacionInferiorMovil';
import { RutaProtegida } from './components/RutaProtegida';
import { PanelAlumno } from './pages/PanelAlumno';
import { PanelPresidente } from './pages/PanelPresidente';
import { PanelAdmin } from './pages/PanelAdmin';
import { PaginaInicio } from './pages/PaginaInicio';
import { api, getSession } from './services/api';

function App() {
  const { estaAutenticado, esAdmin, esPresidente, usuario, cerrarSesion, refrescarInscripcionActiva, tieneInscripcionActiva } = useAutenticacion();
  const navigate = useNavigate();
  const location = useLocation();
  const [clubes, setClubes] = useState([]);
  const [clubesLoading, setClubesLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('theme');
    return guardado !== null ? guardado === 'dark' : true;
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [clubDetalleVisible, setClubDetalleVisible] = useState(false);
  const [catalogoKey, setCatalogoKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

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

  const handleLoginSuccess = useCallback(() => {
    setShowLogin(false);
    const session = getSession();
    if (session?.user) {
      const { id_rol } = session.user;
      if (id_rol === 3) {
        navigate('/admin/dashboard', { replace: true });
      } else if (id_rol === 2) {
        navigate('/presidente/dashboard', { replace: true });
      } else {
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

  const tema = modoOscuro
    ? {
        isDark: true,
        bg: 'bg-[#0b111e]',
        text: 'text-slate-200',
        headerBg: 'bg-[#0b111e]/80',
        headerBorder: 'border-slate-800/60',
        title: 'text-white',
        subtitle: 'text-slate-400',
        navPill: 'bg-[#18223f]/60 border border-slate-800 rounded-full p-1',
        btnActive: 'bg-amber-400 text-[#0e162c] font-black rounded-full',
        btnInactive: 'bg-transparent text-slate-400 hover:text-white rounded-full',
        dropdownBg: 'bg-[#0e162c]',
        dropdownBorder: 'border-slate-700',
        dropdownItem: 'hover:bg-slate-700/50',
        profileText: 'text-slate-200',
        iconColor: 'text-slate-400',
        logoText: 'text-white',
      }
    : {
        isDark: false,
        bg: 'bg-slate-50',
        text: 'text-slate-800',
        headerBg: 'bg-white/80',
        headerBorder: 'border-slate-200',
        title: 'text-slate-900',
        subtitle: 'text-slate-500',
        navPill: 'bg-slate-100 border border-slate-200 rounded-full p-1',
        btnActive: 'bg-[#0e162c] text-white shadow-sm rounded-full',
        btnInactive: 'bg-transparent text-slate-600 hover:text-slate-900 rounded-full',
        dropdownBg: 'bg-white',
        dropdownBorder: 'border-slate-200',
        dropdownItem: 'hover:bg-slate-100',
        profileText: 'text-slate-700',
        iconColor: 'text-slate-500',
        logoText: 'text-slate-900',
      };

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
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        tema={tema}
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
            tema={tema}
            modoOscuro={modoOscuro}
            onLoginClick={() => setShowLogin(true)}
            onClubDetalleChange={setClubDetalleVisible}
          />
        } />
        <Route path="/dashboard" element={
          <RutaProtegida>
            <PanelAlumno tema={tema} modoOscuro={modoOscuro} />
          </RutaProtegida>
        } />
        <Route path="/presidente/dashboard" element={
          <RutaProtegida requierePresidente>
            <PanelPresidente tema={tema} modoOscuro={modoOscuro} />
          </RutaProtegida>
        } />
        <Route path="/admin/dashboard" element={
          <RutaProtegida requiereAdmin>
            <PanelAdmin tema={tema} modoOscuro={modoOscuro} />
          </RutaProtegida>
        } />
      </Routes>

      <NavegacionInferiorMovil
        estaAutenticado={estaAutenticado}
        tieneInscripcionActiva={tieneInscripcionActiva}
        onLoginClick={() => setShowLogin(true)}
        onInicioClick={irACatalogo}
      />
      {location.pathname === '/' && <PiePagina tema={tema} />}
    </div>
  );
}

export default App;
