export function fechaEventoValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < '0001-01-01') return false;
  const valor = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

export function errorPeriodoEvento(inicio, fin) {
  if (fin == null || fin === '') return null;
  if (!fechaEventoValida(fin)) return 'Fecha de fin no válida';
  if (!fechaEventoValida(inicio)) return 'La fecha de inicio es obligatoria';
  if (fin < inicio) return 'La fecha de fin no puede ser anterior al inicio';
  return null;
}

export function hoyEnCampus(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora);
  const fecha = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${fecha.year}-${fecha.month}-${fecha.day}`;
}

export function fechaMaximaEvento(hoy = hoyEnCampus()) {
  const [anio, mes, dia] = hoy.split('-').map(Number);
  const anioLimite = anio + 2;
  const ultimoDia = new Date(Date.UTC(anioLimite, mes, 0)).getUTCDate();
  return `${anioLimite}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

export function errorProgramacionEvento(inicio, fin, { hoy = hoyEnCampus(), inicioOriginal, finOriginal } = {}) {
  if (!fechaEventoValida(inicio)) return 'Fecha de inicio no válida';
  const errorPeriodo = errorPeriodoEvento(inicio, fin);
  if (errorPeriodo) return errorPeriodo;
  const maxima = fechaMaximaEvento(hoy);
  for (const [fecha, original, etiqueta] of [[inicio, inicioOriginal, 'La fecha de inicio'], [fin, finOriginal, 'La fecha de fin']]) {
    if (!fecha || fecha === original) continue;
    if (fecha < hoy) return `${etiqueta} no puede ser anterior a hoy`;
    if (fecha > maxima) return `${etiqueta} no puede estar a más de dos años de hoy`;
  }
  return null;
}
