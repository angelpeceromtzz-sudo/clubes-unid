// Zona horaria institucional de Clubs UNID — Campeche, México.
// Fuente única de verdad para backend, frontend y base de datos.
// Backend es la autoridad para restricciones de fechas y permisos de modificación.
export const TIMEZONE_IANA = 'America/Merida';

const fmtFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_IANA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Devuelve la fecha institucional actual como 'YYYY-MM-DD'
export function getFechaInstitucional() {
  return fmtFecha.format(new Date());
}

// Normaliza cualquier valor de fecha (Date de pg, string 'YYYY-MM-DD', etc.) a 'YYYY-MM-DD'
export function aFechaISO(valor) {
  if (valor instanceof Date) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(valor).slice(0, 10);
}

// Compara una fecha de sesión con la fecha institucional de hoy
export function esMismaFechaInstitucional(fechaSesion) {
  return aFechaISO(fechaSesion) === getFechaInstitucional();
}

// true si la fecha de sesión es anterior a la fecha institucional de hoy
export function esFechaPasadaInstitucional(fechaSesion) {
  return aFechaISO(fechaSesion) < getFechaInstitucional();
}
