import {useState} from 'react';
import {useAutenticacion} from '../../contexts/AuthContext';
import {useTheme} from '../../contexts/ThemeContext';
import {useActividadRecurso} from '../../hooks/useActividadRecurso';
import {useLicenciaturas} from '../../hooks/useLicenciaturas';
import {actividadService} from '../../services/actividad.service';
import {VistaPreviaActividad} from './VistaPreviaActividad';
import {EstadoActividad} from './ActividadUI';
import {AccionesRevisionActividad,FormularioOpcionAporte} from './EditoresActividad';
import {GestorFotosActividad} from './GestorFotosActividad';
import {TrasladoActividad} from './GestionCatalogoExtra';
import {BotonAccion} from '../ui/BotonAccion';
import {Spinner} from '../ui/Spinner';

export function OperacionEdicionActividad({ actividad, edicion, puedeAprobar, operarRevision, pendienteRevision, seccion = 'todo' }) {
  const { usuario } = useAutenticacion();
  const { datos, cargando, error, recargar } = useActividadRecurso('/gestion/ediciones/' + edicion.id_edicion, usuario.id_usuario || usuario.id);
  const { tema, inputCls, labelCls } = useTheme();
  const { licenciaturas } = useLicenciaturas();
  const [busqueda, setBusqueda] = useState('');
  const [opcionEditada, setOpcionEditada] = useState(null);
  const [verPublicada,setVerPublicada]=useState(false);
  const [secciones,setSecciones]=useState({inscripciones:seccion==='participantes',aportes:seccion==='aportaciones',participantes:seccion==='participantes',fotos:seccion==='fotografias'});
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
  const visible=(nombre)=>seccion==='todo' || seccion===nombre;
  if (cargando) return <Spinner />;
  if (error) return <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  const vigentes = datos.registros.filter((registro) => registro.estado === 'confirmado');
  const tallas = vigentes.reduce((resultado, registro) => { if (registro.respuestas.talla) resultado[registro.respuestas.talla] = (resultado[registro.respuestas.talla] || 0) + 1; return resultado; }, {});
  const registros = datos.registros.filter((registro) => (registro.nombre_completo + ' ' + registro.matricula).toLowerCase().includes(busqueda.toLowerCase()));
  const editarCatalogo = (datos.edicion.estado !== 'publicada' || puedeAprobar) && datos.edicion.estado !== 'pendiente' && datos.edicion.estado_propuesta !== 'pendiente';
  const version=verPublicada ? datos.edicion : {...datos.edicion,...datos.edicion.propuesta};
  const contexto=actividad;
  return <div className="space-y-8">
    {visible('ediciones') && <section className="space-y-4"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold">Vista previa de esta edición</h3>{datos.edicion.propuesta && <BotonAccion variant="outline" size="sm" onClick={()=>setVerPublicada((actual)=>!actual)}>{verPublicada ? 'Ver propuesta' : 'Comparar con la versión publicada'}</BotonAccion>}</div><p className="text-sm">{verPublicada ? 'Estás consultando la versión publicada.' : 'Revisa lo que verán los alumnos al abrir esta edición.'}</p><VistaPreviaActividad actividad={contexto} edicion={version} catalogo={datos.catalogo}/></section>}
    {visible('ediciones') && <section aria-label="Revisión de la edición" className="space-y-3 rounded-xl bg-amber-400/10 p-4"><h3 className="font-bold">Publicación de la edición: {edicion.nombre}</h3><p className="text-sm">Rectoría revisa las fechas, el formulario y las aportaciones de esta edición.</p><fieldset disabled={pendienteRevision}><AccionesRevisionActividad tipo="ediciones" entidad={edicion} puedeAprobar={puedeAprobar} operar={operarRevision} bloqueoPublicacion={actividad.estado!=='publicada' ? 'Aprueba primero la información general de la actividad.' : verPublicada && datos.edicion.propuesta ? 'Abre la propuesta para revisarla antes de aprobar.' : ''}/></fieldset></section>}
    {mensaje && <p role="status" className="text-emerald-700 dark:text-emerald-300">{mensaje}</p>}{errorOperacion && <p role="alert" className="text-red-600 dark:text-red-400">{errorOperacion}</p>}
    <fieldset disabled={pendiente} className="space-y-8">
      {visible('participantes') && datos.edicion.requiere_registro && <details open={secciones.inscripciones} onToggle={alternar("inscripciones")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Control de inscripciones</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Inscripciones</h3><p className={tema.subtitle}>El periodo aprobado determina las fechas disponibles. Este control permite pausar o reabrir dentro de ese periodo.</p><BotonAccion variant="outline" onClick={() => operar(() => actividadService.abrirInscripciones(edicion.id_edicion, !datos.edicion.inscripciones_habilitadas))}>{datos.edicion.inscripciones_habilitadas ? 'Pausar inscripciones' : 'Habilitar inscripciones'}</BotonAccion></div></details>}
      {visible('aportaciones') && <details open={secciones.aportes} onToggle={alternar("aportes")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Aportaciones</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Catálogo de aportaciones</h3><p className={'text-sm ' + tema.subtitle}>Los cambios del catálogo conservan las condiciones de los compromisos existentes. El catálogo publicado lo actualiza Rectoría.</p>
        {datos.catalogo.map((opcion) => <div className="space-y-2 border-b border-slate-500/20 pb-4" key={opcion.id_opcion}><p className="font-semibold">{opcion.nombre} · mínimo {Number(opcion.cantidad_minima)} {opcion.unidad} · {opcion.activa ? 'Disponible' : 'Retirada'}</p><p className={'text-sm ' + tema.subtitle}>{opcion.descripcion}</p>{editarCatalogo && <div className="flex flex-wrap gap-3"><BotonAccion variant="outline" size="sm" onClick={() => setOpcionEditada(opcion)}>Editar opción</BotonAccion><BotonAccion variant="outline" size="sm" onClick={() => operar(() => actividadService.guardarOpcion(edicion.id_edicion, opcion.id_opcion, { activa: !opcion.activa }))}>{opcion.activa ? 'Retirar del catálogo' : 'Volver a ofrecer'}</BotonAccion></div>}</div>)}
        {editarCatalogo && <FormularioOpcionAporte key={opcionEditada?.id_opcion || 'nueva'} idEdicion={edicion.id_edicion} opcion={opcionEditada} onCancelar={opcionEditada ? () => setOpcionEditada(null) : undefined} onGuardado={() => { setOpcionEditada(null); recargar(); }} />}
      </div></details>}
      {visible('participantes') && datos.edicion.requiere_registro && <details open={secciones.participantes} onToggle={alternar("participantes")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Participantes</summary><div className="space-y-4 pt-5"><h3 className="text-xl font-bold">Participantes</h3><p>{vigentes.length} inscripciones confirmadas · {datos.registros.filter((registro) => registro.estado === 'pendiente_completar').length} pendientes de completar</p><div className="flex flex-wrap gap-3">{Object.entries(tallas).map(([talla, total]) => <span key={talla} className="text-sm font-semibold">Talla {talla}: {total}</span>)}</div>
        <label className={labelCls}>Buscar participante<input className={inputCls} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre o matrícula" /></label>
        {!registros.length && <p className={tema.subtitle}>No hay participantes para mostrar.</p>}
        <div className="space-y-4">{registros.map((registro) => <article key={registro.id_registro} className="space-y-3 border-b border-slate-500/20 pb-5"><h4 className="font-bold">{registro.nombre_completo} · {registro.matricula}</h4><EstadoActividad estado={registro.estado} />
          <dl className="grid gap-2 sm:grid-cols-2">{registro.formulario_snapshot.map((campo) => <div key={campo.clave}><dt className={'text-xs ' + tema.subtitle}>{campo.etiqueta}</dt><dd className="text-sm">{campo.tipo === 'licenciatura' ? licenciaturas.find((item) => item.id_licenciatura === Number(registro.respuestas[campo.clave]))?.nombre || 'Sin especificar' : registro.respuestas[campo.clave] ?? 'Sin especificar'}</dd></div>)}</dl>
          {registro.aportaciones.map((aporte) => <div key={aporte.id_aportacion} className="flex flex-wrap items-center gap-3 text-sm"><span>{aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</span>{aporte.estado === 'comprometida' && registro.estado === 'confirmado' && <BotonAccion size="sm" variant="outline" onClick={() => operar(() => actividadService.recibirAportacion(aporte.id_aportacion))}>Confirmar recepción</BotonAccion>}</div>)}
        </article>)}</div>
      </div></details>}
      {visible('fotografias') && <details open={secciones.fotos} onToggle={alternar("fotos")} className="rounded-xl border border-slate-400/25 p-4"><summary className="cursor-pointer font-bold">Fotografías · {datos.fotos.filter((foto)=>foto.estado==='pendiente').length} por revisar</summary><div className="pt-5"><GestorFotosActividad edicion={datos.edicion} fotos={datos.fotos} puedeAprobar={puedeAprobar} onActualizar={(texto) => { setMensaje(texto); recargar(); }} /></div></details>}
      {seccion==='participantes' && !datos.edicion.requiere_registro && <p className={tema.subtitle}>Esta edición no requiere inscripciones.</p>}
      {seccion==='aportaciones' && <section aria-label="Recepción de aportaciones" className="space-y-4">
        <h3 className="text-xl font-bold">Recepción de aportaciones</h3>
        {!datos.registros.some((registro)=>registro.aportaciones.length) && <p className={tema.subtitle}>No hay aportaciones comprometidas.</p>}
        {datos.registros.filter((registro)=>registro.aportaciones.length).map((registro)=><article key={registro.id_registro} className="space-y-3 rounded-xl border border-slate-400/25 p-4">
          <h4 className="font-bold">{registro.nombre_completo} · {registro.matricula}</h4>
          {registro.aportaciones.map((aporte)=><div key={aporte.id_aportacion} className="flex flex-wrap items-center gap-3 text-sm">
            <span>{aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</span>
            {aporte.estado==='comprometida' && registro.estado==='confirmado' && <BotonAccion size="sm" variant="outline" onClick={()=>operar(()=>actividadService.recibirAportacion(aporte.id_aportacion))}>Confirmar recepción</BotonAccion>}
          </div>)}
        </article>)}
      </section>}
      {seccion==='todo' && [3,7].includes(usuario.id_rol) && ['trineo','misiones'].includes(datos.edicion.plantilla) && <TrasladoActividad edicion={datos.edicion} onActualizar={recargar}/>}
    </fieldset>
  </div>;
}
