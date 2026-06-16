// Componente principal de la aplicación — maneja rutas, estado global y tema
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ClubCard } from './components/ClubCard';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { DetalleClub } from './components/DetalleClub';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardAlumno } from './pages/DashboardAlumno';
import { DashboardAdmin } from './pages/DashboardAdmin';
import { api, getSession } from './services/api';

// Componente raíz de la aplicación
function App() {
  const { isAuthenticated, isAdmin, user, logout, refreshInscripcionActiva, tieneInscripcionActiva } = useAuth();
  const [clubes, setClubes] = useState([]);           // Lista de clubes desde la API
  const [clubesLoading, setClubesLoading] = useState(true);
  const [clubSeleccionado, setClubSeleccionado] = useState(null); // Club en vista detalle
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  // Tema oscuro/claro persistido en localStorage
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('theme');
    return guardado !== null ? guardado === 'dark' : true;
  });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState('catalogo'); // 'catalogo' | 'dashboard' | 'admin'

  // Persiste la preferencia de tema en localStorage
  useEffect(() => {
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

  // Carga inicial de clubes y restaura sesión si existe
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
        setView('admin');
      } else if (id_rol === 2) {
        setView('dashboard');
      } else {
        api.getInscripcionActiva().then((insc) => {
          if (insc) setView('dashboard');
        }).catch(() => {});
      }
    }
  }, []);

  // Limpia estado al cerrar sesión
  function handleLogout() {
    logout();
    setView('catalogo');
    setClubSeleccionado(null);
    setMenuAbierto(false);
  }

  // Filtra clubes inactivos y por categoría seleccionada
  const clubesFiltrados = clubes
    .filter((club) => club.id_estatus_club !== 3)
    .filter(
      (club) =>
        categoriaActiva === 'Todos' || club.categoria === categoriaActiva
    );

  // Objeto con clases Tailwind según el tema activo
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

  // Navega al dashboard según el rol
  function irADashboard() {
    if (isAdmin) {
      setView('admin');
    } else {
      setView('dashboard');
    }
    setMenuAbierto(false);
    setClubSeleccionado(null);
  }

  function irACatalogo() {
    setView('catalogo');
    setClubSeleccionado(null);
  }

  const mostrarFiltros = view === 'catalogo';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${tema.bg} ${tema.text}`}>
      {/* Barra de navegación superior */}
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

      {/* Modal de inicio de sesión */}
      {showLogin && (
        <LoginModal onClose={handleLoginSuccess} />
      )}

      {/* Renderizado condicional según la vista activa */}
      {view === 'dashboard' && isAuthenticated ? (
        <DashboardAlumno tema={tema} modoOscuro={modoOscuro} />
      ) : view === 'admin' && isAuthenticated && isAdmin ? (
        <DashboardAdmin tema={tema} modoOscuro={modoOscuro} />
      ) : clubSeleccionado ? (
        <DetalleClub
          club={clubSeleccionado}
          onVolver={() => setClubSeleccionado(null)}
          tema={tema}
          modoOscuro={modoOscuro}
          onLoginClick={() => setShowLogin(true)}
        />
      ) : (
        <>
          {/* Hero con carrusel */}
          <Hero />
          <main className="max-w-7xl mx-auto px-6 py-12 pb-20 md:pb-12">
            <div className="mb-10">
              <h2 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${tema.title}`}>
                Explorar Clubes Disponibles
              </h2>
              <p className={`text-sm mt-1 transition-colors duration-300 ${tema.subtitle}`}>
                Catálogo oficial UNID
              </p>
            </div>

            {/* Aviso para usuarios no autenticados */}
            {!isAuthenticated && (
              <div className="mb-8 bg-amber-400/10 border border-amber-400/20 rounded-xl px-5 py-3">
                <p className="text-sm text-amber-400 font-medium">
                  Inicia sesión para inscribirte en un club.
                </p>
              </div>
            )}

            {/* Lista de clubes filtrados */}
            {clubesLoading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
              </div>
            ) : clubesFiltrados.length === 0 ? (
              <p className={`text-center py-20 text-lg ${tema.subtitle}`}>
                No hay clubes disponibles en esta categoría.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubesFiltrados.map((club) => (
                  <ClubCard
                    key={club.id_club}
                    id={club.id_club}
                    nombre={club.nombre_club}
                    descripcion={club.descripcion}
                    categoria={club.categoria}
                    cupoMaximo={club.cupo_maximo}
                    cupoActual={parseInt(club.cupo_actual) || 0}
                    imagen={club.imagen_portada || club.imagen}
                    onClick={() => setClubSeleccionado(club)}
                    modoOscuro={modoOscuro}
                    idEstatusClub={club.id_estatus_club}
                    estatus={club.estatus}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
      {/* Barra de navegación inferior fija para móvil */}
      <MobileBottomNav
        isAuthenticated={isAuthenticated}
        tieneInscripcionActiva={tieneInscripcionActiva}
        view={view}
        onNavigate={setView}
        onLoginClick={() => setShowLogin(true)}
      />
      {view !== 'dashboard' && view !== 'admin' && <Footer tema={tema} />}
    </div>
  );
}

export default App;

// ✦ A
