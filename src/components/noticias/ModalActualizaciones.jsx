/* Modal de "Actualizaciones": historial de noticias con la lista en el panel
   izquierdo (Master) y el detalle en el derecho. En móvil (< md) se transforma
   en una vista de una sola columna estilo Google News / Discover: tarjetas
   destacadas en banner, lista horizontal compacta para el resto y un detalle a
   pantalla completa. Paleta oscura del sitio (noche/azul marino) con acentos
   dorados. Cada tarjeta hereda el color de su categoría para identificarla de un
   vistazo y mantiene su propio indicador "No leído". Reutiliza NoticiasContext. */
import { useMemo, useState } from 'react';
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useNoticias } from '../../contexts/NoticiasContext';
import { obtenerUrlImagen } from '../../utils/imagen';
import { fechaCorta, fechaRelativa, recortarPalabras } from '../../utils/formato';

const CATEGORIAS = {
  promocion: {
    label: 'Promoción',
    badge: 'border-amber-500 bg-amber-500/20 text-amber-400',
    acento: 'border-amber-500',
    punto: 'bg-amber-400',
    glow: 'shadow-amber-500/20',
  },
  evento: {
    label: 'Evento',
    badge: 'border-red-500 bg-red-600/20 text-red-400',
    acento: 'border-red-500',
    punto: 'bg-red-400',
    glow: 'shadow-red-500/20',
  },
  informativo: {
    label: 'Informativo',
    badge: 'border-blue-500 bg-blue-600/20 text-blue-400',
    acento: 'border-blue-500',
    punto: 'bg-blue-400',
    glow: 'shadow-blue-500/20',
  },
};

const CATEGORIA_POR_DEFECTO = CATEGORIAS.informativo;

const OPCIONES_FILTRO = [
  { value: 'todos', label: 'Todas' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'evento', label: 'Evento' },
  { value: 'informativo', label: 'Informativo' },
];

function infoCategoria(categoria) {
  return CATEGORIAS[categoria] ?? CATEGORIA_POR_DEFECTO;
}

