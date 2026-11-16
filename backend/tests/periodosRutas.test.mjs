import assert from 'node:assert/strict';
import { after, test } from 'node:test';

process.env.JWT_SECRET ??= 'periodos-solo-pruebas';
process.env.DB_PASSWORD ??= 'periodos-solo-pruebas';
const { default: pool } = await import('../db.js');
const { default: asistencia } = await import('../routes/asistencia.js');
const { default: catalogos } = await import('../routes/catalogos.js');
const { default: preferencias } = await import('../routes/preferencias.js');
const queryOriginal = pool.query;
const connectOriginal = pool.connect;
after(() => { pool.query = queryOriginal; pool.connect = connectOriginal; });

const periodo = (id) => ({ id_periodo: id, nombre: `Periodo ${id}`, fecha_inicio: '2026-09-01', fecha_fin: '2026-12-31', activo: false });
async function invocar(router, ruta, metodo = 'get', datos = {}) {
  const capa = router.stack.find((entrada) => entrada.route?.path === ruta && entrada.route.methods[metodo]);
  assert.ok(capa, `Existe ${metodo} ${ruta}`);
  const respuesta = { codigo: 200, cuerpo: null, status(codigo) { this.codigo = codigo; return this; }, json(cuerpo) { this.cuerpo = cuerpo; return this; } };
  // Se prueba el handler real: autenticación y permisos no cambiaron en esta fase.
  await capa.route.stack.at(-1).handle({ user: { id: 42 }, idClub: 7, query: {}, body: {}, ...datos }, respuesta);
  return respuesta;
}

function simularBase(candidatosPorResolucion) {
  const estado = { consultas: [], resoluciones: 0, onboarding: 'pendiente', liberado: false };
  let previo;
  const query = async (sql, parametros = []) => {
    const consulta = sql.replace(/\s+/g, ' ').trim();
    estado.consultas.push({ sql: consulta, parametros });
    if (consulta === 'BEGIN') previo = estado.onboarding;
    if (consulta === 'ROLLBACK') estado.onboarding = previo;
    if (consulta.includes("CURRENT_TIMESTAMP AT TIME ZONE")) return { rows: [{ hoy: '2026-11-16' }] };
    if (consulta.includes('FROM periodos_actividad') && consulta.includes('WHERE fecha_inicio')) {
      const indice = Math.min(estado.resoluciones++, candidatosPorResolucion.length - 1);
      return { rows: candidatosPorResolucion[indice] };
    }
    if (consulta.startsWith('INSERT INTO preferencias_usuario')) estado.onboarding = 'omitido';
    if (consulta.startsWith('SELECT * FROM preferencias_usuario')) return { rows: [{ estado_onboarding: estado.onboarding }] };
    return { rows: [] };
  };
  pool.query = query;
  pool.connect = async () => ({ query, release() { estado.liberado = true; } });
  return estado;
}

test('asistencia devuelve ausencia, periodo o 409 sin escoger arbitrariamente', async () => {
  for (const [filas, codigo] of [[[], 200], [[periodo(1)], 200], [[periodo(1), periodo(2)], 409]]) {
    simularBase([filas]);
    const respuesta = await invocar(asistencia, '/periodo/activo');
    assert.equal(respuesta.codigo, codigo);
    if (!filas.length) assert.equal(respuesta.cuerpo, null);
    if (filas.length === 1) assert.equal(respuesta.cuerpo.id_periodo, 1);
    if (filas.length === 2) assert.equal(respuesta.cuerpo.candidatos.length, 2);
  }
});

test('sesiones de hoy rechaza inconsistencia antes de generar sesiones', async () => {
  const estado = simularBase([[periodo(1), periodo(2)]]);
  const respuesta = await invocar(asistencia, '/sesiones/hoy');
  assert.equal(respuesta.codigo, 409);
  assert.ok(!estado.consultas.some((consulta) => consulta.sql.includes('generar_sesiones_periodo_club')));
});

