import test from 'node:test';
import assert from 'node:assert/strict';
import { elementosCalendario, elementosEnFecha, elementosEnMes, publicacionesMural, periodoFechaAcademica } from '../src/utils/calendario.js';
import { CATEGORIAS_EVENTO } from '../src/constants/categoriasEvento.js';
import { TIPOS_FECHA } from '../src/constants/tiposFecha.js';
import { fechaCalendarioValida, fechaMaximaCalendario, limitesFechasCalendario, validarFechaAcademica, validarFechasEvento } from '../src/utils/validacionCalendario.js';
import { errorProgramacionEvento, fechaMaximaEvento, hoyEnCampus } from '../backend/lib/fechasEvento.js';

const vacaciones = { id_fecha: 1, titulo: 'Vacaciones', tipo_fecha: 'vacaciones', fecha_inicio: '2026-12-20', fecha_fin: '2027-01-06' };
const examen = { id_fecha: 2, titulo: 'Examen', tipo_fecha: 'examen', fecha_inicio: '2027-01-08' };
const evento = { id_noticia: 2, titulo: 'Jornada de clubes', categoria: 'evento', categoria_evento: 'social', fecha_evento: '2027-01-08', hora_evento: '10:00' };

test('la captura exige fechas reales y formato completo sin depender de la zona horaria', () => {
  for (const fecha of ['0001-01-01', '2020-01-01', '2028-02-29', '2000-02-29', '9999-12-31']) assert.equal(fechaCalendarioValida(fecha), true, fecha);
  for (const fecha of ['', null, 20261102, '0000-01-01', '10000-01-01', '2026-2-03', '02/11/2026', '2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-01-00', '2026-11-02T00:00:00Z']) assert.equal(fechaCalendarioValida(fecha), false, String(fecha));
});

test('el formulario detecta campos incompletos y periodos invertidos, incluso al cambiar el inicio', () => {
  const form = { titulo: 'Vacaciones', tipo_fecha: 'vacaciones', fecha_inicio: '2026-12-20', fecha_fin: '2027-01-06' };
  const validar = (datos, periodo = false) => validarFechaAcademica(datos, periodo, { hoy: '2026-11-02' });
  assert.deepEqual(validar(form, true), {});
  assert.ok(validar({ ...form, titulo: '   ' }).titulo);
  assert.ok(validar({ ...form, tipo_fecha: 'otro' }).tipo_fecha);
  assert.ok(validar({ ...form, fecha_inicio: '' }, true).fecha_inicio);
  assert.ok(validar({ ...form, fecha_fin: '' }, true).fecha_fin);
  assert.ok(validar({ ...form, fecha_inicio: '2027-02-29' }, true).fecha_inicio);
  assert.ok(validar({ ...form, fecha_fin: '2027-02-29' }, true).fecha_fin);
  assert.match(validar({ ...form, fecha_inicio: '2027-01-07' }, true).fecha_fin, /posterior/);
  assert.deepEqual(validar({ ...form, fecha_fin: form.fecha_inicio }, true), {});
  // Una fecha sencilla ignora el fin anterior al desmarcar "Es un periodo".
  assert.deepEqual(validar({ ...form, fecha_fin: '2020-01-01' }, false), {});
  assert.match(validar({ ...form, fecha_inicio: '2020-01-01', fecha_fin: '' }, false).fecha_inicio, /anterior a hoy/);
});

test('calendario y eventos aplican el mismo rango inclusivo de hoy a dos años', () => {
  const hoy = '2026-11-02';
  const form = { titulo: 'Actividad', tipo_fecha: 'academico' };
  for (const [fecha, permitida] of [['2026-11-01', false], [hoy, true], ['2028-02-29', true], ['2028-11-02', true], ['2028-11-03', false], ['2099-01-01', false], ['9999-12-31', false]]) {
    assert.equal(!validarFechaAcademica({ ...form, fecha_inicio: fecha }, false, { hoy }).fecha_inicio, permitida, fecha);
    assert.equal(!validarFechasEvento({ fecha_evento: fecha }, { hoy }).fecha_evento, permitida, fecha);
    assert.equal(!errorProgramacionEvento(fecha, null, { hoy }), permitida, fecha);
  }
  for (const fin of ['2028-11-03', '9999-12-31']) {
    assert.ok(validarFechaAcademica({ ...form, fecha_inicio: hoy, fecha_fin: fin }, true, { hoy }).fecha_fin);
    assert.ok(validarFechasEvento({ fecha_evento: hoy, fecha_fin_evento: fin }, { hoy }).fecha_fin_evento);
    assert.match(errorProgramacionEvento(hoy, fin, { hoy }), /dos años/);
  }
  assert.deepEqual(limitesFechasCalendario(undefined, hoy), { min: hoy, max: '2028-11-02' });
});

test('conservar fechas existentes permite corregir un registro; reprogramarlo exige fechas permitidas', () => {
  const hoy = '2026-11-02';
  for (const [inicio, fin] of [['2020-01-01', '2020-01-05'], ['2099-01-01', '2099-01-05']]) {
    const original = { titulo: 'Registro anterior', tipo_fecha: 'academico', fecha_inicio: inicio, fecha_fin: fin };
    assert.deepEqual(validarFechaAcademica(original, true, { hoy, original }), {});
    const eventoOriginal = { fecha_evento: inicio, fecha_fin_evento: fin };
    assert.deepEqual(validarFechasEvento(eventoOriginal, { hoy, original: eventoOriginal }), {});
    assert.equal(errorProgramacionEvento(inicio, fin, { hoy, inicioOriginal: inicio, finOriginal: fin }), null);
    assert.ok(validarFechaAcademica({ ...original, fecha_inicio: '2020-01-02' }, true, { hoy, original }).fecha_inicio);
    assert.ok(errorProgramacionEvento('2020-01-02', fin, { hoy, inicioOriginal: inicio, finOriginal: fin }));
    assert.ok(validarFechaAcademica({ ...original, fecha_inicio: '2099-01-02' }, true, { hoy, original }).fecha_inicio);
  }
});

test('el límite se ajusta al 29 de febrero y hoy corresponde al campus antes de medianoche UTC', () => {
  for (const [hoy, maxima] of [['2024-02-29', '2026-02-28'], ['2026-11-02', '2028-11-02'], ['2027-12-31', '2029-12-31']]) {
    assert.equal(fechaMaximaCalendario(hoy), maxima);
    assert.equal(fechaMaximaEvento(hoy), maxima);
  }
  assert.equal(hoyEnCampus(new Date('2026-11-03T05:59:59Z')), '2026-11-02');
  assert.equal(hoyEnCampus(new Date('2026-11-03T06:00:00Z')), '2026-11-03');
});

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
