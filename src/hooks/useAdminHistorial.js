/* Hook para el historial de administración: carga registros de auditoría. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const FILTROS_INICIALES = { desde: '', hasta: '', actor: '', accion: '' };

export function useAdminHistorial(isActive) {
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const cargarHistorial = useCallback(() => {
    setCargandoHistorial(true);
    api.getHistorial(filtros)
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setCargandoHistorial(false));
  }, [filtros]);

  useEffect(() => {
    if (isActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarHistorial();
    }
  }, [isActive, cargarHistorial]);

  return { historial, historialLoading: cargandoHistorial, cargarHistorial, filtros, setFiltros };
}
