// Regresión sobre el esquema de la Fase 1 OTP: la tabla guarda solo el hash,
// y tanto schema.sql como la migración manual garantizan un único código
// activo por correo. Lectura de archivos locales; sin base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backend = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(backend, 'schema.sql'), 'utf8');
const migracion = fs.readFileSync(
  path.join(backend, 'migrations', 'migrate-otp-codigos.sql'),
  'utf8',
);
const otpStoreFuente = fs.readFileSync(path.join(backend, 'lib', 'otpStore.js'), 'utf8');
const indexFuente = fs.readFileSync(path.join(backend, 'index.js'), 'utf8');
const migrateFuente = fs.readFileSync(path.join(backend, 'migrate.js'), 'utf8');
const envExample = fs
  .readFileSync(path.join(backend, '.env.example'), 'utf8')
  .replace(/\r\n/g, '\n');

function sinComentarios(texto) {
  return texto.replace(/--[^\n]*/g, '');
}

const INDICE_ACTIVO =
  /CREATE UNIQUE INDEX IF NOT EXISTS uq_otp_codigo_activo_por_correo\s+ON otp_codigos\(correo_institucional\)\s+WHERE consumido_en IS NULL;/;

test('schema.sql no crea otp_codigos: la migración es la fuente de verdad', () => {
  const sql = sinComentarios(schema);

  assert.doesNotMatch(sql, /CREATE TABLE IF NOT EXISTS otp_codigos/);
  assert.doesNotMatch(sql, /uq_otp_codigo_activo_por_correo/);
  assert.doesNotMatch(sql, /ALTER TABLE otp_codigos/i);
  assert.match(schema, /migrate-otp-codigos\.sql/, 'schema.sql debe señalar la migración manual');
});

test('la migración OTP declara hash, índice único y RLS', () => {
  const sql = sinComentarios(migracion);
  const bloqueOtp =
    sql.match(/CREATE TABLE IF NOT EXISTS otp_codigos \(([\s\S]*?)\n\);/)?.[1] ?? '';

  assert.match(bloqueOtp, /codigo_hash VARCHAR\(255\) NOT NULL/);
  assert.doesNotMatch(
    bloqueOtp,
    /\bcodigo\s+(VARCHAR|TEXT)/i,
    'no debe existir una columna de código en claro',
  );
  assert.match(sql, INDICE_ACTIVO);
  assert.match(sql, /ALTER TABLE otp_codigos ENABLE ROW LEVEL SECURITY;/);
});

test('index.js no ejecuta schema.sql ni migraciones al arrancar', () => {
  assert.doesNotMatch(indexFuente, /from\s+['"]\.\/migrate\.js['"]/);
  assert.doesNotMatch(indexFuente, /await\s+migrate\(/);
});

test('CORS expone los encabezados de rate limiting al frontend', () => {
  for (const encabezado of ['Retry-After', 'RateLimit', 'RateLimit-Reset', 'X-RateLimit-Reset']) {
    assert.match(indexFuente, new RegExp(`['"]${encabezado}['"]`));
  }
});

test('migrate.js queda como comando manual y termina el pool', () => {
  assert.match(migrateFuente, /pathToFileURL/);
  assert.match(migrateFuente, /pool\.end/);
  assert.match(migrateFuente, /schema\.sql/);
  assert.doesNotMatch(migrateFuente, /migrations/);
});

test('.env.example deja OTP desactivado, sin secretos y con mock por defecto', () => {
  assert.match(envExample, /^AUTH_OTP_ENABLED=false$/m);
  assert.match(envExample, /^OTP_PEPPER=$/m);
  assert.match(envExample, /^OTP_MAIL_PROVIDER=mock$/m);
  assert.match(envExample, /^SMTP_PASSWORD=$/m);
});

test('otpStore crea usuarios OTP solo con id_rol=1 y consume por hash', () => {
  assert.match(otpStoreFuente, /VALUES \(\$1, \$2, 1, CURRENT_TIMESTAMP\)/);
  assert.match(
    otpStoreFuente,
    /ON CONFLICT \(correo_institucional\) WHERE consumido_en IS NULL/,
  );
  assert.match(otpStoreFuente, /AND codigo_hash = \$2/);
  assert.match(otpStoreFuente, /AND expira_en > CURRENT_TIMESTAMP/);
  assert.match(otpStoreFuente, /AND intentos < max_intentos/);
});

test('la migración OTP es aditiva e idempotente', () => {
  const sql = sinComentarios(migracion);

  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS otp_codigos/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_otp_codigos_activos/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_otp_codigos_expira/);
  assert.match(sql, /ALTER TABLE otp_codigos ENABLE ROW LEVEL SECURITY;/);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE)\b/i);
  assert.doesNotMatch(sql, /ALTER TABLE usuarios/i);
});
