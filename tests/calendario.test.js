import test from 'node:test';
import assert from 'node:assert/strict';
import { elementosCalendario, elementosEnFecha, elementosEnMes, publicacionesMural, periodoFechaAcademica } from '../src/utils/calendario.js';
import { CATEGORIAS_EVENTO } from '../src/constants/categoriasEvento.js';
import { TIPOS_FECHA } from '../src/constants/tiposFecha.js';

const vacaciones = { id_fecha: 1, titulo: 'Vacaciones', tipo_fecha: 'vacaciones', fecha_inicio: '2026-12-20', fecha_fin: '2027-01-06' };
const examen = { id_fecha: 2, titulo: 'Examen', tipo_fecha: 'examen', fecha_inicio: '2027-01-08' };
const evento = { id_noticia: 2, titulo: 'Jornada de clubes', categoria: 'evento', categoria_evento: 'social', fecha_evento: '2027-01-08', hora_evento: '10:00' };

test('incluye los extremos de un periodo académico que cruza mes y año', () => {
  const elementos = elementosCalendario([], [vacaciones, examen]);
  assert.deepEqual(elementosEnMes(elementos, new Date(2027, 0, 1)).map((item) => item.clave), ['fecha-1', 'fecha-2']);
  for (const dia of ['2026-12-20', '2027-01-01', '2027-01-06']) assert.equal(elementosEnFecha(elementos, dia).length, 1);
  for (const dia of ['2026-12-19', '2027-01-07']) assert.equal(elementosEnFecha(elementos, dia).length, 0);
  assert.equal(elementosEnMes(elementos, new Date(2027, 1, 1)).length, 0);
  assert.match(periodoFechaAcademica(vacaciones), /2026.*2027/);
});

test('fechas y eventos conservan identidades, filtros y detalles independientes', () => {
  const elementos = elementosCalendario([evento], [examen]);
  assert.equal(new Set(elementos.map((item) => item.clave)).size, 2);
  assert.equal(elementosEnFecha(elementos, '2027-01-08').length, 2);
  const mes = new Date(2027, 0, 1);
  const fechas = elementosEnMes(elementos, mes, 'fecha:examen');
  const eventos = elementosEnMes(elementos, mes, 'evento:social');
  assert.deepEqual(fechas.map((item) => item.original), [examen]);
  assert.deepEqual(eventos.map((item) => item.original), [evento]);
  assert.equal('categoria_evento' in fechas[0].original, false);
  assert.equal('id_noticia' in fechas[0].original, false);
  assert.deepEqual(CATEGORIAS_EVENTO.map((item) => item.value), ['social', 'deportivo', 'cultural']);
  for (const tipo of ['examen', 'pago', 'vacaciones']) assert.ok(TIPOS_FECHA.some((item) => item.value === tipo));
});

test('ordena los eventos por hora sin mutarlos y admite el 29 de febrero', () => {
  const eventos = ['15:00', '08:00'].map((hora, i) => ({ ...evento, id_noticia: i, fecha_evento: '2028-02-29', hora_evento: hora }));
  const elementos = elementosCalendario(eventos, []);
  assert.equal(elementosEnMes(elementos, new Date(2028, 1, 1)).length, 2);
  assert.deepEqual(elementosEnFecha(elementos, '2028-02-29').map((item) => item.hora), ['08:00', '15:00']);
  assert.equal(eventos[0].hora_evento, '15:00');
});

test('el mural incluye publicaciones seleccionadas; las fechas pertenecen a otro recurso', () => {
  const aviso = { id_noticia: 3, titulo: 'Aviso', categoria: 'informativo', destacada: true, mostrar_en_mural: true };
  const pasado = { ...evento, id_noticia: 4, fecha_evento: '2026-12-01', mostrar_en_mural: true };
  const seleccionado = { ...evento, mostrar_en_mural: true };
  assert.deepEqual(publicacionesMural([evento, pasado, seleccionado, aviso, vacaciones, examen], '2027-01-03').map((item) => item.id_noticia), [3, 2]);
  const periodo = { ...seleccionado, fecha_fin_evento: '2027-01-10' };
  assert.equal(publicacionesMural([periodo], '2027-01-10').length, 1);
  assert.equal(publicacionesMural([periodo], '2027-01-11').length, 0);
});
