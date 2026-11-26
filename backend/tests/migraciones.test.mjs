import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  aplicarMigraciones,
  mismaRutaReal,
  validarManifestMigraciones,
  validarSqlMigracion,
} from '../lib/migraciones.js';

class PoolSimulado {
  constructor() {
    this.aplicadas = new Map();
    this.sentencias = [];
    this.conexiones = 0;
    this.snapshot = null;
    this.ledgerExiste = false;
    this.tablasAplicacion = [];
  }

  async connect() {
    this.conexiones += 1;
    return {
      query: async (sql, params = []) => {
        const texto = String(sql).trim();
        this.sentencias.push(texto);
        if (/^SHOW standard_conforming_strings$/i.test(texto)) {
          return { rows: [{ standard_conforming_strings: this.standardConformingStrings ?? 'on' }] };
        }
        if (/^SELECT to_regclass\(\$1\) IS NOT NULL AS existe$/i.test(texto)) {
          return { rows: [{ existe: this.ledgerExiste }] };
        }
        if (/^SELECT tablename FROM pg_tables/.test(texto)) {
          const tablename = this.tablasAplicacion[0];
          return { rows: tablename ? [{ tablename }] : [] };
        }
        if (/^CREATE TABLE IF NOT EXISTS public\.schema_migrations/.test(texto)) {
          this.ledgerExiste = true;
          return { rows: [] };
        }
        if (/^SELECT nombre, orden FROM public\.schema_migrations/.test(texto)) {
          return { rows: [...this.aplicadas.entries()]
            .map(([nombre, valor]) => ({ nombre, orden: valor.orden }))
            .sort((a, b) => a.orden - b.orden) };
        }
        if (/^SELECT nombre FROM public\.schema_migrations WHERE checksum/.test(texto)) {
          const fila = [...this.aplicadas.entries()].find(([, valor]) => valor.checksum === params[0]);
          return { rows: fila ? [{ nombre: fila[0] }] : [] };
        }
        if (/^SELECT checksum, orden FROM public\.schema_migrations/.test(texto)) {
          const valor = this.aplicadas.get(params[0]);
          return { rows: valor ? [{ checksum: valor.checksum, orden: valor.orden }] : [] };
        }
        if (/^BEGIN$/i.test(texto)) {
          this.snapshot = new Map(this.aplicadas);
          this.configuracionSnapshot = this.standardConformingStrings ?? 'on';
          return { rows: [] };
        }
        if (/^SELECT set_config\(/i.test(texto)) {
          this.standardConformingStrings = 'off';
          return { rows: [] };
        }
        if (texto === 'SELECT FAIL;') throw new Error('fallo SQL simulado');
        if (/^INSERT INTO public\.schema_migrations/.test(texto)) {
          this.aplicadas.set(params[0], { checksum: params[1], orden: params[2] });
          return { rows: [] };
        }
        if (/^COMMIT$/i.test(texto)) {
          this.snapshot = null;
          this.configuracionSnapshot = null;
          return { rows: [] };
        }
        if (/^ROLLBACK$/i.test(texto)) {
          if (this.snapshot) this.aplicadas = new Map(this.snapshot);
          this.snapshot = null;
          if (this.configuracionSnapshot) this.standardConformingStrings = this.configuracionSnapshot;
          this.configuracionSnapshot = null;
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => { this.sentencias.push('RELEASE'); },
    };
  }
}

async function conDirectorioTemporal(t) {
  const directorio = await mkdtemp(path.join(os.tmpdir(), 'migraciones-clubs-'));
  t.after(() => rm(directorio, { recursive: true, force: true }));
  return directorio;
}

test('el manifiesto solo admite nombres locales .sql y no repite archivos', () => {
  assert.deepEqual(validarManifestMigraciones({ version: 1, migrations: ['migrate-demo.sql'] }), ['migrate-demo.sql']);
  assert.throws(() => validarManifestMigraciones({ version: 1, migrations: ['../secrets.sql'] }), /no permitido/i);
  assert.throws(() => validarManifestMigraciones({ version: 1, migrations: ['cleanup-down.sql'] }), /no permitido/i);
  assert.throws(() => validarManifestMigraciones({ version: 1, migrations: ['CLEANUP-DOWN.SQL'] }), /no permitido/i);
  assert.throws(() => validarManifestMigraciones({ version: 1, migrations: ['Demo.sql'] }), /no permitido/i);
  assert.throws(() => validarManifestMigraciones({ version: 1, migrations: ['same.sql', 'same.sql'] }), /repetida/i);
});

test('cada migración administrada existe y deja la transacción al ejecutor', async () => {
  const manifiesto = JSON.parse(await readFile(new URL('../migrations/managed.json', import.meta.url), 'utf8'));
  const nombres = validarManifestMigraciones(manifiesto);
  for (const nombre of nombres) {
    const sql = await readFile(new URL(`../migrations/${nombre}`, import.meta.url), 'utf8');
    assert.doesNotThrow(() => validarSqlMigracion(sql, nombre), nombre);
  }
});

test('se detiene ante tablas existentes sin ledger, incluso si solo quedan respuestas de encuestas', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261125-demo.sql';
  await writeFile(path.join(directorio, nombre), 'SELECT 1;');
  const pool = new PoolSimulado();
  pool.tablasAplicacion = ['detalle_respuestas'];

  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio),
    /ya contiene tablas en public.*no tiene public\.schema_migrations/i,
  );
  assert.equal(pool.sentencias.some((sql) => sql.startsWith('CREATE TABLE IF NOT EXISTS public.schema_migrations')), false);
  assert.equal(pool.sentencias.includes('SELECT 1;'), false);
});

