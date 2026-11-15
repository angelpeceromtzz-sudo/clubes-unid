import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

const connectionString=process.env.ACTIVIDADES_TEST_DATABASE_URL;
test('schema.sql prepara todo el catálogo desde cero y admite el seed local sin duplicar datos',{skip:!connectionString},async()=>{
  const esquema='catalogo_test_'+randomBytes(6).toString('hex');
  const db=new pg.Client({connectionString});
  await db.connect();
  try {
    await db.query('CREATE SCHEMA '+esquema);
    await db.query('SET search_path TO '+esquema);
    const sql=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
    await db.query(sql);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM usuarios')).rows[0].n,0);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_ediciones')).rows[0].n,0);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM catalogo_equivalencias_actividades')).rows[0].n,0);
    assert.equal((await db.query("SELECT to_regclass('actividades_catalogo_anterior') IS NULL AS limpio")).rows[0].limpio,true);
    assert.deepEqual((await db.query("SELECT relname,relkind FROM pg_class WHERE oid IN (to_regclass('actividades'),to_regclass('actividades_fotos')) ORDER BY relname")).rows,[{relname:'actividades',relkind:'v'},{relname:'actividades_fotos',relkind:'v'}]);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM pg_constraint WHERE conrelid=to_regclass('actividades_ediciones') AND confrelid=to_regclass('clubes') AND contype='f'")).rows[0].n,1);
    const institucionales=(await db.query("SELECT id_club,nombre_club,slug,plantilla FROM clubes WHERE tipo='actividad' ORDER BY id_club")).rows;
    assert.deepEqual(institucionales.map((fila)=>fila.plantilla),['trineo','misiones']);
    const seed=await readFile(new URL('../seed.sql',import.meta.url),'utf8');
    await db.query(seed);
    const cantidades=(await db.query("SELECT (SELECT COUNT(*)::int FROM usuarios) AS usuarios,(SELECT COUNT(*)::int FROM clubes WHERE tipo='club') AS clubes,(SELECT COUNT(*)::int FROM inscripciones) AS miembros,(SELECT COUNT(*)::int FROM formularios) AS formularios")).rows[0];
    assert.equal(cantidades.clubes,9);
    assert.ok(cantidades.miembros>0 && cantidades.formularios>0);
    assert.equal((await db.query("SELECT u.id_rol FROM usuarios u JOIN clubes c ON c.id_responsable_club=u.id_usuario WHERE c.nombre_club='Equipo de Basketball'")).rows[0].id_rol,2);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM clubes WHERE tipo='club' AND estado_publicacion='borrador'")).rows[0].n,0);
    await db.query(sql);
    await db.query(seed);
    assert.deepEqual((await db.query("SELECT (SELECT COUNT(*)::int FROM usuarios) AS usuarios,(SELECT COUNT(*)::int FROM clubes WHERE tipo='club') AS clubes,(SELECT COUNT(*)::int FROM inscripciones) AS miembros,(SELECT COUNT(*)::int FROM formularios) AS formularios")).rows[0],cantidades);
    assert.deepEqual((await db.query("SELECT id_club,nombre_club,slug,plantilla FROM clubes WHERE tipo='actividad' ORDER BY id_club")).rows,institucionales);
  } finally {
    await db.query('ROLLBACK');
    await db.query('DROP SCHEMA IF EXISTS '+esquema+' CASCADE');
    await db.end();
  }
});

