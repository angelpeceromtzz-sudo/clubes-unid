import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './db.js';
import { aplicarMigraciones, mismaRutaReal } from './lib/migraciones.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ejecutarMigracionesAdministradas() {
  const manifiesto = JSON.parse(await fs.readFile(path.join(__dirname, 'migrations', 'managed.json'), 'utf8'));
  const resultados = await aplicarMigraciones(pool, manifiesto, path.join(__dirname, 'migrations'));
  for (const resultado of resultados) {
    console.log(`[migraciones] ${resultado.estado}: ${resultado.nombre}`);
  }
  return resultados;
}

if (process.argv[1] && mismaRutaReal(process.argv[1], fileURLToPath(import.meta.url))) {
  try {
    if (process.argv.length !== 2) {
      throw new Error('Uso: node backend/apply-migrations.js');
    }
    await ejecutarMigracionesAdministradas();
  } catch (error) {
    console.error(`[migraciones] Falló la aplicación: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
