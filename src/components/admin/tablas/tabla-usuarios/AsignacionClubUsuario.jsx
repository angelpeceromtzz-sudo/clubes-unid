import { Spinner } from '../../../ui/Spinner';

export function AsignacionClubUsuario({ u, clubesActivosList, asignando, onRemoveFromClub, onAsignarClub, usuarios, currentUser, selectCls, setConfirmPendiente }) {
  if (u.id_rol === 1) {
    const clubActual = u.nombre_club;
    return (
      <div className="flex items-center gap-2">
        <select
          value={clubActual ? String(clubesActivosList.find((c) => c.nombre_club === clubActual)?.id_club || '') : ''}
          onChange={(e) => {
            const clubId = e.target.value ? Number(e.target.value) : null;
            if (!clubId) {
              if (clubActual) onRemoveFromClub(u.id_usuario);
              return;
            }
            const clubSel = clubesActivosList.find((c) => c.id_club === clubId);
            if (!clubSel) return;
            const mensaje = clubActual
              ? `¿Reasignar a "${u.nombre_completo}" del club "${clubActual}" al club "${clubSel.nombre_club}"?`
              : `¿Asignar a "${u.nombre_completo}" al club "${clubSel.nombre_club}"?`;
            setConfirmPendiente({ userId: u.id_usuario, clubId, mensaje });
          }}
          disabled={asignando[u.id_usuario] || u.id_usuario === currentUser.id}
          className={`${selectCls} text-xs py-1 px-2 w-auto max-w-[140px]`}
          title={u.id_usuario === currentUser.id ? 'No puedes asignarte un club a ti mismo' : ''}
        >
          <option value="">Sin club</option>
          {clubesActivosList.map((c) => (
            <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
          ))}
        </select>
        {asignando[u.id_usuario] && (
          <Spinner size="sm" color="border-amber-400" className="!py-0" />
        )}
      </div>
    );
  }
  if (u.id_rol === 2) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={u.nombre_club ? String(clubesActivosList.find((c) => c.nombre_club === u.nombre_club)?.id_club || '') : ''}
          onChange={(e) => {
            const clubId = e.target.value ? Number(e.target.value) : null;
            const clubSeleccionado = clubesActivosList.find((c) => c.id_club === clubId);
            const presidenteReemplazado = clubSeleccionado?.id_responsable_club && clubSeleccionado.id_responsable_club !== u.id_usuario;
            if (presidenteReemplazado) {
              const nombrePresidente = usuarios.find((u2) => u2.id_usuario === clubSeleccionado.id_responsable_club)?.nombre_completo || 'otro usuario';
              const mensaje = `El club "${clubSeleccionado.nombre_club}" ya tiene un presidente asignado (${nombrePresidente}). ¿Estás seguro de que deseas reemplazarlo?`;
              setConfirmPendiente({ userId: u.id_usuario, clubId, mensaje, tipo: 'presidente' });
              return;
            }
            onAsignarClub(u.id_usuario, clubId);
          }}
          disabled={asignando[u.id_usuario] || u.id_usuario === currentUser.id}
          className={`${selectCls} text-xs py-1 px-2 w-auto max-w-[140px]`}
          title={u.id_usuario === currentUser.id ? 'No puedes asignarte un club a ti mismo' : ''}
        >
          <option value="">Sin club</option>
          {clubesActivosList.map((c) => (
            <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
          ))}
        </select>
        {asignando[u.id_usuario] && (
          <Spinner size="sm" color="border-amber-400" className="!py-0" />
        )}
      </div>
    );
  }
  return <span className="text-xs text-slate-500 font-medium">—</span>;
}
