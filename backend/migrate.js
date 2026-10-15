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

  // Migraciones incrementales: backend/migrations/*.sql en orden alfabético.
  // Deben ser idempotentes (IF NOT EXISTS, ON CONFLICT, CREATE OR REPLACE).
  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const archivos = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {
      const ruta = path.join(migrationsDir, archivo);
      try {
        const sqlMigracion = fs.readFileSync(ruta, 'utf8');
        await pool.query(sqlMigracion);
        console.log(`[migrate] ${archivo} ejecutado correctamente.`);
      } catch (err) {
        console.error(`[migrate] Error al ejecutar ${archivo}:`, err.message);
      }
    }
  }
}
