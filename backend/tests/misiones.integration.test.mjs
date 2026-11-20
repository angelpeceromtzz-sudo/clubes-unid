import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import pg from 'pg';
import { crearRouterActividades } from '../lib/actividadesRouter.js';
import { camposMisiones, configuracionMisionesInicial, adoptarFormatoMegamisiones, FORMATO_MEGAMISIONES } from '../lib/actividadesDominio.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
describe('Misiones v2: invitados, PDF, pedidos y QR con PostgreSQL', { skip: !connectionString }, () => {
  const esquema = 'misiones_test_' + randomBytes(6).toString('hex');
  const bootstrap = new pg.Client({ connectionString });
  const archivos = new Map();
  const eliminados = [];
  const correos = [];
  const pdf = Buffer.from('%PDF-1.4\nDocumento ficticio de QA\n%%EOF');
  const idProducto = randomUUID();
  let db, servidor, base, misiones, trineo, antigua, nueva, mega, configuracion, registro, token, documentoOriginal, fallarCorreo = false;
  let fecha = '2026-11-18';
  const respuestas = () => ({ talla: 'M', tipo_sangre: 'O+', rol_mision: 'Responsable', alergias: 'No', participacion_previa: 'No' });
  const contacto = (correo = 'invitado@example.test') => ({ nombre_completo: 'Invitado QA', correo, telefono: '9811234567', respuestas: respuestas(), pedido: [{ id_producto: idProducto, cantidad: 1, talla: 'M' }], total_centavos: 35000 });

  async function enviar(usuario, metodo, ruta, datos, esperado = 200, acceso = null, archivo = null) {
    const headers = usuario ? { 'x-qa-user': String(usuario), Authorization: 'Bearer qa-' + usuario } : {};
    if (acceso) headers.Authorization = 'Registro ' + acceso;
    let body;
    if (archivo !== null) {
      body = new FormData();
      if (datos !== undefined) body.append('formulario', JSON.stringify(datos));
      if (archivo !== false) body.append('pdf', new Blob([archivo], { type: 'application/pdf' }), 'codigo-qa.pdf');
    } else if (datos !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(datos); }
    const respuesta = await fetch(base + ruta, { method: metodo, headers, body });
    const esPdf = respuesta.headers.get('content-type')?.includes('application/pdf');
    const resultado = esPdf ? Buffer.from(await respuesta.arrayBuffer()) : await respuesta.json();
    assert.equal(respuesta.status, esperado, metodo + ' ' + ruta + ': ' + (esPdf ? 'PDF' : JSON.stringify(resultado)));
    assert.match(respuesta.headers.get('cache-control'), /private, no-store/);
    return resultado;
  }
  async function publicar() {
    await enviar(2, 'POST', '/gestion/ediciones/' + nueva + '/revision', {});
    await enviar(4, 'POST', '/gestion/ediciones/' + nueva + '/decision', { aprobar: true });
  }

  before(async () => {
    await bootstrap.connect();
    await bootstrap.query('CREATE SCHEMA ' + esquema);
    await bootstrap.query('SET search_path TO ' + esquema);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    await bootstrap.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional,institutional_id,id_rol) VALUES(1,'Alumno QA','alumno@example.test','00000001',1),(2,'Encargado QA','encargado@example.test','00000002',2),(3,'Admin QA','admin@example.test','00000003',3),(4,'Rectoría QA','rectoria@example.test','00000004',4),(9,'Otra persona QA','otro@example.test','00000009',1)");
    misiones = (await bootstrap.query("SELECT id_club FROM clubes WHERE plantilla='misiones'")).rows[0].id_club;
    trineo = (await bootstrap.query("SELECT id_club FROM clubes WHERE plantilla='trineo'")).rows[0].id_club;
    await bootstrap.query("UPDATE clubes SET id_responsable_club=2,estado_publicacion='publicada' WHERE id_club=ANY($1::int[])", [[misiones, trineo]]);
    antigua = (await bootstrap.query("INSERT INTO actividades_ediciones(id_actividad,nombre,estado,fecha_inicio,inscripcion_desde,inscripcion_hasta,requiere_registro) VALUES($1,'Misiones anteriores','publicada','2026-12-05','2026-11-01','2026-12-04',TRUE) RETURNING id_edicion", [misiones])).rows[0].id_edicion;
    db = new pg.Pool({ connectionString, options: '-c search_path=' + esquema, max: 8 });
    const autenticar = async (req, res, next) => {
      const usuario = (await db.query('SELECT id_usuario AS id,id_rol FROM usuarios WHERE id_usuario=$1 AND deleted_at IS NULL', [Number(req.headers['x-qa-user']) || -1])).rows[0];
      if (!usuario) return res.status(401).json({ error: 'Sesión requerida' });
      req.user = usuario; next();
    };
    const almacenPdf = {
      async guardar(archivo) {
        const public_id = 'qa/' + randomUUID();
        archivos.set(public_id, archivo.buffer);
        return { public_id, nombre: archivo.originalname, bytes: archivo.buffer.length, sha256: createHash('sha256').update(archivo.buffer).digest('hex') };
      },
      async leer(documento) { return archivos.get(documento.public_id); },
      async eliminar(documento) { eliminados.push(documento.public_id); archivos.delete(documento.public_id); },
    };
    const app = express(); app.use(express.json());
    app.use('/actividades', crearRouterActividades({ db, autenticar, hoy: () => fecha, almacenPdf, correoMisiones: { async enviarEnlace(datos) { if (fallarCorreo) throw new Error('Fallo simulado'); correos.push(datos); } } }));
    servidor = app.listen(0, '127.0.0.1'); await new Promise((resolve) => servidor.once('listening', resolve));
    base = 'http://127.0.0.1:' + servidor.address().port + '/actividades';
  });
  after(async () => {
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
    if (db) await db.end();
    await bootstrap.query('ROLLBACK');
    await bootstrap.query('DROP SCHEMA IF EXISTS ' + esquema + ' CASCADE');
    await bootstrap.end();
  });

  test('solo las nuevas ediciones usan v2, sin convertir anteriores ni abrir otros programas a invitados', async () => {
    configuracion = { ...configuracionMisionesInicial(null), codigo_obligatorio: true, productos: [{ id_producto: idProducto, nombre: 'Sudadera QA', precio_centavos: 35000, requiere_talla: true, tallas: ['M', 'G'], activo: true }] };
    const campos = camposMisiones().map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['M', 'G'] } : campo.clave === 'tipo_sangre' ? { ...campo, obligatorio: true } : campo);
    nueva = (await enviar(2, 'POST', '/gestion/actividades/' + misiones + '/ediciones', { nombre: 'Misiones nuevas QA', lugar: 'Campus QA', fecha_inicio: '2026-12-05', fecha_fin: '2026-12-06', inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04', requiere_registro: true, configuracion_misiones: configuracion, campos_registro: campos }, 201)).id_edicion;
    assert.equal((await db.query('SELECT configuracion_misiones FROM actividades_ediciones WHERE id_edicion=$1', [antigua])).rows[0].configuracion_misiones, null);
    await enviar(2, 'PUT', '/gestion/ediciones/' + antigua, { configuracion_misiones: configuracion, campos_registro: campos }, 400);
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva, { configuracion_misiones: null }, 400);
    await enviar(null, 'POST', '/ediciones/' + antigua + '/invitados', contacto(), 404);
    assert.equal((await enviar(null, 'GET', '/ediciones/' + antigua + '/acceso-invitados')).habilitado, false);
    await enviar(2, 'POST', '/gestion/ediciones/' + nueva + '/revision', {}, 400);
    await assert.rejects(db.query('UPDATE actividades_ediciones SET configuracion_misiones=$1 WHERE id_edicion=$2', [configuracion, antigua]), { code: '23514' });
    const otro = (await db.query("INSERT INTO actividades_ediciones(id_actividad,nombre,estado,fecha_inicio,inscripcion_desde,inscripcion_hasta,requiere_registro) VALUES($1,'Otro programa','publicada','2026-12-05','2026-11-01','2026-12-04',TRUE) RETURNING id_edicion", [trineo])).rows[0].id_edicion;
    await enviar(null, 'POST', '/ediciones/' + otro + '/invitados', contacto(), 404);
  });

  test('autoriza los PDFs antes de cargarlos y Rectoría revisa la configuración completa', async () => {
    const antes = archivos.size;
    await enviar(9, 'POST', '/gestion/actividades/' + misiones + '/codigo-conducta', undefined, 403, null, pdf);
    await enviar(2, 'POST', '/gestion/actividades/' + misiones + '/codigo-conducta', undefined, 400, null, Buffer.from('No es PDF'));
    assert.equal(archivos.size, antes);
    const documento = await enviar(2, 'POST', '/gestion/actividades/' + misiones + '/codigo-conducta', undefined, 201, null, pdf);
    documentoOriginal = documento.id_documento;
    await enviar(null, 'GET', '/documentos-misiones/' + documentoOriginal, undefined, 403);
    configuracion = { ...configuracion, codigo_documento: documentoOriginal };
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva, { configuracion_misiones: configuracion });
    await publicar();
    assert.deepEqual(await enviar(null, 'GET', '/documentos-misiones/' + documentoOriginal), pdf);
    assert.equal((await enviar(null, 'GET', '/ediciones/' + nueva + '/acceso-invitados')).habilitado, true);
  });

  test('valida sangre y preguntas condicionales, exige el PDF y registra al invitado con pedido y enlace', async () => {
    await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', contacto(), 400);
    await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', { ...contacto(), respuestas: { ...respuestas(), tipo_sangre: 'No lo sé' } }, 400, null, pdf);
    await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', { ...contacto(), respuestas: { ...respuestas(), alergias: 'Sí' } }, 400, null, pdf);
    const resultado = await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', contacto(), 201, null, pdf);
    registro = resultado.registro; token = resultado.token;
    assert.equal(resultado.correo_enviado, true);
    assert.equal(token.length, 43);
    assert.equal(registro.id_usuario, null); assert.equal(registro.matricula, null);
    assert.equal(registro.pedido.total_centavos, 35000);
    assert.equal(registro.invitado_token_hash, undefined);
    assert.equal(correos.at(-1).token, token);
    assert.equal((await db.query('SELECT invitado_token_hash FROM actividades_registros WHERE id_registro=$1', [registro.id_registro])).rows[0].invitado_token_hash, createHash('sha256').update(token).digest('hex'));
    await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', { ...contacto(), nombre_completo: 'Intento de reemplazo' }, 409, null, pdf);
    assert.equal((await db.query('SELECT nombre_completo FROM actividades_registros WHERE id_registro=$1', [registro.id_registro])).rows[0].nombre_completo, 'Invitado QA');
  });

  test('el enlace solo permite consultar su registro y sus archivos, sin conceder permisos de Responsable', async () => {
    await enviar(null, 'GET', '/invitados/' + registro.folio, undefined, 401);
    await enviar(null, 'GET', '/invitados/' + registro.folio, undefined, 401, 'a'.repeat(43));
    const datos = await enviar(null, 'GET', '/invitados/' + registro.folio, undefined, 200, token);
    assert.equal(datos.registro.invitado_token_hash, undefined);
    await enviar(null, 'GET', '/documentos-misiones/' + registro.codigo_firmado_id, undefined, 403);
    await enviar(9, 'GET', '/documentos-misiones/' + registro.codigo_firmado_id, undefined, 403);
    assert.deepEqual(await enviar(null, 'GET', '/documentos-misiones/' + registro.codigo_firmado_id, undefined, 200, token), pdf);
    assert.deepEqual(await enviar(2, 'GET', '/documentos-misiones/' + registro.codigo_firmado_id), pdf);
    await enviar(null, 'GET', '/gestion', undefined, 401, token);
    const lista = await enviar(2, 'GET', '/gestion/ediciones/' + nueva);
    assert.equal(lista.registros[0].invitado_token_hash, undefined);
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM usuarios')).rows[0].total, 5);
  });

  test('los cambios de precios conservan el pedido anterior y exigen revisar una nueva cotización', async () => {
    configuracion = { ...configuracion, productos: configuracion.productos.map((producto) => ({ ...producto, precio_centavos: 40000 })) };
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva, { configuracion_misiones: configuracion });
    await publicar();
    const mismo = await enviar(null, 'PUT', '/invitados/' + registro.folio, { ...contacto(), nombre_completo: 'Invitado corregido' }, 200, token);
    assert.equal(mismo.registro.pedido.total_centavos, 35000);
    const pedido = [{ id_producto: idProducto, cantidad: 2, talla: 'M' }];
    await enviar(null, 'PUT', '/invitados/' + registro.folio, { ...contacto(), pedido, total_centavos: 70000 }, 409, token);
    const cambio = await enviar(null, 'PUT', '/invitados/' + registro.folio, { ...contacto(), pedido, total_centavos: 80000 }, 200, token);
    assert.equal(cambio.registro.pedido.total_centavos, 80000);
    assert.equal(cambio.registro.codigo_firmado_id, registro.codigo_firmado_id);
  });

  test('el fallo de correo conserva la inscripción y el PDF; se puede reenviar con su acceso', async () => {
    fallarCorreo = true;
    const segundo = await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', { ...contacto('segundo@example.test'), total_centavos: 40000 }, 201, null, pdf);
    assert.equal(segundo.correo_enviado, false);
    await enviar(null, 'GET', '/invitados/' + segundo.registro.folio, undefined, 200, segundo.token);
    await enviar(null, 'POST', '/invitados/' + segundo.registro.folio + '/reenviar-enlace', {}, 503, segundo.token);
    fallarCorreo = false;
    await enviar(null, 'POST', '/invitados/' + segundo.registro.folio + '/reenviar-enlace', {}, 200, segundo.token);
    await enviar(null, 'POST', '/invitados/' + segundo.registro.folio + '/reenviar-enlace', {}, 401, token);
  });

  test('UNID conserva la identidad de su cuenta y los PDFs se limpian si se revierte la transacción', async () => {
    const alumno = await enviar(1, 'PUT', '/ediciones/' + nueva + '/registro', { matricula: '999999', nombre_completo: 'Suplantación', respuestas: respuestas(), pedido: [], total_centavos: 0 }, 200, null, pdf);
    assert.equal(alumno.nombre_completo, 'Alumno QA'); assert.equal(alumno.matricula, '00000001');
    assert.equal(alumno.tipo_participante, 'unid');
    const antes = (await db.query('SELECT COUNT(*)::int AS total FROM misiones_documentos')).rows[0].total;
    await db.query("CREATE FUNCTION qa_fallo_misiones() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo_evento='registro_confirmado' THEN RAISE EXCEPTION 'Fallo QA'; END IF; RETURN NEW; END $$; CREATE TRIGGER qa_fallo_misiones BEFORE INSERT ON actividad_clubes FOR EACH ROW EXECUTE FUNCTION qa_fallo_misiones()");
    try { await enviar(null, 'POST', '/ediciones/' + nueva + '/invitados', { ...contacto('rollback@example.test'), total_centavos: 40000 }, 500, null, pdf); }
    finally { await db.query('DROP TRIGGER qa_fallo_misiones ON actividad_clubes; DROP FUNCTION qa_fallo_misiones()'); }
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM misiones_documentos')).rows[0].total, antes);
    assert.equal((await db.query("SELECT COUNT(*)::int AS total FROM actividades_registros WHERE correo='rollback@example.test'")).rows[0].total, 0);
    assert.equal(eliminados.length, 1);
  });

  test('el mismo QR registra invitados, es idempotente y respeta fechas y correcciones', async () => {
    const acceso = await enviar(2, 'POST', '/gestion/ediciones/' + nueva + '/asistencia/acceso', {});
    await enviar(null, 'POST', '/invitados/' + registro.folio + '/asistencia', { codigo: acceso.codigo, origen: 'qr' }, 409, token);
    fecha = '2026-12-05';
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva + '/inscripciones', { abiertas: false });
    await enviar(null, 'POST', '/invitados/' + registro.folio + '/asistencia', { codigo: 'ABCDEFGH', origen: 'qr' }, 400, token);
    const [primera, segunda] = await Promise.all([1, 2].map(() => enviar(null, 'POST', '/invitados/' + registro.folio + '/asistencia', { codigo: acceso.codigo, origen: 'qr' }, 200, token)));
    assert.equal(primera.asistencia.registrada_en, segunda.asistencia.registrada_en);
    const lista = await enviar(2, 'GET', '/gestion/ediciones/' + nueva + '/asistencia');
    assert.equal(lista.registros.find((fila) => fila.id_registro === registro.id_registro).tipo_participante, 'invitado');
    await enviar(null, 'PUT', '/invitados/' + registro.folio, contacto(), 409, token);
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva + '/asistencia/' + registro.id_registro, { estado: 'anulada', motivo: 'Corrección QA' });
    await enviar(null, 'POST', '/invitados/' + registro.folio + '/asistencia', { codigo: acceso.codigo, origen: 'qr' }, 409, token);
    await enviar(2, 'PUT', '/gestion/ediciones/' + nueva + '/asistencia/' + registro.id_registro, { estado: 'presente', motivo: 'Llegada comprobada QA' });
    fecha = '2026-12-07';
    await enviar(null, 'POST', '/invitados/' + registro.folio + '/asistencia', { codigo: acceso.codigo, origen: 'qr' }, 409, token);
  });

  test('la actualización manual se puede repetir y conserva firmas, pedidos, acceso y asistencia', async () => {
    const antes = (await db.query('SELECT * FROM actividades_registros ORDER BY id_registro')).rows;
    const migracion = await readFile(new URL('../migrations/migrate-misiones-registro-v2.sql', import.meta.url), 'utf8');
    await db.query(migracion); await db.query(migracion);
    await db.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    assert.deepEqual((await db.query('SELECT * FROM actividades_registros ORDER BY id_registro')).rows, antes);
    await assert.rejects(db.query(`INSERT INTO actividades_registros(id_edicion,nombre_completo,tipo_participante,folio,correo,telefono,invitado_token_hash)
      VALUES($1,'Invitado fuera de alcance','invitado',$2,'fuera@example.test','9811234567',$3)`, [antigua, randomUUID(), 'a'.repeat(64)]), { code: '23514' });
    const datos = await enviar(null, 'GET', '/invitados/' + registro.folio, undefined, 200, token);
    assert.equal(datos.asistencia.estado, 'presente');
  });

  const datosMega = () => ({ nombre: 'MEGAMISIONES QA', lugar: 'Campus QA', fecha_inicio: '2026-12-05', fecha_fin: '2026-12-06', inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04', requiere_registro: true });
  const respuestasMega = () => ({ fecha_nacimiento: '2004-02-29', sexo: 'Mujer', rol_mision: 'Misionero', campus: 'Campeche', familia_unid: 'Invitado', cuatrimestre: 'N/A', tipo_sangre: 'A+', alergias_medicamentos: 'Ninguna', alergias_alimentos: 'Ninguna', enfermedades: 'Ninguna', tutor_nombre: 'Contacto QA', tutor_telefono: '+52 (981) 123-4567', talla: 'Mediana', religion: 'Ninguna', grupo_juvenil: 'No pertenezco', conocimientos_misiones: 'Servicio en comunidad.', participacion_previa: 'Nunca' });

  test('las nuevas ediciones reciben MEGAMISIONES y conservan disponibles las ediciones anteriores', async () => {
    fecha = '2026-11-18';
    const creada = await enviar(2, 'POST', '/gestion/actividades/' + misiones + '/ediciones', datosMega(), 201);
    mega = creada.id_edicion;
    assert.equal(creada.configuracion_misiones.formato, FORMATO_MEGAMISIONES);
    assert.equal(creada.configuracion_misiones.version, 2);
    assert.equal(creada.campos_registro.length, 21);
    assert.ok(creada.campos_registro.some((campo) => campo.clave === 'fecha_nacimiento' && campo.tipo === 'fecha' && campo.no_futura));
    assert.equal((await enviar(2, 'GET', '/gestion/ediciones/' + mega)).puede_adoptar_formato, false);
    await enviar(2, 'POST', '/gestion/ediciones/' + mega + '/revision', {});
    await enviar(4, 'POST', '/gestion/ediciones/' + mega + '/decision', { aprobar: true });
    assert.equal((await enviar(null, 'GET', '/ediciones/' + mega + '/acceso-invitados')).habilitado, true);
    const anteriores = (await db.query('SELECT configuracion_misiones FROM actividades_ediciones WHERE id_edicion=ANY($1::int[]) ORDER BY id_edicion', [[antigua, nueva]])).rows;
    assert.equal(anteriores[0].configuracion_misiones, null);
    assert.equal(anteriores[1].configuracion_misiones.formato, undefined);
  });

  test('MEGAMISIONES exige fecha y teléfonos y guarda la identidad UNID sin otorgar permisos por el rol declarado', async () => {
    const ruta = '/ediciones/' + mega + '/registro';
    const body = { respuestas: respuestasMega(), telefono: '+52 981 222 3344', nombre_completo: 'Nombre alterado', correo: 'otro@example.test', matricula: '999', pedido: [] };
    for (const cambio of [{ telefono: '' }, { telefono: 'letras' }, { respuestas: { ...respuestasMega(), fecha_nacimiento: '2026-11-19' } }, { respuestas: { ...respuestasMega(), fecha_nacimiento: '2005-02-29' } }, { respuestas: { ...respuestasMega(), tutor_telefono: 'texto' } }]) await enviar(1, 'PUT', ruta, { ...body, ...cambio }, 400);
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM actividades_registros WHERE id_edicion=$1', [mega])).rows[0].total, 0);
    const unid = await enviar(1, 'PUT', ruta, { ...body, respuestas: { ...respuestasMega(), rol_mision: 'Responsable de equipo', id_rol: 3 } });
    assert.equal(unid.nombre_completo, 'Alumno QA');
    assert.equal(unid.correo, 'alumno@example.test');
    assert.equal(unid.matricula, '00000001');
    assert.equal(unid.telefono, '529812223344');
    assert.equal(unid.respuestas.tutor_telefono, '529811234567');
    assert.equal(unid.respuestas.id_rol, undefined);
    assert.equal(unid.misiones_snapshot.formato, FORMATO_MEGAMISIONES);
    assert.equal((await db.query('SELECT id_rol FROM usuarios WHERE id_usuario=1')).rows[0].id_rol, 1);
    await enviar(1, 'GET', '/gestion/ediciones/' + mega, undefined, 403);
  });

  test('el invitado completa y corrige MEGAMISIONES con su enlace y se descartan campos condicionales ocultos', async () => {
    const body = { nombre_completo: 'Invitada MEGA QA', correo: 'mega@example.test', telefono: '+52 981 333 4455', respuestas: { ...respuestasMega(), participacion_previa: 'Sí' }, pedido: [] };
    await enviar(null, 'POST', '/ediciones/' + mega + '/invitados', body, 400);
    const creada = await enviar(null, 'POST', '/ediciones/' + mega + '/invitados', { ...body, respuestas: { ...respuestasMega(), participacion_previa: 'Sí', participaciones_veces: '5 o más ocasiones', grupo_juvenil: 'Otro', grupo_juvenil_otro: 'Grupo QA', parroquia: 'Comunidad QA' } }, 201);
    assert.equal(creada.registro.telefono, '529813334455');
    assert.equal(creada.registro.misiones_snapshot.formato, FORMATO_MEGAMISIONES);
    const editada = await enviar(null, 'PUT', '/invitados/' + creada.registro.folio, { ...body, respuestas: { ...respuestasMega(), grupo_juvenil_otro: 'Ya no corresponde', parroquia: 'Ya no corresponde', participaciones_veces: '5 o más ocasiones' } }, 200, creada.token);
    for (const clave of ['grupo_juvenil_otro', 'parroquia', 'participaciones_veces']) assert.equal(editada.registro.respuestas[clave], undefined);
    await enviar(null, 'GET', '/invitados/' + creada.registro.folio, undefined, 401, token);
    const publica = await enviar(null, 'GET', '/detalle/misiones');
    assert.equal(JSON.stringify(publica).includes('mega@example.test'), false);
    const antes = (await db.query('SELECT formulario_snapshot,misiones_snapshot FROM actividades_registros WHERE id_registro=$1', [creada.registro.id_registro])).rows[0];
    const edicion = (await enviar(2, 'GET', '/gestion/ediciones/' + mega)).edicion;
    await enviar(2, 'PUT', '/gestion/ediciones/' + mega, { campos_registro: edicion.campos_registro.map((campo) => campo.clave === 'sexo' ? { ...campo, etiqueta: 'Sexo de la persona participante' } : campo) });
    await enviar(2, 'POST', '/gestion/ediciones/' + mega + '/revision', {});
    await enviar(4, 'POST', '/gestion/ediciones/' + mega + '/decision', { aprobar: true });
    assert.deepEqual((await db.query('SELECT formulario_snapshot,misiones_snapshot FROM actividades_registros WHERE id_registro=$1', [creada.registro.id_registro])).rows[0], antes);
  });

  test('la adopción explícita funciona desde borradores clásicos y v2, conservando documentos y catálogo', async () => {
    const borradorV2 = await enviar(2, 'POST', '/gestion/actividades/' + misiones + '/ediciones', { ...datosMega(), configuracion_misiones: configuracion, campos_registro: camposMisiones().map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['M', 'G'] } : campo) }, 201);
    const borradorClasico = (await db.query("INSERT INTO actividades_ediciones(id_actividad,nombre,estado) VALUES($1,'Borrador clásico QA','borrador') RETURNING id_edicion", [misiones])).rows[0];
    for (const id of [borradorV2.id_edicion, borradorClasico.id_edicion]) {
      const detalle = await enviar(2, 'GET', '/gestion/ediciones/' + id);
      assert.equal(detalle.puede_adoptar_formato, true);
      const adaptada = adoptarFormatoMegamisiones(detalle.edicion);
      await enviar(9, 'PUT', '/gestion/ediciones/' + id, adaptada, 403);
      const guardada = await enviar(2, 'PUT', '/gestion/ediciones/' + id, adaptada);
      assert.equal(guardada.configuracion_misiones.formato, FORMATO_MEGAMISIONES);
      assert.equal((await enviar(2, 'GET', '/gestion/ediciones/' + id)).puede_adoptar_formato, false);
      if (id === borradorV2.id_edicion) {
        assert.deepEqual(guardada.configuracion_misiones.productos, configuracion.productos);
        assert.equal(guardada.configuracion_misiones.codigo_documento, documentoOriginal);
      }
    }
  });

  test('API y SQL impiden cambiar formatos publicados o con registros, incluso cancelados', async () => {
    const configMega = configuracionMisionesInicial();
    const payload = { configuracion_misiones: configMega, campos_registro: camposMisiones(configMega) };
    const datos = (await db.query("INSERT INTO actividades_ediciones(id_actividad,nombre,estado) VALUES($1,'Borrador con historial QA','borrador') RETURNING id_edicion", [misiones])).rows[0];
    await db.query("INSERT INTO actividades_registros(id_edicion,id_usuario,nombre_completo,matricula,estado) VALUES($1,9,'Historial QA','00000009','cancelado')", [datos.id_edicion]);
    for (const id of [antigua, nueva, datos.id_edicion]) {
      assert.equal((await enviar(2, 'GET', '/gestion/ediciones/' + id)).puede_adoptar_formato, false);
      await enviar(2, 'PUT', '/gestion/ediciones/' + id, payload, 409);
      await assert.rejects(db.query('UPDATE actividades_ediciones SET configuracion_misiones=$1,campos_registro=$2 WHERE id_edicion=$3', [configMega, JSON.stringify(payload.campos_registro), id]), { code: '23514' });
    }
    await enviar(2, 'PUT', '/gestion/ediciones/' + mega, { configuracion_misiones: { ...configMega, formato: 'otro' } }, 400);
    await assert.rejects(db.query("UPDATE actividades_ediciones SET configuracion_misiones=jsonb_set(configuracion_misiones,'{formato}','\"otro\"') WHERE id_edicion=$1", [mega]), { code: '23514' });
  });

  test('la migración de MEGAMISIONES es repetible y conserva todas las respuestas y formatos', async () => {
    const antes = (await db.query('SELECT * FROM actividades_registros ORDER BY id_registro')).rows;
    const ediciones = (await db.query('SELECT * FROM actividades_ediciones ORDER BY id_edicion')).rows;
    const migracion = await readFile(new URL('../migrations/migrate-misiones-megamisiones.sql', import.meta.url), 'utf8');
    await db.query(migracion); await db.query(migracion);
    await db.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    assert.deepEqual((await db.query('SELECT * FROM actividades_registros ORDER BY id_registro')).rows, antes);
    assert.deepEqual((await db.query('SELECT * FROM actividades_ediciones ORDER BY id_edicion')).rows, ediciones);
  });
});