test('historial y estadísticas conservan filtros explícitos históricos y futuros', async () => {
  for (const id of [9, 99]) {
    const consultas = [];
    pool.query = async (sql, valores = []) => {
      consultas.push({ sql, valores });
      assert.ok(!sql.includes('CURRENT_TIMESTAMP'), 'No consulta el periodo actual');
      assert.ok(!sql.includes('WHERE fecha_inicio'), 'No sustituye el periodo elegido');
      return { rows: sql.includes('FROM periodos_actividad WHERE id_periodo') ? [periodo(valores[0])] : [] };
    };
    assert.equal((await invocar(asistencia, '/historial', 'get', { query: { id_periodo: String(id) } })).codigo, 200);
    const estadisticas = await invocar(asistencia, '/estadisticas/club', 'get', { query: { id_periodo: String(id) } });
    assert.equal(estadisticas.codigo, 200);
    assert.equal(estadisticas.cuerpo.periodo.id_periodo, id);
    assert.ok(consultas.some((consulta) => consulta.sql.includes('s.id_periodo =') && consulta.valores.includes(id)));
  }
});

test('la caché de intereses conserva catálogos pero no periodos ni inconsistencias', async () => {
  const candidatos = [[periodo(1)]];
  const estado = simularBase(candidatos);
  const primera = await invocar(catalogos, '/intereses');
  assert.equal(primera.codigo, 200);
  assert.equal(primera.cuerpo.periodoActivo.id, 1);
  const consultasEstables = () => estado.consultas.filter((consulta) => /FROM cat_/.test(consulta.sql)).length;
  const antes = consultasEstables();
  candidatos[0] = [periodo(2)];
  const segunda = await invocar(catalogos, '/intereses');
  assert.equal(segunda.codigo, 200);
  assert.equal(segunda.cuerpo.periodoActivo.id, 2);
  assert.equal(consultasEstables(), antes);
  candidatos[0] = [periodo(3), periodo(4)];
  assert.equal((await invocar(catalogos, '/intereses')).codigo, 409);
});

test('leer y guardar preferencias propagan la inconsistencia como 409', async () => {
  simularBase([[periodo(1), periodo(2)]]);
  assert.equal((await invocar(preferencias, '/preferencias')).codigo, 409);
  const estado = simularBase([[periodo(1), periodo(2)]]);
  assert.equal((await invocar(preferencias, '/preferencias', 'put')).codigo, 409);
  assert.ok(estado.consultas.some((consulta) => consulta.sql === 'ROLLBACK'));
  assert.ok(!estado.consultas.some((consulta) => consulta.sql.startsWith('INSERT INTO preferencias_usuario')));
  assert.equal(estado.liberado, true);
});

test('omitir revierte la escritura si el calendario se vuelve inconsistente al construir la respuesta', async () => {
  const estado = simularBase([[periodo(1)], [periodo(1), periodo(2)]]);
  const respuesta = await invocar(preferencias, '/preferencias/omitir', 'post');
  assert.equal(respuesta.codigo, 409);
  assert.ok(estado.consultas.some((consulta) => consulta.sql.startsWith('INSERT INTO preferencias_usuario')));
  assert.ok(estado.consultas.some((consulta) => consulta.sql === 'ROLLBACK'));
  assert.ok(!estado.consultas.some((consulta) => consulta.sql === 'COMMIT'));
  assert.equal(estado.onboarding, 'pendiente');
  assert.equal(estado.liberado, true);
});

test('omitir confirma una operación correcta y libera el cliente', async () => {
  const estado = simularBase([[periodo(1)]]);
  const respuesta = await invocar(preferencias, '/preferencias/omitir', 'post');
  assert.equal(respuesta.codigo, 200);
  assert.equal(estado.onboarding, 'omitido');
  assert.ok(estado.consultas.some((consulta) => consulta.sql === 'COMMIT'));
  assert.equal(estado.liberado, true);
});
