/* Página de noticias: listado completo de publicaciones, de la más reciente a la más antigua. */
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNoticias } from '../contexts/NoticiasContext';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { TarjetaNoticia } from '../components/noticias/TarjetaNoticia';

export function PaginaNoticias({ tipoInicial = 'noticias' }) {
  const { tema, modoOscuro } = useTheme();
  const { noticias, eventos, cargando, marcarTodasLeidas } = useNoticias();
  const esVistaEventos = tipoInicial === 'eventos';
  const publicacionesVisibles = esVistaEventos ? eventos : noticias.filter((n) => n.categoria !== 'evento');

  useEffect(() => {
    if (!esVistaEventos) marcarTodasLeidas();
  }, [marcarTodasLeidas, esVistaEventos]);

  return (
    <main className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-12 pb-24">
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
            {esVistaEventos ? 'Actividades y eventos de Clubes UNID Campus Campeche' : 'Novedades y comunicados de la Dirección de Clubes UNID Campus Campeche'}
          </p>
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
            <Icono nombre={esVistaEventos ? 'calendar' : 'book'} className="h-10 w-10" strokeWidth={1.5} />
          </span>
          <p className={`text-sm ${tema.subtitle}`}>{esVistaEventos ? 'Todavía no hay eventos publicados' : 'Todavía no hay noticias publicadas'}</p>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          {publicacionesVisibles.map((noticia) => (
            <TarjetaNoticia key={noticia.id_noticia} noticia={noticia} />
          ))}
        </div>
      )}
    </main>
  );
}
