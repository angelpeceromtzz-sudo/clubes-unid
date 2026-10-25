import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerSegundosReintento } from './reintentosHttp.js';

function respuesta(headers = {}) {
  return { headers: new Headers(headers) };
}

test('prioriza Retry-After numérico', () => {
  assert.equal(leerSegundosReintento(respuesta({
    'Retry-After': '120',
    RateLimit: 'limit=10, remaining=0, reset=30',
  })), 120);
  assert.equal(leerSegundosReintento(respuesta({ 'Retry-After': '0' })), 0);
});

test('lee Retry-After como fecha HTTP', () => {
  const fecha = new Date(Date.now() + 90_000).toUTCString();
  const segundos = leerSegundosReintento(respuesta({ 'Retry-After': fecha }));

  assert.ok(segundos >= 88 && segundos <= 90);
});

test('lee el reset del encabezado RateLimit combinado', () => {
  assert.equal(leerSegundosReintento(respuesta({
    RateLimit: 'limit=10, remaining=0, reset=900',
  })), 900);
  assert.equal(leerSegundosReintento(respuesta({
    RateLimit: '"default";r=0;t=45',
  })), 45);
});

test('acepta RateLimit-Reset y X-RateLimit-Reset', () => {
  assert.equal(leerSegundosReintento(respuesta({ 'RateLimit-Reset': '60' })), 60);
  assert.equal(leerSegundosReintento(respuesta({ 'X-RateLimit-Reset': '75' })), 75);
});

test('devuelve null sin encabezados válidos', () => {
  assert.equal(leerSegundosReintento(respuesta()), null);
  assert.equal(leerSegundosReintento(respuesta({ 'Retry-After': 'invalido' })), null);
  assert.equal(leerSegundosReintento(respuesta({ 'RateLimit-Reset': 'abc' })), null);
});
