import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPresentacion } from '../lib/asistentePresentacion.js';
import { respuestaComparacion, usarContextoPrevio } from '../lib/asistenteSeguimiento.js';

test('liga el club concreto y conserva su identificador para seguimiento', () => {
  const club = { id_club: 7, nombre_club: 'Club de Ajedrez', estado_publicacion: 'publicada', estatus: 'activo' };
  const resultado = crearPresentacion({ tipo: 'clubes', rows: [club], datos: { club, membresias: [{ estatus: 'activo', total: 12 }] }, pregunta: '¿Cuántos miembros tiene?', rol: 3 });
  assert.deepEqual(resultado.contexto, { tipo: 'clubes', id: 7, nombre: 'Club de Ajedrez' });
  assert.equal(resultado.visualizacion.valor, 12);
  assert.equal(resultado.fuentes[0].url, '/campus/campeche/portal/club/7');
  assert.ok(resultado.fuentes[0].consultadoEn);
});

test('ordena la comparación según la pregunta y apunta al panel si el club no es público', () => {
  const rows = [
    { id_club: 1, nombre_club: 'Club A', miembros_activos: 10, estado_publicacion: 'publicada', estatus: 'activo' },
    { id_club: 2, nombre_club: 'Club B', miembros_activos: 2, estado_publicacion: 'archivada', estatus: 'inactivo' },
  ];
  const resultado = crearPresentacion({ tipo: 'clubes_estadisticas', rows, pregunta: '¿Qué club tiene menos miembros?', rol: 4 });
  assert.equal(resultado.visualizacion.elementos[0].nombre, 'Club B');
  assert.equal(resultado.contexto.id, 2);
  assert.equal(resultado.fuentes[0].url, '/rectoria/panel?seccion=clubes');
});

test('expone un conteo agregado sin contexto de persona', () => {
  const resultado = crearPresentacion({ tipo: 'alumnos_total', rows: [{ total_alumnos: 42 }], rol: 3 });
  assert.equal(resultado.visualizacion.valor, 42);
  assert.equal(resultado.contexto, null);
  assert.equal(resultado.fuentes[0].url, '/admin/panel?seccion=usuarios');
});

test('las fuentes de coordinación abren su panel y el expediente de un alumno', () => {
  const usuario = { id_usuario: 15, nombre_completo: 'Ana López', id_rol: 1 };
  const resultado = crearPresentacion({ tipo: 'usuarios', rows: [usuario], rol: 7 });
  assert.equal(resultado.fuentes[0].url, '/campus/campeche/coordinacion/panel?seccion=expediente&usuario=15');
});

test('el seguimiento usa el identificador anterior salvo que se nombre otra entidad', () => {
  const contexto = { tipo: 'clubes', id: 7, nombre: 'Club de Ajedrez' };
  assert.equal(usarContextoPrevio('¿Y cuántos tiene?', contexto, { tipo: 'clubes', busqueda: '', usar_contexto: false }), true);
  assert.equal(usarContextoPrevio('¿Cuántos miembros tiene?', contexto, { tipo: 'clubes', busqueda: '', usar_contexto: false }), true);
  assert.equal(usarContextoPrevio('¿Y el Club de Boxeo?', contexto, { tipo: 'clubes', busqueda: 'Club de Boxeo', usar_contexto: true }), false);
});

test('la comparación textual coincide con el ranking de miembros', () => {
  const rows = [{ nombre_club: 'Ajedrez', miembros_activos: 12 }, { nombre_club: 'Boxeo', miembros_activos: 4 }];
  assert.match(respuestaComparacion('clubes_estadisticas', rows, '¿Qué club tiene más miembros?'), /Ajedrez \(12 miembros activos\)/);
  assert.match(respuestaComparacion('clubes_estadisticas', rows, '¿Cuál tiene menos miembros?'), /Boxeo \(4 miembros activos\)/);
});

test('el ranking de actividades respeta la pregunta de menor asistencia', () => {
  const rows = [
    { id_club: 1, nombre_club: 'Taller A', asistencias: 20, registros_confirmados: 30, ediciones: 2, estado_publicacion: 'publicada', slug: 'taller-a' },
    { id_club: 2, nombre_club: 'Taller B', asistencias: 3, registros_confirmados: 4, ediciones: 1, estado_publicacion: 'publicada', slug: 'taller-b' },
  ];
  const pregunta = '¿Qué actividad tiene menos asistencias?';
  const presentacion = crearPresentacion({ tipo: 'actividades_estadisticas', rows, pregunta, rol: 3 });
  assert.equal(presentacion.visualizacion.elementos[0].nombre, 'Taller B');
  assert.match(respuestaComparacion('actividades_estadisticas', rows, pregunta), /Taller B \(3 asistencias\)/);
});
