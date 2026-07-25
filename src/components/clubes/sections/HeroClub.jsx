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
      <div className={`grid grid-cols-1 md:grid-cols-2 ${c.bg}`}>
        <div className="overflow-hidden h-64 md:h-auto md:min-h-[400px]">
          <img
            src={obtenerUrlImagen(club.imagen_portada || club.imagen)}
            alt={club.nombre_club}
            className={`w-full h-full object-cover ${esProximamente ? 'opacity-60' : ''}`}
          />
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
              {club.categoria}
            </span>
            {esProximamente && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-slate-400 border-slate-400/30 bg-slate-400/10">
                <Icono nombre="clock" strokeWidth={2} className="h-3 w-3" />
                Próximamente
              </span>
            )}
            {esInactivo && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-red-400 border-red-400/30 bg-red-400/10">
                <Icono nombre="x-circle" strokeWidth={2} className="h-3 w-3" />
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
          <p className={`text-base leading-relaxed mb-6 ${c.text}`}>
            {club.descripcion}
          </p>
          <div className="hidden md:block mb-8">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${c.title}`}>
              ¿Qué aprenderás?
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {['Trabajo en equipo y liderazgo', 'Gestión de proyectos',
                'Comunicación efectiva', 'Resolución de problemas',
                'Pensamiento crítico', 'Creatividad e innovación'].map((hab, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${modoOscuro ? 'bg-amber-400' : 'bg-amber-500'}`} />
                  <span className={`text-xs ${c.text}`}>{hab}</span>
                </li>
              ))}
            </ul>
          </div>
          {botonTexto && (
            <button
              onClick={onBotonClick}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                !estaAutenticado
                  ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 cursor-pointer'
                  : deshabilitado || esAdmin || tieneInscripcionActiva
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
              }`}
            >
              {botonTexto}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
