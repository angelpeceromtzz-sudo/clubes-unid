/* Panel de administración: gestiona usuarios, clubes, anuncios e historial mediante NavegacionPanel. */
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { FormularioNotificacion } from '../components/formularios/FormularioNotificacion';
import { usePanelAdmin } from '../hooks/usePanelAdmin';
import { NavegacionPanel } from '../components/layout/NavegacionPanel';
import { ELEMENTOS_NAV_ADMIN } from '../components/admin/elementosNavegacion';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { TarjetasEstadisticas } from '../components/admin/TarjetasEstadisticas';
import { BarraBusquedaUsuarios } from '../components/admin/BarraBusquedaUsuarios';
import { TablaUsuarios } from '../components/admin/TablaUsuarios';
import { TablaClubes } from '../components/admin/TablaClubes';
import { AsignarAlumnoClub } from '../components/admin/AsignarAlumnoClub';
import { ModalFormularioClub } from '../components/admin/ModalFormularioClub';
import { ModalFormularioUsuario } from '../components/admin/ModalFormularioUsuario';
import { TablaHistorial } from '../components/admin/TablaHistorial';
import { ModalPasswordAdmin } from '../components/admin/ModalPasswordAdmin';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { Icono } from '../components/ui/Icono';

export function PanelAdmin() {
  const { usuario } = useAutenticacion();
  const { tema } = useTheme();
  const d = usePanelAdmin(usuario);

  if (d.loading) {
    return (
      <RutaProtegida requiereAdmin>
        <Spinner className="py-32" />
      </RutaProtegida>
    );
  }

  return (
    <RutaProtegida requiereAdmin>
      <NavegacionPanel
        elementosNav={ELEMENTOS_NAV_ADMIN}
        vistaActiva={d.vistaActiva}
        onVistaChange={d.setVistaActiva}
      >
        <div className="mb-6 md:mb-8">
            <EncabezadoPagina titulo="Panel de Administración" subtitulo={`Bienvenido, ${d.user.nombre_completo}`} />
          </div>

          <AlertaRetroalimentacion feedback={d.feedback} errorFeedback={d.errorFeedback} />

          {d.vistaActiva === 'resumen' && (
            <TarjetasEstadisticas
              totalAlumnos={d.totalAlumnos}
              clubesActivos={d.clubesActivos}
              totalInscripciones={d.totalInscripciones}
            />
          )}

          {d.vistaActiva === 'usuarios' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <BarraBusquedaUsuarios busqueda={d.busqueda} onChange={d.setBusqueda} />
                </div>
                <select
                  value={d.filtroRol}
                  onChange={(e) => d.setFiltroRol(e.target.value)}
                  className={`px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-amber-400/50 self-start ${d.selectCls}`}
                >
                  <option value="">Todos los roles</option>
                  <option value="1">Alumnos</option>
                  <option value="2">Presidentes</option>
                  <option value="3">Admins</option>
                  <option value="4">Rectoría</option>
                </select>
                <button
                  onClick={d.abrirModalCrearUsuario}
                  className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-2 shrink-0"
                >
                  <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
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
                onEliminarUsuario={d.handleEliminarUsuario}
                onAdminAction={d.abrirModalAdmin}
              />
            </div>
          )}

          {d.vistaActiva === 'clubes' && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <Icono nombre="search" strokeWidth={2} className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${d.isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={d.busquedaClubes}
                    onChange={(e) => d.setBusquedaClubes(e.target.value)}
                    placeholder="Buscar club por nombre o categoría..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
                      d.isDark
                        ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
              <TablaClubes
                clubes={d.clubesFiltrados}
                onStatusChange={d.handleStatusChange}
                onEditar={d.abrirModalEditar}
                onCrear={d.abrirModalCrear}
              />
            </div>
          )}

          {d.vistaActiva === 'asignar' && (
            <AsignarAlumnoClub
              usuarios={d.usuarios}
              clubesActivos={d.clubesActivosList}
              modoOscuro={d.isDark}
              onAsignar={d.handleAsignarAlumnoClub}
            />
          )}

          {d.vistaActiva === 'anuncios' && (
            <div className="max-w-2xl">
              <div className={`${d.cardCls} rounded-2xl p-6`}>
                <h2 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
                  Crear Anuncio
                </h2>
                <p className={`text-sm mb-6 ${tema.subtitle}`}>
                  Redacta un anuncio y selecciona la audiencia destino.
                </p>
                <FormularioNotificacion
                  clubes={d.clubes}
                  onSuccess={() => d.setFeedback('Anuncio publicado correctamente')}
                />
              </div>
            </div>
          )}

          {d.vistaActiva === 'historial' && (
            <TablaHistorial
              historial={d.historial}
              historialLoading={d.historialLoading}
              onRefresh={d.cargarHistorial}
            />
          )}

          <ModalFormularioClub
            show={d.showModalCrear}
            editandoClub={d.editandoClub}
            formClub={d.formClub}
            enviando={d.enviando}
            modalError={d.modalError}
            onClose={d.cerrarModal}
            onSave={d.guardarClub}
            onFormChange={d.handleClubFormChange}
            onUploadImage={d.subirImagen}
          />

          <ModalFormularioUsuario
            show={d.showModalUsuario}
            formUsuario={d.formUsuario}
            enviando={d.enviandoUsuario}
            modalError={d.errorModalUsuario}
            onClose={d.cerrarModalUsuario}
            onSave={d.guardarUsuario}
            onFormChange={d.handleUsuarioFormChange}
          />

          <ModalPasswordAdmin
            show={d.modalAdmin.show}
            targetUser={d.modalAdmin.targetUser}
            accion={d.modalAdmin.accion}
            enviando={d.enviandoAdmin}
            error={d.errorAdmin}
            onConfirm={d.manejarAdminAction}
            onClose={d.cerrarModalAdmin}
          />
      </NavegacionPanel>
    </RutaProtegida>
  );
}
