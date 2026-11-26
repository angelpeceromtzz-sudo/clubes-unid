import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [schema, migracion, auth, formularios, preflightDevelop] = await Promise.all([
  readFile(new URL('../schema.sql', import.meta.url), 'utf8'),
  readFile(new URL('../migrations/migrate-integridad-correos-postulaciones.sql', import.meta.url), 'utf8'),
  readFile(new URL('../routes/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../routes/formularios.js', import.meta.url), 'utf8'),
  readFile(new URL('../diagnostics/prevalidar-migraciones-develop.sql', import.meta.url), 'utf8'),
]);

test('el preflight detecta perfiles que bloquearían las restricciones sin exponer valores', () => {
  assert.match(preflightDevelop, /perfiles_invalidos_para_restricciones/);
  assert.match(preflightDevelop, /to_jsonb\(u\) AS j FROM usuarios u/);
  for (const columna of ['biografia', 'telefono_celular', 'fecha_nacimiento_publica', 'telefono_publico', 'facebook_url', 'x_url', 'instagram_url', 'sitio_web_url']) {
    assert.ok(preflightDevelop.includes(`'${columna}'`), `debe revisar ${columna}`);
  }
  assert.match(preflightDevelop, /'perfiles_invalidos_para_restricciones',[\s\S]*?query_to_xml\(\$q\$\s*SELECT count\(\*\) AS n/i);
});

test('el preflight de develop detecta conflictos antes de normalizar ciclos', () => {
  for (const indicador of [
    'configuraciones_ciclo_distintas',
    'configuracion_ciclo_parcial',
    'clubes_configurados_sin_ciclo',
    'cierres_manuales_distintos',
    'cierre_manual_sin_ciclo',
    'contador_postulaciones_distinto',
    'formularios_sin_ciclo',
    'solicitudes_convocatoria_pendientes',
    '24_configuracion_ciclo_unica',
    '29_indice_formularios_convocatoria',
    '30_formulario_convocatoria_mismo_club',
    'formularios_bloque_huerfano_o_de_otro_club',
  ]) {
    assert.ok(preflightDevelop.includes(indicador), `debe revisar ${indicador}`);
  }
});

test('el esquema protege la unicidad normalizada de correos y postulaciones por ciclo', () => {
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_normalizado\s+ON usuarios \(lower\(btrim\(correo_institucional\)\)\)/i);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS uq_formulario_alumno_club_ciclo\s+ON formularios \(id_alumno, id_club, id_convocatoria_inscripcion\)\s+WHERE id_convocatoria_inscripcion IS NOT NULL/i);
});

test('el índice de postulaciones sigue el filtro y orden habitual por club', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-indices-formularios-club.sql', import.meta.url), 'utf8');
  for (const sql of [schema, migration]) {
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_formularios_club_fecha\s+ON formularios \(id_club, fecha_envio DESC\)/i);
  }
});

test('el índice parcial cubre búsquedas de postulaciones por convocatoria', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-indice-formularios-convocatoria.sql', import.meta.url), 'utf8');
  const patron = /CREATE INDEX IF NOT EXISTS idx_formularios_convocatoria\s+ON formularios \(id_convocatoria\)\s+WHERE id_convocatoria IS NOT NULL/i;
  assert.match(schema, patron);
  assert.match(migration, patron);
});

test('el esquema y la migración exigen que el bloque de entrevista pertenezca al club de la postulación', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-formulario-convocatoria-mismo-club.sql', import.meta.url), 'utf8');

  for (const sql of [schema, migration]) {
    assert.match(sql, /uq_convocatoria_id_club\s+ON convocatorias \(id_convocatoria, id_club\)/i);
    assert.match(sql, /FOREIGN KEY \(id_convocatoria, id_club\)\s+REFERENCES convocatorias\s*\(id_convocatoria, id_club\)\s+ON DELETE SET NULL \(id_convocatoria\)/i);
    assert.match(sql, /c\.id_club IS DISTINCT FROM f\.id_club/i);
  }
  assert.doesNotMatch(migration, /^\s*(?:UPDATE|DELETE|TRUNCATE)\b/im);
});

