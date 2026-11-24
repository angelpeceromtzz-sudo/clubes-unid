import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  esMisionesNueva, UUID_MISIONES, errorActividad, estadoRegistroActividad,
  validarRespuestasActividad, validarContactoInvitado, cotizarPedidoMisiones, esFormatoMegamisiones, validarTelefonoMisiones,
  validarAportacionesActividad, disponibilidadAsistenciaActividad, normalizarCodigoAsistencia,
} from './actividadesDominio.js';
import { consultarAsistencia, asistenciaPropia } from './actividadesAsistencia.js';
import { recibirPdfMisiones } from './misionesArchivos.js';

export const hashAccesoMisiones = (token) => createHash('sha256').update(token).digest('hex');
export function tokenMisiones(req) {
  const coincidencia = /^Registro ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '');
  return coincidencia?.[1] || null;
}
export function registroMisionesSeguro(registro) {
  if (!registro) return null;
  const { invitado_token_hash: _secreto, ...seguro } = registro;
  return seguro;
}

export async function validarDocumentoConfiguracion(db, datos, idActividad) {
  const id = datos.configuracion_misiones?.codigo_documento;
  if (id && !(await db.query("SELECT 1 FROM misiones_documentos WHERE id_documento=$1 AND id_actividad=$2 AND tipo='plantilla'", [id, idActividad])).rows.length) throw errorActividad('Selecciona un código de conducta cargado para esta actividad');
}

