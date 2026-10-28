/* Landing pública /conoce-clubs — presentación Mobile First de Clubs UNID
   Campeche. Compuesta como bandas diferenciadas: hero con kicker, imagen
   vertical, título, invitación y cuadro Lobos Rojos (LANDING.hero en
   src/config/landing.js; sin CTA, aviso de encuesta ni chips de secciones
   en el hero), banda del concepto de club, propuestas reales desde la API
   (carrusel lateral en móvil y grid con «Mostrar más» en escritorio),
   encuesta inmediatamente después de las propuestas, Modelo de Formación
   Integral (VIVE), otras actividades universitarias informativas
   (LANDING.actividades; banners con foto o fallback) e invitación a
   /acerca-del-proyecto (el detalle del equipo y las colaboraciones vive
   en esa página, sin duplicarlo aquí). Accesos internos: barra propia con
   enlace «Conocenos» y sección final con encuesta (acción principal),
   «Explorar» y «Conoce el proyecto». Aparición suave de secciones
   secundarias (IntersectionObserver + .landing-reveal, con
   prefers-reduced-motion). No requiere sesión; los CTAs de encuesta solo
   se activan con ENCUESTA_SLUG en src/config/landing.js. Se monta fuera
   del layout del sistema (ver App.jsx) con su propia barra. */
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
import { BotonEncuesta } from '../components/landing/BotonEncuesta';
import { BotonBarraPublica } from '../components/landing/BotonBarraPublica';
import {
  LANDING,
  hayEncuesta,
  ENCUESTA_SLUG,
} from '../config/landing';

const CONTENEDOR = 'w-full px-6 sm:px-8 lg:px-12 xl:px-16';
const CATEGORIA_ORDEN = ['Deportes', 'Cultura', 'Tecnología'];
// Vista previa del grid de escritorio: si hay más propuestas, se ocultan
// detrás del botón «Mostrar más» (se revelan de seis en seis).
const PROPUESTAS_VISIBLES = 6;
const ENCUESTA_META_RESPUESTAS = 180;

