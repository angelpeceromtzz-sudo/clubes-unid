/* Tabla compacta de las últimas 5 inscripciones en el dashboard de admin. */
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Icono } from '../ui/Icono';
import { fechaCorta } from '../../utils/formato';

const STATUS_COLORS = {
  'Pendiente': 'bg-amber-500/15 text-amber-400',
  'En revisión': 'bg-blue-500/15 text-blue-400',
  'Aceptado': 'bg-emerald-500/15 text-emerald-400',
  'Rechazado': 'bg-red-500/15 text-red-400',
  'Miembro oficial': 'bg-emerald-500/15 text-emerald-400',
};

export function UltimasInscripciones({ inscripciones, cargando }) {
  const { cardCls, thCls, tdCls, tdTitle, modoOscuro } = useTheme();

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Últimas Inscripciones
        </h3>
        <Icono nombre="clipboard" strokeWidth={2} className="h-4 w-4 text-amber-400" />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : !inscripciones?.length ? (
        <div className="py-12 px-4 text-center">
          <p className={`text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            No hay inscripciones recientes.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/30' : 'border-slate-100'}`}>
                  <th className={`px-5 py-3 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Alumno</th>
                  <th className={`px-5 py-3 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
                  <th className={`px-5 py-3 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Fecha</th>
                  <th className={`px-5 py-3 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {inscripciones.map((i, idx) => (
                  <tr key={idx} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/30 hover:bg-slate-800/20' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                    <td className={`px-5 py-3 font-medium ${tdTitle} truncate max-w-[160px]`}>
                      {i.nombre_completo}
                    </td>
                    <td className={`px-5 py-3 ${tdCls} truncate max-w-[140px]`}>
                      {i.nombre_club}
                    </td>
                    <td className={`px-5 py-3 font-mono text-xs ${tdCls} whitespace-nowrap`}>
                      {fechaCorta(i.fecha_creacion)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[i.status] || 'bg-slate-500/15 text-slate-400'}`}>
                        {i.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.6)' }}>
            {inscripciones.map((i, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${tdTitle} truncate`}>{i.nombre_completo}</span>
                  <span className={`shrink-0 ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[i.status] || 'bg-slate-500/15 text-slate-400'}`}>
                    {i.status}
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${tdCls}`}>
                  <span className="truncate">{i.nombre_club}</span>
                  <span>·</span>
                  <span className="whitespace-nowrap">{fechaCorta(i.fecha_creacion)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
