import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.startsWith('migrate-') && f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No se encontraron archivos de migración.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await pool.query(sql);
      console.log(`[migrate] Ejecutada: ${file}`);
    } catch (err) {
      console.error(`[migrate] Error en ${file}:`, err.message);
    }
  }

  console.log('[migrate] Migraciones completadas.');
}
