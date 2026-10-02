import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('[migrate] schema.sql no encontrado.');
    return;
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[migrate] schema.sql ejecutado correctamente.');
  } catch (err) {
    console.error('[migrate] Error al ejecutar schema.sql:', err.message);
  }
}
