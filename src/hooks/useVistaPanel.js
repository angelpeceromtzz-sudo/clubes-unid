import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const aplanarElementos = (elementos) =>
  elementos.flatMap((item) => (item.children ? [item, ...item.children] : [item]));

export function useVistaPanel(elementos, vistaInicial = 'resumen') {
  const [parametros, setParametros] = useSearchParams();
  const solicitada = parametros.get('seccion');
  const elementosPlanos = aplanarElementos(elementos);
  const equivalente = solicitada === 'actividades' && elementosPlanos.some((item) => item.key === 'clubes') ? 'clubes' : solicitada;
  const vista = elementosPlanos.some((item) => item.key === equivalente) ? equivalente : vistaInicial;
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
