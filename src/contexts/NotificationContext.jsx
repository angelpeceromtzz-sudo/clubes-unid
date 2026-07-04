import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAutenticacion } from './AuthContext';
import { api } from '../services/api';

const ContextoNotificacion = createContext(null);

const INTERVALO_POLL = 30000;

export function ProveedorNotificacion({ children: hijos }) {
  const { estaAutenticado, usuario } = useAutenticacion();
  const [notificaciones, setNotificaciones] = useState([]);
  const refIntervalo = useRef(null);

  const obtenerNotificaciones = useCallback(async () => {
    if (!estaAutenticado) {
      setNotificaciones([]);
      return;
    }
    try {
      const data = await api.getNotificaciones();
      setNotificaciones(data);
    } catch {
      if (refIntervalo.current) {
        setNotificaciones([]);
      }
    }
  }, [estaAutenticado]);

  useEffect(() => {
    obtenerNotificaciones();
    if (estaAutenticado) {
      refIntervalo.current = setInterval(obtenerNotificaciones, INTERVALO_POLL);
    }
    return () => {
      if (refIntervalo.current) {
        clearInterval(refIntervalo.current);
        refIntervalo.current = null;
      }
    };
  }, [estaAutenticado, obtenerNotificaciones]);

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
    obtenerNotificaciones().catch(() => {});
    return data;
  }, [obtenerNotificaciones]);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await api.marcarTodasNotificacionesLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    } catch {
    }
  }, []);

  const eliminarNotificacion = useCallback(async (id) => {
    try {
      await api.eliminarNotificacion(id);
      setNotificaciones((prev) => prev.filter((n) => n.id_notificacion !== id));
    } catch {
    }
  }, []);

  return (
    <ContextoNotificacion.Provider
      value={{
        notificaciones,
        noLeidas,
        marcarComoLeida,
        crearNotificacion,
        fetchNotificaciones: obtenerNotificaciones,
        marcarTodasLeidas,
        eliminarNotificacion,
      }}
    >
      {hijos}
    </ContextoNotificacion.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(ContextoNotificacion);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de ProveedorNotificacion');
  return ctx;
}
