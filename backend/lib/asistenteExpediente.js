import pool from '../db.js';

// Consultas acotadas a una persona ya identificada. Nunca se consulta el expediente en bloque.
export async function obtenerDatosAlumno(idUsuario) {
  const [perfil, inscripciones, postulaciones, asistencia, actividades, reconocimientos] = await Promise.all([
    pool.query(`SELECT u.nombre_completo, u.correo_institucional, u.institutional_id, u.telefono_celular, u.fecha_nacimiento, u.fecha_registro, u.deleted_at IS NULL AS cuenta_activa, f.matricula, f.cuatrimestre, f.telefono_contacto, l.nombre AS licenciatura FROM usuarios u LEFT JOIN LATERAL (SELECT matricula, cuatrimestre, telefono_contacto, id_licenciatura FROM formularios WHERE id_alumno = u.id_usuario ORDER BY fecha_envio DESC LIMIT 1) f ON TRUE LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura WHERE u.id_usuario = $1 AND u.id_rol = 1`, [idUsuario]),
    pool.query(`SELECT c.nombre_club, e.nombre_estatus AS estatus, i.fecha_inscripcion, i.fecha_baja FROM inscripciones i JOIN clubes c ON c.id_club = i.id_club JOIN cat_estatus_inscripciones e ON e.id_estatus_inscripcion = i.id_estatus_inscripcion WHERE i.id_usuario = $1 ORDER BY i.fecha_inscripcion DESC LIMIT 100`, [idUsuario]),
    pool.query(`SELECT c.nombre_club, f.status, f.fecha_envio, f.fecha_respuesta, f.motivo_rechazo FROM formularios f JOIN clubes c ON c.id_club = f.id_club WHERE f.id_alumno = $1 ORDER BY f.fecha_envio DESC LIMIT 100`, [idUsuario]),
    pool.query(`SELECT c.nombre_club, s.fecha, a.estado, a.motivo_justificacion FROM asistencias a JOIN sesiones s ON s.id_sesion = a.id_sesion JOIN clubes c ON c.id_club = s.id_club WHERE a.id_usuario = $1 AND s.estado <> 'cancelada' ORDER BY s.fecha DESC LIMIT 100`, [idUsuario]),
    pool.query(`SELECT c.nombre_club AS actividad, e.nombre AS edicion, e.fecha_inicio, r.estado AS estado_registro, a.estado AS asistencia, r.creado_en FROM actividades_registros r JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion JOIN clubes c ON c.id_club = e.id_actividad LEFT JOIN actividades_asistencias a ON a.id_registro = r.id_registro WHERE r.id_usuario = $1 ORDER BY r.creado_en DESC LIMIT 100`, [idUsuario]),
    pool.query(`SELECT nombre_actividad AS actividad, nombre_edicion AS edicion, anio, otorgada_en FROM expediente_reconocimientos WHERE id_usuario = $1 ORDER BY otorgada_en DESC LIMIT 100`, [idUsuario]),
  ]);
  return {
    perfil: perfil.rows[0] || null,
    inscripciones: inscripciones.rows,
    postulaciones: postulaciones.rows,
    asistencia: asistencia.rows,
    actividades: actividades.rows,
    reconocimientos: reconocimientos.rows,
    limites: 'Se muestran hasta 100 registros recientes por sección; para un historial mayor hay que consultar el expediente en el panel.',
  };
}
