/* Feed compacto de las últimas noticias registradas en el dashboard de admin. */
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Icono } from '../ui/Icono';
import { fechaRelativa } from '../../utils/formato';

export function NoticiasRecientes({ noticias, cargando }) {
  const { cardCls, tdTitle, tdCls, modoOscuro } = useTheme();
  const recientes = noticias?.slice(0, 5) || [];

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Noticias Recientes
        </h3>
        <Icono nombre="newspaper" strokeWidth={2} className="h-4 w-4 text-amber-400" />
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : recientes.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <p className={`text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            No hay noticias registradas.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.2)' : 'rgba(226,232,240,0.6)' }}>
          {recientes.map((n) => (
            <div key={n.id_noticia} className="px-5 py-3.5 flex items-start gap-3">
              <div className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${
                n.publicada ? 'bg-emerald-500/10' : 'bg-slate-500/10'
              }`}>
                <Icono
                  nombre="newspaper"
                  strokeWidth={2}
                  className={`h-4 w-4 ${n.publicada ? 'text-emerald-400' : 'text-slate-400'}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold truncate ${tdTitle}`} title={n.titulo}>
                    {n.titulo}
                  </span>
                  {n.destacada && (
                    <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400">
                      Destacada
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${tdCls} line-clamp-2`}>
                  {n.autor_nombre || 'Sin autor'}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-medium whitespace-nowrap ${tdCls} mt-0.5`}>
                {fechaRelativa(n.fecha_publicacion)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
