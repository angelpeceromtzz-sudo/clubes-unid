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
import { ModalFormularioClub } from '../components/admin/ModalFormularioClub';
import { TablaHistorial } from '../components/admin/TablaHistorial';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';

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
              <BarraBusquedaUsuarios busqueda={d.busqueda} onChange={d.setBusqueda} />
              <TablaUsuarios
                usuarios={d.usuarios}
                busqueda={d.busqueda}
                currentUser={d.user}
                clubesActivosList={d.clubesActivosList}
                asignando={d.asignando}
                onRoleChange={d.handleRoleChange}
                onRemoveFromClub={d.handleRemoveFromClub}
                onAsignarClub={d.handleAsignarClub}
              />
            </div>
          )}

          {d.vistaActiva === 'clubes' && (
            <TablaClubes
              clubes={d.clubes}
              onStatusChange={d.handleStatusChange}
              onEditar={d.abrirModalEditar}
              onCrear={d.abrirModalCrear}
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
          />
      </NavegacionPanel>
    </RutaProtegida>
  );
}
