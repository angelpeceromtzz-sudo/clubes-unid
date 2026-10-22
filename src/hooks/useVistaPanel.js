import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useVistaPanel(elementos, vistaInicial = 'resumen') {
  const [parametros, setParametros] = useSearchParams();
  const solicitada = parametros.get('seccion');
  const vista = elementos.some((item) => item.key === solicitada) ? solicitada : vistaInicial;
  const cambiar = useCallback((nueva) => {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (nueva === vistaInicial) siguientes.delete('seccion');
      else siguientes.set('seccion', nueva);
      return siguientes;
    }, { replace: true });
  }, [setParametros, vistaInicial]);
  return [vista, cambiar];
}