test('el esquema cubre búsquedas frecuentes de clubes y notificaciones de chat', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-indices-consultas-frecuentes.sql', import.meta.url), 'utf8');
  for (const sql of [schema, migration]) {
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_clubes_vicepresidente\s+ON clubes \(id_vicepresidente\)\s+WHERE id_vicepresidente IS NOT NULL/i);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_clubes_estatus_publicacion\s+ON clubes \(id_estatus_club, estado_publicacion\)/i);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_chat_notificaciones_mensaje_destinatario\s+ON club_chat_notificaciones \(id_mensaje, id_destinatario\)/i);
  }
});

test('la presencia del chat usa su clave de búsqueda sin mantener un índice por latido', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-retirar-indice-presencia-chat.sql', import.meta.url), 'utf8');
  const chat = await readFile(new URL('../routes/chatClub.js', import.meta.url), 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS club_chat_presencia\s*\([\s\S]*?PRIMARY KEY \(id_club, id_usuario\)/i);
  assert.doesNotMatch(schema, /CREATE INDEX IF NOT EXISTS idx_club_chat_presencia_actividad/i);
  assert.match(migration, /DROP INDEX IF EXISTS idx_club_chat_presencia_actividad/i);
  assert.match(chat, /LEFT JOIN club_chat_presencia p ON p\.id_club=c\.id_club AND p\.id_usuario=u\.id_usuario/i);
});

test('la migración detecta conflictos y no borra ni reescribe datos', () => {
  assert.match(migracion, /GROUP BY lower\(btrim\(correo_institucional\)\)\s+HAVING COUNT\(\*\) > 1/i);
  assert.match(migracion, /GROUP BY id_alumno, id_club, id_convocatoria_inscripcion\s+HAVING COUNT\(\*\) > 1/i);
  assert.doesNotMatch(migracion, /^\s*(?:BEGIN|COMMIT)\s*;/im, 'la transacción la controla el ejecutor de migraciones');
  assert.doesNotMatch(migracion, /\b(?:DELETE|UPDATE|DROP|TRUNCATE)\b/i);
});

test('las consultas de acceso normalizan correos y la API convierte duplicados en conflicto', () => {
  assert.match(auth, /lower\(btrim\(u\.correo_institucional\)\)\s*=\s*\$1/i);
  assert.match(auth, /err\.constraint === 'uq_usuarios_correo_normalizado'/);
  assert.match(formularios, /err\.constraint === 'uq_formulario_alumno_club_ciclo'/);
});

test('el endpoint de encuestas reconoce solo el índice de respuesta duplicada', async () => {
  const encuestas = await readFile(new URL('../routes/encuestas.js', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  assert.match(encuestas, /err\.code === '23505' && err\.constraint === 'uq_respuesta_encuesta_usuario'/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_usuario/);
});

test('formularios usa el catálogo como fuente única de estados', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-estatus-postulacion-catalogo.sql', import.meta.url), 'utf8');
  assert.match(schema, /fk_formulario_estatus FOREIGN KEY \(status\) REFERENCES cat_estatus_postulacion\(nombre\)/i);
  assert.match(schema, /ALTER TABLE formularios DROP CONSTRAINT IF EXISTS chk_status/i);
  assert.match(migration, /WHERE c\.id_estatus IS NULL/i);
  assert.match(migration, /RAISE EXCEPTION 'Migración detenida: hay estados de postulación sin catálogo: %'/i);
  assert.match(migration, /FOREIGN KEY \(status\) REFERENCES cat_estatus_postulacion\(nombre\)/i);
});

test('el esquema ya no borra bitácoras mediante cascadas', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-preservar-bitacora.sql', import.meta.url), 'utf8');
  assert.match(schema, /fk_historial_admin FOREIGN KEY \(id_admin\) REFERENCES usuarios\(id_usuario\) ON DELETE SET NULL/i);
  assert.match(schema, /fk_historial_formulario FOREIGN KEY \(id_formulario\) REFERENCES formularios\(id_formulario\) ON DELETE RESTRICT/i);
  assert.match(migration, /ALTER TABLE historial_admin ALTER COLUMN id_admin DROP NOT NULL/i);
  assert.match(migration, /ON DELETE SET NULL/i);
  assert.match(migration, /ON DELETE RESTRICT/i);
});

