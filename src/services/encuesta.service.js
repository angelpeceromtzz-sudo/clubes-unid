import { request } from './api-core';

// Encuestas (PBI-10).
//
// Las dos funciones públicas se llaman sin sesión. `request` sólo adjunta el
// Authorization si hay un token en localStorage, así que desde un navegador con
// sesión iniciada el token sí viaja; es inofensivo porque el backend de
// /publico/* no lo mira. Lo que no se hace en ningún caso es confiar en él.
export const encuestaService = {
  // --- público ---
  obtenerPublica: (slug) => request(`/encuestas/publico/${slug}`),
  enviarRespuestas: (slug, payload) =>
    request(`/encuestas/publico/${slug}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- admin ---
  listar: () => request('/encuestas/admin'),
  obtener: (id) => request(`/encuestas/admin/${id}`),
  crear: (data) =>
    request('/encuestas/admin', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id, data) =>
    request(`/encuestas/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id) => request(`/encuestas/admin/${id}`, { method: 'DELETE' }),

  crearPregunta: (idEncuesta, data) =>
    request(`/encuestas/admin/${idEncuesta}/preguntas`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  actualizarPregunta: (idPregunta, data) =>
    request(`/encuestas/admin/preguntas/${idPregunta}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  eliminarPregunta: (idPregunta) =>
    request(`/encuestas/admin/preguntas/${idPregunta}`, { method: 'DELETE' }),
  actualizarOpciones: (idPregunta, opciones) =>
    request(`/encuestas/admin/preguntas/${idPregunta}/opciones`, {
      method: 'PUT',
      body: JSON.stringify({ opciones }),
    }),

  // Agregados ya calculados por el backend: distribución por opción, eje de
  // escala con su promedio, muestra de textos y el desglose por programa. El
  // panel no recalcula nada de esto, porque los porcentajes de opción múltiple
  // tienen una base particular (los respondientes, no el total) que es más
  // fácil equivocarse en el cliente que en el servidor.
  obtenerResultados: (id) => request(`/encuestas/admin/${id}/resultados`),

  // Guarda el orden de las preguntas de una encuesta. Se manda el arreglo
  // completo de ids en el orden deseado, no "sube la 2" o "baja la 4": con dos
  // personas editando a la vez el segundo formato aplicaría un movimiento sobre
  // una lista que ya cambió, y el arreglo completo no deja lugar a eso.
  reordenarPreguntas: (idEncuesta, ids) =>
    request(`/encuestas/admin/${idEncuesta}/preguntas/orden`, {
      method: 'PUT',
      body: JSON.stringify({ orden: ids }),
    }),

  // Orden de las opciones. Va aparte del reemplazo de la lista completa porque
  // ese borra las opciones y las recrea con ids nuevos, lo que el servidor
  // rechaza en cuanto la pregunta tiene respuestas.
  reordenarOpciones: (idPregunta, ids) =>
    request(`/encuestas/admin/preguntas/${idPregunta}/opciones/orden`, {
      method: 'PUT',
      body: JSON.stringify({ orden: ids }),
    }),

  // Clona encuesta, preguntas y opciones. Las respuestas no se copian y la copia
  // nace en borrador: es la forma de repetir la misma encuesta otro semestre sin
  // que los agregados mezclen dos poblaciones.
  duplicar: (idEncuesta) =>
    request(`/encuestas/admin/${idEncuesta}/duplicar`, { method: 'POST' }),
};

// Catálogos de solo lectura.
export const catalogoService = {
  getLicenciaturas: () => request('/catalogos/licenciaturas'),

  // Invalida el catálogo que el backend tiene cacheado en memoria (10 minutos de
  // TTL) sin esperar a que expire. Es justo lo que faltaba para que la ruta
  // `POST /catalogos/licenciaturas/cache` fuera alcanzable desde la app.
  //
  // Dos advertencias: la ruta exige rol 3, así que este método sólo funciona con
  // sesión de admin, y sólo tiene sentido si algo acaba de cambiar el catálogo.
  invalidarLicenciaturas: () =>
    request('/catalogos/licenciaturas/cache', { method: 'POST' }),
};
