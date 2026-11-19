import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { crearRouterActividades } from '../lib/actividadesRouter.js';

// Prueba los permisos HTTP sin cargar .env ni utilizar la conexión de la aplicación.
async function escenario(t, cambios = {}) {
  const actividad = { id_actividad: 10, id_club: 10, tipo: 'actividad', nombre: 'Taller QA', estado: 'publicada', id_responsable: 7 };
  const edicion = {
    id_edicion: 20, id_actividad: 10, nombre: 'Edición original', plantilla: 'general',
    estado: 'pendiente', estado_actividad: 'publicada', id_responsable: 7,
    lugar: 'Campus QA', fecha_inicio: '2026-12-05', requiere_registro: false,
    propuesta: null, estado_propuesta: null, ...cambios,
  };
  const eventos = [];
  const consultas = [];
  const query = async (sql, valores = []) => {
    consultas.push(sql);
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    if (/^SELECT e\.\*/.test(sql)) return { rows: [{ ...edicion }] };
    if (/^SELECT (?:a\.\*|\* FROM catalogo_recursos)/.test(sql)) return { rows: [{ ...actividad }] };
    if (/^SELECT id_nivel/.test(sql)) return { rows: [] };
    if (/^SELECT nombre_completo/.test(sql)) return { rows: [{ nombre_completo: 'Coordinación QA' }] };
    if (/^SELECT \* FROM actividades_aportes_catalogo/.test(sql)) return { rows: [{ id_opcion: 30, id_edicion: 20, activa: true, cantidad_minima: 1 }] };
    if (/^SELECT \* FROM actividades_fotos/.test(sql)) return { rows: [{ id_foto: 40, id_club: 10, id_edicion: 20, estado: 'pendiente' }] };
    if (/^SELECT COALESCE/.test(sql)) return { rows: [{ id_edicion: 20 }] };
    if (/^SELECT c\.id_club/.test(sql)) return { rows: [{ id_club: 10, nombre_club: actividad.nombre, edicion_nombre: edicion.nombre }] };
    if (/^INSERT INTO actividad_clubes/.test(sql)) {
      eventos.push({ accion: valores[0], actor: valores[3] });
      return { rows: [{ id_evento: eventos.length }] };
    }
    if (/^UPDATE actividades_ediciones SET/.test(sql)) {
      for (const [, campo, posicion] of sql.matchAll(/(\w+) = \$(\d+)/g)) {
        if (campo !== 'id_edicion') edicion[campo] = ['campos_registro', 'configuracion_misiones'].includes(campo) ? JSON.parse(valores[Number(posicion) - 1]) : valores[Number(posicion) - 1];
      }
      const rechazo = sql.match(/SET (estado(?:_propuesta)?) = 'rechazada'/);
      if (rechazo) edicion[rechazo[1]] = 'rechazada';
      return { rows: [{ ...edicion }] };
    }
    throw new Error('Consulta inesperada: ' + sql);
  };
  const app = express();
  app.use(express.json());
  app.use(crearRouterActividades({
    db: { query, connect: async () => ({ query, release() {} }) },
    hoy: () => '2026-11-19',
    autenticar: (req, res, next) => {
      const rol = Number(req.headers['x-rol-qa']);
      if (!rol) return res.status(401).json({ error: 'Sesión requerida' });
      req.user = { id: rol, id_rol: rol };
      next();
    },
  }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  const base = 'http://127.0.0.1:' + servidor.address().port;
  async function enviar(rol, method, ruta, body, esperado = 200) {
    const respuesta = await fetch(base + ruta, {
      method, headers: { 'Content-Type': 'application/json', ...(rol ? { 'x-rol-qa': String(rol) } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const datos = await respuesta.json();
    assert.equal(respuesta.status, esperado, method + ' ' + ruta + ': ' + JSON.stringify(datos));
    return datos;
  }
  return { enviar, eventos, consultas, edicion };
}

test('solo Rectoría y Coordinación pueden decidir sobre una edición y queda registrado el actor', async (t) => {
  const ruta = '/gestion/ediciones/20/decision';
  const denegado = await escenario(t);
  for (const rol of [null, 1, 2, 3, 5, 6]) await denegado.enviar(rol, 'POST', ruta, { aprobar: true }, rol ? 403 : 401);
  assert.deepEqual(denegado.consultas, [], 'los roles sin permiso no consultan ni modifican la base');
  for (const rol of [4, 7]) {
    const { enviar, eventos } = await escenario(t);
    await enviar(rol, 'POST', ruta, { aprobar: 'sí' }, 400);
    assert.equal((await enviar(rol, 'POST', ruta, { aprobar: true })).estado, 'publicada');
    assert.deepEqual(eventos, [{ accion: 'edicion_publicada', actor: rol }]);
    await enviar(rol, 'POST', ruta, { aprobar: true }, 409);
    assert.equal(eventos.length, 1);
  }
});

test('gestión anuncia el permiso de ediciones separado del permiso general', async (t) => {
  const { enviar } = await escenario(t);
  for (const rol of [1, 2, 3, 4, 5, 6, 7]) {
    const datos = await enviar(rol, 'GET', '/gestion');
    assert.equal(datos.puede_aprobar, rol === 4);
    assert.equal(datos.puede_aprobar_ediciones, [4, 7].includes(rol));
  }
  const asignada = await enviar(7, 'GET', '/gestion/asignadas/10');
  assert.equal(asignada.puede_aprobar, false);
  assert.equal(asignada.puede_aprobar_ediciones, true);
});

test('Coordinación exige observaciones al devolver cambios y conserva la edición publicada', async (t) => {
  const { enviar, eventos, edicion } = await escenario(t, {
    estado: 'publicada', estado_propuesta: 'pendiente', propuesta: { nombre: 'Propuesta nueva' },
  });
  const ruta = '/gestion/ediciones/20/decision';
  await enviar(7, 'POST', ruta, { aprobar: false, motivo: '   ' }, 400);
  assert.equal(edicion.estado_propuesta, 'pendiente');
  const rechazada = await enviar(7, 'POST', ruta, { aprobar: false, motivo: 'Ajustar fechas' });
  assert.equal(rechazada.estado, 'publicada');
  assert.equal(rechazada.nombre, 'Edición original');
  assert.equal(rechazada.estado_propuesta, 'rechazada');
  assert.equal(rechazada.motivo_rechazo, 'Ajustar fechas');
  assert.deepEqual(eventos, [{ accion: 'edicion_rechazada', actor: 7 }]);
});

test('Coordinación aplica la propuesta al aprobarla y conserva las validaciones de publicación', async (t) => {
  const ruta = '/gestion/ediciones/20/decision';
  const propuesta = await escenario(t, { estado: 'publicada', estado_propuesta: 'pendiente', propuesta: { nombre: 'Edición nueva' } });
  const publicada = await propuesta.enviar(7, 'POST', ruta, { aprobar: true });
  assert.equal(publicada.nombre, 'Edición nueva');
  assert.equal(publicada.propuesta, null);
  assert.equal(publicada.estado_propuesta, null);
  for (const datos of [{ estado_actividad: 'borrador' }, { fecha_inicio: null }, { lugar: '' }]) {
    const caso = await escenario(t, datos);
    await caso.enviar(7, 'POST', ruta, { aprobar: true }, 400);
    assert.equal(caso.edicion.estado, 'pendiente');
    assert.deepEqual(caso.eventos, []);
  }
  const archivada = await escenario(t, { estado: 'archivada' });
  await archivada.enviar(7, 'POST', ruta, { aprobar: true }, 409);
});

test('Coordinación conserva las restricciones de información general, archivo, fotos y catálogo publicado', async (t) => {
  const { enviar, eventos } = await escenario(t, { estado: 'publicada' });
  await enviar(7, 'POST', '/gestion/actividades/10/decision', { aprobar: true }, 403);
  await enviar(7, 'POST', '/gestion/actividades/10/decision', { aprobar: false, motivo: 'Revisar' }, 403);
  for (const tipo of ['actividades/10', 'ediciones/20']) {
    for (const archivar of [true, false]) await enviar(7, 'POST', '/gestion/' + tipo + '/archivo', { archivar }, 403);
  }
  for (const estado of ['publicada', 'rechazada']) await enviar(7, 'PUT', '/gestion/fotos/40', { estado }, 403);
  await enviar(7, 'POST', '/gestion/ediciones/20/catalogo', { nombre: 'Aporte QA', unidad: 'piezas', cantidad_minima: 1 }, 403);
  await enviar(7, 'PUT', '/gestion/catalogo/30', { activa: false }, 403);
  assert.deepEqual(eventos, []);
});
