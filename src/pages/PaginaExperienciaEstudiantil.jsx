import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

const SLIDES = [
  {
    id: 'torneos',
    imagen: '/campus/campus-campeche.png',
    objectPosition: 'center 40%',
    objectPositionMobile: 'center center',
    displayMode: 'contained',
    titulo: 'Torneos ganados',
    texto: 'Participación y triunfos en competencias deportivas y académicas.',
  },
  {
    id: 'comunidades',
    imagen: '/actividades/trineo-suenos-1.jpg',
    objectPosition: 'center center',
    objectPositionMobile: 'center center',
    displayMode: 'contained',
    titulo: 'Apoyo a comunidades',
    texto: 'Proyectos de servicio, vinculación y impacto social.',
  },
  {
    id: 'innovacion',
    imagen: '/campus/como-nacio.jpeg',
    objectPosition: 'center center',
    objectPositionMobile: 'center 65%',
    displayMode: 'cover',
    titulo: 'Innovación estudiantil',
    texto: 'Desarrollo de ideas, prototipos y soluciones tecnológicas.',
  },
  {
    id: 'comunidad',
    imagen: '/actividades/experiencia-2.png',
    objectPosition: 'center center',
    objectPositionMobile: 'center center',
    displayMode: 'contained',
    titulo: 'Comunidad UNID',
    texto: 'Experiencias que fortalecen la pertenencia y el crecimiento personal.',
  },
];

export default function PaginaExperienciaEstudiantil() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  const [slideActual, setSlideActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [touchInicio, setTouchInicio] = useState(null);
  const [esMovil, setEsMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
  const prefiereMovimientoReducido =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const onChange = (event) => setEsMovil(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (prefiereMovimientoReducido || pausado || SLIDES.length < 2) return undefined;
    const temporizador = window.setInterval(() => {
      setSlideActual((actual) => (actual + 1) % SLIDES.length);
    }, 5000);
    return () => window.clearInterval(temporizador);
  }, [pausado, prefiereMovimientoReducido]);

  useEffect(() => {
    if (!pausado) return undefined;
    const temporizador = window.setTimeout(() => setPausado(false), 8000);
    return () => window.clearTimeout(temporizador);
  }, [pausado]);

  function irAnterior() {
    setSlideActual((actual) => (actual - 1 + SLIDES.length) % SLIDES.length);
    setPausado(true);
  }

  function irSiguiente() {
    setSlideActual((actual) => (actual + 1) % SLIDES.length);
    setPausado(true);
  }

  function irA(index) {
    setSlideActual(index);
    setPausado(true);
  }

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white overflow-x-hidden' : 'bg-slate-50 text-slate-900 overflow-x-hidden'}>
      <BarraGeneral />
      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pt-16 sm:pt-24 pb-4 sm:pb-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] font-black text-amber-400 mb-4">
            Experiencia estudiantil
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[0.92] text-balance max-w-4xl">
            Triunfos y experiencias que dejan huella
          </h1>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            UNID ha construido una historia de participación, logros y servicio a través de sus estudiantes y comunidades.
          </p>
        </div>
      </section>

      <section
        className="px-6 sm:px-8 lg:px-12 xl:px-16 pt-4 sm:pt-8 pb-16 sm:pb-24"
        aria-roledescription="carousel"
        aria-label="Experiencias estudiantiles"
      >
        <div className="max-w-6xl mx-auto">
          <div
            className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[800px] overflow-hidden rounded-[2rem] bg-[#0b111e]"
            tabIndex={0}
            onTouchStart={(e) => setTouchInicio(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchInicio === null) return;
              const diferencia = e.changedTouches[0].clientX - touchInicio;
              if (Math.abs(diferencia) > 50) {
                if (diferencia > 0) irAnterior();
                else irSiguiente();
              }
              setTouchInicio(null);
            }}
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)}
            onBlur={() => setPausado(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') irAnterior();
              if (e.key === 'ArrowRight') irSiguiente();
            }}
          >
            {SLIDES.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ${index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-hidden={index !== slideActual}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${SLIDES.length}`}
              >
                {esMovil || slide.displayMode !== 'contained' ? (
                  <img
                    src={slide.imagen}
                    alt={slide.titulo}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: esMovil ? (slide.objectPositionMobile || slide.objectPosition || 'center center') : (slide.objectPosition || 'center center') }}
                  />
                ) : (
                  <>
                    <img
                      src={slide.imagen}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover brightness-50 blur-sm scale-105"
                      style={{ objectPosition: slide.objectPosition || 'center center' }}
                    />
                    <img
                      src={slide.imagen}
                      alt={slide.titulo}
                      className="absolute inset-0 h-full w-full object-contain"
                      style={{ objectPosition: slide.objectPosition || 'center center' }}
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/55 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-6 sm:p-10">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black">{slide.titulo}</h2>
                  <p className="mt-3 text-xs sm:text-sm lg:text-base text-slate-200 max-w-xl">
                    {slide.texto}
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={irAnterior}
              aria-label="Diapositiva anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition cursor-pointer shadow-lg"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={irSiguiente}
              aria-label="Diapositiva siguiente"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition cursor-pointer shadow-lg"
            >
              ›
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            {SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => irA(index)}
                aria-label={`Ir a la diapositiva ${index + 1} de ${SLIDES.length}`}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${index === slideActual ? 'bg-amber-400' : 'bg-slate-500 hover:bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
