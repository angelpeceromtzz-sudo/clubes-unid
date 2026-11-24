// Reglas puras del onboarding de preferencias. Sin React ni red: el flujo las
// usa para mantener coherentes las respuestas y para construir el PUT.
// La validación del backend (routes/preferencias.js) sigue siendo la autoridad;
// estas reglas solo dan retroalimentación inmediata.

export const LONGITUD_PROPUESTA = Object.freeze({ min: 3, max: 80 });
const CARACTERES_PROPUESTA = /^[\p{L}\p{N} .,'&()/-]+$/u;

export const TIPOS_CORREO = Object.freeze([
  'clubes_convocatorias',
  // El backend mantiene esta clave histórica, aunque ya no se ofrece como
  // preferencia visible. Los avisos del club usan sus notificaciones internas.
  'mis_clubes',
  'eventos',
  'noticias',
  'recordatorios',
]);

export const FRECUENCIAS_CORREO = Object.freeze(['inmediata', 'diaria', 'semanal']);

export function correoInicial() {
  return {
    decision: null,
    activo: false,
    frecuencia: 'inmediata',
    tipos: Object.fromEntries(TIPOS_CORREO.map((tipo) => [tipo, false])),
  };
}

export function respuestasIniciales() {
  return {
    categorias: [],
    actividades: [],
    motivaciones: [],
    genero: null,
    correo: correoInicial(),
    propuesta: '',
    licenciatura: null,
    fechaNacimiento: null,
    disposicion: null,
    telefono: null,
    actividadesResponsable: [],
  };
}

export function limpiarPropuesta(texto) {
  return texto
    .normalize('NFC')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devuelve null si la propuesta es válida o un mensaje para mostrar.
export function errorPropuesta(texto) {
  const limpio = limpiarPropuesta(texto);
  if (limpio === '') return null;
  const longitud = [...limpio].length;
  if (longitud < LONGITUD_PROPUESTA.min || longitud > LONGITUD_PROPUESTA.max) {
    return `La propuesta debe tener entre ${LONGITUD_PROPUESTA.min} y ${LONGITUD_PROPUESTA.max} caracteres.`;
  }
  if (!CARACTERES_PROPUESTA.test(limpio) || !/\p{L}/u.test(limpio)) {
    return 'La propuesta contiene caracteres no permitidos.';
  }
  return null;
}

// Indica si un paso del onboarding tiene una respuesta válida. Se usa tanto
// para deshabilitar el botón Continuar como para validar antes de avanzar.
export function pasoEsValido(paso, respuestas) {
  if (!respuestas) return false;
  if (paso === 1) return Array.isArray(respuestas.categorias) && respuestas.categorias.length > 0;
  if (paso === 2) {
    const tieneActividad = Array.isArray(respuestas.actividades) && respuestas.actividades.length > 0;
    const propuesta = typeof respuestas.propuesta === 'string' ? respuestas.propuesta.trim() : '';
    const propuestaValida = propuesta !== '' && errorPropuesta(propuesta) === null;
    return tieneActividad || propuestaValida;
  }
  if (paso === 3) return Array.isArray(respuestas.motivaciones) && respuestas.motivaciones.length > 0;
  if (paso === 4) return respuestas.genero !== null && respuestas.genero !== undefined;
  if (paso === 5) return respuestas.licenciatura !== null && respuestas.licenciatura !== undefined;
  if (paso === 6) return !!respuestas.fechaNacimiento;
  if (paso === 7) return respuestas.disposicion !== null && respuestas.disposicion !== undefined;
  if (paso === 8) return /^\d{10}$/.test(respuestas.telefono || '');
  if (paso === 9) {
    if (respuestas.disposicion !== 'responsable') return true;
    return Array.isArray(respuestas.actividadesResponsable) && respuestas.actividadesResponsable.length > 0;
  }
  if (paso === 10) {
    const decision = respuestas.correo?.decision;
    if (decision !== 'aceptar' && decision !== 'rechazar') return false;
    if (decision === 'aceptar') {
      const tipos = respuestas.correo?.tipos || {};
      return Object.values(tipos).some((v) => v === true);
    }
    return true;
  }
  return true;
}

export function alternarElemento(lista, id) {
  return lista.includes(id) ? lista.filter((item) => item !== id) : [...lista, id];
}

// Al quitar una categoría se retiran también sus actividades. Devuelve la
// nueva selección y cuántas actividades se quitaron, para comunicarlo.
export function alternarCategoria(respuestas, idCategoria, actividadesCatalogo) {
  const yaSeleccionada = respuestas.categorias.includes(idCategoria);
  const categorias = alternarElemento(respuestas.categorias, idCategoria);
  if (!yaSeleccionada) {
    return { categorias, actividades: respuestas.actividades, quitadas: 0 };
  }
  const idsDeCategoria = new Set(
    actividadesCatalogo.filter((a) => a.id_categoria === idCategoria).map((a) => a.id),
  );
  const actividades = respuestas.actividades.filter((id) => !idsDeCategoria.has(id));
  return {
    categorias,
    actividades,
    quitadas: respuestas.actividades.length - actividades.length,
  };
}

export function actividadesDeCategorias(actividadesCatalogo, categorias) {
  const seleccionadas = new Set(categorias);
  return actividadesCatalogo.filter((a) => seleccionadas.has(a.id_categoria));
}

export function construirPayload(respuestas, origen) {
  const propuesta = limpiarPropuesta(respuestas.propuesta);
  return {
    origen,
    categorias: [...respuestas.categorias],
    actividades: [...respuestas.actividades],
    motivaciones: [...respuestas.motivaciones],
    genero: respuestas.genero ?? null,
    disposicion_responsable: respuestas.disposicion ?? null,
    telefono_contacto: respuestas.telefono ?? null,
    actividades_responsable: respuestas.disposicion === 'responsable' ? [...respuestas.actividadesResponsable] : [],
    correo: {
      activo: respuestas.correo.decision === 'aceptar',
      frecuencia: respuestas.correo.frecuencia,
      tipos: Object.fromEntries(TIPOS_CORREO.map((tipo) => [tipo, respuestas.correo.tipos[tipo] === true])),
    },
    propuestas: propuesta ? [propuesta] : [],
  };
}
