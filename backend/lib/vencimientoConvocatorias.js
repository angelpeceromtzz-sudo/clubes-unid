export const MENSAJE_VENCIMIENTO = 'La propuesta venció antes de su aprobación. Actualiza las fechas y envíala de nuevo a revisión.';

// Se comprueba al consultar y al escribir; no depende de una tarea programada.
export async function vencerInscripciones(client, idClub) {
  return client.query(`UPDATE solicitudes_convocatoria
    SET estado = 'vencido', observaciones = $2
    WHERE id_club = $1 AND estado = 'pendiente'
      AND (configuracion->>'fecha_limite_cierre')::timestamptz <= clock_timestamp()
    RETURNING *`, [idClub, MENSAJE_VENCIMIENTO]);
}

export const FECHA_EVALUACION_SQL = "((c.fecha + c.hora) AT TIME ZONE 'America/Mexico_City')";

export async function vencerBloques(client, idClub, idConvocatoria = null) {
  return client.query(`UPDATE convocatorias c
    SET estado_revision = 'vencido', observaciones = $2
    WHERE c.id_club = $1 AND c.estado_revision = 'pendiente' AND c.enviada = FALSE
      AND ($3::int IS NULL OR c.id_convocatoria = $3)
      AND ${FECHA_EVALUACION_SQL} <= clock_timestamp()
    RETURNING c.*`, [idClub, MENSAJE_VENCIMIENTO, idConvocatoria]);
}