for(const origen of ['migracion','schema']) test('unificación mediante '+origen+': IDs, historial, fotos, colisiones y segunda aplicación',{skip:!connectionString},async()=>{
  const esquema='catalogo_test_'+randomBytes(6).toString('hex');
  const db=new pg.Client({connectionString});
  await db.connect();
  try {
    await db.query('CREATE SCHEMA '+esquema);
    await db.query('SET search_path TO '+esquema);
    const esquemaCompleto=await readFile(new URL('../schema.sql',import.meta.url),'utf8');
    const corte=esquemaCompleto.indexOf('-- CATALOGO UNIFICADO:');
    assert.ok(corte>0,'El esquema conserva identificada la transición al catálogo unificado');
    await db.query(esquemaCompleto.slice(0,corte)+'\nCOMMIT;');
    await db.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional,institutional_id) VALUES(1,'QA','qa@example.test','00000001'); INSERT INTO clubes(id_club,nombre_club,cupo_maximo,id_responsable_club) VALUES(1,'Club original',20,1),(8,'Club archivado',10,NULL); UPDATE clubes SET id_estatus_club=3 WHERE id_club=8; ALTER TABLE clubes ADD COLUMN slug VARCHAR(100); UPDATE clubes SET slug='trineo-de-los-suenos' WHERE id_club=1; SELECT setval(pg_get_serial_sequence('clubes','id_club'),100);");
    await db.query(await readFile(new URL('../migrations/migrate-actividades.sql',import.meta.url),'utf8'));
    await db.query("UPDATE actividades SET id_responsable=1; INSERT INTO actividades_ediciones(id_edicion,id_actividad,nombre,estado) VALUES(41,1,'Histórica Trineo','publicada'),(42,2,'Histórica Misiones','publicada'); INSERT INTO actividades_registros(id_registro,id_edicion,id_usuario,nombre_completo,matricula,respuestas,formulario_snapshot) VALUES(51,41,1,'QA','00000001','{\"edad\":20,\"talla\":\"M\"}','[{\"clave\":\"talla\"}]'); INSERT INTO actividades_aportes_catalogo(id_opcion,id_edicion,nombre,unidad,cantidad_minima) VALUES(61,41,'Aporte original','piezas',2); INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima,estado) VALUES(51,61,'Aporte original','piezas',2,2,'recibida'); INSERT INTO actividades_reacciones VALUES(41,1,'love'); ALTER TABLE actividades_fotos ADD COLUMN etapa TEXT DEFAULT 'antes'; INSERT INTO actividades_fotos(id_foto,id_edicion,url_imagen,pie,estado,id_autor,creado_en,etapa) VALUES(71,41,'https://example.test/a.jpg','Historia A','publicada',1,'2025-12-01T12:00:00Z','antes'),(72,42,'https://example.test/b.jpg','Historia B','rechazada',1,'2025-12-02T12:00:00Z','despues');");
    const fotos=(await db.query('SELECT id_foto,id_edicion,url_imagen,pie,estado,id_autor,creado_en FROM actividades_fotos ORDER BY id_foto')).rows;
    const registro=(await db.query('SELECT * FROM actividades_registros')).rows;
    const aportes=(await db.query('SELECT * FROM actividades_aportaciones')).rows;
    const migracion=origen==='schema' ? esquemaCompleto : await readFile(new URL('../migrations/migrate-catalogo-unificado.sql',import.meta.url),'utf8');
    await db.query(migracion);
    const equivalencias=(await db.query('SELECT id_actividad_anterior,id_club FROM catalogo_equivalencias_actividades ORDER BY id_actividad_anterior')).rows;
    assert.deepEqual(equivalencias,[{id_actividad_anterior:1,id_club:101},{id_actividad_anterior:2,id_club:102}]);
    assert.deepEqual((await db.query('SELECT id_club,nombre_club,tipo FROM clubes WHERE id_club IN (1,8) ORDER BY id_club')).rows,[{id_club:1,nombre_club:'Club original',tipo:'club'},{id_club:8,nombre_club:'Club archivado',tipo:'club'}]);
    assert.equal((await db.query('SELECT estado_publicacion FROM clubes WHERE id_club=8')).rows[0].estado_publicacion,'archivada');
    assert.equal((await db.query('SELECT slug FROM clubes WHERE id_club=101')).rows[0].slug,'trineo-de-los-suenos-actividad-1');
    assert.deepEqual((await db.query('SELECT id_foto,id_edicion,url_imagen,pie,estado,id_autor,creado_en FROM actividades_fotos ORDER BY id_foto')).rows,fotos);
    assert.deepEqual((await db.query('SELECT * FROM actividades_registros')).rows,registro);
    assert.deepEqual((await db.query('SELECT * FROM actividades_aportaciones')).rows,aportes);
    assert.deepEqual((await db.query('SELECT id_edicion,id_actividad FROM actividades_ediciones ORDER BY id_edicion')).rows,[{id_edicion:41,id_actividad:101},{id_edicion:42,id_actividad:102}]);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_reacciones')).rows[0].n,1);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_schema=$1 AND table_name='publicaciones_imagenes' AND column_name IN ('pie','etapa','id_edicion')",[esquema])).rows[0].n,0);
    await assert.rejects(db.query("UPDATE actividades_catalogo_anterior SET nombre='Cambio' WHERE id_actividad=1"),{code:'55000'});
    await assert.rejects(db.query("UPDATE actividades SET nombre='Cambio' WHERE id_actividad=101"),{code:'55000'});
    await assert.rejects(db.query("INSERT INTO publicaciones_oferta(id_club,id_edicion) VALUES(102,41)"),{code:'23503'});
    await assert.rejects(db.query('INSERT INTO publicaciones_oferta(id_club) VALUES(101)'),{code:'23514'});
    await db.query("UPDATE catalogo_recursos SET descripcion='Fuente única' WHERE id_actividad=101");
    assert.equal((await db.query('SELECT descripcion FROM clubes WHERE id_club=101')).rows[0].descripcion,'Fuente única');
    await db.query(migracion);
    assert.deepEqual((await db.query('SELECT id_actividad_anterior,id_club FROM catalogo_equivalencias_actividades ORDER BY id_actividad_anterior')).rows,equivalencias);
    assert.deepEqual((await db.query('SELECT id_foto,id_edicion,url_imagen,pie,estado,id_autor,creado_en FROM actividades_fotos ORDER BY id_foto')).rows,fotos);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM clubes')).rows[0].n,4);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM publicaciones_oferta')).rows[0].n,2);
  } finally {
    await db.query('ROLLBACK');
    await db.query('DROP SCHEMA IF EXISTS '+esquema+' CASCADE');
    await db.end();
  }
});
