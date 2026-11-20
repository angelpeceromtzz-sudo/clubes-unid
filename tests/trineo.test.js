import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCartaTrineo, validarSeleccionCartaTrineo } from '../backend/lib/trineoDominio.js';

const carta = { nombre: '  Niño QA  ', edad: '7', deseo: '  Un trompo  ' };
const seleccion = { plantilla: 'trineo', idCarta: 3, actual: null, anteriorConfirmado: false };

test('cartas: limpia textos y exige datos completos, edades enteras y disponibilidad explícita', () => {
  assert.deepEqual(normalizarCartaTrineo(carta), { nombre: 'Niño QA', edad: 7, deseo: 'Un trompo', activa: true });
  for (const datos of [undefined, null, [], false, 'carta']) assert.throws(() => normalizarCartaTrineo(datos), { status: 400 });
  for (const edad of ['', ' ', true, null, [], 0, -1, 19, 1.5, 'no', Infinity]) assert.throws(() => normalizarCartaTrineo({ ...carta, edad }), { status: 400 });
  for (const datos of [{ nombre: '' }, { deseo: ' ' }, { nombre: 'a'.repeat(151) }, { deseo: 'a'.repeat(2001) }, { activa: 'false' }]) assert.throws(() => normalizarCartaTrineo({ ...carta, ...datos }), { status: 400 });
});

test('cartas: exige una carta válida sin depender de las aportaciones para la actividad', () => {
  assert.equal(validarSeleccionCartaTrineo(seleccion), 3);
  for (const idCarta of [undefined, null, '', false, [], {}, -1, 0, 2.5, '1e2', '3abc', Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validarSeleccionCartaTrineo({ ...seleccion, idCarta }), { status: 400 });
  for (const aportaciones of [[], [{}, {}]]) assert.equal(validarSeleccionCartaTrineo({ ...seleccion, aportaciones }), 3);
});

test('cartas: conserva registros anteriores y recupera la selección al corregir otros datos', () => {
  assert.equal(validarSeleccionCartaTrineo({ ...seleccion, idCarta: undefined, anteriorConfirmado: true, aportaciones: [{}, {}] }), null);
  assert.equal(validarSeleccionCartaTrineo({ ...seleccion, idCarta: undefined, actual: { id_carta: 3 } }), 3);
  for (const plantilla of ['misiones', 'general']) {
    assert.equal(validarSeleccionCartaTrineo({ ...seleccion, plantilla, idCarta: undefined }), null);
    assert.throws(() => validarSeleccionCartaTrineo({ ...seleccion, plantilla }), { status: 400 });
  }
});

test('cartas: el regalo recibido conserva su niño; recibir comida no bloquea el cambio de carta', () => {
  const recibida = { ...seleccion, actual: { id_carta: 3, recibida_en: '2026-11-18' } };
  assert.equal(validarSeleccionCartaTrineo(recibida), 3);
  assert.throws(() => validarSeleccionCartaTrineo({ ...recibida, idCarta: 4 }), { status: 409 });
  assert.throws(() => validarSeleccionCartaTrineo({ ...seleccion, idCarta: 4, actual: { id_carta: 3, recibida: true, recibida_en: null } }), { status: 409 });
  assert.equal(validarSeleccionCartaTrineo({ ...seleccion, idCarta: 4, actual: { id_carta: 3 }, anteriores: [{ estado: 'recibida' }] }), 4);
});
