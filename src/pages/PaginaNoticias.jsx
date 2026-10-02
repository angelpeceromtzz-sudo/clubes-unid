/* Página de noticias: listado completo de publicaciones, de la más reciente a la más antigua. */
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNoticias } from '../contexts/NoticiasContext';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { obtenerUrlImagen } from '../utils/imagen';
import { fechaCorta, fechaRelativa } from '../utils/formato';

export function PaginaNoticias({ tipoInicial = 'noticias' }) {
  const { tema, modoOscuro } = useTheme();
  const { noticias, cargando, marcarTodasLeidas } = useNoticias();
  const esVistaEventos = tipoInicial === 'eventos';
  const publicacionesVisibles = noticias.filter((n) => esVistaEventos ? n.tipo === 'evento' : n.tipo !== 'evento');

  useEffect(() => {
    if (tipoInicial !== 'eventos') marcarTodasLeidas();
  }, [marcarTodasLeidas, tipoInicial]);

  return (
    <main className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-12 pb-24">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center h-11 w-11 shrink-0 rounded-xl ${
              modoOscuro ? 'bg-slate-800/60 text-amber-400' : 'bg-amber-50 text-amber-500'
            }`}
          >
            <Icono nombre={esVistaEventos ? 'calendar' : 'book'} className="h-6 w-6" strokeWidth={2} />
          </span>
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${tema.title}`}>
              {esVistaEventos ? 'Eventos' : 'Noticias'}
            </h1>
            <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
              {esVistaEventos ? 'Próximos eventos de Clubes UNID Campus Campeche' : 'Novedades y comunicados de la Dirección de Clubes UNID Campus Campeche'}
            </p>
          </div>
        </div>
      </div>

      {cargando ? (
        <Spinner className="py-20" />
      ) : publicacionesVisibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <span
            className={`flex items-center justify-center h-20 w-20 mb-4 rounded-2xl ${
              modoOscuro ? 'bg-slate-800/60 text-amber-400/70' : 'bg-amber-50 text-amber-400'
            }`}
          >
            <Icono nombre="book" className="h-10 w-10" strokeWidth={1.5} />
          </span>
          <p className={`text-sm ${tema.subtitle}`}>{esVistaEventos ? 'Todavía no hay eventos publicados' : 'Todavía no hay noticias publicadas'}</p>
        </div>
      ) : (
        <div className="mt-10 max-w-3xl space-y-6">
          {publicacionesVisibles.map((noticia) => (
            <article
              key={noticia.id_noticia}
              className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${
                modoOscuro
                  ? 'bg-[#0e162c] border-slate-700/50'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {noticia.url_imagen && (
                <div className="w-full h-52 sm:h-72 overflow-hidden">
                  <img
                    src={obtenerUrlImagen(noticia.url_imagen)}
                    alt={noticia.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {noticia.destacada && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Destacada
                    </span>
                  )}
                  {noticia.tipo === 'evento' && (
                    <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 bg-indigo-500/10 text-indigo-400">Evento</span>
                  )}
                  <span className={`text-[10px] ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                    {fechaRelativa(noticia.fecha_publicacion)}
                  </span>
                </div>
                <h2 className={`text-lg sm:text-xl font-black leading-snug ${tema.title}`}>
                  {noticia.titulo}
                </h2>
                {noticia.tipo === 'evento' && (
                  <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold ${modoOscuro ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {noticia.fecha_evento && <span>📅 {new Date(`${String(noticia.fecha_evento).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>}
                    {noticia.hora_evento && <span>🕒 {String(noticia.hora_evento).slice(0, 5)}</span>}
                    {noticia.lugar_evento && <span>📍 {noticia.lugar_evento}</span>}
                  </div>
                )}
                <p className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${tema.subtitle}`}>
                  {noticia.contenido}
                </p>
                <p className={`mt-4 text-[10px] uppercase tracking-wider ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                  Publicado el {fechaCorta(noticia.fecha_publicacion)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
