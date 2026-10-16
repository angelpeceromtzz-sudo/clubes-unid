/* Landing pública /conoce-clubs — presentación Mobile First de Clubs UNID
   Campeche. Compuesta como bandas diferenciadas: hero con invitación y panel
   de composición (identidad + experiencias + conteo real de propuestas),
   banda del concepto de club, propuestas reales desde la API (carrusel
   lateral en móvil y grid con «Mostrar más» en escritorio), encuesta
   inmediatamente después de las propuestas, Modelo de Formación Integral
   (VIVE) e iniciativa estudiantil. Sin accesos al catálogo ni al portal
   principal en esta etapa. Secciones secundarias con aparición suave una
   sola vez (IntersectionObserver + .landing-reveal, con
   prefers-reduced-motion). No requiere sesión; los CTAs de encuesta solo se
   activan con ENCUESTA_SLUG en src/config/landing.js.
   Se monta fuera del layout del sistema (ver App.jsx) con su propia barra. */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { obtenerUrlImagen } from '../utils/imagen';
import { clasesBadge } from '../constants/colores';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { Alerta } from '../components/ui/Alerta';
import { Logotipo } from '../components/layout/barra-navegacion/Logotipo';
import {
  LANDING,
  hayEncuesta,
  rutaEncuesta,
} from '../config/landing';

const CONTENEDOR = 'w-full px-6 sm:px-8 lg:px-12 xl:px-16';
const CATEGORIA_ORDEN = ['Deportes', 'Cultura', 'Tecnología'];
// Vista previa del grid de escritorio: si hay más propuestas, se ocultan
// detrás del botón «Mostrar más» (se revelan de seis en seis).
const PROPUESTAS_VISIBLES = 6;

// Foco visible compartido: anillo ámbar sobre superficies; en botones ámbar
// sólidos el anillo va con offset del mismo ámbar para leerse sobre cualquier
// fondo de sección sin depend del tema.
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80';
const FOCO_PRIMARIO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e162c] focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400';

function BotonEncuesta({ className = '', grande = false, fondoPanel = false }) {
  const { modoOscuro } = useTheme();
  const disponible = hayEncuesta();
  const base = grande
    ? 'inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black rounded-full transition duration-200 active:scale-[0.98]'
    : 'inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold rounded-full transition duration-200 active:scale-[0.98]';

  if (!disponible) {
    const preparacion = fondoPanel
      ? 'bg-white/5 border-dashed border-white/30 text-slate-300'
      : modoOscuro
        ? 'bg-slate-800/50 border-dashed border-slate-600 text-slate-300'
        : 'bg-white border-dashed border-slate-300 text-slate-500';
    return (
      <span
        className={`${base} border cursor-not-allowed ${preparacion} ${className}`}
        aria-disabled="true"
        title={LANDING.encuesta.sinDestino}
      >
        <Icono nombre="clock" strokeWidth={2} className="h-4 w-4 shrink-0" />
        {LANDING.encuesta.btnNoDisponible}
      </span>
    );
  }

  return (
    <Link
      to={rutaEncuesta()}
      className={`${base} bg-amber-400 text-[#0e162c] hover:bg-amber-300 ${FOCO_PRIMARIO} ${className}`}
    >
      <Icono nombre="clipboard" strokeWidth={2} className="h-4 w-4 shrink-0" />
      {LANDING.encuesta.btnDisponible}
    </Link>
  );
}

function BotonExplorar({ className = '', primario = false }) {
  const { modoOscuro } = useTheme();
  const base =
    'inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black rounded-full transition duration-200 active:scale-[0.98]';

  if (primario) {
    return (
      <a
        href={`#${LANDING.explorar.seccionPropuestas}`}
        className={`${base} bg-amber-400 text-[#0e162c] hover:bg-amber-300 ${FOCO_PRIMARIO} ${className}`}
      >
        <Icono nombre="search" strokeWidth={2} className="h-4 w-4 shrink-0" />
        {LANDING.explorar.btn}
      </a>
    );
  }

  const contorno = modoOscuro
    ? 'border border-slate-600 text-white hover:border-amber-400/60 hover:bg-slate-800/60'
    : 'border border-slate-300 text-slate-900 hover:border-amber-500/60 hover:bg-amber-50';

  return (
    <a
      href={`#${LANDING.explorar.seccionPropuestas}`}
      className={`${base} ${contorno} ${FOCO} ${className}`}
    >
      <Icono nombre="search" strokeWidth={2} className="h-4 w-4 shrink-0" />
      {LANDING.explorar.btn}
    </a>
  );
}

