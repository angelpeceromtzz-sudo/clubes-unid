import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardAlumno } from './pages/DashboardAlumno';
import { DashboardPresidente } from './pages/DashboardPresidente';
import { DashboardAdmin } from './pages/DashboardAdmin';
import { HomePage } from './pages/HomePage';
import { api, getSession } from './services/api';

function App() {
  const { isAuthenticated, isAdmin, user, logout, refreshInscripcionActiva, tieneInscripcionActiva } = useAuth();
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
      refreshInscripcionActiva();
    }
  }, [refreshInscripcionActiva]);

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
    logout();
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

  const mostrarFiltros = location.pathname === '/';

  function irADashboard() {
    if (isAdmin) {
      navigate('/admin/dashboard');
    } else if (isPresidente) {
      navigate('/presidente/dashboard');
    } else {
      navigate('/dashboard');
    }
    setMenuAbierto(false);
  }

  function irACatalogo() {
    navigate('/');
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${tema.bg} ${tema.text}`}>
      <Navbar
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        tema={tema}
        onLogoClick={irACatalogo}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
        onDashboardClick={irADashboard}
        mostrarFiltros={mostrarFiltros}
        onVolverCatalogo={irACatalogo}
      />

      {showLogin && (
        <LoginModal onClose={handleLoginSuccess} />
      )}

      <Routes>
        <Route path="/" element={
          <HomePage
            clubes={clubesFiltrados}
            clubesLoading={clubesLoading}
            tema={tema}
            modoOscuro={modoOscuro}
            onLoginClick={() => setShowLogin(true)}
          />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardAlumno tema={tema} modoOscuro={modoOscuro} />
          </ProtectedRoute>
        } />
        <Route path="/presidente/dashboard" element={
          <ProtectedRoute requierePresidente>
            <DashboardPresidente tema={tema} modoOscuro={modoOscuro} />
          </ProtectedRoute>
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiereAdmin>
            <DashboardAdmin tema={tema} modoOscuro={modoOscuro} />
          </ProtectedRoute>
        } />
      </Routes>

      <MobileBottomNav
        isAuthenticated={isAuthenticated}
        tieneInscripcionActiva={tieneInscripcionActiva}
        onLoginClick={() => setShowLogin(true)}
      />
      {location.pathname === '/' && <Footer tema={tema} />}
    </div>
  );
}

export default App;

// ✦ A
