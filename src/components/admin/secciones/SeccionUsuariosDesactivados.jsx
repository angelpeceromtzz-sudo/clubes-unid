/* Sección mínima de usuarios desactivados: lista y reactiva (PATCH /usuarios/:id/reactivar). */
import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';

export function SeccionUsuariosDesactivados({ d }) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, selectCls } = useTheme();

  if (d.cargandoDesactivados) {
    return <Spinner className="py-10" />;
  }

  if (d.desactivados.length === 0) {
    return null;
  }

  const formatearFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden mt-6`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha de baja</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {d.desactivados.map((u) => (
              <tr key={u.id_usuario} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{u.id_usuario}</td>
                <td className={`px-5 py-4 font-medium ${tdTitle}`}>{u.nombre_completo}</td>
                <td className={`px-5 py-4 ${tdCls}`}>{u.correo_institucional}</td>
                <td className={`px-5 py-4 ${tdCls}`}>{formatearFecha(u.fecha_baja)}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => d.handleReactivarUsuario(u.id_usuario)}
                    disabled={d.reactivando[u.id_usuario]}
                    className={`px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0e162c] text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${selectCls}`}
                  >
                    {d.reactivando[u.id_usuario] ? 'Reactivando...' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
