/* Modal de "Actualizaciones": historial de noticias y eventos con la lista en el panel
   izquierdo (Master) y el detalle en el derecho. En móvil (< md) se transforma
   en una vista de una sola columna estilo Google News / Discover: tarjetas
   destacadas en banner, lista horizontal compacta para el resto y un detalle a
   pantalla completa. Paleta oscura del sitio (noche/azul marino) con acentos
   dorados. Cada tarjeta hereda el color de su categoría para identificarla de un
   vistazo y mantiene su propio indicador "No leído". Reutiliza NoticiasContext. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useNoticias } from '../../contexts/NoticiasContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { fechaHoyCampus } from '../../utils/fechas';
import { obtenerUrlImagen } from '../../utils/imagen';
import { fechaCorta, fechaEventoCorta, fechaRelativa, recortarPalabras } from '../../utils/formato';

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
  { value: 'todos', label: 'Todas las publicaciones' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'evento', label: 'Eventos' },
  { value: 'informativo', label: 'Informativo' },
];

function SelectorCategorias({ id, valor, alCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const opcionesRef = useRef([]);
  const seleccionada = OPCIONES_FILTRO.find((opcion) => opcion.value === valor) ?? OPCIONES_FILTRO[0];

  useEffect(() => {
    if (!abierto) return;
    function cerrarAlPulsarFuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) setAbierto(false);
    }
    document.addEventListener('pointerdown', cerrarAlPulsarFuera);
    return () => document.removeEventListener('pointerdown', cerrarAlPulsarFuera);
  }, [abierto]);

  useEffect(() => {
    if (abierto) opcionesRef.current[activo]?.focus();
  }, [abierto, activo]);

  function abrir() {
    setActivo(Math.max(0, OPCIONES_FILTRO.findIndex((opcion) => opcion.value === valor)));
    setAbierto(true);
  }

  function cerrar(devolverFoco = false) {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  }

  function elegir(valorElegido) {
    alCambiar(valorElegido);
    cerrar(true);
  }

  function manejarTeclaLista(evento) {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        setActivo((indice) => (indice + 1) % OPCIONES_FILTRO.length);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        setActivo((indice) => (indice - 1 + OPCIONES_FILTRO.length) % OPCIONES_FILTRO.length);
        break;
      case 'Home':
        evento.preventDefault();
        setActivo(0);
        break;
      case 'End':
        evento.preventDefault();
        setActivo(OPCIONES_FILTRO.length - 1);
        break;
      case 'Escape':
        evento.preventDefault();
        evento.stopPropagation();
        cerrar(true);
        break;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        elegir(OPCIONES_FILTRO[activo].value);
        break;
      case 'Tab':
        setAbierto(false);
        break;
      default:
        break;
    }
  }

  return (
    <div ref={contenedorRef} className="relative mt-3">
      <span id={`${id}-label`} className="mb-2 block text-xs font-semibold text-slate-300">Filtrar por categoría</span>
      <button
        ref={botonRef}
        id={id}
        type="button"
        aria-labelledby={`${id}-label ${id}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-opciones`}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            abrir();
          }
        }}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-[#172238] px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300/25 ${
          abierto ? 'border-amber-300' : 'border-slate-600 hover:border-amber-300/70'
        }`}
      >
        <Icono nombre="filter" className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate">{seleccionada.label}</span>
        <Icono nombre="chevron-down" className={`h-4 w-4 shrink-0 text-amber-300 transition-transform ${abierto ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>
      {abierto && (
        <div
          id={`${id}-opciones`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          onKeyDown={manejarTeclaLista}
          className="absolute top-full right-0 left-0 z-50 mt-2 rounded-xl border border-slate-600 bg-[#121d30] p-1.5 shadow-[0_14px_32px_rgba(2,6,23,0.45)]"
        >
          {OPCIONES_FILTRO.map((opcion, indice) => {
            const elegida = valor === opcion.value;
            return (
              <button
                key={opcion.value}
                ref={(elemento) => { opcionesRef.current[indice] = elemento; }}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={elegida}
                onClick={() => elegir(opcion.value)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-300/50 ${
                  elegida ? 'bg-amber-300/15 font-semibold text-amber-200' : 'text-slate-200 hover:bg-slate-700/70'
                }`}
              >
                <span className="flex-1">{opcion.label}</span>
                {elegida && <Icono nombre="check" className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function infoCategoria(categoria) {
  return CATEGORIAS[categoria] ?? CATEGORIA_POR_DEFECTO;
}

function EtiquetaTendencia({ publicacion, totalInteresados, className = '' }) {
  const total = Number(totalInteresados ?? publicacion.total_interesados) || 0;
  if (publicacion.categoria !== 'evento' || total <= 10) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 ${className}`}>
      <Icono nombre="zap" className="h-3.5 w-3.5" strokeWidth={2} />
      En tendencia · {total} interesados
    </span>
  );
}

export function ModalActualizaciones({ onLoginClick }) {
  const {
    noticias,
    eventos,
    cargando,
    actualizacionesAbiertas,
    filtroActualizaciones,
    setFiltroActualizaciones,
    cerrarActualizaciones,
    destacadasFijadas,
    marcarLeida,
    estaLeida,
    refetch,
  } = useNoticias();
  const { usuario } = useAutenticacion();
  const [seleccionId, setSeleccionId] = useState(null);
  // Detalle a pantalla completa en móvil (null = lista).
  const [activeMobileNews, setActiveMobileNews] = useState(null);
  const [interesesUsuario, setInteresesUsuario] = useState({ id: null, ids: [] });
  const [conteos, setConteos] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);
  const [recienConfirmadoId, setRecienConfirmadoId] = useState(null);
  const [errorInteres, setErrorInteres] = useState('');
  const [errorConsultaIntereses, setErrorConsultaIntereses] = useState({ id: null, mensaje: '' });
  const usuarioId = usuario?.id_usuario ?? usuario?.id ?? null;
  const intereses = interesesUsuario.id === usuarioId ? interesesUsuario.ids : [];

  useEffect(() => {
    if (recienConfirmadoId === null) return;
    const temporizador = window.setTimeout(() => setRecienConfirmadoId(null), 1150);
    return () => window.clearTimeout(temporizador);
  }, [recienConfirmadoId]);

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    api.getMisInteresesEventos()
      .then((ids) => {
        if (!Array.isArray(ids)) throw new Error('Respuesta de intereses no válida');
        if (vigente) {
          setInteresesUsuario({ id: usuarioId, ids: ids.map(Number) });
          setErrorConsultaIntereses({ id: usuarioId, mensaje: '' });
        }
      })
      .catch(() => {
        if (vigente) {
          setErrorConsultaIntereses({ id: usuarioId, mensaje: 'No se pudieron cargar tus intereses. Recarga para intentarlo de nuevo.' });
        }
      });
    return () => { vigente = false; };
  }, [usuarioId]);

  const ordenadas = useMemo(() => {
    const publicaciones = new Map(noticias.map((noticia) => [noticia.id_noticia, noticia]));
    eventos.forEach((evento) => publicaciones.set(evento.id_noticia, evento));
    return [...publicaciones.values()].sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
  }, [noticias, eventos]);

  const filtradas = useMemo(
    () =>
      filtroActualizaciones === 'todos'
        ? ordenadas
        : ordenadas.filter((n) => n.categoria === filtroActualizaciones),
    [ordenadas, filtroActualizaciones]
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
    setErrorInteres('');
    marcarLeida(n.id_noticia);
  }

  function abrirDetalleMobile(n) {
    setActiveMobileNews(n);
    setErrorInteres('');
    marcarLeida(n.id_noticia);
  }

  function cambiarFiltro(valor) {
    setFiltroActualizaciones(valor);
    setSeleccionId(null);
  }

  async function mostrarInteres(evento) {
    if (!usuario) {
      onLoginClick?.();
      return;
    }
    const id = evento.id_noticia;
    if (procesandoId !== null || interesesUsuario.id !== usuarioId || intereses.includes(id)) return;
    setProcesandoId(id);
    setErrorInteres('');
    try {
      const respuesta = await api.marcarInteresEvento(id);
      setInteresesUsuario((actual) => ({
        id: usuarioId,
        ids: [...new Set([...(actual.id === usuarioId ? actual.ids : []), id])],
      }));
      setRecienConfirmadoId(id);
      setConteos((actual) => ({ ...actual, [id]: respuesta.total_interesados }));
      refetch();
    } catch (error) {
      setErrorInteres(error.message || 'No se pudo registrar tu interés.');
    } finally {
      setProcesandoId(null);
    }
  }

  function renderInteres(evento) {
    if (evento.categoria !== 'evento') return null;
    const interesado = intereses.includes(evento.id_noticia);
    const finalizado = !evento.fecha_evento || String(evento.fecha_evento).slice(0, 10) < fechaHoyCampus();
    const errorConsulta = usuarioId && errorConsultaIntereses.id === usuarioId ? errorConsultaIntereses.mensaje : '';
    const comprobandoInteres = Boolean(usuarioId && interesesUsuario.id !== usuarioId);
    const errorVisible = errorConsulta || errorInteres;
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-4">
        {interesado ? (
          <button type="button" disabled
            aria-label={`Interés confirmado en ${evento.titulo}`}
            title="Tu interés quedó guardado en tu cuenta"
            className={`boton-interes-confirmado${recienConfirmadoId === evento.id_noticia ? ' boton-interes-confirmado--reciente' : ''}`}
          >
            <span className="interes-confirmado-marca">
              <Icono nombre="check" className="h-4 w-4" strokeWidth={3} />
            </span>
            Interés confirmado
          </button>
        ) : comprobandoInteres ? (
          <div role="status" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-xs font-semibold text-slate-300">
            <span className={`h-2 w-2 rounded-full ${errorConsulta ? 'bg-red-400' : 'animate-pulse bg-amber-400'}`} aria-hidden="true" />
            {errorConsulta ? 'Estado no disponible' : 'Comprobando tu interés...'}
          </div>
        ) : (
          <button type="button" onClick={() => mostrarInteres(evento)}
            disabled={procesandoId !== null || finalizado}
            aria-label={`Mostrar interés en ${evento.titulo}`}
            className={finalizado
              ? 'inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-400'
              : `boton-interes-cta${procesandoId === evento.id_noticia ? ' boton-interes-cta--procesando' : ''}`}
          >
            {finalizado ? <Icono nombre="clock" className="h-4 w-4" strokeWidth={2.3} /> : (
              <span className="interes-cta-estrella" aria-hidden="true">
                <Icono nombre="star" className="h-4 w-4" strokeWidth={2.3} />
              </span>
            )}
            <span>{finalizado ? 'Evento finalizado' : procesandoId === evento.id_noticia ? 'Guardando interés...' : 'Mostrar interés'}</span>
          </button>
        )}
        <EtiquetaTendencia publicacion={evento} totalInteresados={conteos[evento.id_noticia]} />
        {errorVisible && <p role="alert" className="w-full text-xs font-medium text-red-400">{errorVisible}</p>}
      </div>
    );
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
          {n.categoria === 'evento' && n.fecha_evento && <p className="mt-1 text-xs font-semibold text-amber-300">📅 {fechaEventoCorta(n.fecha_evento)}</p>}
          <EtiquetaTendencia publicacion={n} totalInteresados={conteos[n.id_noticia]} className="mt-2" />

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
          {n.categoria === 'evento' && n.fecha_evento && <p className="mt-1 text-xs font-semibold text-amber-300">📅 {fechaEventoCorta(n.fecha_evento)}</p>}
          <EtiquetaTendencia publicacion={n} totalInteresados={conteos[n.id_noticia]} className="mt-2" />
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
          {n.categoria === 'evento' && n.fecha_evento && <p className="mt-1 text-xs font-semibold text-amber-300">📅 {fechaEventoCorta(n.fecha_evento)}</p>}
          <EtiquetaTendencia publicacion={n} totalInteresados={conteos[n.id_noticia]} className="mt-2" />
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
          <header className="relative z-20 shrink-0 border-b border-slate-800 bg-[#0f172a] px-4 py-4 pr-14">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Noticias y eventos</h2>
              {!cargando && filtradas.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {filtradas.length} {filtradas.length === 1 ? 'publicación' : 'publicaciones'}
                </span>
              )}
            </div>

            {totalNoLeidas > 0 && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {totalNoLeidas} sin leer
              </p>
            )}

            <SelectorCategorias id="filtro-categoria-mobile" valor={filtroActualizaciones} alCambiar={cambiarFiltro} />
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
                      Publicaciones destacadas
                    </h3>
                    {destacadasMobile.map(renderDestacadaMobile)}
                  </section>
                )}

                {restoMobile.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Otras publicaciones
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
          <div className="relative z-20 border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Noticias y eventos</h2>
              {!cargando && filtradas.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {filtradas.length} {filtradas.length === 1 ? 'publicación' : 'publicaciones'}
                </span>
              )}
            </div>

            {totalNoLeidas > 0 && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {totalNoLeidas} sin leer
              </p>
            )}

            <SelectorCategorias id="filtro-categoria" valor={filtroActualizaciones} alCambiar={cambiarFiltro} />
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
                    Todas las publicaciones
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
              Selecciona una publicación para ver el detalle.
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

              {noticia.categoria === 'evento' && noticia.fecha_evento && (
                <p className="mt-4 text-sm font-semibold text-amber-300">
                  📅 {fechaEventoCorta(noticia.fecha_evento)}
                  {noticia.hora_evento && ` · 🕒 ${String(noticia.hora_evento).slice(0, 5)}`}
                  {noticia.lugar_evento && ` · 📍 ${noticia.lugar_evento}`}
                </p>
              )}
              {renderInteres(noticia)}
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
          {noticiaMobile.categoria === 'evento' && noticiaMobile.fecha_evento && (
            <p className="mt-3 text-sm font-semibold text-amber-300">
              📅 {fechaEventoCorta(noticiaMobile.fecha_evento)}
              {noticiaMobile.hora_evento && ` · 🕒 ${String(noticiaMobile.hora_evento).slice(0, 5)}`}
              {noticiaMobile.lugar_evento && ` · 📍 ${noticiaMobile.lugar_evento}`}
            </p>
          )}
          {renderInteres(noticiaMobile)}
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
