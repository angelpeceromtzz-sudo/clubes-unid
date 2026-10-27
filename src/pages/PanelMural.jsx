/* Panel del responsable: administra el mural digital y redacta noticias
   que pasan por el flujo de aprobación de rectoría. */
import { useTheme } from '../contexts/ThemeContext';
import { useFeedback } from '../hooks/useFeedback';
import { useAdminNoticias } from '../hooks/useAdminNoticias';
import { useVistaPanel } from '../hooks/useVistaPanel';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_MURAL } from '../constants/navegacion';
import { SeccionNoticias } from '../components/admin/seccion-noticias/SeccionNoticias';
import { SeccionMuralAdmin } from '../components/admin/secciones/SeccionMuralAdmin';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';
import { Icono } from '../components/ui/Icono';

export function PanelMural() {
  const { tema } = useTheme();
  const { feedback, setFeedback, errorFeedback, setErrorFeedback } = useFeedback();
  const noticias = useAdminNoticias(setFeedback, setErrorFeedback);
  const [vistaActiva, setVistaActiva] = useVistaPanel(ELEMENTOS_NAV_MURAL, 'mural');

  return (
    <NavegacionPanel
      elementosNav={ELEMENTOS_NAV_MURAL}
      vistaActiva={vistaActiva}
      onVistaChange={setVistaActiva}
    >
      <h1 className={`text-2xl font-black tracking-tight mb-2 ${tema.title}`}>Periódico Mural</h1>

      {vistaActiva === 'noticias' && <div className={`mb-6 flex items-start gap-2 text-xs ${tema.subtitle}`}>
        <Icono nombre="info" strokeWidth={2} className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <p>
          Aquí redactas noticias y eventos. Guarda el borrador y envíalo a revisión
          para que rectoría lo apruebe antes de publicarlo.
        </p>
      </div>}

      <AlertaRetroalimentacion feedback={feedback} errorFeedback={errorFeedback} />

      {vistaActiva === 'mural' && <SeccionMuralAdmin />}
      {vistaActiva === 'noticias' && <SeccionNoticias gestion={noticias} />}

      <ModalConfirmacion
        show={!!noticias.pendienteConfirmacion}
        titulo="Eliminar publicación"
        mensaje={`¿Eliminar la publicación "${noticias.pendienteConfirmacion?.titulo || ''}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        varianteDanger
        onConfirmar={noticias.confirmarPendiente}
        onCancelar={noticias.cancelarPendiente}
      />
    </NavegacionPanel>
  );
}
