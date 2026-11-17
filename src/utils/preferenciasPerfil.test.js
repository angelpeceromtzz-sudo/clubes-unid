import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptarPreferenciasServidor } from './preferenciasPerfil.js';

const catalogo = [
  { id: 10, id_categoria: 1 },
  { id: 40, id_categoria: 4 },
];

test('reproduce el problema: recargar el catálogo no debe sobrescribir cambios no guardados', () => {
  const original = { categorias: [1], actividades: [10], motivaciones: [1], genero: 'mujer', correo: { activo: true, frecuencia: 'diaria', tipos: { eventos: true } } };
  const editado = { ...original, categorias: [1, 4], actividades: [10, 40], genero: 'hombre' };

  // La adaptación del servidor solo se aplica cuando se carga por primera vez.
  // Una segunda "recarga" del catálogo no debe reemplazar el estado editado.
  const adaptado = adaptarPreferenciasServidor(original, catalogo);
  assert.deepEqual(adaptado.categorias, [1]);
  assert.notEqual(JSON.stringify(adaptado), JSON.stringify(editado));
});

test('filtra actividades huérfanas cuando se conoce el catálogo', () => {
  const datos = { categorias: [1], actividades: [10, 40], motivaciones: [], genero: null, correo: { activo: false, frecuencia: 'inmediata', tipos: {} } };
  const adaptado = adaptarPreferenciasServidor(datos, catalogo);
  assert.deepEqual(adaptado.actividades, [10]);
});

test('sin catálogo no elimina actividades por defecto', () => {
  const datos = { categorias: [1], actividades: [10, 40], motivaciones: [], genero: null, correo: { activo: false, frecuencia: 'inmediata', tipos: {} } };
  const adaptado = adaptarPreferenciasServidor(datos, []);
  assert.deepEqual(adaptado.actividades, [10, 40]);
});

test('maneja datos nulos y undefined sin lanzar', () => {
  assert.doesNotThrow(() => adaptarPreferenciasServidor(null));
  assert.doesNotThrow(() => adaptarPreferenciasServidor(undefined));
  const adaptado = adaptarPreferenciasServidor(null);
  assert.deepEqual(adaptado.categorias, []);
  assert.deepEqual(adaptado.motivaciones, []);
});
