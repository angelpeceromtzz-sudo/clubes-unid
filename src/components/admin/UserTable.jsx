import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';

export function TablaUsuarios({
  usuarios,
  busqueda,
  currentUser,
  clubesActivosList,
  asignando,
  onRoleChange,
  onRemoveFromClub,
  onAsignarClub,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, selectCls } = useTheme();
  const q = busqueda.toLowerCase().trim();
  const filtrados = q
    ? usuarios.filter(
        (u) =>
          String(u.id_usuario).includes(q) ||
          u.nombre_completo.toLowerCase().includes(q) ||
          u.correo_institucional.toLowerCase().includes(q)
      )
    : usuarios;

  if (q && filtrados.length === 0) {
    return (
      <div className={`${tableBg} rounded-2xl py-16 px-4 text-center`}>
        <Icono nombre="search" strokeWidth={2} className={`h-10 w-10 mx-auto mb-3 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} />
        <p className={`text-sm font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          No se encontraron usuarios que coincidan con la búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Rol</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => (
              <tr key={u.id_usuario} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
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
                          {u.id_usuario !== currentUser.id && (
                            <button
                              onClick={() => onRemoveFromClub(u.id_usuario)}
                              className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer active:scale-90"
                              title="Dar de baja del club"
                            >
                              <Icono nombre="close" strokeWidth={2} className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Sin Club</span>
                      )}
                    </div>
                  ) : u.id_rol === 2 ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={u.nombre_club ? String(clubesActivosList.find((c) => c.nombre_club === u.nombre_club)?.id_club || '') : ''}
                        onChange={(e) => {
                          const clubId = e.target.value ? Number(e.target.value) : null;
                          const clubSeleccionado = clubesActivosList.find((c) => c.id_club === clubId);
                          const clubActual = clubesActivosList.find((c) => c.nombre_club === u.nombre_club);
                          const presidenteReemplazado = clubSeleccionado?.id_presidente && clubSeleccionado.id_presidente !== u.id_usuario;
                          if (presidenteReemplazado) {
                            const nombrePresidente = usuarios.find((u2) => u2.id_usuario === clubSeleccionado.id_presidente)?.nombre_completo || 'otro usuario';
                            if (!window.confirm(`El club "${clubSeleccionado.nombre_club}" ya tiene un presidente asignado (${nombrePresidente}). ¿Estás seguro de que deseas reemplazarlo?`)) {
                              return;
                            }
                          }
                          onAsignarClub(u.id_usuario, clubId);
                        }}
                        disabled={asignando[u.id_usuario] || u.id_usuario === currentUser.id}
                        className={selectCls}
                        title={u.id_usuario === currentUser.id ? 'No puedes asignarte un club a ti mismo' : ''}
                      >
                        <option value="">Sin club</option>
                        {clubesActivosList.map((c) => (
                          <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
                        ))}
                      </select>
                      {asignando[u.id_usuario] && (
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {u.id_usuario === currentUser.id ? (
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-2 py-1 rounded-lg border border-slate-600/30 bg-slate-600/10">
                      Eres tú
                    </span>
                  ) : u.id_rol === 3 ? (
                    <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold px-2 py-1 rounded-lg border border-red-400/30 bg-red-400/10">
                      Admin
                    </span>
                  ) : (
                    <select
                      value={u.id_rol}
                      onChange={(e) => onRoleChange(u.id_usuario, Number(e.target.value))}
                      className={selectCls}
                    >
                      <option value={1}>Alumno</option>
                      <option value={2}>Presidente</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