test('la configuración de inscripción vive en el ciclo y el contador se deriva de formularios', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-ciclo-inscripcion-configuracion-unica.sql', import.meta.url), 'utf8');
  const formularios = await readFile(new URL('../routes/formularios.js', import.meta.url), 'utf8');
  const convocatorias = await readFile(new URL('../routes/convocatoriasInscripcion.js', import.meta.url), 'utf8');
  const schemaFinal = schema.slice(schema.lastIndexOf('CREATE OR REPLACE VIEW clubes_operativos'));

  assert.match(schema, /CREATE TABLE IF NOT EXISTS convocatorias_inscripcion \([\s\S]*?cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(schemaFinal, /COUNT\(f\.id_formulario\)::int AS postulaciones_actuales/i);
  assert.match(schemaFinal, /ci\.max_postulaciones/);
  for (const columna of ['max_postulaciones', 'postulaciones_actuales', 'cerrada_manualmente', 'fecha_apertura_programada', 'fecha_limite_cierre']) {
    assert.match(migration, new RegExp(`ALTER TABLE clubes DROP COLUMN IF EXISTS ${columna}`, 'i'));
  }
  assert.match(migration, /IS DISTINCT FROM ci\.fecha_apertura_programada/i);
  assert.match(migration, /IS DISTINCT FROM ci\.max_postulaciones/i);
  assert.match(migration, /Migración detenida: configuración duplicada distinta/);
  assert.match(migration, /IS DISTINCT FROM ci\.cerrada_manualmente/i);
  assert.match(migration, /IS DISTINCT FROM COUNT\(f\.id_formulario\)::int/i);
  assert.match(migration, /cerrada_manualmente IS TRUE/i);
  assert.match(migration, /configuración de ciclo parcial/i);
  assert.match(migration, /LOCK TABLE clubes, convocatorias_inscripcion, formularios IN SHARE ROW EXCLUSIVE MODE/i);
  assert.match(migration, /COALESCE\(cl\.cerrada_manualmente, FALSE\)/i);
  assert.match(migration, /Migración detenida: el ciclo actual del club % no existe/i);
  assert.match(formularios, /FROM convocatorias_inscripcion[\s\S]*?FOR UPDATE/);
  assert.doesNotMatch(formularios, /UPDATE clubes_operativos SET postulaciones_actuales/);
  assert.match(convocatorias, /UPDATE convocatorias_inscripcion[\s\S]*?cerrada_manualmente/);
  assert.doesNotMatch(convocatorias, /SET fecha_apertura_programada = \$1, fecha_limite_cierre = \$2, max_postulaciones = \$3,[\s\S]*?UPDATE clubes_operativos/);
});

test('el esquema y la migración prohíben traslapes entre periodos de actividad', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-periodos-sin-traslape.sql', import.meta.url), 'utf8');
  assert.match(schema, /chk_periodos_fechas CHECK \(fecha_fin >= fecha_inicio\)/i);
  assert.match(schema, /ex_periodos_actividad_sin_traslape\s+EXCLUDE USING gist \(daterange\(fecha_inicio, fecha_fin, '\[\]'\) WITH &&\)/i);
  assert.match(migration, /WHERE daterange\(a\.fecha_inicio, a\.fecha_fin, '\[\]'\)\s+&& daterange\(b\.fecha_inicio, b\.fecha_fin, '\[\]'\)/i);
  assert.match(migration, /RAISE EXCEPTION 'Migración detenida: los periodos % y % se traslapan'/i);
});

