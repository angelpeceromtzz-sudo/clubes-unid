import { useEffect } from 'react';

/**
 * Bloquea el scroll del documento mientras `activo` sea true.
 *
 * El bloqueo se aplica SOLO a `html` (el overflow de la raíz se propaga al
 * viewport, que es el scroller real). No se debe fijar `overflow` en `body`:
 * cuando `html` ya está oculto, la propiedad de `body` deja de propagarse y
 * el body se vuelve un scrollport propio con `scrollTop` 0, lo que desancla
 * los elementos `position: sticky` del layout (el header saltaba a la cima
 * del documento y, en oscuro, el `backdrop-filter` del header arrastraba el
 * modal del menú fuera de pantalla).
 * Compensa el ancho de la barra de scroll con `padding-right` para que el
 * contenido no salte al desaparecer.
 */
export function useBloqueoScroll(activo) {
  useEffect(() => {
    if (!activo) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollbar = window.innerWidth - html.clientWidth;
    const previo = {
      htmlOverflow: html.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      html.style.overflow = previo.htmlOverflow;
      body.style.paddingRight = previo.bodyPaddingRight;
    };
  }, [activo]);
}
