/* Panel de coordinación: métricas y resumen ejecutivo de lectura. */
import { useTheme } from '../contexts/ThemeContext';
import { useVistaEjecutiva } from '../hooks/useVistaEjecutiva';
import { VistaEjecutiva } from '../components/ejecutivo/VistaEjecutiva';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_COORDINACION } from '../constants/navegacion';

export function PanelCoordinacion() {
  const { tema } = useTheme();
  const ejecutivo = useVistaEjecutiva();

  return (
    <NavegacionPanel
      elementosNav={ELEMENTOS_NAV_COORDINACION}
      vistaActiva="resumen"
      onVistaChange={() => {}}
    >
      <h1 className={`text-2xl font-black tracking-tight mb-6 ${tema.title}`}>Panel de Coordinación</h1>

      {ejecutivo.error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400 font-medium">{ejecutivo.error}</p>
        </div>
      )}

      <VistaEjecutiva d={ejecutivo} />
    </NavegacionPanel>
  );
}
