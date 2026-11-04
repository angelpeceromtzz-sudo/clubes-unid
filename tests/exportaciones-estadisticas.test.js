import test from 'node:test';
import assert from 'node:assert/strict';
import { crearReportePDF, describirFiltros, nombreArchivoReporte, TITULOS_REPORTE } from '../src/components/ejecutivo/exportaciones.utils.js';
import { generarPDF } from '../src/components/ejecutivo/exportarPDF.js';

const datos = {
  filtros: { id_club: '1', id_periodo: '2', carrera: '3', estado: 'Pendiente' },
  clubesDetalle: [
    { id_club: 1, nombre_club: 'Robótica & diseño', estatus: 'activo', cupo_maximo: 20, cupo_ocupado: 5 },
    { id_club: 2, nombre_club: 'Teatro', estatus: 'activo', cupo_maximo: 30, cupo_ocupado: 15 },
  ],
  periodos: [{ id_periodo: 2, nombre: 'Otoño 2026' }],
  licenciaturas: [{ id_licenciatura: 3, nombre: 'Ingeniería' }],
  stats: { totalAlumnos: 100, alumnosInscritos: 5 },
  asistencia: { global: { presentes: 6, ausentes: 2, justificadas: 3 }, por_club: [{ nombre_club: 'Robótica & diseño', presentes: 6, ausentes: 2, justificadas: 3 }] },
  encuestas: { total_respuestas: 8, sin_licenciatura: 0, por_licenciatura: [{ nombre: 'Ingeniería', respuestas: 8 }] },
};

test('los nombres de archivo usan la fecha de México cerca del cambio de día UTC', () => {
  assert.equal(nombreArchivoReporte('pdf', 'clubes', new Date('2026-11-04T02:00:00Z')), 'clubs-unid_estadisticas_clubes_2026-11-03.pdf');
});

test('el PDF identifica sólo los filtros de la sección exportada y usa sus nombres', () => {
  assert.deepEqual(describirFiltros(datos, 'asistencia'), ['Club: Robótica & diseño', 'Periodo: Otoño 2026']);
  assert.deepEqual(describirFiltros(datos, 'encuestas'), ['Licenciatura: Ingeniería']);
  const resumen = crearReportePDF(datos, 'resumen');
  assert.equal(resumen.indicadores.find(([nombre]) => nombre === 'Ocupación global')[1], '40.0%');
  assert.equal(resumen.indicadores.find(([nombre]) => nombre === 'Asistencia')[1], '75.0%');
  assert.deepEqual(crearReportePDF(datos, 'clubes').tablas[0].filas.map((fila) => fila[0]), ['Robótica & diseño']);
});

test('sin registros se distinguen porcentajes sin base y conteos en cero en todas las pestañas', () => {
  for (const tab of Object.keys(TITULOS_REPORTE)) {
    const reporte = crearReportePDF({ filtros: {} }, tab);
    assert.ok(reporte.tablas.length > 0);
    const pdf = generarPDF(reporte);
    assert.ok(pdf.output('arraybuffer').byteLength > 1000);
    assert.ok(pdf.getNumberOfPages() >= 1);
  }
  assert.equal(crearReportePDF({ filtros: {} }, 'asistencia').indicadores[0][1], 'Sin base');
});

test('el detalle completo se exporta aunque la pantalla limite la cantidad de clubes visibles', () => {
  const clubesDetalle = Array.from({ length: 100 }, (_, indice) => ({ id_club: indice + 1, nombre_club: `Club de prueba ${indice + 1}`, estatus: 'activo', cupo_maximo: 50, cupo_ocupado: indice }));
  const reporte = crearReportePDF({ ...datos, filtros: {}, clubesDetalle }, 'clubes');
  assert.equal(reporte.tablas[0].filas.length, 100);
  assert.equal(reporte.tablas[0].filas.at(-1)[0], 'Club de prueba 100');
  assert.ok(generarPDF(reporte).getNumberOfPages() > 3);
});

test('el PDF incluye la pregunta seleccionada y permite textos que ocupan varias páginas', () => {
  const largo = 'Una respuesta extensa con acentos: participación y tecnología. '.repeat(500);
  const reporte = crearReportePDF({ ...datos, encuestaSeleccionada: '4', preguntaSeleccionada: '5', listaEncuestas: [{ id_encuesta: 4, titulo: 'Intereses' }], resultadosEncuesta: { preguntas: [{ id_pregunta: 5, tipo: 'texto_largo', texto: '¿Qué mejorarías?', textos: [{ texto: largo }, { texto: 'FIN DEL DETALLE' }] }] } }, 'encuestas');
  assert.equal(reporte.tablas[1].filas[0][0], largo);
  assert.equal(reporte.tablas[1].filas.at(-1)[0], 'FIN DEL DETALLE');
  assert.ok(generarPDF(reporte).getNumberOfPages() > 3);
});

test('la evolución conserva meses con sólo postulaciones o sólo inscripciones y los ordena', () => {
  const reporte = crearReportePDF({ ...datos, dashboardData: { postulacionesPorMes: [{ clave: '2026-11', total: 4 }], inscripcionesPorMes: [{ clave: '2026-10', total: 2 }] } }, 'postulaciones');
  assert.deepEqual(reporte.tablas[0].filas, [['2026-10', '0', '2'], ['2026-11', '4', '0']]);
});

test('el PDF identifica las muestras abiertas y conserva la base de preguntas múltiples y de escala', () => {
  const preparar = (pregunta) => crearReportePDF({ ...datos, preguntaSeleccionada: '1', resultadosEncuesta: { preguntas: [{ id_pregunta: 1, texto: 'Preferencias', ...pregunta }] } }, 'encuestas');
  const muestra = preparar({ tipo: 'texto_largo', total_textos: 500, textos: [{ texto: 'Respuesta de la muestra' }] });
  assert.equal(muestra.tablas[1].descripcion, 'Muestra disponible: 1 de 500 respuestas abiertas.');
  const multiple = preparar({ tipo: 'opcion_multiple', respondientes: 10, opciones: [{ texto: 'Deporte', conteo: 8, porcentaje: 80 }, { texto: 'Cultura', conteo: 7, porcentaje: 70 }] });
  assert.match(multiple.tablas[1].descripcion, /10 respondientes/);
  assert.deepEqual(multiple.tablas[1].filas.map((fila) => fila[2]), ['80.0%', '70.0%']);
  assert.equal(multiple.graficas[1].filas.length, 2);
  const escala = preparar({ tipo: 'escala', respuestas: 4, promedio: 3.5, distribucion: [{ valor: 3, conteo: 2, porcentaje: 50 }, { valor: 4, conteo: 2, porcentaje: 50 }] });
  assert.deepEqual(escala.indicadores.at(-1), ['Promedio de escala', '3.5']);
  assert.deepEqual(escala.tablas[1].filas[0], ['3', '2', '50.0%']);
});
