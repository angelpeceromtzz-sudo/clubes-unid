import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30000;

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotificaciones = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificaciones([]);
      return;
    }
    try {
      const data = await api.getNotificaciones();
      setNotificaciones(data);
    } catch {
      if (intervalRef.current) {
        setNotificaciones([]);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotificaciones();
    if (isAuthenticated) {
      intervalRef.current = setInterval(fetchNotificaciones, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchNotificaciones]);

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  const marcarComoLeida = useCallback(async (id) => {
    try {
      await api.marcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id_notificacion === id ? { ...n, leido: true } : n))
      );
    } catch {
    }
  }, []);

  const crearNotificacion = useCallback(async (titulo, mensaje, audiencia, id_club) => {
    const data = await api.createNotificacion(titulo, mensaje, audiencia, id_club);
    fetchNotificaciones().catch(() => {});
    return data;
  }, [fetchNotificaciones]);

  return (
    <NotificationContext.Provider
      value={{
        notificaciones,
        noLeidas,
        marcarComoLeida,
        crearNotificacion,
        fetchNotificaciones,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de NotificationProvider');
  return ctx;
}
