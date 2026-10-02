import { clasesBadge } from '../../constants/colores';

export function SidebarClub({ club, c, modoOscuro, lleno, disponibles, esProximamente, esInactivo, botonTexto, estaAutenticado, esAdmin, tieneInscripcionActiva, onBotonClick }) {
  return (
    <div className={`md:sticky md:top-6 rounded-2xl border p-6 space-y-5 transition-colors duration-300 ${c.sidebar}`}>
      <div>
        <h3 className={`text-lg font-bold ${c.title}`}>
          {club.nombre_club}
        </h3>
        <span className={`inline-block mt-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
          {club.categoria}
        </span>
      </div>

      <div className={`h-px ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`} />

      <div>
        <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-500">
          Lugares Disponibles
        </span>
        <p className={`text-2xl font-black mt-1 ${lleno ? 'text-red-400' : c.title}`}>
          {esProximamente || esInactivo ? (
            '—'
          ) : disponibles > 0 ? (
            <>{club.cupo_actual || 0} de {club.cupo_maximo} lugares</>
          ) : (
            "Completo"
          )}
        </p>
      </div>

      {botonTexto && (
        <button
          onClick={onBotonClick}
          className={`w-full font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
            !estaAutenticado
              ? modoOscuro ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              : 'bg-amber-400 hover:bg-amber-500 text-[#0e162c]'
          }`}
        >
          {botonTexto}
        </button>
      )}

      {esAdmin && estaAutenticado && (
        <p className="text-sm text-slate-500 font-medium text-center">
          Los administradores no pueden inscribirse a clubes.
        </p>
      )}

      {estaAutenticado && tieneInscripcionActiva && !esAdmin && (
        <p className="text-sm text-amber-400 font-medium text-center">
          Ya estás inscrito en un club.
        </p>
      )}
    </div>
  );
}
