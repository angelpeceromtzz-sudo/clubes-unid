/* Landing pÃºblica /conoce-clubs â€” presentaciÃ³n Mobile First de Clubs UNID
   Campeche. Compuesta como bandas diferenciadas: hero con kicker, imagen
   vertical, tÃ­tulo, invitaciÃ³n y cuadro Lobos Rojos (LANDING.hero en
   src/config/landing.js; sin CTA, aviso de encuesta ni chips de secciones
   en el hero), banda del concepto de club, propuestas reales desde la API
   (carrusel lateral en mÃ³vil y grid con Â«Mostrar mÃ¡sÂ» en escritorio),
   encuesta inmediatamente despuÃ©s de las propuestas, Modelo de FormaciÃ³n
   Integral (VIVE), otras actividades universitarias informativas
   (LANDING.actividades; banners con foto o fallback) e invitaciÃ³n a
   /acerca-del-proyecto (el detalle del equipo y las colaboraciones vive
   en esa pÃ¡gina, sin duplicarlo aquÃ­). Accesos internos: barra propia con
   enlace ConÃ³cenos y secciÃ³n final con encuesta (acciÃ³n principal),
   Â«ExplorarÂ» y Â«Conoce el proyectoÂ». ApariciÃ³n suave de secciones
   secundarias (IntersectionObserver + .landing-reveal, con
   prefers-reduced-motion). No requiere sesiÃ³n; los CTAs de encuesta solo
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
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';
import { BotonEncuesta } from '../components/landing/BotonEncuesta';
import {
  LANDING,
  hayEncuesta,
  ENCUESTA_SLUG,
} from '../config/landing';

const CONTENEDOR = 'w-full px-6 sm:px-8 lg:px-12 xl:px-16';
const CATEGORIA_ORDEN = ['Deportes', 'Cultura', 'Tecnología'];
const PROPUESTAS_VISIBLES = 6;
const ENCUESTA_META_RESPUESTAS = 180;

// Foco visible compartido: anillo Ã¡mbar sobre superficies; en botones Ã¡mbar
// sÃ³lidos el anillo va con offset del mismo Ã¡mbar para leerse sobre cualquier
// fondo de secciÃ³n sin depender del tema.
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80';

function TarjetaPropuesta({ club }) {
  const { modoOscuro } = useTheme();
  const esProximamente = club.id_estatus_club === 2;
  const imagen = obtenerUrlImagen(club.imagen_portada);
  // Si la imagen del backend falla (p. ej. /uploads/ resuelto contra el host
  // estÃ¡tico), se cae al placeholder sin reintentos ni saltos de layout.
  const [imagenFallida, setImagenFallida] = useState(false);
  const nombre = club.nombre_club || '';
  const mostrarImagen = imagen && !imagenFallida;

  // Tarjeta informativa: sin enlaces ni efectos de navegaciÃ³n (no es un
  // acceso al catÃ¡logo ni al detalle del portal en esta etapa).
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
        {/* flex-nowrap: en la tarjeta mÃ³vil (w-56) ambos chips caben en
            una sola lÃ­nea con gap y padding reducidos; con wrap, Â«En el
            catÃ¡logoÂ» saltaba debajo de categorÃ­as largas. */}
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

// PÃ³ster informativo de Â«Otras actividadesÂ» (referencia de composiciÃ³n:
// tarjetas destacadas tipo ViX): fotografÃ­a a sangre que cubre toda la
// tarjeta, degradado oscuro inferior progresivo que funde la imagen con
// el fondo y texto HTML superpuesto en la zona inferior.
// Informativo: sin enlaces, sin hover de elevaciÃ³n y sin cursor pulsable.
// Sin imagen (o si falla) conserva el mismo formato con fallback de
// gradiente de marca + medallÃ³n Ã¡mbar. `focal` ajusta el encuadre
// individual (object-position) sin deformar la foto (object-cover).
//
// Altura y alineaciÃ³n entre tarjetas: el <li> es la tarjeta y comparte
// con sus hermanas las tres pistas de la fila (subgrid de la lista),
// todas `auto` para que nada colapse:
//   1) zona despejada de fotografÃ­a con aspect-[4/3] (mÃ¡s aire para la
//      foto que con el pÃ³ster 4:5 anterior; crece con el ancho de la
//      columna),
//   2) tÃ­tulo,
//   3) descripciÃ³n.
// Los tÃ­tulos y las descripciones empiezan a la misma altura en las
// tres tarjetas y el conjunto crece si el texto necesita mÃ¡s espacio
// (la tarjeta no se recorta para alinear). La foto y el degradado son
// capas absolutas que cubren la tarjeta completa: el texto queda sobre
// el degradado y la zona superior permanece despejada.
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




