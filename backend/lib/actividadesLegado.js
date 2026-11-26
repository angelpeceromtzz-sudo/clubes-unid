import { errorActividad } from './actividadesDominio.js';
import { registrarActividadCatalogo } from './actividadCatalogo.js';

// Solo se aplica mediante una correspondencia explícita de IDs. La consulta
// previa es de lectura y la transición completa es una sola transacción.
export async function migrarLegadoActividades(db, { idClub, idEdicion, aplicar = false,idActor=null }) {
  if (![idClub, idEdicion].every((id) => Number.isSafeInteger(id) && id > 0)) throw errorActividad('Indica los IDs del club y de la edición');
  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const club = (await cliente.query('SELECT * FROM clubes WHERE id_club = $1 FOR UPDATE', [idClub])).rows[0];
    const edicion = (await cliente.query('SELECT e.id_edicion,e.id_actividad AS id_club_destino,a.nombre,a.plantilla FROM actividades_ediciones e JOIN catalogo_recursos a ON a.id_actividad = e.id_actividad WHERE e.id_edicion = $1 FOR UPDATE OF a,e', [idEdicion])).rows[0];
    if (!club || !edicion) throw errorActividad('Club o edición no encontrados', 404);
    if(club.tipo!=='club') throw errorActividad('El origen del traslado debe ser un club');
    if (!['trineo', 'misiones'].includes(edicion.plantilla)) throw errorActividad('Selecciona una edición de Trineo o Misiones');
    const anterior = (await cliente.query("SELECT id_edicion_destino AS id_edicion FROM migraciones_catalogo WHERE tipo='traslado_club' AND id_club_origen=$1", [idClub])).rows[0];
    if (anterior) {
      if (anterior.id_edicion !== idEdicion) throw errorActividad('Este club ya está vinculado a otra edición', 409);
      await cliente.query('ROLLBACK');
      return { ya_migrado: true, id_club: idClub, id_edicion: idEdicion };
    }
    const formularios = (await cliente.query('SELECT * FROM formularios WHERE id_club = $1 ORDER BY id_formulario', [idClub])).rows;
    const inscripciones = (await cliente.query('SELECT * FROM inscripciones WHERE id_club = $1 ORDER BY id_inscripcion', [idClub])).rows;
    const candidatos = new Set([
      ...formularios.filter((fila) => fila.status !== 'Rechazado').map((fila) => fila.id_alumno),
      ...inscripciones.filter((fila) => fila.id_estatus_inscripcion === 1).map((fila) => fila.id_usuario),
    ]);
    const resultado = { aplicado: aplicar, id_club: idClub, nombre_club: club.nombre_club, id_edicion: idEdicion, actividad: edicion.nombre, formularios: formularios.length, inscripciones: inscripciones.length, candidatos: candidatos.size, importados: 0, sin_matricula: 0 };
    if (!aplicar) { await cliente.query('ROLLBACK'); return resultado; }
    for (const idUsuario of candidatos) {
      const usuario = (await cliente.query('SELECT id_usuario, nombre_completo, institutional_id, deleted_at FROM usuarios WHERE id_usuario = $1', [idUsuario])).rows[0];
      if (!usuario || usuario.deleted_at) continue;
      const anteriores = formularios.filter((fila) => fila.id_alumno === idUsuario);
      const ultimo = anteriores[anteriores.length - 1];
      const matricula = usuario.institutional_id || ultimo?.matricula;
      if (!matricula) { resultado.sin_matricula += 1; continue; }
      const origen = { id_club: idClub, formularios: anteriores.map((fila) => ({ id_formulario: fila.id_formulario, status: fila.status })), inscripciones: inscripciones.filter((fila) => fila.id_usuario === idUsuario).map((fila) => ({ id_inscripcion: fila.id_inscripcion, id_estatus_inscripcion: fila.id_estatus_inscripcion })) };
      const respuesta = ultimo?.id_licenciatura ? { licenciatura: ultimo.id_licenciatura } : {};
      const insertado = await cliente.query("INSERT INTO actividades_registros (id_edicion,id_usuario,nombre_completo,matricula,respuestas,estado,origen_legacy) VALUES ($1,$2,$3,$4,$5,'pendiente_completar',$6) ON CONFLICT DO NOTHING RETURNING id_registro", [idEdicion, idUsuario, usuario.nombre_completo, matricula, JSON.stringify(respuesta), JSON.stringify(origen)]);
      resultado.importados += insertado.rows.length;
    }
    // El respaldo de los estados anteriores permite auditar la transición;
    // las tablas originales y sus relaciones se conservan.
    await cliente.query("INSERT INTO migraciones_catalogo(tipo,id_club_origen,id_club_destino,id_edicion_destino,resumen) VALUES('traslado_club',$1,$2,$3,$4)", [idClub, edicion.id_club_destino, idEdicion, JSON.stringify({ club, formularios, inscripciones, resultado })]);
    await cliente.query("UPDATE formularios SET status = 'Rechazado', motivo_rechazo = 'Registro trasladado al apartado de actividades' WHERE id_club = $1 AND status NOT IN ('Miembro oficial','Rechazado')", [idClub]);
    await cliente.query('UPDATE inscripciones SET id_estatus_inscripcion = 2, fecha_baja = NOW() WHERE id_club = $1 AND id_estatus_inscripcion = 1', [idClub]);
    await cliente.query(
      `UPDATE convocatorias_inscripcion SET cerrada_manualmente = TRUE
       WHERE id_convocatoria_inscripcion = (
         SELECT id_convocatoria_inscripcion_actual FROM clubes WHERE id_club = $1
       ) AND id_club = $1`,
      [idClub],
    );
    await cliente.query("UPDATE clubes SET id_estatus_club=3,estado_publicacion='archivada',id_convocatoria_inscripcion_actual=NULL WHERE id_club=$1",[idClub]);
    await registrarActividadCatalogo(cliente, {idActor,accion:'legado_migrado',detalle:resultado,idRecurso:edicion.id_club_destino,idEdicion});
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) { await cliente.query('ROLLBACK'); throw error; } finally { cliente.release(); }
}
