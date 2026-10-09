import { Badge } from '../../ui/Badge';
import { Icono } from '../../ui/Icono';
import { obtenerUrlImagen } from '../../../utils/imagen';
import { fechaCorta, fechaEventoCorta } from '../../../utils/formato';

export function TarjetasNoticiasMobile({ noticias, modoOscuro, tdTitle, tdCls, onToggle, onEditar, onEliminar }) {
  return (
    <div className="space-y-2 md:hidden">
      {noticias.map((n) => (
        <div key={n.id_noticia} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start gap-3 mb-2">
            {n.url_imagen ? (
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-800/30 shrink-0">
                <img src={obtenerUrlImagen(n.url_imagen)} alt={n.titulo} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-14 h-10 rounded-lg flex items-center justify-center shrink-0 ${modoOscuro ? 'bg-slate-800/40 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                <Icono nombre="image" className="h-4 w-4" strokeWidth={1.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${tdTitle}`}>{n.titulo}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] ${tdCls}`}>{n.categoria === 'evento' && n.fecha_evento ? fechaEventoCorta(n.fecha_evento) : fechaCorta(n.fecha_publicacion)}{n.categoria === 'evento' && n.hora_evento ? ` · ${String(n.hora_evento).slice(0, 5)}` : ''}</span>
                {n.destacada && <span className="text-[10px] uppercase font-bold text-amber-400">Destacada</span>}
              </div>
              {n.categoria === 'evento' && n.lugar_evento && <p className={`text-[10px] mt-1 ${tdCls}`}>📍 {n.lugar_evento}</p>}
            </div>
            <Badge texto={n.publicada ? 'Publicada' : 'Borrador'} color={n.publicada ? 'emerald' : 'slate'} size="sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onToggle(n)}
              className={`text-xs font-bold px-2 py-1.5 rounded-lg border cursor-pointer active:scale-95 transition-colors ${
                n.publicada
                  ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                  : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
              }`}
            >
              {n.publicada ? 'Ocultar' : 'Publicar'}
            </button>
            <button onClick={() => onEditar(n)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
              Editar
            </button>
            <button onClick={() => onEliminar(n)}
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
