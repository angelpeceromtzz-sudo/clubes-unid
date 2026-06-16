// Componente de protección de rutas según autenticación y rol
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';
import { useState } from 'react';

// Envuelve rutas que requieren autenticación y/o roles específicos
export function ProtectedRoute({ children, requiereAdmin = false, requierePresidente = false }) {
  const { isAuthenticated, isAdmin, isPresidente } = useAuth();
  const [showLogin, setShowLogin] = useState(!isAuthenticated);

  if (!isAuthenticated) {
    return (
      <>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        {!showLogin && (
          <div className="text-center py-32 px-4">
            <p className="text-slate-400 text-lg font-medium mb-4">
              Debes iniciar sesión para acceder a esta sección.
            </p>
            <button
              onClick={() => setShowLogin(true)}
              className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              Iniciar Sesión
            </button>
          </div>
        )}
      </>
    );
  }

  // Verifica permisos de administrador
  if (requiereAdmin && !isAdmin) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-slate-400 text-lg font-medium">
          No tienes permisos de administrador para acceder a esta sección.
        </p>
      </div>
    );
  }

  // Verifica permisos de presidente
  if (requierePresidente && !isPresidente) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-slate-400 text-lg font-medium">
          No tienes permisos de presidente para acceder a esta sección.
        </p>
      </div>
    );
  }

  return children;
}

// ✦ A
