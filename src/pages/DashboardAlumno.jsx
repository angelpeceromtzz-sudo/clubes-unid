// Dashboard del alumno — muestra información del club, avisos y miembros
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api } from '../services/api';

// Sección de avisos del club — permite al presidente crear y eliminar avisos
function AvisosSection({ club, esPresidente, tema, modoOscuro }) {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoContenido, setNuevoContenido] = useState('');
  const [pubError, setPubError] = useState('');

  // Carga los avisos del club al montar el componente
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.getAvisos(club.id_club);
        if (mounted) setAvisos(data);
      } catch {
        if (mounted) setAvisos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [club.id_club]);

  // Refresca la lista de avisos desde la API
  async function refreshAvisos() {
    try {
      const data = await api.getAvisos(club.id_club);
      setAvisos(data);
    } catch {
      setAvisos([]);
    }
  }

  // Publica un nuevo aviso (solo presidente)
  async function handlePublicar(e) {
    e.preventDefault();
    setPubError('');
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;

    try {
      await api.createAviso(club.id_club, nuevoTitulo, nuevoContenido);
      await refreshAvisos();
      setNuevoTitulo('');
      setNuevoContenido('');
      setShowForm(false);
    } catch (err) {
      setPubError(err.message);
    }
  }

  // Elimina un aviso por ID (solo presidente)
  async function handleEliminar(id) {
    try {
      await api.deleteAviso(id);
      await refreshAvisos();
    } catch (err) {
      console.error('Error al eliminar aviso:', err);
    }
  }

  const isDark = modoOscuro;
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Avisos del Club
        </h3>
        {esPresidente && (
          <button
            onClick={() => setShowForm((p) => !p)}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95"
          >
            {showForm ? 'Cancelar' : 'Nuevo Aviso'}
          </button>
        )}
      </div>

      {/* Formulario para crear un nuevo aviso */}
      {showForm && (
        <form onSubmit={handlePublicar} className={`${cardCls} rounded-xl p-5 mb-5 space-y-3`}>
          <input
            type="text"
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Título del aviso"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isDark ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'}`}
          />
          <textarea
            value={nuevoContenido}
            onChange={(e) => setNuevoContenido(e.target.value)}
            placeholder="Contenido del aviso"
            rows={3}
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none ${isDark ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'}`}
          />
          {pubError && <p className="text-red-400 text-xs font-medium">{pubError}</p>}
          <button
            type="submit"
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-2.5 transition-all duration-200 cursor-pointer active:scale-95"
          >
            Publicar
          </button>
        </form>
      )}

      {/* Lista de avisos publicados */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.length === 0 && (
            <p className={`text-sm text-center py-8 ${tema.subtitle}`}>
              No hay avisos publicados aún.
            </p>
          )}
          {avisos.map((aviso) => (
            <div key={aviso.id_aviso} className={`${cardCls} rounded-xl p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${tema.title}`}>{aviso.titulo}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Por {aviso.autor} &middot; {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {esPresidente && (
                  <button
                    onClick={() => handleEliminar(aviso.id_aviso)}
                    className="text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
                    title="Eliminar aviso"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <p className={`text-sm mt-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {aviso.contenido}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sección que lista los miembros del club
function MiembrosSection({ miembros, club, tema, modoOscuro }) {
  const isDark = modoOscuro;
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div>
      <h3 className={`text-lg font-black uppercase tracking-wider mb-5 ${tema.title}`}>
        Miembros del Club ({miembros.length})
      </h3>
      <div className="space-y-2">
        {miembros.map((m) => (
          <div key={m.id_usuario || m.id} className={`${cardCls} rounded-xl px-5 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                {(m.nombre_completo || '').charAt(0)}
              </div>
              <div>
                <p className={`text-sm font-medium ${tema.title}`}>
                  {m.nombre_completo}
                  {club.id_presidente === (m.id_usuario || m.id) && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">Presidente</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{m.correo_institucional}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tarjeta informativa del club con detalles generales
function InfoClub({ club, tema, modoOscuro }) {
  const isDark = modoOscuro;
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`${cardCls} rounded-2xl p-6`}>
      <h3 className={`text-lg font-black uppercase tracking-wider mb-4 ${tema.title}`}>
        Información del Club
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Nombre</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.nombre_club}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Categoría</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.categoria}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Lugar</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.lugar || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Cupo</p>
          <p className={`text-sm font-medium ${tema.title}`}>{club.cupo_maximo} lugares</p>
        </div>
      </div>

      {club.horarios && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Horarios</p>
          <div className="space-y-1.5">
            {club.horarios.map((h, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <strong className={tema.title}>{h.dia}:</strong> {h.horario}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Página principal del dashboard del alumno
export function DashboardAlumno({ tema, modoOscuro }) {
  const { user, fetchDashboardData } = useAuth();
  const [data, setData] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga datos del dashboard al montar el componente
  useEffect(() => {
    async function load() {
      const d = await fetchDashboardData();
      setData(d);
      if (d?.club) {
        try {
          const m = await api.getMiembros(d.club.id_club);
          setMiembros(m);
        } catch {
          setMiembros([]);
        }
      }
      setLoading(false);
    }
    load();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className={`text-lg font-medium ${tema.subtitle}`}>
            No tienes una inscripción activa.
          </p>
          <p className={`text-sm mt-2 ${tema.subtitle}`}>
            Explora el catálogo de clubes para inscribirte.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  const { club, esPresidente } = data;

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-3xl font-black ${tema.title}`}>
            {esPresidente ? 'Panel de Presidente' : 'Mi Club'}
          </h1>
          <p className={`text-sm mt-1 ${tema.subtitle}`}>
            Bienvenido, {user.nombre_completo}
            {esPresidente && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                · Presidente de {club.nombre_club}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <InfoClub club={club} tema={tema} modoOscuro={modoOscuro} />
            <AvisosSection club={club} esPresidente={esPresidente} tema={tema} modoOscuro={modoOscuro} />
          </div>
          <div className="space-y-8">
            <MiembrosSection miembros={miembros} club={club} tema={tema} modoOscuro={modoOscuro} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ✦ A
