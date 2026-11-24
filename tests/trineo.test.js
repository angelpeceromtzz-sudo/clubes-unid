import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCartaTrineo, validarSeleccionCartaTrineo } from '../backend/lib/trineoDominio.js';
import { camposPlantillaActividad, camposRegistroTrineo, normalizarCamposActividad, cotizarCamisaTrineo } from '../shared/actividades.js';

test('camisas: la talla de Trineo es opcional y el precio se valida en centavos', () => {
  const campos = camposPlantillaActividad('trineo').map((campo) => campo.clave === 'talla' ? { ...campo, obligatorio: true, opciones: ['M', 'L'], precio_camisa_centavos: 16000 } : campo);
  const normalizados = normalizarCamposActividad(campos, 'trineo');
  assert.equal(normalizados.find((campo) => campo.clave === 'talla').obligatorio, false);
  assert.equal(normalizados.find((campo) => campo.clave === 'talla').precio_camisa_centavos, 16000);
  assert.equal(camposRegistroTrineo(campos).find((campo) => campo.clave === 'talla').obligatorio, false);
  assert.equal(campos.find((campo) => campo.clave === 'talla').obligatorio, true);
  assert.equal(camposPlantillaActividad('misiones').find((campo) => campo.clave === 'talla').obligatorio, true);
  for (const precio of [-1, 1.5, '16000', true, 100000001]) assert.throws(() => normalizarCamposActividad(campos.map((campo) => campo.clave === 'talla' ? { ...campo, precio_camisa_centavos: precio } : campo), 'trineo'), { status: 400 });
});

test('camisas: no pedir camisa cuesta cero y pedirla requiere una talla y un precio válidos', () => {
  const campo = { opciones: ['M', 'L'], precio_camisa_centavos: 16000 };
  assert.equal(cotizarCamisaTrineo({ solicita: false }).total_centavos, 0);
  assert.throws(() => cotizarCamisaTrineo({ campo, talla: 'L' }), { status: 400 });
  assert.equal(cotizarCamisaTrineo({ campo, solicita: false, talla: 'L' }).lineas.length, 0);
  const pedido = cotizarCamisaTrineo({ campo, solicita: true, talla: 'L' });
  assert.equal(pedido.total_centavos, 16000);
  assert.deepEqual(pedido.lineas.map(({ talla, cantidad, precio_centavos, subtotal_centavos }) => ({ talla, cantidad, precio_centavos, subtotal_centavos })), [{ talla: 'L', cantidad: 1, precio_centavos: 16000, subtotal_centavos: 16000 }]);
  for (const cambio of [{ solicita: 'true' }, { talla: '' }, { talla: 'XXL' }]) assert.throws(() => cotizarCamisaTrineo({ campo, solicita: true, talla: 'L', ...cambio }), { status: 400 });
  assert.throws(() => cotizarCamisaTrineo({ campo: { opciones: ['L'] }, solicita: true, talla: 'L' }), { status: 409 });
  assert.equal(cotizarCamisaTrineo({ campo: { ...campo, precio_camisa_centavos: 0 }, solicita: true, talla: 'M' }).total_centavos, 0);
});

test('camisas: una inscripción conserva su cotización al editar otros datos y actualiza el precio al cambiar talla', () => {
  const campo = { opciones: ['M', 'L'], precio_camisa_centavos: 16000 };
  const anterior = cotizarCamisaTrineo({ campo, solicita: true, talla: 'L' });
  const actualizado = { ...campo, precio_camisa_centavos: 18000 };
  assert.equal(cotizarCamisaTrineo({ campo: actualizado, talla: 'L', anterior }), anterior);
  assert.equal(cotizarCamisaTrineo({ campo: actualizado, solicita: true, talla: 'M', anterior }).total_centavos, 18000);
  assert.equal(cotizarCamisaTrineo({ solicita: false, anterior }).total_centavos, 0);
  assert.equal(cotizarCamisaTrineo({ campo: actualizado, solicita: true, talla: 'L' }).total_centavos, 18000);
});

const carta = { nombre: '  Niño QA  ', edad: '7', deseo: '  Un trompo  ' };
const seleccion = { plantilla: 'trineo', idCarta: 3, actual: null, anteriorConfirmado: false };

test('cartas: limpia textos y exige datos completos, edades válidas y disponibilidad explícita', () => {
  assert.deepEqual(normalizarCartaTrineo(carta), { nombre: 'Niño QA', edad: 7, deseo: 'Un trompo', activa: true });
  for (const datos of [undefined, null, [], false, 'carta']) assert.throws(() => normalizarCartaTrineo(datos), { status: 400 });
  for (const edad of ['', ' ', true, null, [], -1, 100.1, 1.25, 'no', Infinity]) assert.throws(() => normalizarCartaTrineo({ ...carta, edad }), { status: 400 });
  for (const edad of [0, 1, 50, 100]) assert.equal(normalizarCartaTrineo({ ...carta, edad }).edad, edad);
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
