import { SNAP_MINUTES } from '../constants/horario';

export function horaStr(h) {
  return h?.slice(0, 5) || '00:00';
}

export function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function snapMinutesDown(minutes) {
  return Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function snapMinutesNearest(minutes) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function yToMinutes(y, rowHeight, horaMin) {
  const raw = (y / rowHeight) * 60 + horaMin * 60;
  return Math.max(0, snapMinutesDown(raw));
}

export function hayConflicto(dia, inicio, fin, excludeId, horarios) {
  return horarios.some(h =>
    h.id_horario !== excludeId &&
    h.dia_semana === dia &&
    timeToMinutes(h.hora_inicio) < fin &&
    timeToMinutes(h.hora_fin) > inicio
  );
}
