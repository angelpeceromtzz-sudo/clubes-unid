import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTOS_NAV_ADMIN, ELEMENTOS_NAV_RECTORIA, ELEMENTOS_NAV_COORDINACION, ELEMENTOS_NAV_ALUMNO, ELEMENTOS_NAV_RESPONSABLE_CLUB, ELEMENTOS_NAV_MURAL } from '../src/constants/navegacion.js';
import { normalizarActividad, normalizarRecursoCatalogo, normalizarEdicionActividad, camposPlantillaActividad, validarPublicacionEdicion, validarRespuestasActividad, validarAportacionesActividad, esDestacadaActividad, estadoRegistroActividad, fechaActividad } from '../shared/actividades.js';

const campos = camposPlantillaActividad('trineo').map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['CH', 'M', 'G'] } : campo);
const edicion = { nombre: 'Edición de prueba', descripcion: '', lugar: 'Campus', fecha_inicio: '2026-12-05', fecha_fin: '2026-12-06', requiere_registro: true, campos_registro: campos, inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04', destacable: true, destacada_desde: '2026-11-20', destacada_hasta: '2026-12-06', estado: 'publicada', inscripciones_habilitadas: true };
const catalogo = [{ id_opcion: 1, nombre: 'Aportación de prueba', unidad: 'piezas', cantidad_minima: 2, activa: true }];

test('Gestión de Clubs y su acceso al catálogo solo aparecen para Admin, Coordinación y Rectoría', () => {
  const menus = new Map([[1, ELEMENTOS_NAV_ALUMNO], [2, ELEMENTOS_NAV_RESPONSABLE_CLUB], [3, ELEMENTOS_NAV_ADMIN], [4, ELEMENTOS_NAV_RECTORIA], [5, ELEMENTOS_NAV_ALUMNO], [6, ELEMENTOS_NAV_MURAL], [7, ELEMENTOS_NAV_COORDINACION]]);
  for (const [rol, menu] of menus) {
    const gestion = menu.find((item) => item.key === 'gestion-clubes');
    assert.equal(Boolean(gestion), [3, 4, 7].includes(rol), 'Menú del rol ' + rol);
    if (gestion) assert.ok(gestion.children.some((item) => item.key === 'clubes'));
    else assert.ok(menu.every((item) => item.key !== 'clubes' && !item.children?.some((hijo) => hijo.key === 'clubes')));
  }
});

test('las actividades generales no heredan requisitos específicos de Trineo', () => {
  const actividad = normalizarActividad({ nombre: 'Taller de arte', descripcion: 'Información del taller', categoria: 'Cultural', estado: 'publicada', plantilla: 'trineo' });
  assert.equal(actividad.slug, 'taller-de-arte');
  assert.equal(actividad.estado, undefined);
  assert.equal(actividad.plantilla, undefined);
  const general = normalizarEdicionActividad({ nombre: 'Taller abierto' });
  assert.equal(general.requiere_registro, false);
  assert.deepEqual(general.campos_registro, []);
  assert.equal(normalizarEdicionActividad({ nombre: 'Informativa', requiere_aportacion: true }).requiere_aportacion, false);
});

test('Trineo y Misiones exigen edad y talla; Trineo fuerza la aportación', () => {
  for (const plantilla of ['trineo', 'misiones']) {
    const datos = normalizarEdicionActividad({ ...edicion, requiere_registro: false, requiere_aportacion: false }, plantilla);
    assert.equal(datos.requiere_registro, true);
    assert.equal(datos.requiere_aportacion, plantilla === 'trineo');
    assert.throws(() => normalizarEdicionActividad({ ...edicion, campos_registro: campos.filter((campo) => campo.clave !== 'talla') }, plantilla), /edad y talla/);
    assert.throws(() => normalizarEdicionActividad({ ...edicion, campos_registro: campos.map((campo) => campo.clave === 'edad' ? { ...campo, obligatorio: false } : campo) }, plantilla));
  }
});

test('el catálogo exige la configuración del club y mantiene libres las actividades generales',()=>{
  const comun={nombre:'Comunidad QA',descripcion:'Información',categoria:'Cultural'};
  assert.equal(normalizarRecursoCatalogo(comun).tipo,'actividad');
  assert.throws(()=>normalizarRecursoCatalogo({...comun,tipo:'otro'}),/Club o Actividad/);
  const club={...comun,tipo:'club',cupo_maximo:20,participacion:'mixta',niveles:[1,2]};
  assert.throws(()=>normalizarRecursoCatalogo({...club,cupo_maximo:7}),/cupo/);
  assert.throws(()=>normalizarRecursoCatalogo({...club,niveles:[]}),/nivel/);
  assert.throws(()=>normalizarRecursoCatalogo({...club,participacion:'otra'}),/participación/);
  assert.deepEqual(normalizarRecursoCatalogo({...club,niveles:[1,'2',1]}).niveles,[1,2]);
  assert.equal('cupo_maximo' in normalizarRecursoCatalogo({...club,tipo:'actividad'}),false);
});

test('no publica Trineo sin catálogo o sin tallas configuradas', () => {
  const datos = normalizarEdicionActividad(edicion, 'trineo');
  assert.throws(() => validarPublicacionEdicion(datos, []), /aportación/);
  assert.doesNotThrow(() => validarPublicacionEdicion(datos, catalogo));
  const sinTallas = normalizarEdicionActividad({ ...edicion, campos_registro: camposPlantillaActividad('trineo') }, 'trineo');
  assert.throws(() => validarPublicacionEdicion(sinTallas, catalogo), /tallas/);
});

test('Oferta es independiente de la ventana del destacado y del periodo de inscripción', () => {
  assert.equal(esDestacadaActividad(edicion, '2026-11-19'), false);
  assert.equal(estadoRegistroActividad(edicion, '2026-11-19'), 'abierta');
  assert.equal(esDestacadaActividad(edicion, '2026-11-20'), true);
  assert.equal(esDestacadaActividad(edicion, '2026-12-06'), true);
  assert.equal(estadoRegistroActividad(edicion, '2026-12-06'), 'cerrada');
  assert.equal(esDestacadaActividad(edicion, '2026-12-07'), false);
  assert.equal(estadoRegistroActividad(edicion, '2026-12-07'), 'finalizada');
  assert.equal(esDestacadaActividad({ ...edicion, estado: 'pendiente' }, '2026-11-20'), false);
  assert.equal(estadoRegistroActividad({ ...edicion, inscripciones_habilitadas: false }, '2026-11-20'), 'cerrada');
});

test('rechaza fechas inexistentes y periodos que exceden el evento', () => {
  for (const invalida of ['2026-02-30', '2026-13-01', '0000-01-01', '2026-1-1', '2026-11-14T00:00:00Z']) assert.throws(() => fechaActividad(invalida));
  assert.throws(() => normalizarEdicionActividad({ ...edicion, inscripcion_hasta: '2026-12-07' }), /inscripciones/);
  assert.throws(() => normalizarEdicionActividad({ ...edicion, destacada_hasta: '2026-12-07' }), /destacado/);
});

test('valida edad, talla y respuestas configuradas sin almacenar claves ajenas', () => {
  assert.deepEqual(validarRespuestasActividad(campos, { edad: '20', talla: 'M', admin: true }), { edad: 20, talla: 'M' });
  for (const respuestas of [{ talla: 'M' }, { edad: 20 }, { edad: 20, talla: 'inventada' }, { edad: true, talla: 'M' }, { edad: 20.5, talla: 'M' }]) assert.throws(() => validarRespuestasActividad(campos, respuestas));
  assert.throws(() => normalizarEdicionActividad({ nombre: 'A', campos_registro: [{ clave: '__proto__', etiqueta: 'No', tipo: 'texto' }] }));
});

test('aportación obligatoria con mínimo, sin opciones repetidas o retiradas', () => {
  for (const seleccion of [[], [{ id_opcion: 1, cantidad: 1 }], [{ id_opcion: 9, cantidad: 2 }], [{ id_opcion: 1, cantidad: 2 }, { id_opcion: 1, cantidad: 2 }]]) assert.throws(() => validarAportacionesActividad(seleccion, catalogo, true));
  assert.equal(validarAportacionesActividad([{ id_opcion: 1, cantidad: 2 }], catalogo, true)[0].cantidad, 2);
  assert.deepEqual(validarAportacionesActividad([], catalogo, false), []);
});

test('conserva mínimos históricos y la cantidad de aportaciones ya recibidas', () => {
  const anterior = { id_opcion: 1, nombre: 'Compromiso original', unidad: 'piezas', cantidad_minima: 1, cantidad: 1, estado: 'recibida' };
  const resultado = validarAportacionesActividad([{ id_opcion: 1, cantidad: 1 }], catalogo, true, [anterior]);
  assert.equal(resultado[0].cantidad_minima, 1);
  assert.equal(resultado[0].nombre, 'Compromiso original');
  assert.throws(() => validarAportacionesActividad([{ id_opcion: 1, cantidad: 2 }], catalogo, true, [anterior]), /recibida/);
});

test('rechaza estructuras incompletas y cantidades booleanas como errores de validación', () => {
  for (const datos of [null, undefined, [], 'actividad']) {
    assert.throws(() => normalizarActividad(datos), { status: 400 });
    assert.throws(() => normalizarEdicionActividad(datos), { status: 400 });
  }
  for (const seleccion of [[null], [false], [{ id_opcion: 1, cantidad: true }]]) assert.throws(() => validarAportacionesActividad(seleccion, catalogo, true), { status: 400 });
});
