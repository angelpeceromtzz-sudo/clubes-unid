/* Panel del presidente de club: información del club y gestión completa de convocatorias. */
import { useAutenticacion } from '../contexts/AuthContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { SeccionAvisos } from '../components/responsable/secciones/SeccionAvisos';
import { SeccionMiembros } from '../components/responsable/secciones/SeccionMiembros';
import { usePanelResponsableClub } from '../hooks/usePanelResponsableClub';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_RESPONSABLE_CLUB } from '../constants/navegacion';
import { EstadoVacio } from '../components/responsable/EmptyState';
import { VistaConvocatorias } from '../components/responsable/vistas/VistaConvocatorias';
import { VistaMiembros } from '../components/responsable/vistas/VistaMiembros';
import { VistaHistorial } from '../components/responsable/vistas/VistaHistorial';
import { VistaAsistencia } from '../components/asistencia/VistaAsistencia';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';

export function PanelResponsableClub() {
  const { usuario } = useAutenticacion();
  const d = usePanelResponsableClub(usuario);

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

  // Asistencia V1: disponible únicamente para el presidente (no vicepresidente).
  const elementosNav = d.esResponsableClub
    ? ELEMENTOS_NAV_RESPONSABLE_CLUB
    : ELEMENTOS_NAV_RESPONSABLE_CLUB.filter((item) => item.key !== 'asistencia');

  const vistaVisible =
    d.vistaActiva === 'asistencia' && !d.esResponsableClub ? 'principal' : d.vistaActiva;

  return (
    <RutaProtegida>
      <NavegacionPanel
        elementosNav={elementosNav}
        vistaActiva={vistaVisible}
        onVistaChange={d.setVistaActiva}
      >
        <div className="mb-6 md:mb-8">
            <EncabezadoPagina
              titulo={d.esResponsableClub ? 'Panel de Presidente' : 'Panel de Vicepresidente'}
              subtitulo={`Bienvenido, ${d.user.nombre_completo} · ${d.esResponsableClub ? 'Presidente' : 'Vicepresidente'} de ${d.club.nombre_club}`}
            />
          </div>

          {vistaVisible === 'principal' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} />
                <SeccionAvisos club={d.club} esResponsableClub={true} />
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} />
              </div>
            </div>
          )}

          {vistaVisible === 'convocatorias' && (
            <VistaConvocatorias club={d.club} />
          )}

          {vistaVisible === 'miembros' && (
            <VistaMiembros club={d.club} esResponsableClub={d.esResponsableClub} onActualizarClub={d.actualizarClub} />
          )}

          {vistaVisible === 'historial' && (
            <VistaHistorial club={d.club} />
          )}

          {vistaVisible === 'asistencia' && (
            <VistaAsistencia club={d.club} />
          )}

          {vistaVisible === 'horarios' && (
            <HorariosClub
              club={d.club}
              modoOscuro={d.isDark}
              esAdmin={false}
              esResponsableClub={true}
            />
          )}

      </NavegacionPanel>
    </RutaProtegida>
  );
}
