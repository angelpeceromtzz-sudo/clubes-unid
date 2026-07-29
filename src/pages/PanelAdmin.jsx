/* Panel de administración: gestiona usuarios, clubes, anuncios e historial mediante NavegacionPanel. */
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { FormularioNotificacion } from '../components/formularios/FormularioNotificacion';
import { usePanelAdmin } from '../hooks/usePanelAdmin';
import { NavegacionPanel } from '../components/layout/NavegacionPanel';
import { ELEMENTOS_NAV_ADMIN } from '../constants/navegacion';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { DashboardAdmin } from '../components/admin/DashboardAdmin';
import { BarraBusquedaUsuarios } from '../components/admin/BarraBusquedaUsuarios';
import { TablaUsuarios } from '../components/admin/TablaUsuarios';
import { TablaClubes } from '../components/admin/TablaClubes';
import { ModalFormularioClub } from '../components/admin/ModalFormularioClub';
import { ModalFormularioUsuario } from '../components/admin/ModalFormularioUsuario';
import { TablaHistorial } from '../components/admin/TablaHistorial';
import { TablaActividad } from '../components/admin/TablaActividad';
import { ModalPasswordAdmin } from '../components/admin/ModalPasswordAdmin';
import { SeccionDiapositivas } from '../components/admin/SeccionDiapositivas';
import { Spinner } from '../components/ui/Spinner';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { formatearNombre } from '../utils/formato';

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
            <EncabezadoPagina titulo="Panel de Administración" subtitulo={`Bienvenido, ${formatearNombre(d.user.nombre_completo)}`} />
          </div>

          <AlertaRetroalimentacion feedback={d.feedback} errorFeedback={d.errorFeedback} />

          {d.vistaActiva === 'resumen' && (
            <DashboardAdmin
              totalAlumnos={d.totalAlumnos}
              clubesActivos={d.clubesActivos}
              totalInscripciones={d.totalInscripciones}
              solicitudesPendientes={d.dashboardData?.solicitudesPendientes}
              cargandoDashboard={d.cargandoDashboard}
              inscripciones={d.dashboardData?.ultimasInscripciones}
              inscripcionesPorMes={d.dashboardData?.inscripcionesPorMes}
              clubes={d.clubes}
              historial={d.historial}
              historialLoading={d.historialLoading}
            />
          )}

          {d.vistaActiva === 'usuarios' && (
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
            </div>
          )}

          {d.vistaActiva === 'clubes' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${d.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
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
                <button
                  onClick={d.abrirModalCrear}
                  className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
                >
                  <span className="text-lg leading-none">+</span>
                  Agregar Nuevo Club
                </button>
              </div>
              <TablaClubes
                clubes={d.clubesFiltrados}
                onStatusChange={d.handleStatusChange}
                onEditar={d.abrirModalEditar}
                onCrear={d.abrirModalCrear}
              />
            </div>
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

          {d.vistaActiva === 'actividad' && (
            <TablaActividad />
          )}

          {d.vistaActiva === 'diapositivas' && (
            <SeccionDiapositivas
              diapositivas={d.hero.diapositivas}
              diapositivasFiltradas={d.hero.diapositivasFiltradas}
              busqueda={d.hero.busqueda}
              setBusqueda={d.hero.setBusqueda}
              showModal={d.hero.showModal}
              editando={d.hero.editando}
              form={d.hero.form}
              enviando={d.hero.enviando}
              errorModal={d.hero.errorModal}
              abrirModalCrear={d.hero.abrirModalCrear}
              abrirModalEditar={d.hero.abrirModalEditar}
              cerrarModal={d.hero.cerrarModal}
              toggleActiva={d.hero.toggleActiva}
              eliminar={d.hero.eliminar}
              guardar={d.hero.guardar}
              handleFormChange={d.hero.handleFormChange}
              subirImagen={d.hero.subirImagen}
              posicionesDisponibles={d.hero.posicionesDisponibles}
              maxBanners={d.hero.maxBanners}
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

          <ModalConfirmacion
            show={!!d.pendienteConfirmacionClub}
            titulo="Dar de baja club"
            mensaje="¿Estás seguro de dar de baja este club? Los miembros serán notificados."
            textoConfirmar="Dar de Baja"
            varianteDanger
            onConfirmar={d.confirmarPendienteClub}
            onCancelar={d.cancelarPendienteClub}
          />

          <ModalConfirmacion
            show={!!d.pendienteConfirmacionClub && d.pendienteConfirmacionClub?.tipo === 'editar'}
            titulo="Guardar cambios"
            mensaje={`¿Guardar los cambios en "${d.pendienteConfirmacionClub?.club?.nombre_club || ''}"?`}
            textoConfirmar="Guardar"
            onConfirmar={d.confirmarPendienteClub}
            onCancelar={d.cancelarPendienteClub}
          />

          <ModalConfirmacion
            show={!!d.pendienteConfirmacionUsuario && d.pendienteConfirmacionUsuario?.tipo === 'bajaAlumno'}
            titulo="Dar de baja del club"
            mensaje="¿Estás seguro de dar de baja a este alumno de su club?"
            textoConfirmar="Dar de Baja"
            varianteDanger
            onConfirmar={d.confirmarPendienteUsuario}
            onCancelar={d.cancelarPendienteUsuario}
          />

          <ModalConfirmacion
            show={!!d.pendienteConfirmacionUsuario && d.pendienteConfirmacionUsuario?.tipo === 'eliminar'}
            titulo="Eliminar usuario"
            mensaje={`¿Estás seguro de eliminar permanentemente al usuario "${d.pendienteConfirmacionUsuario?.nombre || ''}"? Esta acción no se puede deshacer.`}
            textoConfirmar="Eliminar"
            varianteDanger
            onConfirmar={d.confirmarPendienteUsuario}
            onCancelar={d.cancelarPendienteUsuario}
          />

          <ModalConfirmacion
            show={!!d.pendienteConfirmacionBanner}
            titulo="Eliminar banner"
            mensaje={`¿Eliminar el banner "${d.pendienteConfirmacionBanner?.titulo || ''}"?`}
            textoConfirmar="Eliminar"
            varianteDanger
            onConfirmar={d.confirmarPendienteBanner}
            onCancelar={d.cancelarPendienteBanner}
          />
      </NavegacionPanel>
    </RutaProtegida>
  );
}