function EnlaceSeccion({ href, children }) {
  const { modoOscuro } = useTheme();
  const contorno = modoOscuro
    ? 'border-slate-700 text-slate-300 hover:border-amber-400/60 hover:text-amber-300'
    : 'border-slate-300 text-slate-600 hover:border-amber-500/60 hover:text-amber-700';
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1.5 min-h-[36px] text-[10px] font-bold transition-colors duration-200 flex-1 lg:flex-none lg:px-4 lg:py-2 lg:min-h-[44px] lg:text-xs ${contorno} ${FOCO}`}
    >
      {children}
    </a>
  );
}

function TarjetaPropuesta({ club }) {
  const { modoOscuro } = useTheme();
  const esProximamente = club.id_estatus_club === 2;
  const imagen = obtenerUrlImagen(club.imagen_portada);
  // Si la imagen del backend falla (p. ej. /uploads/ resuelto contra el host
  // estático), se cae al placeholder sin reintentos ni saltos de layout.
  const [imagenFallida, setImagenFallida] = useState(false);
  const nombre = club.nombre_club || '';
  const mostrarImagen = imagen && !imagenFallida;

  // Tarjeta informativa: sin enlaces ni efectos de navegación (no es un
  // acceso al catálogo ni al detalle del portal en esta etapa).
  return (
    <article
      className={`rounded-2xl border overflow-hidden flex flex-col h-full ${
        modoOscuro
          ? esProximamente
            ? 'bg-[#0e162c]/50 border-slate-800/40'
            : 'bg-[#0e162c] border-slate-700/50'
          : esProximamente
            ? 'bg-white/70 border-slate-200/60'
            : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className={`h-40 sm:h-44 overflow-hidden ${modoOscuro ? 'bg-slate-900' : 'bg-slate-100'}`}>
        {mostrarImagen ? (
          <img
            src={imagen}
            alt=""
            loading="lazy"
            onError={() => setImagenFallida(true)}
            className={`w-full h-full object-cover ${esProximamente ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`}>
            <Icono nombre="users" strokeWidth={1} className="h-12 w-12" />
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {club.categoria && (
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
              {club.categoria}
            </span>
          )}
          {esProximamente ? (
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
              modoOscuro
                ? 'bg-slate-700/40 border-slate-600 text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}>
              En propuesta
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              En el catálogo
            </span>
          )}
        </div>

        <h3 className={`text-base sm:text-lg font-bold leading-snug ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {nombre}
        </h3>
        {club.descripcion && (
          <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {club.descripcion}
          </p>
        )}
      </div>
    </article>
  );
}

// Intercala las categorías (round-robin) para que la primera fila sea
// representativa en lugar de mostrar solo la primera categoría; dentro de
// cada categoría se conserva el orden alfabético.
function OrdenarClubes(clubes) {
  const porCategoria = new Map();
  for (const club of clubes) {
    const cat = club.categoria || 'Otras';
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat).push(club);
  }
  const orden = CATEGORIA_ORDEN.filter((c) => porCategoria.has(c)).concat(
    [...porCategoria.keys()].filter((c) => !CATEGORIA_ORDEN.includes(c)),
  );
  for (const arr of porCategoria.values()) {
    arr.sort((a, b) => (a.nombre_club || '').localeCompare(b.nombre_club || '', 'es'));
  }
  const salida = [];
  for (let i = 0; ; i += 1) {
    let vacia = true;
    for (const cat of orden) {
      const arr = porCategoria.get(cat);
      if (i < arr.length) {
        salida.push(arr[i]);
        vacia = false;
      }
    }
    if (vacia) break;
  }
  return salida;
}

function iniciales(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
}

export default function PaginaConoceClubs() {
  const { tema, modoOscuro } = useTheme();
  const [clubes, setClubes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [limite, setLimite] = useState(PROPUESTAS_VISIBLES);

  useEffect(() => {
    let activo = true;
    let reintentoTimer = null;
    let intentos = 0;

    // Un reintento automático (2.5 s) absorbe los fallos transitorios del
    // servicio de clubes (arranque en frío / 5xx intermitente en Render);
    // si vuelve a fallar, se muestra el estado de error con reintento manual.
    function cargar() {
      api.getClubes()
        .then((data) => {
          if (!activo) return;
          const visibles = (data || []).filter((c) => c.id_estatus_club !== 3);
          setClubes(OrdenarClubes(visibles));
          setError(false);
          setCargando(false);
        })
        .catch(() => {
          if (!activo) return;
          intentos += 1;
          if (intentos <= 1) {
            reintentoTimer = setTimeout(cargar, 2500);
          } else {
            setError(true);
            setCargando(false);
          }
        });
    }

    cargar();
    return () => {
      activo = false;
      if (reintentoTimer) clearTimeout(reintentoTimer);
    };
  }, [intento]);

  function reintentar() {
    setCargando(true);
    setError(false);
    setIntento((n) => n + 1);
  }

  // Desplazamiento suave hacia las anclas solo mientras dure la landing; con
  // prefers-reduced-motion, la regla CSS de index.css lo desactiva.
  useEffect(() => {
    document.documentElement.classList.add('landing-scroll-smooth');
    return () => document.documentElement.classList.remove('landing-scroll-smooth');
  }, []);

  // Aparición suave de secciones secundarias, una sola vez. Las clases se
  // agregan solo si IntersectionObserver existe; sin él (o con movimiento
  // reducido), el contenido queda visible sin animación.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const elementos = document.querySelectorAll('[data-reveal]');
    if (elementos.length === 0) return undefined;
    elementos.forEach((el) => el.classList.add('landing-reveal'));
    const observer = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('landing-reveal--visible');
          observer.unobserve(entrada.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const encuestaActiva = hayEncuesta();

  const heroFondo = modoOscuro
    ? 'bg-gradient-to-b from-[#0e162c] to-[#0b111e]'
    : 'bg-gradient-to-b from-amber-100/70 to-slate-50';
  const panelBase = modoOscuro
    ? 'bg-[#0e162c] border-slate-700/60'
    : 'bg-white border-slate-200 shadow-sm';
  const bandaConcepto = modoOscuro ? 'bg-[#0e162c]' : 'bg-white';
  const bandaEncuesta = modoOscuro ? 'bg-[#18223f]' : 'bg-[#0e162c]';
  const kickerColor = modoOscuro ? 'text-amber-400' : 'text-amber-600';
  const tituloSeccion = `text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${tema.title}`;

  return (
    <main className={`pb-10 lg:pb-20 ${tema.bg} ${tema.text}`}>
      {/* Barra propia de la landing: solo identidad; los controles del sistema
          no forman parte de esta página. */}
      <div className={CONTENEDOR}>
        <div className="max-w-6xl mx-auto flex items-center py-4">
          <Logotipo />
        </div>
      </div>

      {/* A. Presentación inicial: identidad, invitación, acción principal y
          navegación de secciones; la composición visual se apoya en la marca. */}
      <section className={heroFondo}>
        <div className={`${CONTENEDOR} pt-8 sm:pt-12 lg:pt-16 pb-10 sm:pb-14`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-12 lg:items-center">
            <div className="flex flex-col items-start gap-5 min-w-0">
              <p className={`text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black ${kickerColor}`}>
                {LANDING.kicker}
              </p>
              <h1 className={`text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-5xl font-black tracking-tight text-balance ${tema.title}`}>
                {LANDING.nombre}
              </h1>
              <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${tema.subtitle}`}>
                {LANDING.invitacion}
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {encuestaActiva ? (
                  <BotonEncuesta grande className="w-full sm:w-auto" />
                ) : (
                  <BotonExplorar primario className="w-full sm:w-auto" />
                )}
                {encuestaActiva && <BotonExplorar className="w-full sm:w-auto" />}
              </div>

              {!encuestaActiva && (
                <p className={`flex items-start gap-2 text-xs leading-relaxed max-w-md ${tema.subtitle}`}>
                  <span aria-hidden="true" className="shrink-0 mt-px">
                    <Icono nombre="clock" strokeWidth={2} className={`h-4 w-4 ${kickerColor}`} />
                  </span>
                  {LANDING.encuesta.sinDestino}
                </p>
              )}

              {/* w-full: en la columna flex con items-start el nav, sin esto,
                  se estira a su contenido y desborda el viewport en móvil. */}
              <nav
                aria-label="Secciones de la presentación"
                className="nf-scroll w-full flex flex-nowrap gap-1 pt-1 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {LANDING.secciones.map((s) => (
                  <EnlaceSeccion key={s.href} href={s.href}>
                    {s.etiqueta}
                  </EnlaceSeccion>
                ))}
              </nav>
            </div>

            {/* Panel de composición: identidad (lobo como ancla, no como
                pieza aislada), experiencia concreta y dato real del catálogo.
                Sin fotografías ilustrativas de campus. */}
            <div
              className={`relative rounded-2xl border overflow-hidden p-6 sm:p-7 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_65%)] ${panelBase}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src="/lobounid.png"
                  alt=""
                  aria-hidden="true"
                  className={`w-14 sm:w-16 shrink-0 ${
                    modoOscuro ? 'opacity-90 brightness-110' : 'opacity-80 brightness-[0.7] saturate-150'
                  }`}
                />
                <div className="min-w-0">
                  <p className={`text-sm font-black ${tema.title}`}>{LANDING.heroPanel.identidadRotulo}</p>
                  <p className={`mt-0.5 text-xs leading-snug ${tema.subtitle}`}>
                    {LANDING.heroPanel.identidadRelacion}
                  </p>
                </div>
              </div>

              <p className={`mt-5 text-[11px] uppercase tracking-[0.2em] font-bold ${tema.subtitle}`}>
                {LANDING.heroPanel.experienciasTitulo}
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2.5">
                {LANDING.heroPanel.experiencias.map((ex) => (
                  <li
                    key={ex.texto}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                      modoOscuro ? 'border-slate-700/60 bg-[#0b111e]/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <Icono
                      nombre={ex.icono}
                      strokeWidth={2}
                      className={`h-4 w-4 shrink-0 ${kickerColor}`}
                    />
                    <span className={`text-xs font-bold leading-tight ${tema.title}`}>{ex.texto}</span>
                  </li>
                ))}
              </ul>

              {clubes.length > 0 && (
                <p className={`mt-5 text-xs sm:text-sm font-bold ${kickerColor}`}>
                  {LANDING.heroPanel.propuestasCount(clubes.length)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* B. Qué es un club: banda diferenciada; los ejemplos se leen como una
          lista con medallón de icono, título y actividad. */}
      <section
        id="que-es-un-club"
        aria-labelledby="titulo-que-es-club"
        className={`scroll-mt-8 ${bandaConcepto}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16 lg:py-20`}>
          <div className="max-w-6xl mx-auto" data-reveal>
            <div className="max-w-2xl">
              <h2 id="titulo-que-es-club" className={tituloSeccion}>
                {LANDING.queEsClub.titulo}
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.queEsClub.texto}
              </p>
            </div>

            <ul className="mt-8 sm:mt-10 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
              {LANDING.queEsClub.ejemplos.map((ej) => (
                <li key={ej.titulo} className="flex items-start gap-4 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center ${
                      modoOscuro
                        ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                        : 'bg-amber-100 border-amber-200 text-amber-700'
                    }`}
                  >
                    <Icono nombre={ej.icono} strokeWidth={2} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${tema.title}`}>
                      {ej.titulo}
                    </h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${tema.subtitle}`}>{ej.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* C. Propuestas: datos reales de la API — carrusel lateral en móvil y
          grid con vista previa + «Mostrar más» en escritorio — con estados de
          carga, vacío y error con reintento. */}
      <section
        id={LANDING.explorar.seccionPropuestas}
        aria-labelledby="titulo-propuestas"
        className="scroll-mt-8"
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto" data-reveal>
            <div className="max-w-2xl">
              <h2 id="titulo-propuestas" className={tituloSeccion}>
                {LANDING.propuestas.titulo}
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.propuestas.subtitulo}
              </p>
            </div>

            <div className="mt-8">
              {cargando && (
                <div role="status" aria-live="polite" className="py-10 flex justify-center">
                  <Spinner size="md" />
                  <span className="sr-only">Cargando propuestas de clubes…</span>
                </div>
              )}

              {!cargando && error && (
                <Alerta tipo="info" mensaje={LANDING.propuestas.error}>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={reintentar}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-xs font-bold border transition-colors duration-200 cursor-pointer ${FOCO} ${
                        modoOscuro
                          ? 'border-blue-400/40 text-blue-200 hover:bg-blue-400/10'
                          : 'border-blue-400/50 text-blue-700 hover:bg-blue-400/10'
                      }`}
                    >
                      <Icono nombre="arrow-right" strokeWidth={2} className="h-3.5 w-3.5" />
                      {LANDING.propuestas.errorReintentar}
                    </button>
                  </div>
                </Alerta>
              )}

              {!cargando && !error && clubes.length === 0 && (
                <p className={`text-sm ${tema.subtitle}`}>{LANDING.propuestas.vacio}</p>
              )}

              {!cargando && !error && clubes.length > 0 && (
                <>
                  {/* Móvil (< lg): un solo carrusel lateral con todos los
                      clubes, mismo patrón que las filas del catálogo. */}
                  <div
                    className="nf-scroll lg:hidden -mx-6 sm:-mx-8 flex gap-3 overflow-x-auto px-6 sm:px-8 pb-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {clubes.map((club) => (
                      <div key={club.id_club} className="shrink-0 w-56">
                        <TarjetaPropuesta club={club} />
                      </div>
                    ))}
                  </div>

                  {/* Escritorio (lg+): vista previa en grid; si hay más
                      propuestas, «Mostrar más» revela de seis en seis. */}
                  <ul className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {clubes.slice(0, limite).map((club) => (
                      <li key={club.id_club}>
                        <TarjetaPropuesta club={club} />
                      </li>
                    ))}
                  </ul>
                  {clubes.length > limite && (
                    <div className="mt-8 hidden lg:flex justify-center">
                      <button
                        type="button"
                        onClick={() => setLimite((n) => n + PROPUESTAS_VISIBLES)}
                        className={`px-6 py-3 min-h-[48px] rounded-full border text-sm font-black transition duration-200 active:scale-[0.98] cursor-pointer ${FOCO} ${
                          modoOscuro
                            ? 'border-slate-600 text-white hover:border-amber-400/60 hover:bg-slate-800/60'
                            : 'border-slate-300 text-slate-900 hover:border-amber-500/60 hover:bg-amber-50'
                        }`}
                      >
                        {LANDING.propuestas.mostrarMas}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* D. Encuesta: sigue de inmediato a las propuestas para que sea la
          acción evidente tras explorar. Banda invertida con el propósito, la
          aclaración y el acceso; mantiene el estado honesto mientras no
          exista destino. */}
      <section
        id="encuesta"
        aria-labelledby="titulo-encuesta"
        className={`scroll-mt-8 ${bandaEncuesta}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16 lg:py-20`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-12 lg:items-center">
            <div className="min-w-0">
              <h2 id="titulo-encuesta" className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white text-balance">
                {LANDING.encuesta.titulo}
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl">
                {LANDING.encuesta.subtitulo}
              </p>
              <p className="mt-4 text-xs sm:text-sm leading-relaxed max-w-xl font-medium text-amber-300">
                {LANDING.encuesta.aclaracion}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <BotonEncuesta grande fondoPanel className="w-full sm:w-auto" />
                {!encuestaActiva && (
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 max-w-sm">
                    <span aria-hidden="true" className="shrink-0 mt-px">
                      <Icono nombre="info" strokeWidth={2} className="h-4 w-4 text-amber-300" />
                    </span>
                    {LANDING.encuesta.sinDestino}
                  </p>
                )}
              </div>
            </div>

            {/* En móvil, pills compactas para no alargar la sección antes del
                CTA; en sm+, tarjetas con icono. */}
            <ul className="flex flex-wrap gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:gap-4">
              {LANDING.encuesta.propositos.map((p) => (
                <li
                  key={p.etiqueta}
                  className="sm:rounded-xl sm:border sm:border-white/10 sm:bg-white/5 sm:p-4 sm:flex sm:flex-col sm:gap-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                >
                  <span aria-hidden="true" className="sm:mb-0">
                    <Icono nombre={p.icono} strokeWidth={2} className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white">{p.etiqueta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* E. Modelo de Formación Integral (VIVE): contexto de formación tras
          el acceso a la encuesta. El panel reutiliza el eco visual del hero
          para no introducir un lenguaje nuevo. */}
      <section aria-labelledby="titulo-mfi">
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <div
              data-reveal
              className={`relative rounded-2xl border overflow-hidden p-5 sm:p-8 lg:p-9 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.10),transparent_65%)] ${panelBase}`}
            >
              <div className="max-w-2xl">
                <p className={`text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black ${kickerColor}`}>
                  {LANDING.mfi.kicker}
                </p>
                <h2
                  id="titulo-mfi"
                  className={`mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-balance ${tema.title}`}
                >
                  {LANDING.mfi.titulo}
                </h2>
                <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                  {LANDING.mfi.intro}
                </p>
              </div>

              <div className="mt-6 sm:mt-5">
                <p className={`text-xs uppercase tracking-[0.2em] font-bold ${tema.subtitle}`}>
                  {LANDING.mfi.valoresTitulo}
                </p>
                <ul className="mt-3 sm:mt-2.5 flex flex-wrap gap-2">
                  {LANDING.mfi.valores.map((valor) => (
                    <li
                      key={valor}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                        modoOscuro
                          ? 'border-slate-600/60 text-slate-300'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {valor}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-8 sm:mt-7 grid gap-x-6 gap-y-7 sm:gap-y-6 sm:grid-cols-3">
                {LANDING.mfi.dimensiones.map((dim) => (
                  <li key={dim.titulo} className="flex items-start gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${
                        modoOscuro
                          ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                          : 'bg-amber-100 border-amber-200 text-amber-700'
                      }`}
                    >
                      <Icono nombre={dim.icono} strokeWidth={2} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${tema.title}`}>
                        {dim.titulo}
                      </h3>
                      <p className={`mt-1 text-sm leading-relaxed ${tema.subtitle}`}>{dim.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p
                className={`mt-8 sm:mt-7 max-w-xl border-l-2 border-amber-400/70 pl-4 text-sm sm:text-base font-medium leading-relaxed ${tema.subtitle}`}
              >
                {LANDING.mfi.puente}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* F. Acerca del proyecto: propósito, equipo estudiantil y acciones
          finales (encuesta y exploración interna; sin accesos al catálogo ni
          al portal principal en esta etapa). */}
      <section
        id="acerca"
        aria-labelledby="titulo-acerca"
        className="scroll-mt-8"
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-2 lg:gap-12" data-reveal>
            <div className="min-w-0">
              <h2 id="titulo-acerca" className={tituloSeccion}>
                Acerca del proyecto
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.proposito}
              </p>
            </div>

            <div className="min-w-0">
              <h3 className={`text-xs uppercase tracking-[0.2em] font-bold ${tema.subtitle}`}>
                {LANDING.equipoTitulo}
              </h3>
              <ul className="mt-4 grid gap-3">
                {LANDING.equipo.map((nombre) => (
                  <li
                    key={nombre}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tema.cardCls}`}
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-10 h-10 rounded-full bg-amber-400 text-[#0e162c] font-black text-sm flex items-center justify-center"
                    >
                      {iniciales(nombre)}
                    </span>
                    <span className="font-bold text-sm sm:text-base">{nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <BotonEncuesta className="w-full sm:w-auto" />
            <BotonExplorar className="w-full sm:w-auto" />
          </div>
        </div>
      </section>
    </main>
  );
}
