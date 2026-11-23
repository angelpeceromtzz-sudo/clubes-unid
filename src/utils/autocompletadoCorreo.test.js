import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarDominioCorreo,
  obtenerSugerenciasCorreo,
} from './autocompletadoCorreo.js';

test('sugiere ambos dominios a partir de la parte local', () => {
  const esperadas = ['ana@red.unid.mx', 'ana@unid.mx'];

  assert.deepEqual(obtenerSugerenciasCorreo('ana'), esperadas);
  assert.deepEqual(obtenerSugerenciasCorreo('  ANA  '), esperadas);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@'), esperadas);
});

test('filtra las sugerencias por prefijo de dominio', () => {
  assert.deepEqual(obtenerSugerenciasCorreo('ana@red'), ['ana@red.unid.mx']);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@red.unid'), ['ana@red.unid.mx']);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@unid.m'), ['ana@unid.mx']);
});

test('no sugiere si el correo ya es válido o el dominio es ajeno', () => {
  assert.deepEqual(obtenerSugerenciasCorreo('ana@red.unid.mx'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@unid.mx'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@gmail.com'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@red.unid.mx.evil'), []);
});

test('no sugiere con valores inválidos', () => {
  assert.deepEqual(obtenerSugerenciasCorreo(''), []);
  assert.deepEqual(obtenerSugerenciasCorreo('   '), []);
  assert.deepEqual(obtenerSugerenciasCorreo('ana con espacio'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('ana@unid@red.unid.mx'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('@red.unid.mx'), []);
  assert.deepEqual(obtenerSugerenciasCorreo('a'.repeat(65)), []);
});

test('añade o reemplaza el dominio institucional', () => {
  assert.equal(aplicarDominioCorreo('ana', 'red.unid.mx'), 'ana@red.unid.mx');
  assert.equal(aplicarDominioCorreo('ana@unid.mx', 'red.unid.mx'), 'ana@red.unid.mx');
  assert.equal(aplicarDominioCorreo('  ANA@GMAIL.COM ', '@unid.mx'), 'ana@unid.mx');
  assert.equal(aplicarDominioCorreo('', 'unid.mx'), '');
});
