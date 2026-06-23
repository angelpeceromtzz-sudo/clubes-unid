import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, requiereAdmin = false, requierePresidente = false }) {
  const { isAuthenticated, isAdmin, isPresidente } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiereAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requierePresidente && !isPresidente) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ✦ A
