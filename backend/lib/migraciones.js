import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const LOCK_MIGRACIONES_ID = '738214500921';
const NOMBRE_SQL_VALIDO = /^[a-z0-9][a-z0-9-]*\.sql$/;
const ESQUEMA_PRUEBA_VALIDO = /^runner_[a-f0-9]{32}$/;
const COMANDO_TRANSACCIONAL = /(?:^|;)\s*(?:BEGIN(?:\s+(?:WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(?:\s+(?:WORK|TRANSACTION))?|END(?:\s+(?:WORK|TRANSACTION))?|ROLLBACK(?:\s+(?:WORK|TRANSACTION))?|ABORT|SAVEPOINT\s+[a-z_][a-z0-9_]*|RELEASE(?:\s+SAVEPOINT)?\s+[a-z_][a-z0-9_]*|PREPARE\s+TRANSACTION)\b/im;

export function mismaRutaReal(rutaInvocada, rutaModulo, resolver = realpathSync) {
  if (!rutaInvocada || !rutaModulo) return false;
  try {
    return resolver(rutaInvocada) === resolver(rutaModulo);
  } catch {
    return false;
  }
}

function limpiarSqlExterior(sql) {
  let resultado = '';
  let indice = 0;

  const espacio = (inicio, fin) => sql.slice(inicio, fin).replace(/[^\r\n]/g, ' ');

  while (indice < sql.length) {
    if (sql.startsWith('--', indice)) {
      let fin = sql.indexOf('\n', indice + 2);
      if (fin < 0) fin = sql.length;
      resultado += espacio(indice, fin);
      indice = fin;
      continue;
    }

    if (sql.startsWith('/*', indice)) {
      let profundidad = 1;
      let fin = indice + 2;
      while (fin < sql.length && profundidad > 0) {
        if (sql.startsWith('/*', fin)) {
          profundidad += 1;
          fin += 2;
        } else if (sql.startsWith('*/', fin)) {
          profundidad -= 1;
          fin += 2;
        } else {
          fin += 1;
        }
      }
      if (profundidad !== 0) throw new Error('Migración contiene un comentario SQL sin cerrar.');
      resultado += espacio(indice, fin);
      indice = fin;
      continue;
    }

    const dollarQuote = sql.slice(indice).match(/^\$([_\p{L}][_\p{L}\p{M}\p{N}]*|)\$/u);
    if (dollarQuote) {
      const delimitador = dollarQuote[0];
      const cierre = sql.indexOf(delimitador, indice + delimitador.length);
      if (cierre < 0) throw new Error('Migración contiene un bloque dollar-quoted sin cerrar.');
      const fin = cierre + delimitador.length;
      resultado += espacio(indice, fin);
      indice = fin;
      continue;
    }

    if (sql[indice] === "'") {
      const prefijoE = /[eE]/.test(sql[indice - 1] || '')
        && (indice < 2 || !/[a-z0-9_$]/i.test(sql[indice - 2]));
      let fin = indice + 1;
      let cerrada = false;
      while (fin < sql.length) {
        if (!prefijoE && sql[fin] === '\\') {
          throw new Error("Migración contiene una barra invertida en cadena ordinaria; usa E'...' explícita.");
        }
        if (prefijoE && sql[fin] === '\\') {
          fin += Math.min(2, sql.length - fin);
        } else if (sql[fin] === "'" && sql[fin + 1] === "'") {
          fin += 2;
        } else if (sql[fin] === "'") {
          fin += 1;
          cerrada = true;
          break;
        } else {
          fin += 1;
        }
      }
      if (!cerrada) throw new Error('Migración contiene una cadena SQL sin cerrar.');
      resultado += espacio(indice, fin);
      indice = fin;
      continue;
    }

    if (sql[indice] === '"') {
      let fin = indice + 1;
      let cerrada = false;
      while (fin < sql.length) {
        if (sql[fin] === '"' && sql[fin + 1] === '"') {
          fin += 2;
        } else if (sql[fin] === '"') {
          fin += 1;
          cerrada = true;
          break;
        } else {
          fin += 1;
        }
      }
      if (!cerrada) throw new Error('Migración contiene un identificador SQL sin cerrar.');
      resultado += espacio(indice, fin);
      indice = fin;
      continue;
    }

    resultado += sql[indice];
    indice += 1;
  }

  return resultado;
}

export function validarSqlMigracion(sql, nombre = 'Migración') {
  // Los bloques dollar-quoted pueden contener BEGIN/END de PL/pgSQL; no son
  // comandos de transacción del archivo SQL exterior y se ejecutan en el BEGIN
  // que controla este ejecutor.
  const sqlExterior = limpiarSqlExterior(sql);

  if (/(?:^|;)\s*(?:SET\s+(?:(?:LOCAL|SESSION)\s+)?standard_conforming_strings|RESET\s+standard_conforming_strings)\b/im.test(sqlExterior)) {
    throw new Error(`${nombre} no puede cambiar standard_conforming_strings.`);
  }
  if (COMANDO_TRANSACCIONAL.test(sqlExterior)) {
    throw new Error(`${nombre} contiene control transaccional; la transacción la controla el ejecutor.`);
  }
}

export function validarManifestMigraciones(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.migrations)) {
    throw new Error('El manifiesto de migraciones no tiene un formato compatible.');
  }

  const nombres = new Set();
  for (const nombre of manifest.migrations) {
    if (typeof nombre !== 'string' || !NOMBRE_SQL_VALIDO.test(nombre) || nombre.endsWith('-down.sql')) {
      throw new Error(`Nombre de migración no permitido: ${String(nombre)}`);
    }
    const normalizado = nombre.toLowerCase();
    if (nombres.has(normalizado)) throw new Error(`Migración repetida en managed.json: ${nombre}`);
    nombres.add(normalizado);
  }
  return [...manifest.migrations];
}

