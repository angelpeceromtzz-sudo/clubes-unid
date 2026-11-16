import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { camposPlantillaActividad, normalizarEdicionActividad, normalizarOpcionAportacion, validarPublicacionEdicion } from '../../../shared/actividades';
import { EditorCamposActividad } from './EditoresActividad';
import { VistaPreviaActividad } from './VistaPreviaActividad';
import { BotonAccion } from '../ui/BotonAccion';

const PASOS=['Información','Fechas','Inscripción y aportaciones','Resumen'];

export function FormularioEdicionActividad({actividad,edicion,onGuardado,onCancelar}) {
  const {usuario}=useAutenticacion();
  const {datos:operacion,cargando,error:errorCatalogo,recargar}=useActividadRecurso(edicion ? '/gestion/ediciones/'+edicion.id_edicion : null,usuario?.id_usuario || usuario?.id);
  const especial=['trineo','misiones'].includes(actividad.plantilla);
  const [datos,setDatos]=useState({nombre:'',descripcion:'',lugar:'',hora_inicio:'',requiere_registro:especial,requiere_aportacion:actividad.plantilla==='trineo',destacable:especial,campos_registro:camposPlantillaActividad(actividad.plantilla),...edicion,...edicion?.propuesta});
  const [opciones,setOpciones]=useState([]);
  const [paso,setPaso]=useState(0);
  const [error,setError]=useState('');
  const [guardando,setGuardando]=useState(false);
  const formularioRef=useRef(null);
  const tituloRef=useRef(null);
  const {tema,inputCls,labelCls,cardCls}=useTheme();
  const bloqueado=edicion?.estado==='pendiente' || edicion?.estado==='archivada' || edicion?.estado_propuesta==='pendiente';
  const catalogo=edicion ? operacion?.catalogo || [] : opciones;
  const cambiar=(clave,valor)=>setDatos((actual)=>({...actual,[clave]:valor}));
  const campos=datos.campos_registro.map((campo)=>({...campo,opciones:campo.textoOpciones==null ? campo.opciones : campo.textoOpciones.split(/\r?\n/).map((valor)=>valor.trim()).filter(Boolean)}));
  useEffect(()=>{tituloRef.current?.focus();},[paso]);
  function validarResumen() {
    const normalizada=normalizarEdicionActividad({...datos,campos_registro:campos},actividad.plantilla);
    const opcionesValidas=edicion ? catalogo : datos.requiere_aportacion ? opciones.map((opcion)=>({...normalizarOpcionAportacion(opcion),activa:true})) : [];
    validarPublicacionEdicion(normalizada,opcionesValidas);
    return normalizada;
  }
  function continuar() {
    setError('');
    if(!formularioRef.current.reportValidity()) return;
    try {
      if(paso===1) normalizarEdicionActividad({...datos,campos_registro:campos},actividad.plantilla);
      if(paso===2) validarResumen();
      setPaso((actual)=>Math.min(actual+1,3));
    }catch(fallo){setError(fallo.message);}
  }
  async function guardar(borrador=false) {
    if(guardando) return;
    setError('');setGuardando(true);
    try {
      const normalizada=borrador ? normalizarEdicionActividad({...datos,campos_registro:campos},actividad.plantilla) : validarResumen();
      const payload={...normalizada};
      if(!edicion && (!borrador || opciones.length)) payload.catalogo_aportaciones=normalizada.requiere_aportacion ? opciones.map(normalizarOpcionAportacion) : [];
      const resultado=await actividadService.guardarEdicion(actividad.id_actividad,edicion?.id_edicion,payload);
      onGuardado(resultado.id_edicion);
    }catch(fallo){setError(fallo.mensajeServidor || fallo.message);}finally{setGuardando(false);}
  }
  const fecha=(clave,titulo,obligatoria=false)=><label className={labelCls} key={clave}>{titulo}<input type="date" className={inputCls} required={obligatoria} value={datos[clave] || ''} onChange={(evento)=>cambiar(clave,evento.target.value)}/></label>;
  return <form ref={formularioRef} aria-label="Configurar edición" className="space-y-6" onSubmit={(evento)=>{evento.preventDefault();if(paso<3) continuar();else guardar();}}>
    <ol aria-label="Pasos para crear la edición" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{PASOS.map((titulo,indice)=><li key={titulo} aria-current={paso===indice ? 'step' : undefined} className={'rounded-xl border p-3 text-xs font-semibold '+(paso===indice ? 'border-amber-400 bg-amber-400/15 text-amber-700 dark:text-amber-300' : 'border-slate-400/25 '+tema.subtitle)}>{indice+1}. {titulo}</li>)}</ol>
    <div><p className={'text-xs mb-2 '+tema.subtitle}>Paso {paso+1} de 4 · {actividad.nombre}</p><h3 ref={tituloRef} tabIndex={-1} className="text-xl font-bold outline-none">{PASOS[paso]}</h3></div>
    <fieldset disabled={bloqueado || guardando} className="space-y-5">
      {paso===0 && <>
        <label className={labelCls}>Nombre de la edición *<input className={inputCls} value={datos.nombre} required maxLength={160} placeholder="Por ejemplo: Trineo de los Sueños 2026" onChange={(evento)=>cambiar('nombre',evento.target.value)}/></label>
        <label className={labelCls}>Lugar *<input className={inputCls} value={datos.lugar} required maxLength={240} onChange={(evento)=>cambiar('lugar',evento.target.value)}/></label>
        <label className={labelCls}>Información de esta edición<textarea className={inputCls} value={datos.descripcion} rows={4} maxLength={5000} onChange={(evento)=>cambiar('descripcion',evento.target.value)}/></label>
      </>}
      {paso===1 && <>
        <p className={'text-sm '+tema.subtitle}>Indica cuándo se realizará y durante qué periodo aparecerá como destacada.</p>
        <div className="grid gap-4 sm:grid-cols-2">{fecha('fecha_inicio','Fecha de inicio *',true)}{fecha('fecha_fin','Fecha de fin (opcional)')}<label className={labelCls}>Hora de inicio<input type="time" className={inputCls} value={datos.hora_inicio || ''} onChange={(evento)=>cambiar('hora_inicio',evento.target.value)}/></label></div>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={datos.destacable} onChange={(evento)=>cambiar('destacable',evento.target.checked)}/>Destacar automáticamente durante un periodo</label>
        {datos.destacable && <div className="grid gap-4 sm:grid-cols-2">{fecha('destacada_desde','Destacar desde *',true)}{fecha('destacada_hasta','Destacar hasta *',true)}</div>}
      </>}
      {paso===2 && <>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" disabled={especial} checked={datos.requiere_registro} onChange={(evento)=>cambiar('requiere_registro',evento.target.checked)}/>Esta edición tendrá inscripción</label>
        {datos.requiere_registro ? <>
          <div className="grid gap-4 sm:grid-cols-2">{fecha('inscripcion_desde','Inscripciones desde *',true)}{fecha('inscripcion_hasta','Inscripciones hasta *',true)}</div>
          <EditorCamposActividad campos={datos.campos_registro} plantilla={actividad.plantilla} onChange={(valor)=>cambiar('campos_registro',valor)}/>
          <label className="flex items-center gap-3 font-semibold"><input type="checkbox" disabled={actividad.plantilla==='trineo'} checked={datos.requiere_aportacion} onChange={(evento)=>cambiar('requiere_aportacion',evento.target.checked)}/>Aportación obligatoria al registrarse</label>
          {datos.requiere_aportacion && <section className={'rounded-xl border p-4 space-y-4 '+cardCls}><h4 className="font-bold">Opciones de aportación</h4>
            {edicion ? <><p className="text-sm">El catálogo vigente se conserva. Para cambiar sus opciones, abre Aportaciones en el detalle de la edición.</p>{cargando ? <p>Cargando aportaciones…</p> : errorCatalogo ? <div role="alert"><p>{errorCatalogo}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : catalogo.map((opcion)=><p className="text-sm" key={opcion.id_opcion}>{opcion.nombre} · mínimo {Number(opcion.cantidad_minima)} {opcion.unidad}{!opcion.activa && ' · retirada'}</p>)}</> : <>
              <p className="text-sm">Agrega las opciones que podrán elegir los asistentes. Se guardarán junto con la edición.</p>
              {opciones.map((opcion,indice)=><fieldset key={indice} className="space-y-3 rounded-lg border border-slate-400/25 p-3"><legend className="px-1 text-sm font-bold">Opción {indice+1}</legend>{[['nombre','Aportación *'],['unidad','Unidad de medida *']].map(([clave,titulo])=><label key={clave} className={labelCls}>{titulo}<input className={inputCls} value={opcion[clave]} required maxLength={clave==='nombre' ? 160 : 60} onChange={(evento)=>setOpciones((actuales)=>actuales.map((actual,pos)=>pos===indice ? {...actual,[clave]:evento.target.value} : actual))}/></label>)}<label className={labelCls}>Cantidad mínima *<input type="number" min="0.001" max={1000000} step="0.001" required className={inputCls} value={opcion.cantidad_minima} onChange={(evento)=>setOpciones((actuales)=>actuales.map((actual,pos)=>pos===indice ? {...actual,cantidad_minima:evento.target.value} : actual))}/></label><BotonAccion variant="outline" size="sm" onClick={()=>setOpciones((actuales)=>actuales.filter((_actual,pos)=>pos!==indice))}>Quitar opción {indice+1}</BotonAccion></fieldset>)}
              <BotonAccion variant="outline" disabled={opciones.length>=50} onClick={()=>setOpciones((actuales)=>[...actuales,{nombre:'',unidad:'',cantidad_minima:1,descripcion:''}])}>Agregar aportación</BotonAccion>
            </>}
          </section>}
        </> : <p className={'text-sm '+tema.subtitle}>Se publicará como una edición informativa, sin formulario de inscripción.</p>}
      </>}
      {paso===3 && <><p className={'text-sm '+tema.subtitle}>Así se presentará la edición. Revisa los datos antes de guardar y enviarla a Rectoría.</p><VistaPreviaActividad actividad={actividad} edicion={{...datos,campos_registro:campos}} catalogo={datos.requiere_aportacion ? catalogo : []}/><p className="rounded-xl bg-amber-400/10 p-4 text-sm">{edicion?.estado==='publicada' ? 'Guardar creará una propuesta. La versión aprobada seguirá visible hasta que Rectoría autorice el cambio.' : 'Se guardará como borrador. Después podrás enviarla a revisión desde su detalle.'}</p></>}
      <div className="flex flex-wrap gap-3 border-t border-slate-400/25 pt-5">
        {paso>0 && <BotonAccion variant="outline" onClick={()=>{setError('');setPaso((actual)=>actual-1);}}>Anterior</BotonAccion>}
        <BotonAccion type="submit" disabled={paso===2 && datos.requiere_aportacion && edicion && (cargando || Boolean(errorCatalogo))}>{guardando ? 'Guardando…' : paso<3 ? 'Continuar' : edicion?.estado==='publicada' ? 'Guardar propuesta de edición' : 'Guardar edición'}</BotonAccion>
        {paso<3 && <BotonAccion variant="outline" onClick={()=>guardar(true)}>{edicion?.estado==='publicada' ? 'Guardar propuesta y salir' : 'Guardar borrador y salir'}</BotonAccion>}
        <BotonAccion variant="outline" onClick={onCancelar}>Cancelar</BotonAccion>
      </div>
    </fieldset>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
  </form>;
}
