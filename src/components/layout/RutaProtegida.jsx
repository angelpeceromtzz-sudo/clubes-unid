/* Componente de protección de rutas. Redirige a "/" si el usuario no está autenticado o no tiene el rol requerido. */
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';

export function RutaProtegida({ children, requiereAdmin = false, requierePresidente = false, requiereRectoria = false }) {
  const { estaAutenticado, esAdmin, esPresidente, esRectoria } = useAutenticacion();

  if (!estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  if (requiereAdmin && !esAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requierePresidente && !esPresidente) {
    return <Navigate to="/" replace />;
  }

  if (requiereRectoria && !esRectoria) {
    return <Navigate to="/" replace />;
  }

  return children;
}
