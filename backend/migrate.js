import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Migración manual. NO se invoca desde index.js: aplicar schema.sql completo
// contra una base compartida requiere revisión y autorización explícitas.
// Para OTP usar la migración manual específica, no este archivo.
export async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.sql no encontrado');
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('[migrate] schema.sql ejecutado correctamente.');
  } catch (err) {
    console.error('[migrate] Error al ejecutar schema.sql:', err.message);
    throw err;
  }
}

function esEjecucionDirecta() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (esEjecucionDirecta()) {
  try {
    await migrate();
  } catch {
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
