import { BarraBusquedaUsuarios } from '../BarraBusquedaUsuarios';
import { TablaUsuarios } from '../tablas/TablaUsuarios';
import { SeccionUsuariosDesactivados } from './SeccionUsuariosDesactivados';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';

export function SeccionUsuarios({ d }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {(() => {
          const rolesExistentes = new Set((d.usuarios || []).map((u) => String(u.id_rol)));
          const opcionesRol = [
            { value: '1', label: 'Alumnos' },
            { value: '2', label: 'Responsables del club' },
            { value: '3', label: 'Admins' },
            { value: '4', label: 'Rectoría' },
          ].filter((r) => rolesExistentes.has(r.value));
          return (
            <select
              value={d.filtroRol}
              onChange={(e) => d.setFiltroRol(e.target.value)}
              className={`flex-1 sm:flex-none px-1.5 py-0.5 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-amber-400/50 ${d.selectCls}`}
            >
              <option value="">Todos los roles</option>
              {opcionesRol.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          );
        })()}
        <BarraBusquedaUsuarios busqueda={d.busqueda} onChange={d.setBusqueda} />
        <BotonAccion
          onClick={d.abrirModalCrearUsuario}
          size="sm"
          className="flex-1 sm:flex-none shrink-0 text-xs"
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          Crear Usuario
        </BotonAccion>
      </div>
      <TablaUsuarios
        usuarios={d.usuariosFiltrados}
        busqueda={d.busqueda}
        currentUser={d.user}
        clubesActivosList={d.clubesActivosList}
        asignando={d.asignando}
        onRoleChange={d.handleRoleChange}
        onRemoveFromClub={d.handleRemoveFromClub}
        onAsignarClub={d.handleAsignarClub}
        onAsignarAlumnoClub={d.handleAsignarAlumnoClub}
        onEliminarUsuario={d.handleEliminarUsuario}
        onAdminAction={d.abrirModalAdmin}
      />
      <SeccionUsuariosDesactivados d={d} />
    </div>
  );
}
