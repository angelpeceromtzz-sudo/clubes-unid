// Validación centralizada del correo institucional para OTP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMINIOS_INSTITUCIONALES_PERMITIDOS,
  esCorreoInstitucionalValido,
  normalizarCorreoInstitucional,
  obtenerDominioCorreo,
} from '../lib/institutionalEmail.js';

test('acepta red.unid.mx y unid.mx con dominio exacto', () => {
  assert.equal(esCorreoInstitucionalValido('alumno@red.unid.mx'), true);
  assert.equal(esCorreoInstitucionalValido('alumno@unid.mx'), true);
});

test('normaliza mayúsculas y espacios externos', () => {
  assert.equal(normalizarCorreoInstitucional('  ALUMNO@RED.UNID.MX  '), 'alumno@red.unid.mx');
  assert.equal(esCorreoInstitucionalValido('  ALUMNO@RED.UNID.MX  '), true);
});

test('rechaza dominios externos y parecidos', () => {
  assert.equal(esCorreoInstitucionalValido('alumno@gmail.com'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@otro-unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@unid.mx.otrodominio.com'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@red.unid.mx.evil.com'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@unid.mx@evil.com'), false);
});

test('rechaza subdominios no autorizados', () => {
  assert.equal(esCorreoInstitucionalValido('alumno@sub.red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@sub.unid.mx'), false);
});

test('rechaza correos sin formato válido', () => {
  assert.equal(esCorreoInstitucionalValido('sinarroba'), false);
  assert.equal(esCorreoInstitucionalValido('alumno @red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido('alumno@ red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido(''), false);
  assert.equal(esCorreoInstitucionalValido('   '), false);
  assert.equal(esCorreoInstitucionalValido(null), false);
  assert.equal(esCorreoInstitucionalValido(undefined), false);
  assert.equal(esCorreoInstitucionalValido(123), false);
});

test('rechaza parte local inválida o correos demasiado largos', () => {
  assert.equal(esCorreoInstitucionalValido('.alumno@red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido('alumno.@red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido('alumno..doble@red.unid.mx'), false);
  assert.equal(esCorreoInstitucionalValido(`${'a'.repeat(101)}@red.unid.mx`), false);
});

test('expone la lista de dominios permitidos y el dominio del correo', () => {
  assert.deepEqual(DOMINIOS_INSTITUCIONALES_PERMITIDOS, ['red.unid.mx', 'unid.mx']);
  assert.equal(Object.isFrozen(DOMINIOS_INSTITUCIONALES_PERMITIDOS), true);
  assert.equal(obtenerDominioCorreo(' ALUMNO@UNID.MX '), 'unid.mx');
  assert.equal(obtenerDominioCorreo('sinarroba'), '');
});
