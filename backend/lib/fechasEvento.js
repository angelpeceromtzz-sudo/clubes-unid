export function fechaEventoValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
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
