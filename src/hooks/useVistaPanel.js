import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useVistaPanel(elementos) {
  const [parametros, setParametros] = useSearchParams();
  const solicitada = parametros.get('seccion');
  const vista = elementos.some((item) => item.key === solicitada) ? solicitada : 'resumen';
  const cambiar = useCallback((nueva) => {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (nueva === 'resumen') siguientes.delete('seccion');
      else siguientes.set('seccion', nueva);
      return siguientes;
    }, { replace: true });
  }, [setParametros]);
  return [vista, cambiar];
}
