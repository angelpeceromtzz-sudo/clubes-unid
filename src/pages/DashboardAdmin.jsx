// Panel de administración — gestión de usuarios y clubes
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api } from '../services/api';

// Componente del dashboard para administradores
export function DashboardAdmin({ tema, modoOscuro }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('resumen'); // Controla la pestaña activa
  const [usuarios, setUsuarios] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga usuarios y clubes al montar el componente
  useEffect(() => {
    async function load() {
      try {
        const [u, c] = await Promise.all([
          api.getUsuarios(),
          api.getClubes(),
        ]);
        setUsuarios(u);
        setClubes(c);
      } catch {
        setUsuarios([]);
        setClubes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isDark = modoOscuro;
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const tableBg = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const thCls = isDark ? 'text-slate-500' : 'text-slate-600';
  const tdCls = isDark ? 'text-slate-400' : 'text-slate-600';
  const tdTitle = isDark ? 'text-white' : 'text-slate-900';

  const totalAlumnos = usuarios.filter((u) => u.id_rol === 1).length;
  const clubesActivos = clubes.filter((c) => c.id_estatus_club === 1).length;
  const inscripcionesActivas = '—';

  // Cambia el rol de un usuario
  async function handleRoleChange(userId, newRoleId) {
    try {
      await api.updateUserRol(userId, newRoleId);
      const updated = await api.getUsuarios();
      setUsuarios(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  // Remueve a un alumno de su club (solo admin)
  async function handleRemoveFromClub(userId) {
    if (!window.confirm('¿Estás seguro de dar de baja a este alumno de su club?')) return;
    try {
      await api.removeFromClub(userId);
      const updated = await api.getUsuarios();
      setUsuarios(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  // Cambia el estatus de un club
  async function handleStatusChange(clubId, newStatusId) {
    try {
      await api.updateClubEstatus(clubId, newStatusId);
      const updated = await api.getClubes();
      setClubes(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiereAdmin>
        <div className="flex justify-center py-32">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiereAdmin>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-3xl font-black ${tema.title}`}>Panel de Administración</h1>
          <p className={`text-sm mt-1 ${tema.subtitle}`}>
            Bienvenido, {user.nombre_completo}
          </p>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'resumen', label: 'Resumen' },
            { key: 'usuarios', label: 'Usuarios' },
            { key: 'clubes', label: 'Clubes' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                tab === t.key
                  ? 'bg-amber-400 text-[#0e162c]'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  : 'bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Pestaña de resumen con estadísticas */}
        {tab === 'resumen' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className={`${cardCls} rounded-2xl p-6`}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Total Alumnos</p>
              <p className={`text-4xl font-black ${tema.title}`}>{totalAlumnos}</p>
            </div>
            <div className={`${cardCls} rounded-2xl p-6`}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Clubes Activos</p>
              <p className={`text-4xl font-black ${tema.title}`}>{clubesActivos}</p>
            </div>
            <div className={`${cardCls} rounded-2xl p-6`}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Inscripciones Activas</p>
              <p className={`text-4xl font-black ${tema.title}`}>{inscripcionesActivas}</p>
            </div>
          </div>
        )}

        {/* Pestaña de gestión de usuarios */}
        {tab === 'usuarios' && (
          <div className={`${tableBg} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Rol</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id_usuario} className={`border-b transition-colors ${isDark ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{u.id_usuario}</td>
                      <td className={`px-5 py-4 font-medium ${tdTitle}`}>{u.nombre_completo}</td>
                      <td className={`px-5 py-4 ${tdCls}`}>{u.correo_institucional}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${
                          u.id_rol === 3
                            ? 'text-red-400 border-red-400/30 bg-red-400/10'
                            : u.id_rol === 2
                            ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                            : 'text-blue-400 border-blue-400/30 bg-blue-400/10'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.id_rol === 1 ? (
                          <div className="flex items-center gap-2">
                            {u.nombre_club ? (
                              <>
                                <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                                  {u.nombre_club}
                                </span>
                                <button
                                  onClick={() => handleRemoveFromClub(u.id_usuario)}
                                  className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer active:scale-90"
                                  title="Dar de baja del club"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">Sin Club</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={u.id_rol}
                          onChange={(e) => handleRoleChange(u.id_usuario, Number(e.target.value))}
                          disabled={u.id_usuario === user.id}
                          className={`text-xs font-bold rounded-lg px-3 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isDark
                              ? 'bg-[#18223f] border-slate-700 text-slate-200'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                          title={u.id_usuario === user.id ? 'No puedes modificar tu propio rol' : ''}
                        >
                          <option value={1}>Alumno</option>
                          <option value={2}>Presidente</option>
                          <option value={3}>Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pestaña de gestión de clubes */}
        {tab === 'clubes' && (
          <div className={`${tableBg} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Categoría</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Cupo</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estatus</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clubes.map((c) => (
                    <tr key={c.id_club} className={`border-b transition-colors ${isDark ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{c.id_club}</td>
                      <td className={`px-5 py-4 font-medium ${tdTitle}`}>{c.nombre_club}</td>
                      <td className={`px-5 py-4 ${tdCls}`}>{c.categoria}</td>
                      <td className={`px-5 py-4 ${tdCls}`}>{c.cupo_maximo}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${
                          c.id_estatus_club === 1
                            ? 'text-green-400 border-green-400/30 bg-green-400/10'
                            : c.id_estatus_club === 2
                            ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                            : 'text-red-400 border-red-400/30 bg-red-400/10'
                        }`}>
                          {c.estatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={c.id_estatus_club}
                            onChange={(e) => handleStatusChange(c.id_club, Number(e.target.value))}
                            className={`text-xs font-bold rounded-lg px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                              isDark
                                ? 'bg-[#18223f] border-slate-700 text-slate-200'
                                : 'bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                          >
                            <option value={1}>Activo</option>
                            <option value={2}>Próximamente</option>
                            <option value={3}>Inactivo</option>
                          </select>
                          <button
                            onClick={() => handleStatusChange(c.id_club, 3)}
                            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
                          >
                            Dar de Baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ✦ A
