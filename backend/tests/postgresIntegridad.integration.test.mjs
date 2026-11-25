import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { aplicarMigraciones } from '../lib/migraciones.js';

const { Client, Pool } = pg;
const connectionString = process.env.INTEGRIDAD_TEST_DATABASE_URL;
const migration = await readFile(
  new URL('../migrations/migrate-integridad-correos-postulaciones.sql', import.meta.url),
  'utf8',
);
const migrationEstatus = await readFile(
  new URL('../migrations/migrate-estatus-postulacion-catalogo.sql', import.meta.url),
  'utf8',
);
const migrationBitacora = await readFile(
  new URL('../migrations/migrate-preservar-bitacora.sql', import.meta.url),
  'utf8',
);
const migrationPeriodos = await readFile(
  new URL('../migrations/migrate-periodos-sin-traslape.sql', import.meta.url),
  'utf8',
);
const migrationCatalogoTipo = await readFile(
  new URL('../migrations/migrate-catalogo-tipo-datos.sql', import.meta.url),
  'utf8',
);
const migrationCatalogoDefaults = await readFile(
  new URL('../migrations/migrate-catalogo-tipo-datos-sin-defaults.sql', import.meta.url),
  'utf8',
);
const migrationCicloMismoClub = await readFile(
  new URL('../migrations/migrate-ciclo-inscripcion-mismo-club.sql', import.meta.url),
  'utf8',
);
const migrationRespuestasExtra = await readFile(
  new URL('../migrations/migrate-respuestas-extra-normalizadas.sql', import.meta.url),
  'utf8',
);
const migrationFormularioClubRestrict = await readFile(
  new URL('../migrations/migrate-formularios-club-restrict-delete.sql', import.meta.url),
  'utf8',
);
const migrationSnapshotRespuestasExtra = await readFile(
  new URL('../migrations/migrate-inmutable-snapshot-respuestas-extra.sql', import.meta.url),
  'utf8',
);
const migrationDetalleEncuesta = await readFile(
  new URL('../migrations/migrate-detalle-respuestas-misma-encuesta.sql', import.meta.url),
  'utf8',
);
const migrationTiposPreguntaFormulario = await readFile(
  new URL('../migrations/migrate-tipos-pregunta-formulario-club.sql', import.meta.url),
  'utf8',
);
const migrationLimiteTextoOtro = await readFile(
  new URL('../migrations/migrate-encuestas-otro-reglas.sql', import.meta.url),
  'utf8',
);
const migrationPerfil = await readFile(
  new URL('../migrations/migrate-perfil-informacion-personal.sql', import.meta.url),
  'utf8',
);
const migrationSesiones = await readFile(
  new URL('../migrations/migrate-sesiones-vigencia-y-conteo.sql', import.meta.url),
  'utf8',
);
const migrationPrivacidadEncuestas = await readFile(
  new URL('../migrations/migrate-encuestas-privacidad-integridad.sql', import.meta.url),
  'utf8',
);
const migrationPrivacidadEncuestasInicial = await readFile(
  new URL('../migrations/migrate-encuestas-privacidad.sql', import.meta.url),
  'utf8',
);
const migrationRespuestasEncuestaRestrict = await readFile(
  new URL('../migrations/migrate-encuestas-respuestas-restrict.sql', import.meta.url),
  'utf8',
);
const migrationCicloConfiguracionUnica = await readFile(
  new URL('../migrations/migrate-ciclo-inscripcion-configuracion-unica.sql', import.meta.url),
  'utf8',
);
const migrationAdoptarLedger = await readFile(
  new URL('../diagnostics/adoptar-migraciones-develop.sql', import.meta.url),
  'utf8',
);
const migrationIndiceFormulariosClub = await readFile(
  new URL('../migrations/migrate-indices-formularios-club.sql', import.meta.url),
  'utf8',
);
const migrationIndicesConsultasFrecuentes = await readFile(
  new URL('../migrations/migrate-indices-consultas-frecuentes.sql', import.meta.url),
  'utf8',
);
const migrationRetirarIndicePresenciaChat = await readFile(
  new URL('../migrations/migrate-retirar-indice-presencia-chat.sql', import.meta.url),
  'utf8',
);
const migrationContenidoNoticia = await readFile(
  new URL('../migrations/migrate-noticias-contenido-jsonb.sql', import.meta.url),
  'utf8',
);
const migrationReconocimientoOcultar = await readFile(
  new URL('../migrations/migrate-reconocimientos-ocultar.sql', import.meta.url),
  'utf8',
);

