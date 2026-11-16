import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolverPeriodoVigente, fechaInstitucionalHoy } from '../lib/periodos.js';

function dbConFilas(filas) {
  return {
    query: async (sql, params) => {
      if (sql.includes('CURRENT_TIMESTAMP AT TIME ZONE')) {
        return { rows: [{ hoy: '2026-11-16' }] };
      }
      return { rows: filas };
    },
  };
}

describe('resolverPeriodoVigente', () => {
  test('cero coincidentes devuelve null sin inconsistencia', async () => {
    const db = dbConFilas([]);
    const r = await resolverPeriodoVigente(db, '2026-11-16');
    assert.equal(r.periodo, null);
    assert.equal(r.inconsistencia, false);
    assert.equal(r.candidatos.length, 0);
  });

  test('un coincidente devuelve ese periodo', async () => {
    const fila = { id_periodo: 1, nombre: 'Sep-Dic', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: true };
    const db = dbConFilas([fila]);
    const r = await resolverPeriodoVigente(db, '2026-11-16');
    assert.equal(r.periodo.id_periodo, 1);
    assert.equal(r.inconsistencia, false);
  });

  test('varios coincidentes señalan inconsistencia', async () => {
    const f1 = { id_periodo: 1, nombre: 'P1', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: true };
    const f2 = { id_periodo: 2, nombre: 'P2', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: false };
    const db = dbConFilas([f1, f2]);
    const r = await resolverPeriodoVigente(db, '2026-11-16');
    assert.equal(r.periodo, null);
    assert.equal(r.inconsistencia, true);
    assert.equal(r.candidatos.length, 2);
  });

  test('límites inclusivos de inicio y fin', async () => {
    const fila = { id_periodo: 1, nombre: 'P', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: false };
    const dbInicio = dbConFilas([fila]);
    const rInicio = await resolverPeriodoVigente(dbInicio, '2026-09-01');
    assert.equal(rInicio.periodo.id_periodo, 1);

    const dbFin = dbConFilas([fila]);
    const rFin = await resolverPeriodoVigente(dbFin, '2026-12-31');
    assert.equal(rFin.periodo.id_periodo, 1);
  });

  test('independiente de la bandera activo', async () => {
    const fila = { id_periodo: 1, nombre: 'P', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: false };
    const db = dbConFilas([fila]);
    const r = await resolverPeriodoVigente(db, '2026-11-16');
    assert.equal(r.periodo.id_periodo, 1);
  });
});