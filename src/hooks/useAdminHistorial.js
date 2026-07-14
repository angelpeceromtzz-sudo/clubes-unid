/* Hook para el historial de administración: carga registros de auditoría. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useAdminHistorial(isActive) {
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargarHistorial = useCallback(() => {
    setCargandoHistorial(true);
    api.getHistorial()
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setCargandoHistorial(false));
  }, []);

  useEffect(() => {
    if (isActive) {
      cargarHistorial();
    }
  }, [isActive, cargarHistorial]);

  return { historial, historialLoading: cargandoHistorial, cargarHistorial };
}