async function conEsquemaTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `integridad_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE usuarios (
      id_usuario SERIAL PRIMARY KEY,
      correo_institucional TEXT NOT NULL
    );
    CREATE TABLE cat_estatus_postulacion (
      id_estatus SERIAL PRIMARY KEY,
      nombre VARCHAR(20) UNIQUE NOT NULL,
      orden INT NOT NULL DEFAULT 0,
      es_final BOOLEAN NOT NULL DEFAULT FALSE
    );
    INSERT INTO cat_estatus_postulacion(nombre) VALUES
      ('En revisión'), ('Preseleccionado'), ('Convocado'),
      ('Oferta enviada'), ('Miembro oficial'), ('Rechazado');
    CREATE TABLE formularios (
      id_formulario SERIAL PRIMARY KEY,
      id_alumno INT NOT NULL,
      id_club INT NOT NULL,
      id_convocatoria_inscripcion INT,
      fecha_envio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'En revisión',
      CONSTRAINT chk_status CHECK (status IN (
        'En revisión', 'Preseleccionado', 'Convocado',
        'Oferta enviada', 'Miembro oficial', 'Rechazado'
      ))
    );
    CREATE TABLE historial_admin (
      id_historial SERIAL PRIMARY KEY,
      id_admin INT NOT NULL,
      admin_nombre TEXT NOT NULL,
      FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    );
    CREATE TABLE historial_postulacion (
      id_historial SERIAL PRIMARY KEY,
      id_formulario INT NOT NULL,
      FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE CASCADE
    );
    CREATE TABLE periodos_actividad (
      id_periodo SERIAL PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      activo BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_periodos_fechas UNIQUE (fecha_inicio, fecha_fin)
    );
    CREATE TABLE clubes (
      id_club SERIAL PRIMARY KEY,
      tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('club','actividad')),
      cupo_maximo INT,
      participacion VARCHAR(20),
      CONSTRAINT chk_catalogo_datos_club CHECK (
        tipo <> 'club' OR (cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL)
      )
    );
  `);
  t.after(async () => {
    try {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaModeloTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `modelo_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE clubes (
      id_club INT PRIMARY KEY,
      id_convocatoria_inscripcion_actual INT
    );
    CREATE TABLE convocatorias_inscripcion (
      id_convocatoria_inscripcion INT PRIMARY KEY,
      id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE
    );
    CREATE TABLE formularios (
      id_formulario INT PRIMARY KEY,
      id_club INT NOT NULL CONSTRAINT fk_formulario_club REFERENCES clubes(id_club) ON DELETE CASCADE,
      id_convocatoria_inscripcion INT,
      respuestas_extra JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE club_formulario_preguntas (
      id_pregunta INT PRIMARY KEY,
      id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
      etiqueta VARCHAR(200) NOT NULL,
      tipo VARCHAR(30) NOT NULL,
      configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
      obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
      orden INT NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT TRUE
    );
    ALTER TABLE clubes ADD CONSTRAINT fk_club_convocatoria_inscripcion_actual
      FOREIGN KEY (id_convocatoria_inscripcion_actual)
      REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion) ON DELETE SET NULL;
    ALTER TABLE formularios ADD CONSTRAINT fk_formulario_convocatoria_inscripcion
      FOREIGN KEY (id_convocatoria_inscripcion)
      REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion) ON DELETE SET NULL;
    CREATE TABLE encuestas (
      id_encuesta INT PRIMARY KEY,
      titulo TEXT NOT NULL
    );
    CREATE TABLE respuestas_encuesta (
      id_respuesta INT PRIMARY KEY,
      id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta),
      respuesta TEXT NOT NULL
    );
    INSERT INTO clubes(id_club,id_convocatoria_inscripcion_actual) VALUES (1,NULL),(2,NULL),(3,NULL);
    INSERT INTO convocatorias_inscripcion(id_convocatoria_inscripcion,id_club) VALUES (10,1),(11,2),(12,3);
    UPDATE clubes SET id_convocatoria_inscripcion_actual = CASE id_club
      WHEN 1 THEN 10 WHEN 2 THEN 11 WHEN 3 THEN 12 END;
    INSERT INTO formularios(id_formulario,id_club,id_convocatoria_inscripcion,respuestas_extra)
      VALUES (1,1,10,'{"101":"respuesta anterior","999999":"respuesta huérfana"}'),
             (2,2,11,'{}'),
             (3,2,NULL,'{"999999":"respuesta huérfana histórica"}');
    INSERT INTO club_formulario_preguntas(id_pregunta,id_club,etiqueta,tipo,configuracion)
      VALUES (101,1,'¿Hay alguna condición médica que debamos conocer?','textarea','{}'),
             (202,2,'¿Qué talla de camisa usas?','seleccion','{"opciones":["S","M","L"]}');
    INSERT INTO encuestas(id_encuesta,titulo) VALUES (1,'Encuesta con respuesta histórica');
    INSERT INTO respuestas_encuesta(id_respuesta,id_encuesta,respuesta) VALUES (1,1,'conservar');
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaAdopcionTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `runner_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  client.schemaTemporal = schema;
  await client.query(`
    CREATE TABLE usuarios (
      id_usuario INT PRIMARY KEY,
      correo_institucional TEXT NOT NULL
    );
    CREATE TABLE cat_estatus_postulacion (
      id_estatus SERIAL PRIMARY KEY,
      nombre VARCHAR(30) UNIQUE NOT NULL
    );
    INSERT INTO cat_estatus_postulacion(nombre) VALUES
      ('En revisión'), ('Preseleccionado'), ('Convocado'),
      ('Oferta enviada'), ('Miembro oficial'), ('Rechazado');
    CREATE TABLE clubes (
      id_club INT PRIMARY KEY,
      tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('club','actividad')),
      cupo_maximo INT,
      participacion VARCHAR(20),
      id_convocatoria_inscripcion_actual INT,
      CONSTRAINT chk_catalogo_datos_club CHECK (
        tipo <> 'club' OR (cupo_maximo IS NOT NULL
          AND cupo_maximo IN (10,15,20,25,30,40,50)
          AND participacion IS NOT NULL)
      )
    );
    CREATE TABLE convocatorias_inscripcion (
      id_convocatoria_inscripcion INT PRIMARY KEY,
      id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE
    );
    CREATE TABLE formularios (
      id_formulario INT PRIMARY KEY,
      id_alumno INT NOT NULL,
      id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
      id_convocatoria_inscripcion INT,
      status VARCHAR(30) NOT NULL DEFAULT 'En revisión',
      CONSTRAINT chk_status CHECK (status IN (
        'En revisión', 'Preseleccionado', 'Convocado',
        'Oferta enviada', 'Miembro oficial', 'Rechazado'
      ))
    );
    ALTER TABLE clubes ADD CONSTRAINT fk_club_convocatoria_inscripcion_actual
      FOREIGN KEY (id_convocatoria_inscripcion_actual)
      REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion) ON DELETE SET NULL;
    ALTER TABLE formularios ADD CONSTRAINT fk_formulario_convocatoria_inscripcion
      FOREIGN KEY (id_convocatoria_inscripcion)
      REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion) ON DELETE SET NULL;
    INSERT INTO usuarios VALUES (1, 'alumno@ejemplo.edu');
    INSERT INTO clubes VALUES
      (1, 'club', 20, 'mixta', NULL),
      (2, 'actividad', NULL, NULL, NULL);
    INSERT INTO convocatorias_inscripcion VALUES (10,1), (20,2);
    UPDATE clubes SET id_convocatoria_inscripcion_actual = CASE id_club
      WHEN 1 THEN 10 WHEN 2 THEN 20 END;
    INSERT INTO formularios(id_formulario,id_alumno,id_club,id_convocatoria_inscripcion)
      VALUES (100,1,1,10);
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaEncuestasTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `encuesta_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE encuestas(id_encuesta INT PRIMARY KEY);
    CREATE TABLE preguntas(
      id_pregunta INT PRIMARY KEY,
      id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta),
      tipo TEXT NOT NULL,
      UNIQUE(id_pregunta, id_encuesta)
    );
    CREATE TABLE respuestas_encuesta(
      id_respuesta INT PRIMARY KEY,
      id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta)
    );
    CREATE TABLE detalle_respuestas(
      id_detalle INT PRIMARY KEY,
      id_respuesta INT NOT NULL,
      id_pregunta INT NOT NULL,
      id_opcion INT,
      texto TEXT,
      numero INT,
      CONSTRAINT fk_detalle_respuesta FOREIGN KEY(id_respuesta)
        REFERENCES respuestas_encuesta(id_respuesta) ON DELETE CASCADE,
      CONSTRAINT fk_detalle_pregunta FOREIGN KEY(id_pregunta)
        REFERENCES preguntas(id_pregunta) ON DELETE RESTRICT
    );
    INSERT INTO encuestas VALUES (1),(2);
    INSERT INTO preguntas VALUES (11,1,'texto_corto'),(22,2,'texto_corto'),(33,1,'licenciatura');
    INSERT INTO respuestas_encuesta VALUES (101,1),(202,2);
    CREATE INDEX idx_detalle_respuesta ON detalle_respuestas(id_respuesta);
    CREATE INDEX idx_detalle_pregunta ON detalle_respuestas(id_pregunta);
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaPrivacidadEncuestasTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `privacidad_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE usuarios(id_usuario INT PRIMARY KEY, correo_institucional TEXT NOT NULL);
    CREATE TABLE encuestas(
      id_encuesta INT PRIMARY KEY,
      tipo_privacidad VARCHAR(24) NOT NULL DEFAULT 'publico_anonimo'
        CHECK (tipo_privacidad IN ('publico_anonimo','institucional'))
    );
    CREATE TABLE respuestas_encuesta(
      id_respuesta INT PRIMARY KEY,
      id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta),
      id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      respuesta TEXT NOT NULL
    );
    INSERT INTO usuarios VALUES (1,'alumna@unid.mx');
    INSERT INTO encuestas VALUES (1,'publico_anonimo'),(2,'institucional');
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return { client, schema };
}

async function esperarBloqueoDeCliente(clientObservador, pidObservado) {
  for (let intento = 0; intento < 100; intento += 1) {
    const resultado = await clientObservador.query(
      'SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',
      [pidObservado],
    );
    if (resultado.rows[0]?.wait_event_type === 'Lock') return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`La sesión PostgreSQL ${pidObservado} no esperó el bloqueo esperado`);
}

async function conEsquemaEncuestasLegadoTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `encuesta_legada_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE usuarios(id_usuario INT PRIMARY KEY, correo_institucional TEXT NOT NULL);
    CREATE TABLE encuestas(id_encuesta INT PRIMARY KEY, titulo TEXT NOT NULL);
    CREATE TABLE respuestas_encuesta(
      id_respuesta INT PRIMARY KEY,
      id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta),
      respuesta TEXT NOT NULL
    );
    INSERT INTO usuarios VALUES (7,'alumna@unid.mx');
    INSERT INTO encuestas VALUES (3,'Encuesta antigua');
    INSERT INTO respuestas_encuesta VALUES (30,3,'respuesta antigua'),(31,3,'otra respuesta antigua');
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaIndicesConsultasTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `indices_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE clubes(
      id_club INT PRIMARY KEY,
      id_vicepresidente INT,
      id_estatus_club INT NOT NULL,
      estado_publicacion TEXT NOT NULL
    );
    CREATE TABLE club_chat_notificaciones(
      id_notificacion INT PRIMARY KEY,
      id_mensaje BIGINT NOT NULL,
      id_destinatario INT NOT NULL
    );
    CREATE TABLE club_chat_presencia(
      id_club INT NOT NULL,
      id_usuario INT NOT NULL,
      ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id_club,id_usuario)
    );
    CREATE INDEX idx_club_chat_presencia_actividad ON club_chat_presencia(id_club,ultima_actividad DESC);
    INSERT INTO clubes VALUES (1,7,1,'publicada'),(2,NULL,2,'borrador');
    INSERT INTO club_chat_notificaciones VALUES (11,101,7),(12,102,8);
    INSERT INTO club_chat_presencia(id_club,id_usuario) VALUES (1,7),(1,8);
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function conEsquemaSesionesTemporal(t) {
  const client = new Client({ connectionString });
  const schema = `sesiones_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE periodos_actividad (
      id_periodo INT PRIMARY KEY,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL
    );
    CREATE TABLE horarios_club (
      id_horario INT PRIMARY KEY,
      id_club INT NOT NULL,
      dia_semana INT NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      lugar VARCHAR(255) NOT NULL,
      vigencia_inicio DATE,
      vigencia_fin DATE
    );
    CREATE TABLE usuarios (
      id_usuario INT PRIMARY KEY,
      nombre_completo TEXT NOT NULL,
      institutional_id TEXT,
      id_rol INT NOT NULL,
      deleted_at TIMESTAMPTZ
    );
    CREATE TABLE inscripciones (
      id_usuario INT NOT NULL,
      id_club INT NOT NULL,
      id_estatus_inscripcion INT NOT NULL,
      fecha_inscripcion TIMESTAMPTZ NOT NULL,
      fecha_baja TIMESTAMPTZ
    );
    CREATE TABLE formularios (
      id_alumno INT NOT NULL,
      id_club INT NOT NULL,
      status TEXT NOT NULL,
      fecha_envio TIMESTAMPTZ NOT NULL,
      matricula TEXT,
      id_licenciatura INT
    );
    CREATE TABLE cat_licenciaturas (
      id_licenciatura INT PRIMARY KEY,
      nombre TEXT NOT NULL
    );
    CREATE TABLE sesiones (
      id_sesion SERIAL PRIMARY KEY,
      id_club INT NOT NULL,
      id_periodo INT NOT NULL,
      id_horario INT NOT NULL,
      fecha DATE NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      lugar VARCHAR(255) NOT NULL,
      estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
      integrantes_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
      CONSTRAINT uq_sesion_horario_fecha UNIQUE (id_horario, fecha)
    );
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });
  return client;
}

