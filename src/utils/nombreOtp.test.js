import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LARGO_MAXIMO_NOMBRE_OTP,
  errorRequiereNombreOtp,
  normalizarNombreOtp,
  requiereNombreOtp,
  validarNombreOtp,
} from './nombreOtp.js';

test('normaliza espacios, controles y acentos del nombre', () => {
  assert.equal(normalizarNombreOtp('  Ana   López  Pérez  '), 'Ana López Pérez');
  assert.equal(normalizarNombreOtp('José\u0000 Ñandú'), 'José Ñandú');
  assert.equal(normalizarNombreOtp('María\tde\nla Cruz'), 'María de la Cruz');
  assert.equal(normalizarNombreOtp(null), '');
  assert.equal(normalizarNombreOtp(123), '');
});

test('acepta nombres completos válidos', () => {
  for (const nombre of ['Ana López Pérez', 'María de la Cruz', 'José Ñandú Ávila']) {
    assert.equal(validarNombreOtp(nombre, 'alumno@red.unid.mx'), '');
  }
});

test('rechaza nombre vacío, corto o con números', () => {
  assert.match(validarNombreOtp('', 'alumno@red.unid.mx'), /nombre completo/i);
  assert.match(validarNombreOtp('   ', 'alumno@red.unid.mx'), /nombre completo/i);
  assert.match(validarNombreOtp('Al', 'alumno@red.unid.mx'), /al menos 3/i);
  assert.match(validarNombreOtp('00879418', '00879418@red.unid.mx'), /matrícula/i);
  assert.match(validarNombreOtp('Alumno 00879418', 'alumno@red.unid.mx'), /matrícula/i);
});

test('rechaza la matrícula y el correo como nombre', () => {
  assert.match(validarNombreOtp('nuevo.alumno', 'nuevo.alumno@red.unid.mx'), /matrícula/i);
  assert.match(validarNombreOtp('NUEVO.ALUMNO', 'nuevo.alumno@red.unid.mx'), /matrícula/i);
  assert.match(validarNombreOtp('ana@red.unid.mx', 'ana@red.unid.mx'), /correo/i);
  assert.match(
    validarNombreOtp('A'.repeat(LARGO_MAXIMO_NOMBRE_OTP + 1), 'alumno@red.unid.mx'),
    /150/,
  );
});

test('un usuario nuevo sin nombre requiere completar el registro', () => {
  assert.equal(requiereNombreOtp({ requiere_nombre: true, error: 'Escribe tu nombre completo.' }), true);
  assert.equal(errorRequiereNombreOtp({ cuerpo: { requiere_nombre: true } }), true);
});

test('un usuario existente con token no requiere nombre', () => {
  assert.equal(
    requiereNombreOtp({ token: 'token-ficticio', user: { nombre_completo: 'Nombre Actual' } }),
    false,
  );
  assert.equal(errorRequiereNombreOtp({ cuerpo: { error: 'Credenciales inválidas' } }), false);
  assert.equal(errorRequiereNombreOtp({ message: 'sin cuerpo' }), false);
});
