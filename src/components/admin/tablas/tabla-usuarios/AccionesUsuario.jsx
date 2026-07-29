import { Icono } from '../../../ui/Icono';

export function AccionesUsuario({ u, currentUser, onRoleChange, onAdminAction, onEliminarUsuario, modoOscuro, selectCls }) {
  const esSelf = u.id_usuario === currentUser.id;
  const esAdmin = u.id_rol === 3;

  if (esSelf) {
    return (
      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg border ${modoOscuro ? 'text-slate-500 border-slate-600/30 bg-slate-600/10' : 'text-slate-500 border-slate-300/30 bg-slate-100'}`}>
        Eres tú
      </span>
    );
  }

  if (esAdmin) {
    return (
      <>
        <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold px-2 py-1 rounded-lg border border-red-400/30 bg-red-400/10">
          Admin
        </span>
        <button
          onClick={() => onAdminAction?.(u, 'demote')}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer active:scale-90"
          title="Degradar administrador"
        >
          <Icono nombre="lock" strokeWidth={2} className="h-3.5 w-3.5" />
        </button>
      </>
    );
  }

  return (
    <>
      <select
        value={u.id_rol}
        onChange={(e) => onRoleChange(u.id_usuario, Number(e.target.value))}
        className={selectCls}
      >
        <option value={1}>Alumno</option>
        <option value={2}>Presidente</option>
      </select>
      <button
        onClick={() => onAdminAction?.(u, 'promote')}
        className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer active:scale-90"
        title="Promover a administrador"
      >
        <Icono nombre="star" strokeWidth={2} className="h-3.5 w-3.5" />
      </button>
      {onEliminarUsuario && (
        <button
          onClick={() => onEliminarUsuario(u.id_usuario, u.nombre_completo)}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer active:scale-90"
          title="Eliminar usuario"
        >
          <Icono nombre="trash" strokeWidth={2} className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
