import { useState } from 'react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { GaleriaFotosActividad } from './GaleriaFotosActividad';

function ReaccionesClub({ club, totales, onLoginClick }) {
  const {usuario}=useAutenticacion();
  const {datos,cargando,error,recargar}=useActividadRecurso(usuario ? '/clubes/'+club.id_club+'/mi-reaccion' : null,usuario?.id_usuario || usuario?.id);
  const [cambio,setCambio]=useState(null);
  const [pendiente,setPendiente]=useState(false);
  const [fallo,setFallo]=useState('');
  const seleccionada=cambio ? cambio.reaccion : datos?.reaccion;
  async function reaccionar(valor) {
    if(!usuario) return onLoginClick();
    if(pendiente || cargando || error) return;
    setPendiente(true);setFallo('');
    try{setCambio(await actividadService.reaccionarClub(club.id_club,seleccionada===valor ? null : valor));}
    catch(error){setFallo(error.mensajeServidor || error.message);}finally{setPendiente(false);}
  }
  return <section aria-label="Reacciones del club" className="space-y-3"><h3 className="text-lg font-bold">Comparte tu reacción</h3><div className="flex flex-wrap gap-3">{[['like','👍','Me gusta'],['love','❤️','Me encanta'],['clap','👏','Aplausos']].map(([valor,emoji,etiqueta])=><BotonAccion key={valor} aria-label={etiqueta} aria-pressed={seleccionada===valor} variant={seleccionada===valor ? 'primary' : 'outline'} disabled={pendiente || Boolean(usuario && (cargando || error))} onClick={()=>reaccionar(valor)}>{emoji} {etiqueta} · {(cambio?.totales || totales).find((item)=>item.reaccion===valor)?.total || 0}</BotonAccion>)}</div>{error && <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>}{fallo && <p role="alert">{fallo}</p>}</section>;
}

export function ComunidadClub({club,onLoginClick}) {
  const {usuario}=useAutenticacion();
  const {datos,cargando,error,recargar}=useActividadRecurso('/clubes/'+club.id_club+'/galeria','publico',true);
  if(cargando) return <p>Cargando comunidad…</p>;
  if(error) return <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  return <div className="space-y-8"><ReaccionesClub key={club.id_club+':'+(usuario?.id_usuario || usuario?.id || 'invitado')} club={club} totales={datos.reacciones} onLoginClick={onLoginClick}/><GaleriaFotosActividad fotos={datos.fotos} titulo={club.nombre_club}/></div>;
}