test('el esquema reserva cupo y participación para clubes y la migración aborta ante filas heredadas ambiguas', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-catalogo-tipo-datos.sql', import.meta.url), 'utf8');
  const migrationDefaults = await readFile(new URL('../migrations/migrate-catalogo-tipo-datos-sin-defaults.sql', import.meta.url), 'utf8');
  assert.match(schema, /tipo = 'actividad' AND id_estatus_club IS NULL AND cupo_maximo IS NULL AND participacion IS NULL/i);
  assert.match(schema, /ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP DEFAULT/i);
  assert.match(schema, /ALTER TABLE clubes ALTER COLUMN participacion DROP DEFAULT/i);
  assert.match(migration, /tipo = 'actividad'\s+AND \(cupo_maximo IS NOT NULL OR participacion IS NOT NULL\)/i);
  assert.match(migration, /RAISE EXCEPTION[\s\S]*revisa la fila sin borrar datos/i);
  assert.doesNotMatch(migration, /\b(?:DELETE|UPDATE|TRUNCATE)\b/i);
  assert.match(migrationDefaults, /ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP DEFAULT/i);
  assert.match(migrationDefaults, /ALTER TABLE clubes ALTER COLUMN participacion DROP DEFAULT/i);
});

test('el estado del catálogo pertenece a clubes y la migración conserva los clubes', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-catalogo-estatus-solo-clubes.sql', import.meta.url), 'utf8');
  assert.match(schema, /ALTER TABLE clubes ALTER COLUMN id_estatus_club DROP NOT NULL/i);
  assert.match(schema, /tipo = 'club' AND id_estatus_club IS NOT NULL/i);
  assert.match(schema, /tipo = 'actividad' AND id_estatus_club IS NULL/i);
  assert.match(migration, /nombre_estatus IS DISTINCT FROM 'proximamente'/i);
  assert.match(migration, /SET id_estatus_club = NULL[\s\S]*?nombre_estatus = 'proximamente'/i);
  assert.doesNotMatch(migration, /\b(?:DELETE|TRUNCATE)\b/i);
});

test('el estado del club no usa un default compartido con actividades', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-estatus-club-sin-default.sql', import.meta.url), 'utf8');
  const dominio = await readFile(new URL('../lib/actividadesDominio.js', import.meta.url), 'utf8');
  assert.match(schema, /ALTER TABLE clubes ALTER COLUMN id_estatus_club DROP DEFAULT/i);
  assert.match(migration, /ALTER TABLE clubes ALTER COLUMN id_estatus_club DROP DEFAULT/i);
  assert.doesNotMatch(migration, /\b(?:DELETE|UPDATE|TRUNCATE)\b/i);
  assert.match(dominio, /tipo, id_estatus_club: 2, cupo_maximo/i);
});

test('las respuestas configurables validan pertenencia con FKs compuestas y no se borran en cascada', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-respuestas-extra-normalizadas.sql', import.meta.url), 'utf8');
  const migrationClub = await readFile(new URL('../migrations/migrate-formularios-club-restrict-delete.sql', import.meta.url), 'utf8');

  for (const sql of [schema, migration]) {
    const tabla = sql.indexOf('CREATE TABLE IF NOT EXISTS formulario_respuestas_extra');
    assert.ok(tabla > 0, 'debe existir la tabla normalizada');
    assert.ok(sql.indexOf('uq_formularios_formulario_club') < tabla, 'la clave única del formulario se crea antes de la FK');
    assert.ok(sql.indexOf('uq_club_preguntas_pregunta_club') < tabla, 'la clave única de pregunta se crea antes de la FK');
    assert.match(sql, /FOREIGN KEY \(id_formulario, id_club\)\s+REFERENCES formularios\(id_formulario, id_club\) ON DELETE RESTRICT/i);
    assert.match(sql, /FOREIGN KEY \(id_pregunta, id_club\)\s+REFERENCES club_formulario_preguntas\(id_pregunta, id_club\) ON DELETE RESTRICT/i);
  }

  assert.match(migration, /INSERT INTO formulario_respuestas_extra[\s\S]*ON CONFLICT \(id_formulario, id_pregunta\) DO NOTHING/i);
  assert.doesNotMatch(migration, /UPDATE\s+formularios\s+SET\s+respuestas_extra/i);
  assert.match(schema, /fk_formulario_club FOREIGN KEY \(id_club\) REFERENCES clubes\(id_club\) ON DELETE RESTRICT/i);
  assert.match(migrationClub, /ON DELETE RESTRICT/i);
  assert.match(migrationClub, /v_total <> 1 OR v_restrictivas <> 1/i);
});

