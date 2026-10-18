// Validación de identificadores numéricos enteros positivos (auditoría H13).
// Los parámetros de ruta llegan como string: sin esta validación, un valor
// no numérico llega al motor de PostgreSQL (`WHERE id = 'abc'`) y produce
// un error de casteo que el handler devuelve como 500 en vez de 400.
// Se admite de 1 a 15 dígitos sin ceros a la izquierda, dentro del rango
// seguro de enteros de JavaScript.

export function esIdEntero(valor) {
  if (typeof valor === 'number') {
    return Number.isSafeInteger(valor) && valor > 0;
  }
  if (typeof valor !== 'string') {
    return false;
  }
  if (!/^[1-9]\d{0,14}$/.test(valor)) {
    return false;
  }
  return Number.isSafeInteger(Number(valor));
}

// Nombres de parámetros de ruta que siempre identifican un registro por id
// numérico. `slug` queda fuera a propósito: los identificadores opacos de las
// encuestas públicas son cadenas, no enteros (H13).
const PARAMS_IDS_ENTEROS = ['id', 'id_club', 'idClub', 'clubId', 'userId', 'idPregunta'];

// Registra una validación por defecto en el router: cualquier ruta que declare
// uno de estos parámetros responde 400 si el valor no es un entero positivo,
// antes de que llegue a los handlers y a PostgreSQL. Un `router.param` corre
// antes de la cadena de middleware de la ruta; si el router declara un
// `router.use(authenticate...)` previo, ese use corre primero (por eso en
// estadísticas la sesión se valida antes que el parámetro).
export function validarParamsEnteros(router) {
  for (const nombre of PARAMS_IDS_ENTEROS) {
    router.param(nombre, (req, res, next, valor) => {
      if (!esIdEntero(valor)) {
        return res.status(400).json({ error: `${nombre} inválido` });
      }
      next();
    });
  }
}
