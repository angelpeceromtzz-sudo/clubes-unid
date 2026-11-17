import { useEffect, useState } from 'react';

// Actualiza la pantalla al vencer el plazo, incluso si permanece abierta.
export function useFechaVencida(fecha) {
  const limite = fecha ? new Date(fecha).getTime() : NaN;
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(limite) || limite <= ahora) return;
    const timer = setTimeout(() => setAhora(Date.now()), Math.min(Math.max(0, limite - Date.now()) + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [limite, ahora]);
  return Number.isFinite(limite) && limite <= ahora;
}
