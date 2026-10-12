/* Modal de "Actualizaciones": lista de noticias en el panel izquierdo y detalle ("Update Log")
   en el derecho. Paleta oscura del sitio (noche/azul marino) con acentos dorados y botón de
   cierre neutro gris/blanco. Reutiliza los datos públicos de NoticiasContext. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useNoticias } from '../../contexts/NoticiasContext';
import { obtenerUrlImagen } from '../../utils/imagen';
import { fechaCorta, fechaRelativa } from '../../utils/formato';

const CATEGORIAS = {
  promocion: { label: 'Promoción', badge: 'border-amber-500/40 bg-amber-500/15 text-amber-400' },
  evento: { label: 'Evento', badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' },
  informativo: { label: 'Informativo', badge: 'border-sky-500/30 bg-sky-500/15 text-sky-400' },
};

const OPCIONES_FILTRO = [
  { value: 'todos', label: 'Todas' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'evento', label: 'Evento' },
  { value: 'informativo', label: 'Informativo' },
];

export function ModalActualizaciones() {
  const navigate = useNavigate();
  const {
    noticias,
    cargando,
    actualizacionesAbiertas,
    cerrarActualizaciones,
    marcarLeida,
  } = useNoticias();
  const [seleccionId, setSeleccionId] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');

  const ordenadas = useMemo(
    () => [...noticias].sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion)),
    [noticias]
  );

  const filtradas = useMemo(
    () =>
      filtroCategoria === 'todos'
        ? ordenadas
        : ordenadas.filter((n) => n.categoria === filtroCategoria),
    [ordenadas, filtroCategoria]
  );

  if (!actualizacionesAbiertas) return null;

  const noticia = filtradas.find((n) => n.id_noticia === seleccionId) ?? filtradas[0] ?? null;
  const categoriaActual = noticia ? CATEGORIAS[noticia.categoria] ?? CATEGORIAS.informativo : null;

  function seleccionar(n) {
    setSeleccionId(n.id_noticia);
    marcarLeida(n.id_noticia);
  }

  return (
    <ModalBase
      show
      onClose={cerrarActualizaciones}
      maxWidth="max-w-6xl"
      panelClassName="p-0 overflow-hidden border border-slate-800 bg-[#0b0f19] max-h-[88vh]"
    >
      <div className="relative flex h-[85vh] max-h-[88vh] flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Botón cerrar: estilo neutro gris/blanco, sin rojo */}
        <button
          onClick={cerrarActualizaciones}
          aria-label="Cerrar actualizaciones"
          className="absolute top-3 right-3 z-30 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <Icono nombre="close" strokeWidth={2.5} className="h-4 w-4" />
        </button>

        {/* ── Panel izquierdo: lista de actualizaciones ── */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-[#0f172a] md:w-96 md:border-r md:border-b-0">
<div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Noticias</h2>
              {!cargando && filtradas.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {filtradas.length} {filtradas.length === 1 ? 'nota' : 'notas'}
                </span>
              )}
            </div>

            <div className="mt-3">
              <label htmlFor="filtro-categoria" className="sr-only">
                Filtrar por categoría
              </label>
              <select
                id="filtro-categoria"
                value={filtroCategoria}
                onChange={(e) => {
                  setFiltroCategoria(e.target.value);
                  setSeleccionId(null);
                }}
                className="w-full cursor-pointer rounded-lg border border-slate-700 bg-[#131b2e] px-3 py-2 text-xs font-black uppercase tracking-wider text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                {OPCIONES_FILTRO.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[45vh] flex-1 space-y-3 overflow-y-auto p-4 md:max-h-none md:min-h-0">
            {cargando ? (
              <p className="text-sm text-slate-400">Cargando actualizaciones…</p>
            ) : filtradas.length === 0 ? (
              <p className="text-sm text-slate-400">No hay publicaciones en esta categoría.</p>
            ) : (
              filtradas.map((n) => {
                const activa = noticia?.id_noticia === n.id_noticia;
                const urlImagen = obtenerUrlImagen(n.url_imagen);
                return (
                  <button
                    key={n.id_noticia}
                    onClick={() => seleccionar(n)}
                    className={`relative block w-full overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                      activa
                        ? 'scale-[1.02] border-amber-500 shadow-lg shadow-amber-500/20'
                        : 'border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {urlImagen && (
                      <img src={urlImagen} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f19]/95 via-[#0b0f19]/85 to-[#0b0f19]/60" />
                    <div className="relative p-4">
                      <span className={`mb-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 ${activa ? '' : 'bg-amber-400/50'}`} />
                      <h3 className="text-sm font-bold leading-snug text-white">{n.titulo}</h3>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            n.destacada ? 'text-amber-400' : 'text-amber-400/70'
                          }`}
                        >
                          {CATEGORIAS[n.categoria]?.label ?? 'Informativo'}
                          {n.destacada ? ' • Destacada' : ''}
                        </span>
                        <span className="text-xs font-black text-amber-400 drop-shadow">
                          {fechaCorta(n.fecha_publicacion)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800 px-5 py-3">
            <button
              onClick={() => {
                cerrarActualizaciones();
                navigate(noticia?.categoria === 'evento' ? '/eventos' : '/noticias');
              }}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-black uppercase tracking-widest text-amber-400 transition-colors hover:text-amber-300"
            >
              Ver lista completa
              <Icono nombre="arrow-right" strokeWidth={2.5} className="h-3 w-3" />
            </button>
          </div>
        </aside>

        {/* ── Panel derecho: detalle de la actualización ── */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-[#131b2e] p-5 sm:p-7">
          {!noticia ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Selecciona una actualización.
            </div>
          ) : (
            <>
              {/* Banner superior */}
              <div className="relative h-52 overflow-hidden rounded-xl border border-slate-800 sm:h-64">
                <div className="h-full w-full bg-gradient-to-br from-[#0b0f19] via-[#18223f] to-[#131b2e]" />
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      'radial-gradient(60% 80% at 70% 20%, rgba(245,158,11,0.25), transparent 70%)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <h3 className="text-lg font-extrabold leading-snug text-white drop-shadow sm:text-xl">
                    {noticia.titulo}
                  </h3>
                  <span className="shrink-0 rounded-full border border-amber-500/40 bg-[#0b0f19]/80 px-3 py-1 text-xs font-black text-amber-400">
                    {fechaCorta(noticia.fecha_publicacion)}
                  </span>
                </div>
              </div>

              {/* Encabezado */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-extrabold text-white">Noticias recientes:</h3>
                  <span className="text-xs font-black text-amber-400">
                    {fechaRelativa(noticia.fecha_publicacion)}
                  </span>
                </div>
                <div className="mt-2 border-b border-slate-700 pb-2" />

                <h4 className="mt-4 text-lg font-extrabold text-amber-400 sm:text-xl">
                  {noticia.titulo}
                </h4>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${categoriaActual.badge}`}>
                    {categoriaActual.label}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Noticias
                  </span>
                  {noticia.destacada && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Destacada
                    </span>
                  )}
                </div>
              </div>

              {/* Cuerpo */}
              <p className="mt-5 text-sm leading-relaxed whitespace-pre-line break-words text-slate-300">
                {noticia.contenido}
              </p>

              {/* Vista previa de la imagen */}
              {obtenerUrlImagen(noticia.url_imagen) && (
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
                  <img
                    src={obtenerUrlImagen(noticia.url_imagen)}
                    alt={noticia.titulo}
                    className="max-h-80 w-full object-cover"
                  />
                </div>
              )}

              <p className="mt-5 text-[10px] uppercase tracking-wider text-slate-500">
                Publicado el {fechaCorta(noticia.fecha_publicacion)}
              </p>
            </>
          )}
        </section>
      </div>
    </ModalBase>
  );
}
