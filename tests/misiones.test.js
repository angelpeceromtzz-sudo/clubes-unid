import test from 'node:test';
import assert from 'node:assert/strict';
import { camposMisiones, configuracionMisionesInicial, normalizarEdicionActividad, validarRespuestasActividad, validarPublicacionEdicion, cotizarPedidoMisiones, validarContactoInvitado, TIPOS_SANGRE } from '../shared/actividades.js';
import { extraerAccesoMisiones, guardarAccesoMisiones, leerAccesoMisiones, enlacePrivadoMisiones } from '../src/utils/accesoMisiones.js';

const config = configuracionMisionesInicial();
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
