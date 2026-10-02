import { BarraBusquedaUsuarios } from '../BarraBusquedaUsuarios';
import { TablaUsuarios } from '../tablas/TablaUsuarios';
import { SeccionUsuariosDesactivados } from './SeccionUsuariosDesactivados';

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
        <button
          onClick={d.abrirModalCrearUsuario}
          className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          Crear Usuario
        </button>
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
