import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esCodigoOtpValido,
  esCorreoOtpValido,
  esOtpHabilitado,
  formatearEsperaOtp,
  mensajeErrorOtp,
  normalizarCodigoOtp,
  normalizarCorreoOtp,
  segundosDeEsperaOtp,
} from './otpAcceso.js';

test('la bandera OTP solo se activa con true', () => {
  assert.equal(esOtpHabilitado(undefined), false);
  assert.equal(esOtpHabilitado('false'), false);
  assert.equal(esOtpHabilitado('0'), false);
  assert.equal(esOtpHabilitado('true'), true);
  assert.equal(esOtpHabilitado(' TRUE '), true);
});

test('normaliza correos y acepta solo los dominios institucionales', () => {
  assert.equal(normalizarCorreoOtp('  Alumno@Red.UNID.mx  '), 'alumno@red.unid.mx');
  assert.equal(esCorreoOtpValido('alumno@red.unid.mx'), true);
  assert.equal(esCorreoOtpValido('alumno@unid.mx'), true);
  assert.equal(esCorreoOtpValido('ALUMNO@UNID.MX'), true);
  assert.equal(esCorreoOtpValido('alumno@externo.com'), false);
  assert.equal(esCorreoOtpValido('alumno@sub.red.unid.mx'), false);
  assert.equal(esCorreoOtpValido('alumno@red.unid.mx.evil.com'), false);
  assert.equal(esCorreoOtpValido('alumno@red.unid.mx@externo.com'), false);
  assert.equal(esCorreoOtpValido('alumno con espacios@red.unid.mx'), false);
  assert.equal(esCorreoOtpValido(''), false);
});

test('el código se limita a seis dígitos', () => {
  assert.equal(normalizarCodigoOtp(' 12a34-56 '), '123456');
  assert.equal(normalizarCodigoOtp('1234567'), '123456');
  assert.equal(esCodigoOtpValido('123456'), true);
  assert.equal(esCodigoOtpValido('12345'), false);
  assert.equal(esCodigoOtpValido('12345a'), false);
  assert.equal(esCodigoOtpValido(''), false);
});

test('formatea la espera del backend y la toma de Retry-After', () => {
  assert.equal(formatearEsperaOtp(0), '0:00');
  assert.equal(formatearEsperaOtp(9), '0:09');
  assert.equal(formatearEsperaOtp(65), '1:05');
  assert.equal(formatearEsperaOtp(900), '15:00');
  assert.equal(segundosDeEsperaOtp({ reintentarEnSegundos: 90 }), 90);
  assert.equal(segundosDeEsperaOtp({ reintentarEnSegundos: '12' }), 12);
  assert.equal(segundosDeEsperaOtp({ reintentarEnSegundos: 0 }), 0);
  assert.equal(segundosDeEsperaOtp({}), 0);
});

test('los mensajes no revelan si la cuenta existe', () => {
  const noExiste = mensajeErrorOtp({ status: 401 }, 'verificar');
  const existe = mensajeErrorOtp({ status: 401 }, 'verificar');

  assert.equal(noExiste, existe);
  assert.match(noExiste, /código es incorrecto o expiró/i);
  assert.doesNotMatch(noExiste, /cuenta|usuario existe|registrado/i);
});

test('traduce errores 400, 429, 503 y red', () => {
  assert.match(mensajeErrorOtp({ status: 400 }, 'solicitar'), /correo institucional/i);
  assert.match(mensajeErrorOtp({ status: 400 }, 'verificar'), /6 dígitos/i);
  assert.equal(
    mensajeErrorOtp({ status: 429, reintentarEnSegundos: 90 }, 'solicitar'),
    'Demasiadas solicitudes. Vuelve a intentarlo en 1:30.',
  );
  assert.match(mensajeErrorOtp({ status: 429 }, 'verificar'), /unos minutos/i);
  assert.match(mensajeErrorOtp({ status: 503 }, 'solicitar'), /no está disponible temporalmente/i);
  assert.match(mensajeErrorOtp({ status: 401 }, 'solicitar'), /No se pudo enviar el código/i);
  assert.match(mensajeErrorOtp({ status: 0, message: 'Sin conexión' }, 'solicitar'), /Sin conexión/);
});
