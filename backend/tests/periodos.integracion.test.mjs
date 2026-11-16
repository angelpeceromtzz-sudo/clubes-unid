import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import pg from 'pg';
import { fechaInstitucionalHoy, obtenerPeriodoVigenteId, resolverPeriodoVigente } from '../lib/periodos.js';
import { aFechaISO } from '../config/timezone.js';

// Habilitación explícita: nunca usa el pool ni las credenciales del proyecto.
// PERIODOS_TEST_DATABASE_URL=postgresql://usuario@127.0.0.1:puerto/base_pruebas
const urlPruebas = process.env.PERIODOS_TEST_DATABASE_URL;
if (urlPruebas) {
  const url = new URL(urlPruebas);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'La base debe ser local');
  assert.ok(decodeURIComponent(url.pathname).endsWith('_pruebas'), 'La base debe terminar en _pruebas');
}
const migracion = readFileSync(new URL('../migrations/migrate-periodos-calendario.sql', import.meta.url), 'utf8');
const esquemaCompleto = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const inicio = esquemaCompleto.indexOf('CREATE TABLE IF NOT EXISTS periodos_actividad (');
const fin = esquemaCompleto.indexOf('-- 2. Sesiones:', inicio);
assert.ok(inicio >= 0 && fin > inicio, 'Debe encontrarse el bloque real del calendario');
const calendarioSchema = esquemaCompleto.slice(inicio, fin);
// Representa una base anterior a la migración, sin las garantías nuevas.
const tablaAnterior = `CREATE TABLE periodos_actividad (
  id_periodo SERIAL PRIMARY KEY, nombre VARCHAR(50) NOT NULL,
  fecha_inicio DATE NOT NULL, fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT FALSE,
  CONSTRAINT uq_periodos_fechas UNIQUE(fecha_inicio, fecha_fin)
)`;

async function enEsquemaTemporal(comprobar) {
  const cliente = new pg.Client({ connectionString: urlPruebas, connectionTimeoutMillis: 5000 });
  const esquema = `periodos_test_${randomUUID().replaceAll('-', '')}`;
  await cliente.connect();
  try {
    await cliente.query(`CREATE SCHEMA "${esquema}"`);
    await cliente.query(`SET search_path TO "${esquema}", public`);
    await comprobar(cliente);
  } finally {
    await cliente.query('ROLLBACK').catch(() => {});
    await cliente.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
    await cliente.end();
  }
}

async function restricciones(cliente) {
  return (await cliente.query("SELECT conname FROM pg_constraint WHERE conrelid='periodos_actividad'::regclass")).rows.map((fila) => fila.conname);
}

async function comprobarGarantias(cliente) {
  const nombres = await restricciones(cliente);
  assert.ok(nombres.includes('chk_periodo_fechas_validas'));
  assert.ok(nombres.includes('excl_periodos_sin_solapamiento'));
  await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin,activo) VALUES ('A','2026-09-01','2026-12-31',false),('B','2027-01-01','2027-04-30',false)");
  await assert.rejects(cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('invertido','2027-06-01','2027-05-01')"), { code: '23514' });
  // El último día pertenece a A: comenzar otro periodo ese día se solapa.
  await assert.rejects(cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('solapado','2026-12-31','2027-01-02')"), { code: '23P01' });
}

describe('calendario institucional en PostgreSQL real', { skip: !urlPruebas && 'PERIODOS_TEST_DATABASE_URL no definida' }, () => {
  test('la migración real instala las garantías y se puede repetir', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    await cliente.query(migracion);
    await cliente.query(migracion);
    await comprobarGarantias(cliente);
  }));

  test('la migración real rechaza conflictos preexistentes y conserva las filas', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('A','2026-09-01','2026-12-31'),('B','2026-10-01','2027-01-31')");
    const antes = (await cliente.query('SELECT * FROM periodos_actividad ORDER BY id_periodo')).rows;
    await assert.rejects(cliente.query(migracion));
    await cliente.query('ROLLBACK');
    assert.deepEqual((await cliente.query('SELECT * FROM periodos_actividad ORDER BY id_periodo')).rows, antes);
    assert.ok(!(await restricciones(cliente)).includes('excl_periodos_sin_solapamiento'));
  }));

  test('el bloque real de schema.sql instala ambas garantías y es repetible', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(calendarioSchema);
    await cliente.query(calendarioSchema);
    await comprobarGarantias(cliente);
  }));

  test('el bloque real de schema.sql rechaza solapamientos sin ocultar el error', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin) VALUES ('A','2026-09-01','2026-12-31'),('B','2026-10-01','2027-01-31')");
    const antes = (await cliente.query('SELECT * FROM periodos_actividad ORDER BY id_periodo')).rows;
    await assert.rejects(cliente.query(calendarioSchema), { code: '23P01' });
    assert.deepEqual((await cliente.query('SELECT * FROM periodos_actividad ORDER BY id_periodo')).rows, antes);
  }));

  test('la consulta real usa límites inclusivos, ignora activo y no elige por recencia', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    assert.equal((await resolverPeriodoVigente(cliente, '2026-11-16')).periodo, null);
    await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin,activo) VALUES ('vigente','2026-09-01','2026-12-31',false),('futuro','2027-01-01','2027-04-30',false),('pasado','2025-01-01','2025-04-30',true)");
    for (const fecha of ['2026-09-01', '2026-11-16', '2026-12-31']) {
      assert.equal((await resolverPeriodoVigente(cliente, fecha)).periodo.nombre, 'vigente');
    }
    assert.equal((await resolverPeriodoVigente(cliente, '2026-08-31')).periodo, null);
    assert.equal((await resolverPeriodoVigente(cliente, '2027-01-01')).periodo.nombre, 'futuro');
  }));

  test('la consulta real devuelve todos los candidatos y el getter rechaza la inconsistencia', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin,activo) VALUES ('A','2026-09-01','2026-12-31',true),('B','2026-10-01','2027-01-31',false)");
    const resultado = await resolverPeriodoVigente(cliente, '2026-11-16');
    assert.equal(resultado.periodo, null);
    assert.equal(resultado.inconsistencia, true);
    assert.equal(resultado.candidatos.length, 2);
    await assert.rejects(obtenerPeriodoVigenteId(cliente, '2026-11-16'), { code: 'PERIODO_INCONSISTENTE' });
  }));

  test('el SQL del helper cambia de día a las 06:00Z con distintas zonas de sesión', () => enEsquemaTemporal(async (cliente) => {
    await cliente.query(tablaAnterior);
    await cliente.query("INSERT INTO periodos_actividad(nombre,fecha_inicio,fecha_fin,activo) VALUES ('A','2026-09-01','2026-12-31',false)");
    for (const zona of ['UTC', 'Asia/Tokyo']) {
      await cliente.query(`SET TIME ZONE '${zona}'`);
      for (const [instante, fecha, id] of [
        ['2026-09-01 00:30:00+00', '2026-08-31', null],
        ['2026-09-01 05:59:59+00', '2026-08-31', null],
        ['2026-09-01 06:00:00+00', '2026-09-01', 1],
      ]) {
        // Solo se fija el reloj: la conversión y la selección son SQL reales.
        const reloj = { query: (sql, valores) => cliente.query(sql.replaceAll('CURRENT_TIMESTAMP', `TIMESTAMPTZ '${instante}'`), valores) };
        assert.equal(aFechaISO(await fechaInstitucionalHoy(reloj)), fecha);
        assert.equal((await resolverPeriodoVigente(reloj)).periodo?.id_periodo ?? null, id);
      }
    }
  }));
});
