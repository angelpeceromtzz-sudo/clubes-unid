import { BarraBusquedaUsuarios } from '../BarraBusquedaUsuarios';
import { TablaUsuarios } from '../tablas/TablaUsuarios';
import { SeccionUsuariosDesactivados } from './SeccionUsuariosDesactivados';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';

export function SeccionUsuarios({ d }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <BarraBusquedaUsuarios busqueda={d.busqueda} onChange={d.setBusqueda} />
        <select
          value={d.filtroRol}
          onChange={(e) => d.setFiltroRol(e.target.value)}
          className={`flex-1 sm:flex-none px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-amber-400/50 ${d.selectCls}`}
        >
          <option value="">Todos los roles</option>
          <option value="1">Alumnos</option>
          <option value="2">Presidentes</option>
          <option value="3">Admins</option>
          <option value="4">Rectoría</option>
        </select>
        <BotonAccion
          onClick={d.abrirModalCrearUsuario}
          className="flex-1 sm:flex-none shrink-0"
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
