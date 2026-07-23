import { Icono } from '../../ui/Icono';
import { clasesBadge } from '../../../constants/colores';
import { obtenerUrlImagen } from '../../../utils/imagen';

export function HeroClub({ club, modoOscuro, onBotonClick, botonTexto, estaAutenticado, esAdmin, tieneInscripcionActiva, deshabilitado }) {
  const esProximamente = club.id_estatus_club === 2;
  const esInactivo = club.id_estatus_club === 3;
  const estado = !esProximamente && !esInactivo ? club.estado_calculado : null;

  const c = {
    bg: modoOscuro ? "bg-[#0e162c]" : "bg-white",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
  };

  return (
    <div className={`rounded-2xl overflow-hidden border ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
      <div className="overflow-hidden rounded-t-2xl h-64 md:h-80">
        <img
          src={obtenerUrlImagen(club.imagen_portada || club.imagen)}
          alt={club.nombre_club}
          className={`w-full h-full object-cover ${esProximamente ? 'opacity-60' : ''}`}
        />
      </div>
      <div className={`p-6 md:p-8 ${c.bg}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
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
          {!esProximamente && !esInactivo && !deshabilitado && estado === 'abierto' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <Icono nombre="check-circle" strokeWidth={2} className="h-3 w-3" />
              Convocatoria abierta
            </span>
          )}
          {!esProximamente && !esInactivo && !deshabilitado && estado === 'proximo' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400">
              <Icono nombre="clock" strokeWidth={2} className="h-3 w-3" />
              Abre pronto
            </span>
          )}
          {!esProximamente && !esInactivo && !deshabilitado && (estado === 'lleno' || estado === 'cerrado') && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border bg-red-500/10 border-red-500/30 text-red-400">
              <Icono nombre="lock" strokeWidth={2} className="h-3 w-3" />
              {estado === 'lleno' ? 'Cupo lleno' : 'Convocatoria cerrada'}
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
                ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                : deshabilitado || esAdmin || tieneInscripcionActiva
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {botonTexto}
          </button>
        )}
      </div>
    </div>
  );
}
