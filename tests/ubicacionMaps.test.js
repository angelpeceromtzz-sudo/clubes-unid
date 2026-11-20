import test from 'node:test';
import assert from 'node:assert/strict';
import { coordenadasEnlaceMapa, enlaceMapaCoordenadas, normalizarEnlaceMapa } from '../shared/ubicacionMaps.js';
import { normalizarEdicionActividad } from '../shared/actividades.js';
import { pendientesEdicion } from '../src/utils/edicionActividad.js';

test('acepta puntos, enlaces compartidos y ediciones anteriores sin mapa', () => {
  for (const enlace of [
    'https://maps.app.goo.gl/ejemplo', 'https://goo.gl/maps/ejemplo',
    'https://www.google.com.mx/maps/place/UNID', 'https://maps.google.com/?q=UNID',
    'https://www.openstreetmap.org/?mlat=19.83&mlon=-90.53',
  ]) assert.equal(normalizarEnlaceMapa(' ' + enlace + ' '), enlace);
  for (const valor of ['', ' ', null, undefined]) assert.equal(normalizarEnlaceMapa(valor), '');
  assert.equal(normalizarEdicionActividad({ nombre: 'Edición anterior' }).ubicacion_maps, '');
  const ubicacion_maps = enlaceMapaCoordenadas(19.83, -90.53);
  assert.equal(normalizarEdicionActividad({ nombre: 'Edición con mapa', ubicacion_maps }).ubicacion_maps, ubicacion_maps);
});

test('rechaza enlaces ajenos, credenciales, protocolos y estructuras no válidas', () => {
  for (const enlace of [
    'javascript:alert(1)', 'http://maps.google.com/?q=UNID', 'https://example.com/maps',
    'https://www.google.com.ejemplo.test/maps', 'https://maps.app.goo.gl.ejemplo.test/qa',
    'https://usuario@www.google.com/maps', 'https://www.google.com:444/maps',
    'https://www.google.com/search?q=UNID', 'https://goo.gl/otro', 'https://maps.app.goo.gl/',
    'https://maps.google.com/?q=' + 'a'.repeat(2048), {}, true,
  ]) {
    assert.throws(() => normalizarEnlaceMapa(enlace), { status: 400 });
    assert.equal(coordenadasEnlaceMapa(enlace), null);
  }
  const pendientes = pendientesEdicion({ nombre: 'Edición', lugar: 'Campus', ubicacion_maps: 'enlace incorrecto' }, 'general');
  assert.equal(pendientes[0].length, 1);
  assert.match(pendientes[0][0], /enlace válido/);
});

test('el punto conserva sus coordenadas y el destino tiene prioridad sobre el centro de cámara', () => {
  const enlace = enlaceMapaCoordenadas(19.832561328, -90.556675538);
  assert.deepEqual(coordenadasEnlaceMapa(enlace), [19.832561, -90.556676]);
  assert.deepEqual(coordenadasEnlaceMapa('https://www.google.com/maps/place/UNID/@19.8,-90.6,15z/data=!4m2!3m1!3d19.83256!4d-90.55667'), [19.83256, -90.55667]);
  assert.deepEqual(coordenadasEnlaceMapa('https://maps.google.com/?q=19.83%2C%20-90.53'), [19.83, -90.53]);
  assert.deepEqual(coordenadasEnlaceMapa('https://www.openstreetmap.org/?mlat=0&mlon=0#map=16/0/0'), [0, 0]);
  for (const enlace of [
    'https://maps.app.goo.gl/ejemplo', 'https://www.google.com/maps/place/UNID/@19.8,-90.6,15z',
    'https://www.google.com/maps/search/?api=1&query=UNID', 'https://maps.google.com/?q=91,0',
    'https://www.openstreetmap.org/',
  ]) assert.equal(coordenadasEnlaceMapa(enlace), null);
  for (const punto of [[91, 0], [0, -181], [NaN, 1], [null, 0]]) assert.throws(() => enlaceMapaCoordenadas(...punto));
});
