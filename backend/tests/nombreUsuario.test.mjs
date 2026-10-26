import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  LARGO_MAXIMO_NOMBRE,
  normalizarNombreCompleto,
  validarNombreCompleto,
} = await import('../lib/nombreUsuario.js');

test('normaliza espacios, controles y acentos sin cambiar el nombre', () => {
  assert.equal(normalizarNombreCompleto('  Ana   López  Pérez  '), 'Ana López Pérez');
  assert.equal(normalizarNombreCompleto('José\u0000 Ñandú'), 'José Ñandú');
  assert.equal(normalizarNombreCompleto('María\tde\nla Cruz'), 'María de la Cruz');
  assert.equal(normalizarNombreCompleto(null), '');
  assert.equal(normalizarNombreCompleto(123), '');
});

test('acepta nombres completos válidos', () => {
  for (const nombre of ['Ana López Pérez', 'María de la Cruz', 'José Ñandú Ávila']) {
    const resultado = validarNombreCompleto(nombre, 'alumno@red.unid.mx');
    assert.equal(resultado.valido, true);
    assert.equal(resultado.nombre, nombre);
    assert.equal(resultado.error, '');
  }
});

test('rechaza nombre vacío o demasiado corto', () => {
  assert.equal(validarNombreCompleto('', 'alumno@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('   ', 'alumno@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('Al', 'alumno@red.unid.mx').valido, false);
});

test('rechaza matrícula, números y correo como nombre', () => {
  assert.equal(validarNombreCompleto('00879418', '00879418@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('Alumno 00879418', 'alumno@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('nuevo.alumno', 'nuevo.alumno@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('NUEVO.ALUMNO', 'nuevo.alumno@red.unid.mx').valido, false);
  assert.equal(validarNombreCompleto('ana@red.unid.mx', 'ana@red.unid.mx').valido, false);
});

test('rechaza nombres que superan el largo de la columna', () => {
  const nombreLargo = 'A'.repeat(LARGO_MAXIMO_NOMBRE + 1);
  assert.equal(validarNombreCompleto(nombreLargo, 'alumno@red.unid.mx').valido, false);
});