async function ejecutarEnTransaccion(client, sql) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function conEsquemaConfiguracionCiclo(t, { discrepancia = false } = {}) {
  const client = new Client({ connectionString });
  const schema = `ciclo_config_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`
    CREATE TABLE clubes (
      id_club INT PRIMARY KEY, nombre_club TEXT NOT NULL, descripcion TEXT, categoria TEXT,
      participacion TEXT, cupo_maximo INT, lugar_actividades TEXT, id_responsable_club INT,
      id_vicepresidente INT, imagen_portada TEXT, id_estatus_club INT NOT NULL DEFAULT 1,
      fecha_creacion TIMESTAMPTZ DEFAULT NOW(), horario TEXT DEFAULT '',
      max_postulaciones INT, postulaciones_actuales INT DEFAULT 0, cerrada_manualmente BOOLEAN DEFAULT FALSE,
      fecha_apertura_programada TIMESTAMPTZ, fecha_limite_cierre TIMESTAMPTZ,
      version_horario INT DEFAULT 0, id_convocatoria_inscripcion_actual INT,
      tipo TEXT NOT NULL DEFAULT 'club', slug TEXT NOT NULL, plantilla TEXT NOT NULL DEFAULT 'general',
      estado_publicacion TEXT NOT NULL DEFAULT 'publicada', mostrar_en_oferta BOOLEAN DEFAULT TRUE,
      id_autor INT, propuesta JSONB, estado_propuesta TEXT, motivo_rechazo TEXT, actualizado_en TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE convocatorias_inscripcion (
      id_convocatoria_inscripcion INT PRIMARY KEY, id_club INT NOT NULL REFERENCES clubes(id_club),
      fecha_apertura_programada TIMESTAMPTZ, fecha_limite_cierre TIMESTAMPTZ,
      max_postulaciones INT, fecha_publicacion TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE formularios (
      id_formulario INT PRIMARY KEY, id_club INT NOT NULL REFERENCES clubes(id_club),
      id_convocatoria_inscripcion INT, status TEXT
    );
    CREATE TABLE encuestas (id_encuesta INT PRIMARY KEY, titulo TEXT NOT NULL);
    CREATE TABLE respuestas_encuesta (id_respuesta INT PRIMARY KEY, id_encuesta INT NOT NULL REFERENCES encuestas(id_encuesta), respuesta TEXT NOT NULL);
    INSERT INTO clubes(id_club,nombre_club,slug,max_postulaciones,postulaciones_actuales,cerrada_manualmente,
      fecha_apertura_programada,fecha_limite_cierre,id_convocatoria_inscripcion_actual)
      VALUES (1,'Club de prueba','club-prueba',${discrepancia ? 9 : 5},2,TRUE,
        '2026-01-01 10:00:00+00','2027-01-01 10:00:00+00',10);
    INSERT INTO convocatorias_inscripcion(id_convocatoria_inscripcion,id_club,fecha_apertura_programada,fecha_limite_cierre,max_postulaciones)
      VALUES (10,1,'2026-01-01 10:00:00+00','2027-01-01 10:00:00+00',5);
    INSERT INTO formularios VALUES (1,1,10,'En revisión'),(2,1,10,'Rechazado'),(3,1,NULL,'En revisión');
    INSERT INTO encuestas VALUES (1,'Encuesta histórica');
    INSERT INTO respuestas_encuesta VALUES (1,1,'conservar respuesta');
    CREATE VIEW clubes_operativos AS SELECT * FROM clubes WHERE tipo='club';
    CREATE VIEW clubes_con_estado AS SELECT * FROM clubes;
  `);
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally { await client.end(); }
  });
  return client;
}

test('PostgreSQL normaliza configuración y conteo por ciclo sin cambiar formularios ni encuestas', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica);
  await ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica);

  assert.deepEqual(
    (await client.query(`SELECT fecha_apertura_programada,max_postulaciones,cerrada_manualmente,
      postulaciones_actuales,formularios_recibidos,estado_calculado FROM clubes_con_estado WHERE id_club=1`)).rows[0],
    {
      fecha_apertura_programada: new Date('2026-01-01T10:00:00.000Z'),
      max_postulaciones: 5,
      cerrada_manualmente: true,
      postulaciones_actuales: 2,
      formularios_recibidos: 2,
      estado_calculado: 'cerrado',
    },
  );
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formularios')).rows[0].n, 3);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
  assert.equal((await client.query(`SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='clubes'
      AND column_name IN ('max_postulaciones','postulaciones_actuales','cerrada_manualmente',
        'fecha_apertura_programada','fecha_limite_cierre')`)).rows[0].n, 0);
});

test('PostgreSQL detiene la normalización si la configuración duplicada no coincide', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t, { discrepancia: true });
  await assert.rejects(
    ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica),
    /configuración duplicada distinta para club 1/i,
  );
  assert.equal((await client.query('SELECT max_postulaciones FROM clubes WHERE id_club=1')).rows[0].max_postulaciones, 9);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
  assert.notEqual((await client.query("SELECT to_regclass('clubes_operativos') AS vista")).rows[0].vista, null);
});

test('PostgreSQL aborta si el cierre manual del club y del ciclo discrepan', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await client.query(`
    ALTER TABLE convocatorias_inscripcion
      ADD COLUMN cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await assert.rejects(
    ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica),
    /cierre manual del club 1 no coincide con su ciclo actual/i,
  );
  assert.equal((await client.query('SELECT cerrada_manualmente FROM clubes WHERE id_club=1')).rows[0].cerrada_manualmente, true);
  assert.equal((await client.query('SELECT cerrada_manualmente FROM convocatorias_inscripcion WHERE id_convocatoria_inscripcion=10')).rows[0].cerrada_manualmente, false);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
  assert.equal((await client.query(`SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='max_postulaciones'`)).rows[0].n, 1);
});

test('PostgreSQL aborta si el contador almacenado no coincide con los formularios del ciclo', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await client.query('UPDATE clubes SET postulaciones_actuales=9 WHERE id_club=1');

  await assert.rejects(
    ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica),
    /contador del club 1 no coincide con sus formularios del ciclo actual/i,
  );
  assert.equal((await client.query('SELECT postulaciones_actuales FROM clubes WHERE id_club=1')).rows[0].postulaciones_actuales, 9);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formularios')).rows[0].n, 3);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
  assert.notEqual((await client.query("SELECT to_regclass('clubes_con_estado') AS vista")).rows[0].vista, null);
});

test('PostgreSQL aborta si hay un cierre manual sin ciclo actual', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await client.query(`UPDATE clubes SET id_convocatoria_inscripcion_actual=NULL,
    fecha_apertura_programada=NULL,fecha_limite_cierre=NULL,max_postulaciones=NULL,
    postulaciones_actuales=0 WHERE id_club=1`);

  await assert.rejects(
    ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica),
    /club 1 está cerrado manualmente sin un ciclo actual/i,
  );
  assert.equal((await client.query('SELECT cerrada_manualmente FROM clubes WHERE id_club=1')).rows[0].cerrada_manualmente, true);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formularios')).rows[0].n, 3);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
});

test('PostgreSQL interpreta como abierto un cierre manual legado NULL', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await client.query('UPDATE clubes SET cerrada_manualmente=NULL WHERE id_club=1');

  await ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica);

  assert.equal((await client.query('SELECT cerrada_manualmente FROM clubes_con_estado WHERE id_club=1')).rows[0].cerrada_manualmente, false);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formularios')).rows[0].n, 3);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
});

test('PostgreSQL detecta una configuración legada parcial y no sigue migrando', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaConfiguracionCiclo(t);
  await client.query('DROP VIEW clubes_con_estado; DROP VIEW clubes_operativos; ALTER TABLE clubes DROP COLUMN fecha_apertura_programada; CREATE VIEW clubes_operativos AS SELECT * FROM clubes WHERE tipo=\'club\'; CREATE VIEW clubes_con_estado AS SELECT * FROM clubes');

  await assert.rejects(
    ejecutarEnTransaccion(client, migrationCicloConfiguracionUnica),
    /configuración de ciclo parcial/i,
  );
  assert.equal((await client.query(`SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='max_postulaciones'`)).rows[0].n, 1);
  assert.notEqual((await client.query("SELECT to_regclass('clubes_con_estado') AS vista")).rows[0].vista, null);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta')).rows[0].n, 1);
});

test('PostgreSQL convierte el texto de noticias a JSONB sin alterar su contenido', {
  skip: !connectionString,
}, async (t) => {
  const client = new Client({ connectionString });
  const schema = `noticia_json_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query('CREATE TABLE noticias(id SERIAL PRIMARY KEY, contenido TEXT NOT NULL)');
  const textos = ['Aviso con acentos: ñ, información y “comillas”.', 'Primer renglón\nSegundo renglón'];
  for (const texto of textos) await client.query('INSERT INTO noticias(contenido) VALUES ($1)', [texto]);
  t.after(async () => {
    try { await client.query('SET search_path TO public'); await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
    finally { await client.end(); }
  });

  await ejecutarEnTransaccion(client, migrationContenidoNoticia);
  await ejecutarEnTransaccion(client, migrationContenidoNoticia);

  const filas = (await client.query('SELECT contenido FROM noticias ORDER BY id')).rows;
  assert.deepEqual(filas.map(({ contenido }) => contenido), textos.map((text) => ({
    version: 1,
    blocks: [{ type: 'paragraph', text }],
  })));
  await assert.rejects(
    client.query("INSERT INTO noticias(contenido) VALUES ('{\"version\":2,\"blocks\":[]}'::jsonb)"),
    (error) => error.code === '23514' && error.constraint === 'chk_noticia_contenido_documento',
  );
});

test('PostgreSQL agrega visibilidad de insignias sin borrar las existentes', {
  skip: !connectionString,
}, async (t) => {
  const client = new Client({ connectionString });
  const schema = `reconocimiento_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  await client.query(`CREATE TABLE expediente_reconocimientos (
    id_reconocimiento BIGINT PRIMARY KEY,
    nombre_actividad TEXT NOT NULL
  )`);
  await client.query("INSERT INTO expediente_reconocimientos VALUES (1, 'Insignia histórica')");
  t.after(async () => {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await client.end();
    }
  });

  await ejecutarEnTransaccion(client, migrationReconocimientoOcultar);
  await ejecutarEnTransaccion(client, migrationReconocimientoOcultar);
  assert.deepEqual(
    (await client.query('SELECT id_reconocimiento,nombre_actividad,oculta FROM expediente_reconocimientos')).rows,
    [{ id_reconocimiento: '1', nombre_actividad: 'Insignia histórica', oculta: false }],
  );
});

