import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calcularCambiosConsentimiento,
  indexarCatalogo,
  normalizarPropuesta,
  serializarPreferencias,
  validarPreferencias,
  CORREO_POR_DEFECTO,
} from '../lib/preferencias.js';
import { CORREOS_NO_CONFIGURABLES, TIPOS_CORREO_OPCIONAL } from '../lib/preferenciasCorreo.js';

const catalogo = indexarCatalogo({
  categorias: [
    { id: 1, nombre: 'Deportivos', categoria_club: 'Deportes' },
    { id: 2, nombre: 'Culturales', categoria_club: 'Cultura' },
    { id: 3, nombre: 'Sociales', categoria_club: 'Sociales' },
    { id: 4, nombre: 'Tecnología', categoria_club: 'Tecnología' },
  ],
  actividades: [
    { id: 10, id_categoria: 1, nombre: 'Fútbol' },
    { id: 11, id_categoria: 2, nombre: 'Danza' },
    { id: 40, id_categoria: 4, nombre: 'Programación' },
  ],
  motivaciones: [{ id: 1, codigo: 'amistades' }, { id: 4, codigo: 'talentos' }],
});

const tiposTodosFalse = Object.fromEntries(TIPOS_CORREO_OPCIONAL.map((t) => [t, false]));
const correoInactivo = { activo: false, frecuencia: 'inmediata', tipos: tiposTodosFalse };

function cuerpoValido(sobrescribir = {}) {
  return {
    origen: 'onboarding',
    categorias: [1, 4],
    actividades: [10, 40],
    motivaciones: [1, 4],
    genero: 'prefiero_no_responder',
    correo: correoInactivo,
    propuestas: [],
    ...sobrescribir,
  };
}

describe('normalizarPropuesta', () => {
  test('recorta, colapsa espacios y genera la clave normalizada', () => {
    assert.deepEqual(normalizarPropuesta('  Club   de Robótica '), {
      texto: 'Club de Robótica',
      normalizado: 'club de robotica',
    });
  });

  test('dos escrituras equivalentes producen la misma clave', () => {
    assert.equal(
      normalizarPropuesta('Club de ROBÓTICA').normalizado,
      normalizarPropuesta('club de robotica').normalizado,
    );
  });

  test('rechaza longitudes fuera de rango', () => {
    assert.throws(() => normalizarPropuesta('ab'), /entre 3 y 80/);
    assert.throws(() => normalizarPropuesta('a'.repeat(81)), /entre 3 y 80/);
  });

  test('rechaza caracteres no permitidos, marcado y entradas sin letras', () => {
    assert.throws(() => normalizarPropuesta('<script>alert(1)</script>'), /no permitidos/);
    assert.throws(() => normalizarPropuesta('1234567'), /no permitidos/);
    assert.throws(() => normalizarPropuesta('Club 🎮 de juegos'), /no permitidos/);
  });

  test('rechaza valores que no son texto', () => {
    assert.throws(() => normalizarPropuesta(42), /debe ser texto/);
  });
});

describe('validarPreferencias', () => {
  test('acepta un cuerpo válido y devuelve los valores normalizados', () => {
    const datos = validarPreferencias(cuerpoValido(), catalogo);
    assert.equal(datos.origen, 'onboarding');
    assert.deepEqual(datos.categorias, [1, 4]);
    assert.deepEqual(datos.actividades, [10, 40]);
    assert.equal(datos.correo.activo, false);
  });

  test('rechaza una actividad cuya categoría no está seleccionada', () => {
    assert.throws(
      () => validarPreferencias(cuerpoValido({ categorias: [1] }), catalogo),
      /requiere seleccionar su categoría/,
    );
  });

  test('rechaza categorías, actividades o motivaciones inexistentes', () => {
    assert.throws(() => validarPreferencias(cuerpoValido({ categorias: [99] }), catalogo), /no está disponible/);
    assert.throws(() => validarPreferencias(cuerpoValido({ categorias: [1, 4], actividades: [999] }), catalogo), /no está disponible/);
    assert.throws(() => validarPreferencias(cuerpoValido({ motivaciones: [77] }), catalogo), /no está disponible/);
  });

  test('rechaza identificadores repetidos o no enteros', () => {
    assert.throws(() => validarPreferencias(cuerpoValido({ categorias: [1, 1] }), catalogo), /repetidos/);
    assert.throws(() => validarPreferencias(cuerpoValido({ categorias: ['1'] }), catalogo), /no válidos/);
    assert.throws(() => validarPreferencias(cuerpoValido({ categorias: 1 }), catalogo), /debe ser una lista/);
  });

  test('rechaza un origen desconocido', () => {
    assert.throws(() => validarPreferencias(cuerpoValido({ origen: 'admin' }), catalogo), /origen/);
  });

  test('valida género: acepta null y valores cerrados, rechaza otros', () => {
    assert.equal(validarPreferencias(cuerpoValido({ genero: null }), catalogo).genero, null);
    assert.throws(() => validarPreferencias(cuerpoValido({ genero: 'otro' }), catalogo), /género/);
  });

  test('valida la frecuencia de correo', () => {
    const correo = { ...correoInactivo, frecuencia: 'mensual' };
    assert.throws(() => validarPreferencias(cuerpoValido({ correo }), catalogo), /frecuencia/);
  });

  test('exige exactamente los cinco tipos de novedades como booleanos', () => {
    const faltante = { ...tiposTodosFalse };
    delete faltante.eventos;
    assert.throws(
      () => validarPreferencias(cuerpoValido({ correo: { ...correoInactivo, tipos: faltante } }), catalogo),
      /exactamente/,
    );
    const extra = { ...tiposTodosFalse, marketing: true };
    assert.throws(
      () => validarPreferencias(cuerpoValido({ correo: { ...correoInactivo, tipos: extra } }), catalogo),
      /exactamente/,
    );
    const noBooleano = { ...tiposTodosFalse, eventos: 'si' };
    assert.throws(
      () => validarPreferencias(cuerpoValido({ correo: { ...correoInactivo, tipos: noBooleano } }), catalogo),
      /verdadero o falso/,
    );
  });

  test('limita las propuestas por envío y detecta repeticiones tras normalizar', () => {
    assert.throws(
      () => validarPreferencias(cuerpoValido({ propuestas: ['Uno uno', 'Dos dos', 'Tres tres', 'Cuatro cuatro'] }), catalogo),
      /máximo 3/,
    );
    assert.throws(
      () => validarPreferencias(cuerpoValido({ propuestas: ['Club de robótica', 'club de ROBOTICA'] }), catalogo),
      /repetidas/,
    );
  });

  test('normaliza propuestas válidas', () => {
    const datos = validarPreferencias(cuerpoValido({ propuestas: ['  Club de robótica  '] }), catalogo);
    assert.deepEqual(datos.propuestas, [{ texto: 'Club de robótica', normalizado: 'club de robotica' }]);
  });
});

