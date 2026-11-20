import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { GaleriaFotosActividad } from './GaleriaFotosActividad';
import { ReaccionesCatalogo } from './ReaccionesCatalogo';

function ReaccionesClub({ club, totales, onLoginClick }) {
  const {usuario,authReady}=useAutenticacion();
  const {datos,cargando,error,recargar}=useActividadRecurso(usuario ? '/clubes/'+club.id_club+'/mi-reaccion' : null,usuario?.id_usuario || usuario?.id);
  return <ReaccionesCatalogo etiqueta="Reacciones del club" totales={totales} reaccion={datos?.reaccion}
    autenticado={Boolean(usuario)} cargando={!authReady || Boolean(usuario && cargando)} errorCarga={error} onRecargar={recargar}
    guardarReaccion={(reaccion)=>actividadService.reaccionarClub(club.id_club,reaccion)} onLoginClick={onLoginClick}/>;
}

export function ComunidadClub({club,onLoginClick}) {
  const {usuario}=useAutenticacion();
  const {datos,cargando,error,recargar}=useActividadRecurso('/clubes/'+club.id_club+'/galeria','publico',true);
  if(cargando) return <p>Cargando comunidad…</p>;
  if(error) return <div role="alert"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  return <div className="space-y-8"><ReaccionesClub key={club.id_club+':'+(usuario?.id_usuario || usuario?.id || 'invitado')} club={club} totales={datos.reacciones} onLoginClick={onLoginClick}/><GaleriaFotosActividad fotos={datos.fotos} titulo={club.nombre_club}/></div>;
}