test('el detalle de encuesta exige que respuesta y pregunta pertenezcan a la misma encuesta', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-detalle-respuestas-misma-encuesta.sql', import.meta.url), 'utf8');
  const ruta = await readFile(new URL('../routes/encuestas.js', import.meta.url), 'utf8');

  for (const sql of [schema, migration]) {
    assert.match(sql, /uq_respuestas_id_encuesta\s+ON respuestas_encuesta\(id_respuesta, id_encuesta\)/i);
    assert.match(sql, /uq_preguntas_id_encuesta\s+ON preguntas\(id_pregunta, id_encuesta\)/i);
    assert.match(sql, /FOREIGN KEY \(id_respuesta, id_encuesta\)\s+REFERENCES respuestas_encuesta\(id_respuesta, id_encuesta\)\s+ON DELETE CASCADE/i);
    assert.match(sql, /FOREIGN KEY \(id_pregunta, id_encuesta\)\s+REFERENCES preguntas\(id_pregunta, id_encuesta\)\s+ON DELETE RESTRICT/i);
  }
  assert.match(migration, /r\.id_encuesta <> p\.id_encuesta/i);
  assert.match(migration, /p\.tipo = 'licenciatura'/i);
  assert.match(migration, /SET id_encuesta = r\.id_encuesta/i);
  assert.match(ruta, /texto_otro, id_encuesta\)[\s\S]*VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/i);
});

test('la opción «Otro» conserva respuestas heredadas y limita nuevas respuestas a lo que acepta la API', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migracionAntigua = await readFile(new URL('../migrations/migrate-encuestas-otro.sql', import.meta.url), 'utf8');
  const correccion = await readFile(new URL('../migrations/migrate-encuestas-otro-reglas.sql', import.meta.url), 'utf8');

  assert.match(schema, /chk_detalle_texto_otro CHECK \(texto_otro IS NULL OR char_length\(texto_otro\) <= 70\) NOT VALID/i);
  assert.match(migracionAntigua, /archivo histórico retirado[\s\S]*RAISE EXCEPTION/i);
  assert.doesNotMatch(migracionAntigua, /ALTER\s+TABLE/i);
  assert.match(correccion, /char_length\(texto_otro\) <= 70\) NOT VALID/i);
  assert.match(correccion, /conserva respuestas históricas de más de 70 caracteres/i);
  assert.match(correccion, /uq_opcion_otro[\s\S]*WHERE es_otro/i);
});

test('la migración final valida el límite histórico de «Otro» sin reescribir respuestas', async () => {
  const migration = await readFile(new URL('../migrations/migrate-validar-limite-respuesta-otro.sql', import.meta.url), 'utf8');
  assert.match(migration, /VALIDATE CONSTRAINT chk_detalle_texto_otro/i);
  assert.doesNotMatch(migration, /\b(?:DELETE|UPDATE|TRUNCATE)\b/i);
});

