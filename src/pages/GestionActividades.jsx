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
import { filtrarCatalogoGestion, seleccionarEdicionGestion, tieneRevisionPendiente } from '../utils/catalogoGestion';

export function GestionActividades({onLoginClick,integrada=false,tipoFijo,soloDetalle=false,estadoInicial='todos'}) {
  const {usuario,authReady}=useAutenticacion();
  const {datos,error,cargando,recargar}=useActividadRecurso(usuario ? '/gestion' : null,usuario?.id_usuario || usuario?.id,true);
  const {tema,cardCls,inputCls}=useTheme();
  const [parametros]=useSearchParams();
  const [seleccion,setSeleccion]=useState(Number(parametros.get('registro')) || null);
  const [seleccionEdicion,setSeleccionEdicion]=useState(null);
  const [filtroTipo,setFiltroTipo]=useState('todos');
  const [filtroEstado,setFiltroEstado]=useState(estadoInicial);
  const [creando,setCreando]=useState(!soloDetalle && parametros.get('crear')==='1');
  const puedeCrearActividad=ROLES_CREAN_ACTIVIDADES.includes(usuario?.id_rol) && Boolean(datos?.puede_crear);
  const mostrarCreacion=creando && puedeCrearActividad;
  const [editor,setEditor]=useState(null);
  const [pendiente,setPendiente]=useState(false);
  const [errorOperacion,setErrorOperacion]=useState('');
  const [mensaje,setMensaje]=useState('');
  const tipoVisible=tipoFijo || filtroTipo;
  const visibles=filtrarCatalogoGestion(datos?.actividades || [],datos?.ediciones || [],tipoVisible,filtroEstado);
  const actividad=visibles.find((item)=>item.id_actividad===seleccion) || (!soloDetalle && visibles[0]);
  const ediciones=(datos?.ediciones || []).filter((item)=>item.id_actividad===actividad?.id_actividad);
  const edicion=seleccionarEdicionGestion(ediciones,seleccionEdicion,filtroEstado==='pendiente');
  const Contenedor=integrada ? 'section' : 'main';
  const Titulo=integrada ? 'h2' : 'h1';
  async function operar(trabajo,confirmacion='Cambios guardados.') {
    if(pendiente) return;
    setPendiente(true);setErrorOperacion('');setMensaje('');
    try{await trabajo();setMensaje(confirmacion);recargar();}catch(fallo){setErrorOperacion(fallo.mensajeServidor || fallo.message);}finally{setPendiente(false);}
  }
  function elegir(id){setSeleccion(id);setSeleccionEdicion(null);setEditor(null);setErrorOperacion('');setMensaje('');}
  function actualizar(confirmacion='Cambios guardados.'){setMensaje(confirmacion);recargar();}
  return <Contenedor className={integrada ? 'space-y-6 min-w-0' : 'max-w-7xl mx-auto px-6 py-10 space-y-6'}>
    {!integrada && <NavegacionActividades/>}
    {!editor && <header className="space-y-2"><Titulo className={'text-3xl font-black '+tema.title}>{soloDetalle ? 'Publicación del club' : usuario?.id_rol===4 ? 'Revisión de actividades' : tipoFijo==='actividad' ? 'Gestionar actividades' : 'Clubes y actividades'}</Titulo>{soloDetalle && <p className={'text-sm '+tema.subtitle}>Consulta su presentación y administra las fotografías.</p>}</header>}
    {mensaje && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
    {!authReady || cargando ? <Spinner/> : !usuario ? <BotonAccion onClick={onLoginClick}>Iniciar sesión</BotonAccion> : error ? <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : <>
      {!editor && !mostrarCreacion && !soloDetalle && <div aria-label="Acciones y filtros del catálogo" className="flex flex-wrap items-center gap-3">
        {!tipoFijo && <select id="filtro-tipo-catalogo" aria-label="Filtrar por tipo" className={inputCls+' h-11 w-full sm:w-52'} value={filtroTipo} onChange={(evento)=>{setFiltroTipo(evento.target.value);elegir(null);}}><option value="todos">Todos los tipos</option><option value="club">Clubes</option><option value="actividad">Actividades</option></select>}
        <select id="filtro-publicacion-catalogo" aria-label="Filtrar por publicación" className={inputCls+' h-11 w-full sm:w-52'} value={filtroEstado} onChange={(evento)=>{setFiltroEstado(evento.target.value);elegir(null);}}><option value="todos">Todos los estados</option><option value="borrador">Borrador</option><option value="pendiente">En revisión</option><option value="publicada">Publicada</option><option value="rechazada">Con observaciones</option><option value="archivada">Archivada</option></select>
        {puedeCrearActividad && <BotonAccion className="h-11 w-full !rounded-lg sm:w-auto sm:min-w-44" onClick={()=>setCreando(true)}>{datos.puede_crear_club && tipoFijo!=='actividad' ? 'Crear club o actividad' : 'Nueva actividad'}</BotonAccion>}
      </div>}
      {errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
      {mostrarCreacion ? <section className={'max-w-3xl rounded-2xl border p-6 space-y-5 '+cardCls}><h3 className="text-xl font-bold">Información general</h3><p className={'text-sm '+tema.subtitle}>Describe la actividad para mostrarla en Oferta.</p><FormularioActividad tipoInicial={datos.puede_crear_club && tipoFijo!=='actividad' && parametros.get('tipo')==='club' ? 'club' : 'actividad'} puedeCrearClub={datos.puede_crear_club && tipoFijo!=='actividad'} puedePublicar={datos.puede_publicar_actividades} onCancelar={()=>setCreando(false)} onGuardado={(id,confirmacion)=>{elegir(id);setCreando(false);setFiltroTipo('todos');setFiltroEstado('todos');actualizar(confirmacion);}}/></section> : !actividad ? <p className={tema.subtitle}>{filtroEstado==='pendiente' ? 'No hay publicaciones ni ediciones pendientes de revisión.' : 'No hay registros que coincidan con los filtros.'}</p> : <div className={editor || soloDetalle ? 'max-w-3xl mx-auto w-full' : 'grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]'}>
        {!editor && !soloDetalle && <aside aria-label="Seleccionar actividad" className="flex min-w-0 gap-3 overflow-x-auto pb-2 xl:block xl:space-y-3">{visibles.map((item)=>{
          const pendientes=(datos.ediciones || []).filter((candidata)=>candidata.id_actividad===item.id_actividad && tieneRevisionPendiente(candidata)).length;
          return <button type="button" key={item.id_actividad} aria-pressed={item.id_actividad===actividad.id_actividad} onClick={()=>elegir(item.id_actividad)} className={'block w-52 shrink-0 rounded-xl border p-4 text-left xl:w-full '+(item.id_actividad===actividad.id_actividad ? 'border-amber-400 bg-amber-400/10' : cardCls)}><span className="block text-xs uppercase mb-1">{item.tipo==='club' ? 'Club' : 'Actividad'}</span><span className="block font-bold mb-2">{item.nombre}</span><EstadoActividad estado={item.estado_propuesta || item.estado}/>{pendientes>0 && <span className="mt-2 block text-xs font-semibold text-amber-700 dark:text-amber-300">{pendientes} {pendientes===1 ? 'edición por revisar' : 'ediciones por revisar'}</span>}</button>;
        })}</aside>}
        <div className="min-w-0 space-y-6">
          {editor ? <section className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}><h3 className="text-2xl font-bold">{editor==='nueva' ? 'Nueva edición' : 'Editar edición'}</h3><FormularioEdicionActividad key={actividad.id_actividad+':'+(editor==='nueva' ? 'nueva' : edicion.id_edicion)} actividad={actividad} edicion={editor==='nueva' ? null : edicion} puedePublicar={datos.puede_publicar_ediciones} onCancelar={()=>setEditor(null)} onGuardado={(id,confirmacion)=>{setSeleccionEdicion(id);setEditor(null);setFiltroEstado('todos');actualizar(confirmacion);}}/></section> : <>
             <DetalleRevisionActividad key={actividad.id_actividad} actividad={actividad} puedeAprobar={datos.puede_aprobar} puedePublicar={datos.puede_publicar_actividades && actividad.tipo==='actividad'} puedeAsignar={datos.puede_asignar && (actividad.tipo!=='club' || datos.puede_crear_club)} puedeBorrar={[3,4,7].includes(usuario?.id_rol)} pendiente={pendiente} operar={operar} onActualizar={actualizar}/>
            {actividad.tipo==='club' ? <section className={'rounded-2xl border p-5 sm:p-7 '+cardCls}><GestionFotosClub key={actividad.id_club} club={actividad} puedeAprobar={datos.puede_aprobar}/></section> : <section aria-label="Ediciones de la actividad" className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-bold">Ediciones</h3><BotonAccion variant="outline" disabled={actividad.estado==='archivada'} onClick={()=>{setMensaje('');setEditor('nueva');}}>Agregar edición</BotonAccion></div><p className={'text-sm '+tema.subtitle}>Cada edición tiene sus propias fechas e inscripciones.</p>
              <div className="flex flex-wrap gap-3">{ediciones.map((item)=><button type="button" key={item.id_edicion} onClick={()=>setSeleccionEdicion(item.id_edicion)} aria-pressed={edicion?.id_edicion===item.id_edicion} className={'rounded-xl border p-3 text-left space-y-2 '+(edicion?.id_edicion===item.id_edicion ? 'border-amber-400 bg-amber-400/10' : 'border-slate-400/25')}><span className="block font-bold">{item.nombre}</span><span className="block text-xs"><FechaActividad fecha={item.fecha_inicio}/></span><EstadoActividad estado={item.estado_propuesta || item.estado}/></button>)}</div>
               {edicion ? <><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/25 pt-5"><h4 className="text-xl font-bold">{edicion.nombre}</h4><BotonAccion variant="outline" disabled={edicion.estado==='archivada' || (!datos.puede_publicar_ediciones && (edicion.estado==='pendiente' || edicion.estado_propuesta==='pendiente'))} onClick={()=>{setMensaje('');setEditor('editar');}}>Editar edición</BotonAccion></div><OperacionEdicionActividad key={edicion.id_edicion+':'+edicion.actualizado_en} actividad={actividad} edicion={edicion} puedeAprobar={datos.puede_aprobar} puedeAprobarEdicion={datos.puede_aprobar_ediciones} puedePublicar={datos.puede_publicar_ediciones} puedeBorrar={[3,4,7].includes(usuario?.id_rol)} operarRevision={operar} pendienteRevision={pendiente}/></> : <p className={tema.subtitle}>Agrega la primera edición.</p>}
            </section>}
          </>}
        </div>
      </div>}
    </>}
  </Contenedor>;
}
