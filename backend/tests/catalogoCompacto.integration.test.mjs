import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { registrarActividadCatalogo } from '../lib/actividadCatalogo.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const NUEVAS = ['actividades_ediciones', 'actividades_registros', 'actividades_aportes_catalogo', 'actividades_aportaciones', 'publicaciones_oferta', 'publicaciones_imagenes', 'reacciones_catalogo', 'migraciones_catalogo', 'actividades_asistencia_accesos', 'actividades_asistencias'].sort();
const COMPATIBLES = ['catalogo_equivalencias_actividades', 'actividades_legado_clubes', 'actividades_reacciones', 'clubes_reacciones', 'actividades_historial'].sort();
const leer = (ruta) => readFile(new URL(ruta, import.meta.url), 'utf8');

async function aislado(trabajo) {
  const esquema = 'catalogo_compacto_' + randomBytes(6).toString('hex');
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    await db.query('CREATE SCHEMA ' + esquema);
    await db.query('SET search_path TO ' + esquema);
    await trabajo(db, esquema);
  } finally {
    await db.query('ROLLBACK');
    await db.query('DROP SCHEMA IF EXISTS ' + esquema + ' CASCADE');
    await db.end();
  }
}

async function comprobarModelo(db) {
  const relaciones = (await db.query('SELECT relname,relkind FROM pg_class WHERE relnamespace=current_schema()::regnamespace AND relname=ANY($1::text[]) ORDER BY relname', [[...NUEVAS, ...COMPATIBLES]])).rows;
  assert.deepEqual(relaciones.filter((fila) => fila.relkind === 'r').map((fila) => fila.relname), NUEVAS);
  assert.deepEqual(relaciones.filter((fila) => fila.relkind === 'v').map((fila) => fila.relname), COMPATIBLES);
}

test('catálogo compacto: diez tablas, destinos protegidos y reacciones independientes', { skip: !connectionString }, async () => aislado(async (db) => {
  const sql = await leer('../schema.sql');
  await db.query(sql);
  await comprobarModelo(db);
  await db.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional) VALUES(1,'Alumno ficticio','uno@example.test'),(2,'Actor temporal','dos@example.test')");
  const club = (await db.query("INSERT INTO clubes(nombre_club,cupo_maximo,participacion,id_estatus_club) VALUES('Club QA',20,'mixta',2) RETURNING id_club")).rows[0].id_club;
  const actividad = (await db.query("SELECT id_club FROM clubes WHERE plantilla='trineo'")).rows[0].id_club;
  const otra = (await db.query("SELECT id_club FROM clubes WHERE plantilla='misiones'")).rows[0].id_club;
  const edicion = (await db.query("INSERT INTO actividades_ediciones(id_actividad,nombre) VALUES($1,'Edición QA') RETURNING id_edicion", [actividad])).rows[0].id_edicion;
  await db.query("INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion) VALUES($1,1,'like')", [club]);
  await db.query("INSERT INTO reacciones_catalogo(id_club,id_edicion,id_usuario,reaccion) VALUES($1,$2,1,'love')", [actividad, edicion]);
  await assert.rejects(db.query("INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion) VALUES($1,1,'clap')", [club]), { code: '23505' });
  await assert.rejects(db.query("INSERT INTO reacciones_catalogo(id_club,id_edicion,id_usuario,reaccion) VALUES($1,$2,1,'clap')", [actividad, edicion]), { code: '23505' });
  await assert.rejects(db.query("INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion) VALUES($1,2,'like')", [actividad]), { code: '23514' });
  await assert.rejects(db.query("INSERT INTO reacciones_catalogo(id_club,id_edicion,id_usuario,reaccion) VALUES($1,$2,2,'like')", [otra, edicion]), { code: '23503' });
  await assert.rejects(db.query("INSERT INTO migraciones_catalogo(tipo,id_club_origen,id_club_destino,id_edicion_destino) VALUES('traslado_club',$1,$2,$3)", [club, otra, edicion]), { code: '23503' });
  await registrarActividadCatalogo(db, { idActor: 2, accion: 'edicion_creada', detalle: { id_edicion: edicion } });
  await db.query('DELETE FROM usuarios WHERE id_usuario=2');
  const evento = (await db.query("SELECT * FROM actividad_clubes WHERE origen='catalogo'")).rows[0];
  assert.equal(evento.id_actor, null);
  assert.equal(evento.id_club, actividad);
  assert.equal(evento.id_edicion, edicion);
  assert.match(evento.descripcion, /Edición QA/);
  for (const vista of COMPATIBLES) await assert.rejects(db.query('INSERT INTO ' + vista + ' DEFAULT VALUES'), { code: '55000' });
  await db.query(sql);
  await comprobarModelo(db);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM reacciones_catalogo')).rows[0].n, 2);
  assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM actividad_clubes WHERE origen='catalogo'")).rows[0].n, 1);
}));