test('los snapshots de formularios conservan el contexto sin impedir corregir la respuesta', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-inmutable-snapshot-respuestas-extra.sql', import.meta.url), 'utf8');

  for (const sql of [schema, migration]) {
    assert.match(sql, /fn_proteger_snapshot_respuesta_extra/i);
    assert.match(sql, /NEW\.etiqueta_snapshot[\s\S]*NEW\.configuracion_snapshot[\s\S]*IS DISTINCT FROM/i);
    assert.match(sql, /BEFORE UPDATE OF[\s\S]*etiqueta_snapshot[\s\S]*configuracion_snapshot/i);
  }
  assert.doesNotMatch(migration, /BEFORE UPDATE OF[\s\S]*respuesta\b/i);
});

test('PostgreSQL limita tipos de preguntas configurables al catálogo que acepta la API', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-tipos-pregunta-formulario-club.sql', import.meta.url), 'utf8');
  const ruta = await readFile(new URL('../routes/clubFormulario.js', import.meta.url), 'utf8');
  const tipos = ['texto', 'textarea', 'numero', 'seleccion', 'fecha'];

  for (const tipo of tipos) {
    assert.match(ruta, new RegExp(`'${tipo}'`));
    assert.ok((schema.match(new RegExp(`'${tipo}'`, 'g')) || []).length >= 2);
    assert.ok((migration.match(new RegExp(`'${tipo}'`, 'g')) || []).length >= 2);
  }
  assert.match(schema, /chk_club_formulario_tipo CHECK \(tipo IN/i);
  assert.match(schema, /chk_formulario_respuesta_tipo_snapshot CHECK \(tipo_snapshot IN/i);
  assert.match(migration, /Migración detenida:[\s\S]*tipo desconocido/i);
  assert.doesNotMatch(migration, /^\s*(?:UPDATE|DELETE|DROP|TRUNCATE)\b/im);
});

test('el esquema y la migración de privacidad no eliminan columnas ni filas de encuestas', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-encuestas-privacidad.sql', import.meta.url), 'utf8');

  assert.doesNotMatch(schema, /ALTER TABLE respuestas_encuesta DROP COLUMN/i);
  assert.doesNotMatch(schema, /ALTER TABLE preguntas DROP COLUMN IF EXISTS es_visible/i);
  assert.doesNotMatch(migration, /^\s*(?:DELETE|UPDATE|DROP|TRUNCATE)\b/im);
});

test('la migración impide borrar respuestas por cascada y conserva el orden final del manifiesto', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../migrations/migrate-encuestas-respuestas-restrict.sql', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../migrations/managed.json', import.meta.url), 'utf8'));
  const route = await readFile(new URL('../routes/encuestas.js', import.meta.url), 'utf8');

  assert.match(schema, /fk_respuesta_encuesta\s+FOREIGN KEY \(id_encuesta\) REFERENCES encuestas\(id_encuesta\) ON DELETE RESTRICT/i);
  assert.match(migration, /ON DELETE RESTRICT/i);
  assert.match(migration, /convalidated/i);
  assert.doesNotMatch(migration, /\b(?:DELETE FROM|UPDATE respuestas_encuesta|TRUNCATE)\b/i);
  assert.equal(manifest.migrations.at(-8), 'migrate-encuestas-respuestas-restrict.sql');
  assert.equal(manifest.migrations.at(-7), 'migrate-ciclo-inscripcion-configuracion-unica.sql');
  assert.equal(manifest.migrations.at(-6), 'migrate-catalogo-tipo-datos-sin-defaults.sql');
  assert.equal(manifest.migrations.at(-5), 'migrate-catalogo-estatus-solo-clubes.sql');
  assert.equal(manifest.migrations.at(-4), 'migrate-estatus-club-sin-default.sql');
  assert.equal(manifest.migrations.at(-3), 'migrate-validar-limite-respuesta-otro.sql');
  assert.equal(manifest.migrations.at(-2), 'migrate-indice-formularios-convocatoria.sql');
  assert.equal(manifest.migrations.at(-1), 'migrate-formulario-convocatoria-mismo-club.sql');
  assert.match(route, /DELETE FROM respuestas_encuesta WHERE id_encuesta = \$1/i);
});
