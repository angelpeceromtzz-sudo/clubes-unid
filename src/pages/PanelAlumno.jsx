/* Mi panel: club, postulaciones e inscripciones a actividades. */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePanelNav } from '../contexts/PanelNavContext';
import { useVistaPanel } from '../hooks/useVistaPanel';
import { usePanelAlumno } from '../hooks/usePanelAlumno';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_ALUMNO } from '../constants/navegacion';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { SeccionAvisos } from '../components/responsable/secciones/SeccionAvisos';
import { ChatClub } from '../components/clubes/ChatClub';
import { SeccionMiembros } from '../components/responsable/secciones/SeccionMiembros';
import { SeccionPostulaciones } from '../components/responsable/secciones/SeccionPostulaciones';
import { MisActividadesPanel } from '../components/actividades/MisActividadesPanel';
import { TarjetasMiActividad } from '../components/actividades/TarjetasMiActividad';
import { useActividadesAsignadas } from '../hooks/useActividadesAsignadas';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/tutorial/TutorialOverlay';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { Alerta } from '../components/ui/Alerta';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { abrirPanelResponsable } from '../services/panelResponsable';

const NAV_SIN_CLUB = [
  ELEMENTOS_NAV_ALUMNO.find((item) => item.key === 'panel'),
  { key:'postulaciones',label:'Mis postulaciones',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5h6M9 12h6M9 16h6' },
  ...ELEMENTOS_NAV_ALUMNO.filter((item)=>item.key==='mis-actividades'),
].filter(Boolean);

export function PanelAlumno() {
  const navigate=useNavigate();
  const {usuario,esResponsableClub,esLiderClub,esAdmin,esRectoria,esResponsableMural}=useAutenticacion();
  const {tema,modoOscuro}=useTheme();
  const {setPanelNav}=usePanelNav();
  const d=usePanelAlumno();
  const asignacion=useActividadesAsignadas();
  const idUsuario = usuario?.id_usuario ?? usuario?.id;
  const claveTutorialAlumno = idUsuario ? `tutorial_alumno_${idUsuario}_pending` : null;
  const { activo: tutorialActivo, paso: pasoTutorial, iniciar: iniciarTutorialPrincipal, reintentar: repetirTutorialPrincipal, siguiente: siguienteTutorialPrincipal, saltar: saltarTutorialPrincipal } = useTutorial(idUsuario ? `alumno_${idUsuario}` : null);
  const { activo: tutorialMiembroActivo, paso: pasoTutorialMiembro, iniciar: iniciarTutorialMiembro, siguiente: siguienteTutorialMiembro, saltar: saltarTutorialMiembro } = useTutorial(`alumno_club_${usuario?.id_usuario}_${d.club?.id_club}`);
  const pasosTutorial = useMemo(() => [
    { titulo: 'Bienvenido a tu panel', texto: 'Aquí puedes consultar tu club, tus postulaciones y las actividades que tienes asignadas.', target: '[data-tutorial="panel-alumno"]' },
    { titulo: 'Menú de navegación', texto: 'Abre este menú para entrar a tu panel, revisar tus postulaciones y consultar tus actividades.', target: '[data-tutorial="menu-panel"]' },
    { titulo: 'Tu perfil', texto: 'Consulta y edita tu información personal, insignias e intereses desde aquí.', target: '[data-tutorial="perfil"]' },
    { titulo: 'Noticias y eventos', texto: 'Desde aquí puedes consultar las noticias, novedades y eventos de la universidad.', target: '[data-tutorial="noticias-eventos"]' },
    { titulo: 'Calendario', texto: 'Consulta en el calendario los eventos y actividades programados.', target: '[data-tutorial="calendario"]' },
    ...(d.club ? [
      { titulo: 'Noticias y avisos', texto: 'En esta sección encontrarás los avisos que publique la persona responsable de tu club.', target: '[data-tutorial="avisos-club"]' },
      { titulo: 'Tu club', texto: 'Consulta quiénes forman parte de tu club y revisa su información.', target: '[data-tutorial="mi-club"]' },
    ] : []),
    { titulo: 'Mis postulaciones', texto: 'Da seguimiento a tus solicitudes y revisa en qué estado se encuentran.', target: 'button[data-tutorial="postulaciones"]' },
    { titulo: 'Mis actividades', texto: 'Consulta las actividades que tienes asignadas desde este apartado.', target: 'button[data-tutorial="mis-actividades"]' },
  ], [d.club]);
  const pasosTutorialMiembro = useMemo(() => d.club ? [
    { titulo: `Tu club: ${d.club.nombre_club}`, texto: 'Aquí puedes consultar la información del club y los avisos de su responsable.', target: '[data-tutorial="alumno-info-club"]' },
    { titulo: 'Avisos del club', texto: 'Revisa los avisos y novedades que comparte el responsable.', target: '[data-tutorial="avisos-club"]' },
    { titulo: 'Integrantes', texto: 'Consulta quiénes forman parte de tu club.', target: '[data-tutorial="alumno-miembros-club"]' },
    { titulo: 'Chat del club', texto: 'Conversa con los miembros activos desde el chat del club.', target: 'button[data-tutorial="alumno-chat-club"]' },
    { titulo: 'Horarios', texto: 'Consulta los horarios disponibles para las actividades del club.', target: 'button[data-tutorial="alumno-horarios"]' },
  ] : [], [d.club]);
  const pasosTutorialActuales = tutorialActivo ? pasosTutorial : pasosTutorialMiembro;
  const pasoTutorialActual = tutorialActivo ? pasoTutorial : pasoTutorialMiembro;
  const targetTutorialActual = pasosTutorialActuales[pasoTutorialActual]?.target;
  const elementosNav=useMemo(()=>{
    const opciones=d.club ? ELEMENTOS_NAV_ALUMNO : NAV_SIN_CLUB;
    return usuario?.id_rol===1 ? opciones : opciones.filter((item)=>item.key!=='mis-actividades');
  },[d.club,usuario?.id_rol]);
  const [vistaAlumno, setVistaAlumno] = useVistaPanel(elementosNav, d.club ? 'mi-club' : 'mi-panel');
  const [dismissMiembroBanner,setDismissMiembroBanner]=useState(()=>{
    try{return localStorage.getItem('dismiss_miembro_banner')==='true';}catch{return false;}
  });
  useEffect(()=>{
    if(esResponsableClub || esLiderClub) abrirPanelResponsable(navigate,{replace:true});
    else if(esAdmin) navigate('/admin/panel',{replace:true});
    else if(esRectoria) navigate('/rectoria/panel',{replace:true});
    else if(esResponsableMural) navigate('/mural/panel',{replace:true});
  },[esResponsableClub,esLiderClub,esAdmin,esRectoria,esResponsableMural,navigate]);
  useEffect(()=>{
    if(esResponsableClub || esLiderClub || esAdmin || esRectoria || esResponsableMural) return;
    setPanelNav({itemsNav:elementosNav,onNavChange:setVistaAlumno});
    return ()=>setPanelNav({itemsNav:[],onNavChange:null});
  },[setPanelNav,elementosNav,setVistaAlumno,esResponsableClub,esLiderClub,esAdmin,esRectoria,esResponsableMural]);
  useEffect(() => {
    if (d.loading || !d.club?.id_club || !idUsuario) return;
    const claveCompletado = `tutorial_alumno_club_${idUsuario}_${d.club.id_club}_done`;
    try {
      if (localStorage.getItem(claveCompletado) === 'true') return;
      if (tutorialActivo || (claveTutorialAlumno && localStorage.getItem(claveTutorialAlumno))) return;
    } catch { /* El recorrido sigue disponible aunque el navegador limite el almacenamiento. */ }
    setVistaAlumno('mi-club');
    iniciarTutorialMiembro();
  }, [d.loading, d.club?.id_club, idUsuario, claveTutorialAlumno, tutorialActivo, iniciarTutorialMiembro, setVistaAlumno]);
  useEffect(() => {
    if (!claveTutorialAlumno) return;
    try {
      const solicitud = localStorage.getItem(claveTutorialAlumno);
      if (solicitud) {
        localStorage.removeItem(claveTutorialAlumno);
        if (solicitud === 'repetir') repetirTutorialPrincipal();
        else iniciarTutorialPrincipal();
      }
    } catch { /* La guía es opcional. */ }
  }, [claveTutorialAlumno, iniciarTutorialPrincipal, repetirTutorialPrincipal]);
  useEffect(() => {
    const iniciarTutorial = (evento) => evento.detail?.repetir ? repetirTutorialPrincipal() : iniciarTutorialPrincipal();
    window.addEventListener('clubsunid:iniciar-tutorial-alumno', iniciarTutorial);
    return () => window.removeEventListener('clubsunid:iniciar-tutorial-alumno', iniciarTutorial);
  }, [iniciarTutorialPrincipal, repetirTutorialPrincipal]);
  useEffect(() => {
    const targetsQueAbrenMenu = ['menu-panel', 'postulaciones', 'mis-actividades', 'alumno-chat-club', 'alumno-horarios'];
    const nombreTarget = targetTutorialActual?.match(/data-tutorial="([^"]+)"/)?.[1];
    const vistaMovil = window.matchMedia('(max-width: 767px)');
    let frameReintento = 0;
    const sincronizarMenu = () => {
      const abrirMenu = (tutorialActivo || tutorialMiembroActivo) && vistaMovil.matches && targetsQueAbrenMenu.includes(nombreTarget);
      window.dispatchEvent(new CustomEvent('clubsunid:menu-tutorial-alumno', { detail: { abierto: abrirMenu } }));
    };
    const sincronizarTrasRender = () => {
      sincronizarMenu();
      cancelAnimationFrame(frameReintento);
      frameReintento = requestAnimationFrame(sincronizarMenu);
    };
    sincronizarTrasRender();
    vistaMovil.addEventListener('change', sincronizarTrasRender);
    return () => {
      cancelAnimationFrame(frameReintento);
      vistaMovil.removeEventListener('change', sincronizarTrasRender);
      window.dispatchEvent(new CustomEvent('clubsunid:menu-tutorial-alumno', { detail: { abierto: false } }));
    };
  }, [tutorialActivo, tutorialMiembroActivo, targetTutorialActual]);
  function descartarBanner(){
    setDismissMiembroBanner(true);
    try{localStorage.setItem('dismiss_miembro_banner','true');}catch{ /* Preferencia opcional. */ }
  }
  if(esResponsableClub || esLiderClub || esAdmin || esRectoria || esResponsableMural || d.loading) return <Spinner className="py-32"/>;
  return <ErrorBoundary><RutaProtegida><NavegacionPanel elementosNav={elementosNav} vistaActiva={vistaAlumno} onVistaChange={setVistaAlumno} fullHeight={vistaAlumno === 'chat-club'}>
    {vistaAlumno !== 'chat-club' && <div data-tutorial="panel-alumno" className="mb-6 md:mb-8"><EncabezadoPagina titulo="Mi panel" subtitulo={'Bienvenido, '+(usuario?.nombre_completo || '')}/></div>}

    {(vistaAlumno === 'panel' || vistaAlumno === 'mi-panel') && <section className="mb-6 space-y-4" data-tutorial="resumen-alumno">
      <div>
        <h2 className={'text-xl font-black '+tema.title}>Tu resumen</h2>
        <p className={'mt-1 text-sm '+tema.subtitle}>Desde aquí puedes continuar con tus solicitudes o explorar los clubes.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-400/25 p-5">
          <p className={'text-sm '+tema.subtitle}>Mis postulaciones</p>
          <p className={'mt-1 text-2xl font-black '+tema.title}>{d.postulaciones.length}</p>
          <button type="button" onClick={()=>setVistaAlumno('postulaciones')} className="mt-4 cursor-pointer font-bold text-amber-600 underline dark:text-amber-400">Ver mis postulaciones</button>
        </article>
        <article className="rounded-2xl border border-slate-400/25 p-5">
          <p className={'text-sm '+tema.subtitle}>Clubes</p>
          <p className={'mt-1 text-sm font-semibold '+tema.title}>Encuentra una actividad para ti</p>
          <Link to="/campus/campeche/portal" className="mt-4 inline-block font-bold text-amber-600 underline dark:text-amber-400">Explorar clubes</Link>
        </article>
        <article className="rounded-2xl border border-slate-400/25 p-5 sm:col-span-2">
          <p className={'text-sm '+tema.subtitle}>Tu perfil</p>
          <p className={'mt-1 text-sm font-semibold '+tema.title}>Revisa tus datos y reconocimientos.</p>
          <button type="button" onClick={()=>navigate('/perfil')} className="mt-4 cursor-pointer font-bold text-amber-600 underline dark:text-amber-400">Ver mi perfil</button>
        </article>
      </div>
    </section>}
    {['mi-club','postulaciones'].includes(vistaAlumno) && <TarjetasMiActividad asignacion={asignacion}/>}
    {vistaAlumno==='mis-actividades' && <MisActividadesPanel/>}
    {vistaAlumno==='chat-club' && d.club && <ChatClub club={d.club} ocuparPantalla/>}
    {vistaAlumno==='postulaciones' && <section data-tutorial="postulaciones" className="space-y-5"><h2 className={'text-2xl font-bold '+tema.title}>Mis postulaciones</h2>
      {d.postulaciones.length ? <SeccionPostulaciones postulaciones={d.postulaciones} onPostulacionesChange={d.recargar}/> : <div className="rounded-2xl border border-slate-400/25 p-6 space-y-3"><p className={tema.subtitle}>No tienes una inscripción activa ni postulaciones a clubes.</p><Link to="/campus/campeche/portal" className="inline-block font-semibold text-amber-600 dark:text-amber-400 underline">Explorar clubes</Link></div>}
    </section>}
    {(vistaAlumno === 'panel' || vistaAlumno === 'mi-club') && d.club && <>
      {!dismissMiembroBanner && <div className="mb-8 relative"><button type="button" onClick={descartarBanner} title="No mostrar más" aria-label="No mostrar aviso de membresía" className="absolute top-3 right-3 p-1 rounded-full cursor-pointer z-10"><Icono nombre="close" className="h-4 w-4"/></button><Alerta tipo="success"><div className="flex items-center gap-3"><span className="text-2xl">🎉</span><div><h2 className={'text-lg font-black '+(modoOscuro ? 'text-emerald-300' : 'text-emerald-700')}>Miembro de {d.club.nombre_club}</h2><p className="text-sm">Eres miembro oficial de este club</p></div></div></Alerta></div>}
      <div data-tutorial="mi-club" className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-8"><div data-tutorial="alumno-info-club"><InformacionClub club={d.club}/></div><div data-tutorial="avisos-club"><SeccionAvisos club={d.club} esResponsableClub={false}/></div></div><div data-tutorial="alumno-miembros-club" className="space-y-8"><SeccionMiembros miembros={d.miembros} club={d.club}/></div></div>
    </>}
    {vistaAlumno==='horarios' && d.club && <HorariosClub club={d.club} modoOscuro={modoOscuro} esMiembro expandirHorarios/>}
    {tutorialActivo && <TutorialOverlay pasos={pasosTutorial} paso={pasoTutorial} onSiguiente={() => siguienteTutorialPrincipal(pasosTutorial.length)} onSaltar={saltarTutorialPrincipal} />}
    {!tutorialActivo && tutorialMiembroActivo && <TutorialOverlay pasos={pasosTutorialMiembro} paso={pasoTutorialMiembro} onSiguiente={() => siguienteTutorialMiembro(pasosTutorialMiembro.length)} onSaltar={saltarTutorialMiembro} />}
  </NavegacionPanel></RutaProtegida></ErrorBoundary>;
}
