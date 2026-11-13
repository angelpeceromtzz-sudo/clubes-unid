// Validación y lógica pura del onboarding de preferencias. Sin acceso a base
// de datos: las rutas cargan el catálogo y ejecutan las escrituras.
import { TIPOS_CORREO_OPCIONAL, FRECUENCIAS_CORREO } from './preferenciasCorreo.js';

export const GENEROS = Object.freeze(['mujer', 'hombre', 'otra_identidad', 'prefiero_no_responder']);
export const ORIGENES = Object.freeze(['onboarding', 'perfil']);
export const ESTADOS_ONBOARDING = Object.freeze(['pendiente', 'completado', 'omitido']);

export const MAX_PROPUESTAS_POR_ENVIO = 3;
export const MAX_PROPUESTAS_PENDIENTES = 10;
export const MAX_CATEGORIAS = 10;
export const MAX_ACTIVIDADES = 100;
export const MAX_MOTIVACIONES = 20;

const LONGITUD_PROPUESTA_MIN = 3;
const LONGITUD_PROPUESTA_MAX = 80;
const CARACTERES_PROPUESTA = /^[\p{L}\p{N} .,'&()/-]+$/u;

export class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.status = 400;
  }
}

export function normalizarPropuesta(entrada) {
  if (typeof entrada !== 'string') {
    throw new ErrorValidacion('Cada propuesta debe ser texto');
  }
  const texto = entrada
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const longitud = [...texto].length;
  if (longitud < LONGITUD_PROPUESTA_MIN || longitud > LONGITUD_PROPUESTA_MAX) {
    throw new ErrorValidacion(`La propuesta debe tener entre ${LONGITUD_PROPUESTA_MIN} y ${LONGITUD_PROPUESTA_MAX} caracteres`);
  }
  if (!CARACTERES_PROPUESTA.test(texto) || !/\p{L}/u.test(texto)) {
    throw new ErrorValidacion('La propuesta contiene caracteres no permitidos');
  }
  const normalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
  return { texto, normalizado };
}

// Recibe el catálogo ya filtrado a registros activos (ver cargarCatalogoIntereses).
export function indexarCatalogo({ categorias, actividades, motivaciones }) {
  return {
    categorias: new Map(categorias.map((c) => [c.id, c])),
    actividades: new Map(actividades.map((a) => [a.id, a])),
    motivaciones: new Set(motivaciones.map((m) => m.id)),
  };
}

export async function cargarCatalogoIntereses(db) {
  const categorias = await db.query(
    `SELECT id_categoria_interes AS id, nombre, categoria_club, orden
     FROM cat_categorias_interes
     WHERE activo
     ORDER BY orden, nombre`,
  );
  const actividades = await db.query(
    `SELECT a.id_actividad AS id, a.id_categoria_interes AS id_categoria, a.nombre, a.orden
     FROM cat_actividades_interes a
     JOIN cat_categorias_interes c ON c.id_categoria_interes = a.id_categoria_interes
     WHERE a.activo AND c.activo
     ORDER BY a.id_categoria_interes, a.orden, a.nombre`,
  );
  const motivaciones = await db.query(
    `SELECT id_motivacion AS id, codigo, nombre, orden
     FROM cat_motivaciones
     WHERE activo
     ORDER BY orden, nombre`,
  );
  return {
    categorias: categorias.rows,
    actividades: actividades.rows,
    motivaciones: motivaciones.rows,
  };
}

function esEnteroPositivo(valor) {
  return Number.isSafeInteger(valor) && valor > 0;
}

function listaUnica(valor, nombre, maximo) {
  if (!Array.isArray(valor)) {
    throw new ErrorValidacion(`${nombre} debe ser una lista`);
  }
  if (valor.length > maximo) {
    throw new ErrorValidacion(`${nombre} admite como máximo ${maximo} elementos`);
  }
  if (!valor.every(esEnteroPositivo)) {
    throw new ErrorValidacion(`${nombre} contiene identificadores no válidos`);
  }
  if (new Set(valor).size !== valor.length) {
    throw new ErrorValidacion(`${nombre} contiene elementos repetidos`);
  }
  return valor;
}

function validarCorreo(correo) {
  if (!correo || typeof correo !== 'object' || Array.isArray(correo)) {
    throw new ErrorValidacion('correo debe ser un objeto');
  }
  if (typeof correo.activo !== 'boolean') {
    throw new ErrorValidacion('correo.activo debe ser verdadero o falso');
  }
  if (!FRECUENCIAS_CORREO.includes(correo.frecuencia)) {
    throw new ErrorValidacion('La frecuencia de correo no es válida');
  }
  const tipos = correo.tipos;
  if (!tipos || typeof tipos !== 'object' || Array.isArray(tipos)) {
    throw new ErrorValidacion('correo.tipos debe ser un objeto');
  }
  const claves = Object.keys(tipos);
  const esperadas = [...TIPOS_CORREO_OPCIONAL].sort();
  if (claves.length !== esperadas.length || claves.slice().sort().some((clave, i) => clave !== esperadas[i])) {
    throw new ErrorValidacion('correo.tipos debe incluir exactamente los tipos de novedades disponibles');
  }
  if (!TIPOS_CORREO_OPCIONAL.every((tipo) => typeof tipos[tipo] === 'boolean')) {
    throw new ErrorValidacion('Cada tipo de novedades debe ser verdadero o falso');
  }
  return {
    activo: correo.activo,
    frecuencia: correo.frecuencia,
    tipos: Object.fromEntries(TIPOS_CORREO_OPCIONAL.map((tipo) => [tipo, tipos[tipo]])),
  };
}

