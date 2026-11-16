import { Navigate, useParams } from 'react-router-dom';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { DetalleClub } from '../clubes/DetalleClub';
import { Spinner } from '../ui/Spinner';

export function RutaClubActividad({ onLoginClick }) {
  const { id } = useParams();
  const { datos, cargando } = useActividadRecurso('/legado/club/' + id);
  if (cargando) return <Spinner />;
  if (datos?.slug) return <Navigate to={'/actividades/' + datos.slug + '?edicion=' + datos.id_edicion} replace />;
  return <DetalleClub onLoginClick={onLoginClick} />;
}
