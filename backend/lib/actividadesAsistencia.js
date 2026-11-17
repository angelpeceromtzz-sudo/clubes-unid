import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  disponibilidadAsistenciaActividad, normalizarCodigoAsistencia,
  errorActividad, textoActividad,
} from './actividadesDominio.js';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generarCodigo = () => [...randomBytes(8)].map((byte) => ALFABETO[byte % 32]).join('');

export function asistenciaPropia(fila) {
  return fila ? { estado: fila.estado, registrada_en: new Date(fila.registrada_en).toISOString(), origen: fila.origen } : null;
}

export async function consultarAsistencia(db, idRegistro) {
  if (!idRegistro) return null;
  return asistenciaPropia((await db.query('SELECT estado, registrada_en, origen FROM actividades_asistencias WHERE id_registro=$1', [idRegistro])).rows[0]);
}

// Se monta en el router existente después de sus controles de gestión. Todas
// las escrituras bloquean edición e inscripción en el mismo orden que las
// cancelaciones y la reasignación de encargados.
export function montarAsistenciaActividades(router, {
  db, autenticar, limitarEscritura, hoy, obtenerEdicion, comprobarGestion, transaccion, auditar,
}) {
  router.get('/gestion/ediciones/:idEdicion/asistencia', async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarGestion(req.user, edicion);
    const registros = (await db.query(`SELECT r.id_registro,r.nombre_completo,r.matricula,
      r.estado AS estado_inscripcion,u.deleted_at IS NULL AS cuenta_activa,
      CASE WHEN a.id_registro IS NULL THEN NULL ELSE json_build_object(
        'estado',a.estado,'registrada_en',a.registrada_en,'origen',a.origen,
        'motivo_correccion',a.motivo_correccion,'actualizada_en',a.actualizada_en,
        'actor_nombre',actor.nombre_completo) END AS asistencia
      FROM actividades_registros r JOIN usuarios u ON u.id_usuario=r.id_usuario
      LEFT JOIN actividades_asistencias a ON a.id_registro=r.id_registro
      LEFT JOIN usuarios actor ON actor.id_usuario=a.id_actor
      WHERE r.id_edicion=$1 AND (r.estado='confirmado' OR a.id_registro IS NOT NULL)
      ORDER BY r.nombre_completo,r.id_registro`, [edicion.id_edicion])).rows;
    for (const registro of registros) {
      if (registro.asistencia) registro.asistencia = { ...registro.asistencia, ...asistenciaPropia(registro.asistencia) };
    }
    const confirmados = registros.filter((registro) => registro.estado_inscripcion === 'confirmado');
    res.json({
      disponibilidad: disponibilidadAsistenciaActividad(edicion, hoy()),
      requiere_registro: edicion.requiere_registro,
      acceso: (await db.query('SELECT codigo FROM actividades_asistencia_accesos WHERE id_edicion=$1', [edicion.id_edicion])).rows[0] || null,
      totales: {
        inscritos: confirmados.length,
        asistentes: registros.filter((registro) => registro.asistencia?.estado === 'presente').length,
        sin_asistencia: confirmados.filter((registro) => registro.asistencia?.estado !== 'presente').length,
      },
      registros,
    });
  });

  router.post('/gestion/ediciones/:idEdicion/asistencia/acceso', async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion);
      if (!edicion.requiere_registro) throw errorActividad('Esta edición no requiere inscripciones', 409);
      if (edicion.estado !== 'publicada' || edicion.estado_actividad !== 'publicada') throw errorActividad('Publica la actividad y su edición antes de generar el acceso', 409);
      const anterior = (await cliente.query('SELECT codigo FROM actividades_asistencia_accesos WHERE id_edicion=$1', [edicion.id_edicion])).rows[0];
      if (anterior) return anterior;
      const acceso = (await cliente.query('INSERT INTO actividades_asistencia_accesos(id_edicion,codigo,id_autor) VALUES($1,$2,$3) RETURNING codigo', [edicion.id_edicion, generarCodigo(), req.user.id])).rows[0];
      await auditar(cliente, req.user, 'asistencia_acceso_creado', { id_edicion: edicion.id_edicion });
      return acceso;
    }));
  });

  router.get('/ediciones/:idEdicion/mi-asistencia', autenticar, async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    const registro = (await db.query('SELECT id_registro,estado FROM actividades_registros WHERE id_edicion=$1 AND id_usuario=$2', [edicion.id_edicion, req.user.id])).rows[0];
    if (!registro) throw errorActividad('Necesitas una inscripción confirmada en esta edición', 403);
    res.json({
      edicion: { id_edicion: edicion.id_edicion, nombre: edicion.nombre, actividad_nombre: edicion.actividad_nombre,
        fecha_inicio: edicion.fecha_inicio, fecha_fin: edicion.fecha_fin },
      estado_inscripcion: registro.estado,
      disponibilidad: disponibilidadAsistenciaActividad(edicion, hoy()),
      asistencia: await consultarAsistencia(db, registro.id_registro),
    });
  });

  router.post('/ediciones/:idEdicion/asistencia', autenticar, limitarEscritura, async (req, res) => {
    const codigo = normalizarCodigoAsistencia(req.body?.codigo);
    if (!['qr', 'codigo'].includes(req.body?.origen)) throw errorActividad('Selecciona una forma de registrar la asistencia');
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      if (disponibilidadAsistenciaActividad(edicion, hoy()) !== 'disponible') throw errorActividad('El pase de lista solo está disponible durante las fechas de la edición publicada', 409);
      const registro = (await cliente.query(`SELECT r.id_registro,r.estado FROM actividades_registros r
        JOIN usuarios u ON u.id_usuario=r.id_usuario AND u.deleted_at IS NULL
        WHERE r.id_edicion=$1 AND r.id_usuario=$2 FOR UPDATE OF r`, [edicion.id_edicion, req.user.id])).rows[0];
      if (!registro || registro.estado !== 'confirmado') throw errorActividad('Necesitas una inscripción confirmada en esta edición', 403);
      const acceso = (await cliente.query('SELECT codigo FROM actividades_asistencia_accesos WHERE id_edicion=$1', [edicion.id_edicion])).rows[0];
      if (!acceso || !timingSafeEqual(Buffer.from(codigo), Buffer.from(acceso.codigo))) throw errorActividad('El código de asistencia no es correcto', 400);
      const anterior = (await cliente.query('SELECT * FROM actividades_asistencias WHERE id_registro=$1', [registro.id_registro])).rows[0];
      if (anterior?.estado === 'anulada') throw errorActividad('El encargado corrigió tu asistencia. Solicita que revise tu registro.', 409);
      if (anterior) return { asistencia: asistenciaPropia(anterior) };
      const asistencia = (await cliente.query(`INSERT INTO actividades_asistencias(id_registro,estado,origen,id_actor)
        VALUES($1,'presente',$2,$3) RETURNING *`, [registro.id_registro, req.body.origen, req.user.id])).rows[0];
      await auditar(cliente, req.user, 'asistencia_registrada', { id_registro: registro.id_registro, origen: asistencia.origen });
      return { asistencia: asistenciaPropia(asistencia) };
    }));
  });

  router.put('/gestion/ediciones/:idEdicion/asistencia/:idRegistro', async (req, res) => {
    if (!['presente', 'anulada'].includes(req.body?.estado)) throw errorActividad('Selecciona el estado de asistencia');
    const motivo = textoActividad(req.body?.motivo, 500, 'Motivo de la corrección', true);
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion);
      if (!edicion.requiere_registro) throw errorActividad('Esta edición no requiere inscripciones', 409);
      const registro = (await cliente.query(`SELECT r.id_registro,r.estado,u.deleted_at IS NULL AS cuenta_activa
        FROM actividades_registros r JOIN usuarios u ON u.id_usuario=r.id_usuario
        WHERE r.id_edicion=$1 AND r.id_registro=$2 FOR UPDATE OF r`, [edicion.id_edicion, req.params.idRegistro])).rows[0];
      if (!registro) throw errorActividad('Inscripción no encontrada en esta edición', 404);
      if (req.body.estado === 'presente' && (registro.estado !== 'confirmado' || !registro.cuenta_activa)) throw errorActividad('Solo puedes registrar la llegada de un inscrito confirmado con cuenta activa', 409);
      const anterior = (await cliente.query('SELECT * FROM actividades_asistencias WHERE id_registro=$1', [registro.id_registro])).rows[0] || null;
      if (req.body.estado === 'anulada' && !anterior) throw errorActividad('Esta inscripción no tiene una asistencia que corregir', 409);
      if (anterior?.estado === req.body.estado) return { asistencia: asistenciaPropia(anterior) };
      const asistencia = (await cliente.query(`INSERT INTO actividades_asistencias(id_registro,estado,origen,id_actor,motivo_correccion)
        VALUES($1,$2,'manual',$3,$4) ON CONFLICT(id_registro) DO UPDATE SET
        estado=EXCLUDED.estado,origen='manual',id_actor=EXCLUDED.id_actor,
        motivo_correccion=EXCLUDED.motivo_correccion,actualizada_en=NOW(),
        registrada_en=CASE WHEN EXCLUDED.estado='presente' THEN NOW() ELSE actividades_asistencias.registrada_en END
        RETURNING *`, [registro.id_registro, req.body.estado, req.user.id, motivo])).rows[0];
      await auditar(cliente, req.user, 'asistencia_corregida', { id_registro: registro.id_registro,
        motivo, anterior, asistencia });
      return { asistencia: asistenciaPropia(asistencia) };
    }));
  });
}
