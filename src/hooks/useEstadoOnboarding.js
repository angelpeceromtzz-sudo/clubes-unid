// Estado del onboarding para alumnos. La fuente de verdad es el servidor:
// GET /api/me/preferencias. Sin fila en preferencias_usuario equivale a 'pendiente'.
// No se usa localStorage: la sesión restaurada vuelve a consultarse.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export const ESTADOS_ONBOARDING = Object.freeze({
  CARGANDO: 'cargando',
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  OMITIDO: 'omitido',
  ERROR: 'error',
});

export function useEstadoOnboarding(usuario) {
  const esAlumno = usuario?.id_rol === 1;
  const idUsuario = usuario?.id_usuario ?? null;
  const [estado, setEstado] = useState(ESTADOS_ONBOARDING.CARGANDO);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (idUsuario === null || !esAlumno) {
      return undefined;
    }

    let vigente = true;

    api.getPreferenciasOnboarding()
      .then((datos) => {
        if (!vigente) return;
        const recibido = datos?.estado_onboarding;
        if (recibido === 'omitido') setEstado(ESTADOS_ONBOARDING.OMITIDO);
        else if (recibido === 'completado') setEstado(ESTADOS_ONBOARDING.COMPLETADO);
        else setEstado(ESTADOS_ONBOARDING.PENDIENTE);
      })
      .catch(() => {
        if (vigente) setEstado(ESTADOS_ONBOARDING.ERROR);
      });

    return () => {
      vigente = false;
    };
  }, [idUsuario, esAlumno, intento]);

  const estadoEfectivo =
    idUsuario === null || !esAlumno ? ESTADOS_ONBOARDING.COMPLETADO : estado;

  const reintentar = useCallback(() => {
    setEstado(ESTADOS_ONBOARDING.CARGANDO);
    setIntento((n) => n + 1);
  }, []);

  const marcarCompletado = useCallback(() => {
    setEstado(ESTADOS_ONBOARDING.COMPLETADO);
  }, []);

  const marcarOmitido = useCallback(() => {
    setEstado(ESTADOS_ONBOARDING.OMITIDO);
  }, []);

  return { estado: estadoEfectivo, esAlumno, reintentar, marcarCompletado, marcarOmitido };
}