test('la función de sesiones respeta vigencias, acumula inserciones y es repetible', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaSesionesTemporal(t);
  await client.query("INSERT INTO periodos_actividad VALUES (1,'2027-01-01','2027-01-31')");
  await client.query(`
    INSERT INTO horarios_club VALUES
      (1,7,5,'09:00','10:00','Aula A','2027-01-10','2027-01-20'),
      (2,7,1,'11:00','12:00','Aula B','2027-01-12','2027-01-27')
  `);

  await ejecutarEnTransaccion(client, migrationSesiones);
  await ejecutarEnTransaccion(client, migrationSesiones);

  assert.equal((await client.query('SELECT generar_sesiones_periodo_club(1,7) AS total')).rows[0].total, 3);
  assert.deepEqual(
    (await client.query('SELECT id_horario, fecha::text FROM sesiones ORDER BY fecha')).rows,
    [
      { id_horario: 2, fecha: '2027-01-18' },
      { id_horario: 1, fecha: '2027-01-15' },
      { id_horario: 2, fecha: '2027-01-25' },
    ].sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );
  assert.equal((await client.query('SELECT generar_sesiones_periodo_club(1,7) AS total')).rows[0].total, 0);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM sesiones')).rows[0].n, 3);
  await assert.rejects(
    client.query('SELECT generar_sesiones_periodo_club(999,7)'),
    /Periodo no encontrado: 999/,
  );
});

test('PostgreSQL aplica las restricciones de perfil y conserva los datos existentes', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query('ALTER TABLE usuarios ADD COLUMN fecha_nacimiento DATE');
  await client.query("INSERT INTO usuarios(correo_institucional) VALUES ('alumna@unid.mx')");

  await ejecutarEnTransaccion(client, migrationPerfil);

  await assert.rejects(
    client.query('UPDATE usuarios SET telefono_publico=TRUE WHERE id_usuario=1'),
    (error) => error.code === '23514' && error.constraint === 'chk_usuarios_perfil_visible',
  );
  await assert.rejects(
    client.query('UPDATE usuarios SET fecha_nacimiento_publica=TRUE WHERE id_usuario=1'),
    (error) => error.code === '23514' && error.constraint === 'chk_usuarios_perfil_visible',
  );
  await assert.rejects(
    client.query("UPDATE usuarios SET telefono_celular='sin teléfono' WHERE id_usuario=1"),
    (error) => error.code === '23514' && error.constraint === 'chk_usuarios_telefono_perfil',
  );
  await client.query("UPDATE usuarios SET biografia='Perfil conservado', telefono_celular='+52 55 1234 5678', fecha_nacimiento='2000-01-01', telefono_publico=TRUE WHERE id_usuario=1");
  await assert.rejects(
    client.query("UPDATE usuarios SET sitio_web_url='javascript:alert(1)' WHERE id_usuario=1"),
    (error) => error.code === '23514' && error.constraint === 'chk_usuarios_enlaces_perfil',
  );
  assert.deepEqual(
    (await client.query('SELECT correo_institucional, biografia, telefono_publico FROM usuarios WHERE id_usuario=1')).rows[0],
    { correo_institucional: 'alumna@unid.mx', biografia: 'Perfil conservado', telefono_publico: true },
  );
});

test('PostgreSQL aplica índices únicos y conserva el comportamiento histórico de ciclo nulo', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO usuarios(correo_institucional) VALUES ('Alumno@unid.mx')");
  await client.query('INSERT INTO formularios(id_alumno,id_club,id_convocatoria_inscripcion) VALUES (1,7,3),(1,7,NULL),(1,7,NULL)');

  await ejecutarEnTransaccion(client, migration);

  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM usuarios')).rows[0].n, 1);
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM formularios')).rows[0].n, 3);
  await assert.rejects(
    client.query("INSERT INTO usuarios(correo_institucional) VALUES (' alumno@UNID.mx ')") ,
    (err) => err.code === '23505' && err.constraint === 'uq_usuarios_correo_normalizado',
  );
  await assert.rejects(
    client.query('INSERT INTO formularios(id_alumno,id_club,id_convocatoria_inscripcion) VALUES (1,7,3)'),
    (err) => err.code === '23505' && err.constraint === 'uq_formulario_alumno_club_ciclo',
  );
  await client.query('INSERT INTO formularios(id_alumno,id_club,id_convocatoria_inscripcion) VALUES (1,7,4)');
});

test('PostgreSQL revierte toda la migración si encuentra correos heredados duplicados', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO usuarios(correo_institucional) VALUES ('Alumno@unid.mx'),(' alumno@UNID.mx ')");

  await assert.rejects(ejecutarEnTransaccion(client, migration), /correos duplicados/i);

  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM usuarios')).rows[0].n, 2);
  const indice = await client.query("SELECT to_regclass('uq_usuarios_correo_normalizado') AS nombre");
  assert.equal(indice.rows[0].nombre, null);
});

test('PostgreSQL revierte toda la migración si encuentra postulaciones duplicadas', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO usuarios(correo_institucional) VALUES ('alumno@unid.mx')");
  await client.query('INSERT INTO formularios(id_alumno,id_club,id_convocatoria_inscripcion) VALUES (1,7,3),(1,7,3)');

  await assert.rejects(ejecutarEnTransaccion(client, migration), /postulaciones duplicadas/i);

  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM formularios')).rows[0].n, 2);
  const indice = await client.query("SELECT to_regclass('uq_formulario_alumno_club_ciclo') AS nombre");
  assert.equal(indice.rows[0].nombre, null);
});

test('PostgreSQL usa el catálogo como fuente única para estados de postulación', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query('INSERT INTO formularios(id_alumno,id_club,status) VALUES (1,7,$1)', ['En revisión']);

  await ejecutarEnTransaccion(client, migrationEstatus);

  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'formularios'::regclass
  `);
  const nombres = constraints.rows.map((fila) => fila.conname);
  assert.ok(nombres.includes('fk_formulario_estatus'));
  assert.ok(!nombres.includes('chk_status'));
  await assert.rejects(
    client.query("UPDATE formularios SET status = 'Estado inventado' WHERE id_formulario = 1"),
    (err) => err.code === '23503' && err.constraint === 'fk_formulario_estatus',
  );
  assert.equal((await client.query('SELECT status FROM formularios WHERE id_formulario = 1')).rows[0].status, 'En revisión');
});

test('PostgreSQL aborta la migración de estados sin reescribir estados históricos desconocidos', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("DELETE FROM cat_estatus_postulacion WHERE nombre = 'En revisión'");
  await client.query("INSERT INTO formularios(id_alumno,id_club,status) VALUES (1,7,'En revisión')");

  await assert.rejects(ejecutarEnTransaccion(client, migrationEstatus), /estados de postulación sin catálogo/i);

  assert.equal((await client.query('SELECT status FROM formularios')).rows[0].status, 'En revisión');
  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'formularios'::regclass
  `);
  const nombres = constraints.rows.map((fila) => fila.conname);
  assert.ok(nombres.includes('chk_status'));
  assert.ok(!nombres.includes('fk_formulario_estatus'));
});

test('PostgreSQL conserva las bitácoras al eliminar cuentas y bloquea borrar formularios auditados', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO usuarios(id_usuario,correo_institucional) VALUES (1,'admin@unid.mx')");
  await client.query('INSERT INTO formularios(id_formulario,id_alumno,id_club,status) VALUES (1,1,7,$1)', ['En revisión']);
  await client.query("INSERT INTO historial_admin(id_admin,admin_nombre) VALUES (1,'Admin de prueba')");
  await client.query('INSERT INTO historial_postulacion(id_formulario) VALUES (1)');

  await ejecutarEnTransaccion(client, migrationBitacora);
  assert.deepEqual(
    (await client.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE confdeltype='n')::int AS set_null
      FROM pg_constraint
      WHERE conrelid='historial_admin'::regclass AND confrelid='usuarios'::regclass AND contype='f'
    `)).rows[0],
    { total: 1, set_null: 1 },
    'se reemplaza también la FK heredada con nombre automático',
  );
  assert.deepEqual(
    (await client.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE confdeltype='r')::int AS restrict
      FROM pg_constraint
      WHERE conrelid='historial_postulacion'::regclass
        AND confrelid='formularios'::regclass AND contype='f'
    `)).rows[0],
    { total: 1, restrict: 1 },
    'se reemplaza también la FK heredada de formulario',
  );
  await client.query('DELETE FROM usuarios WHERE id_usuario = 1');
  assert.deepEqual(
    (await client.query('SELECT id_admin,admin_nombre FROM historial_admin')).rows[0],
    { id_admin: null, admin_nombre: 'Admin de prueba' },
  );
  await assert.rejects(
    client.query('DELETE FROM formularios WHERE id_formulario = 1'),
    (error) => error.code === '23001' && error.constraint === 'fk_historial_formulario',
  );
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM historial_postulacion')).rows[0].n, 1);
});

