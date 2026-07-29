import { useCallback } from 'react';
import { api } from '../../../../services/api';

export function useHorariosActions({ cargarHorarios, showToast, abrirCrearDesdeGrid }) {
  const handleMove = useCallback(async (id, data) => {
    if (data.conflicto) {
      showToast('Conflicto de horario: ya existe un entrenamiento en esa franja');
      return;
    }
    try {
      await api.updateHorario(id, {
        dia_semana: data.dia_semana,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
      });
      await cargarHorarios();
    } catch (err) {
      showToast(err?.error || 'Error al mover el horario');
      await cargarHorarios();
    }
  }, [cargarHorarios, showToast]);

  const handleResize = useCallback(async (id, data) => {
    try {
      await api.updateHorario(id, {
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
      });
      await cargarHorarios();
    } catch (err) {
      showToast(err?.error || 'Error al redimensionar');
      await cargarHorarios();
    }
  }, [cargarHorarios, showToast]);

  const handleCreate = useCallback((data) => {
    abrirCrearDesdeGrid(data);
  }, [abrirCrearDesdeGrid]);

  return { handleMove, handleResize, handleCreate };
}
