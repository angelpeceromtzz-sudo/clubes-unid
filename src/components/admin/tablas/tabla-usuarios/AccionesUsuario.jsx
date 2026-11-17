import { Icono } from '../../../ui/Icono';

export function AccionesUsuario({ u, currentUser, onAdminAction, onEliminarUsuario }) {
  const esSelf = u.id_usuario === currentUser.id;
  const esAdmin = u.id_rol === 3;

  if (esSelf) {
    return null;
  }

  if (esAdmin) {
    return (
      <button
        onClick={() => onAdminAction?.(u, 'demote')}
        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors cursor-pointer active:scale-90"
        title="Degradar administrador"
      >
        <Icono nombre="chevron-down" strokeWidth={2} className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <>
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
          title="Desactivar usuario"
        >
          <Icono nombre="x-circle" strokeWidth={2} className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
