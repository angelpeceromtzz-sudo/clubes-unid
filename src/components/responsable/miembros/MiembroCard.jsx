import { AvatarInicial } from '../../ui/AvatarInicial';
import { etiquetaResponsable } from '../../../utils/club';

function RolTag({ tipo, club }) {
  const config = {
    presidente: 'text-amber-400',
    vicepresidente: 'text-blue-400',
    miembro: 'text-slate-400',
  };
  const texto =
    tipo === 'presidente'
      ? etiquetaResponsable(club)
      : tipo === 'vicepresidente'
        ? 'Vicepresidente'
        : 'Miembro';
  return (
    <span className={`ml-2 text-[10px] uppercase tracking-wider font-bold ${config[tipo]}`}>
      {texto}
    </span>
  );
}

export function MiembroCard({ miembro, club, esResponsableClub, tieneVP, asignando, onAsignarVP, onExpulsar, modoOscuro, tema }) {
  const esResponsableClubDelClub = club.id_responsable_club === miembro.id_usuario;
  const esVicepresidente = club.id_vicepresidente === miembro.id_usuario;
  const puedeQuitarVP = esResponsableClub && esVicepresidente;
  const puedeAsignarVP = esResponsableClub && !esResponsableClubDelClub && !esVicepresidente && !tieneVP;

  const rol = esResponsableClubDelClub ? 'presidente' : esVicepresidente ? 'vicepresidente' : 'miembro';

  return (
    <div className={`group rounded-xl px-5 py-3 flex items-center justify-between ${modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-3">
        <AvatarInicial nombre={miembro.nombre_completo} color="amber" />
        <div>
          <p className={`text-sm font-medium ${tema.title}`}>
            {miembro.nombre_completo}
            <RolTag tipo={rol} club={club} />
          </p>
          <p className="text-xs text-slate-500">{miembro.correo_institucional}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
        {(puedeQuitarVP || puedeAsignarVP) && (
          <button onClick={() => onAsignarVP(miembro, esVicepresidente ? 'quitar' : 'asignar')}
            disabled={asignando === miembro.id_usuario}
            className={`max-sm:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer ${asignando === miembro.id_usuario ? 'opacity-50 cursor-not-allowed' : ''} ${esVicepresidente ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`}
          >
            {asignando === miembro.id_usuario ? '...' : esVicepresidente ? 'Quitar Vicepresidente' : 'Hacer Vicepresidente'}
          </button>
        )}
        {!esResponsableClubDelClub && (
          <button onClick={() => onExpulsar(miembro)}
            className={`text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer ${modoOscuro ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
          >
            Expulsar
          </button>
        )}
      </div>
    </div>
  );
}
