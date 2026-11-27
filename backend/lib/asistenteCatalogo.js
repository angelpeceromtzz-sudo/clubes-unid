import pool from '../db.js';

export async function detalleClub(idClub) {
  const [club, membresias, horarios, convocatorias, postulaciones] = await Promise.all([
    pool.query(`SELECT c.id_club, c.nombre_club, c.descripcion, c.categoria, c.cupo_maximo, c.lugar_actividades, c.estado_publicacion, e.nombre_estatus AS estatus, responsable.nombre_completo AS responsable, vice.nombre_completo AS vicepresidente FROM clubes c JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club LEFT JOIN usuarios responsable ON responsable.id_usuario = c.id_responsable_club LEFT JOIN usuarios vice ON vice.id_usuario = c.id_vicepresidente WHERE c.id_club = $1 AND c.tipo = 'club'`, [idClub]),
    pool.query(`SELECT e.nombre_estatus AS estatus, COUNT(*)::int AS total FROM inscripciones i JOIN usuarios u ON u.id_usuario = i.id_usuario AND u.id_rol = 1 JOIN cat_estatus_inscripciones e ON e.id_estatus_inscripcion = i.id_estatus_inscripcion WHERE i.id_club = $1 GROUP BY e.nombre_estatus`, [idClub]),
    pool.query(`SELECT dia_semana, hora_inicio, hora_fin, lugar, descripcion FROM horarios_club WHERE id_club = $1 ORDER BY dia_semana, hora_inicio LIMIT 30`, [idClub]),
    pool.query(`SELECT bloque, periodo, fecha, hora, lugar, enviada FROM convocatorias WHERE id_club = $1 ORDER BY fecha DESC NULLS LAST LIMIT 20`, [idClub]),
    pool.query(`SELECT status, COUNT(*)::int AS total FROM formularios WHERE id_club = $1 GROUP BY status`, [idClub]),
  ]);
  return { club: club.rows[0], membresias: membresias.rows, horarios: horarios.rows, convocatorias: convocatorias.rows, postulaciones: postulaciones.rows };
}

export async function detalleActividad(idActividad) {
  const [actividad, ediciones, total] = await Promise.all([
    pool.query(`SELECT id_club, nombre_club, slug, descripcion, categoria, estado_publicacion, plantilla FROM clubes WHERE id_club = $1 AND tipo = 'actividad'`, [idActividad]),
    pool.query(`SELECT e.id_edicion, e.nombre, e.descripcion, e.lugar, e.fecha_inicio, e.fecha_fin, e.estado, e.requiere_registro, e.requiere_aportacion, COUNT(DISTINCT r.id_registro)::int AS inscripciones, COUNT(DISTINCT r.id_registro) FILTER (WHERE r.estado = 'confirmado')::int AS registros_confirmados, COUNT(DISTINCT a.id_registro) FILTER (WHERE a.estado = 'presente')::int AS asistencias FROM actividades_ediciones e LEFT JOIN actividades_registros r ON r.id_edicion = e.id_edicion LEFT JOIN actividades_asistencias a ON a.id_registro = r.id_registro WHERE e.id_actividad = $1 GROUP BY e.id_edicion ORDER BY e.fecha_inicio DESC NULLS LAST LIMIT 40`, [idActividad]),
    pool.query(`SELECT COUNT(*)::int AS inscripciones FROM actividades_registros r JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion WHERE e.id_actividad = $1`, [idActividad]),
  ]);
  return { actividad: actividad.rows[0], ediciones: ediciones.rows, total: total.rows[0] };
}

export async function estadisticasClubes() {
  return (await pool.query(`SELECT c.id_club, c.nombre_club, e.nombre_estatus AS estatus, c.estado_publicacion, COUNT(u.id_usuario)::int AS miembros_activos FROM clubes c JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club LEFT JOIN inscripciones i ON i.id_club = c.id_club AND i.id_estatus_inscripcion = 1 LEFT JOIN usuarios u ON u.id_usuario = i.id_usuario AND u.id_rol = 1 WHERE c.tipo = 'club' GROUP BY c.id_club, e.nombre_estatus ORDER BY miembros_activos DESC, c.nombre_club LIMIT 100`)).rows;
}

export async function estadisticasActividades() {
  return (await pool.query(`SELECT c.id_club, c.nombre_club, c.slug, c.estado_publicacion, COUNT(DISTINCT e.id_edicion)::int AS ediciones, COUNT(DISTINCT r.id_registro) FILTER (WHERE r.estado = 'confirmado')::int AS registros_confirmados, COUNT(DISTINCT a.id_registro) FILTER (WHERE a.estado = 'presente')::int AS asistencias FROM clubes c LEFT JOIN actividades_ediciones e ON e.id_actividad = c.id_club LEFT JOIN actividades_registros r ON r.id_edicion = e.id_edicion LEFT JOIN actividades_asistencias a ON a.id_registro = r.id_registro WHERE c.tipo = 'actividad' GROUP BY c.id_club ORDER BY registros_confirmados DESC, c.nombre_club LIMIT 100`)).rows;
}