test('PostgreSQL impide crear periodos de actividad traslapados', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await ejecutarEnTransaccion(client, migrationPeriodos);
  await client.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('Invierno','2027-01-01','2027-04-30')");
  await client.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('Verano','2027-05-01','2027-08-31')");
  await assert.rejects(
    client.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('Traslapado','2027-04-30','2027-06-30')"),
    (error) => error.code === '23P01' && error.constraint === 'ex_periodos_actividad_sin_traslape',
  );
  await assert.rejects(
    client.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('Fechas inválidas','2027-08-01','2027-07-01')"),
    (error) => error.code === '23514' && error.constraint === 'chk_periodos_fechas',
  );
});

test('PostgreSQL cancela la migración de periodos si encuentra traslapes existentes', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('A','2027-01-01','2027-06-30'),('B','2027-06-01','2027-12-31')");

  await assert.rejects(ejecutarEnTransaccion(client, migrationPeriodos), /periodos .* se traslapan/i);
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM periodos_actividad')).rows[0].n, 2);
  const constraint = await client.query("SELECT to_regclass('periodos_actividad') AS tabla");
  assert.ok(constraint.rows[0].tabla);
});

test('PostgreSQL limita atributos de cupo a clubes y aborta si una actividad heredada los tiene', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO clubes(tipo,cupo_maximo,participacion) VALUES ('club',20,'mixta'),('actividad',NULL,NULL)");
  await ejecutarEnTransaccion(client, migrationCatalogoTipo);
  await assert.rejects(
    client.query("INSERT INTO clubes(tipo,cupo_maximo,participacion) VALUES ('actividad',10,'mixta')"),
    (error) => error.code === '23514' && error.constraint === 'chk_catalogo_datos_club',
  );
  await client.query("INSERT INTO clubes(tipo,cupo_maximo,participacion) VALUES ('actividad',NULL,NULL)");

  const conflicto = await conEsquemaTemporal(t);
  await conflicto.query("INSERT INTO clubes(tipo,cupo_maximo,participacion) VALUES ('actividad',10,'mixta')");
  await assert.rejects(ejecutarEnTransaccion(conflicto, migrationCatalogoTipo), /actividad 1 tiene cupo o participación/i);
  assert.equal((await conflicto.query('SELECT COUNT(*)::int AS n FROM clubes')).rows[0].n, 1);
});

test('PostgreSQL no aplica los valores por defecto de club al crear actividades', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("ALTER TABLE clubes ALTER COLUMN cupo_maximo SET DEFAULT 10; ALTER TABLE clubes ALTER COLUMN participacion SET DEFAULT 'mixta'");
  await client.query("INSERT INTO clubes(tipo,cupo_maximo,participacion) VALUES ('club',20,'mixta')");
  await ejecutarEnTransaccion(client, migrationCatalogoDefaults);

  const actividad = await client.query("INSERT INTO clubes(tipo) VALUES ('actividad') RETURNING cupo_maximo,participacion");
  assert.deepEqual(actividad.rows[0], { cupo_maximo: null, participacion: null });
  await assert.rejects(
    client.query("INSERT INTO clubes(tipo) VALUES ('club')"),
    (error) => error.code === '23514' && error.constraint === 'chk_catalogo_datos_club',
  );
  assert.equal((await client.query("SELECT cupo_maximo,participacion FROM clubes WHERE tipo='club'")).rows[0].participacion, 'mixta');
});

test('PostgreSQL no crea el ledger si existe cualquier tabla pública, incluso solo respuestas', {
  skip: !connectionString,
}, async (t) => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const estado = await client.query(`
      SELECT to_regclass('public.schema_migrations') AS ledger,
             EXISTS (
               SELECT 1 FROM pg_tables
               WHERE schemaname='public'
                 AND tablename <> 'schema_migrations'
             ) AS tiene_tablas_app
    `);
    if (estado.rows[0].ledger) {
      t.skip('el ledger ya existe; no se altera un historial previo para simular el caso');
      return;
    }

    await client.query('BEGIN');
    if (!estado.rows[0].tiene_tablas_app) {
      await client.query('CREATE TABLE public.detalle_respuestas(id INT)');
    }
    const poolMismaConexion = {
      connect: async () => ({
        query: client.query.bind(client),
        release: () => {},
      }),
    };
    await assert.rejects(
      aplicarMigraciones(poolMismaConexion, { version: 1, migrations: [] }, os.tmpdir()),
      /ya contiene tablas en public.*no tiene public\.schema_migrations/i,
    );
    assert.equal(
      (await client.query("SELECT to_regclass('public.schema_migrations') AS ledger")).rows[0].ledger,
      null,
      'el guard debe detenerse antes de crear el ledger',
    );
    await client.query('ROLLBACK');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* conserva el error original */ }
    throw error;
  } finally {
    await client.end();
  }
});

test('PostgreSQL registra migraciones por checksum y revierte archivo y ledger ante error', {
  skip: !connectionString,
}, async (t) => {
  const pool = new Pool({ connectionString });
  const id = randomUUID().replaceAll('-', '');
  const schema = `runner_${id}`;
  const tablaDemo = `demo_${id}`;
  const tablaRevertida = `revertida_${id}`;
  const nombres = [`runner-demo-${id}.sql`, `runner-falla-${id}.sql`];
  const directorio = await mkdtemp(path.join(os.tmpdir(), 'migracion-runner-'));
  t.after(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await rm(directorio, { recursive: true, force: true });
    await pool.end();
  });
  await pool.query(`CREATE SCHEMA ${schema}`);

  await writeFile(
    path.join(directorio, nombres[0]),
    `CREATE TABLE ${tablaDemo} (id INT PRIMARY KEY); INSERT INTO ${tablaDemo} VALUES (1);`,
  );
  const manifestOk = { version: 1, migrations: [nombres[0]] };
  const ejecuciones = await Promise.all([
    aplicarMigraciones(pool, manifestOk, directorio, { esquemaPrueba: schema }),
    aplicarMigraciones(pool, manifestOk, directorio, { esquemaPrueba: schema }),
  ]);
  assert.deepEqual(
    ejecuciones.map((resultado) => resultado[0].estado).sort(),
    ['aplicada', 'ya_aplicada'],
  );
  assert.equal((await pool.query(`SELECT COUNT(*)::int AS n FROM ${schema}.${tablaDemo}`)).rows[0].n, 1);

  await writeFile(
    path.join(directorio, nombres[1]),
    `CREATE TABLE ${tablaRevertida} (id INT); INSERT INTO tabla_inexistente_${id} VALUES (1);`,
  );
  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [nombres[1]] }, directorio, { esquemaPrueba: schema }),
  );
  assert.equal((await pool.query('SELECT to_regclass($1) AS tabla', [`${schema}.${tablaRevertida}`])).rows[0].tabla, null);
  assert.equal((await pool.query('SELECT to_regclass($1) AS tabla', [`public.${tablaRevertida}`])).rows[0].tabla, null);
  assert.equal(
    (await pool.query(`SELECT COUNT(*)::int AS n FROM ${schema}.schema_migrations WHERE nombre = $1`, [nombres[1]])).rows[0].n,
    0,
  );
});

test('PostgreSQL adopta solo migraciones verificadas y el ejecutor continúa desde el siguiente archivo', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaAdopcionTemporal(t);
  const pool = new Pool({ connectionString });
  t.after(() => pool.end());

  await ejecutarEnTransaccion(client, migrationCatalogoTipo);
  await ejecutarEnTransaccion(client, migration);
  await ejecutarEnTransaccion(client, migrationEstatus);
  await ejecutarEnTransaccion(client, migrationCicloMismoClub);
  await client.query(migrationAdoptarLedger);

  const ledger = await client.query(
    'SELECT nombre, orden, origen FROM schema_migrations ORDER BY orden',
  );
  assert.deepEqual(ledger.rows.map(({ nombre, orden, origen }) => ({ nombre, orden, origen })), [
    { nombre: 'migrate-catalogo-tipo-datos.sql', orden: 1, origen: 'adopcion_verificada' },
    { nombre: 'migrate-integridad-correos-postulaciones.sql', orden: 2, origen: 'adopcion_verificada' },
    { nombre: 'migrate-estatus-postulacion-catalogo.sql', orden: 3, origen: 'adopcion_verificada' },
    { nombre: 'migrate-ciclo-inscripcion-mismo-club.sql', orden: 4, origen: 'adopcion_verificada' },
  ]);

  const manifest = JSON.parse(await readFile(new URL('../migrations/managed.json', import.meta.url), 'utf8'));
  const migracionesRegistradas = await aplicarMigraciones(
    pool,
    { version: manifest.version, migrations: manifest.migrations.slice(0, 4) },
    fileURLToPath(new URL('../migrations/', import.meta.url)),
    { esquemaPrueba: client.schemaTemporal },
  );
  assert.deepEqual(migracionesRegistradas.map(({ estado }) => estado), [
    'ya_aplicada', 'ya_aplicada', 'ya_aplicada', 'ya_aplicada',
  ]);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formularios')).rows[0].n, 1);
});

