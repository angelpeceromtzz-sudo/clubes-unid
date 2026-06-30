import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function reset() {
  const filePath = path.join(__dirname, 'migrate-z7-reset-convocatorias.sql');
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[reset] Convocatorias y datos relacionados eliminados.');
    console.log('[reset] Todos los formularios reiniciados a "En revisión".');
  } catch (err) {
    console.error('[reset] Error:', err.message);
  } finally {
    await pool.end();
  }
}

reset();
