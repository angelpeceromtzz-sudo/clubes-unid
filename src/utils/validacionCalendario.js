import { TIPOS_FECHA } from '../constants/tiposFecha.js';
import { fechaHoyCampus } from './fechas.js';

export const FECHA_MINIMA_CALENDARIO = '0001-01-01';
export const FECHA_MAXIMA_CALENDARIO = '9999-12-31';
export const ANTICIPACION_MAXIMA_ANIOS = 2;

export function fechaMaximaCalendario(hoy = fechaHoyCampus()) {
  const [anio, mes, dia] = hoy.split('-').map(Number);
  const anioLimite = anio + ANTICIPACION_MAXIMA_ANIOS;
  const ultimoDia = new Date(Date.UTC(anioLimite, mes, 0)).getUTCDate();
  return `${anioLimite}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

export function limitesFechasCalendario(original, hoy = fechaHoyCampus()) {
  const maxima = fechaMaximaCalendario(hoy);
  const anterior = fechaCalendarioValida(original) ? original : '';
  return { min: anterior && anterior < hoy ? anterior : hoy, max: anterior > maxima ? anterior : maxima };
}

export function fechaCalendarioValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < FECHA_MINIMA_CALENDARIO) return false;
  const valor = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha;
}

function errorFechaProgramada(fecha, { hoy, original, etiqueta }) {
  if (!fechaCalendarioValida(fecha)) return 'Escribe una fecha real con un año de cuatro dígitos.';
  if (fecha === original) return '';
  if (fecha < hoy) return `${etiqueta} no puede ser anterior a hoy.`;
  if (fecha > fechaMaximaCalendario(hoy)) return `${etiqueta} no puede estar a más de dos años de hoy.`;
  return '';
}

function validarPeriodo(inicio, fin, { hoy, inicioOriginal, finOriginal, finObligatorio = false }) {
  const errores = {};
  const errorInicio = inicio ? errorFechaProgramada(inicio, { hoy, original: inicioOriginal, etiqueta: 'La fecha de inicio' }) : 'Completa la fecha de inicio.';
  if (errorInicio) errores.inicio = errorInicio;
  if (finObligatorio && !fin) errores.fin = 'Completa la fecha de fin del periodo.';
  else if (fin) {
    const errorFin = errorFechaProgramada(fin, { hoy, original: finOriginal, etiqueta: 'La fecha de fin' });
    if (errorFin) errores.fin = errorFin;
    else if (!errores.inicio && fin < inicio) errores.fin = 'La fecha de fin debe ser igual o posterior al inicio.';
  }
  return errores;
}

export function validarFechaAcademica(form, periodo = false, { hoy = fechaHoyCampus(), original } = {}) {
  const errores = {};
  if (!form.titulo?.trim()) errores.titulo = 'Escribe el concepto de la fecha.';
  else if (form.titulo.length > 200) errores.titulo = 'El concepto debe tener hasta 200 caracteres.';
  if (!TIPOS_FECHA.some((tipo) => tipo.value === form.tipo_fecha)) errores.tipo_fecha = 'Selecciona un símbolo del calendario.';
  const fechas = validarPeriodo(form.fecha_inicio, periodo ? form.fecha_fin : null, {
    hoy, inicioOriginal: original?.fecha_inicio, finOriginal: original?.fecha_fin, finObligatorio: periodo,
  });
  if (fechas.inicio) errores.fecha_inicio = !periodo && !form.fecha_inicio ? 'Completa la fecha.' : fechas.inicio;
  if (fechas.fin) errores.fecha_fin = fechas.fin;
  return errores;
}

export function validarFechasEvento(form, { hoy = fechaHoyCampus(), original } = {}) {
  const fechas = validarPeriodo(form.fecha_evento, form.fecha_fin_evento, {
    hoy, inicioOriginal: original?.fecha_evento, finOriginal: original?.fecha_fin_evento,
  });
  const errores = {};
  if (fechas.inicio) errores.fecha_evento = fechas.inicio;
  if (fechas.fin) errores.fecha_fin_evento = fechas.fin;
  return errores;
}