test('PostgreSQL exige que respuestas y ciclos pertenezcan al mismo club y conserva el historial', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaModeloTemporal(t);

  await ejecutarEnTransaccion(client, migrationCicloMismoClub);
  await ejecutarEnTransaccion(client, migrationRespuestasExtra);
  await ejecutarEnTransaccion(client, migrationSnapshotRespuestasExtra);
  await ejecutarEnTransaccion(client, migrationFormularioClubRestrict);
  assert.equal(
    (await client.query(`SELECT relrowsecurity FROM pg_class WHERE oid='formulario_respuestas_extra'::regclass`)).rows[0].relrowsecurity,
    true,
    'las respuestas configurables con datos potencialmente sensibles deben exigir RLS',
  );
  assert.deepEqual(
    (await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE confdeltype='r')::int AS restrictivas
      FROM pg_constraint WHERE conrelid='formularios'::regclass
        AND confrelid='clubes'::regclass AND contype='f'`)).rows[0],
    { total: 1, restrictivas: 1 },
    'debe quedar una sola FK restrictiva, sin cascadas residuales',
  );

  assert.equal(
    (await client.query(`SELECT count(*)::int AS n FROM pg_constraint
      WHERE conname IN ('fk_club_convocatoria_inscripcion_actual','fk_formulario_convocatoria_inscripcion')
        AND conrelid IN ('clubes'::regclass, 'formularios'::regclass)`)).rows[0].n,
    0,
    'las relaciones simples anteriores se sustituyen por FK compuestas',
  );

  const respuesta = await client.query(`
    SELECT r.id_formulario, r.id_pregunta, r.id_club, r.etiqueta_snapshot, r.respuesta
    FROM formulario_respuestas_extra r
  `);
  assert.deepEqual(respuesta.rows, [{
    id_formulario: 1,
    id_pregunta: 101,
    id_club: 1,
    etiqueta_snapshot: '¿Hay alguna condición médica que debamos conocer?',
    respuesta: 'respuesta anterior',
  }]);
  await assert.rejects(
    client.query("UPDATE formulario_respuestas_extra SET etiqueta_snapshot='Etiqueta cambiada' WHERE id_formulario=1 AND id_pregunta=101"),
    /contexto histórico.*no se puede cambiar/i,
  );
  assert.equal(
    (await client.query('SELECT etiqueta_snapshot FROM formulario_respuestas_extra WHERE id_formulario=1 AND id_pregunta=101')).rows[0].etiqueta_snapshot,
    '¿Hay alguna condición médica que debamos conocer?',
  );
  assert.deepEqual(
    (await client.query('SELECT respuestas_extra FROM formularios WHERE id_formulario = 1')).rows[0].respuestas_extra,
    { 101: 'respuesta anterior', 999999: 'respuesta huérfana' },
  );
  await client.query('UPDATE formularios SET id_convocatoria_inscripcion = NULL WHERE id_formulario = 2');
  await client.query('DELETE FROM convocatorias_inscripcion WHERE id_convocatoria_inscripcion = 11');
  await assert.rejects(
    client.query('DELETE FROM clubes WHERE id_club = 2'),
    (error) => error.code === '23001' && error.constraint === 'fk_formulario_club',
  );
  assert.deepEqual(
    (await client.query('SELECT respuestas_extra FROM formularios WHERE id_formulario = 3')).rows[0].respuestas_extra,
    { 999999: 'respuesta huérfana histórica' },
  );
  await client.query('DELETE FROM convocatorias_inscripcion WHERE id_convocatoria_inscripcion = 12');
  assert.equal(
    (await client.query('SELECT id_convocatoria_inscripcion_actual FROM clubes WHERE id_club = 3')).rows[0].id_convocatoria_inscripcion_actual,
    null,
  );
  assert.equal((await client.query('DELETE FROM clubes WHERE id_club=3')).rowCount, 1,
    'un club sin formularios debe poder borrarse');

  await assert.rejects(
    client.query(`INSERT INTO formulario_respuestas_extra
      (id_formulario,id_pregunta,id_club,etiqueta_snapshot,tipo_snapshot,respuesta)
      VALUES (1,202,1,'Pregunta de otro club','seleccion','"M"')`),
    (error) => error.code === '23503' && error.constraint === 'fk_respuesta_extra_pregunta_club',
  );
  await assert.rejects(
    client.query('UPDATE formularios SET id_convocatoria_inscripcion = 11 WHERE id_formulario = 1'),
    (error) => error.code === '23503' && error.constraint === 'fk_formulario_ciclo_mismo_club',
  );
  await assert.rejects(
    client.query('UPDATE clubes SET id_convocatoria_inscripcion_actual = 11 WHERE id_club = 1'),
    (error) => error.code === '23503' && error.constraint === 'fk_club_ciclo_actual_mismo_club',
  );
  await assert.rejects(
    client.query('DELETE FROM convocatorias_inscripcion WHERE id_convocatoria_inscripcion = 10'),
    (error) => error.code === '23001' && error.constraint === 'fk_formulario_ciclo_mismo_club',
  );

  await client.query("UPDATE club_formulario_preguntas SET activo = FALSE WHERE id_pregunta = 101");
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formulario_respuestas_extra')).rows[0].n, 1);
  await assert.rejects(
    client.query('DELETE FROM club_formulario_preguntas WHERE id_pregunta = 101'),
    (error) => error.code === '23001' && error.constraint === 'fk_respuesta_extra_pregunta_club',
  );

  await client.query("UPDATE formularios SET respuestas_extra = '{\"202\":\"M\"}'::jsonb WHERE id_formulario = 2");
  await assert.rejects(
    client.query("UPDATE formularios SET respuestas_extra = '{\"999999\":\"dato ajeno\"}'::jsonb WHERE id_formulario = 2"),
    (error) => error.code === 'P0001',
  );
  assert.deepEqual(
    (await client.query('SELECT respuestas_extra FROM formularios WHERE id_formulario = 2')).rows[0].respuestas_extra,
    { 202: 'M' },
  );
  await assert.rejects(
    client.query('UPDATE club_formulario_preguntas SET id_club = 2 WHERE id_pregunta = 101'),
    (error) => error.code === 'P0001' && /No se puede mover de club una pregunta que ya tiene respuestas/.test(error.message),
  );
  await assert.rejects(
    client.query('UPDATE formularios SET id_club = 2 WHERE id_formulario = 1'),
    (error) => error.code === 'P0001' && /No se puede mover de club un formulario que ya tiene respuestas configurables/.test(error.message),
  );
  await assert.rejects(
    client.query('DELETE FROM clubes WHERE id_club = 1'),
    (error) => error.code === '23001',
  );
  await assert.rejects(
    client.query('DELETE FROM formularios WHERE id_formulario = 1'),
    (error) => error.code === '23001' && error.constraint === 'fk_respuesta_extra_formulario_club',
  );
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formulario_respuestas_extra')).rows[0].n, 1);

  // Repetir las migraciones no duplica respuestas ni altera las encuestas.
  await ejecutarEnTransaccion(client, migrationCicloMismoClub);
  await ejecutarEnTransaccion(client, migrationRespuestasExtra);
  await ejecutarEnTransaccion(client, migrationSnapshotRespuestasExtra);
  await ejecutarEnTransaccion(client, migrationFormularioClubRestrict);
  assert.deepEqual(
    (await client.query(`SELECT id_formulario, id_pregunta, respuesta
      FROM formulario_respuestas_extra ORDER BY id_formulario, id_pregunta`)).rows,
    [
      { id_formulario: 1, id_pregunta: 101, respuesta: 'respuesta anterior' },
      { id_formulario: 2, id_pregunta: 202, respuesta: 'M' },
    ],
    'reaplicar importa la respuesta nueva una sola vez y conserva la histórica',
  );
  assert.deepEqual(
    (await client.query('SELECT respuesta FROM respuestas_encuesta WHERE id_respuesta = 1')).rows[0],
    { respuesta: 'conservar' },
  );
  assert.deepEqual(
    (await client.query('SELECT respuestas_extra FROM formularios WHERE id_formulario = 1')).rows[0].respuestas_extra,
    { 101: 'respuesta anterior', 999999: 'respuesta huérfana' },
  );
});

test('PostgreSQL conserva respuestas largas de «Otro» y limita nuevas respuestas a 70 caracteres', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query(`
    CREATE TABLE opciones_pregunta (
      id_pregunta INT NOT NULL,
      id_opcion INT PRIMARY KEY
    );
    CREATE TABLE detalle_respuestas (
      id_detalle INT PRIMARY KEY,
      id_pregunta INT NOT NULL,
      texto_otro TEXT,
      CONSTRAINT chk_detalle_texto_otro
        CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 200)
    );
    INSERT INTO detalle_respuestas VALUES (1, 7, repeat('x', 71));
    INSERT INTO opciones_pregunta VALUES (7,70),(7,71);
  `);

  await ejecutarEnTransaccion(client, migrationLimiteTextoOtro);
  assert.equal((await client.query('SELECT char_length(texto_otro)::int AS n FROM detalle_respuestas WHERE id_detalle=1')).rows[0].n, 71);
  assert.match(
    (await client.query("SELECT pg_get_constraintdef(oid) AS definicion FROM pg_constraint WHERE conname='chk_detalle_texto_otro' AND conrelid='detalle_respuestas'::regclass")).rows[0].definicion,
    /70/,
    'la regla nueva limita futuras escrituras sin reescribir el dato histórico',
  );

  await ejecutarEnTransaccion(client, migrationLimiteTextoOtro);
  assert.equal(
    (await client.query('SELECT char_length(texto_otro)::int AS n FROM detalle_respuestas WHERE id_detalle=1')).rows[0].n,
    71,
    'reaplicar la migración conserva el valor histórico fuera del límite',
  );

  await assert.rejects(
    client.query("UPDATE detalle_respuestas SET texto_otro=repeat('x',71) WHERE id_detalle=1"),
    (error) => error.code === '23514' && error.constraint === 'chk_detalle_texto_otro',
  );
  await client.query("UPDATE detalle_respuestas SET texto_otro=repeat('x',70) WHERE id_detalle=1");
  await assert.rejects(
    client.query("INSERT INTO detalle_respuestas VALUES (2,7,repeat('x',71))"),
    (error) => error.code === '23514' && error.constraint === 'chk_detalle_texto_otro',
  );
  await client.query("INSERT INTO detalle_respuestas VALUES (3,7,repeat('x',70))");
  await client.query('UPDATE opciones_pregunta SET es_otro=true WHERE id_opcion=70');
  await assert.rejects(
    client.query('UPDATE opciones_pregunta SET es_otro=true WHERE id_opcion=71'),
    (error) => error.code === '23505' && error.constraint === 'uq_opcion_otro',
  );
});

test('PostgreSQL cancela la migración de ciclos si ya existe un vínculo entre clubes', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaModeloTemporal(t);
  await client.query('UPDATE formularios SET id_convocatoria_inscripcion = 11 WHERE id_formulario = 1');

  await assert.rejects(ejecutarEnTransaccion(client, migrationCicloMismoClub), /formulario 1 vincula el club 1 con el ciclo 11/i);

  assert.equal((await client.query('SELECT id_convocatoria_inscripcion FROM formularios WHERE id_formulario = 1')).rows[0].id_convocatoria_inscripcion, 11);
  assert.equal((await client.query("SELECT to_regclass('uq_convocatoria_inscripcion_id_club') AS indice")).rows[0].indice, null);
  assert.equal(
    (await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conname = 'fk_formulario_ciclo_mismo_club' AND conrelid='formularios'::regclass")).rows[0].n,
    0,
  );
});

test('PostgreSQL valida que el detalle y la pregunta sean de la misma encuesta y conserva respuestas', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaEncuestasTemporal(t);
  await client.query("INSERT INTO detalle_respuestas VALUES (1,101,11,NULL,'respuesta histórica',NULL)");

  await ejecutarEnTransaccion(client, migrationDetalleEncuesta);

  assert.deepEqual(
    (await client.query('SELECT id_encuesta,texto FROM detalle_respuestas WHERE id_detalle=1')).rows[0],
    { id_encuesta: 1, texto: 'respuesta histórica' },
  );
  await ejecutarEnTransaccion(client, migrationDetalleEncuesta);
  assert.equal(
    (await client.query('SELECT id_encuesta FROM detalle_respuestas WHERE id_detalle=1')).rows[0].id_encuesta,
    1,
    'repetir la migración no debe alterar el backfill ni fallar',
  );
  await assert.rejects(
    client.query("INSERT INTO detalle_respuestas(id_detalle,id_respuesta,id_pregunta,texto,id_encuesta) VALUES (2,101,22,'cruzada',1)"),
    (error) => error.code === '23503' && error.constraint === 'fk_detalle_pregunta',
  );
  await assert.rejects(
    client.query("INSERT INTO detalle_respuestas(id_detalle,id_respuesta,id_pregunta,texto,id_encuesta) VALUES (3,101,22,'encuesta incorrecta',2)"),
    (error) => error.code === '23503' && error.constraint === 'fk_detalle_respuesta',
  );
  await assert.rejects(
    client.query("INSERT INTO detalle_respuestas(id_detalle,id_respuesta,id_pregunta,texto,id_encuesta) VALUES (4,101,11,'sin encuesta',NULL)"),
    (error) => error.code === '23502',
  );
  await assert.rejects(
    client.query('DELETE FROM preguntas WHERE id_pregunta=11'),
    (error) => error.code === '23001' && error.constraint === 'fk_detalle_pregunta',
  );
  await client.query('DELETE FROM respuestas_encuesta WHERE id_respuesta=101');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM detalle_respuestas')).rows[0].n, 0);
});

test('PostgreSQL aborta la migración ante respuestas cruzadas o preguntas de licenciatura', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaEncuestasTemporal(t);
  await client.query("INSERT INTO detalle_respuestas VALUES (1,101,22,NULL,'cruzada',NULL)");

  await assert.rejects(ejecutarEnTransaccion(client, migrationDetalleEncuesta), /detalle 1 .* cruzadas/i);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM detalle_respuestas')).rows[0].n, 1);
  assert.equal((await client.query("SELECT to_regclass('uq_preguntas_id_encuesta') AS indice")).rows[0].indice, null);
  assert.equal((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='detalle_respuestas' AND column_name='id_encuesta'")).rowCount, 0);

  await client.query('DELETE FROM detalle_respuestas');
  await client.query("INSERT INTO detalle_respuestas VALUES (2,101,33,NULL,'tipo especial',NULL)");
  await assert.rejects(ejecutarEnTransaccion(client, migrationDetalleEncuesta), /licenciatura/i);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM detalle_respuestas')).rows[0].n, 1);

  await client.query('DELETE FROM detalle_respuestas');
  await client.query('ALTER TABLE detalle_respuestas ADD COLUMN id_encuesta INT');
  await client.query("INSERT INTO detalle_respuestas VALUES (3,101,11,NULL,'encuesta previa incompatible',NULL,2)");
  await assert.rejects(ejecutarEnTransaccion(client, migrationDetalleEncuesta), /cruzadas/i);
  assert.equal((await client.query('SELECT id_encuesta FROM detalle_respuestas WHERE id_detalle=3')).rows[0].id_encuesta, 2);
});

test('PostgreSQL aplica privacidad de encuestas y conserva respuestas al eliminar cuentas', {
  skip: !connectionString,
}, async (t) => {
  const { client } = await conEsquemaPrivacidadEncuestasTemporal(t);
  await ejecutarEnTransaccion(client, migrationPrivacidadEncuestas);

  await client.query("INSERT INTO respuestas_encuesta VALUES (10,1,NULL,'anónima conservada')");
  await assert.rejects(
    client.query("INSERT INTO respuestas_encuesta VALUES (11,1,1,'no debe identificar')"),
    (error) => error.code === '23514',
  );
  await assert.rejects(
    client.query("UPDATE encuestas SET tipo_privacidad='institucional' WHERE id_encuesta=1"),
    (error) => error.code === '23514',
  );

  await assert.rejects(
    client.query("INSERT INTO respuestas_encuesta VALUES (20,2,NULL,'falta identidad')"),
    (error) => error.code === '23514',
  );
  await client.query("INSERT INTO respuestas_encuesta VALUES (21,2,1,'institucional conservada')");
  await assert.rejects(
    client.query('UPDATE respuestas_encuesta SET id_usuario=NULL WHERE id_respuesta=21'),
    (error) => error.code === '23514',
  );
  await assert.rejects(
    client.query('UPDATE respuestas_encuesta SET id_encuesta=1 WHERE id_respuesta=21'),
    (error) => error.code === '23514',
  );
  await assert.rejects(
    client.query("UPDATE encuestas SET tipo_privacidad='publico_anonimo' WHERE id_encuesta=2"),
    (error) => error.code === '23514',
  );

  await client.query('DELETE FROM usuarios WHERE id_usuario=1');
  assert.deepEqual(
    (await client.query('SELECT id_respuesta,id_usuario,respuesta FROM respuestas_encuesta ORDER BY id_respuesta')).rows,
    [
      { id_respuesta: 10, id_usuario: null, respuesta: 'anónima conservada' },
      { id_respuesta: 21, id_usuario: null, respuesta: 'institucional conservada' },
    ],
  );
});

test('PostgreSQL bloquea cascadas heredadas y conserva respuestas hasta el borrado autorizado', {
  skip: !connectionString,
}, async (t) => {
  const { client } = await conEsquemaPrivacidadEncuestasTemporal(t);
  await client.query('ALTER TABLE respuestas_encuesta DROP CONSTRAINT respuestas_encuesta_id_encuesta_fkey');
  await client.query(`
    ALTER TABLE respuestas_encuesta
      ADD CONSTRAINT respuestas_encuesta_id_encuesta_fkey
      FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE CASCADE;
    CREATE TABLE detalle_respuestas (
      id_detalle INT PRIMARY KEY,
      id_respuesta INT NOT NULL REFERENCES respuestas_encuesta(id_respuesta) ON DELETE CASCADE,
      contenido TEXT NOT NULL
    );
    INSERT INTO respuestas_encuesta VALUES (90,1,NULL,'respuesta sintética conservada');
    INSERT INTO detalle_respuestas VALUES (91,90,'detalle sintético conservado');
  `);

  await ejecutarEnTransaccion(client, migrationRespuestasEncuestaRestrict);
  await ejecutarEnTransaccion(client, migrationRespuestasEncuestaRestrict);

  await assert.rejects(
    client.query('DELETE FROM encuestas WHERE id_encuesta=1'),
    (error) => error.code === '23001' && error.constraint === 'fk_respuesta_encuesta',
  );
  assert.equal((await client.query('SELECT count(*)::int AS n FROM respuestas_encuesta WHERE id_respuesta=90')).rows[0].n, 1);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM detalle_respuestas WHERE id_detalle=91')).rows[0].n, 1);
  assert.deepEqual(
    (await client.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE confdeltype='r' AND convalidated)::int AS restrictivas_validadas
      FROM pg_constraint
      WHERE conrelid='respuestas_encuesta'::regclass
        AND confrelid='encuestas'::regclass
        AND contype='f'
    `)).rows[0],
    { total: 1, restrictivas_validadas: 1 },
  );

  // Simula el flujo del endpoint tras autenticar la contraseña administrativa.
  await client.query('DELETE FROM respuestas_encuesta WHERE id_encuesta=1');
  await client.query('DELETE FROM encuestas WHERE id_encuesta=1');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM detalle_respuestas WHERE id_detalle=91')).rows[0].n, 0);
});