export function validarPreferencias(body, indice) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErrorValidacion('Solicitud no válida');
  }
  if (!ORIGENES.includes(body.origen)) {
    throw new ErrorValidacion('El origen de la solicitud no es válido');
  }

  const categorias = listaUnica(body.categorias, 'categorias', MAX_CATEGORIAS);
  for (const id of categorias) {
    if (!indice.categorias.has(id)) throw new ErrorValidacion('Una de las categorías no está disponible');
  }
  const seleccionadas = new Set(categorias);

  const actividades = listaUnica(body.actividades, 'actividades', MAX_ACTIVIDADES);
  for (const id of actividades) {
    const actividad = indice.actividades.get(id);
    if (!actividad) throw new ErrorValidacion('Una de las actividades no está disponible');
    if (!seleccionadas.has(actividad.id_categoria)) {
      throw new ErrorValidacion(`La actividad "${actividad.nombre}" requiere seleccionar su categoría`);
    }
  }

  const motivaciones = listaUnica(body.motivaciones, 'motivaciones', MAX_MOTIVACIONES);
  for (const id of motivaciones) {
    if (!indice.motivaciones.has(id)) throw new ErrorValidacion('Una de las motivaciones no está disponible');
  }

  const genero = body.genero ?? null;
  if (genero !== null && !GENEROS.includes(genero)) {
    throw new ErrorValidacion('La opción de género no es válida');
  }

  const correo = validarCorreo(body.correo);

  const propuestasEntrada = body.propuestas ?? [];
  if (!Array.isArray(propuestasEntrada)) {
    throw new ErrorValidacion('propuestas debe ser una lista');
  }
  if (propuestasEntrada.length > MAX_PROPUESTAS_POR_ENVIO) {
    throw new ErrorValidacion(`Puedes enviar como máximo ${MAX_PROPUESTAS_POR_ENVIO} propuestas a la vez`);
  }
  const propuestas = propuestasEntrada.map(normalizarPropuesta);
  if (new Set(propuestas.map((p) => p.normalizado)).size !== propuestas.length) {
    throw new ErrorValidacion('Hay propuestas repetidas en la solicitud');
  }

  return {
    origen: body.origen,
    categorias,
    actividades,
    motivaciones,
    genero,
    correo,
    propuestas,
  };
}

// Compara el consentimiento efectivo antes y después de un cambio. Solo genera
// filas cuando cambia lo que realmente autoriza el alumno: un tipo activo con
// el interruptor general apagado no cuenta como consentimiento.
export function calcularCambiosConsentimiento(anterior, siguiente) {
  const cambios = [];
  const efectivo = (correo, tipo) => correo.activo && correo.tipos[tipo] === true;

  if (anterior.activo !== siguiente.activo) {
    cambios.push({
      tipo: 'general',
      accion: siguiente.activo ? 'otorgado' : 'retirado',
      frecuencia: siguiente.activo ? siguiente.frecuencia : null,
    });
  } else if (siguiente.activo && anterior.frecuencia !== siguiente.frecuencia) {
    cambios.push({ tipo: 'general', accion: 'otorgado', frecuencia: siguiente.frecuencia });
  }

  for (const tipo of TIPOS_CORREO_OPCIONAL) {
    const antes = efectivo(anterior, tipo);
    const despues = efectivo(siguiente, tipo);
    if (antes !== despues) {
      cambios.push({
        tipo,
        accion: despues ? 'otorgado' : 'retirado',
        frecuencia: despues ? siguiente.frecuencia : null,
      });
    }
  }

  return cambios;
}

export const CORREO_POR_DEFECTO = Object.freeze({
  activo: false,
  frecuencia: 'inmediata',
  tipos: Object.freeze(Object.fromEntries(TIPOS_CORREO_OPCIONAL.map((tipo) => [tipo, false]))),
});

export function serializarPreferencias({ fila, categorias, actividades, motivaciones, propuestas }) {
  const correo = fila
    ? {
        activo: fila.correo_activo,
        frecuencia: fila.correo_frecuencia,
        tipos: {
          clubes_convocatorias: fila.correo_clubes_convocatorias,
          mis_clubes: fila.correo_mis_clubes,
          eventos: fila.correo_eventos,
          noticias: fila.correo_noticias,
          recordatorios: fila.correo_recordatorios,
        },
      }
    : structuredClone(CORREO_POR_DEFECTO);

  return {
    estado_onboarding: fila?.estado_onboarding ?? 'pendiente',
    genero: fila?.genero ?? null,
    categorias,
    actividades,
    motivaciones,
    correo,
    propuestas,
    actualizado_en: fila?.actualizado_en ?? null,
  };
}

export function correoDesdeFila(fila) {
  return fila
    ? serializarPreferencias({ fila, categorias: [], actividades: [], motivaciones: [], propuestas: [] }).correo
    : structuredClone(CORREO_POR_DEFECTO);
}