export async function aplicarMigraciones(pool, manifest, directorioMigraciones, opciones = {}) {
  const nombres = validarManifestMigraciones(manifest);
  // Solo las pruebas pasan esquemaPrueba: ledger y migraciones quedan aislados allí.
  // La aplicación omite esta opción y conserva public como search_path y ledger.
  const esquemaObjetivo = opciones.esquemaPrueba ?? 'public';
  if (opciones.esquemaPrueba !== undefined
      && (typeof esquemaObjetivo !== 'string' || !ESQUEMA_PRUEBA_VALIDO.test(esquemaObjetivo))) {
    throw new Error('El esquema de prueba debe usar el formato runner_ seguido de 32 caracteres hexadecimales aleatorios.');
  }
  const cliente = await pool.connect();
  let bloqueoAdquirido = false;
  const resultados = [];

  try {
    await cliente.query('SELECT pg_advisory_lock($1::bigint)', [LOCK_MIGRACIONES_ID]);
    bloqueoAdquirido = true;
    if (opciones.esquemaPrueba) await cliente.query(`SET search_path TO ${esquemaObjetivo}`);
    const configuracionCadenas = await cliente.query('SHOW standard_conforming_strings');
    const valorCadenas = configuracionCadenas.rows[0]?.standard_conforming_strings;
    if (valorCadenas && valorCadenas.toLowerCase() !== 'on') {
      throw new Error('El ejecutor requiere standard_conforming_strings=on para validar SQL con seguridad.');
    }

    const ledger = await cliente.query(
      'SELECT to_regclass($1) IS NOT NULL AS existe',
      [`${esquemaObjetivo}.schema_migrations`],
    );
    if (!ledger.rows[0]?.existe) {
      const tablasExistentes = await cliente.query(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = $1
         ORDER BY tablename
         LIMIT 1`,
        [esquemaObjetivo],
      );
      if (tablasExistentes.rows.length) {
        throw new Error(
          `La base ya contiene tablas en ${esquemaObjetivo} (${tablasExistentes.rows[0].tablename}) ` +
          `pero no tiene ${esquemaObjetivo}.schema_migrations. No se ejecutó ninguna migración; reconcilia el historial existente antes de continuar.`,
        );
      }
    }

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS ${esquemaObjetivo}.schema_migrations (
        nombre TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        orden INTEGER,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        origen TEXT NOT NULL DEFAULT 'ejecutor'
      )
    `);
    await cliente.query(`ALTER TABLE ${esquemaObjetivo}.schema_migrations ADD COLUMN IF NOT EXISTS orden INTEGER`);
    await cliente.query(`ALTER TABLE ${esquemaObjetivo}.schema_migrations ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'ejecutor'`);
    await cliente.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_schema_migrations_origen'
            AND conrelid = '${esquemaObjetivo}.schema_migrations'::regclass
            AND pg_get_constraintdef(oid) ILIKE '%aplicacion_manual%'
        ) THEN
          ALTER TABLE ${esquemaObjetivo}.schema_migrations
            DROP CONSTRAINT IF EXISTS chk_schema_migrations_origen;
          ALTER TABLE ${esquemaObjetivo}.schema_migrations
            ADD CONSTRAINT chk_schema_migrations_origen
            CHECK (origen IN ('ejecutor', 'adopcion_verificada', 'aplicacion_manual'));
        END IF;
      END $$
    `);
    const filasSinOrden = await cliente.query(
      `SELECT nombre FROM ${esquemaObjetivo}.schema_migrations WHERE orden IS NULL LIMIT 1`,
    );
    if (filasSinOrden.rows.length) {
      throw new Error('El ledger tiene migraciones sin orden; revisa su historial antes de ejecutar nuevas migraciones.');
    }
    await cliente.query(`ALTER TABLE ${esquemaObjetivo}.schema_migrations ALTER COLUMN orden SET NOT NULL`);
    await cliente.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_migrations_checksum
        ON ${esquemaObjetivo}.schema_migrations (checksum)
    `);
    await cliente.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_migrations_orden
        ON ${esquemaObjetivo}.schema_migrations (orden)
    `);

    const ordenRegistrado = await cliente.query(
      `SELECT nombre, orden FROM ${esquemaObjetivo}.schema_migrations ORDER BY orden NULLS FIRST, nombre`,
    );
    for (let indice = 0; indice < ordenRegistrado.rows.length; indice += 1) {
      const fila = ordenRegistrado.rows[indice];
      if (Number(fila.orden) !== indice + 1 || nombres[indice] !== fila.nombre) {
        throw new Error(
          `El orden de managed.json cambió o el ledger contiene una secuencia incompleta cerca de ${fila.nombre}. ` +
          'No reordenes migraciones aplicadas; agrega las nuevas al final.',
        );
      }
    }

    for (let indice = 0; indice < nombres.length; indice += 1) {
      const nombre = nombres[indice];
      const archivo = path.join(directorioMigraciones, nombre);
      const sql = await readFile(archivo, 'utf8');
      validarSqlMigracion(sql, nombre);
      const contenidoNormalizado = sql.replace(/\r\n/g, '\n');
      const checksum = createHash('sha256').update(contenidoNormalizado, 'utf8').digest('hex');
      const checksumExistente = await cliente.query(
        `SELECT nombre FROM ${esquemaObjetivo}.schema_migrations WHERE checksum = $1`,
        [checksum],
      );
      if (checksumExistente.rows.length && checksumExistente.rows[0].nombre !== nombre) {
        throw new Error(
          `${nombre} contiene exactamente el mismo SQL que ${checksumExistente.rows[0].nombre}; ` +
          'no renombres migraciones ya registradas.',
        );
      }
      const registrada = await cliente.query(
        `SELECT checksum, orden FROM ${esquemaObjetivo}.schema_migrations WHERE nombre = $1`,
        [nombre],
      );

      if (registrada.rows.length) {
        if (registrada.rows[0].checksum.trim() !== checksum || Number(registrada.rows[0].orden) !== indice + 1) {
          throw new Error(`${nombre} ya se aplicó con otro contenido. Crea una migración nueva; no edites una aplicada.`);
        }
        resultados.push({ nombre, estado: 'ya_aplicada', checksum });
        continue;
      }

      let transaccionAbierta = false;
      try {
        await cliente.query('BEGIN');
        transaccionAbierta = true;
        await cliente.query(sql);
        const configuracionPosterior = await cliente.query('SHOW standard_conforming_strings');
        const valorPosterior = configuracionPosterior.rows[0]?.standard_conforming_strings;
        if (valorPosterior && valorPosterior.toLowerCase() !== 'on') {
          throw new Error(`${nombre} cambió standard_conforming_strings; se revierte la transacción.`);
        }
        await cliente.query(
          `INSERT INTO ${esquemaObjetivo}.schema_migrations (nombre, checksum, orden) VALUES ($1, $2, $3)`,
          [nombre, checksum, indice + 1],
        );
        await cliente.query('COMMIT');
        transaccionAbierta = false;
        resultados.push({ nombre, estado: 'aplicada', checksum });
      } catch (error) {
        if (transaccionAbierta) {
          try { await cliente.query('ROLLBACK'); } catch { /* conserva el error original */ }
        }
        throw error;
      }
    }
    return resultados;
  } finally {
    if (bloqueoAdquirido) {
      try {
        await cliente.query('SELECT pg_advisory_unlock($1::bigint)', [LOCK_MIGRACIONES_ID]);
      } finally {
        cliente.release();
      }
    } else {
      cliente.release();
    }
  }
}