export function ModalActualizaciones() {
  const {
    noticias,
    cargando,
    actualizacionesAbiertas,
    cerrarActualizaciones,
    destacadasFijadas,
    marcarLeida,
    estaLeida,
  } = useNoticias();
  const [seleccionId, setSeleccionId] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  // Detalle a pantalla completa en móvil (null = lista).
  const [activeMobileNews, setActiveMobileNews] = useState(null);

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

  const totalNoLeidas = useMemo(
    () => filtradas.filter((n) => !estaLeida(n.id_noticia)).length,
    [filtradas, estaLeida]
  );

  // Las destacadas no leídas fijadas al abrir (snapshot en el contexto) se muestran
  // primero, sin reordenar durante la sesión; al reabrir el historial se recalculan.
  const ordenMostrado = useMemo(() => {
    const fijas = [];
    const resto = [];
    filtradas.forEach((n) => (destacadasFijadas.has(n.id_noticia) ? fijas : resto).push(n));
    return [...fijas, ...resto];
  }, [filtradas, destacadasFijadas]);

  const destacadasLista = ordenMostrado.filter((n) => destacadasFijadas.has(n.id_noticia));
  const restoLista = ordenMostrado.filter((n) => !destacadasFijadas.has(n.id_noticia));

  // Vista móvil: destacadas por su propio flag y el resto en lista compacta.
  const destacadasMobile = ordenMostrado.filter((n) => n.destacada);
  const restoMobile = ordenMostrado.filter((n) => !n.destacada);

  if (!actualizacionesAbiertas) return null;

  const noticia = ordenMostrado.find((n) => n.id_noticia === seleccionId) ?? ordenMostrado[0] ?? null;
  const categoriaActual = noticia ? infoCategoria(noticia.categoria) : null;

  const noticiaMobile = activeMobileNews;
  const categoriaMobile = noticiaMobile ? infoCategoria(noticiaMobile.categoria) : null;

  function seleccionar(n) {
    setSeleccionId(n.id_noticia);
    marcarLeida(n.id_noticia);
  }

  function abrirDetalleMobile(n) {
    setActiveMobileNews(n);
    marcarLeida(n.id_noticia);
  }

  function cambiarFiltro(valor) {
    setFiltroCategoria(valor);
    setSeleccionId(null);
  }

  function renderTarjeta(n) {
    const activa = noticia?.id_noticia === n.id_noticia;
    const urlImagen = obtenerUrlImagen(n.url_imagen);
    const cat = infoCategoria(n.categoria);
    const noLeida = !estaLeida(n.id_noticia);
    const secundario = n.subtitulo?.trim() || recortarPalabras(n.contenido, 10);
    return (
      <button
        key={n.id_noticia}
        onClick={() => seleccionar(n)}
        aria-current={activa}
        className={`relative block w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-200 ${cat.acento} ${
          activa
            ? `scale-[1.02] shadow-lg ${cat.glow}`
            : 'border-opacity-40 opacity-70 hover:opacity-100'
        }`}
      >
        {urlImagen && (
          <img
            src={urlImagen}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f19]/95 via-[#0b0f19]/85 to-[#0b0f19]/60" />
        <div className="relative p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${cat.punto}`} />
            {noLeida && (
              <span className="rounded-full border border-amber-500/60 bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                No leído
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold leading-snug text-white">{n.titulo}</h3>

          {secundario && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-400">{secundario}</p>
          )}

          <div className="mt-4 flex items-end justify-between gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${cat.badge}`}
            >
              {cat.label}
              {n.destacada ? ' · Destacada' : ''}
            </span>
            <span className="text-xs font-black text-amber-400 drop-shadow">
              {fechaCorta(n.fecha_publicacion)}
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Tarjeta destacada móvil: imagen banner completa + título grande.
  function renderDestacadaMobile(n) {
    const cat = infoCategoria(n.categoria);
    const urlImagen = obtenerUrlImagen(n.url_imagen);
    const noLeida = !estaLeida(n.id_noticia);
    const secundario = n.subtitulo?.trim() || recortarPalabras(n.contenido, 16);
    return (
      <button
        key={n.id_noticia}
        onClick={() => abrirDetalleMobile(n)}
        className={`block w-full overflow-hidden rounded-xl border-2 bg-[#131b2e] text-left transition-transform duration-200 active:scale-[0.99] ${cat.acento}`}
      >
        {urlImagen ? (
          <img src={urlImagen} alt="" aria-hidden="true" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-[#0b0f19] via-[#18223f] to-[#131b2e]">
            <Icono nombre="newspaper" className="h-10 w-10 text-slate-600" strokeWidth={1.5} />
          </div>
        )}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cat.badge}`}
            >
              {cat.label}
            </span>
            {noLeida && (
              <span className="rounded-full border border-amber-500/60 bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                No leído
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-black leading-snug text-white">{n.titulo}</h3>
          {secundario && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">{secundario}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-amber-400">
              {fechaCorta(n.fecha_publicacion)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {fechaRelativa(n.fecha_publicacion)}
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Otras noticias móvil: fila horizontal compacta con thumbnail cuadrado.
  function renderCompactaMobile(n) {
    const cat = infoCategoria(n.categoria);
    const urlImagen = obtenerUrlImagen(n.url_imagen);
    const secundario = n.subtitulo?.trim() || recortarPalabras(n.contenido, 12);
    return (
      <button
        key={n.id_noticia}
        onClick={() => abrirDetalleMobile(n)}
        className={`flex w-full flex-row items-center justify-between gap-3 rounded-xl border bg-[#131b2e] p-3 text-left transition-transform duration-200 active:scale-[0.99] ${cat.acento}`}
      >
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${cat.badge}`}
          >
            {cat.label}
          </span>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-white">
            {n.titulo}
          </h3>
          {secundario && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{secundario}</p>
          )}
        </div>
        {urlImagen ? (
          <img
            src={urlImagen}
            alt=""
            aria-hidden="true"
            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800/40 text-slate-600">
            <Icono nombre="image" className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
      </button>
    );
  }

  return (
    <ModalBase
      show
      onClose={cerrarActualizaciones}
      maxWidth="max-w-6xl"
      panelClassName="p-0 overflow-hidden border border-slate-800 bg-[#0b0f19] max-h-[92vh] md:max-h-[88vh]"
    >
      <div className="relative flex h-[85vh] max-h-[92vh] flex-col overflow-hidden border border-slate-800 bg-[#0b0f19] md:max-h-[88vh] md:flex-row">
        {/* Botón cerrar: neutro gris/blanco, sin rojo */}
        <button
          onClick={cerrarActualizaciones}
          aria-label="Cerrar actualizaciones"
          className="absolute top-3 right-3 z-30 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <Icono nombre="close" strokeWidth={2.5} className="h-4 w-4" />
        </button>

        {/* ══ Vista móvil: una sola columna (estilo Google News) ══ */}
        <div className="flex h-full min-h-0 w-full flex-col md:hidden">
          <header className="shrink-0 border-b border-slate-800 bg-[#0f172a] px-4 py-4 pr-14">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Noticias</h2>
              {!cargando && filtradas.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {filtradas.length} {filtradas.length === 1 ? 'nota' : 'notas'}
                </span>
              )}
            </div>

            {totalNoLeidas > 0 && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {totalNoLeidas} sin leer
              </p>
            )}

            <div className="mt-3">
              <label htmlFor="filtro-categoria-mobile" className="sr-only">
                Filtrar por categoría
              </label>
              <select
                id="filtro-categoria-mobile"
                value={filtroCategoria}
                onChange={(e) => cambiarFiltro(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-slate-700 bg-[#131b2e] px-3 py-2 text-xs font-black uppercase tracking-wider text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                {OPCIONES_FILTRO.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          </header>

          <div className="scrollbar-dark min-h-0 flex-1 space-y-6 overflow-y-auto bg-[#0b0f19] p-4">
            {cargando ? (
              <p className="text-sm text-slate-400">Cargando actualizaciones...</p>
            ) : filtradas.length === 0 ? (
              <p className="text-sm text-slate-400">No hay publicaciones en esta categoría.</p>
            ) : (
              <>
                {destacadasMobile.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="px-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Noticias destacadas
                    </h3>
                    {destacadasMobile.map(renderDestacadaMobile)}
                  </section>
                )}

                {restoMobile.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Otras noticias
                    </h3>
                    {restoMobile.map(renderCompactaMobile)}
                  </section>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ Vista escritorio: Master-Detail de dos columnas ══ */}
        {/* Panel izquierdo: historial de noticias */}
        <aside className="hidden w-full shrink-0 flex-col border-b border-slate-800 bg-[#0f172a] md:flex md:w-96 md:border-b-0 md:border-r">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Noticias</h2>
              {!cargando && filtradas.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {filtradas.length} {filtradas.length === 1 ? 'nota' : 'notas'}
                </span>
              )}
            </div>

            {totalNoLeidas > 0 && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {totalNoLeidas} sin leer
              </p>
            )}

            <div className="mt-3">
              <label htmlFor="filtro-categoria" className="sr-only">
                Filtrar por categoría
              </label>
              <select
                id="filtro-categoria"
                value={filtroCategoria}
                onChange={(e) => cambiarFiltro(e.target.value)}
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

          <div className="scrollbar-dark max-h-[45vh] flex-1 space-y-3 overflow-y-auto p-4 md:max-h-none md:min-h-0">
            {cargando ? (
              <p className="text-sm text-slate-400">Cargando actualizaciones...</p>
            ) : filtradas.length === 0 ? (
              <p className="text-sm text-slate-400">No hay publicaciones en esta categoría.</p>
            ) : (
              <>
                {destacadasLista.length > 0 && (
                  <>
                    <p className="px-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Destacadas sin leer
                    </p>
                    {destacadasLista.map(renderTarjeta)}
                  </>
                )}
                {destacadasLista.length > 0 && restoLista.length > 0 && (
                  <p className="px-1 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Todas las noticias
                  </p>
                )}
                {restoLista.map(renderTarjeta)}
              </>
            )}
          </div>
        </aside>

        {/* Panel derecho: detalle de la actualización */}
        <section className="scrollbar-dark hidden min-w-0 flex-1 overflow-y-auto bg-[#131b2e] p-5 sm:p-7 md:block">
          {!noticia ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Selecciona una noticia para ver el detalle.
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
                {obtenerUrlImagen(noticia.url_imagen) && (
                  <img
                    src={obtenerUrlImagen(noticia.url_imagen)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                  />
                )}
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

              {/* Subtítulo: justo debajo del título del banner */}
              {noticia.subtitulo?.trim() && (
                <p className="mt-4 text-base font-semibold leading-snug text-amber-300/90">
                  {noticia.subtitulo}
                </p>
              )}

              {/* Encabezado */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${categoriaActual.badge}`}
                >
                  {categoriaActual.label}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {fechaRelativa(noticia.fecha_publicacion)}
                </span>
                {noticia.destacada && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Destacada
                  </span>
                )}
              </div>

              {/* Cuerpo */}
              <p className="mt-5 text-sm leading-relaxed whitespace-pre-line break-words text-slate-300">
                {noticia.contenido}
              </p>

              <p className="mt-6 text-[10px] uppercase tracking-wider text-slate-500">
                Publicado el {fechaCorta(noticia.fecha_publicacion)}
              </p>
            </>
          )}
        </section>
      </div>

      {/* ══ Detalle móvil: panel a pantalla completa ══ */}
      {noticiaMobile && (
        <div className="scrollbar-dark fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[#0b0f19] p-4 md:hidden">
          <button
            onClick={() => setActiveMobileNews(null)}
            className="mb-4 inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white active:scale-95"
          >
            <Icono nombre="arrow-left" className="h-4 w-4" strokeWidth={2.5} />
            Regresar
          </button>

          {/* Imagen de cabecera en banner */}
          <div className="relative h-56 shrink-0 overflow-hidden rounded-xl border border-slate-800">
            <div className="h-full w-full bg-gradient-to-br from-[#0b0f19] via-[#18223f] to-[#131b2e]" />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(60% 80% at 70% 20%, rgba(245,158,11,0.25), transparent 70%)',
              }}
            />
            {obtenerUrlImagen(noticiaMobile.url_imagen) && (
              <img
                src={obtenerUrlImagen(noticiaMobile.url_imagen)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/30 to-transparent" />
          </div>

          {/* Badge de categoría + metadatos */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${categoriaMobile.badge}`}
            >
              {categoriaMobile.label}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
              {fechaRelativa(noticiaMobile.fecha_publicacion)}
            </span>
            {noticiaMobile.destacada && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                Destacada
              </span>
            )}
          </div>

          {/* Título + subtítulo + cuerpo */}
          <h2 className="mt-3 text-xl font-black leading-snug text-white">
            {noticiaMobile.titulo}
          </h2>
          {noticiaMobile.subtitulo?.trim() && (
            <p className="mt-2 text-base font-semibold leading-snug text-amber-300/90">
              {noticiaMobile.subtitulo}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line break-words text-slate-300">
            {noticiaMobile.contenido}
          </p>
          <p className="mt-6 shrink-0 pb-4 text-[10px] uppercase tracking-wider text-slate-500">
            Publicado el {fechaCorta(noticiaMobile.fecha_publicacion)}
          </p>
        </div>
      )}
    </ModalBase>
  );
}
