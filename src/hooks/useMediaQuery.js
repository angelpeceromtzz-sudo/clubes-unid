/* Suscripción a una media query del navegador.
 *
 * Se usa para adaptar la barra del editor al ancho disponible: en escritorio
 * las acciones de lectura van en línea y en móvil se agrupan en el menú
 * secundario. Con CSS se resolvería con `hidden sm:flex`, pero el menú necesita
 * saber cuántos ítems tiene para no mostrarse vacío, y eso ya depende del
 * JavaScript.
 *
 * Se usa `useSyncExternalStore` porque la media query es un estado externo:
 * la propia API se encarga de suscribirse, de leer el valor actual y de
 * mantenerlo al día sin efectos que fijen el estado a mano.
 */
import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(consulta) {
  const suscribir = useCallback(
    (alCambiar) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener('change', alCambiar);

      return () => mq.removeEventListener('change', alCambiar);
    },
    [consulta]
  );

  const leer = useCallback(() => window.matchMedia(consulta).matches, [consulta]);

  return useSyncExternalStore(suscribir, leer, leer);
}
