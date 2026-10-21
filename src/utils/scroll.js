/* Utilidades de desplazamiento del editor de encuestas.
 *
 * El editor es un panel con su propio scroll: dentro de él, la barra
 * contextual y las pestañas quedan fijas y lo que se mueve es el contenido de
 * la pestaña. Por eso, cuando hay que dejar algo a la vista (la pregunta que
 * se acaba de guardar, el campo que falta para publicar), se desplaza el
 * contenedor del editor y no la página entera.
 *
 * `scrollIntoView` no sirve aquí: además de mover el contenedor, mueve también
 * la ventana, y en el panel de administración eso se lleva la barra contextual
 * fuera de la vista.
 */

/** El ancestro más cercano que tiene scroll vertical propio. */
function contenedorDesplazable(elemento) {
  let nodo = elemento?.parentElement;

  while (nodo) {
    const estilo = getComputedStyle(nodo);
    if (/(auto|scroll)/.test(estilo.overflowY)) return nodo;
    nodo = nodo.parentElement;
  }

  return null;
}

/**
 * Deja `elemento` a la vista, centrado en su contenedor con scroll.
 *
 * Si no hay ningún contenedor con scroll (por ejemplo, en la lista de
 * encuestas, que se recorre con la página), se usa `scrollIntoView`.
 */
export function centrarEnSuContenedor(elemento, { suave = true } = {}) {
  if (!elemento) return;

  const contenedor = contenedorDesplazable(elemento);

  if (!contenedor) {
    elemento.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
    return;
  }

  const caja = elemento.getBoundingClientRect();
  const marco = contenedor.getBoundingClientRect();
  const delta = (caja.top - marco.top) - (marco.height - caja.height) / 2;

  contenedor.scrollBy({ top: delta, behavior: suave ? 'smooth' : 'auto' });
}

/**
 * Deja `elemento` a la vista desplazando lo mínimo.
 *
 * A diferencia de `centrarEnSuContenedor`, aquí no se busca el centro: sólo
 * que el elemento se vea. `margenSuperior` son los píxeles que deben quedar
 * por encima del elemento (por ejemplo, la altura de la barra fija del
 * editor, para que la tarjeta no quede tapada por ella).
 */
export function revelarEnSuContenedor(elemento, { margenSuperior = 0, suave = true } = {}) {
  if (!elemento) return;

  const contenedor = contenedorDesplazable(elemento);

  if (!contenedor) {
    elemento.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
    return;
  }

  const caja = elemento.getBoundingClientRect();
  const marco = contenedor.getBoundingClientRect();

  // Distancia del borde superior del elemento al borde superior del hueco
  // visible (negativo = está por encima, tapado por la barra fija).
  const arriba = caja.top - marco.top;
  // Distancia del borde inferior del elemento al borde inferior del hueco.
  const abajo = caja.bottom - marco.bottom;

  let destino = contenedor.scrollTop;

  if (arriba < margenSuperior) {
    // Está por encima (o justo bajo la barra fija): se sube lo justo.
    destino += arriba - margenSuperior;
  } else if (abajo > 0) {
    // Está por debajo del hueco visible: se baja lo justo.
    destino += abajo;
  } else if (caja.height <= marco.height - margenSuperior) {
    // Ya se ve entera: no se mueve nada.
    return;
  } else {
    // Es más alta que el hueco: se alinea arriba para que su parte de
    // arriba quede a la vista.
    destino += arriba - margenSuperior;
  }

  contenedor.scrollTo({ top: destino, behavior: suave ? 'smooth' : 'auto' });
}

