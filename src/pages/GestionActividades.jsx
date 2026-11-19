import { OperacionEdicionActividad } from '../components/actividades/OperacionEdicionActividad';
import { FormularioEdicionActividad } from '../components/actividades/WizardEdicionActividad';
import { DetalleRevisionActividad } from '../components/actividades/DetalleRevisionActividad';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { useActividadRecurso } from '../hooks/useActividadRecurso';
import { NavegacionActividades, EstadoActividad, FechaActividad } from '../components/actividades/ActividadUI';
import { FormularioActividad } from '../components/actividades/EditoresActividad';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';
import { GestionFotosClub } from '../components/actividades/GestionCatalogoExtra';
import { ROLES_CREAN_ACTIVIDADES } from '../../shared/actividades';

export function GestionActividades({onLoginClick,integrada=false,tipoFijo,soloDetalle=false}) {
  const {usuario,authReady}=useAutenticacion();
  const {datos,error,cargando,recargar}=useActividadRecurso(usuario ? '/gestion' : null,usuario?.id_usuario || usuario?.id);
  const {tema,cardCls,inputCls,labelCls}=useTheme();
  const [parametros]=useSearchParams();
  const [seleccion,setSeleccion]=useState(Number(parametros.get('registro')) || null);
  const [seleccionEdicion,setSeleccionEdicion]=useState(null);
  const [filtroTipo,setFiltroTipo]=useState('todos');
  const [filtroEstado,setFiltroEstado]=useState('todos');
  const [creando,setCreando]=useState(!soloDetalle && parametros.get('crear')==='1');
  const puedeCrearActividad=ROLES_CREAN_ACTIVIDADES.includes(usuario?.id_rol) && Boolean(datos?.puede_crear);
  const mostrarCreacion=creando && puedeCrearActividad;
  const [editor,setEditor]=useState(null);
  const [pendiente,setPendiente]=useState(false);
  const [errorOperacion,setErrorOperacion]=useState('');
  const tipoVisible=tipoFijo || filtroTipo;
  const visibles=(datos?.actividades || []).filter((item)=>(tipoVisible==='todos' || item.tipo===tipoVisible) && (filtroEstado==='todos' || (item.estado_propuesta || item.estado)===filtroEstado));
  const actividad=visibles.find((item)=>item.id_actividad===seleccion) || (!soloDetalle && visibles[0]);
  const ediciones=(datos?.ediciones || []).filter((item)=>item.id_actividad===actividad?.id_actividad);
  const edicion=ediciones.find((item)=>item.id_edicion===seleccionEdicion) || ediciones[0];
  const Contenedor=integrada ? 'section' : 'main';
  const Titulo=integrada ? 'h2' : 'h1';
  async function operar(trabajo) {
    if(pendiente) return;
    setPendiente(true);setErrorOperacion('');
    try{await trabajo();recargar();}catch(fallo){setErrorOperacion(fallo.mensajeServidor || fallo.message);}finally{setPendiente(false);}
  }
  function elegir(id){setSeleccion(id);setSeleccionEdicion(null);setEditor(null);setErrorOperacion('');}
  return <Contenedor className={integrada ? 'space-y-6 min-w-0' : 'max-w-7xl mx-auto px-6 py-10 space-y-6'}>
    {!integrada && <NavegacionActividades/>}
    {!editor && <header className="space-y-2"><Titulo className={'text-3xl font-black '+tema.title}>{soloDetalle ? 'Publicación del club' : usuario?.id_rol===4 ? 'Revisión de actividades' : tipoFijo==='actividad' ? 'Gestionar actividades' : 'Clubes y actividades'}</Titulo><p className={'text-sm '+tema.subtitle}>{soloDetalle ? 'Consulta su presentación, revisa los cambios y administra las fotografías.' : usuario?.id_rol===4 ? 'Abre una actividad, consulta la vista previa y revisa su información general o una edición concreta.' : 'Organiza la descripción general, prepara cada edición y consulta su publicación por separado.'}</p></header>}
    {!authReady || cargando ? <Spinner/> : !usuario ? <BotonAccion onClick={onLoginClick}>Iniciar sesión</BotonAccion> : error ? <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : <>
      {!editor && !mostrarCreacion && !soloDetalle && <div aria-label="Acciones y filtros del catálogo" className="grid gap-4 sm:flex sm:flex-wrap sm:items-end">{puedeCrearActividad && <BotonAccion className="h-11 w-full !rounded-lg sm:w-auto sm:min-w-44" onClick={()=>setCreando(true)}>{datos.puede_crear_club && tipoFijo!=='actividad' ? 'Crear club o actividad' : 'Nueva actividad'}</BotonAccion>}
        {!tipoFijo && <div className="flex min-w-0 flex-col gap-2 sm:w-72 lg:w-80"><label htmlFor="filtro-tipo-catalogo" className={labelCls+' !mb-0'}>Filtrar por tipo</label><select id="filtro-tipo-catalogo" aria-label="Filtrar por tipo" className={inputCls+' h-11'} value={filtroTipo} onChange={(evento)=>{setFiltroTipo(evento.target.value);elegir(null);}}><option value="todos">Clubes y actividades</option><option value="club">Clubes</option><option value="actividad">Actividades</option></select></div>}
        <div className="flex min-w-0 flex-col gap-2 sm:w-72 lg:w-80"><label htmlFor="filtro-publicacion-catalogo" className={labelCls+' !mb-0'}>Filtrar por publicación</label><select id="filtro-publicacion-catalogo" aria-label="Filtrar por publicación" className={inputCls+' h-11'} value={filtroEstado} onChange={(evento)=>{setFiltroEstado(evento.target.value);elegir(null);}}><option value="todos">Todos los estados</option><option value="borrador">Borrador</option><option value="pendiente">En revisión</option><option value="publicada">Publicada</option><option value="rechazada">Con observaciones</option><option value="archivada">Archivada</option></select></div>
      </div>}
      {errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
      {mostrarCreacion ? <section className={'max-w-3xl rounded-2xl border p-6 space-y-5 '+cardCls}><h3 className="text-xl font-bold">Información general para Oferta</h3><p className="text-sm">Primero crea la descripción. Después podrás agregar ediciones con sus fechas e inscripciones.</p><FormularioActividad tipoInicial={datos.puede_crear_club && tipoFijo!=='actividad' && parametros.get('tipo')==='club' ? 'club' : 'actividad'} puedeCrearClub={datos.puede_crear_club && tipoFijo!=='actividad'} onCancelar={()=>setCreando(false)} onGuardado={(id)=>{elegir(id);setCreando(false);setFiltroTipo('todos');setFiltroEstado('todos');recargar();}}/></section> : !actividad ? <p className={tema.subtitle}>No hay registros asignados que coincidan con los filtros.</p> : <div className={editor || soloDetalle ? 'max-w-3xl mx-auto w-full' : 'grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]'}>
        {!editor && !soloDetalle && <aside aria-label="Seleccionar actividad" className="flex min-w-0 gap-3 overflow-x-auto pb-2 xl:block xl:space-y-3">{visibles.map((item)=><button type="button" key={item.id_actividad} aria-pressed={item.id_actividad===actividad.id_actividad} onClick={()=>elegir(item.id_actividad)} className={'block w-52 shrink-0 rounded-xl border p-4 text-left xl:w-full '+(item.id_actividad===actividad.id_actividad ? 'border-amber-400 bg-amber-400/10' : cardCls)}><span className="block text-xs uppercase mb-1">{item.tipo==='club' ? 'Club' : 'Actividad'}</span><span className="block font-bold mb-2">{item.nombre}</span><EstadoActividad estado={item.estado_propuesta || item.estado}/></button>)}</aside>}
        <div className="min-w-0 space-y-6">
          {editor ? <section className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}><h3 className="text-2xl font-bold">{editor==='nueva' ? 'Nueva edición' : 'Editar edición'}</h3><FormularioEdicionActividad key={actividad.id_actividad+':'+(editor==='nueva' ? 'nueva' : edicion.id_edicion)} actividad={actividad} edicion={editor==='nueva' ? null : edicion} onCancelar={()=>setEditor(null)} onGuardado={(id)=>{setSeleccionEdicion(id);setEditor(null);recargar();}}/></section> : <>
            <DetalleRevisionActividad key={actividad.id_actividad+':'+actividad.actualizado_en} actividad={actividad} puedeAprobar={datos.puede_aprobar} puedeAsignar={datos.puede_asignar && (actividad.tipo!=='club' || datos.puede_crear_club)} pendiente={pendiente} operar={operar} onActualizar={recargar}/>
            {actividad.tipo==='club' ? <section className={'rounded-2xl border p-5 sm:p-7 '+cardCls}><GestionFotosClub key={actividad.id_club} club={actividad} puedeAprobar={datos.puede_aprobar}/></section> : <section aria-label="Ediciones de la actividad" className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-bold">Ediciones</h3><BotonAccion variant="outline" onClick={()=>setEditor('nueva')}>Agregar edición</BotonAccion></div><p className={'text-sm '+tema.subtitle}>Cada edición tiene su propio formulario, fechas, participantes y aprobación.</p>
              <div className="flex flex-wrap gap-3">{ediciones.map((item)=><button type="button" key={item.id_edicion} onClick={()=>setSeleccionEdicion(item.id_edicion)} aria-pressed={edicion?.id_edicion===item.id_edicion} className={'rounded-xl border p-3 text-left space-y-2 '+(edicion?.id_edicion===item.id_edicion ? 'border-amber-400 bg-amber-400/10' : 'border-slate-400/25')}><span className="block font-bold">{item.nombre}</span><span className="block text-xs"><FechaActividad fecha={item.fecha_inicio}/></span><EstadoActividad estado={item.estado_propuesta || item.estado}/></button>)}</div>
              {edicion ? <><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/25 pt-5"><h4 className="text-xl font-bold">{edicion.nombre}</h4><BotonAccion variant="outline" disabled={edicion.estado==='pendiente' || edicion.estado_propuesta==='pendiente' || edicion.estado==='archivada'} onClick={()=>setEditor('editar')}>Editar edición y formulario</BotonAccion></div><OperacionEdicionActividad key={edicion.id_edicion+':'+edicion.actualizado_en} actividad={actividad} edicion={edicion} puedeAprobar={datos.puede_aprobar} puedeAprobarEdicion={datos.puede_aprobar_ediciones} operarRevision={operar} pendienteRevision={pendiente}/></> : <p className={tema.subtitle}>Agrega una edición para preparar fechas, formulario y aportaciones.</p>}
            </section>}
          </>}
        </div>
      </div>}
    </>}
  </Contenedor>;
}
