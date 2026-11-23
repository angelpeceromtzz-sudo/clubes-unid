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
  { key:'postulaciones',label:'Mis postulaciones',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5h6M9 12h6M9 16h6' },
  ...ELEMENTOS_NAV_ALUMNO.filter((item)=>item.key==='mis-actividades'),
];

export function PanelAlumno() {
  const navigate=useNavigate();
  const {usuario,esResponsableClub,esAdmin,esRectoria,esResponsableMural}=useAutenticacion();
  const {tema,modoOscuro}=useTheme();
  const {setPanelNav}=usePanelNav();
  const d=usePanelAlumno();
  const asignacion=useActividadesAsignadas();
  const tutorial = useTutorial('alumno');
  const pasosTutorial = [
    { titulo: 'Bienvenido a tu panel', texto: 'Aquí puedes consultar tu club, postulaciones y actividades.' },
    { titulo: 'Noticias y avisos', texto: 'Revisa aquí las novedades publicadas por tu club.' },
    { titulo: 'Horarios y actividades', texto: 'Consulta tus horarios y las actividades que tienes asignadas.' },
    { titulo: 'Postulaciones', texto: 'Da seguimiento a los estados de tus convocatorias.' },
  ];
  const elementosNav=useMemo(()=>{
    const opciones=d.club ? ELEMENTOS_NAV_ALUMNO : NAV_SIN_CLUB;
    return usuario?.id_rol===1 ? opciones : opciones.filter((item)=>item.key!=='mis-actividades');
  },[d.club,usuario?.id_rol]);
  const [vistaAlumno,setVistaAlumno]=useVistaPanel(elementosNav,d.club ? 'mi-club' : 'postulaciones');
  const [dismissMiembroBanner,setDismissMiembroBanner]=useState(()=>{
    try{return localStorage.getItem('dismiss_miembro_banner')==='true';}catch{return false;}
  });
  useEffect(()=>{
    if(esResponsableClub) abrirPanelResponsable(navigate,{replace:true});
    else if(esAdmin) navigate('/admin/panel',{replace:true});
    else if(esRectoria) navigate('/rectoria/panel',{replace:true});
    else if(esResponsableMural) navigate('/mural/panel',{replace:true});
  },[esResponsableClub,esAdmin,esRectoria,esResponsableMural,navigate]);
  useEffect(()=>{
    if(esResponsableClub || esAdmin || esRectoria || esResponsableMural) return;
    setPanelNav({itemsNav:elementosNav,onNavChange:setVistaAlumno});
    return ()=>setPanelNav({itemsNav:[],onNavChange:null});
  },[setPanelNav,elementosNav,setVistaAlumno,esResponsableClub,esAdmin,esRectoria,esResponsableMural]);
  useEffect(() => {
    try {
      if (localStorage.getItem('tutorial_alumno_pending') === 'true') {
        localStorage.removeItem('tutorial_alumno_pending');
        if (localStorage.getItem('tutorial_alumno_done') !== 'true') tutorial.iniciar();
      }
    } catch { /* La guía es opcional. */ }
  }, [tutorial.iniciar]);
  function descartarBanner(){
    setDismissMiembroBanner(true);
    try{localStorage.setItem('dismiss_miembro_banner','true');}catch{ /* Preferencia opcional. */ }
  }
  if(esResponsableClub || esAdmin || esRectoria || esResponsableMural || d.loading) return <Spinner className="py-32"/>;
  return <ErrorBoundary><RutaProtegida><NavegacionPanel elementosNav={elementosNav} vistaActiva={vistaAlumno} onVistaChange={setVistaAlumno}>
    <div className="mb-6 md:mb-8"><EncabezadoPagina titulo="Mi panel" subtitulo={'Bienvenido, '+(usuario?.nombre_completo || '')}/></div>

    {['mi-club','postulaciones'].includes(vistaAlumno) && <TarjetasMiActividad asignacion={asignacion}/>}
    {vistaAlumno==='mis-actividades' && <MisActividadesPanel/>}
    {vistaAlumno==='postulaciones' && <section className="space-y-5"><h2 className={'text-2xl font-bold '+tema.title}>Mis postulaciones</h2>
      {d.postulaciones.length ? <SeccionPostulaciones postulaciones={d.postulaciones} onPostulacionesChange={d.recargar}/> : <div className="rounded-2xl border border-slate-400/25 p-6 space-y-3"><p className={tema.subtitle}>No tienes una inscripción activa ni postulaciones a clubes.</p><Link to="/campus/campeche/portal" className="inline-block font-semibold text-amber-600 dark:text-amber-400 underline">Explorar clubes</Link></div>}
    </section>}
    {vistaAlumno==='mi-club' && d.club && <>
      {!dismissMiembroBanner && <div className="mb-8 relative"><button type="button" onClick={descartarBanner} title="No mostrar más" aria-label="No mostrar aviso de membresía" className="absolute top-3 right-3 p-1 rounded-full cursor-pointer z-10"><Icono nombre="close" className="h-4 w-4"/></button><Alerta tipo="success"><div className="flex items-center gap-3"><span className="text-2xl">🎉</span><div><h2 className={'text-lg font-black '+(modoOscuro ? 'text-emerald-300' : 'text-emerald-700')}>Miembro de {d.club.nombre_club}</h2><p className="text-sm">Eres miembro oficial de este club</p></div></div></Alerta></div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-8"><InformacionClub club={d.club}/><SeccionAvisos club={d.club} esResponsableClub={false}/></div><div className="space-y-8"><SeccionMiembros miembros={d.miembros} club={d.club}/></div></div>
    </>}
    {vistaAlumno==='horarios' && d.club && <HorariosClub club={d.club} modoOscuro={modoOscuro} esMiembro expandirHorarios/>}
    {tutorial.activo && <TutorialOverlay pasos={pasosTutorial} paso={tutorial.paso} onSiguiente={() => tutorial.siguiente(pasosTutorial.length)} onSaltar={tutorial.saltar} />}
  </NavegacionPanel></RutaProtegida></ErrorBoundary>;
}