test('rechaza cualquier control de transacción exterior y permite bloques DO y cadenas', () => {
  for (const sql of [
    'COMMIT WORK;',
    'END;',
    'ROLLBACK TO SAVEPOINT migracion;',
    'ABORT;',
    'START TRANSACTION;',
    'SAVEPOINT punto;',
    'RELEASE SAVEPOINT punto;',
    'PREPARE TRANSACTION \'tx\';',
  ]) {
    assert.throws(() => validarSqlMigracion(sql), /control transaccional/i, sql);
  }
  assert.doesNotThrow(() => validarSqlMigracion("-- COMMIT;\nSELECT 'ROLLBACK;'; DO $$ BEGIN NULL; END $$;"));
  assert.throws(
    () => validarSqlMigracion(String.raw`SELECT 'texto\'; COMMIT; SELECT 'fin';`),
    /barra invertida|control transaccional/i,
    'una barra invertida no debe ocultar el cierre de una cadena SQL ordinaria',
  );
  assert.doesNotThrow(() => validarSqlMigracion(String.raw`SELECT E'texto\'; COMMIT;';`));
  assert.throws(() => validarSqlMigracion("/* ' */ COMMIT; /* ' */"), /control transaccional/i);
  assert.throws(() => validarSqlMigracion("-- '\nCOMMIT;\n-- '"), /control transaccional/i);
  assert.doesNotThrow(() => validarSqlMigracion("SELECT '-- COMMIT', '/* ROLLBACK */', \"COMMIT\";"));
  assert.doesNotThrow(() => validarSqlMigracion('/* comentario /* anidado COMMIT */ sigue */ SELECT 1;'));
  assert.throws(() => validarSqlMigracion('SET standard_conforming_strings = off;'), /no puede cambiar/i);
  assert.doesNotThrow(() => validarSqlMigracion("-- set_config() solo se menciona en este comentario\nSELECT 'set_config(';"));
  assert.doesNotThrow(() => validarSqlMigracion("SELECT set_config('standard_conforming_strings', 'off', true);"));
  assert.doesNotThrow(() => validarSqlMigracion('SELECT $etiqueta$; COMMIT;$etiqueta$;'));
  assert.doesNotThrow(() => validarSqlMigracion('SELECT $etiqueta_ñ$; COMMIT;$etiqueta_ñ$;'));
  assert.doesNotThrow(() => validarSqlMigracion('SELECT $etiqueta_e\u0301$; COMMIT;$etiqueta_e\u0301$;'));
});

test('todas las migraciones administradas cumplen el contrato transaccional del ejecutor', async () => {
  const directorio = new URL('../migrations/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('../migrations/managed.json', import.meta.url), 'utf8'));
  const nombres = validarManifestMigraciones(manifest);
  for (const nombre of nombres) {
    const sql = await readFile(new URL(nombre, directorio), 'utf8');
    assert.doesNotThrow(() => validarSqlMigracion(sql, nombre), nombre);
  }
});

test('la detección de ejecución directa reconoce un enlace simbólico por su ruta real', () => {
  const resolverFalso = (ruta) => (ruta === 'C:/bin/apply-migrations.js' ? 'C:/repo/backend/apply-migrations.js' : ruta);
  assert.equal(mismaRutaReal('C:/bin/apply-migrations.js', 'C:/repo/backend/apply-migrations.js', resolverFalso), true);
  assert.equal(mismaRutaReal('', 'C:/repo/backend/apply-migrations.js', resolverFalso), false);
});

test('el esquema aislado del ledger solo acepta nombres temporales de pruebas', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const pool = new PoolSimulado();
  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [] }, directorio, { esquemaPrueba: 'public; DROP SCHEMA public' }),
    /formato runner_/i,
  );
  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [] }, directorio, { esquemaPrueba: 'public' }),
    /formato runner_/i,
  );
  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [] }, directorio, { esquemaPrueba: `runner_${'z'.repeat(32)}` }),
    /formato runner_/i,
  );
  assert.equal(pool.conexiones, 0);
});

