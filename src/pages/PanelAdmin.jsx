/* Panel de administración: gestiona usuarios, clubes, anuncios e historial mediante NavegacionPanel. */
import { useAutenticacion } from '../contexts/AuthContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { usePanelAdmin } from '../hooks/usePanelAdmin';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_ADMIN } from '../constants/navegacion';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { DashboardAdmin } from '../components/admin/DashboardAdmin';
import { SeccionUsuarios } from '../components/admin/secciones/SeccionUsuarios';
import { SeccionClubesAdmin } from '../components/admin/secciones/SeccionClubesAdmin';
import { SeccionAnuncios } from '../components/admin/secciones/SeccionAnuncios';
import { ModalFormularioClub } from '../components/admin/modales/ModalFormularioClub';
import { ModalFormularioUsuario } from '../components/admin/modales/ModalFormularioUsuario';
import { TablaHistorial } from '../components/admin/tablas/TablaHistorial';
import { TablaActividad } from '../components/admin/tabla-actividad/TablaActividad';
import { ModalPasswordAdmin } from '../components/admin/modales/ModalPasswordAdmin';
import { SeccionDiapositivas } from '../components/admin/seccion-diapositivas/SeccionDiapositivas';
import { Spinner } from '../components/ui/Spinner';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { formatearNombre } from '../utils/formato';

export function PanelAdmin() {
  const { usuario } = useAutenticacion();
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

          {d.vistaActiva === 'usuarios' && <SeccionUsuarios d={d} />}

          {d.vistaActiva === 'clubes' && <SeccionClubesAdmin d={d} />}

          {d.vistaActiva === 'anuncios' && (
            <SeccionAnuncios clubes={d.clubes} onSuccess={() => d.setFeedback('Anuncio publicado correctamente')} />
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
