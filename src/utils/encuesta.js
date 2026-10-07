/* Utilidades de presentación del módulo de encuestas.
 *
 * Vive aquí y no en cada componente porque el enlace público se necesita en
 * tres sitios (editor, QR y lista) y la fecha de vigencia en dos. Duplicar la
 * construcción de la URL tres veces es la forma rápida de que una de las copias
 * se quede con la versión vieja cuando `VITE_PUBLIC_URL` cambie.
 */

/**
 * Enlace público de una encuesta.
 *
 * El dominio sale de `VITE_PUBLIC_URL` cuando está definida y de
 * `window.location.origin` si no. La alternativa a localhost importa: un QR o un
 * enlace con `localhost` abre bien en el equipo del admin y no abre nada en el
 * teléfono de al lado, y eso sólo se descubre después de imprimirlo o de
 *mandarlo. Es opcional justamente para no obligar a definirla en desarrollo,
 * donde sí se quiere localhost.
 */
export function enlacePublicoEncuesta(slug) {
  if (!slug) return '';

  const origenPublico = import.meta.env.VITE_PUBLIC_URL?.replace(/\/+$/, '');

  return `${origenPublico || window.location.origin}/encuesta/${slug}`;
}

/** El enlace apunta a localhost y no va a funcionar en otro dispositivo. */
export function enlaceEsLocalhost(slug) {
  const enlace = enlacePublicoEncuesta(slug);

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(enlace);
}

/**
 * Texto de vigencia de una encuesta para la fila del listado.
 *
 * Dice una sola cosa según el estado, para que la fila se lea de un vistazo:
 * si nunca se publicó, si le queda tiempo o si ya no admite respuestas.
 *
 * El caso de "publicada pero vencida" se separa del de "cerrada" a propósito. Son
 * estados distintos en la base y producen pantallas distintas en el enlace
 * público, así que la fila tiene que distinguirlos: si los dos dijeran "cerrada",
 * el admin no vería en el listado que su encuesta sigue marcada como publicada y
 * por eso el enlace devuelve 410.
 */
export function textoVigenciaEncuesta(encuesta) {
  if (!encuesta) return '';

  if (encuesta.estado === 'borrador') return 'sin publicar';

  if (encuesta.estado === 'cerrada') {
    return encuesta.fecha_fin
      ? `cerrada el ${formatearDia(encuesta.fecha_fin)}`
      : 'cerrada';
  }

  // Publicada sin fecha de cierre: sigue abierta indefinidamente.
  if (!encuesta.fecha_fin) return 'abierta sin fecha de cierre';

  const dias = diasRestantes(encuesta.fecha_fin);

  // `dias` nunca llega negativo: `diasRestantes` ya redondea, pero el clamp
  // deja el contrato explícito y evita un "-3 días" si mañana cambia el cálculo.
  if (dias < 0) return `venció el ${formatearDia(encuesta.fecha_fin)}`;
  if (dias === 0) return 'cierra hoy';
  if (dias === 1) return 'cierra mañana';

  return `cierra en ${dias} días`;
}

/**
 * Si tiene sentido ofrecer el enlace público de una encuesta.
 *
 * El enlace no sirve para todo estado, y mandarlo en los que no funciona es peor
 * que no ofrecerlo:
 *
 * - `borrador`: el backend filtra por `estado = 'publicada'`, así que responde
 *   404 y no se puede repartir todavía.
 * - `cerrada`: mismo 404. El alumno vería "Revisa el enlace que te compartieron.
 *   Es posible que esté mal copiado", que es un mensaje falso: el enlace estaba
 *   bien, lo que pasó es que se cerró.
 * - `publicada` vencida sí se muestra, porque ahí el alumno recibe un 410 con un
 *   mensaje claro ("Esta encuesta ya se cerró") en lugar de un error genérico.
 */
export function enlacePublicoUtilizable(encuesta) {
  if (!encuesta) return false;
  if (encuesta.estado === 'borrador') return false;
  if (encuesta.estado === 'cerrada') return false;

  return true;
}

/**
 * El número que lleva cada pregunta en pantalla, o `null` si va sin número.
 *
 * La pregunta de tipo 'licenciatura' no se numera: es un dato de contexto (qué
 * programa estudias), no una pregunta que el alumno tenga que contar. Pero el
 * contador NO avanza con ella, y esa es la parte que importa: si avanzara, un
 * alumno que ve la licenciatura primero leería "2.", "3.", "4." en lo que para él
 * es su primera pregunta.
 *
 * Vive aquí y no copiado en las dos pantallas que lo pintan (el formulario
 * público y la vista previa del panel) porque la vista previa no puede quedar
 * desfasada del formulario real: si las dos numeraran distinto, el admin
 * aprobaría un orden que el alumno no ve igual.
 *
 * @param {{tipo: string}[]} preguntas Ya ordenadas por `orden`.
 * @returns {(number|null)[]} Una entrada por pregunta, en el mismo orden.
 */
export function numerosVisibles(preguntas) {
  let vistas = 0;

  return (preguntas ?? []).map((p) => {
    if (p.tipo === 'licenciatura') return null;
    vistas += 1;
    return vistas;
  });
}

/** Días enteros que faltan para una fecha, contando el de hoy como 0. */
function diasRestantes(fecha) {
  const objetivo = new Date(fecha);
  if (Number.isNaN(objetivo.getTime())) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  objetivo.setHours(0, 0, 0, 0);

  return Math.round((objetivo - hoy) / 86400000);
}

function formatearDia(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}