describe('calcularCambiosConsentimiento', () => {
  const activo = {
    activo: true,
    frecuencia: 'diaria',
    tipos: { ...tiposTodosFalse, eventos: true },
  };

  test('sin cambios efectivos no genera filas', () => {
    assert.deepEqual(calcularCambiosConsentimiento(correoInactivo, correoInactivo), []);
    assert.deepEqual(calcularCambiosConsentimiento(activo, activo), []);
  });

  test('activar el correo con un tipo genera el consentimiento general y el del tipo', () => {
    assert.deepEqual(calcularCambiosConsentimiento(correoInactivo, activo), [
      { tipo: 'general', accion: 'otorgado', frecuencia: 'diaria' },
      { tipo: 'eventos', accion: 'otorgado', frecuencia: 'diaria' },
    ]);
  });

  test('repetir el mismo cambio es idempotente', () => {
    assert.deepEqual(calcularCambiosConsentimiento(activo, { ...activo, tipos: { ...activo.tipos } }), []);
  });

  test('cambiar la frecuencia con el correo activo registra el nuevo término', () => {
    assert.deepEqual(calcularCambiosConsentimiento(activo, { ...activo, frecuencia: 'semanal' }), [
      { tipo: 'general', accion: 'otorgado', frecuencia: 'semanal' },
    ]);
  });

  test('cambiar la frecuencia con el correo apagado no genera filas', () => {
    assert.deepEqual(
      calcularCambiosConsentimiento(correoInactivo, { ...correoInactivo, frecuencia: 'semanal' }),
      [],
    );
  });

  test('un tipo marcado con el interruptor general apagado no cuenta como consentimiento', () => {
    const tipoSinCorreo = { ...correoInactivo, tipos: { ...tiposTodosFalse, eventos: true } };
    assert.deepEqual(calcularCambiosConsentimiento(correoInactivo, tipoSinCorreo), []);
  });

  test('retirar el correo registra la retirada general y de los tipos efectivos', () => {
    assert.deepEqual(calcularCambiosConsentimiento(activo, { ...activo, activo: false }), [
      { tipo: 'general', accion: 'retirado', frecuencia: null },
      { tipo: 'eventos', accion: 'retirado', frecuencia: null },
    ]);
  });
});

describe('valores por defecto y clasificación de correos', () => {
  test('el consentimiento opcional empieza desactivado en todos sus tipos', () => {
    assert.equal(CORREO_POR_DEFECTO.activo, false);
    assert.ok(TIPOS_CORREO_OPCIONAL.every((t) => CORREO_POR_DEFECTO.tipos[t] === false));
  });

  test('un alumno sin fila se serializa como pendiente con correo apagado', () => {
    const datos = serializarPreferencias({ fila: null, categorias: [], actividades: [], motivaciones: [], propuestas: [] });
    assert.equal(datos.estado_onboarding, 'pendiente');
    assert.equal(datos.correo.activo, false);
  });

  test('los correos no configurables no forman parte del consentimiento opcional', () => {
    const clases = CORREOS_NO_CONFIGURABLES.map((c) => c.clase);
    assert.deepEqual(clases.sort(), ['operativo', 'seguridad', 'transaccional']);
    assert.ok(!clases.includes('opcional'));
  });
});

describe('espejo schema.sql ↔ migración', () => {
  test('la sección de onboarding de schema.sql coincide con la migración', () => {
    const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
    const migracion = readFileSync(new URL('../migrations/migrate-onboarding-preferencias.sql', import.meta.url), 'utf8');
    const marcador = 'CREATE TABLE IF NOT EXISTS cat_categorias_interes';
    const sqlEjecutable = (texto) => texto
      .slice(texto.indexOf(marcador))
      .split(/\r?\n/)
      .filter((linea) => linea.trim() !== '' && !linea.trim().startsWith('--') && !['BEGIN;', 'COMMIT;'].includes(linea.trim()))
      .join('\n');
    assert.ok(schema.indexOf(marcador) > 0);
    assert.equal(sqlEjecutable(schema), sqlEjecutable(migracion));
  });
});
