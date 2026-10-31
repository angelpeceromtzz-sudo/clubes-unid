/* Panel de rectoría: resumen estadístico, detalle de clubes, padrón y control de asistencia. */
import { useTheme } from '../contexts/ThemeContext';
import { usePanelRectoria } from '../hooks/usePanelRectoria';
import { useVistaEjecutiva } from '../hooks/useVistaEjecutiva';
import { VistaEjecutiva } from '../components/ejecutivo/VistaEjecutiva';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_RECTORIA } from '../constants/navegacion';
import { SeccionResumen } from '../components/rectoria/SeccionResumen';
import { SeccionClubes } from '../components/rectoria/SeccionClubes';
import { SeccionPadron } from '../components/rectoria/SeccionPadron';
import { SeccionAsistencia } from '../components/rectoria/SeccionAsistencia';
import { TablaActividad } from '../components/admin/tabla-actividad/TablaActividad';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { SeccionNoticias } from '../components/admin/seccion-noticias/SeccionNoticias';
import { SeccionCalendarioAdmin } from '../components/admin/secciones/SeccionCalendarioAdmin';
import { SeccionMuralAdmin } from '../components/admin/secciones/SeccionMuralAdmin';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';
import { SeccionEncuestas } from '../components/admin/seccion-encuestas/SeccionEncuestas';

export function PanelRectoria() {
  const { tema } = useTheme();
  const d = usePanelRectoria();
  const ejecutivo = useVistaEjecutiva();

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
          <VistaEjecutiva d={ejecutivo} />
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
        {d.vistaActiva === 'encuestas' && (
          /* La misma sección que en PanelAdmin. No se bifurca por rol porque la
             sección ya sabe qué es escritura: `useSeccionEncuestas` calcula
             `esAdmin` del `id_rol` y esconde Nueva, Editar, Cerrar y
             Eliminar cuando no lo es. Lo que sí se queda para rectoría es la
             lectura completa: lista, resultados, vista previa y enlace público. */
          <SeccionEncuestas d={d} />
        )}

        {d.vistaActiva === 'actividad' && (
          <TablaActividad />
        )}
        {d.vistaActiva === 'calendario' && <SeccionCalendarioAdmin />}
        {d.vistaActiva === 'mural' && <SeccionMuralAdmin />}
        {d.vistaActiva === 'noticias' && (
          <SeccionNoticias gestion={d.noticias} />
        )}

        <ModalConfirmacion
          show={!!d.pendienteConfirmacionNoticia}
          titulo="Eliminar publicación"
          mensaje={`¿Eliminar la publicación "${d.pendienteConfirmacionNoticia?.titulo || ''}"? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          varianteDanger
          onConfirmar={d.confirmarPendienteNoticia}
          onCancelar={d.cancelarPendienteNoticia}
        />
    </NavegacionPanel>
  );
}
