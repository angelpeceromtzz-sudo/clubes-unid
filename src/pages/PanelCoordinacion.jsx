/* Panel de coordinación: métricas y resumen ejecutivo de lectura, y expediente estudiantil. */
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { usePanelNav } from '../contexts/PanelNavContext';
import { useVistaEjecutiva } from '../hooks/useVistaEjecutiva';
import { useVistaPanel } from '../hooks/useVistaPanel';
import { VistaEjecutiva } from '../components/ejecutivo/VistaEjecutiva';
import { SeccionExpediente } from '../components/expediente/SeccionExpediente';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_COORDINACION } from '../constants/navegacion';

export function PanelCoordinacion() {
  const { tema } = useTheme();
  const ejecutivo = useVistaEjecutiva();
  const [vistaActiva, setVistaActiva] = useVistaPanel(ELEMENTOS_NAV_COORDINACION);
  const { setPanelNav } = usePanelNav();

  useEffect(() => {
    setPanelNav({ itemsNav: ELEMENTOS_NAV_COORDINACION, onNavChange: setVistaActiva });
    return () => setPanelNav({ itemsNav: [], onNavChange: null });
  }, [setPanelNav, setVistaActiva]);

  return (
    <NavegacionPanel
      elementosNav={ELEMENTOS_NAV_COORDINACION}
      vistaActiva={vistaActiva}
      onVistaChange={setVistaActiva}
    >
      <h1 className={`text-2xl font-black tracking-tight mb-6 ${tema.title}`}>Panel de Coordinación</h1>

      {ejecutivo.error && vistaActiva === 'resumen' && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400 font-medium">{ejecutivo.error}</p>
        </div>
      )}

      {vistaActiva === 'resumen' && <VistaEjecutiva d={ejecutivo} />}
      {vistaActiva === 'expediente' && <SeccionExpediente />}
    </NavegacionPanel>
  );
}
