/* Hero con carrusel de imágenes de banner: tarjetas verticales en móvil
   (<768 px, con título/descripción sobre degradado e indicadores) y fondo
   full-bleed con fade en tablet/escritorio. */
import { useState, useEffect, useRef } from 'react';
import { Icono } from '../ui/Icono';
import { api } from '../../services/api';
import { obtenerUrlImagen } from '../../utils/imagen';
import { useTheme } from '../../contexts/ThemeContext';

export function Heroe({ onReady }) {
  const [diapositivas, setDiapositivas] = useState([]);
  const [slideActual, setSlideActual] = useState(0);
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches
  );
  const { modoOscuro } = useTheme();
  const temporizadorRef = useRef(null);
  const imagenesListas = useRef(false);
  const scrollerRef = useRef(null);
  // 'control' = el cambio viene de flechas/indicadores/autoplay (hay que
  // desplazar el carrusel); 'scroll' = lo originó el usuario (no intervenir).
  const origenRef = useRef('control');
  const bloqueoSyncRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const alCambiar = (e) => setEsMovil(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

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
      origenRef.current = 'control';
      setSlideActual((prev) => (prev + 1) % total);
    }, 8000);
  }

  function siguiente() {
    origenRef.current = 'control';
    setSlideActual((prev) => (prev + 1) % total);
    reiniciarTemporizador();
  }

  function anterior() {
    origenRef.current = 'control';
    setSlideActual((prev) => (prev - 1 + total) % total);
    reiniciarTemporizador();
  }

  function irA(indice) {
    origenRef.current = 'control';
    setSlideActual(indice);
    reiniciarTemporizador();
  }

  useEffect(() => {
    if (total === 0) return;
    temporizadorRef.current = setInterval(() => {
      origenRef.current = 'control';
      setSlideActual((prev) => (prev + 1) % total);
    }, 8000);
    return () => clearInterval(temporizadorRef.current);
  }, [total]);

  // Carrusel móvil: mantiene el estado sincronizado con la tarjeta centrada
  // (scroll nativo del contenedor = cambio por toque) y resetea el autoplay
  // al tocar la pista.
  useEffect(() => {
    if (!esMovil || total < 2) return;
    const cont = scrollerRef.current;
    if (!cont) return;

    const indiceCercano = () => {
      const centroScrollport = cont.scrollLeft + cont.clientWidth / 2;
      let mejor = 0;
      let distancia = Infinity;
      for (let i = 0; i < cont.children.length; i++) {
        const nino = cont.children[i];
        const d = Math.abs(nino.offsetLeft + nino.offsetWidth / 2 - centroScrollport);
        if (d < distancia) {
          distancia = d;
          mejor = i;
        }
      }
      return mejor;
    };

    let cuadro = null;
    const alScroll = () => {
      if (cuadro || bloqueoSyncRef.current) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = null;
        if (bloqueoSyncRef.current) return;
        const idx = indiceCercano();
        if (idx !== slideActual) {
          origenRef.current = 'scroll';
          setSlideActual(idx);
        }
      });
    };
    const alFinScroll = () => {
      bloqueoSyncRef.current = false;
      const idx = indiceCercano();
      if (idx !== slideActual) {
        origenRef.current = 'scroll';
        setSlideActual(idx);
      }
    };
    const alTocar = () => {
      bloqueoSyncRef.current = false;
      clearInterval(temporizadorRef.current);
      temporizadorRef.current = setInterval(() => {
        origenRef.current = 'control';
        setSlideActual((prev) => (prev + 1) % total);
      }, 8000);
    };

    cont.addEventListener('scroll', alScroll, { passive: true });
    cont.addEventListener('scrollend', alFinScroll);
    cont.addEventListener('pointerdown', alTocar, { passive: true });
    return () => {
      cont.removeEventListener('scroll', alScroll);
      cont.removeEventListener('scrollend', alFinScroll);
      cont.removeEventListener('pointerdown', alTocar);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, [esMovil, total, slideActual]);

  // Carrusel móvil: al cambiar la diapositiva por control (flechas,
  // indicadores o autoplay) desplaza el contenedor hasta centrarla.
  useEffect(() => {
    if (!esMovil || total < 2) return;
    if (origenRef.current === 'scroll') return;
    const cont = scrollerRef.current;
    if (!cont) return;
    const slide = cont.children[slideActual];
    if (!slide) return;
    const destino = Math.round(slide.offsetLeft - (cont.clientWidth - slide.offsetWidth) / 2);
    if (Math.abs(cont.scrollLeft - destino) <= 2) return;
    bloqueoSyncRef.current = true;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cont.scrollTo({ left: Math.max(0, destino), behavior: reducido ? 'auto' : 'smooth' });
    const limite = window.setTimeout(() => {
      bloqueoSyncRef.current = false;
    }, 900);
    return () => window.clearTimeout(limite);
  }, [esMovil, total, slideActual]);

  if (total === 0) return (
    <section id="hero" className="hero-catalogo w-full">
      <div className="min-h-[200px] sm:min-h-[320px] lg:h-[68vh] lg:min-h-[420px] max-h-[760px]" />
    </section>
  );

  // ---------------------------------------------------------------------
  // Móvil (<768 px): carrusel de tarjetas verticales con peek de la
  // siguiente. Esquinas superiores redondeadas; el borde inferior se
  // desvanece hacia el fondo de la página del tema activo (sin corte).
  // Texto en HTML sobre degradado; debajo, los indicadores. El scroll se
  // confina en el propio contenedor (snap-x).
  // ---------------------------------------------------------------------
  if (esMovil) {
    const clsFondoPagina = modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-50';
    return (
      /* Móvil: sin padding superior de sección (el CSS de escritorio ajusta
         .hero-catalogo > div, no la sección) para no acumular aire con el
         catálogo. Los indicadores solo existen con >1 diapositiva. */
      <section id="hero" className="hero-catalogo w-full lg:pt-2">
        <div className="relative w-full">
          <div
            ref={scrollerRef}
            className="nf-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto px-[5%]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            role="region"
            aria-roledescription="carrusel"
            aria-label="Banner de clubes"
          >
            {diapositivas.map((slide, index) => (
              /*
               * Móvil: 4/5 (más compacto que el 3/4 anterior). object-cover
               * recorta sin deformar; el encuadre prioriza al protagonista
               * (tercio superior). El degradado negro arranca hacia el 52 %
               * de la tarjeta y el fundido con el fondo del tema crece hasta
               * integrar título y subtítulo en la transición.
               */
              <article
                key={slide.id_diapositiva}
                aria-label={`Diapositiva ${index + 1} de ${total}`}
                className={`relative shrink-0 snap-center w-full aspect-[4/5] rounded-t-2xl overflow-hidden ${clsFondoPagina}`}
              >
                <img draggable={false}
                  src={obtenerUrlImagen(slide.url_imagen_movil || slide.url_imagen)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
                />
                <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                <div
                  data-hero-fundido
                  className={`absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t ${
                    modoOscuro
                      ? 'from-[#0b111e] via-[#0b111e]/55'
                      : 'from-slate-50 via-slate-50/55'
                  } to-transparent`}
                />
              </article>
            ))}
          </div>

        </div>

        {total > 1 && (
          /* Indicadores: sin flechas superpuestas (móvil se navega con
             swipe/indicadores). Padding inferior mínimo (4px); el catálogo
             pone pt-3 (12px) → ~16px visibles hasta el encabezado. */
          <div className="flex items-center justify-center pb-1">
            {diapositivas.map((slide, index) => (
              <button
                key={slide.id_diapositiva}
                onClick={() => irA(index)}
                aria-label={`Ir a diapositiva ${index + 1}`}
                aria-current={slideActual === index}
                className="flex h-6 w-6 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                {/* Círculos del mismo diámetro en todos los estados: el activo
                    solo cambia de color (ámbar vs gris). El botón de 24 px da
                    superficie táctil; el punto visible es de 8 px. */}
                <span
                  className={`h-2 w-2 rounded-full ${
                    slideActual === index
                      ? 'bg-amber-500'
                      : `${modoOscuro ? 'bg-white/35' : 'bg-slate-400'}`
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  /*
   * Imagen hero recomendada para el panel admin:
   *   Dimensiones: 1920 × 800 px (relación ~12:5 ≈ 21:9)
   *   Formato:     JPG/PNG/WebP, < 500 KB
   *   Composición: sujeto principal centrado o en tercio superior,
   *                dejando margen inferior para texto.
   */
  return (
    <section id="hero" className="hero-catalogo w-full">
      <div className="group relative w-full overflow-hidden min-h-[200px] sm:min-h-[320px] lg:h-[68vh] lg:min-h-[420px] max-h-[760px]">

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
                <img draggable={false}
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

        {/* Fundido inferior (solo escritorio): la imagen se integra con el
            fondo de la página sin corte horizontal. Capa decorativa sin
            espacio en el flujo; las flechas (z-20) siguen por encima. */}
        <div
          aria-hidden="true"
          className={`hidden lg:block absolute inset-x-0 bottom-0 z-10 h-[28%] pointer-events-none bg-gradient-to-t to-transparent ${
            modoOscuro
              ? 'from-[#0b111e] via-[#0b111e]/70'
              : 'from-slate-50 via-slate-50/70'
          }`}
        />

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
            {/* Indicadores escritorio (lg+): mismo estilo y estado que los
                móviles; círculos de 8 px en botones de 24 px, centrados sobre
                el fundido inferior. z-20 por encima del fundido (z-10,
                pointer-events-none). Con una sola diapositiva no se pintan. */}
            <div
              className="hidden lg:flex absolute inset-x-0 bottom-6 z-20 items-center justify-center"
              role="group"
              aria-label="Seleccionar diapositiva"
            >
              {diapositivas.map((slide, index) => (
                <button
                  key={slide.id_diapositiva}
                  onClick={() => irA(index)}
                  aria-label={`Ir a diapositiva ${index + 1}`}
                  aria-current={slideActual === index}
                  className="flex h-6 w-6 items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      slideActual === index
                        ? 'bg-amber-500'
                        : `${modoOscuro ? 'bg-white/35' : 'bg-slate-400'}`
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}

      </div>
    </section>
  );
}
