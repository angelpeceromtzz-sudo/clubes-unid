import { FormularioEdicionActividad } from '../components/actividades/WizardEdicionActividad';
import { VistaPreviaActividad } from '../components/actividades/VistaPreviaActividad';
import { DetalleRevisionActividad } from '../components/actividades/DetalleRevisionActividad';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { useActividadRecurso } from '../hooks/useActividadRecurso';
import { useLicenciaturas } from '../hooks/useLicenciaturas';
import { actividadService } from '../services/actividad.service';
import { NavegacionActividades, EstadoActividad, FechaActividad } from '../components/actividades/ActividadUI';
import { FormularioActividad, AccionesRevisionActividad, FormularioOpcionAporte } from '../components/actividades/EditoresActividad';
import { BotonAccion } from '../components/ui/BotonAccion';
import { Spinner } from '../components/ui/Spinner';
import { GestorFotosActividad } from '../components/actividades/GestorFotosActividad';
import { GestionFotosClub, TrasladoActividad } from '../components/actividades/GestionCatalogoExtra';

function OperacionEdicion({ actividad, edicion, puedeAprobar, operarRevision, pendienteRevision }) {
  const { usuario } = useAutenticacion();
  const { datos, cargando, error, recargar } = useActividadRecurso('/gestion/ediciones/' + edicion.id_edicion, usuario.id_usuario || usuario.id);
  const { tema, inputCls, labelCls } = useTheme();
  const { licenciaturas } = useLicenciaturas();
  const [busqueda, setBusqueda] = useState('');
  const [opcionEditada, setOpcionEditada] = useState(null);
  const [verPublicada,setVerPublicada]=useState(false);
  const [secciones,setSecciones]=useState({inscripciones:false,aportes:false,participantes:false,fotos:false});
  const alternar=(nombre)=>(evento)=>{const abierta=evento.currentTarget.open;setSecciones((actual)=>actual[nombre]===abierta ? actual : {...actual,[nombre]:abierta});};
  const [errorOperacion, setErrorOperacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [pendiente, setPendiente] = useState(false);
  async function operar(trabajo) {
    if (pendiente) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try { await trabajo(); setMensaje('Cambios guardados.'); recargar(); }
    catch (fallo) { setErrorOperacion(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }
  if (cargando) return <Spinner />;
  if (error) return <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  const vigentes = datos.registros.filter((registro) => registro.estado === 'confirmado');
  const tallas = vigentes.reduce((resultado, registro) => { if (registro.respuestas.talla) resultado[registro.respuestas.talla] = (resultado[registro.respuestas.talla] || 0) + 1; return resultado; }, {});
  const registros = datos.registros.filter((registro) => (registro.nombre_completo + ' ' + registro.matricula).toLowerCase().includes(busqueda.toLowerCase()));
  const editarCatalogo = (datos.edicion.estado !== 'publicada' || puedeAprobar) && datos.edicion.estado !== 'pendiente' && datos.edicion.estado_propuesta !== 'pendiente';
  const version=verPublicada ? datos.edicion : {...datos.edicion,...datos.edicion.propuesta};
  const contexto=actividad;
  return <div className="space-y-8">
    <section className="space-y-4"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold">Vista previa de esta edición</h3>{datos.edicion.propuesta && <BotonAccion variant="outline" size="sm" onClick={()=>setVerPublicada((actual)=>!actual)}>{verPublicada ? 'Ver propuesta' : 'Comparar con la versión publicada'}</BotonAccion>}</div><p className="text-sm">{verPublicada ? 'Estás consultando la versión publicada.' : 'Revisa lo que verán los alumnos al abrir esta edición.'}</p><VistaPreviaActividad actividad={contexto} edicion={version} catalogo={datos.catalogo}/></section>
    <section aria-label="Revisión de la edición" className="space-y-3 rounded-xl bg-amber-400/10 p-4"><h3 className="font-bold">Publicación de la edición: {edicion.nombre}</h3><p className="text-sm">Rectoría revisa las fechas, el formulario y las aportaciones de esta edición.</p><fieldset disabled={pendienteRevision}><AccionesRevisionActividad tipo="ediciones" entidad={edicion} puedeAprobar={puedeAprobar} operar={operarRevision} bloqueoPublicacion={actividad.estado!=='publicada' ? 'Aprueba primero la información general de la actividad.' : verPublicada && datos.edicion.propuesta ? 'Abre la propuesta para revisarla antes de aprobar.' : ''}/></fieldset></section>
    {mensaje && <p role="status" className="text-emerald-700 dark:text-emerald-300">{mensaje}</p>}{errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
    <fieldset disabled={pendiente} className="space-y-8">
      {datos.edicion.requiere_registro && <details open={secciones.inscripciones} onToggle={alternar("inscripciones")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Control de inscripciones</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Inscripciones</h3><p className={tema.subtitle}>El periodo aprobado determina las fechas disponibles. Este control permite pausar o reabrir dentro de ese periodo.</p><BotonAccion variant="outline" onClick={() => operar(() => actividadService.abrirInscripciones(edicion.id_edicion, !datos.edicion.inscripciones_habilitadas))}>{datos.edicion.inscripciones_habilitadas ? 'Pausar inscripciones' : 'Habilitar inscripciones'}</BotonAccion></div></details>}
      <details open={secciones.aportes} onToggle={alternar("aportes")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Aportaciones</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Catálogo de aportaciones</h3><p className={'text-sm ' + tema.subtitle}>Los cambios del catálogo conservan las condiciones de los compromisos existentes. El catálogo publicado lo actualiza Rectoría.</p>
        {datos.catalogo.map((opcion) => <div className="space-y-2 border-b border-slate-500/20 pb-4" key={opcion.id_opcion}><p className="font-semibold">{opcion.nombre} · mínimo {Number(opcion.cantidad_minima)} {opcion.unidad} · {opcion.activa ? 'Disponible' : 'Retirada'}</p><p className={'text-sm ' + tema.subtitle}>{opcion.descripcion}</p>{editarCatalogo && <div className="flex flex-wrap gap-3"><BotonAccion variant="outline" size="sm" onClick={() => setOpcionEditada(opcion)}>Editar opción</BotonAccion><BotonAccion variant="outline" size="sm" onClick={() => operar(() => actividadService.guardarOpcion(edicion.id_edicion, opcion.id_opcion, { activa: !opcion.activa }))}>{opcion.activa ? 'Retirar del catálogo' : 'Volver a ofrecer'}</BotonAccion></div>}</div>)}
        {editarCatalogo && <FormularioOpcionAporte key={opcionEditada?.id_opcion || 'nueva'} idEdicion={edicion.id_edicion} opcion={opcionEditada} onCancelar={opcionEditada ? () => setOpcionEditada(null) : undefined} onGuardado={() => { setOpcionEditada(null); recargar(); }} />}
      </div></details>
      {datos.edicion.requiere_registro && <details open={secciones.participantes} onToggle={alternar("participantes")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Participantes</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Participantes</h3><p>{vigentes.length} inscripciones confirmadas · {datos.registros.filter((registro) => registro.estado === 'pendiente_completar').length} pendientes de completar</p><div className="flex flex-wrap gap-3">{Object.entries(tallas).map(([talla, total]) => <span key={talla} className="text-sm font-semibold">Talla {talla}: {total}</span>)}</div>
        <label className={labelCls}>Buscar participante<input className={inputCls} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre o matrícula" /></label>
        {!registros.length && <p className={tema.subtitle}>No hay participantes para mostrar.</p>}
        <div className="space-y-4">{registros.map((registro) => <article key={registro.id_registro} className="space-y-3 border-b border-slate-500/20 pb-5"><h4 className="font-bold">{registro.nombre_completo} · {registro.matricula}</h4><EstadoActividad estado={registro.estado} />
          <dl className="grid gap-2 sm:grid-cols-2">{registro.formulario_snapshot.map((campo) => <div key={campo.clave}><dt className={'text-xs ' + tema.subtitle}>{campo.etiqueta}</dt><dd className="text-sm">{campo.tipo === 'licenciatura' ? licenciaturas.find((item) => item.id_licenciatura === Number(registro.respuestas[campo.clave]))?.nombre || 'Sin especificar' : registro.respuestas[campo.clave] ?? 'Sin especificar'}</dd></div>)}</dl>
          {registro.aportaciones.map((aporte) => <div key={aporte.id_aportacion} className="flex flex-wrap items-center gap-3 text-sm"><span>{aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</span>{aporte.estado === 'comprometida' && registro.estado === 'confirmado' && <BotonAccion size="sm" variant="outline" onClick={() => operar(() => actividadService.recibirAportacion(aporte.id_aportacion))}>Confirmar recepción</BotonAccion>}</div>)}
        </article>)}</div>
      </div></details>}
      <details open={secciones.fotos} onToggle={alternar("fotos")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Fotografías · {datos.fotos.filter((foto)=>foto.estado==='pendiente').length} por revisar</summary><div className="pt-5"><GestorFotosActividad edicion={datos.edicion} fotos={datos.fotos} puedeAprobar={puedeAprobar} onActualizar={(texto) => { setMensaje(texto); recargar(); }} /></div></details>
      {[3,7].includes(usuario.id_rol) && ['trineo','misiones'].includes(datos.edicion.plantilla) && <TrasladoActividad edicion={datos.edicion} onActualizar={recargar}/>}
    </fieldset>
  </div>;
}

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
      {!editor && !creando && !soloDetalle && <div aria-label="Acciones y filtros del catálogo" className="grid gap-4 sm:flex sm:flex-wrap sm:items-end">{datos.puede_crear && <BotonAccion className="h-11 w-full !rounded-lg sm:w-auto sm:min-w-44" onClick={()=>setCreando(true)}>{datos.puede_crear_club && tipoFijo!=='actividad' ? 'Crear club o actividad' : 'Nueva actividad'}</BotonAccion>}
        {!tipoFijo && <div className="flex min-w-0 flex-col gap-2 sm:w-72 lg:w-80"><label htmlFor="filtro-tipo-catalogo" className={labelCls+' !mb-0'}>Filtrar por tipo</label><select id="filtro-tipo-catalogo" aria-label="Filtrar por tipo" className={inputCls+' h-11'} value={filtroTipo} onChange={(evento)=>{setFiltroTipo(evento.target.value);elegir(null);}}><option value="todos">Clubes y actividades</option><option value="club">Clubes</option><option value="actividad">Actividades</option></select></div>}
        <div className="flex min-w-0 flex-col gap-2 sm:w-72 lg:w-80"><label htmlFor="filtro-publicacion-catalogo" className={labelCls+' !mb-0'}>Filtrar por publicación</label><select id="filtro-publicacion-catalogo" aria-label="Filtrar por publicación" className={inputCls+' h-11'} value={filtroEstado} onChange={(evento)=>{setFiltroEstado(evento.target.value);elegir(null);}}><option value="todos">Todos los estados</option><option value="borrador">Borrador</option><option value="pendiente">En revisión</option><option value="publicada">Publicada</option><option value="rechazada">Con observaciones</option><option value="archivada">Archivada</option></select></div>
      </div>}
      {errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
      {creando ? <section className={'max-w-3xl rounded-2xl border p-6 space-y-5 '+cardCls}><h3 className="text-xl font-bold">Información general para Oferta</h3><p className="text-sm">Primero crea la descripción. Después podrás agregar ediciones con sus fechas e inscripciones.</p><FormularioActividad tipoInicial={datos.puede_crear_club && tipoFijo!=='actividad' && parametros.get('tipo')==='club' ? 'club' : 'actividad'} puedeCrearClub={datos.puede_crear_club && tipoFijo!=='actividad'} onCancelar={()=>setCreando(false)} onGuardado={(id)=>{elegir(id);setCreando(false);setFiltroTipo('todos');setFiltroEstado('todos');recargar();}}/></section> : !actividad ? <p className={tema.subtitle}>No hay registros asignados que coincidan con los filtros.</p> : <div className={editor || soloDetalle ? 'max-w-3xl mx-auto w-full' : 'grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]'}>
        {!editor && !soloDetalle && <aside aria-label="Seleccionar actividad" className="flex min-w-0 gap-3 overflow-x-auto pb-2 xl:block xl:space-y-3">{visibles.map((item)=><button type="button" key={item.id_actividad} aria-pressed={item.id_actividad===actividad.id_actividad} onClick={()=>elegir(item.id_actividad)} className={'block w-52 shrink-0 rounded-xl border p-4 text-left xl:w-full '+(item.id_actividad===actividad.id_actividad ? 'border-amber-400 bg-amber-400/10' : cardCls)}><span className="block text-xs uppercase mb-1">{item.tipo==='club' ? 'Club' : 'Actividad'}</span><span className="block font-bold mb-2">{item.nombre}</span><EstadoActividad estado={item.estado_propuesta || item.estado}/></button>)}</aside>}
        <div className="min-w-0 space-y-6">
          {editor ? <section className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}><h3 className="text-2xl font-bold">{editor==='nueva' ? 'Nueva edición' : 'Editar edición'}</h3><FormularioEdicionActividad key={actividad.id_actividad+':'+(editor==='nueva' ? 'nueva' : edicion.id_edicion)} actividad={actividad} edicion={editor==='nueva' ? null : edicion} onCancelar={()=>setEditor(null)} onGuardado={(id)=>{setSeleccionEdicion(id);setEditor(null);recargar();}}/></section> : <>
            <DetalleRevisionActividad key={actividad.id_actividad+':'+actividad.actualizado_en} actividad={actividad} puedeAprobar={datos.puede_aprobar} puedeAsignar={datos.puede_asignar && (actividad.tipo!=='club' || datos.puede_crear_club)} pendiente={pendiente} operar={operar} onActualizar={recargar}/>
            {actividad.tipo==='club' ? <section className={'rounded-2xl border p-5 sm:p-7 '+cardCls}><GestionFotosClub key={actividad.id_club} club={actividad} puedeAprobar={datos.puede_aprobar}/></section> : <section aria-label="Ediciones de la actividad" className={'rounded-2xl border p-5 sm:p-7 space-y-5 '+cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-bold">Ediciones</h3><BotonAccion variant="outline" onClick={()=>setEditor('nueva')}>Agregar edición</BotonAccion></div><p className={'text-sm '+tema.subtitle}>Cada edición tiene su propio formulario, fechas, participantes y aprobación.</p>
              <div className="flex flex-wrap gap-3">{ediciones.map((item)=><button type="button" key={item.id_edicion} onClick={()=>setSeleccionEdicion(item.id_edicion)} aria-pressed={edicion?.id_edicion===item.id_edicion} className={'rounded-xl border p-3 text-left space-y-2 '+(edicion?.id_edicion===item.id_edicion ? 'border-amber-400 bg-amber-400/10' : 'border-slate-400/25')}><span className="block font-bold">{item.nombre}</span><span className="block text-xs"><FechaActividad fecha={item.fecha_inicio}/></span><EstadoActividad estado={item.estado_propuesta || item.estado}/></button>)}</div>
              {edicion ? <><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-400/25 pt-5"><h4 className="text-xl font-bold">{edicion.nombre}</h4><BotonAccion variant="outline" disabled={edicion.estado==='pendiente' || edicion.estado_propuesta==='pendiente' || edicion.estado==='archivada'} onClick={()=>setEditor('editar')}>Editar edición y formulario</BotonAccion></div><OperacionEdicion key={edicion.id_edicion+':'+edicion.actualizado_en} actividad={actividad} edicion={edicion} puedeAprobar={datos.puede_aprobar} operarRevision={operar} pendienteRevision={pendiente}/></> : <p className={tema.subtitle}>Agrega una edición para preparar fechas, formulario y aportaciones.</p>}
            </section>}
          </>}
        </div>
      </div>}
    </>}
  </Contenedor>;
}
