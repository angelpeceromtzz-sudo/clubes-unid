/* Hero con carrusel de diapositivas (imágenes de fondo, gradiente, título y CTA para explorar clubes). */
import { useState, useEffect, useRef } from 'react';
import { Icono } from '../ui/Icono';
import { api } from '../../services/api';

export function Heroe() {
  const [diapositivas, setDiapositivas] = useState([]);
  const [slideActual, setSlideActual] = useState(0);
  const temporizadorRef = useRef(null);

  useEffect(() => {
    api.getDiapositivasHero()
      .then(setDiapositivas)
      .catch(() => setDiapositivas([]));
  }, []);

  const total = diapositivas.length;

  function reiniciarTemporizador() {
    clearInterval(temporizadorRef.current);
    temporizadorRef.current = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % total);
    }, 8000);
  }

  function siguiente() {
    setSlideActual((prev) => (prev + 1) % total);
    reiniciarTemporizador();
  }

  function anterior() {
    setSlideActual((prev) => (prev - 1 + total) % total);
    reiniciarTemporizador();
  }

  useEffect(() => {
    if (total === 0) return;
    temporizadorRef.current = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % total);
    }, 8000);
    return () => clearInterval(temporizadorRef.current);
  }, [total]);

  if (total === 0) return null;

  function gradiente(alineacion) {
    if (alineacion === 'derecha') return 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)';
    if (alineacion === 'centro') return 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)';
    return 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)';
  }

  function alignClasses(alineacion) {
    if (alineacion === 'derecha') return 'items-end text-right';
    if (alineacion === 'centro') return 'items-center text-center';
    return 'items-start text-left';
  }

  return (
    <section className="w-full">
      <div className="group relative w-full overflow-hidden h-70 sm:h-88 md:h-104 lg:h-120">

        {diapositivas.map((slide, index) => (
          <div
            key={slide.id_diapositiva}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.url_imagen})` }}
            />

            <div
              className="absolute inset-0"
              style={{ background: gradiente(slide.alineacion) }}
            />

            <div
              className={`relative z-10 h-full flex flex-col justify-center px-8 md:px-16 lg:px-24 ${
                alignClasses(slide.alineacion)
              }`}
            >
              <span className="inline-block text-[10px] md:text-xs uppercase tracking-widest font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 mb-4">
                {slide.titulo}
              </span>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold italic uppercase text-white max-w-2xl leading-tight">
                ¡ÚNETE A LOS{' '}
                <span className="text-amber-400">LOBOS ROJOS</span>!
              </h1>

              <p className="text-gray-200 text-base md:text-lg lg:text-xl font-medium tracking-wide max-w-xl mt-3 leading-relaxed">
                {slide.subtitulo || 'DESCUBRE TUS PASIONES. IMPULSA TU FUTURO.'}
              </p>

              <button
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-6 inline-flex items-center gap-2 bg-amber-400 text-[#0e162c] font-extrabold text-sm md:text-base px-6 py-3 md:px-8 md:py-3.5 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
                <span>Explorar Clubes</span>
                <Icono nombre="arrow-right" strokeWidth={2} className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={anterior}
          className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
          aria-label="Anterior"
        >
          <Icono nombre="chevron-left" strokeWidth={2} className="h-6 w-6" />
        </button>
        <button
          onClick={siguiente}
          className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
          aria-label="Siguiente"
        >
          <Icono nombre="chevron-right" strokeWidth={2} className="h-6 w-6" />
        </button>

      </div>
    </section>
  );
}