export default function PaginaConoceClubs({ onLoginClick }) {
  const { tema, modoOscuro } = useTheme();
  const [clubes, setClubes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [limite, setLimite] = useState(PROPUESTAS_VISIBLES);
  const [pistaScroll, setPistaScroll] = useState(false);

  useEffect(() => {
    let activo = true;
    let reintentoTimer = null;
    let intentos = 0;

    // Un reintento automÃ¡tico (2.5 s) absorbe los fallos transitorios del
    // servicio de clubes (arranque en frÃ­o / 5xx intermitente en Render);
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

  // ApariciÃ³n suave de secciones secundarias, una sola vez. Las clases se
  // agregan solo si IntersectionObserver existe; sin Ã©l (o con movimiento
  // reducido), el contenido queda visible sin animaciÃ³n.
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

  // Pista de scroll para mÃ³vil: la flecha aparece tras ~3 s sin interacciÃ³n
  // y solo cerca del inicio (scrollY < 300); cualquier gesto la oculta. La
  // animaciÃ³n del rebote vive en .landing-scroll-hint (index.css) y se
  // anula con prefers-reduced-motion; aquÃ­ solo se controla la opacidad.
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

  // Hero: kicker + imagen vertical + tÃ­tulo + intro + cuadro Lobos Rojos.
  // Una sola imagen configurable en landing.js. Sin imagen (o si falla al
  // cargar) se conserva el fallback de gradiente + panel de identidad.

  const bandaConcepto = modoOscuro ? 'bg-[#0e162c]' : 'bg-white';
  const bandaEncuesta = modoOscuro ? 'bg-[#18223f]' : 'bg-[#0e162c]';
  const tituloSeccion = `text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${tema.title}`;


  const slides = [
    {
      id: 'clubes',
      imagen: '/campus/unid-campeche.jpeg',
      kicker: 'INICIATIVA ESTUDIANTIL',
      titulo: ['Tu universidad.', 'Tus pasiones.', 'Tu comunidad.'],
      linea: 'DESCUBRE · PARTICIPA · CONECTA',
      descripcion: 'Campus Campeche reune experiencias extracurriculares para que cada estudiante encuentre un espacio para participar, aprender y crecer.',
      cta: { texto: 'Entrar al portal', href: '/campus/campeche/portal' },
    },
    {
      id: 'experiencias',
      imagen: '/campus/campus-campeche-2.jpeg',
      kicker: 'EXPERIENCIAS',
      titulo: ['Encuentra lo que te mueve.', 'Participa fuera del aula.'],
      linea: 'DEPORTE · CULTURA · TECNOLOGIA',
      descripcion: 'Campus Campeche ofrece distintas formas de participar y encontrar actividades fuera del aula.',
      cta: { texto: 'Ver actividades', href: '/oferta' },
    },
    {
      id: 'campus-unid',
      imagen: '/campus/campus-unid.jpg',
      kicker: 'FORMA PARTE',
      titulo: ['Tu próxima experiencia', 'puede empezar aquí.'],
      linea: 'COMUNIDAD · PARTICIPACIÓN · CRECIMIENTO',
      descripcion: 'Conoce clubes, conecta con compañeros y entra al portal de Campus Campeche.',
      cta: { texto: 'Entrar al portal', href: '/campus/campeche/portal' },
    },
  ];

  const [slideActual, setSlideActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const prefiereMovimientoReducido =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefiereMovimientoReducido || pausado || slides.length < 2) return undefined;
    const temporizador = window.setInterval(() => {
      setSlideActual((actual) => (actual + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(temporizador);
  }, [pausado, prefiereMovimientoReducido, slides.length]);

  useEffect(() => {
    if (!pausado) return undefined;
    const temporizador = window.setTimeout(() => setPausado(false), 10000);
    return () => window.clearTimeout(temporizador);
  }, [pausado]);

  return (
    <main className={`${tema.bg} ${tema.text} overflow-x-hidden`}>
      <BarraGeneral onLoginClick={onLoginClick} />

      {/* A. Presentacion: hero-carrusel de Campus Campeche */}
      <section
        id="hero"
        className="relative min-h-[88vh] overflow-hidden"
        aria-roledescription="carousel"
        aria-label="Hero de Campus Campeche"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSlideActual((prev) => (prev - 1 + slides.length) % slides.length);
          if (e.key === 'ArrowRight') setSlideActual((prev) => (prev + 1) % slides.length);
        }}
      >
        <div className="lg:hidden relative min-h-[88vh]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/campus/campus-campeche.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b111e] via-[#0b111e]/75 to-[#0b111e]/40" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-transparent to-transparent" aria-hidden="true" />
          <div className="relative px-6 sm:px-8 py-20 flex items-center min-h-[88vh]">
            <div className="max-w-xl space-y-5">
              <p className="text-xs uppercase tracking-[0.3em] font-black text-amber-400">
                Iniciativa estudiantil
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[0.92] text-balance">
                Tu universidad.
                <span className="block text-amber-400">Tus pasiones.</span>
                <span className="block">Tu comunidad.</span>
              </h1>
              <p className="text-sm uppercase tracking-[0.25em] font-bold text-amber-300">
                DESCUBRE · PARTICIPA · CONECTA
              </p>
              <p className="text-base leading-relaxed text-slate-300">
                UNID Campus Campeche reune experiencias extracurriculares para que cada estudiante encuentre un espacio para participar, aprender y crecer.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/campus/campeche/portal"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition"
                >
                  Entrar al portal
                </Link>
                <Link
                  to="/conocenos"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-500 font-black hover:border-amber-400/70 transition"
                >
                  Conocenos
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block relative min-h-[88vh]">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden={index !== slideActual}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${slides.length}`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${slide.imagen}')` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b111e] via-[#0b111e]/70 to-[#0b111e]/20" aria-hidden="true" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-transparent to-transparent" aria-hidden="true" />
              <div className="relative px-6 sm:px-8 lg:px-12 xl:px-16 py-20 flex items-center min-h-[88vh]">
                <div className="max-w-3xl space-y-5">
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-black text-amber-400">
                    {slide.kicker}
                  </p>
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.92] text-balance">
                    {slide.titulo.map((linea, i) => (
                      <span key={i} className={i === 1 ? 'block text-amber-400' : 'block'}>
                        {linea}
                      </span>
                    ))}
                  </h1>
                  <p className="text-sm uppercase tracking-[0.25em] font-bold text-amber-300">
                    {slide.linea}
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed max-w-xl text-slate-300">
                    {slide.descripcion}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Link
                      to={slide.cta.href}
                      className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-amber-400 text-[#0e162c] font-black text-base shadow-2xl shadow-amber-400/25 hover:bg-amber-300 transition"
                    >
                      {slide.cta.texto}
                    </Link>
                    <Link
                      to="/conocenos"
                      className="inline-flex items-center justify-center px-7 py-4 rounded-full border border-slate-500 font-black text-base hover:border-amber-400/70 transition"
                    >
                      Conocenos
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-3">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setSlideActual(index)}
              aria-label={`Ir a la diapositiva ${index + 1} de ${slides.length}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${index === slideActual ? 'bg-amber-400' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSlideActual((prev) => (prev - 1 + slides.length) % slides.length)}
          aria-label="Diapositiva anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden xl:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition cursor-pointer shadow-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setSlideActual((prev) => (prev + 1) % slides.length)}
          aria-label="Diapositiva siguiente"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden xl:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition cursor-pointer shadow-lg"
        >
          ›
        </button>
      </section>

      {/* Cultura y Experiencia */}
      <section className={`scroll-mt-8 ${bandaConcepto}`}>
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className={tituloSeccion}>Cultura y Experiencia</h2>
              <p className={`mt-4 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                Si buscas una universidad en Campeche que combine excelencia academica con una experiencia estudiantil vibrante, la UNID es tu mejor opcion. En nuestro campus, la cultura se vive y se respira. Somos una comunidad que te impulsa a crecer, participando en proyectos que te vinculan con empresas locales, asi como en actividades que fomentan el liderazgo y la innovacion. Aqui, no solo estudias, sino que te conviertes en un profesional capaz de impactar positivamente en la sociedad.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img src="/campus/para-quien.jpeg" alt="Cultura y experiencia UNID Campeche" className="h-64 w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Acerca de nuestro campus */}
      <section className="scroll-mt-8">
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-2 lg:items-stretch">
            <div className="overflow-hidden rounded-2xl min-h-[320px]">
              <iframe
                title="Ubicacion de UNID Campus Campeche"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d278.956375656593!2d-90.55667553802812!3d19.832561328225736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85f833fb6a059fcf%3A0x536599468e91ee26!2sUNID%20Campus%20Campeche!5e0!3m2!1ses!2smx!4v1793301096053!5m2!1ses!2smx"
                className="h-full min-h-[320px] w-full border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] font-black text-amber-400 mb-3">
                Campus Campeche
              </p>
              <h2 className={tituloSeccion}>Acerca de nuestro campus</h2>
              <p className={`mt-4 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                Campus Campeche es actualmente el punto de partida de Clubs UNID. Aqui, los estudiantes pueden descubrir clubes, actividades y experiencias que forman parte de la vida universitaria.
              </p>
              <p className={`mt-3 text-xs sm:text-sm ${tema.subtitle}`}>
                Av. Resurgimiento 611, Col. Lazareto, Campeche.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* C. Propuestas: datos reales de la API â€” carrusel lateral en mÃ³vil y
          grid con vista previa + Â«Mostrar mÃ¡sÂ» en escritorio â€” con estados de
          carga, vacÃ­o y error con reintento. */}
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
                  <span className="sr-only">Cargando propuestas de clubesâ€¦</span>
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
                  {/* MÃ³vil (< lg): un solo carrusel lateral con todos los
                      clubes, mismo patrÃ³n que las filas del catÃ¡logo. */}
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

                  {/* Escritorio (lg+): vista previa en grid; si hay mÃ¡s
                      propuestas, Â«Mostrar mÃ¡sÂ» revela de seis en seis. */}
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
          acciÃ³n evidente tras explorar. Banda invertida con el propÃ³sito, la
          aclaraciÃ³n y el acceso; mantiene el estado honesto mientras no
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

            {/* MÃ³vil: rejilla 2Ã—2 para que las cuatro pills queden
                parejas (con flex-wrap, una quedaba huÃ©rfana debajo); en
                sm+ conserva la composiciÃ³n existente. */}
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

      {/* Pista de scroll (solo mÃ³vil): flecha fija al fondo que invita a
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
    <PiePagina />
    </main>
  );
}
