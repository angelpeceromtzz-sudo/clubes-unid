/* Componente de protección de rutas. Redirige a "/" si el usuario no está autenticado o no tiene el rol requerido. */
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useEstadoOnboarding } from '../../hooks/useEstadoOnboarding';

export function RutaProtegida({ children, requiereAdmin = false, requiereAdminOCoordinacion = false, requiereCoordinacion = false, requierePresidente = false, requiereRectoria = false, requiereResponsableMural = false, requiereAlumno = false }) {
  const { estaAutenticado, esAdmin, esCoordinacion, esResponsableClub, esRectoria, esResponsableMural, usuario } = useAutenticacion();
  const { estado: estadoOnboarding } = useEstadoOnboarding(usuario);

  if (!estaAutenticado) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereAlumno && usuario?.id_rol !== 1) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (usuario?.id_rol === 1 && estadoOnboarding === 'pendiente') {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereAdmin && !esAdmin) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereAdminOCoordinacion && !(esAdmin || esCoordinacion)) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requiereCoordinacion && !esCoordinacion) {
    return <Navigate to="/campus/campeche/portal" replace />;
  }

  if (requierePresidente && !esResponsableClub) {
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
