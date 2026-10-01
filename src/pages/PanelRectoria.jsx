/* Panel de rectoría: resumen estadístico, detalle de clubes, padrón y control de asistencia. */
import { useTheme } from '../contexts/ThemeContext';
import { usePanelRectoria } from '../hooks/usePanelRectoria';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_RECTORIA } from '../constants/navegacion';
import { SeccionResumen } from '../components/rectoria/SeccionResumen';
import { SeccionClubes } from '../components/rectoria/SeccionClubes';
import { SeccionPadron } from '../components/rectoria/SeccionPadron';
import { SeccionAsistencia } from '../components/rectoria/SeccionAsistencia';
import { TablaActividad } from '../components/admin/tabla-actividad/TablaActividad';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { SeccionNoticias } from '../components/admin/seccion-noticias/SeccionNoticias';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';

export function PanelRectoria() {
  const { tema } = useTheme();
  const d = usePanelRectoria();

  return (
    <NavegacionPanel
      elementosNav={ELEMENTOS_NAV_RECTORIA}
      vistaActiva={d.vistaActiva}
      onVistaChange={d.setVistaActiva}
    >
      <h1 className={`text-2xl font-black tracking-tight mb-6 ${tema.title}`}>Panel de Rectoría</h1>

        {d.error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-red-400 font-medium">{d.error}</p>
          </div>
        )}

        <AlertaRetroalimentacion feedback={d.feedback} errorFeedback={d.errorFeedback} />

        {d.vistaActiva === 'resumen' && (
          <SeccionResumen stats={d.stats} ocupacionClubes={d.ocupacionClubes} topClubes={d.topClubes} cargando={d.cargando} />
        )}
        {d.vistaActiva === 'clubes' && (
          <SeccionClubes clubesDetalle={d.clubesDetalle} cargando={d.cargando} />
        )}
        {d.vistaActiva === 'padron' && (
          <SeccionPadron
            padron={d.padron}
            filtrosPadron={d.filtrosPadron}
            aplicarFiltrosPadron={d.aplicarFiltrosPadron}
            clubesDetalle={d.clubesDetalle}
            cargando={d.cargando}
          />
        )}
        {d.vistaActiva === 'asistencia' && (
          <SeccionAsistencia
            clubesDetalle={d.clubesDetalle}
          clubAsistenciaId={d.clubAsistenciaId}
          seleccionarClubAsistencia={d.seleccionarClubAsistencia}
          asistencia={d.asistencia}
          cargando={d.cargando}
        />
      )}
        {d.vistaActiva === 'actividad' && (
          <TablaActividad />
        )}
        {d.vistaActiva === 'noticias' && (
          <SeccionNoticias
            noticias={d.noticias.noticias}
            noticiasFiltradas={d.noticias.noticiasFiltradas}
            cargando={d.noticias.cargando}
            busqueda={d.noticias.busqueda}
            setBusqueda={d.noticias.setBusqueda}
            showModal={d.noticias.showModal}
            editando={d.noticias.editando}
            form={d.noticias.form}
            enviando={d.noticias.enviando}
            errorModal={d.noticias.errorModal}
            abrirModalCrear={d.noticias.abrirModalCrear}
            abrirModalEditar={d.noticias.abrirModalEditar}
            cerrarModal={d.noticias.cerrarModal}
            togglePublicada={d.noticias.togglePublicada}
            eliminar={d.noticias.eliminar}
            guardar={d.noticias.guardar}
            handleFormChange={d.noticias.handleFormChange}
            subirImagen={d.noticias.subirImagen}
          />
        )}

        <ModalConfirmacion
          show={!!d.pendienteConfirmacionNoticia}
          titulo="Eliminar noticia"
          mensaje={`¿Eliminar la noticia "${d.pendienteConfirmacionNoticia?.titulo || ''}"? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          varianteDanger
          onConfirmar={d.confirmarPendienteNoticia}
          onCancelar={d.cancelarPendienteNoticia}
        />
    </NavegacionPanel>
  );
}
