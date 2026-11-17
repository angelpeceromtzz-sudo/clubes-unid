import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { crearLibroEjecutivo } from '../lib/reporteEjecutivoExcel.js';

const datos = {
  filtros: {}, nombresFiltros: {}, totalAlumnos: 100, alumnosInscritos: 25, totalClubes: 2,
  ocupacion: { cupo_total: 50, ocupado_total: 20 },
  asistencia: [{ nombre_club: 'Robótica', presentes: 6, ausentes: 2, justificadas: 4, total: 12 }],
  clubes: [{ nombre_club: 'Robótica', cupo_maximo: 20, cupo_ocupado: 5 }],
  encuestas: [{ titulo: 'Intereses', estado: 'activa', total_respuestas: 8 }],
  porLicenciatura: [{ nombre: 'Ingeniería', respuestas: 6 }], sinLicenciatura: 2,
  postulaciones: [{ status: 'En revisión', total: 4 }],
  evolucionPostulaciones: [{ mes: '2026-11', total: 4 }], evolucionInscripciones: [{ mes: '2026-10', total: 2 }],
};

function guardarYAbrir(entrada) {
  const original = crearLibroEjecutivo(entrada);
  return XLSX.read(XLSX.write(original, { type: 'buffer', bookType: 'xlsx', compression: true }), { type: 'buffer', cellStyles: true, cellNF: true });
}

test('Excel conserva porcentajes numéricos, formatos, columnas y autofiltros al guardar', () => {
  const libro = guardarYAbrir(datos);
  assert.equal(libro.SheetNames[0], 'KPIs');
  assert.equal(libro.Sheets.KPIs.B7.v, 0.25);
  assert.equal(libro.Sheets.KPIs.B7.z, '0.0%');
  assert.equal(libro.Sheets.KPIs.B9.v, 0.4);
  assert.equal(libro.Sheets.Asistencia.F5.v, 0.75, 'Las justificadas no forman parte del denominador');
  assert.equal(libro.Sheets.Clubes.E5.v, 0.25);
  assert.equal(libro.Sheets.Clubes['!autofilter'].ref, 'A4:E5');
  assert.ok(libro.Sheets.Clubes['!cols'][0].wch >= 18);
  assert.equal(libro.Sheets.Encuestas.A4.v, 'Encuesta');
  assert.equal(libro.Sheets['Encuestas por licenciatura'].A6.v, 'Sin licenciatura');
  assert.deepEqual(XLSX.utils.sheet_to_json(libro.Sheets['Evolución mensual'], { header: 1 }).slice(4), [['2026-10', 0, 2], ['2026-11', 4, 0]]);
});

test('sin datos, Excel conserva los encabezados y no convierte falta de base en 0%', () => {
  const vacios = { ...datos, totalAlumnos: 0, ocupacion: { cupo_total: 0, ocupado_total: 0 } };
  for (const campo of ['asistencia', 'clubes', 'encuestas', 'porLicenciatura', 'postulaciones', 'evolucionPostulaciones', 'evolucionInscripciones']) vacios[campo] = [];
  vacios.sinLicenciatura = 0;
  const libro = guardarYAbrir(vacios);
  assert.equal(libro.Sheets.KPIs.B7.v, 'Sin base de cálculo');
  for (const nombre of libro.SheetNames) assert.ok(libro.Sheets[nombre].A4?.v, `Encabezado de ${nombre}`);
  assert.equal(libro.Sheets.Clubes.A5.v, 'Sin registros para los filtros seleccionados.');
});

test('los nombres de los filtros son legibles y los nombres con fórmulas permanecen como texto', () => {
  const nombre = '=HYPERLINK("https://example.com")';
  const libro = guardarYAbrir({ ...datos, nombresFiltros: { club: 'Ajedrez', periodo: 'Otoño', licenciatura: 'Derecho' }, clubes: [{ nombre_club: nombre, cupo_maximo: 0, cupo_ocupado: 3 }] });
  assert.equal(libro.Sheets.Alcance.B7.v, 'Ajedrez');
  assert.equal(libro.Sheets.Alcance.B8.v, 'Otoño');
  assert.equal(libro.Sheets.Clubes.A5.v, nombre);
  assert.equal(libro.Sheets.Clubes.A5.t, 's');
  assert.equal(libro.Sheets.Clubes.A5.f, undefined);
  assert.equal(libro.Sheets.Clubes.D5.v, 0);
  assert.equal(libro.Sheets.Clubes.E5.v, 'Sin base de cálculo');
});