test('registra checksum y no reaplica archivos sin cambios', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261124-demo.sql';
  const manifest = { version: 1, migrations: [nombre] };
  await writeFile(path.join(directorio, nombre), 'SELECT 1;');
  const pool = new PoolSimulado();

  const primera = await aplicarMigraciones(pool, manifest, directorio);
  const cantidadEjecuciones = pool.sentencias.filter((sql) => sql === 'SELECT 1;').length;
  const segunda = await aplicarMigraciones(pool, manifest, directorio);

  assert.equal(primera[0].estado, 'aplicada');
  assert.equal(segunda[0].estado, 'ya_aplicada');
  assert.equal(pool.sentencias.filter((sql) => sql === 'SELECT 1;').length, cantidadEjecuciones);
  await writeFile(path.join(directorio, nombre), 'SELECT 2;');
  await assert.rejects(aplicarMigraciones(pool, manifest, directorio), /otro contenido/i);
});

test('no ejecuta migraciones si PostgreSQL permite escapes ambiguos en cadenas ordinarias', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261124-standard-strings.sql';
  await writeFile(path.join(directorio, nombre), 'SELECT 1;');
  const pool = new PoolSimulado();
  pool.standardConformingStrings = 'off';

  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio),
    /standard_conforming_strings=on/i,
  );
  assert.equal(pool.sentencias.includes('SELECT 1;'), false);
});

test('revierte la migración si cambia standard_conforming_strings dentro de la transacción', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261124-cambia-standard-strings.sql';
  await writeFile(path.join(directorio, nombre), "SELECT set_config('standard_conforming_strings', 'off', true);");
  const pool = new PoolSimulado();

  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio),
    /cambió standard_conforming_strings/i,
  );
  assert.equal(pool.aplicadas.size, 0);
  assert.ok(pool.sentencias.includes('ROLLBACK'));
  assert.equal(pool.standardConformingStrings, 'on');
});

test('rechaza renombrar una migración aplicada con el mismo SQL', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const original = '20261124-original.sql';
  const renombrada = '20261125-renombrada.sql';
  await writeFile(path.join(directorio, original), 'SELECT 1;');
  await writeFile(path.join(directorio, renombrada), 'SELECT 1;');
  const pool = new PoolSimulado();

  await aplicarMigraciones(pool, { version: 1, migrations: [original, renombrada] }, directorio).catch((error) => {
    // La segunda entrada se detecta en la misma ejecución, antes de que pueda duplicar efectos.
    assert.match(error.message, /mismo SQL|mismo contenido/i);
  });
  assert.equal(pool.aplicadas.size, 1);
});

test('la ejecución SQL y su registro quedan dentro de la misma transacción', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261124-transaccional.sql';
  await writeFile(path.join(directorio, nombre), 'SELECT 1;');
  const pool = new PoolSimulado();

  await aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio);

  const inicio = pool.sentencias.indexOf('BEGIN');
  const sql = pool.sentencias.indexOf('SELECT 1;');
  const registro = pool.sentencias.findIndex((texto) => texto.startsWith('INSERT INTO public.schema_migrations'));
  const commit = pool.sentencias.indexOf('COMMIT');
  assert.ok(inicio >= 0 && inicio < sql && sql < registro && registro < commit);
});

test('el ledger de pruebas puede aislarse en un esquema distinto de public', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261125-ledger-aislado.sql';
  await writeFile(path.join(directorio, nombre), 'SELECT 1;');
  const pool = new PoolSimulado();

  await aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio, { esquemaPrueba: `runner_${'a'.repeat(32)}` });

  assert.ok(pool.sentencias.some((sql) => sql.includes(`runner_${'a'.repeat(32)}.schema_migrations`)));
  assert.ok(pool.sentencias.includes(`SET search_path TO runner_${'a'.repeat(32)}`));
  assert.ok(pool.sentencias.every((sql) => !sql.includes('public.schema_migrations')));
});

test('ante un error hace rollback y no marca la migración como aplicada', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const nombre = '20261124-fallida.sql';
  await writeFile(path.join(directorio, nombre), 'SELECT FAIL;');
  const pool = new PoolSimulado();

  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [nombre] }, directorio),
    /fallo SQL simulado/,
  );
  assert.equal(pool.aplicadas.size, 0);
  assert.ok(pool.sentencias.includes('ROLLBACK'));
});

test('no permite mover una migración ya aplicada a otra posición del manifiesto', async (t) => {
  const directorio = await conDirectorioTemporal(t);
  const primero = '20261124-primero.sql';
  const segundo = '20261125-segundo.sql';
  await writeFile(path.join(directorio, primero), 'SELECT 1;');
  await writeFile(path.join(directorio, segundo), 'SELECT 2;');
  const pool = new PoolSimulado();
  await aplicarMigraciones(pool, { version: 1, migrations: [primero, segundo] }, directorio);

  await assert.rejects(
    aplicarMigraciones(pool, { version: 1, migrations: [segundo, primero] }, directorio),
    /orden de managed\.json cambió/i,
  );
});
