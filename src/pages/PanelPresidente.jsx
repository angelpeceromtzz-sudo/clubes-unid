/* Panel del presidente de club: información del club, solicitudes, convocatorias y selección final. */
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { SeccionAvisos } from '../components/presidente/SeccionAvisos';
import { SeccionMiembros } from '../components/presidente/SeccionMiembros';
import { usePanelPresidente } from '../hooks/usePanelPresidente';
import { NavegacionPanel } from '../components/layout/NavegacionPanel';
import { ELEMENTOS_NAV_PRESIDENTE } from '../components/admin/elementosNavegacion';
import { EstadoVacio } from '../components/presidente/EmptyState';
import { SolicitudesPresidente } from '../components/presidente/SolicitudesPresidente';
import { SeccionConvocatorias } from '../components/presidente/SeccionConvocatorias';
import { SeleccionFinal } from '../components/presidente/SeleccionFinal';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';

export function PanelPresidente() {
  const { usuario } = useAutenticacion();
  const { tema } = useTheme();
  const d = usePanelPresidente(usuario);

  if (d.loading) {
    return (
      <RutaProtegida>
        <Spinner className="py-32" />
      </RutaProtegida>
    );
  }

  if (d.error) {
    return (
      <RutaProtegida>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-10">
            <p className="text-red-400 text-sm font-medium">{d.error}</p>
          </div>
        </div>
      </RutaProtegida>
    );
  }

  if (!d.club) {
    return <EstadoVacio />;
  }

  return (
    <RutaProtegida>
      <NavegacionPanel
        elementosNav={ELEMENTOS_NAV_PRESIDENTE}
        vistaActiva={d.vistaActiva}
        onVistaChange={d.setVistaActiva}
      >
        <div className="mb-6 md:mb-8">
            <EncabezadoPagina
              titulo="Panel de Presidente"
              subtitulo={`Bienvenido, ${d.user.nombre_completo} · Presidente de ${d.club.nombre_club}`}
            />
          </div>

          {d.vistaActiva === 'mi-club' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} />
                <SeccionAvisos club={d.club} esPresidente={true} />
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} />
              </div>
            </div>
          )}

          {d.vistaActiva === 'solicitudes' && (
            <SolicitudesPresidente club={d.club} />
          )}

          {d.vistaActiva === 'convocatorias' && (
            <SeccionConvocatorias club={d.club} />
          )}

          {d.vistaActiva === 'seleccion-final' && (
            <SeleccionFinal club={d.club} />
          )}
      </NavegacionPanel>
    </RutaProtegida>
  );
}
