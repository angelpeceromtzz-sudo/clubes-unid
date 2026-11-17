// H11: schema.sql ya no contiene operaciones destructivas de horarios_club.
// Pruebas de regresión sobre schema.sql (aplicado solo de forma manual) y sobre
// la migración manual que reemplaza al bloque retirado. Sin base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backend = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(backend, 'schema.sql'), 'utf8');
const migrate = fs.readFileSync(path.join(backend, 'migrate.js'), 'utf8');
const migracionManual = fs.readFileSync(
  path.join(backend, 'migrations', 'migrate-horarios-legado-semanal.sql'),
  'utf8',
);

test('schema.sql no contiene TRUNCATE', () => {
  // Los comentarios pueden mencionar la palabra al documentar el retiro;
  // lo que importa es que ninguna sentencia la ejecute.
  const sinComentarios = schema.replace(/--[^\n]*/g, '');
  assert.ok(!/\bTRUNCATE\b/i.test(sinComentarios), 'schema.sql no debe ejecutar TRUNCATE');
});

test('schema.sql no conserva el bloque legacy de horarios_club (columna fecha)', () => {
  assert.ok(
    !schema.includes("column_name = 'fecha'"),
    'el bloque DO $$ condicionado a la columna legada fue retirado del arranque',
  );
  assert.ok(
    schema.includes('CREATE TABLE IF NOT EXISTS horarios_club'),
    'la definición moderna e idempotente de horarios_club sigue en el arranque',
  );
  assert.ok(schema.includes('dia_semana'), 'el esquema semanal permanece en schema.sql');
});

test('migrate.js solo aplica schema.sql (no ejecuta migrations/)', () => {
  assert.ok(migrate.includes('schema.sql'), 'migrate.js sigue leyendo schema.sql');
  assert.ok(!migrate.includes('migrations'), 'migrate.js no debe invocar migrations/');
  assert.ok(!/TRUNCATE/.test(migrate), 'migrate.js no debe contener TRUNCATE');
});

test('la conversión legacy queda como migración manual con sus advertencias', () => {
  assert.ok(
    /TRUNCATE TABLE horarios_club/.test(migracionManual),
    'el mantenimiento destructivo existe, pero fuera del arranque',
  );
  assert.ok(
    migracionManual.includes('NO se ejecuta automáticamente'),
    'la cabecera advierte que debe ejecutarse a mano',
  );
  assert.ok(
    /psql .*migrate-horarios-legado-semanal\.sql/.test(migracionManual),
    'documenta el comando psql para ejecutarla por separado',
  );
  assert.ok(
    /pg_dump/.test(migracionManual),
    'exige respaldo previo antes de la conversión',
  );
  assert.ok(
    /column_name = 'fecha'/.test(migracionManual),
    'conserva la condición que la hace no-op en bases ya migradas',
  );
});
