import { MAX_POSTULACIONES } from '../constants/limites';
import { formatearFechaLegible } from './fechas';

export function validarFormularioConvocatoria(apertura, cierre, maxPost, ahora) {
  const errores = { fecha_apertura: '', fecha_cierre: '', max_postulaciones: '' };
  let valido = true;

  if (apertura) {
    if (new Date(apertura) < ahora) {
      errores.fecha_apertura = 'La fecha de apertura no puede ser anterior a la fecha y hora actual.';
      valido = false;
    }
  }

  if (cierre) {
    if (new Date(cierre) < ahora) {
      errores.fecha_cierre = 'La fecha de cierre no puede ser anterior a la fecha y hora actual.';
      valido = false;
    }
  }

  if (apertura && cierre && new Date(cierre) <= new Date(apertura)) {
    errores.fecha_cierre = 'La fecha de cierre debe ser posterior a la fecha de apertura.';
    valido = false;
  }

  if (maxPost !== null) {
    if (!Number.isInteger(maxPost) || maxPost < 1) {
      errores.max_postulaciones = 'Debe ser un número entero entre 1 y 40.';
      valido = false;
    } else if (maxPost > MAX_POSTULACIONES) {
      errores.max_postulaciones = `El límite máximo permitido es ${MAX_POSTULACIONES}.`;
      valido = false;
    }
  }

  return { errores, valido };
}

export function construirResumenCambios(config) {
  const partes = [];
  if (config.fecha_apertura_programada && config.fecha_limite_cierre) {
    partes.push(`La convocatoria abrirá el ${formatearFechaLegible(config.fecha_apertura_programada)} y cerrará el ${formatearFechaLegible(config.fecha_limite_cierre)}.`);
  } else if (config.fecha_apertura_programada) {
    partes.push(`La convocatoria abrirá el ${formatearFechaLegible(config.fecha_apertura_programada)} y no tendrá fecha límite de cierre.`);
  } else if (config.fecha_limite_cierre) {
    partes.push(`La convocatoria está abierta y cerrará el ${formatearFechaLegible(config.fecha_limite_cierre)}.`);
  } else {
    partes.push('La convocatoria no tiene fechas programadas.');
  }
  partes.push(`Límite de ${config.max_postulaciones ?? MAX_POSTULACIONES} postulaciones.`);
  return partes.join(' ');
}