for (const origen of ['schema', 'migracion']) test('catálogo compacto desde once tablas mediante ' + origen + ': conserva datos y repite sin duplicar', { skip: !connectionString }, async () => aislado(async (db) => {
  const sql = await leer('../schema.sql');
  const corte = sql.indexOf('-- CATALOGO UNIFICADO:');
  assert.ok(corte > 0);
  await db.query(sql.slice(0, corte) + '\nCOMMIT;');
  await db.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional) VALUES(1,'Actor QA','actor@example.test'); INSERT INTO clubes(id_club,nombre_club,cupo_maximo) VALUES(1,'Club original',20),(8,'Evento anterior',10); SELECT setval(pg_get_serial_sequence('clubes','id_club'),100); INSERT INTO actividad_clubes(id_evento,tipo_evento,id_club,id_actor,descripcion,fecha_creacion) VALUES(50,'anuncio_club',1,1,'Historia original del club','2025-01-01T12:00:00Z'); SELECT setval(pg_get_serial_sequence('actividad_clubes','id_evento'),50);");
  // Representa el esquema previo a la migración 24, que aún almacenaba
  // este indicador directamente en clubes.
  await db.query('ALTER TABLE clubes ADD COLUMN cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN fecha_apertura_programada TIMESTAMPTZ, ADD COLUMN fecha_limite_cierre TIMESTAMPTZ, ADD COLUMN max_postulaciones INTEGER');
  await db.query(await leer('../migrations/migrate-actividades.sql'));
  await db.query("INSERT INTO actividades_ediciones(id_edicion,id_actividad,nombre) VALUES(41,1,'Edición histórica Trineo'),(42,2,'Edición histórica Misiones'); INSERT INTO actividades_registros(id_registro,id_edicion,id_usuario,nombre_completo,matricula,respuestas,formulario_snapshot) VALUES(51,41,1,'Actor QA','00000001','{\"edad\":20,\"talla\":\"M\"}','[{\"clave\":\"talla\"}]'); INSERT INTO actividades_aportes_catalogo(id_opcion,id_edicion,nombre,unidad,cantidad_minima) VALUES(61,41,'Aporte histórico','piezas',2); INSERT INTO actividades_aportaciones(id_aportacion,id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima,estado) VALUES(71,51,61,'Aporte histórico','piezas',2,2,'recibida'); INSERT INTO actividades_reacciones VALUES(41,1,'love'); INSERT INTO actividades_fotos(id_foto,id_edicion,url_imagen,pie,estado,id_autor,creado_en) VALUES(81,41,'https://example.test/foto.jpg','Momento histórico','publicada',1,'2025-01-02T12:00:00Z'); INSERT INTO actividades_historial(id,id_usuario,accion,detalle,creado_en) VALUES(50,1,'actividad_creada','{\"id_actividad\":1}','2025-01-02T12:00:00Z'),(51,1,'edicion_publicada','{\"id_edicion\":41,\"motivo\":\"Aprobada\"}','2025-01-03T12:00:00Z');");
  await db.query(await leer('./fixtures/catalogo-unificado-v1.sql'));
  await db.query("INSERT INTO clubes_reacciones VALUES(1,1,'clap'); INSERT INTO actividades_legado_clubes(id_club,id_edicion,resumen,migrado_en) VALUES(8,41,'{\"club\":{\"id_club\":8},\"importados\":1}','2025-02-01T12:00:00Z')");

  const registros = (await db.query('SELECT * FROM actividades_registros')).rows;
  const aportaciones = (await db.query('SELECT * FROM actividades_aportaciones')).rows;
  const fotos = (await db.query('SELECT * FROM publicaciones_imagenes')).rows;
  const publicaciones = (await db.query('SELECT * FROM publicaciones_oferta')).rows;
  const equivalencias = (await db.query('SELECT * FROM catalogo_equivalencias_actividades ORDER BY id_actividad_anterior')).rows;
  const traslados = (await db.query('SELECT * FROM actividades_legado_clubes')).rows;
  const historial = (await db.query('SELECT * FROM actividades_historial ORDER BY id')).rows;
  const originalClub = (await db.query('SELECT * FROM actividad_clubes WHERE id_evento=50')).rows[0];
  const actualizar = origen === 'schema' ? sql : (await leer('../migrations/migrate-catalogo-unificado.sql')) + '\n' + (await leer('../migrations/migrate-actividades-asistencia.sql'));
  await db.query(actualizar);
  await comprobarModelo(db);
  // Las columnas nuevas tienen valores vacíos; todos los datos históricos se conservan.
  const registrosActualizados = (await db.query('SELECT * FROM actividades_registros')).rows;
  assert.deepEqual(registrosActualizados.map((fila) => Object.fromEntries(Object.keys(registros[0]).map((clave) => [clave, fila[clave]]))), registros);
  if (origen === 'schema') assert.ok(registrosActualizados.every((fila) => fila.tipo_participante === 'unid' && fila.misiones_snapshot === null && fila.pedido === null && fila.codigo_firmado_id === null));
  assert.deepEqual((await db.query('SELECT * FROM actividades_aportaciones')).rows, aportaciones);
  assert.deepEqual((await db.query('SELECT * FROM publicaciones_imagenes')).rows, fotos);
  const publicacionesActualizadas = (await db.query('SELECT * FROM publicaciones_oferta')).rows;
  assert.deepEqual(publicacionesActualizadas.map((fila) => Object.fromEntries(Object.keys(publicaciones[0]).map((clave) => [clave, fila[clave]]))), publicaciones);
  assert.deepEqual((await db.query('SELECT * FROM catalogo_equivalencias_actividades ORDER BY id_actividad_anterior')).rows, equivalencias);
  assert.deepEqual((await db.query('SELECT * FROM actividades_legado_clubes')).rows, traslados);
  const importados = (await db.query("SELECT id_historial_actividad_anterior AS id,id_actor AS id_usuario,tipo_evento AS accion,detalles AS detalle,fecha_creacion AS creado_en,id_club,id_evento FROM actividad_clubes WHERE origen='catalogo' ORDER BY id_historial_actividad_anterior")).rows;
  assert.deepEqual(importados.map(({ id_club: _club, id_evento: _evento, ...fila }) => fila), historial);
  assert.ok(importados.every((fila) => fila.id_club === 101 && fila.id_evento !== fila.id));
  const clubConservado = (await db.query('SELECT * FROM actividad_clubes WHERE id_evento=50')).rows[0];
  for (const [clave, valor] of Object.entries(originalClub)) assert.deepEqual(clubConservado[clave], valor);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM reacciones_catalogo')).rows[0].n, 2);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM migraciones_catalogo')).rows[0].n, 3);
  const control = (await db.query('SELECT * FROM actividad_clubes ORDER BY id_evento')).rows;
  await db.query(actualizar);
  await comprobarModelo(db);
  assert.deepEqual((await db.query('SELECT * FROM actividad_clubes ORDER BY id_evento')).rows, control);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM reacciones_catalogo')).rows[0].n, 2);
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM migraciones_catalogo')).rows[0].n, 3);
}));
