export const ESTADO_CONVOCATORIA = {
  ABIERTO: 'abierto',
  PROXIMO: 'proximo',
  LLENO: 'lleno',
  CERRADO: 'cerrado',
};

export const ESTATUS_FORMULARIO = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  CANCELADO: 'cancelado',
};

// Estado de una encuesta (PBI-10). Son exactamente los tres valores que acepta
// `chk_encuesta_estado` en el esquema y que el backend contrasta contra esa
// misma lista en `PUT /admin/:id`: agregar uno aquí sin tocar el CHECK haría que
// el panel mandara un estado que el servidor rechaza con 400.
export const ESTADO_ENCUESTA = {
  BORRADOR: 'borrador',
  PUBLICADA: 'publicada',
  CERRADA: 'cerrada',
};

// Texto y color del badge. Sin esto el listado del admin mostraría el VARCHAR
// crudo; el color separa de un vistazo lo que está abierto de lo que ya cerró,
// que es la diferencia que importa al revisar una encuesta con respuestas.
export const ESTADO_ENCUESTA_INFO = {
  [ESTADO_ENCUESTA.BORRADOR]: { etiqueta: 'Borrador', color: 'slate' },
  [ESTADO_ENCUESTA.PUBLICADA]: { etiqueta: 'Publicada', color: 'emerald' },
  [ESTADO_ENCUESTA.CERRADA]: { etiqueta: 'Cerrada', color: 'amber' },
};

// Orden del <select> de filtrado. Deliberadamente no es el de ESTADO_ENCUESTA:
// el admin revisa de lo más reciente a lo más viejo, así que "Borrador" (lo que
// está armando) va primero aunque sea el estado intermedio del ciclo de vida.
export const ORDEN_ESTADO_ENCUESTA = [
  ESTADO_ENCUESTA.BORRADOR,
  ESTADO_ENCUESTA.PUBLICADA,
  ESTADO_ENCUESTA.CERRADA,
];

// Traduce el estado que llega de la API a { etiqueta, color } para el <Badge>.
// Ante un valor desconocido devuelve el texto tal cual en color neutro: si el
// esquema suma un estado y esta tabla se queda corta, el listado se sigue
// pintando en vez de reventar el render del panel entero.
export function infoEstadoEncuesta(estado) {
  return ESTADO_ENCUESTA_INFO[estado] ?? { etiqueta: estado ?? '—', color: 'slate' };
}
