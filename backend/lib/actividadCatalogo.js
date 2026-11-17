import { ETIQUETAS_ACTIVIDAD_CATALOGO } from './actividadesDominio.js';

const id = (valor) => Number.isSafeInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null;

// Recibe el cliente de la operación: el evento y sus cambios se confirman juntos.
// No importa la conexión global, para conservar el aislamiento de las pruebas.
export async function registrarActividadCatalogo(db, { idActor = null, accion, detalle = {}, idRecurso, idEdicion }) {
  const referencias = [
    id(idEdicion ?? detalle.id_edicion),
    id(detalle.id_registro),
    id(detalle.id_opcion),
    id(detalle.id_aportacion),
    id(detalle.id_foto),
  ];
  let contexto = {};
  if (referencias.some(Boolean)) {
    contexto = (await db.query(`SELECT COALESCE(
      $1::int,
      (SELECT id_edicion FROM actividades_registros WHERE id_registro=$2),
      (SELECT id_edicion FROM actividades_aportes_catalogo WHERE id_opcion=$3),
      (SELECT r.id_edicion FROM actividades_aportaciones a JOIN actividades_registros r USING(id_registro) WHERE a.id_aportacion=$4),
      (SELECT p.id_edicion FROM publicaciones_imagenes i JOIN publicaciones_oferta p USING(id_publicacion) WHERE i.id_foto=$5)
    ) AS id_edicion,
    (SELECT p.id_club FROM publicaciones_imagenes i JOIN publicaciones_oferta p USING(id_publicacion) WHERE i.id_foto=$5) AS id_club`, referencias)).rows[0];
  }
  const recurso = id(idRecurso ?? detalle.id_actividad ?? detalle.id_club ?? contexto.id_club);
  const edicion = id(contexto.id_edicion);
  const entidad = (await db.query(`SELECT c.id_club,c.nombre_club,e.nombre AS edicion_nombre
    FROM clubes c LEFT JOIN actividades_ediciones e ON e.id_actividad=c.id_club AND e.id_edicion=$2
    WHERE c.id_club=COALESCE($1::int,(SELECT id_actividad FROM actividades_ediciones WHERE id_edicion=$2))`, [recurso, edicion])).rows[0];
  const nombre = entidad?.edicion_nombre || entidad?.nombre_club;
  const descripcion = (ETIQUETAS_ACTIVIDAD_CATALOGO[accion] || accion.replaceAll('_', ' ')) + (nombre ? ': ' + nombre : '');
  return (await db.query(`INSERT INTO actividad_clubes(tipo_evento,id_club,id_edicion,id_actor,descripcion,detalles,origen)
    VALUES($1,$2,$3,$4,$5,$6,'catalogo') RETURNING id_evento`, [accion, entidad?.id_club || null, edicion, idActor, descripcion, JSON.stringify(detalle)])).rows[0];
}
