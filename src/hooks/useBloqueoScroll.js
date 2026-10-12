import { useEffect } from 'react';

/**
 * Bloquea el scroll del documento mientras `activo` sea true.
 *
 * Guarda y restaura el `overflow` previo de `html` y `body` (aplicarlo solo a
 * `body` no siempre detiene el scroll, porque el scroller real es el `html`).
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
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      html.style.overflow = previo.htmlOverflow;
      body.style.overflow = previo.bodyOverflow;
      body.style.paddingRight = previo.bodyPaddingRight;
    };
  }, [activo]);
}
