import test from 'node:test';
import assert from 'node:assert/strict';
import { camposMisiones, configuracionMisionesInicial, normalizarEdicionActividad, validarRespuestasActividad, validarPublicacionEdicion, cotizarPedidoMisiones, validarContactoInvitado, TIPOS_SANGRE } from '../shared/actividades.js';
import { extraerAccesoMisiones, guardarAccesoMisiones, leerAccesoMisiones, enlacePrivadoMisiones } from '../src/utils/accesoMisiones.js';
import { FORMATO_MEGAMISIONES, esFormatoMegamisiones, adoptarFormatoMegamisiones, normalizarConfiguracionMisiones, validarTelefonoMisiones } from '../shared/actividades.js';
import { gruposPreguntasMisiones } from '../src/constants/preguntasMisiones.js';

const config = configuracionMisionesInicial(null);
const campos = () => camposMisiones().map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['CH', 'M', 'G'] } : campo);
const edicion = () => ({ nombre: 'Misiones QA', lugar: 'Lugar QA', fecha_inicio: '2026-12-05', inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-04', configuracion_misiones: config, campos_registro: campos() });
const id = 'de24b149-c9ed-4d15-8857-211326bcd124';
const producto = { id_producto: id, nombre: 'Sudadera', precio_centavos: 35050, requiere_talla: true, tallas: ['M', 'G'], activo: true };

test('Misiones v2 conserva únicamente los ocho tipos de sangre y permite configurar obligatoriedad', () => {
  const normalizada = normalizarEdicionActividad(edicion(), 'misiones');
  assert.deepEqual(normalizada.campos_registro.find((campo) => campo.clave === 'tipo_sangre').opciones, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
  assert.equal(normalizada.campos_registro.find((campo) => campo.clave === 'edad').obligatorio, false);
  for (const tipo of TIPOS_SANGRE) assert.equal(validarRespuestasActividad(normalizada.campos_registro, { talla: 'M', tipo_sangre: tipo }).tipo_sangre, tipo);
  assert.throws(() => validarRespuestasActividad(normalizada.campos_registro, { talla: 'M', tipo_sangre: 'No lo sé' }));
  assert.throws(() => normalizarEdicionActividad({ ...edicion(), campos_registro: campos().map((campo) => campo.clave === 'tipo_sangre' ? { ...campo, opciones: [...campo.opciones, 'No lo sé'] } : campo) }, 'misiones'));
  assert.throws(() => normalizarEdicionActividad({ ...edicion(), campos_registro: campos().map((campo) => campo.clave === 'talla' ? { ...campo, obligatorio: false } : campo) }, 'misiones'));
});

test('las condiciones exigen detalles afirmativos y descartan respuestas ocultas', () => {
  const schema = normalizarEdicionActividad(edicion(), 'misiones').campos_registro;
  for (const respuestas of [{ talla: 'M', alergias: 'Sí' }, { talla: 'M', religion: 'Otra' }, { talla: 'M', grupo_juvenil: 'Otro' }, { talla: 'M', participacion_previa: 'Sí', participaciones_veces: 0 }]) assert.throws(() => validarRespuestasActividad(schema, respuestas));
  const resultado = validarRespuestasActividad(schema, { talla: 'M', alergias: 'No', alergias_detalle: 'Respuesta anterior', participacion_previa: 'Sí', participaciones_veces: '2', experiencia_misiones: 'Servicio en comunidad', religion: 'Otra', religion_otro: 'Descripción', grupo_juvenil: 'No pertenezco', grupo_juvenil_otro: 'Ya no pertenece', rol_mision: 'Responsable', id_rol: 3 });
  assert.equal(resultado.participaciones_veces, 2);
  assert.equal(resultado.alergias_detalle, undefined);
  assert.equal(resultado.grupo_juvenil_otro, undefined);
  assert.equal(resultado.id_rol, undefined);
  assert.equal(resultado.rol_mision, 'Responsable');
  assert.throws(() => validarRespuestasActividad(schema, { talla: 'M', conocimientos_misiones: 'a'.repeat(2001) }));
});

test('un PDF exigido y una prenda disponible necesitan su configuración antes de publicar', () => {
  const datos = normalizarEdicionActividad(edicion(), 'misiones');
  assert.doesNotThrow(() => validarPublicacionEdicion(datos));
  assert.throws(() => validarPublicacionEdicion({ ...datos, configuracion_misiones: { ...config, codigo_obligatorio: true } }), /PDF/);
  assert.throws(() => validarPublicacionEdicion({ ...datos, configuracion_misiones: { ...config, productos: [{ ...producto, tallas: [] }] } }), /tallas/);
});

test('los pedidos calculan centavos, exigen talla y conservan la cotización original si no cambian', () => {
  const seleccion = [{ id_producto: id, cantidad: 2, talla: 'M', precio_centavos: 1 }];
  const pedido = cotizarPedidoMisiones([producto], seleccion);
  assert.equal(pedido.total_centavos, 70100);
  assert.equal(pedido.lineas[0].precio_centavos, 35050);
  assert.deepEqual(cotizarPedidoMisiones([{ ...producto, activo: false, precio_centavos: 99999 }], seleccion, pedido), pedido);
  assert.equal(cotizarPedidoMisiones([{ ...producto, precio_centavos: 40000 }], [{ ...seleccion[0], cantidad: 3 }], pedido).total_centavos, 120000);
  for (const invalida of [[{ id_producto: id, cantidad: 1, talla: '' }], [{ id_producto: id, cantidad: true, talla: 'M' }], [{ id_producto: id, cantidad: 1.5, talla: 'M' }], [...seleccion, ...seleccion]]) assert.throws(() => cotizarPedidoMisiones([producto], invalida));
  assert.deepEqual(cotizarPedidoMisiones([], []), { moneda: 'MXN', lineas: [], total_centavos: 0 });
});

test('el invitado proporciona contacto y su enlace privado no admite otro origen', () => {
  assert.deepEqual(validarContactoInvitado({ nombre_completo: ' Invitado QA ', correo: ' QA@Example.Test ', telefono: '+52 981 123 4567' }), { nombre_completo: 'Invitado QA', correo: 'qa@example.test', telefono: '+52 981 123 4567' });
  for (const cambio of [{ correo: 'invalido' }, { telefono: true }, { nombre_completo: '' }]) assert.throws(() => validarContactoInvitado({ nombre_completo: 'QA', correo: 'qa@example.test', telefono: '9811234567', ...cambio }));
  const acceso = { folio: id, token: 'a'.repeat(43) };
  const enlace = enlacePrivadoMisiones(acceso, 'https://clubs.example.test');
  assert.deepEqual(extraerAccesoMisiones(enlace, 'https://clubs.example.test'), acceso);
  assert.equal(extraerAccesoMisiones(enlace, 'https://otro.example.test'), null);
  const memoria = new Map();
  const storage = { getItem: (clave) => memoria.get(clave), setItem: (clave, valor) => memoria.set(clave, valor) };
  guardarAccesoMisiones(acceso, 7, storage);
  assert.deepEqual(leerAccesoMisiones('edicion_7', storage), acceso);
  assert.deepEqual(leerAccesoMisiones(id, storage), acceso);
  assert.equal(memoria.size, 2);
});

test('el correo del invitado conserva normalización, subdominios y límite de longitud', () => {
  const contacto = { nombre_completo: 'Invitado QA', telefono: '9811234567' };
  for (const correo of ['QA+Misiones@Sub.Example.Test', 'a'.repeat(241) + '@example.test']) {
    assert.equal(validarContactoInvitado({ ...contacto, correo: ' ' + correo + ' ' }).correo, correo.toLowerCase());
  }
  assert.throws(() => validarContactoInvitado({ ...contacto, correo: 'a'.repeat(242) + '@example.test' }), { status: 400 });
});

test('el correo del invitado rechaza separadores inválidos, espacios y entradas repetitivas', () => {
  const contacto = { nombre_completo: 'Invitado QA', telefono: '9811234567' };
  for (const correo of [
    'sin-arroba.example.test', '@example.test', 'qa@', 'qa@@example.test', 'qa@example@test.test',
    'qa@example', 'qa@.test', 'qa@example.', 'qa @example.test', 'qa@exam ple.test',
    'qa@example.test\ntexto', 'qa@exam\u00a0ple.test',
    'qa@' + '!.'.repeat(120) + '!\nx', 'qa@' + '!.'.repeat(100000) + '!\nx',
  ]) assert.throws(() => validarContactoInvitado({ ...contacto, correo }), { status: 400 }, correo.slice(0, 60));
});

const configuracionMega = () => configuracionMisionesInicial();
const camposMega = () => normalizarEdicionActividad({ ...edicion(), configuracion_misiones: configuracionMega(), campos_registro: camposMisiones(configuracionMega()) }, 'misiones').campos_registro;
const respuestasMega = () => ({
  fecha_nacimiento: '2004-02-29', sexo: 'Mujer', rol_mision: 'Misionero', campus: 'Campeche',
  familia_unid: 'Estudiante de Licenciatura', cuatrimestre: '3° cuatrimestre', tipo_sangre: 'O+',
  alergias_medicamentos: 'Ninguna', alergias_alimentos: 'Ninguna', enfermedades: 'Ninguna',
  tutor_nombre: 'Contacto QA', tutor_telefono: '+52 981 123 4567', talla: 'Mediana', religion: 'Ninguna',
  grupo_juvenil: 'No pertenezco', conocimientos_misiones: 'Quiero participar en el servicio a la comunidad.', participacion_previa: 'Nunca',
});

test('MEGAMISIONES es el formato inicial y tiene cinco secciones sin alterar la plantilla anterior', () => {
  assert.equal(configuracionMega().formato, FORMATO_MEGAMISIONES);
  assert.equal(configuracionMega().version, 2);
  assert.equal(esFormatoMegamisiones(config), false);
  assert.equal(camposMisiones(config).find((campo) => campo.clave === 'edad').tipo, 'numero');
  assert.equal(camposMega().some((campo) => campo.clave === 'edad'), false);
  assert.equal(camposMega().find((campo) => campo.clave === 'fecha_nacimiento').tipo, 'fecha');
  assert.equal(camposMega().length, 21);
  assert.equal(gruposPreguntasMisiones(configuracionMega()).length, 5);
  assert.equal(gruposPreguntasMisiones(config).length, 4);
  const guardadas = validarRespuestasActividad(camposMega(), respuestasMega(), '2026-11-19');
  assert.equal(guardadas.tutor_telefono, '529811234567');
  assert.equal(guardadas.fecha_nacimiento, '2004-02-29');
});

test('MEGAMISIONES conserva sus preguntas y opciones obligatorias en cliente y servidor', () => {
  for (const clave of ['fecha_nacimiento', 'sexo', 'familia_unid', 'alergias_medicamentos', 'tutor_telefono', 'talla']) {
    const sinRespuesta = respuestasMega();
    delete sinRespuesta[clave];
    assert.throws(() => validarRespuestasActividad(camposMega(), sinRespuesta, '2026-11-19'), { status: 400 });
    assert.throws(() => normalizarEdicionActividad({ ...edicion(), configuracion_misiones: configuracionMega(), campos_registro: camposMisiones(configuracionMega()).map((campo) => campo.clave === clave ? { ...campo, obligatorio: false } : campo) }, 'misiones'), { status: 400 });
  }
  assert.throws(() => normalizarConfiguracionMisiones({ ...configuracionMega(), formato: 'desconocido' }), { status: 400 });
  assert.throws(() => validarRespuestasActividad(camposMega(), { ...respuestasMega(), campus: 'Inventado' }, '2026-11-19'), { status: 400 });
  assert.throws(() => validarRespuestasActividad(camposMega(), { ...respuestasMega(), rol_mision: 'Administrador' }, '2026-11-19'), { status: 400 });
});

test('el nacimiento valida calendario, años bisiestos y fecha del campus sin aceptar fechas futuras', () => {
  const campos = camposMega();
  for (const fecha_nacimiento of ['2005-02-29', '2026-11-20', '2004-02-29T12:00:00Z', '29/02/2004', true]) {
    assert.throws(() => validarRespuestasActividad(campos, { ...respuestasMega(), fecha_nacimiento }, '2026-11-19'), { status: 400 });
  }
  assert.equal(validarRespuestasActividad(campos, { ...respuestasMega(), fecha_nacimiento: '2026-11-19' }, '2026-11-19').fecha_nacimiento, '2026-11-19');
});

test('las condiciones de religión, parroquia y experiencia no conservan respuestas ocultas', () => {
  const campos = camposMega();
  for (const cambios of [{ religion: 'Otra' }, { grupo_juvenil: 'Otro' }, { participacion_previa: 'Sí' }]) {
    assert.throws(() => validarRespuestasActividad(campos, { ...respuestasMega(), ...cambios }, '2026-11-19'), { status: 400 });
  }
  const completa = validarRespuestasActividad(campos, { ...respuestasMega(), religion: 'Otra', religion_otro: 'Otra comunidad', grupo_juvenil: 'Otro', grupo_juvenil_otro: 'Grupo QA', parroquia: 'Comunidad QA', participacion_previa: 'Sí', participaciones_veces: '5 o más ocasiones', id_rol: 3 }, '2026-11-19');
  assert.equal(completa.parroquia, 'Comunidad QA');
  assert.equal(completa.participaciones_veces, '5 o más ocasiones');
  assert.equal(completa.id_rol, undefined);
  const oculta = validarRespuestasActividad(campos, { ...respuestasMega(), religion_otro: 'Anterior', grupo_juvenil_otro: 'Anterior', parroquia: 'Anterior', participaciones_veces: '3 ocasiones' }, '2026-11-19');
  for (const clave of ['religion_otro', 'grupo_juvenil_otro', 'parroquia', 'participaciones_veces']) assert.equal(oculta[clave], undefined);
});

test('el celular y el contacto de emergencia admiten formato legible y se guardan como dígitos', () => {
  assert.equal(validarTelefonoMisiones('+52 (981) 123-4567'), '529811234567');
  for (const telefono of ['', true, 9811234567, '981abc1234', '123', '1'.repeat(16)]) assert.throws(() => validarTelefonoMisiones(telefono), { status: 400 });
  assert.throws(() => validarRespuestasActividad(camposMega(), { ...respuestasMega(), tutor_telefono: 'no válido' }, '2026-11-19'), { status: 400 });
});

test('adoptar MEGAMISIONES prepara un borrador conservando catálogo, PDF y preguntas adicionales', () => {
  const anterior = { estado: 'borrador', configuracion_misiones: { ...config, productos: [producto], codigo_documento: id, codigo_obligatorio: true }, campos_registro: [...campos(), { clave: 'transporte', etiqueta: 'Transporte', tipo: 'texto', obligatorio: false, opciones: [] }] };
  const copia = structuredClone(anterior);
  const adaptada = adoptarFormatoMegamisiones(anterior);
  assert.deepEqual(anterior, copia, 'preparar no cambia el borrador hasta guardar');
  assert.deepEqual(adaptada.configuracion_misiones.productos, [producto]);
  assert.equal(adaptada.configuracion_misiones.codigo_documento, id);
  assert.equal(adaptada.configuracion_misiones.codigo_obligatorio, true);
  assert.ok(adaptada.campos_registro.some((campo) => campo.clave === 'transporte'));
  assert.ok(adaptada.campos_registro.some((campo) => campo.clave === 'fecha_nacimiento'));
  for (const estado of ['pendiente', 'publicada', 'rechazada', 'archivada']) assert.throws(() => adoptarFormatoMegamisiones({ ...anterior, estado }), { status: 409 });
  const antigua = adoptarFormatoMegamisiones({ estado: 'borrador', campos_registro: [] });
  assert.equal(esFormatoMegamisiones(antigua.configuracion_misiones), true);
});

test('un artículo sin precio solo se conserva como borrador no disponible', () => {
  const borrador = { ...producto, activo: false, precio_centavos: null };
  assert.equal(normalizarConfiguracionMisiones({ ...configuracionMega(), productos: [borrador] }).productos[0].precio_centavos, null);
  assert.throws(() => normalizarConfiguracionMisiones({ ...configuracionMega(), productos: [{ ...borrador, activo: true }] }), { status: 400 });
  assert.throws(() => cotizarPedidoMisiones([{ ...borrador, activo: true }], [{ id_producto: id, cantidad: 1, talla: 'M' }]), { status: 409 });
});
