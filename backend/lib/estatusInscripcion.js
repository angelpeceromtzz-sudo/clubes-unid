/**
 * Catálogo de estatus de inscripción.
 * Fuente de verdad: tabla `cat_estatus_inscripciones` (schema.sql:38-45).
 *   1 = 'activo'  — inscripción vigente
 *   2 = 'baja'    — usuario dado de baja del club
 */
export const ESTATUS_INSCRIPCION = {
  ACTIVO: 1,
  BAJA: 2,
};