test('PostgreSQL serializa envíos y cambios de privacidad de encuestas', {
  skip: !connectionString,
}, async (t) => {
  const { client, schema } = await conEsquemaPrivacidadEncuestasTemporal(t);
  await ejecutarEnTransaccion(client, migrationPrivacidadEncuestas);
  const concurrente = new Client({ connectionString });
  await concurrente.connect();
  await concurrente.query(`SET search_path TO ${schema}`);
  t.after(() => concurrente.end());
  const pidPrincipal = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pidConcurrente = (await concurrente.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

  await client.query('BEGIN');
  await client.query("INSERT INTO respuestas_encuesta VALUES (50,1,NULL,'respuesta anónima')");
  const hacerInstitucional = concurrente.query(
    "UPDATE encuestas SET tipo_privacidad='institucional' WHERE id_encuesta=1",
  );
  await esperarBloqueoDeCliente(client, pidConcurrente);
  await client.query('COMMIT');
  await assert.rejects(hacerInstitucional, (error) => error.code === '23514');

  await concurrente.query('BEGIN');
  await concurrente.query("UPDATE encuestas SET tipo_privacidad='publico_anonimo' WHERE id_encuesta=2");
  const responderConIdentidad = client.query(
    "INSERT INTO respuestas_encuesta VALUES (51,2,1,'respuesta institucional')",
  );
  await esperarBloqueoDeCliente(concurrente, pidPrincipal);
  await concurrente.query('COMMIT');
  await assert.rejects(responderConIdentidad, (error) => error.code === '23514');

  assert.deepEqual(
    (await client.query('SELECT id_encuesta,tipo_privacidad FROM encuestas ORDER BY id_encuesta')).rows,
    [
      { id_encuesta: 1, tipo_privacidad: 'publico_anonimo' },
      { id_encuesta: 2, tipo_privacidad: 'publico_anonimo' },
    ],
  );
  assert.deepEqual(
    (await client.query('SELECT id_respuesta,id_usuario,respuesta FROM respuestas_encuesta')).rows,
    [{ id_respuesta: 50, id_usuario: null, respuesta: 'respuesta anónima' }],
  );
});

test('PostgreSQL migra encuestas antiguas sin atribuir ni modificar respuestas', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaEncuestasLegadoTemporal(t);
  await ejecutarEnTransaccion(client, migrationPrivacidadEncuestasInicial);
  await ejecutarEnTransaccion(client, migrationPrivacidadEncuestasInicial);

  assert.deepEqual(
    (await client.query(`
      SELECT e.tipo_privacidad, r.id_respuesta, r.respuesta, r.id_usuario
      FROM encuestas e JOIN respuestas_encuesta r USING (id_encuesta)
      ORDER BY r.id_respuesta
    `)).rows,
    [
      { tipo_privacidad: 'publico_anonimo', id_respuesta: 30, respuesta: 'respuesta antigua', id_usuario: null },
      { tipo_privacidad: 'publico_anonimo', id_respuesta: 31, respuesta: 'otra respuesta antigua', id_usuario: null },
    ],
  );
  assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname=current_schema() AND indexname='uq_respuesta_encuesta_usuario'")).rows[0].n, 1);
});

