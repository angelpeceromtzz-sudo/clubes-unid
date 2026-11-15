import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import pg from 'pg';
import { crearRouterActividades } from '../lib/actividadesRouter.js';
import { migrarLegadoActividades } from '../lib/actividadesLegado.js';
import { crearRouterConsultaActividad } from '../lib/actividadConsultaRouter.js';
import { camposPlantillaActividad } from '../../shared/actividades.js';

// Únicamente una conexión de pruebas explícita. No importa db.js ni lee .env.
const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
describe('actividades: registro, publicación, permisos y transición con PostgreSQL', { skip: !connectionString }, () => {
  const esquema = 'actividades_test_' + randomBytes(6).toString('hex');
  const bootstrap = new pg.Client({ connectionString });
  let db, servidor, base, trineo, misiones, edicionTrineo, edicionMisiones, opcion1, opcion2, aporteRecibido, subidas = 0;
  const limpiadas = [];
  const datosEdicion = (plantilla) => ({ nombre: 'Edición QA', descripcion: 'Edición ficticia de pruebas', lugar: 'Campus QA', fecha_inicio: '2026-12-05', fecha_fin: '2026-12-06', hora_inicio: '10:00', requiere_registro: true, requiere_aportacion: plantilla === 'trineo', campos_registro: camposPlantillaActividad(plantilla).map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['CH', 'M', 'G'] } : campo), inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04', destacable: true, destacada_desde: '2026-11-10', destacada_hasta: '2026-12-06' });
  const inscripcion = (aportes = true) => ({ matricula: '99999999', respuestas: { edad: 20, talla: 'M', licenciatura: 1 }, aportaciones: aportes ? [{ id_opcion: opcion1, cantidad: 1 }, { id_opcion: opcion2, cantidad: 2 }] : [] });

  async function enviar(usuario, metodo, ruta, datos, esperado = 200) {
    const respuesta = await fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...(usuario ? { 'x-usuario-qa': String(usuario) } : {}) }, ...(datos === undefined ? {} : { body: JSON.stringify(datos) }) });
    const texto = await respuesta.text();
    assert.equal(respuesta.status, esperado, metodo + ' ' + ruta + ': ' + texto);
    assert.match(respuesta.headers.get('cache-control'), /private, no-store/);
    return JSON.parse(texto);
  }
  async function publicar(usuario, tipo, id) {
    await enviar(usuario, 'POST', '/gestion/' + tipo + '/' + id + '/revision', {});
    return enviar(4, 'POST', '/gestion/' + tipo + '/' + id + '/decision', { aprobar: true });
  }

  before(async () => {
    await bootstrap.connect();
    await bootstrap.query('CREATE SCHEMA ' + esquema);
    await bootstrap.query('SET search_path TO ' + esquema);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    await bootstrap.query("INSERT INTO usuarios(id_usuario,nombre_completo,institutional_id,id_rol,correo_institucional) SELECT id,nombre,lpad(id::text,8,'0'),rol,'qa'||id||'@example.test' FROM (VALUES (1,'Alumno QA',1),(2,'Encargado QA',2),(3,'Admin QA',3),(4,'Rectoría QA',4),(7,'Coordinación QA',7),(11,'Alumno Once QA',1),(12,'Alumno Doce QA',1),(22,'Encargado asignado QA',1),(31,'Alumno legado QA',1),(32,'Rechazado legado QA',1)) AS actores(id,nombre,rol); INSERT INTO clubes (id_club,nombre_club,cupo_maximo,id_estatus_club,estado_publicacion) VALUES (101,'Club real QA',10,1,'publicada'),(8,'Trineo legado QA',10,1,'publicada'); INSERT INTO clubes_niveles(id_club,id_nivel) VALUES(101,1),(8,1); INSERT INTO inscripciones (id_usuario,id_club) VALUES (1,101),(31,8); INSERT INTO formularios (id_alumno,id_club,nombre_completo,matricula,id_licenciatura,cuatrimestre,telefono_contacto,motivo_ingreso,status) SELECT alumno,club,nombre,matricula,1,1,'0000000000','Prueba',estado FROM (VALUES (1,101,'Alumno QA','00000001','En revisión'),(1,101,'Alumno QA','00000001','Convocado'),(1,101,'Alumno QA','00000001','Preseleccionado'),(31,8,'Alumno legado QA','00000031','En revisión'),(32,8,'Rechazado legado QA','00000032','Rechazado')) AS f(alumno,club,nombre,matricula,estado);");
    await bootstrap.query("SELECT setval(pg_get_serial_sequence('clubes','id_club'),(SELECT MAX(id_club) FROM clubes))");
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    db = new pg.Pool({ connectionString, max: 8, options: '-c search_path=' + esquema });
    const autenticar = async (req, res, next) => {
      const usuario = (await db.query('SELECT id_usuario AS id,id_rol FROM usuarios WHERE id_usuario = $1 AND deleted_at IS NULL', [Number(req.headers['x-usuario-qa']) || -1])).rows[0];
      if (!usuario) return res.status(401).json({ error: 'Sesión requerida' });
      req.user = usuario; next();
    };
    const subirImagen = {
      single: () => (req, _res, next) => { subidas += 1; req.file = { path: 'https://example.test/foto-qa.jpg', filename: 'clubs-unid/qa' }; next(); },
      array: () => (req, _res, next) => {
        subidas += 1;
        req.files = Array.from({ length: req.body.cantidad_qa ?? 2 }, (_valor, indice) => ({ path: req.body.fallo_qa && indice === 1 ? null : 'https://example.test/foto-' + indice + '.jpg', filename: 'clubs-unid/qa-' + indice }));
        next();
      },
    };
    const app = express();
    app.use(express.json());
    app.use('/api/bitacora', crearRouterConsultaActividad({db,autenticar}));
    app.use('/api/actividades', crearRouterActividades({ db, autenticar, hoy: () => '2026-11-14', subirImagen, secretoAdmin: 'qa-secret', limpiarImagenes: async (archivos) => limpiadas.push(...archivos) }));
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = 'http://127.0.0.1:' + servidor.address().port + '/api/actividades';
    trineo = (await db.query("SELECT id_actividad FROM actividades WHERE plantilla = 'trineo'")).rows[0].id_actividad;
    misiones = (await db.query("SELECT id_actividad FROM actividades WHERE plantilla = 'misiones'")).rows[0].id_actividad;
  });

  after(async () => {
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
    if (db) await db.end();
    await bootstrap.query('ROLLBACK');
    await bootstrap.query('DROP SCHEMA IF EXISTS ' + esquema + ' CASCADE');
    await bootstrap.end();
  });

  test('schema consolidado repetible y Oferta sin fechas ni encargados inventados', async () => {
    const publico = await enviar(null, 'GET', '/');
    assert.equal(publico.actividades.length, 2);
    assert.ok(publico.actividades.every((actividad) => actividad.ediciones.length === 0 && !('id_responsable' in actividad)));
    await enviar(null, 'GET', '/gestion', undefined, 401);
    await enviar(1, 'POST', '/gestion/actividades', { nombre: 'Sin permiso' }, 403);
  });

  test('crea actividades de cualquier tipo sin permitir publicar desde el formulario', async () => {
    const actividad = await enviar(2, 'POST', '/gestion/actividades', { nombre: 'Taller QA', descripcion: 'Un taller de prueba', categoria: 'Cualquier categoría', estado: 'publicada', plantilla: 'trineo' }, 201);
    assert.equal(actividad.estado, 'borrador'); assert.equal(actividad.plantilla, 'general');
    await enviar(2, 'POST', '/gestion/actividades/' + actividad.id_actividad + '/revision', {});
    await enviar(7, 'POST', '/gestion/actividades/' + actividad.id_actividad + '/decision', { aprobar: true }, 403);
    await enviar(4, 'POST', '/gestion/actividades/' + actividad.id_actividad + '/decision', { aprobar: false, motivo: '' }, 400);
    await enviar(4, 'POST', '/gestion/actividades/' + actividad.id_actividad + '/decision', { aprobar: false, motivo: 'Completar información' });
    assert.equal((await enviar(null, 'GET', '/')).actividades.some((item) => item.id_actividad === actividad.id_actividad), false);
  });

  test('guarda una edición con sus aportaciones desde el asistente y rechaza lotes incompletos',async()=>{
    const actividad=await enviar(2,'POST','/gestion/actividades',{nombre:'Actividad del asistente QA',descripcion:'Prueba de guardado conjunto',categoria:'Servicio'},201);
    const ruta='/gestion/actividades/'+actividad.id_actividad+'/ediciones';
    const datos={...datosEdicion('trineo'),catalogo_aportaciones:[{nombre:'Kit QA',unidad:'piezas',cantidad_minima:2}]};
    const edicion=await enviar(2,'POST',ruta,datos,201);
    const opciones=(await enviar(2,'GET','/gestion/ediciones/'+edicion.id_edicion)).catalogo;
    assert.equal(opciones.length,1);assert.equal(opciones[0].nombre,'Kit QA');assert.equal(Number(opciones[0].cantidad_minima),2);
    await enviar(2,'POST',ruta,{...datos,catalogo_aportaciones:[]},400);
    await enviar(2,'POST',ruta,{...datos,catalogo_aportaciones:[...datos.catalogo_aportaciones,{nombre:'Inválido',unidad:'piezas',cantidad_minima:true}]},400);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_ediciones WHERE id_actividad=$1',[actividad.id_actividad])).rows[0].n,1);
  });

  test('crea clubes desde el catálogo con sus propios permisos, cupos y niveles',async()=>{
    const datos={tipo:'club',nombre:'Club nuevo QA',descripcion:'Nuevo club',categoria:'Cultural',cupo_maximo:20,participacion:'mixta',niveles:[1,2],password:'qa-secret'};
    await enviar(2,'POST','/gestion/actividades',datos,403);
    await enviar(3,'POST','/gestion/actividades',{...datos,password:'incorrecta'},403);
    await enviar(3,'POST','/gestion/actividades',{...datos,niveles:[]},400);
    const club=await enviar(3,'POST','/gestion/actividades',datos,201);
    assert.equal(club.tipo,'club'); assert.equal(club.estado,'borrador'); assert.equal(club.id_responsable,null);
    await enviar(3,'POST','/gestion/actividades',{...datos,nombre:'Otro club QA'},201);
    assert.equal((await enviar(null,'GET','/?tipo=todos')).actividades.some((item)=>item.id_club===club.id_club),false);
    await publicar(3,'actividades',club.id_actividad);
    assert.equal((await enviar(null,'GET','/?tipo=club')).actividades.some((item)=>item.id_club===club.id_club),true);
    await enviar(3,'POST','/gestion/actividades/'+club.id_actividad+'/ediciones',datosEdicion('general'),400);
    await enviar(3,'PUT','/gestion/actividades/'+club.id_actividad,{tipo:'actividad'},409);
    await enviar(4,'PUT','/gestion/actividades/'+club.id_actividad+'/responsable',{id_responsable:12},403);
    await enviar(7,'PUT','/gestion/actividades/'+club.id_actividad+'/responsable',{id_responsable:3},400);
    await enviar(7,'PUT','/gestion/actividades/'+club.id_actividad+'/responsable',{id_responsable:12});
    assert.equal((await db.query('SELECT id_rol FROM usuarios WHERE id_usuario=12')).rows[0].id_rol,2);
    assert.deepEqual((await db.query('SELECT id_nivel FROM clubes_niveles WHERE id_club=$1 ORDER BY id_nivel',[club.id_club])).rows.map((fila)=>fila.id_nivel),[1,2]);
  });

  test('los procesos de club rechazan actividades incluso con SQL directo',async()=>{
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM clubes_operativos WHERE id_club=$1',[trineo])).rows[0].n,0);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM clubes_con_estado WHERE id_club=$1',[trineo])).rows[0].n,0);
    await assert.rejects(db.query('INSERT INTO inscripciones(id_usuario,id_club) VALUES(12,$1)',[trineo]),{code:'23514'});
    await assert.rejects(db.query("INSERT INTO formularios(id_alumno,id_club,nombre_completo,matricula,id_licenciatura,cuatrimestre,telefono_contacto,motivo_ingreso) VALUES(12,$1,'QA','00000012',1,1,'000','QA')",[trineo]),{code:'23514'});
    await assert.rejects(db.query("INSERT INTO clubes_operativos(nombre_club,cupo_maximo,tipo) VALUES('Inválido',10,'actividad')"),{code:'44000'});
    await assert.rejects(db.query("UPDATE clubes SET tipo='actividad' WHERE id_club=101"),{code:'23514'});
  });

  test('clubes y actividades comparten galería, revisión y privacidad',async()=>{
    await enviar(7,'PUT','/gestion/actividades/101/responsable',{id_responsable:2});
    const fotos=await enviar(2,'POST','/gestion/actividades/101/fotos/lote',{pie:'Comunidad del club'},201);
    assert.ok(fotos.every((foto)=>foto.id_club===101 && foto.id_edicion===null && foto.estado==='pendiente'));
    assert.equal((await enviar(null,'GET','/clubes/101/galeria')).fotos.length,0);
    await enviar(22,'GET','/gestion/actividades/101/fotos',undefined,403);
    await enviar(2,'PUT','/gestion/fotos/'+fotos[0].id_foto,{estado:'publicada'},403);
    await enviar(4,'PUT','/gestion/fotos/'+fotos[0].id_foto,{estado:'publicada'});
    const publico=await enviar(null,'GET','/clubes/101/galeria');
    assert.equal(publico.fotos.length,1); assert.equal('id_autor' in publico.fotos[0],false);
    await enviar(1,'PUT','/clubes/101/reaccion',{reaccion:'love'});
    assert.equal((await enviar(1,'GET','/clubes/101/mi-reaccion')).reaccion,'love');
    assert.deepEqual((await enviar(1,'PUT','/clubes/101/reaccion',{reaccion:'clap'})).totales,[{reaccion:'clap',total:1}]);
    assert.deepEqual((await enviar(1,'PUT','/clubes/101/reaccion',{reaccion:null})).totales,[]);
    await enviar(1,'PUT','/clubes/'+trineo+'/reaccion',{reaccion:'love'},404);
  });

  test('las propuestas de clubes conservan la versión pública y sus procesos operativos',async()=>{
    await enviar(2,'PUT','/gestion/actividades/101',{nombre:'Club real QA actualizado',descripcion:'Descripción del club',categoria:'Cultural',cupo_maximo:15});
    assert.equal((await enviar(null,'GET','/?tipo=club')).actividades.find((item)=>item.id_club===101).nombre,'Club real QA');
    await publicar(2,'actividades',101);
    assert.equal((await db.query('SELECT nombre_club,cupo_maximo FROM clubes_operativos WHERE id_club=101')).rows[0].nombre_club,'Club real QA actualizado');
    assert.equal((await db.query('SELECT id_club FROM inscripciones WHERE id_usuario=1')).rows[0].id_club,101);
  });

  test('asigna encargados y exige configuración completa antes de revisar', async () => {
    await enviar(7, 'PUT', '/gestion/actividades/' + trineo + '/responsable', { id_responsable: 2 });
    await enviar(7, 'PUT', '/gestion/actividades/' + misiones + '/responsable', { id_responsable: 22 });
    const edicion = await enviar(2, 'POST', '/gestion/actividades/' + trineo + '/ediciones', datosEdicion('trineo'), 201);
    edicionTrineo = edicion.id_edicion;
    await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/revision', {}, 400);
    opcion1 = (await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/catalogo', { nombre: 'Prueba A', unidad: 'piezas', cantidad_minima: 1 }, 201)).id_opcion;
    opcion2 = (await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/catalogo', { nombre: 'Prueba B', unidad: 'piezas', cantidad_minima: 2 }, 201)).id_opcion;
    await publicar(2, 'ediciones', edicionTrineo);
    edicionMisiones = (await enviar(22, 'POST', '/gestion/actividades/' + misiones + '/ediciones', datosEdicion('misiones'), 201)).id_edicion;
    await publicar(22, 'ediciones', edicionMisiones);
    const publico = await enviar(null, 'GET', '/');
    assert.equal(publico.actividades.find((item) => item.id_actividad === trineo).ediciones[0].destacada, true);
  });

  test('un alumno con club y tres postulaciones se registra sin alterar sus membresías', async () => {
    const ruta = '/ediciones/' + edicionTrineo + '/registro';
    await enviar(1, 'PUT', ruta, { ...inscripcion(), respuestas: { edad: 20 } }, 400);
    await enviar(1, 'PUT', ruta, { ...inscripcion(), aportaciones: [] }, 400);
    await enviar(1, 'PUT', ruta, { ...inscripcion(), aportaciones: [{ id_opcion: opcion1, cantidad: 0.5 }] }, 400);
    const registro = await enviar(1, 'PUT', ruta, inscripcion());
    assert.equal(registro.nombre_completo, 'Alumno QA'); assert.equal(registro.matricula, '00000001');
    assert.equal(registro.estado, 'confirmado');
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM inscripciones WHERE id_usuario = 1 AND id_estatus_inscripcion = 1')).rows[0].total, 1);
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM formularios WHERE id_alumno = 1')).rows[0].total, 3);
    await enviar(1, 'PUT', '/ediciones/' + edicionMisiones + '/registro', inscripcion(false));
    assert.equal((await enviar(1, 'GET', '/mis-registros')).length, 2);
  });

  test('doble envío concurrente conserva una inscripción y sus aportaciones', async () => {
    const ruta = '/ediciones/' + edicionTrineo + '/registro';
    const resultados = await Promise.all([enviar(11, 'PUT', ruta, inscripcion()), enviar(11, 'PUT', ruta, inscripcion())]);
    assert.equal(resultados[0].id_registro, resultados[1].id_registro);
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM actividades_registros WHERE id_usuario = 11 AND id_edicion = $1', [edicionTrineo])).rows[0].total, 1);
  });

  test('los mínimos nuevos no alteran compromisos anteriores', async () => {
    await enviar(4, 'PUT', '/gestion/catalogo/' + opcion1, { cantidad_minima: 3, nombre: 'Prueba A actualizada' });
    const registro = await enviar(11, 'PUT', '/ediciones/' + edicionTrineo + '/registro', inscripcion());
    assert.equal(Number(registro.aportaciones.find((item) => item.id_opcion === opcion1).cantidad_minima), 1);
    await enviar(12, 'PUT', '/ediciones/' + edicionTrineo + '/registro', inscripcion(), 400);
  });

  test('cancelar actualiza pendientes y conserva las aportaciones recibidas', async () => {
    const propio = await enviar(1, 'GET', '/ediciones/' + edicionTrineo + '/mi-registro');
    aporteRecibido = propio.registro.aportaciones.find((item) => item.id_opcion === opcion1).id_aportacion;
    await enviar(22, 'POST', '/gestion/aportaciones/' + aporteRecibido + '/recibir', {}, 403);
    await enviar(2, 'POST', '/gestion/aportaciones/' + aporteRecibido + '/recibir', {});
    await enviar(1, 'DELETE', '/ediciones/' + edicionTrineo + '/registro');
    const cancelado = await enviar(1, 'GET', '/ediciones/' + edicionTrineo + '/mi-registro');
    assert.equal(cancelado.registro.estado, 'cancelado');
    assert.equal(cancelado.registro.aportaciones.find((item) => item.id_opcion === opcion1).estado, 'recibida');
    assert.equal(cancelado.registro.aportaciones.find((item) => item.id_opcion === opcion2).estado, 'cancelada');
    await enviar(1, 'DELETE', '/ediciones/' + edicionTrineo + '/registro');
  });

  test('lista privada y permisos independientes de ser responsable de un club', async () => {
    await enviar(11, 'GET', '/gestion/ediciones/' + edicionTrineo, undefined, 403);
    const gestion = await enviar(22, 'GET', '/gestion');
    assert.deepEqual(gestion.actividades.map((item) => item.id_actividad), [misiones]);
    await enviar(22, 'GET', '/gestion/ediciones/' + edicionMisiones);
    const detalle = await enviar(null, 'GET', '/detalle/trineo-de-los-suenos');
    assert.equal('registros' in detalle.ediciones[0], false);
    assert.equal('id_responsable' in detalle.ediciones[0], false);
  });

  test('reacciones únicas por alumno: cambiar y retirar actualiza los totales', async () => {
    const ruta = '/ediciones/' + edicionTrineo + '/reaccion';
    await enviar(null, 'PUT', ruta, { reaccion: 'love' }, 401);
    await enviar(1, 'PUT', ruta, { reaccion: 'love' });
    const cambio = await enviar(1, 'PUT', ruta, { reaccion: 'clap' });
    assert.deepEqual(cambio.totales, [{ reaccion: 'clap', total: 1 }]);
    assert.deepEqual((await enviar(1, 'PUT', ruta, { reaccion: null })).totales, []);
  });

  test('autoriza antes de subir fotos y solo publica las aprobadas', async () => {
    const antes = subidas;
    await enviar(11, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos', {}, 403);
    assert.equal(subidas, antes);
    const foto = await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos', { pie: 'Momentos QA' }, 201);
    assert.equal(foto.estado, 'pendiente');
    assert.equal('etapa' in foto, false);
    assert.equal((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).ediciones[0].fotos.length, 0);
    await enviar(2, 'PUT', '/gestion/fotos/' + foto.id_foto, { estado: 'publicada' }, 403);
    await enviar(4, 'PUT', '/gestion/fotos/' + foto.id_foto, { estado: 'publicada' });
    assert.equal((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).ediciones[0].fotos.length, 1);
  });

  test('carga varias fotos sin etapa y las muestra juntas, con las más recientes primero', async () => {
    const anteriores = subidas;
    await enviar(11, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos/lote', { pie: 'Sin permiso' }, 403);
    assert.equal(subidas, anteriores);
    const fotos = await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos/lote', { pie: 'Álbum de la comunidad' }, 201);
    assert.equal(fotos.length, 2);
    assert.ok(fotos.every((foto) => foto.estado === 'pendiente' && !('etapa' in foto)));
    assert.equal((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).ediciones[0].fotos.length, 1);
    for (const foto of fotos) await enviar(4, 'PUT', '/gestion/fotos/' + foto.id_foto, { estado: 'publicada' });
    const publicas = (await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).ediciones[0].fotos;
    assert.equal(publicas.length, 3);
    assert.equal(publicas[0].id_foto, fotos[1].id_foto);
    assert.ok(publicas.every((foto) => foto.creado_en && !('etapa' in foto)));
    await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos/lote', { cantidad_qa: 0 }, 400);
    await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos/lote', { cantidad_qa: 11 }, 400);
  });

  test('un fallo al guardar un álbum revierte todas sus fotos y limpia las subidas', async () => {
    const antes = (await db.query('SELECT COUNT(*)::int AS total FROM actividades_fotos')).rows[0].total;
    const limpiadasAntes = limpiadas.length;
    await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/fotos/lote', { pie: 'Álbum fallido', fallo_qa: true }, 500);
    assert.equal((await db.query('SELECT COUNT(*)::int AS total FROM actividades_fotos')).rows[0].total, antes);
    assert.equal(limpiadas.length, limpiadasAntes + 2);
  });

  test('la galería comparte publicaciones y almacena una sola descripción por lote', async () => {
    const lote = (await db.query("SELECT p.id_publicacion,p.contenido,COUNT(i.id_foto)::int AS fotos FROM publicaciones_oferta p JOIN publicaciones_imagenes i USING(id_publicacion) WHERE p.contenido='Álbum de la comunidad' GROUP BY p.id_publicacion")).rows;
    assert.equal(lote.length,1);
    assert.equal(lote[0].fotos,2);
    assert.equal((await db.query("SELECT COUNT(*)::int AS total FROM information_schema.columns WHERE table_schema=$1 AND table_name='actividades_fotos' AND column_name='etapa'", [esquema])).rows[0].total, 0);
  });

  test('revisar cambios publicados conserva la versión vigente y actualiza todas las vistas al aprobar', async () => {
    await enviar(2, 'PUT', '/gestion/actividades/' + trineo, { descripcion: 'Descripción nueva QA' });
    assert.notEqual((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).actividad.descripcion, 'Descripción nueva QA');
    await publicar(2, 'actividades', trineo);
    assert.equal((await enviar(null, 'GET', '/')).actividades.find((item) => item.id_actividad === trineo).descripcion, 'Descripción nueva QA');
    assert.equal((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).actividad.descripcion, 'Descripción nueva QA');
    await enviar(2, 'PUT', '/gestion/ediciones/' + edicionTrineo, { destacada_desde: '2026-11-15' });
    await publicar(2, 'ediciones', edicionTrineo);
    const edicion = (await enviar(null, 'GET', '/')).actividades.find((item) => item.id_actividad === trineo).ediciones[0];
    assert.equal(edicion.destacada, false); assert.equal(edicion.estado_registro, 'abierta');
  });

  test('pausar bloquea escrituras aunque se omita el formulario y reasignar revoca el acceso anterior', async () => {
    await enviar(2, 'PUT', '/gestion/ediciones/' + edicionTrineo + '/inscripciones', { abiertas: false });
    await enviar(11, 'PUT', '/ediciones/' + edicionTrineo + '/registro', inscripcion(), 409);
    await enviar(2, 'PUT', '/gestion/ediciones/' + edicionTrineo + '/inscripciones', { abiertas: true });
    await enviar(7, 'PUT', '/gestion/actividades/' + trineo + '/responsable', { id_responsable: 22 });
    await enviar(2, 'GET', '/gestion/ediciones/' + edicionTrineo, undefined, 403);
    await enviar(7, 'PUT', '/gestion/actividades/' + trineo + '/responsable', { id_responsable: 2 });
  });

  test('transición explícita y atómica conserva historial sin confirmar datos faltantes', async () => {
    await enviar(2,'GET','/gestion/traslados/8/'+edicionTrineo,undefined,403);
    const resumen=await enviar(7,'GET','/gestion/traslados/8/'+edicionTrineo);
    assert.equal(resumen.candidatos,1); assert.equal(resumen.aplicado,false);
    await enviar(7,'POST','/gestion/traslados/8/'+edicionTrineo,{confirmar:false},400);
    const previo = await migrarLegadoActividades(db, { idClub: 8, idEdicion: edicionTrineo });
    assert.equal(previo.aplicado, false);
    assert.equal((await db.query('SELECT id_estatus_club FROM clubes WHERE id_club = 8')).rows[0].id_estatus_club, 1);
    const resultado = await migrarLegadoActividades(db, { idClub: 8, idEdicion: edicionTrineo, aplicar: true });
    assert.equal(resultado.importados, 1);
    const registro = (await enviar(31, 'GET', '/mis-registros'))[0];
    assert.equal(registro.estado, 'pendiente_completar');
    assert.deepEqual(registro.formulario_snapshot, []);
    assert.equal((await enviar(32, 'GET', '/mis-registros')).length, 0);
    assert.equal((await db.query('SELECT id_estatus_club FROM clubes WHERE id_club = 8')).rows[0].id_estatus_club, 3);
    assert.equal((await db.query('SELECT id_estatus_inscripcion FROM inscripciones WHERE id_usuario = 31')).rows[0].id_estatus_inscripcion, 2);
    assert.equal((await migrarLegadoActividades(db, { idClub: 8, idEdicion: edicionTrineo, aplicar: true })).ya_migrado, true);
    const enlace = await enviar(null, 'GET', '/legado/club/8');
    assert.equal(enlace.slug, 'trineo-de-los-suenos');
  });

  test('bitácora compartida: permisos, nombres de recursos y filtros reales', async () => {
    const actividad = await enviar(2, 'POST', '/gestion/actividades', {nombre:'Actividad para bitácora',descripcion:'Registro de acciones QA',categoria:'Servicio'}, 201);
    const edicion = await enviar(2, 'POST', '/gestion/actividades/' + actividad.id_actividad + '/ediciones', datosEdicion('general'), 201);
    const consultar = (usuario, query = '') => fetch(base.replace('/api/actividades','/api/bitacora') + query, {headers: usuario ? {'x-usuario-qa':String(usuario)} : {}});
    for (const usuario of [null,1,2,22]) {
      const respuesta = await consultar(usuario);
      assert.equal(respuesta.status, usuario ? 403 : 401);
      assert.match(respuesta.headers.get('cache-control'), /private, no-store/);
    }
    for (const usuario of [3,4,7]) assert.equal((await consultar(usuario)).status,200);
    const filtro = '?recurso=actividad&club=' + actividad.id_actividad + '&tipo=edicion_creada&actor=Encargado';
    const filtrados = await (await consultar(4,filtro)).json();
    assert.equal(filtrados.total,1);
    assert.equal(filtrados.eventos[0].id_edicion,edicion.id_edicion);
    assert.equal(filtrados.eventos[0].tipo_recurso,'actividad');
    assert.equal(filtrados.eventos[0].nombre_club,'Actividad para bitácora');
    assert.equal(filtrados.eventos[0].edicion_nombre,'Edición QA');
    assert.equal(filtrados.eventos[0].actor_nombre,'Encargado QA');
    assert.match(filtrados.eventos[0].descripcion,/Edición creada/);
    const clubes = await (await consultar(3,'?recurso=club')).json();
    assert.ok(clubes.eventos.length>0 && clubes.eventos.every((evento)=>evento.tipo_recurso==='club'));
    const filtros = await (await consultar(4,'/filtros')).json();
    assert.ok(filtros.clubes.some((recurso)=>recurso.id===actividad.id_actividad && recurso.tipo==='actividad'));
    assert.ok(filtros.tipos.includes('edicion_creada'));
    for (const query of ['?recurso=otro','?club=2x','?desde=2026-02-31','?desde=2026-12-01&hasta=2026-11-01']) assert.equal((await consultar(4,query)).status,400);
    await db.query("INSERT INTO actividad_clubes(tipo_evento,id_club,id_actor,descripcion) SELECT 'paginacion_qa',101,2,'Evento de paginación' FROM generate_series(1,55)");
    const primera = await (await consultar(4,'?tipo=paginacion_qa&page=1')).json();
    const segunda = await (await consultar(4,'?tipo=paginacion_qa&page=2')).json();
    assert.equal(primera.total,55); assert.equal(primera.eventos.length,50);
    assert.equal(segunda.totalPages,2); assert.equal(segunda.eventos.length,5);
    assert.ok(segunda.eventos.every((evento)=>!primera.eventos.some((otro)=>otro.id_evento===evento.id_evento)));
  });

  test('un fallo de bitácora revierte también la operación que debía registrar', async () => {
    await db.query("CREATE FUNCTION fn_fallo_bitacora_qa() RETURNS trigger AS $$ BEGIN IF NEW.tipo_evento='actividad_creada' THEN RAISE EXCEPTION 'Fallo de bitácora simulado'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER trg_fallo_bitacora_qa BEFORE INSERT ON actividad_clubes FOR EACH ROW EXECUTE FUNCTION fn_fallo_bitacora_qa()");
    try {
      await enviar(2,'POST','/gestion/actividades',{nombre:'No debe quedar guardada QA',descripcion:'Operación revertida',categoria:'Servicio'},500);
      assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM clubes WHERE nombre_club='No debe quedar guardada QA'")).rows[0].n,0);
    } finally {
      await db.query('DROP TRIGGER trg_fallo_bitacora_qa ON actividad_clubes; DROP FUNCTION fn_fallo_bitacora_qa()');
    }
  });

  test('archivar oculta la edición y conserva los registros privados', async () => {
    await enviar(2, 'POST', '/gestion/ediciones/' + edicionTrineo + '/archivo', { archivar: true }, 403);
    await enviar(4, 'POST', '/gestion/ediciones/' + edicionTrineo + '/archivo', { archivar: true });
    assert.equal((await enviar(null, 'GET', '/detalle/trineo-de-los-suenos')).ediciones.length, 0);
    assert.equal((await enviar(1, 'GET', '/mis-registros')).length, 2);
    await enviar(11, 'PUT', '/ediciones/' + edicionTrineo + '/reaccion', { reaccion: 'love' }, 404);
  });
});
