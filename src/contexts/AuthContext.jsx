/* eslint-disable react-refresh/only-export-components */
// Contexto de autenticación — provee estado de sesión a toda la app
import { createContext, useContext, useState, useCallback } from 'react';
import { api, getSession, setSession, clearSession } from '../services/api';

const AuthContext = createContext(null);

// Proveedor que envuelve la app y comparte estado de autenticación
export function AuthProvider({ children }) {
  // Inicializa el usuario desde la sesión guardada en localStorage
  const [user, setUser] = useState(() => {
    const session = getSession();
    return session ? session.user : null;
  });

  const [tieneInscripcionActiva, setTieneInscripcionActiva] = useState(false);

  // Refresca el estado de inscripción activa desde la API
  const refreshInscripcionActiva = useCallback(async () => {
    try {
      const insc = await api.getInscripcionActiva();
      setTieneInscripcionActiva(!!insc);
    } catch {
      setTieneInscripcionActiva(false);
    }
  }, []);

  // Inicia sesión: llama a la API, guarda el token y actualiza el estado
  const login = useCallback(async (correo, password) => {
    try {
      const data = await api.login(correo, password);
      setSession({ token: data.token, user: data.user });
      setUser(data.user);
      try {
        const insc = await api.getInscripcionActiva();
        setTieneInscripcionActiva(!!insc);
      } catch {
        setTieneInscripcionActiva(false);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  // Cierra sesión: limpia estado y localStorage
  const logout = useCallback(() => {
    setUser(null);
    setTieneInscripcionActiva(false);
    clearSession();
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.id_rol === 3;
  const isPresidente = user?.id_rol === 2;

  const fetchInscripcionActiva = useCallback(async () => {
    try {
      return await api.getInscripcionActiva();
    } catch {
      return null;
    }
  }, []);

  // Obtiene datos completos del dashboard (club, avisos, rol)
  const fetchDashboardData = useCallback(async () => {
    try {
      const inscripcion = await api.getInscripcionActiva();
      if (!inscripcion) return null;

      const club = await api.getClub(inscripcion.id_club);
      const avisos = await api.getAvisos(inscripcion.id_club);
      const esPresidente = club.id_presidente === user?.id;

      return { club, avisos, esPresidente, inscripcion };
    } catch {
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isPresidente,
        tieneInscripcionActiva,
        refreshInscripcionActiva,
        fetchInscripcionActiva,
        fetchDashboardData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook para consumir el contexto de autenticación
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// ✦ A
