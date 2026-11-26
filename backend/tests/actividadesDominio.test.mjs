import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarRecursoCatalogo } from '../lib/actividadesDominio.js';

test('las actividades no reciben el estatus exclusivo de clubes', () => {
  const actividad = normalizarRecursoCatalogo({ nombre: 'Actividad QA', descripcion: 'Prueba', categoria: 'Servicio' });
  assert.equal(actividad.tipo, 'actividad');
  assert.equal(actividad.id_estatus_club, null);
});

test('los clubes asignan explícitamente su estatus inicial', () => {
  const club = normalizarRecursoCatalogo({
    tipo: 'club', nombre: 'Club QA', descripcion: 'Prueba', categoria: 'Cultura',
    cupo_maximo: 20, participacion: 'mixta', niveles: [1],
  });
  assert.equal(club.tipo, 'club');
  assert.equal(club.id_estatus_club, 2);
});