// Foco visible compartido: anillo ámbar sobre superficies; en botones ámbar
// sólidos el anillo va con offset del mismo ámbar para leerse sobre cualquier
// fondo de sección sin depender del tema.
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80';
const FOCO_PRIMARIO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e162c] focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400';

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
        {/* flex-nowrap: en la tarjeta móvil (w-56) ambos chips caben en
            una sola línea con gap y padding reducidos; con wrap, «En el
            catálogo» saltaba debajo de categorías largas. */}
        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
          {club.categoria && (
            <span className={`text-[10px] uppercase tracking-widest font-bold px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${clasesBadge(club.categoria, modoOscuro)}`}>
              {club.categoria}
            </span>
          )}
          {esProximamente ? (
            <span className={`text-[10px] uppercase tracking-widest font-bold px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${
              modoOscuro
                ? 'bg-slate-700/40 border-slate-600 text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}>
              En propuesta
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 sm:px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 whitespace-nowrap">
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

// Póster informativo de «Otras actividades» (referencia de composición:
// tarjetas destacadas tipo ViX): fotografía a sangre que cubre toda la
// tarjeta, degradado oscuro inferior progresivo que funde la imagen con
// el fondo y texto HTML superpuesto en la zona inferior.
// Informativo: sin enlaces, sin hover de elevación y sin cursor pulsable.
// Sin imagen (o si falla) conserva el mismo formato con fallback de
// gradiente de marca + medallón ámbar. `focal` ajusta el encuadre
// individual (object-position) sin deformar la foto (object-cover).
//
// Altura y alineación entre tarjetas: el <li> es la tarjeta y comparte
// con sus hermanas las tres pistas de la fila (subgrid de la lista),
// todas `auto` para que nada colapse:
//   1) zona despejada de fotografía con aspect-[4/3] (más aire para la
//      foto que con el póster 4:5 anterior; crece con el ancho de la
//      columna),
//   2) título,
//   3) descripción.
// Los títulos y las descripciones empiezan a la misma altura en las
// tres tarjetas y el conjunto crece si el texto necesita más espacio
// (la tarjeta no se recorta para alinear). La foto y el degradado son
// capas absolutas que cubren la tarjeta completa: el texto queda sobre
// el degradado y la zona superior permanece despejada.
function BannerActividad({ actividad }) {
  const { modoOscuro } = useTheme();
  const [imagenFallida, setImagenFallida] = useState(false);
  const imagen = actividad.imagen ? obtenerUrlImagen(actividad.imagen) : null;
  const mostrarImagen = imagen && !imagenFallida;

  return (
    <li
      className={`relative row-span-3 min-w-0 overflow-hidden rounded-2xl grid grid-rows-subgrid ${
        modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'
      }`}
    >
      {mostrarImagen ? (
        <img
          src={imagen}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImagenFallida(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: actividad.focal || 'center' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-start justify-center bg-[radial-gradient(circle_at_50%_26%,rgba(251,191,36,0.18),transparent_72%)]">
          <span
            aria-hidden="true"
            className={`mt-12 w-14 h-14 rounded-full border flex items-center justify-center ${
              modoOscuro
                ? 'bg-amber-400/10 border-amber-400/25 text-amber-400'
                : 'bg-amber-100 border-amber-200 text-amber-700'
            }`}
          >
            <Icono nombre={actividad.icono} strokeWidth={2} className="h-6 w-6" />
          </span>
        </div>
      )}

      {/* Degradado de lectura (igual en claro y oscuro): transparente
          arriba → azul noche abajo; sin corte visible con el contenido.
          El copy vive en landing.js; `line-clamp-4` es solo red de
          seguridad y no recorta el texto vigente. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/65 to-transparent"
      />

      {/* Pista 1: reserva la zona despejada de la foto (≈4:3 del ancho de
          la columna). Altura compartida por subgrid. */}
      <div aria-hidden="true" className="row-start-1 aspect-[4/3]" />
      {/* Pistas 2 y 3: título y descripción alineados entre tarjetas y
          agrupados con ~8px (mt-2). El padding inferior de la descripción
          es el único espacio hacia el borde inferior (breve y uniforme);
          el crecimiento por subgrid solo ocurre si una descripción es más
          larga que las demás, sin espaciadores que dejen hueco extra bajo
          el texto. Los títulos envuelven sin recorte. */}
      <h3 className="relative row-start-2 px-4 sm:px-5 pt-3 sm:pt-4 text-white text-base sm:text-lg font-black tracking-tight leading-snug">
        {actividad.titulo}
      </h3>
      <p className="relative row-start-3 px-4 sm:px-5 pb-4 sm:pb-5 mt-2 text-sm leading-relaxed text-slate-200 line-clamp-4">
        {actividad.texto}
      </p>
    </li>
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

export default function PaginaConoceClubs() {
  const { tema, modoOscuro } = useTheme();
  const [clubes, setClubes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [limite, setLimite] = useState(PROPUESTAS_VISIBLES);
  const [pistaScroll, setPistaScroll] = useState(false);
  const [fotoHeroFallida, setFotoHeroFallida] = useState(false);

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

  // Pista de scroll para móvil: la flecha aparece tras ~3 s sin interacción
  // y solo cerca del inicio (scrollY < 300); cualquier gesto la oculta. La
  // animación del rebote vive en .landing-scroll-hint (index.css) y se
  // anula con prefers-reduced-motion; aquí solo se controla la opacidad.
  useEffect(() => {
    const UMBRAL_INICIO = 300;
    const RETRASO_INACTIVO = 3000;
    let temporizador = null;

    function programar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        setPistaScroll(window.scrollY < UMBRAL_INICIO);
      }, RETRASO_INACTIVO);
    }

    function ocultar() {
      setPistaScroll(false);
      programar();
    }

    programar();
    window.addEventListener('scroll', ocultar, { passive: true });
    window.addEventListener('touchstart', ocultar, { passive: true });
    window.addEventListener('pointerdown', ocultar, { passive: true });
    window.addEventListener('keydown', ocultar);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener('scroll', ocultar);
      window.removeEventListener('touchstart', ocultar);
      window.removeEventListener('pointerdown', ocultar);
      window.removeEventListener('keydown', ocultar);
    };
  }, []);

  const encuestaActiva = hayEncuesta();
  const [respuestasEncuesta, setRespuestasEncuesta] = useState(null);
  const [errorRespuestasEncuesta, setErrorRespuestasEncuesta] = useState(false);

  useEffect(() => {
    if (!hayEncuesta()) return;
    let cancelado = false;
    api
      .obtenerResumenPublico(ENCUESTA_SLUG)
      .then((data) => {
        if (!cancelado) setRespuestasEncuesta(Number(data?.total_respuestas) || 0);
      })
      .catch(() => {
        if (!cancelado) setErrorRespuestasEncuesta(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Hero: kicker + imagen vertical + título + intro + cuadro Lobos Rojos.
  // Una sola imagen configurable en landing.js. Sin imagen (o si falla al
  // cargar) se conserva el fallback de gradiente + panel de identidad.
  const fotoHeroUrl = LANDING.hero.imagen ? obtenerUrlImagen(LANDING.hero.imagen) : null;
  const heroConFoto = Boolean(fotoHeroUrl) && !fotoHeroFallida;

  const heroBase = modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-50';
  const panelBase = modoOscuro
    ? 'bg-[#0e162c] border-slate-700/60'
    : 'bg-white border-slate-200 shadow-sm';
  const bandaConcepto = modoOscuro ? 'bg-[#0e162c]' : 'bg-white';
  const bandaEncuesta = modoOscuro ? 'bg-[#18223f]' : 'bg-[#0e162c]';
  const kickerColor = modoOscuro ? 'text-amber-400' : 'text-amber-600';
  const tituloSeccion = `text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${tema.title}`;

  return (
    <main className={`pb-10 lg:pb-20 ${tema.bg} ${tema.text}`}>
      {/* Barra propia de la landing: identidad y acceso secundario a la
          página del proyecto; los controles del sistema no forman parte de
          esta página. */}
      <div className={CONTENEDOR}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 py-4">
          <Logotipo />
          <BotonBarraPublica to={LANDING.acercaProyecto.ruta}>
            {LANDING.acercaProyecto.etiqueta}
          </BotonBarraPublica>
        </div>
      </div>

      {/* A. Presentación: kicker, imagen vertical, título, invitación y
          cuadro Lobos Rojos. Sin CTA de explorar, aviso de encuesta ni
          chips de secciones en el hero (esos accesos viven en las secciones
          y en el pie). Móvil: kicker → bloque visual (imagen de fondo +
          título/intro por encima) → cuadro; escritorio: texto + cuadro a la
          izquierda, imagen a la derecha. */}
      <section id="hero" className={`relative overflow-hidden ${heroBase}`}>
        <div className={`${CONTENEDOR} relative pt-8 sm:pt-12 lg:pt-20 pb-10 sm:pb-14 lg:pb-24`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-stretch">
            <div className="flex flex-col min-w-0">
              <p className={`text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black ${kickerColor}`}>
                {LANDING.kicker}
              </p>

              {heroConFoto ? (
                <>
                  {/* Bloque visual móvil: un único fondo continuo. Zona
                      superior clara (~250px de fotografía visible), luego el
                      título/intro en el flujo con espaciado explícito. La
                      foto se extiende por detrás de los textos; el
                      oscurecimiento empieza en la zona del texto y funde con
                      el tema al final de la introducción. */}
                  <div className="relative mt-5 lg:hidden" aria-hidden={!LANDING.hero.alt}>
                    <img
                      src={fotoHeroUrl}
                      alt={LANDING.hero.alt}
                      aria-hidden={LANDING.hero.alt ? undefined : true}
                      fetchPriority="high"
                      decoding="async"
                      onError={() => setFotoHeroFallida(true)}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: LANDING.hero.focal }}
                    />
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 bg-gradient-to-t ${
                        modoOscuro
                          ? 'from-[#0b111e] via-[#0b111e]/88 via-[45%] to-transparent'
                          : 'from-slate-50 via-slate-50/88 via-[45%] to-transparent'
                      }`}
                    />
                    <div className="relative h-[250px] sm:h-[280px]" />
                    <div className="relative pt-6 pb-6 px-5 sm:pt-7 sm:pb-7 sm:px-6">
                      <h1 className={`text-[1.75rem] leading-[1.15] sm:text-4xl font-black tracking-tight text-balance ${tema.title}`}>
                        {LANDING.nombre}
                      </h1>
                      <p className={`mt-4 text-base sm:text-lg leading-relaxed ${tema.subtitle}`}>
                        {LANDING.invitacion}
                      </p>
                    </div>
                  </div>

                  {/* Escritorio: columna izquierda con texto y cuadro. */}
                  <div className="hidden lg:block">
                    <h1 className={`mt-5 text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-5xl font-black tracking-tight text-balance ${tema.title}`}>
                      {LANDING.nombre}
                    </h1>
                    <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-xl ${tema.subtitle}`}>
                      {LANDING.invitacion}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h1 className={`mt-5 text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-5xl font-black tracking-tight text-balance ${tema.title}`}>
                    {LANDING.nombre}
                  </h1>
                  <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-xl ${tema.subtitle}`}>
                    {LANDING.invitacion}
                  </p>
                </>
              )}

              <div
                className={`mt-6 relative rounded-2xl border overflow-hidden p-6 sm:p-7 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_65%)] ${panelBase}`}
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

            {heroConFoto && (
              <div className="hidden lg:flex w-full min-w-0" aria-hidden={!LANDING.hero.alt}>
                <div className="relative w-full overflow-hidden rounded-2xl min-h-[320px]">
                  <img
                    src={fotoHeroUrl}
                    alt={LANDING.hero.alt}
                    aria-hidden={LANDING.hero.alt ? undefined : true}
                    fetchPriority="high"
                    decoding="async"
                    onError={() => setFotoHeroFallida(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: LANDING.hero.focal }}
                  />
                </div>
              </div>
            )}
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
                    {/* Separador ámbar (solo móvil): al apilarse en una
                        columna, la línea fina evita la lectura de «tabla». */}
                    <span aria-hidden="true" className="mt-3 block h-px bg-amber-400/40 sm:hidden" />
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
              {hayEncuesta() && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 max-w-xl">
                  {errorRespuestasEncuesta ? (
                    <p className="text-xs leading-relaxed text-slate-300">
                      No se pudo cargar el progreso de respuestas.
                    </p>
                  ) : respuestasEncuesta === null ? (
                    <p className="text-xs leading-relaxed text-slate-300">Cargando progreso…</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-white">
                        {respuestasEncuesta} de {ENCUESTA_META_RESPUESTAS} respuestas
                      </p>
                      <p className="mt-1 text-xs font-medium text-amber-300">
                        {respuestasEncuesta >= ENCUESTA_META_RESPUESTAS
                          ? '¡Meta alcanzada! Gracias por participar'
                          : `Ya alcanzamos el ${Math.min(100, Math.round((respuestasEncuesta / ENCUESTA_META_RESPUESTAS) * 100))}% de nuestra meta`}
                      </p>
                      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${Math.min(100, (respuestasEncuesta / ENCUESTA_META_RESPUESTAS) * 100)}%` }}
                          role="progressbar"
                          aria-valuenow={Math.min(100, Math.round((respuestasEncuesta / ENCUESTA_META_RESPUESTAS) * 100))}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Progreso de respuestas de la encuesta"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

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

            {/* Móvil: rejilla 2×2 para que las cuatro pills queden
                parejas (con flex-wrap, una quedaba huérfana debajo); en
                sm+ conserva la composición existente. */}
            <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
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
              className={`relative rounded-2xl border overflow-hidden p-4 sm:p-8 lg:p-9 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.10),transparent_65%)] ${panelBase}`}
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
                {/* Siempre como en móvil M: 3 por línea (2 filas) desde
                    375 px; a 320–374 px caen a 2 («Solidaridad» no cabe 3
                    veces). Desde xl (≥1280) los 6 caben en una sola fila a
                    todo el ancho del panel. Pills con fondo grande (w-full
                    llenando la celda + py-2/2.5) y acotados a max-w-2xl en
                    escritorio para que queden equilibrados dentro del panel. */}
                <ul className="mt-3 grid grid-cols-2 min-[375px]:grid-cols-3 gap-2 sm:gap-2.5 sm:mt-2.5 max-w-2xl xl:grid-cols-6 xl:max-w-none">
                  {LANDING.mfi.valores.map((valor) => (
                    <li
                      key={valor}
                      className={`inline-flex w-full items-center justify-center gap-1 sm:gap-1.5 rounded-full border px-1 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold tracking-tight sm:tracking-normal ${
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
                      {/* Separador ámbar (solo móvil), igual que en «Qué es
                          un club»: al apilarse, la línea fina evita la
                          lectura de «tabla». */}
                      <span aria-hidden="true" className="mt-3 block h-px bg-amber-400/40 sm:hidden" />
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

      {/* F. Otras actividades universitarias: banners informativos (más
          pequeños que el hero) de actividades distintas a los clubes; sin
          botones de inscripción ni enlaces sin destino real. */}
      <section
        id="actividades"
        aria-labelledby="titulo-actividades"
        className={`scroll-mt-8 ${bandaConcepto}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16 lg:py-20`}>
          <div className="max-w-6xl mx-auto" data-reveal>
            <div className="max-w-2xl">
              <h2 id="titulo-actividades" className={tituloSeccion}>
                {LANDING.actividades.titulo}
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.actividades.intro}
              </p>
            </div>

            {/* Móvil (< md): fila única con sangrado a los bordes y
                desplazamiento manual (parte de la siguiente tarjeta
                visible); el contenedor es enfocable (tabIndex) para
                desplazarse con teclado. md+: rejilla de 3 columnas que
                llena el contenedor centrado (justificada, sin espacio
                muerto a los lados). Sin autoplay ni carruseles anidados.
                La lista es un grid de 3 pistas `auto` (zona de foto,
                título y descripción) compartidas por subgrid: los
                títulos y las descripciones de las tres tarjetas arrancan
                a la misma altura y el conjunto crece con el texto. */}
            <ul
              aria-label="Actividades universitarias"
              tabIndex={0}
              className="nf-scroll mt-8 sm:mt-10 -mx-6 sm:-mx-8 grid grid-flow-col auto-cols-[min(70vw,300px)] grid-rows-[auto_auto_auto] gap-x-4 overflow-x-auto px-6 sm:px-8 pb-1 md:mx-0 md:px-0 md:grid-flow-row md:grid-cols-3 md:auto-cols-auto md:gap-x-5 md:overflow-visible"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {LANDING.actividades.items.map((act) => (
                <BannerActividad key={act.id} actividad={act} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* G. Acerca del proyecto: presentación breve e invitación a la página
          propia (/acerca-del-proyecto), donde viven el origen, el equipo y
          las colaboraciones, sin duplicarlos aquí. «Conoce el proyecto» es
          la única acción de la banda (sin el botón de encuesta en
          preparación) y se refuerza con tipografía y sombra ámbar. */}
      <section
        id="acerca"
        aria-labelledby="titulo-acerca"
        className="scroll-mt-8"
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto" data-reveal>
            <div className="max-w-2xl">
              <h2 id="titulo-acerca" className={tituloSeccion}>
                Acerca del proyecto
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.proposito}
              </p>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                {LANDING.acercaProyecto.invitacion}
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <Link
                to={LANDING.acercaProyecto.ruta}
                className={`inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 min-h-[48px] w-full sm:w-auto rounded-full bg-amber-400 text-[#0e162c] text-[0.95rem] sm:text-base font-black shadow-lg shadow-amber-400/25 transition duration-200 hover:bg-amber-300 hover:shadow-xl hover:shadow-amber-400/35 active:scale-[0.98] ${FOCO_PRIMARIO}`}
              >
                <Icono nombre="info" strokeWidth={2} className="h-4 w-4 shrink-0" />
                {LANDING.acercaProyecto.btn}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pista de scroll (solo móvil): flecha fija al fondo que invita a
          continuar cuando el usuario se queda quieto cerca del inicio; se
          oculta con cualquier gesto y no capta foco ni eventos al estar
          apagada. */}
      <div
        aria-hidden={!pistaScroll}
        className={`lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-700 ${
          pistaScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          tabIndex={pistaScroll ? 0 : -1}
          onClick={() =>
            document.getElementById(LANDING.explorar.seccionPropuestas)?.scrollIntoView()
          }
          aria-label="Ver las propuestas de clubes"
          className={`landing-scroll-hint flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-200 ${FOCO} ${
            modoOscuro
              ? 'border-white/15 bg-[#0b111e]/60 text-amber-300/80'
              : 'border-slate-300/70 bg-white/70 text-amber-600/80'
          }`}
        >
          <Icono nombre="chevron-down" strokeWidth={2} className="h-5 w-5" />
        </button>
      </div>
    </main>
  );
}
