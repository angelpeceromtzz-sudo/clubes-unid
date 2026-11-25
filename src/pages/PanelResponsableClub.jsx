/* Panel del presidente de club: información del club y gestión completa de convocatorias. */
import { useEffect, useMemo } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { usePanelNav } from '../contexts/PanelNavContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { SeccionFeedClub } from '../components/responsable/secciones/SeccionFeedClub';
import { ChatClub } from '../components/clubes/ChatClub';
import { usePanelResponsableClub } from '../hooks/usePanelResponsableClub';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_RESPONSABLE_CLUB } from '../constants/navegacion';
import { VistaConvocatorias } from '../components/responsable/vistas/VistaConvocatorias';
import { VistaMiembros } from '../components/responsable/vistas/VistaMiembros';
import { VistaHistorial } from '../components/responsable/vistas/VistaHistorial';
import { VistaAsistencia } from '../components/asistencia/VistaAsistencia';
import { EventosResponsableClub } from '../components/responsable/vistas/EventosResponsableClub';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { TarjetasMiActividad } from '../components/actividades/TarjetasMiActividad';
import { useActividadesAsignadas } from '../hooks/useActividadesAsignadas';
import { useVistaPanel } from '../hooks/useVistaPanel';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';

export function PanelResponsableClub() {
  const { usuario } = useAutenticacion();
  const d = usePanelResponsableClub(usuario);
  const asignacion = useActividadesAsignadas();
  const tutorial = useTutorial(`responsable_${usuario?.id_usuario}`);
  const elementosNav = useMemo(()=>{
    return !d.club ? ELEMENTOS_NAV_RESPONSABLE_CLUB.filter((item)=>item.key==='principal') : d.esResponsableClub ? ELEMENTOS_NAV_RESPONSABLE_CLUB : ELEMENTOS_NAV_RESPONSABLE_CLUB.filter((item)=>item.key!=='asistencia');
  },[d.club,d.esResponsableClub]);
  const [vistaVisible,setVistaActiva]=useVistaPanel(elementosNav,'principal');
  const pasosTutorial = useMemo(() => {
    const pasos = [
      { seccion: 'principal', titulo: 'Mi panel', texto: 'Aquí ves la actividad reciente y los avisos publicados en tu club.', target: '[data-tutorial="responsable-panel"]' },
      { seccion: 'asistencia', titulo: 'Asistencia', texto: 'Desde aquí revisas las sesiones y registras quién asistió.', target: 'button[data-tutorial="responsable-asistencia"]' },
      { seccion: 'chat-club', titulo: 'Chat del club', texto: 'Aquí puedes conversar con las personas que forman parte de tu club.', target: 'button[data-tutorial="responsable-chat-club"]' },
      { seccion: 'eventos', titulo: 'Eventos', texto: 'En este módulo publicas y administras los eventos de tu club.', target: 'button[data-tutorial="responsable-eventos"]' },
      { seccion: 'miembros', titulo: 'Miembros del club', texto: 'Consulta quiénes forman parte de tu club y administra a sus integrantes.', target: 'button[data-tutorial="responsable-miembros"]' },
      { seccion: 'horarios', titulo: 'Horario', texto: 'Consulta y administra el horario de tu club.', target: 'button[data-tutorial="responsable-horarios"]' },
      { seccion: 'convocatorias', titulo: 'Convocatorias', texto: 'Gestiona las convocatorias, sus bloques y las postulaciones.', target: 'button[data-tutorial="responsable-convocatorias"]' },
      { seccion: 'historial', titulo: 'Historial', texto: 'Revisa los cambios y movimientos anteriores de tu club.', target: 'button[data-tutorial="responsable-historial"]' },
    ];
    return pasos.filter((paso) => elementosNav.some((item) => item.key === paso.seccion));
  }, [elementosNav]);
  const targetTutorialActual = pasosTutorial[tutorial.paso]?.target;
  const { setPanelNav } = usePanelNav();
  useEffect(() => {
    setPanelNav({ itemsNav:elementosNav, onNavChange:setVistaActiva });
    return () => setPanelNav({ itemsNav: [], onNavChange: null });
  }, [setPanelNav,elementosNav,setVistaActiva]);
  useEffect(() => {
    if (!usuario?.id_usuario || d.loading || !d.club?.id_club) return;
    try {
      const solicitud = localStorage.getItem(`tutorial_responsable_${usuario.id_usuario}_pending`);
      if (solicitud) {
        localStorage.removeItem(`tutorial_responsable_${usuario.id_usuario}_pending`);
        setVistaActiva('principal');
        if (solicitud === 'repetir') tutorial.reintentar();
        else if (localStorage.getItem(`tutorial_responsable_${usuario.id_usuario}_done`) !== 'true') tutorial.iniciar();
      } else if (localStorage.getItem(`tutorial_responsable_${usuario.id_usuario}_done`) !== 'true') {
        setVistaActiva('principal');
        tutorial.iniciar();
      }
    } catch { /* La guía es opcional. */ }
  }, [usuario?.id_usuario, d.loading, d.club?.id_club, tutorial.iniciar, tutorial.reintentar, setVistaActiva]);
  useEffect(() => {
    const iniciarTutorial = (evento) => {
      setVistaActiva('principal');
      if (evento.detail?.repetir) tutorial.reintentar();
      else tutorial.iniciar();
    };
    window.addEventListener('clubsunid:iniciar-tutorial-responsable', iniciarTutorial);
    return () => window.removeEventListener('clubsunid:iniciar-tutorial-responsable', iniciarTutorial);
  }, [setVistaActiva, tutorial.iniciar, tutorial.reintentar]);
  useEffect(() => {
    const targetsQueAbrenMenu = ['responsable-asistencia', 'responsable-chat-club', 'responsable-eventos', 'responsable-miembros', 'responsable-horarios', 'responsable-convocatorias', 'responsable-historial'];
    const nombreTarget = targetTutorialActual?.match(/data-tutorial="([^"]+)"/)?.[1];
    const vistaMovil = window.matchMedia('(max-width: 767px)');
    let frameReintento = 0;
    let tiempoReintento = 0;
    const sincronizarMenu = () => {
      const abierto = tutorial.activo && vistaMovil.matches && targetsQueAbrenMenu.includes(nombreTarget);
      window.dispatchEvent(new CustomEvent('clubsunid:menu-tutorial', { detail: { abierto } }));
    };
    const sincronizarTrasRender = () => {
      sincronizarMenu();
      cancelAnimationFrame(frameReintento);
      frameReintento = requestAnimationFrame(sincronizarMenu);
      window.clearTimeout(tiempoReintento);
      tiempoReintento = window.setTimeout(sincronizarMenu, 80);
    };
    sincronizarTrasRender();
    vistaMovil.addEventListener('change', sincronizarTrasRender);
    return () => {
      cancelAnimationFrame(frameReintento);
      window.clearTimeout(tiempoReintento);
      vistaMovil.removeEventListener('change', sincronizarTrasRender);
      window.dispatchEvent(new CustomEvent('clubsunid:menu-tutorial', { detail: { abierto: false } }));
    };
  }, [tutorial.activo, targetTutorialActual]);

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
        fullHeight={vistaVisible === 'chat-club'}
      >
          {vistaVisible !== 'chat-club' && <div data-tutorial="responsable-panel" className="mb-6 md:mb-8">
            <EncabezadoPagina
              titulo={d.esResponsableClub ? 'Panel de Presidente' : 'Panel de Lider de Club'}
              subtitulo={`Bienvenido, ${d.user.nombre_completo} · ${d.esResponsableClub ? 'Presidente' : 'Lider de Club'} de ${d.club.nombre_club}`}
            />
          </div>}



          {vistaVisible === 'principal' && <>
            <TarjetasMiActividad asignacion={asignacion}/>
            <SeccionFeedClub club={d.club} esResponsableClub={true} />
          </>}

          {vistaVisible === 'chat-club' && <ChatClub club={d.club} ocuparPantalla />}

          {vistaVisible === 'eventos' && <EventosResponsableClub club={d.club} />}

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

        {tutorial.activo && <TutorialOverlay pasos={pasosTutorial} paso={tutorial.paso} onSiguiente={() => tutorial.siguiente(pasosTutorial.length)} onSaltar={tutorial.saltar} />}
      </NavegacionPanel>
    </RutaProtegida>
  );
}
