export function fechaHoyCampus() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const fecha = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${fecha.year}-${fecha.month}-${fecha.day}`;
}

export function calcularTiempoRestante(fechaExpiracion) {
  if (!fechaExpiracion) return null;
  const ahora = new Date();
  const exp = new Date(fechaExpiracion);
  const diff = exp - ahora;
  if (diff <= 0) return 'Expirada';

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''}`;
  if (horas > 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
  return 'Menos de 1 hora';
}

export function formatearFechaLegible(fechaIso) {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

export function toDatetimeLocal(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

// --- Helpers de fecha/hora para el módulo de Asistencia ---
// Las fechas llegan del backend como 'YYYY-MM-DD'; se parsean por partes
// para no depender de la zona horaria del navegador.

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function aPartes(fechaISO) {
  const [y, m, d] = String(fechaISO).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// 'jueves 15 de octubre'
export function fechaLarga(fechaISO) {
  const f = aPartes(fechaISO);
  return `${DIAS_SEMANA[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
}

// 'jue 15 oct'
export function fechaCorta(fechaISO) {
  const f = aPartes(fechaISO);
  return `${DIAS_CORTOS[f.getDay()]} ${f.getDate()} ${MESES_CORTOS[f.getMonth()]}`;
}

// '16:00:00' -> '4:00 p. m.'
export function hora12(hora) {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

// '16:00:00' + '18:00:00' -> '4:00 – 6:00 p. m.'
export function rangoHoras(horaInicio, horaFin) {
  const ini = String(horaInicio).slice(0, 5).split(':').map(Number);
  const fin = String(horaFin).slice(0, 5).split(':').map(Number);
  const sufijo = ini[0] >= 12 ? 'p. m.' : 'a. m.';
  const h12 = (h) => (h % 12 || 12);
  return `${h12(ini[0])}:${String(ini[1]).padStart(2, '0')} – ${h12(fin[0])}:${String(fin[1]).padStart(2, '0')} ${sufijo}`;
}

// '17:48:42.109Z' -> '5:48 p. m.' (hora local del navegador)
export function horaDesdeTimestamp(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  return hora12(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`);
}
