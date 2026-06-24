import { useState, useEffect, useRef } from 'react';

const DIAPOSITIVAS = [
  {
    imagen: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1470&auto=format&fit=crop",
    alineacion: "right",
    logro: "Bienvenidos a la manada"
  },
  {
    imagen: "https://images.unsplash.com/photo-1526470608269-f658cec19927?q=80&w=1470&auto=format&fit=crop",
    alineacion: "left",
    logro: "Gala Cultural — Auditorio Principal"
  },
  {
    imagen: "https://images.unsplash.com/photo-1529543544282-eaaf510c6c15?q=80&w=1470&auto=format&fit=crop",
    alineacion: "right",
    logro: "Exposición Anual de Artes Plásticas"
  },
  {
    imagen: "https://images.unsplash.com/photo-1575361204480-a430a8e7eae0?q=80&w=1471&auto=format&fit=crop",
    alineacion: "left",
    logro: "Torneo Nacional de Esports 2025"
  },
];

export function Heroe() {
  const [slideActual, setSlideActual] = useState(0);
  const total = DIAPOSITIVAS.length;
  const temporizadorRef = useRef(null);

  function reiniciarTemporizador() {
    clearInterval(temporizadorRef.current);
    temporizadorRef.current = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % DIAPOSITIVAS.length);
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
    temporizadorRef.current = setInterval(() => {
      setSlideActual((prev) => (prev + 1) % DIAPOSITIVAS.length);
    }, 8000);
    return () => clearInterval(temporizadorRef.current);
  }, []);

  return (
    <section className="w-full">
      <div className="group relative w-full overflow-hidden h-70 sm:h-88 md:h-104 lg:h-120">

        {DIAPOSITIVAS.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.imagen})` }}
            />

            <div
              className="absolute inset-0"
              style={{
                background: slide.alineacion === 'right'
                  ? 'linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)'
                  : 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)'
              }}
            />

            <div
              className={`relative z-10 h-full flex flex-col justify-center px-8 md:px-16 lg:px-24 ${
                slide.alineacion === 'right' ? 'items-end text-right' : 'items-start text-left'
              }`}
            >
              <span className="inline-block text-[10px] md:text-xs uppercase tracking-widest font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 mb-4">
                {slide.logro}
              </span>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold italic uppercase text-white max-w-2xl leading-tight">
                ¡ÚNETE A LOS{' '}
                <span className="text-[#FBBF24]">LOBOS ROJOS</span>!
              </h1>

              <p className="text-gray-200 text-base md:text-lg lg:text-xl font-medium tracking-wide max-w-xl mt-3 leading-relaxed">
                DESCUBRE TUS PASIONES. IMPULSA TU FUTURO.
              </p>

              <button
                onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-6 inline-flex items-center gap-2 bg-[#FBBF24] text-[#0e162c] font-extrabold text-sm md:text-base px-6 py-3 md:px-8 md:py-3.5 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
                <span>Explorar Clubes</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={anterior}
          className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
          aria-label="Anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={siguiente}
          className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:border-white/30 transition-opacity duration-300 cursor-pointer active:scale-90"
          aria-label="Siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </section>
  );
}
