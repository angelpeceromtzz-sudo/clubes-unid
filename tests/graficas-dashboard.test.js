import test from 'node:test';
import assert from 'node:assert/strict';
import { admitePastel, numeroGrafica, prepararOcupacion, prepararPastel } from '../src/components/ejecutivo/graficas.utils.js';

test('agrupar opciones conserva el total y el desglose completo sin modificar las respuestas', () => {
  const datos = Array.from({ length: 9 }, (_, indice) => ({ id: indice, nombre: `Opción ${indice}`, valor: indice + 1 }));
  const copia = structuredClone(datos);
  const resultado = prepararPastel(datos);
  assert.equal(resultado.total, 45);
  assert.equal(resultado.sectores.length, 6);
  assert.equal(resultado.filas.length, 9);
  assert.equal(resultado.sectores.reduce((suma, fila) => suma + fila.valor, 0), 45);
  assert.equal(resultado.sectores.find((fila) => fila.agrupada).valor, 10);
  assert.equal(new Set(resultado.sectores.map((fila) => fila.color)).size, 6);
  assert.ok(Math.abs(resultado.sectores.reduce((suma, fila) => suma + fila.porcentaje, 0) - 100) < 1e-8);
  assert.deepEqual(datos, copia);
});

test('el pastel distingue cero respuestas de una base desconocida', () => {
  const vacia = prepararPastel([{ nombre: 'Opción', valor: 0 }]);
  assert.equal(vacia.valida, true);
  assert.equal(vacia.total, 0);
  assert.deepEqual(vacia.sectores, []);
  assert.equal(vacia.filas[0].porcentaje, null);
  for (const valor of [null, undefined, '', -1, NaN, Infinity]) {
    const resultado = prepararPastel([{ nombre: 'Disponible', valor: 5 }, { nombre: 'Otro', valor }]);
    assert.equal(resultado.valida, false);
    assert.equal(resultado.total, null);
    assert.deepEqual(resultado.sectores, []);
  }
});

test('una respuesta múltiple nunca se presenta como partes de un único total', () => {
  const base = { respuestas: 10, opciones: [{ texto: 'Deporte', conteo: 6 }, { texto: 'Cultura', conteo: 4 }] };
  assert.equal(admitePastel({ ...base, tipo: 'opcion_unica' }), true);
  assert.equal(admitePastel({ ...base, tipo: 'opcion_multiple' }), false);
  assert.equal(admitePastel({ ...base, tipo: 'escala' }), false);
  assert.equal(admitePastel({ ...base, tipo: 'opcion_unica', respuestas: 12 }), false);
  assert.equal(admitePastel({ tipo: 'opcion_unica', respuestas: 0, opciones: [] }), false);
});

test('la ocupación conserva la base y muestra el exceso aunque el dibujo termine en cien por ciento', () => {
  const [normal, exceso, sinBase, desconocida] = prepararOcupacion([
    { ocupado: 20, cupo: 40 },
    { ocupado: 65, cupo: 40 },
    { ocupado: 0, cupo: 0 },
    { ocupado: null, cupo: 40 },
  ]);
  assert.equal(normal.porcentaje, 50);
  assert.equal(normal.porcentajeOcupado + normal.porcentajeDisponible, 100);
  assert.equal(normal.disponible, 20);
  assert.equal(exceso.porcentaje, 162.5);
  assert.equal(exceso.porcentajeOcupado, 100);
  assert.equal(exceso.porcentajeDisponible, 0);
  assert.equal(exceso.exceso, 25);
  assert.equal(sinBase.porcentaje, null);
  assert.equal(desconocida.porcentaje, null);
});

test('los conteos numéricos del servidor se aceptan sin convertir ausencias de datos en cero', () => {
  assert.equal(numeroGrafica('25'), 25);
  assert.equal(numeroGrafica(0), 0);
  assert.equal(numeroGrafica(null), null);
  assert.equal(numeroGrafica(''), null);
  assert.equal(numeroGrafica(false), null);
  assert.equal(prepararPastel([{ nombre: 'A', valor: '6' }, { nombre: 'B', valor: '4' }]).total, 10);
});
