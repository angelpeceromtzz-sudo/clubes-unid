/* Tabla de historial de acciones del administrador con fecha, admin, acción y descripción. */
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';

export function TablaHistorial({
  historial,
  historialLoading,
  onRefresh,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle } = useTheme();
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
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : historial.length === 0 ? (
        <div className={`${tableBg} rounded-2xl py-16 px-4 text-center`}>
          <Icono nombre="clock" strokeWidth={2} className={`h-10 w-10 mx-auto mb-3 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-sm font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            No hay acciones registradas todavía.
          </p>
        </div>
      ) : (
        <>
          {/* Versión escritorio - tabla */}
          <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Administrador</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acción</th>
                    <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id_historial} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <td className={`px-5 py-4 whitespace-nowrap font-mono text-xs ${tdCls}`}>
                        {new Date(h.fecha).toLocaleString('es-MX', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className={`px-5 py-4 font-medium ${tdTitle}`}>{h.admin_nombre}</td>
                      <td className="px-5 py-4">
                        <Badge texto={{
                          cambio_rol: 'Cambio de Rol',
                          asignar_club: 'Asignar Club',
                          desasignar_club: 'Desasignar Club',
                          crear_club: 'Crear Club',
                          actualizar_club: 'Actualizar Club',
                          cambio_estatus_club: 'Cambio Estatus',
                          enviar_anuncio: 'Enviar Anuncio',
                          baja_usuario: 'Dar de Baja',
                        }[h.accion] || h.accion} size="md" color={
                          h.accion === 'cambio_rol' || h.accion === 'cambio_estatus_club'
                            ? 'amber'
                            : h.accion === 'crear_club' || h.accion === 'enviar_anuncio'
                            ? 'emerald'
                            : h.accion === 'baja_usuario' || h.accion === 'desasignar_club'
                            ? 'red'
                            : 'blue'
                        } />
                      </td>
                      <td className={`px-5 py-4 ${tdCls} max-w-md break-words`}>{h.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Versión móvil - tarjetas */}
          <div className="space-y-2 md:hidden">
            {historial.map((h) => {
              const textoAccion = {
                cambio_rol: 'Cambio de Rol',
                asignar_club: 'Asignar Club',
                desasignar_club: 'Desasignar Club',
                crear_club: 'Crear Club',
                actualizar_club: 'Actualizar Club',
                cambio_estatus_club: 'Cambio Estatus',
                enviar_anuncio: 'Enviar Anuncio',
                baja_usuario: 'Dar de Baja',
              }[h.accion] || h.accion;
              const colorAccion = h.accion === 'cambio_rol' || h.accion === 'cambio_estatus_club'
                ? 'amber'
                : h.accion === 'crear_club' || h.accion === 'enviar_anuncio'
                ? 'emerald'
                : h.accion === 'baja_usuario' || h.accion === 'desasignar_club'
                ? 'red'
                : 'blue';
              return (
                <div key={h.id_historial} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge texto={textoAccion} size="sm" color={colorAccion} />
                    <span className={`text-[10px] font-mono ${tdCls}`}>
                      {new Date(h.fecha).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={`text-xs font-medium mb-1 ${tdTitle}`}>{h.admin_nombre}</p>
                  <p className={`text-[11px] leading-relaxed ${tdCls}`}>{h.descripcion}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
