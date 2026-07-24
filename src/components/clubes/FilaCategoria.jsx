/* Fila horizontal de tarjetas de club agrupadas por categoría, estilo Netflix. Scroll horizontal con flechas de navegación en desktop. */
import { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { TarjetaClub } from './TarjetaClub';

export function FilaCategoria({ titulo, clubes, onClubClick }) {
  const { modoOscuro } = useTheme();
  const scrollRef = useRef(null);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(true);

  function verificarScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setPuedeIzquierda(el.scrollLeft > 4);
    setPuedeDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    verificarScroll();
    el.addEventListener('scroll', verificarScroll, { passive: true });
    window.addEventListener('resize', verificarScroll);
    return () => {
      el.removeEventListener('scroll', verificarScroll);
      window.removeEventListener('resize', verificarScroll);
    };
  }, [clubes]);

  function scroll(pasos) {
    const el = scrollRef.current;
    if (!el) return;
    const anchoTarjeta = el.querySelector('div')?.offsetWidth || 288;
    el.scrollBy({ left: pasos * (anchoTarjeta + 24), behavior: 'smooth' });
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4 px-6 sm:px-8 lg:px-12 xl:px-16">
        <h3 className={`text-sm sm:text-base font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {titulo}
        </h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          modoOscuro ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'
        }`}>
          {clubes.length}
        </span>
      </div>

      <div className="relative group/row">
        {puedeIzquierda && (
          <button
            onClick={() => scroll(-1)}
            className={`hidden md:flex absolute left-2 top-0 bottom-4 z-10 w-10 items-center justify-center rounded-lg opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 cursor-pointer ${
              modoOscuro ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/80 hover:bg-white text-slate-700 shadow-lg'
            }`}
            aria-label="Anterior"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scroll-smooth pb-4 px-6 sm:px-8 lg:px-12 xl:px-16"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <style>{`.nf-fila-scroll::-webkit-scrollbar { display: none; }`}</style>
          {clubes.map((club) => (
            <div key={club.id_club} className="nf-fila-scroll shrink-0 w-64 sm:w-72 md:w-80">
              <TarjetaClub
                nombre={club.nombre_club}
                descripcion={club.descripcion}
                categoria={club.categoria}
                cupoMaximo={club.cupo_maximo}
                cupoActual={parseInt(club.cupo_actual) || 0}
                imagen={club.imagen_portada || club.imagen}
                onClick={() => onClubClick(club)}
                idEstatusClub={club.id_estatus_club}
                estatus={club.estatus}
                estadoCalculado={club.estado_calculado}
              />
            </div>
          ))}
        </div>

        {puedeDerecha && (
          <button
            onClick={() => scroll(1)}
            className={`hidden md:flex absolute right-2 top-0 bottom-4 z-10 w-10 items-center justify-center rounded-lg opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 cursor-pointer ${
              modoOscuro ? 'bg-black/60 hover:bg-black/80 text-white' : 'bg-white/80 hover:bg-white text-slate-700 shadow-lg'
            }`}
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
