/* Hero del catálogo: en escritorio, banner a sangre con crossfade y flechas de
   navegación; en móvil (< lg), carrusel táctil de tarjetas verticales de ~86vw
   (relación 3:4) con la imagen a pantalla completa, degradado inferior y título,
   descripción y CTA en HTML sobre la foto. Los indicadores van debajo de las
   tarjetas, con vista parcial de la siguiente. */
import { useState, useEffect, useRef } from 'react';
import { Icono } from '../ui/Icono';
import { api } from '../../services/api';
import { obtenerUrlImagen } from '../../utils/imagen';
import { useTheme } from '../../contexts/ThemeContext';
import { NAVBAR_HEIGHT } from '../../constants/limites';

export function Heroe({ onReady }) {
  const [diapositivas, setDiapositivas] = useState([]);
  const [slideActual, setSlideActual] = useState(0);
  const { modoOscuro } = useTheme();
  const temporizadorRef = useRef(null);
  const imagenesListas = useRef(false);
  const pistaRef = useRef(null);
  const slideActualRef = useRef(0);
  const slidePreviaRef = useRef(0);
  // 'usuario' = el cambio de slide vino del gesto de desplazamiento en la pista
  // móvil; en ese caso el efecto de centrado no debe volver a desplazarla.
  const origenScrollRef = useRef('auto');

  useEffect(() => {
    slideActualRef.current = slideActual;
  }, [slideActual]);

  useEffect(() => {
    api.getDiapositivasHero()
      .then((data) => {
        setDiapositivas(data);
        if (data.length > 0 && !imagenesListas.current) {
          // Precarga la imagen que se mostrará según el viewport actual:
          // escritorio (lg+) usa la imagen de banner; móvil la exclusiva si existe.
          const enEscritorio = typeof window !== 'undefined'
            && window.matchMedia?.('(min-width: 1024px)').matches;
          const primera = data[0];
          const urlPrevia = obtenerUrlImagen(
            (enEscritorio || !primera.url_imagen_movil) ? primera.url_imagen : primera.url_imagen_movil
          );
          const img = new Image();
          img.onload = () => {
            imagenesListas.current = true;
            onReady?.();
          };
          img.src = urlPrevia;
        } else {
          onReady?.();
        }
      })
      .catch(() => {
        setDiapositivas([]);
        onReady?.();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* Pista móvil: mantiene el indicador activo en sincronía con el gesto del
     usuario (la tarjeta cuyo centro está más cerca del centro de la pista). */
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    function alDesplazar() {
      const caja = pista.getBoundingClientRect();
      const centroVista = caja.left + pista.clientWidth / 2;
      const tarjetas = pista.children;
      let mejor = 0;
      let distancia = Infinity;
      for (let i = 0; i < tarjetas.length; i++) {
        const recta = tarjetas[i].getBoundingClientRect();
        const d = Math.abs(recta.left + recta.width / 2 - centroVista);
        if (d < distancia) {
          distancia = d;
          mejor = i;
        }
      }
      if (mejor !== slideActualRef.current) {
        origenScrollRef.current = 'usuario';
        setSlideActual(mejor);
        reiniciarTemporizador();
      }
    }
    pista.addEventListener('scroll', alDesplazar, { passive: true });
    return () => pista.removeEventListener('scroll', alDesplazar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  /* Centra en la pista móvil la tarjeta del slide activo (autoplay o
     indicadores). Los cambios originados por el propio gesto del usuario se
     consumen aquí sin desplazar de nuevo la pista. */
  useEffect(() => {
    const previa = slidePreviaRef.current;
    slidePreviaRef.current = slideActual;
    if (origenScrollRef.current === 'usuario') {
      origenScrollRef.current = 'auto';
      return;
    }
    const pista = pistaRef.current;
    if (!pista || total === 0) return;
    const tarjeta = pista.children[slideActual];
    if (!tarjeta || pista.clientWidth === 0) return;
    // El vuelta (última → primera) salta sin animación: desplazar suave cruzaría
    // todas las tarjetas intermedias.
    const envuelve = total > 1 && previa !== slideActual
      && (previa === total - 1 || slideActual === total - 1);
    const caja = pista.getBoundingClientRect();
    const recta = tarjeta.getBoundingClientRect();
    const posicion = recta.left - caja.left + pista.scrollLeft;
    const objetivo = Math.max(0, posicion - (pista.clientWidth - tarjeta.offsetWidth) / 2);
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    pista.scrollTo({ left: objetivo, behavior: reducido || envuelve ? 'auto' : 'smooth' });
  }, [slideActual, total]);

  function irAlCatalogo(evento) {
    evento.preventDefault();
    const destino = document.getElementById('catalogo');
    if (!destino) return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const top = destino.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
    window.scrollTo({ top: Math.max(0, top), behavior: reducido ? 'auto' : 'smooth' });
  }

  /*
   * Imagen hero recomendada para el panel admin:
   *   Dimensiones: 1920 × 800 px (relación ~12:5 ≈ 21:9)
   *   Formato:     JPG/PNG/WebP, < 500 KB
   *   Composición: sujeto principal centrado o en tercio superior,
   *                dejando margen inferior para texto.
   *   Imagen móvil exclusiva del carrusel (retrato, p. ej. 1080 × 1350):
   *   compuesta para object-cover en la tarjeta 3:4.
   */
  if (total === 0) return (
    <section id="hero" className="hero-catalogo w-full">
      <div className="min-h-[200px] sm:min-h-[320px] lg:aspect-[21/9] lg:min-h-[400px] max-h-[600px]" />
    </section>
  );

  return (
    <section id="hero" className="hero-catalogo w-full">

      {/* ══ Móvil: carrusel de tarjetas verticales ══ */}
      <div className="lg:hidden pt-3">
        <ul
          ref={pistaRef}
          aria-label="Destaques del catálogo"
          className="nf-scroll flex snap-x snap-mandatory gap-2 overscroll-x-contain overflow-x-auto px-6 pb-1 sm:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {diapositivas.map((slide) => (
            <li
              key={slide.id_diapositiva}
              className="relative aspect-[3/4] w-[86vw] max-w-[440px] shrink-0 snap-center overflow-hidden rounded-2xl bg-[#0b111e] shadow-lg shadow-black/25"
            >
              <picture>
                <source media="(min-width: 1024px)" srcSet={obtenerUrlImagen(slide.url_imagen)} />
                <img
                  src={obtenerUrlImagen(slide.url_imagen_movil || slide.url_imagen)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                {slide.titulo && (
                  <h2 className="line-clamp-2 text-xl font-black leading-tight tracking-tight text-white drop-shadow-sm sm:text-2xl">
                    {slide.titulo}
                  </h2>
                )}
                {slide.subtitulo && (
                  <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-white/80 drop-shadow-sm">
                    {slide.subtitulo}
                  </p>
                )}
                <a
                  href="#catalogo"
                  onClick={irAlCatalogo}
                  className="mt-3 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-black tracking-tight text-[#0e162c] shadow-md shadow-black/30 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
                >
                  Explorar clubes
                  <Icono nombre="arrow-right" className="h-4 w-4" strokeWidth={2.5} />
                </a>
              </div>
            </li>
          ))}
        </ul>

        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-2" role="group" aria-label="Seleccionar diapositiva">
            {diapositivas.map((slide, index) => (
              <button
                key={slide.id_diapositiva}
                type="button"
                onClick={() => {
                  setSlideActual(index);
                  reiniciarTemporizador();
                }}
                aria-label={`Ir a la diapositiva ${index + 1}`}
                aria-current={index === slideActual}
                className="group flex h-6 w-6 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === slideActual
                      ? `w-6 ${modoOscuro ? 'bg-amber-400' : 'bg-amber-600'}`
                      : `w-2 ${modoOscuro
                        ? 'bg-slate-500 group-hover:bg-slate-400'
                        : 'bg-slate-500 group-hover:bg-slate-600'}`
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ Escritorio: banner a sangre (comportamiento existente) ══ */}
      <div className="hidden lg:block group relative w-full overflow-hidden min-h-[200px] sm:min-h-[320px] lg:aspect-[21/9] lg:min-h-[400px] max-h-[600px]">

        {diapositivas.map((slide, index) => (
          <div
            key={slide.id_diapositiva}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {slide.url_imagen_movil ? (
              /*
               * Con imagen móvil: <picture> elige la exclusiva para pantallas
               * pequeñas y la de escritorio desde lg (donde el layout actual
               * es bg-cover). La imagen móvil está compuesta para recorte
               * cover; la de escritorio conserva su posición center 30%.
               */
              <picture>
                <source media="(min-width: 1024px)" srcSet={obtenerUrlImagen(slide.url_imagen)} />
                <img
                  src={obtenerUrlImagen(slide.url_imagen_movil)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </picture>
            ) : (
              <div
                className="absolute inset-0 bg-no-repeat bg-contain lg:bg-cover lg:bg-[center_30%]"
                style={{ backgroundImage: `url(${obtenerUrlImagen(slide.url_imagen)})` }}
              />
            )}
          </div>
        ))}

        {total > 1 && (
          <>
            <button
              onClick={anterior}
              className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
              aria-label="Anterior"
            >
              <Icono nombre="chevron-left" strokeWidth={2} className="h-6 w-6" />
            </button>
            <button
              onClick={siguiente}
              className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
              aria-label="Siguiente"
            >
              <Icono nombre="chevron-right" strokeWidth={2} className="h-6 w-6" />
            </button>
          </>
        )}

      </div>
    </section>
  );
}
