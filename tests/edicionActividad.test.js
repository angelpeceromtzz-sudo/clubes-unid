import test from 'node:test';
import assert from 'node:assert/strict';
import { camposPlantillaActividad, configuracionMisionesInicial, normalizarEdicionActividad } from '../shared/actividades.js';
import { pendientesEdicion, prepararDatosEdicion, resolverPasoEdicion } from '../src/utils/edicionActividad.js';

function datosMisiones() {
  const config = configuracionMisionesInicial(null);
  return {
    nombre: 'Misiones de prueba', lugar: 'Campus de prueba', ubicacion_maps: 'https://www.google.com/maps/search/?api=1&query=19.83,-90.53', descripcion: 'Información capturada',
    fecha_inicio: '2026-12-05', fecha_fin: '2026-12-06', hora_inicio: '09:00',
    destacable: true, destacada_desde: '2026-11-20', destacada_hasta: '2026-12-06',
    requiere_registro: true, requiere_aportacion: false,
    inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04',
    configuracion_misiones: config,
    campos_registro: camposPlantillaActividad('misiones', config).map((campo) => campo.clave === 'talla' ? { ...campo, textoOpciones: ' CH\nM\nG\n\n' } : campo),
  };
}

test('el recorrido 1 → 2 → 3 → 1 → 3 conserva todos los datos y el máximo alcanzado', () => {
  const datos = datosMisiones();
  const antes = structuredClone(datos);
  let actual = { paso: 0, alcanzado: 0 };
  for (const destino of [1, 2, 0, 2]) {
    const resultado = resolverPasoEdicion(actual, destino, pendientesEdicion(datos, 'misiones'));
    assert.equal(resultado.pendiente, null);
    actual = { paso: resultado.paso, alcanzado: resultado.alcanzado };
  }
  assert.deepEqual(actual, { paso: 2, alcanzado: 2 });
  assert.deepEqual(datos, antes);
  assert.deepEqual(prepararDatosEdicion(datos, 'misiones').campos_registro.find((campo) => campo.clave === 'talla').opciones, ['CH', 'M', 'G']);
});

test('los pasos alcanzados siguen accesibles aunque una corrección deje campos pendientes', () => {
  const datos = { ...datosMisiones(), nombre: '' };
  const pendientes = pendientesEdicion(datos, 'misiones');
  assert.equal(pendientes[0].length, 1);
  assert.deepEqual(resolverPasoEdicion({ paso: 0, alcanzado: 2 }, 2, pendientes), { paso: 2, alcanzado: 2, pendiente: null });
  assert.deepEqual(resolverPasoEdicion({ paso: 2, alcanzado: 2 }, 3, pendientes), { paso: 0, alcanzado: 2, pendiente: 0 });
  datos.nombre = 'Nombre corregido';
  assert.deepEqual(resolverPasoEdicion({ paso: 2, alcanzado: 2 }, 3, pendientesEdicion(datos, 'misiones')), { paso: 3, alcanzado: 3, pendiente: null });
});

test('Revisión final continúa accesible después de editar un apartado anterior', () => {
  const datos = { ...datosMisiones(), lugar: '' };
  const pendientes = pendientesEdicion(datos, 'misiones');
  assert.deepEqual(resolverPasoEdicion({ paso: 0, alcanzado: 3 }, 3, pendientes), { paso: 3, alcanzado: 3, pendiente: null });
  assert.equal(pendientes.findIndex((errores) => errores.length > 0), 0);
});

test('no permite saltar a un paso futuro ni avanzar a uno nuevo sin completar los anteriores', () => {
  const datos = datosMisiones();
  assert.deepEqual(resolverPasoEdicion({ paso: 0, alcanzado: 0 }, 3, pendientesEdicion(datos, 'misiones')), { paso: 0, alcanzado: 0, pendiente: null });
  datos.fecha_inicio = '';
  assert.deepEqual(resolverPasoEdicion({ paso: 1, alcanzado: 1 }, 2, pendientesEdicion(datos, 'misiones')), { paso: 1, alcanzado: 1, pendiente: 1 });
  for (const destino of [-1, 4, 1.5, '2']) assert.deepEqual(resolverPasoEdicion({ paso: 1, alcanzado: 2 }, destino, [[], [], []]), { paso: 1, alcanzado: 2, pendiente: null });
});

