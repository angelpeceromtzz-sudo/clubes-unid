// Constantes del módulo de encuestas (PBI-10).
//
// Los tipos salen de `chk_pregunta_tipo` en el esquema y de `TIPOS_VALIDOS` en
// backend/routes/encuestas.js. Si el esquema gana un tipo nuevo (los de la
// entrega 2: numero, ranking, Likert) hay que agregarlo aquí y en el backend a
// la vez, o el panel deja de poder crear ese tipo mientras la API ya lo acepta.
export const TIPOS_PREGUNTA = {
  OPCION_UNICA: 'opcion_unica',
  OPCION_MULTIPLE: 'opcion_multiple',
  TEXTO_CORTO: 'texto_corto',
  TEXTO_LARGO: 'texto_largo',
  ESCALA: 'escala',
  LICENCIATURA: 'licenciatura',
};

// Etiquetas para el <select> del editor. Se guardan en el orden en que el admin
// las va a necesitar: primero las que no llevan nada que configurar, y la
// escala al final porque es la única con un bloque extra (rango y extremos).
export const TIPOS_PREGUNTA_ETIQUETA = [
  { value: 'texto_corto', label: 'Texto corto' },
  { value: 'texto_largo', label: 'Texto largo' },
  { value: 'opcion_unica', label: 'Opción única' },
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'escala', label: 'Escala numérica' },
];

// Los únicos dos que llevan lista de opciones editable. `escala` tiene un rango,
// no una lista, y `licenciatura` sus opciones salen del catálogo
// `cat_licenciaturas`, no de la tabla `opciones_pregunta`: ninguno de los dos
// entra aquí. Es la confusión más fácil de tener al escribir el editor.
export const TIPOS_CON_OPCIONES = ['opcion_unica', 'opcion_multiple'];

// Techos de la UI. Deben coincidir con los del backend, que es quien los
// revisa de verdad; estos son sólo para no dejar escribir de más y tener que
// esperar el 400.
export const MAX_OPCIONES_POR_PREGUNTA = 30;
export const MAX_PREGUNTAS_POR_ENCUESTA = 60;
export const MAX_CARACTERES_TEXTO_LARGO = 2000;
export const MAX_CARACTERES_TEXTO_CORTO = 200;

export function etiquetaTipoPregunta(tipo) {
  return TIPOS_PREGUNTA_ETIQUETA.find((t) => t.value === tipo)?.label ?? tipo;
}

// Una pregunta de opción necesita al menos dos para que una respuesta signifique
// algo. El backend lo rechaza con 400, así que el formulario ni lo envía.
export const MIN_OPCIONES_POR_PREGUNTA = 2;
