import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { GestorFotosActividad } from './GestorFotosActividad';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';

export function GestionFotosClub({ club, puedeAprobar }) {
  const { usuario } = useAutenticacion();
  const { datos,cargando,error,recargar } = useActividadRecurso('/gestion/actividades/'+club.id_club+'/fotos',usuario.id_usuario || usuario.id);
  const [mensaje,setMensaje]=useState('');
  if(cargando) return <Spinner/>;
  if(error) return <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  return <section className="space-y-5"><h2 className="text-2xl font-bold">Comunidad del club</h2><p>Las postulaciones, miembros, horarios y convocatorias se administran en los paneles de clubes.</p><Link className="text-amber-600 dark:text-amber-400 underline" to={[3,7].includes(usuario.id_rol) ? '/admin/panel' : usuario.id_rol===4 ? '/rectoria/panel' : '/campus/campeche/portal/responsable-de-club/panel'}>Abrir panel operativo</Link>{mensaje && <p role="status">{mensaje}</p>}<GestorFotosActividad edicion={datos.recurso} fotos={datos.fotos} puedeAprobar={puedeAprobar} onActualizar={(texto)=>{setMensaje(texto);recargar();}}/></section>;
}

export function TrasladoActividad({ edicion, onActualizar }) {
  const {inputCls,labelCls}=useTheme();
  const [clubes,setClubes]=useState(null);
  const [seleccion,setSeleccion]=useState('');
  const [resumen,setResumen]=useState(null);
  const [confirmado,setConfirmado]=useState(false);
  const [mensaje,setMensaje]=useState('');
  const [error,setError]=useState('');
  const [pendiente,setPendiente]=useState(false);
  async function operar(trabajo) {setPendiente(true);setError('');try{await trabajo();}catch(fallo){setError(fallo.mensajeServidor || fallo.message);}finally{setPendiente(false);}}
  return <section className="space-y-4 border-t border-slate-500/25 pt-6"><h3 className="text-xl font-bold">Trasladar registros anteriores</h3><p className="text-sm">Si esta actividad se registró anteriormente como club, consulta el resumen antes de trasladar a sus participantes. El club se archivará y cada alumno deberá completar los datos y aportaciones de esta edición. El historial se conserva.</p>
    {!clubes ? <BotonAccion variant="outline" disabled={pendiente} onClick={()=>operar(async()=>setClubes(await actividadService.clubesParaTraslado()))}>Consultar clubes anteriores</BotonAccion> : <fieldset disabled={pendiente} className="space-y-4"><label className={labelCls}>Club de origen<select className={inputCls} value={seleccion} onChange={(evento)=>{setSeleccion(evento.target.value);setResumen(null);setConfirmado(false);setMensaje('');}}><option value="">Selecciona el registro anterior</option>{clubes.map((club)=><option key={club.id_club} value={club.id_club}>{club.nombre_club}</option>)}</select></label><BotonAccion variant="outline" disabled={!seleccion} onClick={()=>operar(async()=>{setResumen(await actividadService.revisarTraslado(seleccion,edicion.id_edicion));setConfirmado(false);})}>Revisar traslado</BotonAccion>
    {resumen && (resumen.ya_migrado ? <p>Este registro ya fue trasladado a esta edición.</p> : <div className="space-y-3"><p className="font-bold">{resumen.nombre_club} → {edicion.nombre}</p><p>{resumen.formularios} postulaciones · {resumen.inscripciones} membresías históricas · {resumen.candidatos} participantes por revisar</p><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmado} onChange={(evento)=>setConfirmado(evento.target.checked)}/>Confirmo que este club corresponde a la actividad y edición seleccionadas, y que debe archivarse.</label><BotonAccion disabled={!confirmado} onClick={()=>operar(async()=>{const resultado=await actividadService.aplicarTraslado(seleccion,edicion.id_edicion);setResumen({ya_migrado:true});setMensaje(resultado.ya_migrado ? 'El traslado ya estaba aplicado.' : resultado.importados+' registros trasladados; '+resultado.sin_matricula+' sin matrícula para revisar.');onActualizar();})}>Confirmar traslado</BotonAccion></div>)}
    </fieldset>}{mensaje && <p role="status">{mensaje}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
