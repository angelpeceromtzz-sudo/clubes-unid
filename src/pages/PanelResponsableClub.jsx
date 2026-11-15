/* Panel del presidente de club: información del club y gestión completa de convocatorias. */
import { useEffect, useMemo } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { usePanelNav } from '../contexts/PanelNavContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { SeccionAvisos } from '../components/responsable/secciones/SeccionAvisos';
import { SeccionMiembros } from '../components/responsable/secciones/SeccionMiembros';
import { usePanelResponsableClub } from '../hooks/usePanelResponsableClub';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_RESPONSABLE_CLUB } from '../constants/navegacion';
import { VistaConvocatorias } from '../components/responsable/vistas/VistaConvocatorias';
import { VistaMiembros } from '../components/responsable/vistas/VistaMiembros';
import { VistaHistorial } from '../components/responsable/vistas/VistaHistorial';
import { VistaAsistencia } from '../components/asistencia/VistaAsistencia';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { TarjetasMiActividad } from '../components/actividades/TarjetasMiActividad';
import { useActividadesAsignadas } from '../hooks/useActividadesAsignadas';
import { useVistaPanel } from '../hooks/useVistaPanel';

export function PanelResponsableClub() {
  const { usuario } = useAutenticacion();
  const d = usePanelResponsableClub(usuario);
  const asignacion = useActividadesAsignadas();
  const elementosNav = useMemo(()=>{
    return !d.club ? ELEMENTOS_NAV_RESPONSABLE_CLUB.filter((item)=>item.key==='principal') : d.esResponsableClub ? ELEMENTOS_NAV_RESPONSABLE_CLUB : ELEMENTOS_NAV_RESPONSABLE_CLUB.filter((item)=>item.key!=='asistencia');
  },[d.club,d.esResponsableClub]);
  const [vistaVisible,setVistaActiva]=useVistaPanel(elementosNav,'principal');
  const { setPanelNav } = usePanelNav();
  useEffect(() => {
    setPanelNav({ itemsNav:elementosNav, onNavChange:setVistaActiva });
    return () => setPanelNav({ itemsNav: [], onNavChange: null });
  }, [setPanelNav,elementosNav,setVistaActiva]);

  if (d.loading) {
    return (
      <RutaProtegida>
        <Spinner className="py-32" />
      </RutaProtegida>
    );
  }

  if (!d.club) {
    return <RutaProtegida><NavegacionPanel elementosNav={elementosNav} vistaActiva={vistaVisible} onVistaChange={setVistaActiva}>
      <div className="mb-6"><EncabezadoPagina titulo="Mi panel" subtitulo={'Bienvenido, '+usuario.nombre_completo}/></div>
      <TarjetasMiActividad asignacion={asignacion}/>
      <p className="text-sm">Aún no tienes un club asignado.</p>
      {d.error && <p role="alert" className="mb-5 text-sm text-red-600 dark:text-red-400">No se pudo consultar el club: {d.error}</p>}
    </NavegacionPanel></RutaProtegida>;
  }

  return (
    <RutaProtegida>
      <NavegacionPanel
        elementosNav={elementosNav}
        vistaActiva={vistaVisible}
        onVistaChange={setVistaActiva}
      >
        <div className="mb-6 md:mb-8">
            <EncabezadoPagina
              titulo={d.esResponsableClub ? 'Panel de Presidente' : 'Panel de Lider de Club'}
              subtitulo={`Bienvenido, ${d.user.nombre_completo} · ${d.esResponsableClub ? 'Presidente' : 'Lider de Club'} de ${d.club.nombre_club}`}
            />
          </div>



          {vistaVisible === 'principal' && <>
            <TarjetasMiActividad asignacion={asignacion}/>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} />
                <SeccionAvisos club={d.club} esResponsableClub={true} />
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} />
              </div>
            </div>
          </>}

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
