import { Badge } from '../../ui/Badge';
import { Icono } from '../../ui/Icono';
import { obtenerUrlImagen } from '../../../utils/imagen';

export function TablaDiapositivasDesktop({ diapositivas, modoOscuro, tableBg, thCls, tdCls, tdTitle, onToggle, onEditar, onEliminar }) {
  return (
    <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Imagen</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Título</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Orden</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estado</th>
              <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {diapositivas.map((d) => (
              <tr key={d.id_diapositiva} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{d.id_diapositiva}</td>
                <td className="px-5 py-4">
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800/30">
                    <img src={obtenerUrlImagen(d.url_imagen)} alt={d.titulo} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className={`px-5 py-4 font-medium ${tdTitle}`}>{d.titulo}</td>
                <td className={`px-5 py-4 ${tdCls}`}>{d.orden}</td>
                <td className="px-5 py-4">
                  <Badge texto={d.activa ? 'Activa' : 'Inactiva'} color={d.activa ? 'emerald' : 'slate'} size="md" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onToggle(d)}
                      className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer active:scale-95 transition-colors ${
                        d.activa
                          ? 'text-amber-400 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20'
                          : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20'
                      }`}
                      title={d.activa ? 'Desactivar' : 'Activar'}
                    >
                      {d.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => onEditar(d)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
                      title="Editar"
                    >
                      <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
                      Editar
                    </button>
                    <button onClick={() => onEliminar(d)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
                      title="Eliminar"
                    >
                      <Icono nombre="trash" strokeWidth={2} className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
