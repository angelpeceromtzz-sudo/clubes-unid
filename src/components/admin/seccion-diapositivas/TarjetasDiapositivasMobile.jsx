import { Badge } from '../../ui/Badge';
import { Icono } from '../../ui/Icono';
import { obtenerUrlImagen } from '../../../utils/imagen';

export function TarjetasDiapositivasMobile({ diapositivas, modoOscuro, tdTitle, tdCls, onToggle, onEditar, onEliminar }) {
  return (
    <div className="space-y-2 md:hidden">
      {diapositivas.map((d) => (
        <div key={d.id_diapositiva} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800/30 shrink-0">
              <img src={obtenerUrlImagen(d.url_imagen)} alt={d.titulo} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${tdTitle}`}>{d.titulo}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] ${tdCls}`}>Orden: {d.orden}</span>
              </div>
            </div>
            <Badge texto={d.activa ? 'Activa' : 'Inactiva'} color={d.activa ? 'emerald' : 'slate'} size="sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onToggle(d)}
              className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer active:scale-95 transition-colors ${
                d.activa
                  ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                  : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
              }`}
            >
              {d.activa ? 'Desactivar' : 'Activar'}
            </button>
            <button onClick={() => onEditar(d)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
              Editar
            </button>
            <button onClick={() => onEliminar(d)}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
            >
              <Icono nombre="trash" strokeWidth={2} className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
