export function TablaHistorial({
  historial,
  historialLoading,
  isDark,
  tableBg,
  thCls,
  tdCls,
  tdTitle,
  onRefresh,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase tracking-wider">Historial de Acciones</h2>
        <button
          onClick={onRefresh}
          className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      {historialLoading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : historial.length === 0 ? (
        <div className={`${tableBg} rounded-2xl py-16 px-4 text-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            No hay acciones registradas todavía.
          </p>
        </div>
      ) : (
        <div className={`${tableBg} rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-left ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
                  <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Administrador</th>
                  <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acción</th>
                  <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id_historial} className={`border-b transition-colors ${isDark ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className={`px-5 py-4 whitespace-nowrap font-mono text-xs ${tdCls}`}>
                      {new Date(h.fecha).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className={`px-5 py-4 font-medium ${tdTitle}`}>{h.admin_nombre}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${
                        h.accion === 'cambio_rol' || h.accion === 'cambio_estatus_club'
                          ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                          : h.accion === 'crear_club' || h.accion === 'enviar_anuncio'
                          ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                          : h.accion === 'baja_usuario' || h.accion === 'desasignar_club'
                          ? 'text-red-400 border-red-400/30 bg-red-400/10'
                          : 'text-blue-400 border-blue-400/30 bg-blue-400/10'
                      }`}>
                        {{
                          cambio_rol: 'Cambio de Rol',
                          asignar_club: 'Asignar Club',
                          desasignar_club: 'Desasignar Club',
                          crear_club: 'Crear Club',
                          actualizar_club: 'Actualizar Club',
                          cambio_estatus_club: 'Cambio Estatus',
                          enviar_anuncio: 'Enviar Anuncio',
                          baja_usuario: 'Dar de Baja',
                        }[h.accion] || h.accion}
                      </span>
                    </td>
                    <td className={`px-5 py-4 ${tdCls} max-w-xs truncate`}>{h.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