test('PostgreSQL agrega el índice de postulaciones por club sin alterar filas', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaTemporal(t);
  await client.query("INSERT INTO formularios(id_formulario,id_alumno,id_club,status) VALUES (1,7,3,'En revisión'),(2,8,3,'Rechazado')");
  await ejecutarEnTransaccion(client, migrationIndiceFormulariosClub);

  assert.match(
    (await client.query("SELECT pg_get_indexdef('idx_formularios_club_fecha'::regclass) AS definicion")).rows[0].definicion,
    /^CREATE INDEX idx_formularios_club_fecha ON .* USING btree \(id_club, fecha_envio DESC\)$/,
  );
  assert.equal((await client.query('SELECT count(*)::int AS total FROM formularios')).rows[0].total, 2);
});

test('PostgreSQL añade índices de rutas frecuentes sin modificar clubes ni notificaciones', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaIndicesConsultasTemporal(t);
  await ejecutarEnTransaccion(client, migrationIndicesConsultasFrecuentes);
  await ejecutarEnTransaccion(client, migrationIndicesConsultasFrecuentes);
  await ejecutarEnTransaccion(client, migrationRetirarIndicePresenciaChat);
  await ejecutarEnTransaccion(client, migrationRetirarIndicePresenciaChat);

  const definiciones = (await client.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname=current_schema()
      AND indexname IN (
        'idx_clubes_vicepresidente',
        'idx_clubes_estatus_publicacion',
        'idx_chat_notificaciones_mensaje_destinatario'
      )
    ORDER BY indexname
  `)).rows;
  assert.equal(definiciones.length, 3);
  assert.match(definiciones.find((x) => x.indexname === 'idx_clubes_vicepresidente').indexdef, /\(id_vicepresidente\).*WHERE \(id_vicepresidente IS NOT NULL\)/);
  assert.match(definiciones.find((x) => x.indexname === 'idx_clubes_estatus_publicacion').indexdef, /\(id_estatus_club, estado_publicacion\)/);
  assert.match(definiciones.find((x) => x.indexname === 'idx_chat_notificaciones_mensaje_destinatario').indexdef, /\(id_mensaje, id_destinatario\)/);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM clubes')).rows[0].n, 2);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM club_chat_notificaciones')).rows[0].n, 2);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM club_chat_presencia')).rows[0].n, 2);
  assert.equal((await client.query("SELECT to_regclass('idx_club_chat_presencia_actividad') AS indice")).rows[0].indice, null);
});

test('la migración de privacidad aborta sin tocar una respuesta anónima identificada', {
  skip: !connectionString,
}, async (t) => {
  const { client } = await conEsquemaPrivacidadEncuestasTemporal(t);
  await client.query("INSERT INTO respuestas_encuesta VALUES (30,1,1,'histórica identificada')");

  await assert.rejects(
    ejecutarEnTransaccion(client, migrationPrivacidadEncuestas),
    /respuesta 30 de la encuesta anónima 1 conserva identidad/i,
  );
  assert.deepEqual(
    (await client.query('SELECT id_respuesta,id_usuario,respuesta FROM respuestas_encuesta')).rows[0],
    { id_respuesta: 30, id_usuario: 1, respuesta: 'histórica identificada' },
  );
  assert.equal(
    (await client.query("SELECT to_regprocedure('fn_validar_privacidad_respuesta_encuesta()') AS funcion")).rows[0].funcion,
    null,
  );
});

test('PostgreSQL limita los tipos de preguntas configurables y protege los snapshots', {
  skip: !connectionString,
}, async (t) => {
  const client = await conEsquemaModeloTemporal(t);
  await ejecutarEnTransaccion(client, migrationRespuestasExtra);
  await ejecutarEnTransaccion(client, migrationTiposPreguntaFormulario);

  await assert.rejects(
    client.query("INSERT INTO club_formulario_preguntas(id_pregunta,id_club,etiqueta,tipo) VALUES (303,1,'Tipo incorrecto','html')"),
    (error) => error.code === '23514' && error.constraint === 'chk_club_formulario_tipo',
  );
  await assert.rejects(
    client.query("UPDATE formulario_respuestas_extra SET tipo_snapshot='html' WHERE id_formulario=1 AND id_pregunta=101"),
    (error) => error.code === '23514' && error.constraint === 'chk_formulario_respuesta_tipo_snapshot',
  );
  assert.equal((await client.query('SELECT count(*)::int AS n FROM formulario_respuestas_extra')).rows[0].n, 1);
});

test('PostgreSQL detiene el catálogo de tipos si hay definiciones o snapshots heredados desconocidos', {
  skip: !connectionString,
}, async (t) => {
  const preguntaInvalida = await conEsquemaModeloTemporal(t);
  await ejecutarEnTransaccion(preguntaInvalida, migrationRespuestasExtra);
  await preguntaInvalida.query("INSERT INTO club_formulario_preguntas(id_pregunta,id_club,etiqueta,tipo) VALUES (303,1,'Tipo heredado','html')");
  await assert.rejects(ejecutarEnTransaccion(preguntaInvalida, migrationTiposPreguntaFormulario), /pregunta configurable 303 .* tipo desconocido/i);
  assert.equal((await preguntaInvalida.query("SELECT tipo FROM club_formulario_preguntas WHERE id_pregunta=303")).rows[0].tipo, 'html');
  assert.equal((await preguntaInvalida.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conname='chk_club_formulario_tipo' AND conrelid='club_formulario_preguntas'::regclass")).rows[0].n, 0);

  const snapshotInvalido = await conEsquemaModeloTemporal(t);
  await ejecutarEnTransaccion(snapshotInvalido, migrationRespuestasExtra);
  await snapshotInvalido.query("INSERT INTO club_formulario_preguntas(id_pregunta,id_club,etiqueta,tipo) VALUES (303,1,'Tipo válido','texto')");
  await snapshotInvalido.query(`INSERT INTO formulario_respuestas_extra
    (id_formulario,id_pregunta,id_club,etiqueta_snapshot,tipo_snapshot,respuesta)
    VALUES (1,303,1,'Snapshot legado','html','"dato"')`);
  await assert.rejects(ejecutarEnTransaccion(snapshotInvalido, migrationTiposPreguntaFormulario), /respuesta configurable del formulario 1 conserva el tipo desconocido/i);
  assert.equal((await snapshotInvalido.query('SELECT tipo_snapshot FROM formulario_respuestas_extra WHERE id_formulario=1 AND id_pregunta=303')).rows[0].tipo_snapshot, 'html');
  assert.equal((await snapshotInvalido.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conname='chk_formulario_respuesta_tipo_snapshot' AND conrelid='formulario_respuestas_extra'::regclass")).rows[0].n, 0);
});