export function montarMisiones(router, {
  db, autenticar, hoy, obtenerActividad, obtenerEdicion, comprobarGestion, comprobarPublica,
  edicionPublica, transaccion, auditar, catalogoEdicion, aportesRegistro,
  limitarEscritura, limitarSubida, limitarRegistro, limitarReenvio, almacenPdf, correoMisiones,
}) {
  const exigirNueva = (edicion) => { if (!esMisionesNueva(edicion)) throw errorActividad('El registro de invitados está disponible únicamente en nuevas ediciones de Misiones', 404); };
  const exigirAbierta = (edicion) => {
    exigirNueva(edicion); comprobarPublica(edicion);
    if (estadoRegistroActividad(edicion, hoy()) !== 'abierta') throw errorActividad('Las inscripciones no están abiertas', 409);
  };
  const autenticarOpcional = (req, res, next) => req.headers.authorization?.startsWith('Bearer ') ? autenticar(req, res, next) : next();

  async function obtenerInvitado(cliente, req, bloquear = false) {
    const token = tokenMisiones(req);
    if (!token || !UUID_MISIONES.test(req.params.folio)) throw errorActividad('El enlace privado no es válido', 401);
    const registro = (await cliente.query("SELECT * FROM actividades_registros WHERE folio=$1 AND tipo_participante='invitado'" + (bloquear ? ' FOR UPDATE' : ''), [req.params.folio])).rows[0];
    if (!registro || !timingSafeEqual(Buffer.from(registro.invitado_token_hash, 'hex'), Buffer.from(hashAccesoMisiones(token), 'hex'))) throw errorActividad('El enlace privado no es válido', 401);
    return registro;
  }

  async function transaccionInvitado(req, trabajo) {
    const previo = await obtenerInvitado(db, req);
    return transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, previo.id_edicion, true);
      const registro = await obtenerInvitado(cliente, req, true);
      exigirNueva(edicion);
      return trabajo(cliente, edicion, registro);
    });
  }

  async function guardarArchivo(cliente, req, contexto) {
    if (!almacenPdf) throw errorActividad('La carga de documentos aún no está configurada', 503);
    const archivo = await almacenPdf.guardar(req.file);
    (req.pdfsMisionesEnProceso ||= []).push(archivo);
    return (await cliente.query(`INSERT INTO misiones_documentos(id_documento,id_actividad,id_edicion,id_registro,tipo,public_id,nombre,bytes,sha256)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_documento,nombre,bytes,sha256,creado_en`,
    [randomUUID(), contexto.id_actividad, contexto.id_edicion || null, contexto.id_registro || null, contexto.tipo, archivo.public_id, archivo.nombre, archivo.bytes, archivo.sha256])).rows[0];
  }

  async function enviarEnlace(registro, token, edicion, origenFrontend) {
    try {
      if (!correoMisiones) throw new Error('Correo no configurado');
      return await correoMisiones.enviarEnlace({ correo: registro.correo, folio: registro.folio, token, edicion: edicion.nombre, origen: origenFrontend });
    } catch { return false; }
  }

  async function respuestaRegistro(cliente, edicion, registro) {
    return {
      registro: { ...registroMisionesSeguro(registro), aportaciones: await aportesRegistro(cliente, registro.id_registro) },
      edicion: { ...edicionPublica(edicion, hoy()), catalogo: (await catalogoEdicion(cliente, edicion.id_edicion)).filter((opcion) => opcion.activa) },
      asistencia: await consultarAsistencia(cliente, registro.id_registro),
      disponibilidad_asistencia: disponibilidadAsistenciaActividad(edicion, hoy()),
    };
  }

  async function guardarInscripcion(cliente, req, edicion, anterior, usuario = null) {
    exigirAbierta(edicion);
    if (anterior?.estado === 'cancelado' && !usuario) throw errorActividad('La inscripción está cancelada; consulta al encargado', 409);
    const invitado = !usuario;
    const config = anterior?.misiones_snapshot || edicion.configuracion_misiones;
    const campos = (anterior?.estado === 'confirmado' ? anterior.formulario_snapshot : edicion.campos_registro).filter((campo) => !invitado || campo.tipo !== 'licenciatura');
    const respuestas = validarRespuestasActividad(campos, req.body.respuestas || {}, hoy());
    for (const campo of campos.filter((item) => item.tipo === 'licenciatura' && respuestas[item.clave])) {
      if (!(await cliente.query('SELECT 1 FROM cat_licenciaturas WHERE id_licenciatura=$1', [respuestas[campo.clave]])).rows.length) throw errorActividad('La licenciatura seleccionada no está disponible');
    }
    const contacto = invitado ? validarContactoInvitado(req.body) : { nombre_completo: usuario.nombre_completo, correo: usuario.correo_institucional, telefono: null };
    if (esFormatoMegamisiones(config)) contacto.telefono = validarTelefonoMisiones(invitado ? contacto.telefono : req.body.telefono ?? anterior?.telefono);
    const pedido = cotizarPedidoMisiones(edicion.configuracion_misiones.productos, req.body.pedido ?? anterior?.pedido?.lineas ?? [], anterior?.pedido);
    if (req.body.total_centavos !== undefined && req.body.total_centavos !== pedido.total_centavos) throw errorActividad('Los precios cambiaron. Actualiza y revisa el total antes de confirmar', 409);
    if (config.codigo_obligatorio && !req.file && !anterior?.codigo_firmado_id) throw errorActividad('Adjunta el PDF firmado del código de conducta');
    if (req.file && !config.codigo_documento) throw errorActividad('El encargado debe cargar primero el código de conducta de esta edición');
    const previos = anterior ? await aportesRegistro(cliente, anterior.id_registro) : [];
    const aportes = validarAportacionesActividad(req.body.aportaciones || [], await catalogoEdicion(cliente, edicion.id_edicion), edicion.requiere_aportacion, previos);
    if (previos.some((aporte) => aporte.estado === 'recibida' && !aportes.some((nuevo) => nuevo.id_opcion === aporte.id_opcion))) throw errorActividad('Conserva las aportaciones que ya fueron recibidas');
    let registro;
    let token;
    const valores = [contacto.nombre_completo, contacto.correo, contacto.telefono, JSON.stringify(respuestas), JSON.stringify(campos), JSON.stringify(pedido), JSON.stringify(config)];
    if (anterior) {
      registro = (await cliente.query(`UPDATE actividades_registros SET nombre_completo=$1,correo=$2,telefono=$3,respuestas=$4,formulario_snapshot=$5,pedido=$6,misiones_snapshot=$7,
        estado='confirmado',actualizado_en=NOW() WHERE id_registro=$8 RETURNING *`, [...valores, anterior.id_registro])).rows[0];
    } else if (invitado) {
      token = randomBytes(32).toString('base64url');
      registro = (await cliente.query(`INSERT INTO actividades_registros(nombre_completo,correo,telefono,respuestas,formulario_snapshot,pedido,misiones_snapshot,id_edicion,tipo_participante,folio,invitado_token_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'invitado',$9,$10) RETURNING *`, [...valores, edicion.id_edicion, randomUUID(), hashAccesoMisiones(token)])).rows[0];
    } else {
      const matricula = usuario.institutional_id || req.body.matricula;
      if (typeof matricula !== 'string' || !/^\d{1,30}$/.test(matricula)) throw errorActividad('La matrícula debe contener números');
      registro = (await cliente.query(`INSERT INTO actividades_registros(nombre_completo,correo,telefono,respuestas,formulario_snapshot,pedido,misiones_snapshot,id_edicion,id_usuario,matricula)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [...valores, edicion.id_edicion, usuario.id_usuario, matricula])).rows[0];
    }
    if (req.file) {
      const documento = await guardarArchivo(cliente, req, { id_actividad: edicion.id_actividad, id_edicion: edicion.id_edicion, id_registro: registro.id_registro, tipo: 'firmado' });
      registro = (await cliente.query('UPDATE actividades_registros SET codigo_firmado_id=$1 WHERE id_registro=$2 RETURNING *', [documento.id_documento, registro.id_registro])).rows[0];
    }
    await cliente.query("UPDATE actividades_aportaciones SET estado='cancelada' WHERE id_registro=$1 AND estado='comprometida' AND NOT(id_opcion=ANY($2::int[]))", [registro.id_registro, aportes.map((aporte) => aporte.id_opcion)]);
    for (const aporte of aportes) await cliente.query(`INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(id_registro,id_opcion) DO UPDATE SET nombre=EXCLUDED.nombre,unidad=EXCLUDED.unidad,cantidad=EXCLUDED.cantidad,cantidad_minima=EXCLUDED.cantidad_minima,estado='comprometida'
      WHERE actividades_aportaciones.estado<>'recibida'`, [registro.id_registro, aporte.id_opcion, aporte.nombre, aporte.unidad, aporte.cantidad, aporte.cantidad_minima]);
    await auditar(cliente, { id: usuario?.id_usuario || null }, anterior ? 'registro_editado' : 'registro_confirmado', { id_registro: registro.id_registro, tipo_participante: registro.tipo_participante });
    return { ...await respuestaRegistro(cliente, edicion, registro), token };
  }

  // Esta ruta se monta antes de la inscripción anterior. Las ediciones v1 siguen su ruta original.
  router.put('/ediciones/:idEdicion/registro', async (req, _res, next) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    if (!esMisionesNueva(edicion)) return next('route');
    exigirAbierta(edicion); next();
  }, autenticar, limitarEscritura, limitarSubida, recibirPdfMisiones, async (req, res) => {
    const resultado = await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      const usuario = (await cliente.query('SELECT id_usuario,nombre_completo,correo_institucional,institutional_id FROM usuarios WHERE id_usuario=$1 AND deleted_at IS NULL', [req.user.id])).rows[0];
      if (!usuario) throw errorActividad('La sesión ya no está disponible', 401);
      const anterior = (await cliente.query('SELECT * FROM actividades_registros WHERE id_edicion=$1 AND id_usuario=$2 FOR UPDATE', [edicion.id_edicion, usuario.id_usuario])).rows[0];
      return guardarInscripcion(cliente, req, edicion, anterior, usuario);
    });
    req.pdfsMisionesConfirmados = true;
    res.json(resultado.registro);
  });

  router.get('/ediciones/:idEdicion/acceso-invitados', async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarPublica(edicion);
    res.json({ habilitado: esMisionesNueva(edicion) || edicion.plantilla === 'trineo', tipo: edicion.plantilla === 'trineo' ? 'trineo' : 'misiones' });
  });

  router.post('/ediciones/:idEdicion/invitados', limitarRegistro, limitarSubida, async (req, _res, next) => {
    exigirAbierta(await obtenerEdicion(db, req.params.idEdicion)); next();
  }, recibirPdfMisiones, async (req, res) => {
    const resultado = await transaccion(async (cliente) => guardarInscripcion(cliente, req, await obtenerEdicion(cliente, req.params.idEdicion, true), null));
    req.pdfsMisionesConfirmados = true;
    const origenFrontend = req.body?.origen || req.headers.origin || null;
    const correo_enviado = await enviarEnlace(resultado.registro, resultado.token, resultado.edicion, origenFrontend);
    const enlace = typeof correo_enviado === 'string' ? correo_enviado : null;
    res.status(201).json({ ...resultado, correo_enviado: Boolean(correo_enviado), enlace });
  });

  router.get('/invitados/:folio', limitarEscritura, async (req, res) => {
    const registro = await obtenerInvitado(db, req);
    const edicion = await obtenerEdicion(db, registro.id_edicion);
    exigirNueva(edicion);
    res.json(await respuestaRegistro(db, edicion, registro));
  });

  router.put('/invitados/:folio', limitarEscritura, limitarSubida, async (req, _res, next) => {
    await obtenerInvitado(db, req); next();
  }, recibirPdfMisiones, async (req, res) => {
    const resultado = await transaccionInvitado(req, (cliente, edicion, registro) => guardarInscripcion(cliente, req, edicion, registro));
    req.pdfsMisionesConfirmados = true;
    res.json(resultado);
  });

  router.post('/invitados/:folio/reenviar-enlace', limitarReenvio, async (req, res) => {
    const registro = await obtenerInvitado(db, req);
    const edicion = await obtenerEdicion(db, registro.id_edicion);
    const enviado = await enviarEnlace(registro, tokenMisiones(req), edicion);
    res.status(enviado ? 200 : 503).json(enviado ? { correo_enviado: true } : { error: 'Tu registro está guardado, pero no pudimos enviar el correo. Conserva tu enlace e intenta reenviarlo más tarde.' });
  });

  router.post('/invitados/:folio/asistencia', limitarEscritura, async (req, res) => {
    const codigo = normalizarCodigoAsistencia(req.body?.codigo);
    if (!['qr', 'codigo'].includes(req.body?.origen)) throw errorActividad('Selecciona una forma de registrar la asistencia');
    res.json(await transaccionInvitado(req, async (cliente, edicion, registro) => {
      if (disponibilidadAsistenciaActividad(edicion, hoy()) !== 'disponible') throw errorActividad('El pase de lista solo está disponible durante las fechas de la edición publicada', 409);
      if (registro.estado !== 'confirmado') throw errorActividad('Necesitas una inscripción confirmada', 403);
      const acceso = (await cliente.query('SELECT codigo FROM actividades_asistencia_accesos WHERE id_edicion=$1', [edicion.id_edicion])).rows[0];
      if (!acceso || !timingSafeEqual(Buffer.from(codigo), Buffer.from(acceso.codigo))) throw errorActividad('El código de asistencia no es correcto');
      const anterior = (await cliente.query('SELECT * FROM actividades_asistencias WHERE id_registro=$1', [registro.id_registro])).rows[0];
      if (anterior?.estado === 'anulada') throw errorActividad('El encargado corrigió tu asistencia. Solicita que revise tu registro.', 409);
      if (anterior) return { asistencia: asistenciaPropia(anterior) };
      const asistencia = (await cliente.query("INSERT INTO actividades_asistencias(id_registro,estado,origen,id_actor) VALUES($1,'presente',$2,NULL) RETURNING *", [registro.id_registro, req.body.origen])).rows[0];
      await auditar(cliente, { id: null }, 'asistencia_registrada', { id_registro: registro.id_registro, origen: req.body.origen, tipo_participante: 'invitado' });
      return { asistencia: asistenciaPropia(asistencia) };
    }));
  });

  router.post('/gestion/actividades/:idActividad/codigo-conducta', limitarSubida, async (req, _res, next) => {
    const actividad = await obtenerActividad(db, req.params.idActividad);
    comprobarGestion(req.user, actividad);
    if (actividad.plantilla !== 'misiones') throw errorActividad('El documento corresponde a Misiones');
    next();
  }, recibirPdfMisiones, async (req, res) => {
    if (!req.file) throw errorActividad('Selecciona un PDF del código de conducta');
    const documento = await transaccion(async (cliente) => {
      const actividad = await obtenerActividad(cliente, req.params.idActividad, true);
      comprobarGestion(req.user, actividad);
      const resultado = await guardarArchivo(cliente, req, { id_actividad: actividad.id_actividad, tipo: 'plantilla' });
      await auditar(cliente, req.user, 'codigo_conducta_cargado', { id_actividad: actividad.id_actividad, id_documento: resultado.id_documento });
      return resultado;
    });
    req.pdfsMisionesConfirmados = true;
    res.status(201).json(documento);
  });

  router.get('/documentos-misiones/:idDocumento', autenticarOpcional, async (req, res) => {
    if (!UUID_MISIONES.test(req.params.idDocumento)) throw errorActividad('Documento no disponible', 404);
    const documento = (await db.query('SELECT * FROM misiones_documentos WHERE id_documento=$1', [req.params.idDocumento])).rows[0];
    if (!documento) throw errorActividad('Documento no disponible', 404);
    let permitido = false;
    if (documento.tipo === 'plantilla') permitido = (await db.query(`SELECT 1 FROM actividades_ediciones e JOIN clubes c ON c.id_club=e.id_actividad
      WHERE e.configuracion_misiones->>'codigo_documento'=$1 AND e.estado='publicada' AND c.estado_publicacion='publicada'`, [documento.id_documento])).rows.length > 0;
    if (!permitido && req.user) {
      const propietario = documento.id_registro && (await db.query('SELECT 1 FROM actividades_registros WHERE id_registro=$1 AND id_usuario=$2', [documento.id_registro, req.user.id])).rows.length;
      const plantillaPropia = documento.tipo === 'plantilla' && (await db.query("SELECT 1 FROM actividades_registros WHERE id_usuario=$1 AND misiones_snapshot->>'codigo_documento'=$2", [req.user.id, documento.id_documento])).rows.length;
      if (propietario || plantillaPropia) permitido = true;
      else { comprobarGestion(req.user, await obtenerActividad(db, documento.id_actividad)); permitido = true; }
    }
    const token = tokenMisiones(req);
    if (!permitido && token) permitido = (await db.query(`SELECT 1 FROM actividades_registros WHERE tipo_participante='invitado' AND invitado_token_hash=$1
      AND (id_registro=$2 OR misiones_snapshot->>'codigo_documento'=$3)`, [hashAccesoMisiones(token), documento.id_registro, documento.tipo === 'plantilla' ? documento.id_documento : null])).rows.length > 0;
    if (!permitido) throw errorActividad('No tienes acceso a este documento', 403);
    if (!almacenPdf) throw errorActividad('La descarga de documentos aún no está configurada', 503);
    res.attachment(documento.nombre).type('application/pdf').send(await almacenPdf.leer(documento));
  });
}
