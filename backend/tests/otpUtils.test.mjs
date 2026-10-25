// Utilidades puras del código OTP: generación, hash, comparación y expiración.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.OTP_PEPPER = 'pepper-ficticio-solo-para-pruebas';
process.env.OTP_EXPIRATION_MINUTES = '10';

const {
  MAX_INTENTOS_OTP,
  calcularExpiracionOtp,
  compararHashOtp,
  esCodigoOtpValido,
  estaExpiradoOtp,
  generarCodigoOtp,
  generarHashOtp,
  normalizarCodigoOtp,
  obtenerMinutosExpiracionOtp,
  segundosHastaExpiracionOtp,
} = await import('../lib/otp.js');

test('genera siempre códigos de exactamente seis dígitos', () => {
  for (let i = 0; i < 500; i += 1) {
    assert.match(generarCodigoOtp(), /^\d{6}$/);
  }
  assert.equal(MAX_INTENTOS_OTP, 5);
});

test('normaliza y valida el formato del código', () => {
  assert.equal(normalizarCodigoOtp('  123456  '), '123456');
  assert.equal(normalizarCodigoOtp(123456), '');
  assert.equal(normalizarCodigoOtp(null), '');
  assert.equal(esCodigoOtpValido('123456'), true);
  assert.equal(esCodigoOtpValido(' 123456 '), true);
  assert.equal(esCodigoOtpValido('12345'), false);
  assert.equal(esCodigoOtpValido('1234567'), false);
  assert.equal(esCodigoOtpValido('12a456'), false);
  assert.equal(esCodigoOtpValido(''), false);
});

test('genera un HMAC-SHA-256 de 64 caracteres hexadecimales', () => {
  const hash = generarHashOtp('123456');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, generarHashOtp('123456'));
  assert.notEqual(hash, generarHashOtp('654321'));
  assert.notEqual(hash, '123456');
});

test('compara hashes en tiempo constante y falla cerrado', () => {
  const hash = generarHashOtp('123456');
  assert.equal(compararHashOtp('123456', hash), true);
  assert.equal(compararHashOtp('654321', hash), false);
  assert.equal(compararHashOtp('123456', 'no-es-un-hash'), false);
  assert.equal(compararHashOtp('12345', hash), false);
  assert.equal(compararHashOtp('123456', hash, 'otro-pepper'), false);
});

test('rechaza generar hash de un código con formato inválido', () => {
  assert.throws(() => generarHashOtp('12345'), /Código OTP inválido/);
  assert.throws(() => generarHashOtp('abcdef'), /Código OTP inválido/);
});

test('calcula expiración de diez minutos por defecto', () => {
  const desde = new Date('2026-01-01T00:00:00.000Z');
  const expiracion = calcularExpiracionOtp(desde);
  assert.equal(expiracion.toISOString(), '2026-01-01T00:10:00.000Z');
  assert.equal(obtenerMinutosExpiracionOtp(), 10);
  assert.equal(segundosHastaExpiracionOtp(expiracion, desde), 600);
});

test('detecta expiración y trata fechas inválidas como expiradas', () => {
  const ahora = new Date('2026-01-01T00:10:01.000Z');
  assert.equal(estaExpiradoOtp(new Date('2026-01-01T00:10:00.000Z'), ahora), true);
  assert.equal(estaExpiradoOtp(new Date('2026-01-01T00:10:02.000Z'), ahora), false);
  assert.equal(estaExpiradoOtp('fecha-invalida', ahora), true);
  assert.equal(segundosHastaExpiracionOtp('fecha-invalida', ahora), 0);
});

test('exige OTP_PEPPER configurado', async () => {
  const anterior = process.env.OTP_PEPPER;
  delete process.env.OTP_PEPPER;

  try {
    const { generarHashOtp: generarSinPepper } = await import('../lib/otp.js');
    assert.throws(() => generarSinPepper('123456'), /OTP_PEPPER/);
  } finally {
    process.env.OTP_PEPPER = anterior;
  }
});
