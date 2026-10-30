/* Componente de protección de rutas. Redirige a "/" si el usuario no está autenticado o no tiene el rol requerido. */
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';

export function RutaProtegida({ children, requiereAdmin = false, requiereAdminOCoordinacion = false, requierePresidente = false, requiereRectoria = false, requiereResponsableMural = false }) {
  const { estaAutenticado, esAdmin, esCoordinacion, esPresidente, esRectoria, esResponsableMural } = useAutenticacion();

  if (!estaAutenticado) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereAdmin && !esAdmin) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereAdminOCoordinacion && !(esAdmin || esCoordinacion)) {
    return <Navigate to="/" replace />;
  }

  if (requierePresidente && !esPresidente) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereRectoria && !esRectoria) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereResponsableMural && !esResponsableMural) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  return children;
}