test('las fechas, el destacado y las inscripciones identifican el apartado que debe corregirse', () => {
  const datos = datosMisiones();
  assert.deepEqual(pendientesEdicion(datos, 'misiones'), [[], [], []]);
  const fechas = pendientesEdicion({ ...datos, fecha_fin: '2026-12-01', destacada_hasta: '2026-12-07', hora_inicio: '27:00' }, 'misiones');
  assert.equal(fechas[0].length, 0);
  assert.equal(fechas[1].length, 3);
  assert.ok(fechas[2].some((error) => error.includes('inscripciones')));
  const inscripcion = pendientesEdicion({ ...datos, inscripcion_desde: '2026-12-08', inscripcion_hasta: '2026-12-07' }, 'misiones');
  assert.equal(inscripcion[1].length, 0);
  assert.equal(inscripcion[2].length, 2);
});

test('las preguntas, productos y PDF pendientes se señalan en Inscripción y requisitos', () => {
  const datos = datosMisiones();
  datos.campos_registro.find((campo) => campo.clave === 'talla').textoOpciones = '';
  datos.configuracion_misiones = { ...datos.configuracion_misiones, codigo_obligatorio: true, productos: [{ id_producto: '80b16ed0-767b-4ca0-9285-e6aa19534952', nombre: 'Sudadera', activo: true, requiere_talla: true, tallas: [], precio_centavos: 35000 }] };
  const errores = pendientesEdicion(datos, 'misiones');
  assert.deepEqual(errores.slice(0, 2), [[], []]);
  assert.equal(errores[2].length, 3);
  assert.ok(errores[2].some((error) => error.includes('Talla de camisa')));
  assert.ok(errores[2].some((error) => error.includes('PDF')));
  assert.ok(errores[2].some((error) => error.includes('Sudadera')));
});

test('Trineo valida aportaciones nuevas y el catálogo existente sin perder opciones capturadas', () => {
  const datos = { ...datosMisiones(), configuracion_misiones: null, campos_registro: camposPlantillaActividad('trineo').map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['M'] } : campo), requiere_aportacion: true };
  assert.ok(pendientesEdicion(datos, 'trineo')[2].some((error) => error.includes('aportación')));
  const catalogo = [{ nombre: 'Juguete', unidad: 'piezas', cantidad_minima: 2 }];
  const antes = structuredClone(catalogo);
  assert.deepEqual(pendientesEdicion(datos, 'trineo', { catalogo }), [[], [], []]);
  assert.deepEqual(catalogo, antes);
  assert.ok(pendientesEdicion(datos, 'trineo', { existente: true, cargandoCatalogo: true })[2].some((error) => error.includes('cargue')));
  assert.deepEqual(pendientesEdicion(datos, 'trineo', { existente: true, catalogo: [{ ...catalogo[0], activa: true }] }), [[], [], []]);
  const opcional = { ...datos, requiere_aportacion: false };
  assert.equal(prepararDatosEdicion(opcional, 'trineo').requiere_aportacion, false);
  assert.deepEqual(pendientesEdicion(opcional, 'trineo'), [[], [], []]);
  assert.deepEqual(pendientesEdicion(opcional, 'trineo', { catalogo }), [[], [], []]);
  assert.ok(pendientesEdicion(opcional, 'trineo', { catalogo: [{ nombre: '', unidad: '', cantidad_minima: 1 }] })[2].length > 0);
});

test('las actividades informativas y los borradores conservan sus reglas de guardado', () => {
  const datos = { nombre: 'Actividad informativa', descripcion: '', lugar: 'Campus', fecha_inicio: '2026-12-05', requiere_registro: false, requiere_aportacion: false, destacable: false, campos_registro: [] };
  assert.deepEqual(pendientesEdicion(datos, 'general'), [[], [], []]);
  const borrador = { ...datosMisiones(), fecha_inicio: '', fecha_fin: '', inscripcion_desde: '', inscripcion_hasta: '', destacada_desde: '', destacada_hasta: '' };
  assert.ok(pendientesEdicion(borrador, 'misiones')[1].length > 0);
  assert.doesNotThrow(() => normalizarEdicionActividad(prepararDatosEdicion(borrador, 'misiones'), 'misiones'));
});
