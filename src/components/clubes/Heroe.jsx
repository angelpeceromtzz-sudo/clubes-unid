/* Hero con carrusel de imágenes de banner (fondo, gradiente suave y navegación). */
import { useState, useEffect, useRef } from 'react';
import { Icono } from '../ui/Icono';
import { api } from '../../services/api';
import { obtenerUrlImagen } from '../../utils/imagen';

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
    if (alineacion === 'derecha') return 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)';
    if (alineacion === 'centro') return 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)';
    return 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)';
  }

  return (
    <section id="hero" className="w-full">
      <div className="group relative w-full overflow-hidden h-70 sm:h-88 md:h-[60vh] lg:h-[65vh]">

        {diapositivas.map((slide, index) => (
          <div
            key={slide.id_diapositiva}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${obtenerUrlImagen(slide.url_imagen)})` }}
            />

            <div
              className="absolute inset-0"
              style={{ background: gradiente(slide.alineacion) }}
            />
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
