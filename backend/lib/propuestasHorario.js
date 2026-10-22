import { fechaEventoValida } from './fechasEvento.js';

export function validarPropuesta(datos) {
  if (!fechaEventoValida(datos.vigencia_inicio)) return 'Selecciona una fecha de inicio válida';
  if (datos.vigencia_fin != null && datos.vigencia_fin !== '' && (!fechaEventoValida(datos.vigencia_fin) || datos.vigencia_fin < datos.vigencia_inicio)) return 'La vigencia final debe ser igual o posterior al inicio';
  if (!Array.isArray(datos.detalle) || datos.detalle.length > 100) return 'La propuesta debe contener hasta 100 sesiones';
  for (const h of datos.detalle) {
    if (!h || !Number.isInteger(h.dia_semana) || h.dia_semana < 0 || h.dia_semana > 6) return 'Selecciona un día válido para cada sesión';
    if (!Number.isSafeInteger(h.id_espacio) || h.id_espacio < 1) return 'Selecciona un espacio del catálogo';
    if (![h.hora_inicio, h.hora_fin].every((v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) || h.hora_fin <= h.hora_inicio) return 'Cada sesión necesita horas válidas y un fin posterior al inicio';
    if (h.descripcion != null && (typeof h.descripcion !== 'string' || h.descripcion.length > 500)) return 'Las notas admiten hasta 500 caracteres';
    if (h.ubicacion_maps != null && (typeof h.ubicacion_maps !== 'string' || h.ubicacion_maps.length > 500 || (h.ubicacion_maps && !/^https?:\/\//.test(h.ubicacion_maps)))) return 'La ubicación debe ser una dirección http o https válida';
  }
  for (let i = 0; i < datos.detalle.length; i++) for (let j = i + 1; j < datos.detalle.length; j++) {
    const a = datos.detalle[i], b = datos.detalle[j];
    if (a.dia_semana === b.dia_semana && a.hora_inicio < b.hora_fin && a.hora_fin > b.hora_inicio) return 'La propuesta contiene sesiones del club que se traslapan';
  }
  return null;
}

export function limpiarDetalle(detalle) {
  return detalle.map((h) => ({ id_espacio: h.id_espacio, dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, descripcion: h.descripcion?.trim() || '', ubicacion_maps: h.ubicacion_maps || '' }));
}

export async function conflictosPropuesta(client, propuesta) {
  const ids = [...new Set(propuesta.detalle.map((h) => h.id_espacio))];
  const espacios = await client.query('SELECT id_espacio, nombre FROM espacios_club WHERE id_espacio = ANY($1::int[])', [ids]);
  if (espacios.rows.length !== ids.length) return { error: 'Uno de los espacios seleccionados no existe', conflictos: [] };
  const conflictos = [];
  for (const h of propuesta.detalle) {
    const resultado = await client.query(`SELECT h.id_club, c.nombre_club, h.lugar, h.dia_semana,
      h.hora_inicio, h.hora_fin FROM horarios_club h JOIN clubes c ON c.id_club = h.id_club
      WHERE h.id_club <> $1 AND h.id_espacio = $2 AND h.dia_semana = $3
      AND h.hora_inicio < $5::time AND h.hora_fin > $4::time
      AND COALESCE(h.vigencia_inicio, '-infinity'::date) <= COALESCE($7::date, 'infinity'::date)
      AND COALESCE(h.vigencia_fin, 'infinity'::date) >= $6::date`,
    [propuesta.id_club, h.id_espacio, h.dia_semana, h.hora_inicio, h.hora_fin, propuesta.vigencia_inicio, propuesta.vigencia_fin || null]);
    conflictos.push(...resultado.rows);
  }
  return { espacios: espacios.rows, conflictos, error: conflictos.length ? 'El espacio está ocupado por otro club en esa franja y vigencia' : null };
}
