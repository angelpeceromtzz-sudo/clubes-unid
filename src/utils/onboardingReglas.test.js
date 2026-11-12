import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actividadesDeCategorias,
  alternarCategoria,
  alternarElemento,
  construirPayload,
  correoInicial,
  errorPropuesta,
  pasoEsValido,
  respuestasIniciales,
  TIPOS_CORREO,
} from './onboardingReglas.js';

const actividades = [
  { id: 10, id_categoria: 1, nombre: 'Fútbol' },
  { id: 11, id_categoria: 1, nombre: 'Voleibol' },
  { id: 40, id_categoria: 4, nombre: 'Programación' },
];

test('la propuesta válida no genera error y la inválida explica el motivo', () => {
  assert.equal(errorPropuesta('Club de robótica'), null);
  assert.equal(errorPropuesta(''), null);
  assert.match(errorPropuesta('ab'), /entre 3 y 80/);
  assert.match(errorPropuesta('a'.repeat(81)), /entre 3 y 80/);
  assert.match(errorPropuesta('<b>club</b>'), /no permitidos/);
  assert.match(errorPropuesta('1234'), /no permitidos/);
});

test('alternarElemento agrega y quita sin mutar la lista original', () => {
  const original = [1, 2];
  assert.deepEqual(alternarElemento(original, 3), [1, 2, 3]);
  assert.deepEqual(alternarElemento(original, 1), [2]);
  assert.deepEqual(original, [1, 2]);
});

test('al desmarcar una categoría se quitan sus actividades y se informa cuántas', () => {
  const respuestas = { ...respuestasIniciales(), categorias: [1, 4], actividades: [10, 40] };
  const resultado = alternarCategoria(respuestas, 1, actividades);
  assert.deepEqual(resultado.categorias, [4]);
  assert.deepEqual(resultado.actividades, [40]);
  assert.equal(resultado.quitadas, 1);
});

test('al marcar una categoría no se alteran las actividades', () => {
  const respuestas = { ...respuestasIniciales(), categorias: [4], actividades: [40] };
  const resultado = alternarCategoria(respuestas, 1, actividades);
  assert.deepEqual(resultado.categorias, [4, 1]);
  assert.deepEqual(resultado.actividades, [40]);
  assert.equal(resultado.quitadas, 0);
});

test('actividadesDeCategorias devuelve solo las de las categorías seleccionadas', () => {
  assert.deepEqual(actividadesDeCategorias(actividades, [4]).map((a) => a.nombre), ['Programación']);
  assert.deepEqual(actividadesDeCategorias(actividades, []), []);
});

test('el correo inicia desactivado con todos los tipos apagados', () => {
  const correo = correoInicial();
  assert.equal(correo.activo, false);
  assert.equal(correo.frecuencia, 'inmediata');
  assert.ok(TIPOS_CORREO.every((tipo) => correo.tipos[tipo] === false));
});

test('construirPayload envía los cinco tipos aunque el usuario solo haya tocado uno', () => {
  const respuestas = { ...respuestasIniciales(), correo: { ...correoInicial(), tipos: { eventos: true } } };
  const payload = construirPayload(respuestas, 'onboarding');
  assert.deepEqual(Object.keys(payload.correo.tipos).sort(), [...TIPOS_CORREO].sort());
  assert.equal(payload.correo.tipos.eventos, true);
  assert.equal(payload.correo.tipos.noticias, false);
  assert.equal(payload.correo.activo, false);
});

test('construirPayload conserva las selecciones de correo con el interruptor apagado', () => {
  const respuestas = {
    ...respuestasIniciales(),
    correo: { activo: false, frecuencia: 'semanal', tipos: { ...correoInicial().tipos, mis_clubes: true } },
  };
  const payload = construirPayload(respuestas, 'perfil');
  assert.equal(payload.correo.activo, false);
  assert.equal(payload.correo.frecuencia, 'semanal');
  assert.equal(payload.correo.tipos.mis_clubes, true);
});

test('construirPayload omite la propuesta vacía y limpia la no vacía', () => {
  assert.deepEqual(construirPayload(respuestasIniciales(), 'onboarding').propuestas, []);
  const conTexto = { ...respuestasIniciales(), propuesta: '  Club   de ajedrez ' };
  assert.deepEqual(construirPayload(conTexto, 'onboarding').propuestas, ['Club de ajedrez']);
});

test('construirPayload usa null cuando no se responde el género', () => {
  assert.equal(construirPayload(respuestasIniciales(), 'onboarding').genero, null);
});

describe('pasoEsValido', () => {
  test('paso 1 exige al menos una categoría', () => {
    assert.equal(pasoEsValido(1, respuestasIniciales()), false);
    assert.equal(pasoEsValido(1, { ...respuestasIniciales(), categorias: [1] }), true);
  });

  test('paso 2 acepta actividad o propuesta válida, rechaza vacío', () => {
    const vacio = respuestasIniciales();
    assert.equal(pasoEsValido(2, vacio), false);
    assert.equal(pasoEsValido(2, { ...vacio, actividades: [10] }), true);
    assert.equal(pasoEsValido(2, { ...vacio, propuesta: 'Club de robótica' }), true);
    assert.equal(pasoEsValido(2, { ...vacio, propuesta: 'ab' }), false);
  });

  test('paso 3 exige al menos una motivación', () => {
    assert.equal(pasoEsValido(3, respuestasIniciales()), false);
    assert.equal(pasoEsValido(3, { ...respuestasIniciales(), motivaciones: [1] }), true);
  });

  test('paso 4 exige una selección explícita, incluido prefiero no responder', () => {
    assert.equal(pasoEsValido(4, respuestasIniciales()), false);
    assert.equal(pasoEsValido(4, { ...respuestasIniciales(), genero: 'prefiero_no_responder' }), true);
    assert.equal(pasoEsValido(4, { ...respuestasIniciales(), genero: 'mujer' }), true);
  });

  test('paso 5 exige una decisión explícita sobre los correos', () => {
    const inicial = respuestasIniciales();
    assert.equal(pasoEsValido(5, inicial), false);
    assert.equal(pasoEsValido(5, { ...inicial, correo: { ...inicial.correo, decision: 'aceptar' } }), true);
    assert.equal(pasoEsValido(5, { ...inicial, correo: { ...inicial.correo, decision: 'rechazar' } }), true);
  });
});
