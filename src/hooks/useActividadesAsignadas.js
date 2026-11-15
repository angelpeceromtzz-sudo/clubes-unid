import { useAutenticacion } from '../contexts/AuthContext';
import { useActividadRecurso } from './useActividadRecurso';

export function useActividadesAsignadas() {
  const { usuario, authReady } = useAutenticacion();
  const consulta = useActividadRecurso(authReady && usuario ? '/gestion/asignadas' : null, usuario?.id_usuario || usuario?.id, true);
  return { ...consulta, actividades: consulta.datos || [], disponible: Boolean(consulta.datos?.length) };
}
