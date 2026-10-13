/* Página pública con pestañas de noticias y eventos. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useNoticias } from '../contexts/NoticiasContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { api } from '../services/api';
import { CATEGORIAS_EVENTO, normalizarCategoriaEvento } from '../constants/categoriasEvento';
import { fechaHoyCampus } from '../utils/fechas';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { TarjetaNoticia } from '../components/noticias/TarjetaNoticia';

export function PaginaNoticias({ onLoginClick }) {
  const { tema, modoOscuro } = useTheme();
  const { usuario } = useAutenticacion();
  const { noticias, eventos, cargando, marcarTodasLeidas } = useNoticias();
  const [parametros, setParametros] = useSearchParams();
  const esVistaEventos = parametros.get('seccion') === 'eventos';
  const [categoriaEvento, setCategoriaEvento] = useState('todos');
  const [interesesUsuario, setInteresesUsuario] = useState({ id: null, ids: [] });
  const [conteos, setConteos] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);
  const [recienConfirmadoId, setRecienConfirmadoId] = useState(null);
  const [errorInteres, setErrorInteres] = useState('');
  const usuarioId = usuario?.id_usuario ?? usuario?.id ?? null;
  const intereses = interesesUsuario.id === usuarioId ? interesesUsuario.ids : [];

  useEffect(() => {
    if (recienConfirmadoId === null) return;
    const temporizador = window.setTimeout(() => setRecienConfirmadoId(null), 1150);
    return () => window.clearTimeout(temporizador);
  }, [recienConfirmadoId]);
  const eventosOrdenados = useMemo(() => {
    const hoy = fechaHoyCampus();
    return [...eventos].sort((a, b) => {
      const fechaA = String(a.fecha_evento || '').slice(0, 10);
      const fechaB = String(b.fecha_evento || '').slice(0, 10);
      const pasadoA = fechaA < hoy;
      const pasadoB = fechaB < hoy;
      if (pasadoA !== pasadoB) return pasadoA ? 1 : -1;
      return pasadoA ? fechaB.localeCompare(fechaA) : fechaA.localeCompare(fechaB);
    });
  }, [eventos]);
  const publicacionesVisibles = esVistaEventos
    ? eventosOrdenados.filter((evento) => categoriaEvento === 'todos' || normalizarCategoriaEvento(evento.categoria_evento) === categoriaEvento)
    : noticias.filter((n) => n.categoria !== 'evento');

  useEffect(() => {
    if (!esVistaEventos || !usuarioId) return;
    let vigente = true;
    api.getMisInteresesEventos()
      .then((ids) => {
        if (!Array.isArray(ids)) throw new Error('Respuesta de intereses no válida');
        if (vigente) setInteresesUsuario({ id: usuarioId, ids: ids.map(Number) });
      })
      .catch(() => {
        if (vigente) {
          setErrorInteres('No se pudieron cargar tus intereses.');
        }
      });
    return () => { vigente = false; };
  }, [esVistaEventos, usuarioId]);

  async function alternarInteres(evento) {
    if (!usuario) {
      onLoginClick?.();
      return;
    }
    if (procesandoId !== null) return;
    const id = evento.id_noticia;
    const interesado = intereses.includes(id);
    if (interesado) return;
    setProcesandoId(id);
    setErrorInteres('');
    try {
      const respuesta = await api.marcarInteresEvento(id);
      setInteresesUsuario((actual) => {
        const ids = actual.id === usuarioId ? actual.ids : [];
        return {
          id: usuarioId,
          ids: respuesta.interesado ? [...new Set([...ids, id])] : ids,
        };
      });
      if (respuesta.interesado) setRecienConfirmadoId(id);
      setConteos((actual) => ({ ...actual, [id]: respuesta.total_interesados }));
    } catch (error) {
      setErrorInteres(error.message || 'No se pudo actualizar tu interés.');
    } finally {
      setProcesandoId(null);
    }
  }

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
          <h1 className={`text-3xl font-black tracking-tight ${tema.title}`}>Noticias y eventos</h1>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            Novedades, comunicados y actividades de Clubes UNID Campus Campeche
          </p>
        </div>
      </div>

      <div className={`mt-8 inline-flex rounded-xl border p-1 ${modoOscuro ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`} role="tablist" aria-label="Contenido de noticias">
        {[{ value: 'noticias', label: 'Noticias', icon: 'book' }, { value: 'eventos', label: 'Eventos', icon: 'calendar' }].map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            role="tab"
            aria-selected={(esVistaEventos ? 'eventos' : 'noticias') === opcion.value}
            onClick={() => setParametros(opcion.value === 'eventos' ? { seccion: 'eventos' } : {})}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition-colors cursor-pointer ${(esVistaEventos ? 'eventos' : 'noticias') === opcion.value
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : modoOscuro ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
          >
            <Icono nombre={opcion.icon} className="h-4 w-4" strokeWidth={2} />
            {opcion.label}
            {opcion.value === 'eventos' && eventos.length > 0 && <span className="rounded-full bg-slate-950/10 px-1.5 py-0.5 text-[10px]">{eventos.length}</span>}
          </button>
        ))}
      </div>

      {esVistaEventos && (
        <div className="mt-8">
          <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>Filtrar por categoría</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías de eventos">
            {[{ value: 'todos', label: 'Todos' }, ...CATEGORIAS_EVENTO].map((categoria) => (
              <button key={categoria.value} type="button" onClick={() => setCategoriaEvento(categoria.value)}
                aria-pressed={categoriaEvento === categoria.value}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${categoriaEvento === categoria.value
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : modoOscuro ? 'border-slate-700 text-slate-300 hover:border-amber-400'
                    : 'border-slate-300 text-slate-700 hover:border-amber-400'}`}
              >{categoria.label}</button>
            ))}
          </div>
          {errorInteres && <p role="alert" className="mt-3 text-xs font-medium text-red-400">{errorInteres}</p>}
        </div>
      )}

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
          <p className={`text-sm ${tema.subtitle}`}>{esVistaEventos ? (eventos.length ? 'No hay eventos en esta categoría' : 'Todavía no hay eventos publicados') : 'Todavía no hay noticias publicadas'}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {publicacionesVisibles.map((noticia) => (
            <TarjetaNoticia key={noticia.id_noticia} noticia={noticia}
              interesado={intereses.includes(noticia.id_noticia)}
              interesReciente={recienConfirmadoId === noticia.id_noticia}
              totalInteresados={conteos[noticia.id_noticia] ?? noticia.total_interesados ?? 0}
              interesProcesando={procesandoId !== null || Boolean(usuarioId && interesesUsuario.id !== usuarioId)}
              onToggleInteres={esVistaEventos ? () => alternarInteres(noticia) : undefined}
            />
          ))}
        </div>
      )}
    </main>
  );
}
