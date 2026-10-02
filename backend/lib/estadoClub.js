/**
 * Calcula el estado dinámico de un club basándose en fechas programadas,
 * conteo de postulaciones y cierre manual.
 *
 * IMPORTANTE: Esta lógica debe coincidir EXACTAMENTE con la VIEW
 * `clubes_con_estado` definida en la migración más reciente.
 * Si cambias una regla aquí, cámbiala también allá, y viceversa.
 *
 * Prioridad de estados (la primera que aplica gana):
 *   1. 'cerrado'  — cerrada_manualmente es TRUE (cierre forzado por presidente)
 *   2. 'proximo'  — fecha_apertura_programada no es NULL y NOW() < apertura
 *   3. 'lleno'    — max_postulaciones no es NULL y postulaciones >= max_postulaciones
 *   4. 'cerrado'  — fecha_limite_cierre no es NULL y NOW() > cierre
 *   5. 'cerrado'  — fecha_apertura_programada es NULL (sin programar)
 *   6. 'abierto'  — apertura alcanzada, sin otras restricciones activas
 */
export function calcularEstadoClub({
  cerradaManualmente,
  fechaAperturaProgramada,
  fechaLimiteCierre,
  maxPostulaciones,
  postulacionesActuales,
}) {
  const now = new Date();

  if (cerradaManualmente === true) {
    return 'cerrado';
  }

  if (fechaAperturaProgramada && now < new Date(fechaAperturaProgramada)) {
    return 'proximo';
  }

  if (maxPostulaciones !== null && maxPostulaciones !== undefined
      && postulacionesActuales >= maxPostulaciones) {
    return 'lleno';
  }

  if (fechaLimiteCierre && now > new Date(fechaLimiteCierre)) {
    return 'cerrado';
  }

  if (!fechaAperturaProgramada) {
    return 'cerrado';
  }

  return 'abierto';
}
