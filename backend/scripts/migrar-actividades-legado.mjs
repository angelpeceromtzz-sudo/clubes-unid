import pool from '../db.js';
import { migrarLegadoActividades } from '../lib/actividadesLegado.js';

const argumentos = process.argv.slice(2);
const valor = (nombre) => Number(argumentos[argumentos.indexOf(nombre) + 1]);
try {
  if (!argumentos.includes('--club') || !argumentos.includes('--edicion')) throw new Error('Uso: node backend/scripts/migrar-actividades-legado.mjs --club ID --edicion ID [--aplicar]');
  const resultado = await migrarLegadoActividades(pool, { idClub: valor('--club'), idEdicion: valor('--edicion'), aplicar: argumentos.includes('--aplicar') });
  // Solo conteos e identificadores; nunca nombres, matrículas ni respuestas de alumnos.
  process.stdout.write(JSON.stringify(resultado, null, 2) + '\n');
} catch (error) {
  process.stderr.write((error.status || !error.code ? error.message : 'No se pudo completar la transición: ' + error.code) + '\n');
  process.exitCode = 1;
} finally { await pool.end(); }
