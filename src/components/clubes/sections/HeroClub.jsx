import { Icono } from '../../ui/Icono';
import { clasesBadge } from '../../../constants/colores';

export function HeroClub({ club, modoOscuro, onBotonClick, botonTexto, estaAutenticado, esAdmin, tieneInscripcionActiva }) {
  const esProximamente = club.id_estatus_club === 2;
  const esInactivo = club.id_estatus_club === 3;

  const c = {
    bg: modoOscuro ? "bg-[#0e162c]" : "bg-white",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <div className={`rounded-2xl overflow-hidden border ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
      <div className="overflow-hidden rounded-t-2xl h-64 md:h-80">
        <img
          src={club.imagen_portada || club.imagen}
          alt={club.nombre_club}
          className={`w-full h-full object-cover ${esProximamente ? 'opacity-60' : ''}`}
        />
      </div>
      <div className={`p-6 md:p-8 ${c.bg}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
            {club.categoria}
          </span>
          {esProximamente && (
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-slate-500 border-slate-500/30 bg-slate-500/10">
              Próximamente
            </span>
          )}
          {esInactivo && (
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-red-400 border-red-400/30 bg-red-400/10">
              Inactivo
            </span>
          )}
        </div>
        <h1 className={`text-3xl md:text-4xl font-black leading-tight mb-4 ${c.title}`}>
          {club.nombre_club}
        </h1>
        <p className={`text-base leading-relaxed ${c.text} max-w-3xl`}>
          {club.descripcion}
        </p>
        {botonTexto && (
          <button
            onClick={onBotonClick}
            className={`mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
              !estaAutenticado
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : esAdmin || tieneInscripcionActiva
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            <Icono nombre="zap" strokeWidth={2} className="h-4 w-4" />
            {botonTexto}
          </button>
        )}
      </div>
    </div>
  );
}
