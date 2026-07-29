import { useState, useCallback } from 'react';

export function useConfirmacionPendiente() {
  const [pendiente, setPendiente] = useState(null);

  const solicitar = useCallback((datos) => {
    setPendiente(datos);
  }, []);

  const confirmar = useCallback(async (ejecutor) => {
    if (!pendiente) return;
    const p = pendiente;
    setPendiente(null);
    await ejecutor(p);
  }, [pendiente]);

  const cancelar = useCallback(() => {
    setPendiente(null);
  }, []);

  return { pendiente, solicitar, confirmar, cancelar };
}
