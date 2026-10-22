/* Panel del responsable del mural (PBI-16 / rol 6).

   Sólo monta el periódico mural: su alcance es redactar, guardar borradores y
   enviar a revisión. Aprobar, rechazar y publicar son de rectoría, y la sección
   esconde esos botones según el `id_rol` (ver `constants/noticias.js`).

   La ruta `/mural/dashboard` también está envuelta en `RutaProtegida
   requiereResponsableMural`; aquí se repite por la misma razón que en
   PanelAdmin: que el panel no dependa de quien lo monte. */
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useFeedback } from '../hooks/useFeedback';
import { useAdminNoticias } from '../hooks/useAdminNoticias';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_MURAL } from '../constants/navegacion';
import { SeccionNoticias } from '../components/admin/seccion-noticias/SeccionNoticias';
import { AlertaRetroalimentacion } from '../components/admin/AlertaRetroalimentacion';
import { ModalConfirmacion } from '../components/ui/ModalConfirmacion';
import { Icono } from '../components/ui/Icono';

export function PanelMural() {
  const { tema } = useTheme();
  const { feedback, setFeedback, errorFeedback, setErrorFeedback } = useFeedback();
  const noticias = useAdminNoticias(setFeedback, setErrorFeedback);
  const [vistaActiva, setVistaActiva] = useState('noticias');

  return (
    <NavegacionPanel
      elementosNav={ELEMENTOS_NAV_MURAL}
      vistaActiva={vistaActiva}
      onVistaChange={setVistaActiva}
    >
      <h1 className={`text-2xl font-black tracking-tight mb-2 ${tema.title}`}>Periódico Mural</h1>

      <div className={`mb-6 flex items-start gap-2 text-xs ${tema.subtitle}`}>
        <Icono nombre="info" strokeWidth={2} className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <p>
          Aquí ves y editas tus publicaciones. Recuerda: nada aparece en el mural hasta que
          rectoría lo apruebe; guarda el borrador y envíalo a revisión cuando esté listo.
        </p>
      </div>

      <AlertaRetroalimentacion feedback={feedback} errorFeedback={errorFeedback} />

      <SeccionNoticias gestion={noticias} />

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
