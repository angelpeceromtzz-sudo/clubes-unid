import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { crearRouterActividades } from '../lib/actividadesRouter.js';
import { camposPlantillaActividad, configuracionMisionesInicial } from '../lib/actividadesDominio.js';

// Prueba los permisos HTTP sin cargar .env ni utilizar la conexión de la aplicación.
async function escenario(t, cambios = {}, opciones = {}) {
  const actividad = { id_actividad: 10, id_club: 10, tipo: 'actividad', nombre: 'Taller QA', slug: 'taller-qa', descripcion: 'Descripción original', categoria: 'Cultural', plantilla: 'general', url_imagen: '', estado: 'publicada', id_responsable: 7, ...opciones.actividad };
  const edicion = {
    id_edicion: 20, id_actividad: 10, nombre: 'Edición original', plantilla: 'general',
    estado: 'pendiente', estado_actividad: 'publicada', id_responsable: 7,
    lugar: 'Campus QA', fecha_inicio: '2026-12-05', requiere_registro: false,
    propuesta: null, estado_propuesta: null, ...cambios,
  };
  const eventos = [];
  const consultas = [];
  const catalogo = [{ id_opcion: 30, id_edicion: 20, nombre: 'Aporte QA', unidad: 'piezas', descripcion: '', activa: true, cantidad_minima: 1 }];
  let subidas = 0;
  const query = async (sql, valores = []) => {
    consultas.push(sql);
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    if (/^SELECT e\.\*/.test(sql)) return { rows: [{ ...edicion }] };
    if (/^SELECT (?:a\.\*|\* FROM catalogo_recursos)/.test(sql)) return { rows: [{ ...actividad }] };
    if (/^SELECT id_nivel/.test(sql)) return { rows: [] };
    if (/^SELECT nombre_completo/.test(sql)) return { rows: [{ nombre_completo: 'Coordinación QA' }] };
    if (/^SELECT \* FROM actividades_aportes_catalogo/.test(sql)) return { rows: structuredClone(catalogo) };
    if (/^SELECT (?:\* FROM actividades_registros|p\.\*,EXISTS|1 FROM misiones_documentos)/.test(sql)) return { rows: [] };
    if (/^SELECT \* FROM actividades_fotos/.test(sql)) return { rows: [{ id_foto: 40, id_club: 10, id_edicion: 20, estado: 'pendiente' }] };
    if (/^SELECT COALESCE/.test(sql)) return { rows: [{ id_edicion: 20 }] };
    if (/^SELECT c\.id_club/.test(sql)) return { rows: [{ id_club: 10, nombre_club: actividad.nombre, edicion_nombre: edicion.nombre }] };
    if (/^INSERT INTO actividad_clubes/.test(sql)) {
      eventos.push({ accion: valores[0], actor: valores[3] });
      return { rows: [{ id_evento: eventos.length }] };
    }
    if (/^UPDATE (?:actividades_ediciones|catalogo_recursos) SET/.test(sql)) {
      const entidad = sql.startsWith('UPDATE catalogo_recursos') ? actividad : edicion;
      for (const [, campo, posicion] of sql.matchAll(/(\w+)\s*=\s*\$(\d+)/g)) {
        if (!['id_edicion', 'id_actividad'].includes(campo)) {
          const valor = valores[Number(posicion) - 1];
          entidad[campo] = ['propuesta', 'campos_registro', 'configuracion_misiones'].includes(campo) && typeof valor === 'string' ? JSON.parse(valor) : valor;
        }
      }
      for (const [, campo, estado] of sql.matchAll(/(estado(?:_propuesta)?)\s*=\s*'(borrador|rechazada|pendiente)'/g)) entidad[campo] = estado;
      return { rows: [{ ...entidad }] };
    }
    if (/^INSERT INTO actividades_aportes_catalogo/.test(sql)) {
      const [id_edicion, nombre, descripcion, unidad, cantidad_minima] = valores;
      const opcion = { id_opcion: 31, id_edicion, nombre, descripcion, unidad, cantidad_minima, activa: true };
      catalogo.push(opcion);
      return { rows: [{ ...opcion }] };
    }
    if (/^UPDATE actividades_aportes_catalogo/.test(sql)) {
      const [activa, nombre, unidad, descripcion, cantidad_minima, id] = valores;
      const opcion = catalogo.find((item) => item.id_opcion === id);
      Object.assign(opcion, { activa, nombre, unidad, descripcion, cantidad_minima });
      return { rows: [{ ...opcion }] };
    }
    throw new Error('Consulta inesperada: ' + sql);
  };
  const app = express();
  app.use(express.json());
  app.use(crearRouterActividades({
    db: { query, connect: async () => ({ query, release() {} }) },
    hoy: () => '2026-11-19',
    subirImagen: {
      single: () => (req, _res, next) => { subidas += 1; req.file = { path: 'https://example.test/portada.jpg' }; next(); },
      array: () => (_req, _res, next) => next(),
    },
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
  return { enviar, eventos, consultas, actividad, edicion, catalogo, get subidas() { return subidas; } };
}

test('solo Rectoría y Coordinación pueden decidir sobre una edición y queda registrado el actor', async (t) => {
  const ruta = '/gestion/ediciones/20/decision';
  const denegado = await escenario(t);
  for (const rol of [null, 1, 2, 5, 6]) await denegado.enviar(rol, 'POST', ruta, { aprobar: true }, rol ? 403 : 401);
  assert.deepEqual(denegado.consultas, [], 'los roles sin permiso no consultan ni modifican la base');
  for (const rol of [3, 4, 7]) {
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
    assert.equal(datos.puede_aprobar_ediciones, [3, 4, 7].includes(rol));
    assert.equal(datos.puede_publicar_actividades, [3, 4, 7].includes(rol));
    assert.equal(datos.puede_publicar_ediciones, [3, 4, 7].includes(rol));
    const detalle = await enviar(rol, 'GET', '/gestion/ediciones/20', undefined, [3, 4, 7].includes(rol) ? 200 : 403);
    if ([3, 4, 7].includes(rol)) assert.equal(detalle.puede_publicar_ediciones, true);
  }
  const asignada = await enviar(7, 'GET', '/gestion/asignadas/10');
  assert.equal(asignada.puede_aprobar, false);
  assert.equal(asignada.puede_aprobar_ediciones, true);
  assert.equal(asignada.puede_publicar_actividades, true);
  assert.equal(asignada.puede_publicar_ediciones, true);
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

test('la publicación directa no amplía los permisos de decisiones, archivo ni moderación de fotografías', async (t) => {
  const { enviar, eventos } = await escenario(t, { estado: 'publicada' });
  for (const rol of [3, 7]) {
    await enviar(rol, 'POST', '/gestion/actividades/10/decision', { aprobar: true }, 403);
    await enviar(rol, 'POST', '/gestion/actividades/10/decision', { aprobar: false, motivo: 'Revisar' }, 403);
    for (const tipo of ['actividades/10', 'ediciones/20']) {
      for (const archivar of [true, false]) await enviar(rol, 'POST', '/gestion/' + tipo + '/archivo', { archivar }, 403);
    }
    for (const estado of ['publicada', 'rechazada']) await enviar(rol, 'PUT', '/gestion/fotos/40', { estado }, 403);
  }
  assert.deepEqual(eventos, []);
});

test('publicar exige un perfil autorizado antes de consultar o modificar datos', async (t) => {
  const caso = await escenario(t);
  for (const recurso of ['actividades/10', 'ediciones/20']) {
    for (const rol of [null, 1, 2, 5, 6]) await caso.enviar(rol, 'POST', '/gestion/' + recurso + '/publicar', {}, rol ? 403 : 401);
  }
  assert.deepEqual(caso.consultas, []);
});

test('Coordinación y Rectoría publican borradores, pendientes y rechazados sin enviar a revisión', async (t) => {
  for (const rol of [3, 4, 7]) {
    for (const estado of ['borrador', 'pendiente', 'rechazada']) {
      const caso = await escenario(t, { estado }, { actividad: { estado } });
      for (const [recurso, entidad, accion] of [['actividades/10', caso.actividad, 'actividad_publicada'], ['ediciones/20', caso.edicion, 'edicion_publicada']]) {
        const publicada = await caso.enviar(rol, 'POST', '/gestion/' + recurso + '/publicar', {});
        assert.equal(publicada.estado, 'publicada');
        assert.equal(publicada.propuesta, null);
        assert.equal(publicada.estado_propuesta, null);
        assert.equal(publicada.motivo_rechazo, null);
        await caso.enviar(rol, 'POST', '/gestion/' + recurso + '/publicar', {});
        assert.equal(caso.eventos.filter((evento) => evento.accion === accion).length, 1);
        assert.equal(entidad.estado, 'publicada');
      }
      assert.deepEqual(caso.eventos, [{ accion: 'actividad_publicada', actor: rol }, { accion: 'edicion_publicada', actor: rol }]);
    }
  }
});

test('guardar conserva la versión publicada y permite aplicar propuestas pendientes y portadas directamente', async (t) => {
  for (const rol of [3, 4, 7]) {
    const caso = await escenario(t, { estado: 'publicada', propuesta: { nombre: 'Edición propuesta' }, estado_propuesta: 'pendiente' }, { actividad: { propuesta: { nombre: 'Actividad propuesta' }, estado_propuesta: 'pendiente' } });
    const actividad = await caso.enviar(rol, 'PUT', '/gestion/actividades/10', { nombre: 'Actividad corregida' });
    assert.equal(actividad.nombre, 'Taller QA');
    assert.equal(actividad.propuesta.nombre, 'Actividad corregida');
    assert.equal(actividad.estado_propuesta, 'borrador');
    const edicion = await caso.enviar(rol, 'PUT', '/gestion/ediciones/20', { nombre: 'Edición corregida' });
    assert.equal(edicion.nombre, 'Edición original');
    assert.equal(edicion.propuesta.nombre, 'Edición corregida');
    assert.equal(edicion.estado_propuesta, 'borrador');
    await caso.enviar(rol, 'POST', '/gestion/actividades/10/imagen', {});
    assert.equal(caso.actividad.url_imagen, '');
    assert.equal(caso.actividad.propuesta.url_imagen, 'https://example.test/portada.jpg');
    assert.equal((await caso.enviar(rol, 'POST', '/gestion/actividades/10/publicar', {})).nombre, 'Actividad corregida');
    assert.equal(caso.actividad.url_imagen, 'https://example.test/portada.jpg');
    assert.equal((await caso.enviar(rol, 'POST', '/gestion/ediciones/20/publicar', {})).nombre, 'Edición corregida');
  }
});

test('también se publican propuestas aún pendientes sin un paso previo de retirada o guardado', async (t) => {
  const caso = await escenario(t, { estado: 'publicada', propuesta: { nombre: 'Edición pendiente' }, estado_propuesta: 'pendiente' }, { actividad: { propuesta: { nombre: 'Actividad pendiente' }, estado_propuesta: 'pendiente' } });
  assert.equal((await caso.enviar(3, 'POST', '/gestion/actividades/10/publicar', {})).nombre, 'Actividad pendiente');
  assert.equal((await caso.enviar(7, 'POST', '/gestion/ediciones/20/publicar', {})).nombre, 'Edición pendiente');
});

test('publicar conserva las validaciones y permite corregir y reintentar sin duplicar publicaciones', async (t) => {
  for (const cambios of [{ estado_actividad: 'borrador' }, { fecha_inicio: null }, { lugar: '' }, { fecha_fin: '2026-12-01' }, { requiere_registro: true }, { requiere_registro: true, inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-01', campos_registro: [{ clave: 'talla', etiqueta: 'Talla', tipo: 'seleccion', obligatorio: true, opciones: [] }] }]) {
    const caso = await escenario(t, { estado: 'borrador', ...cambios });
    await caso.enviar(7, 'POST', '/gestion/ediciones/20/publicar', {}, 400);
    assert.equal(caso.edicion.estado, 'borrador');
    assert.deepEqual(caso.eventos, []);
  }
  const caso = await escenario(t, { estado: 'borrador', lugar: '' });
  await caso.enviar(3, 'POST', '/gestion/ediciones/20/publicar', {}, 400);
  await caso.enviar(3, 'PUT', '/gestion/ediciones/20', { lugar: 'Campus corregido' });
  await caso.enviar(3, 'POST', '/gestion/ediciones/20/publicar', {});
  await caso.enviar(3, 'POST', '/gestion/ediciones/20/publicar', {});
  assert.equal(caso.eventos.filter((evento) => evento.accion === 'edicion_publicada').length, 1);
});

test('los perfiles autorizados editan aportaciones publicadas conservando al menos una opción obligatoria', async (t) => {
  for (const rol of [3, 4, 7]) {
    const caso = await escenario(t, { estado: 'publicada', requiere_aportacion: true, estado_propuesta: 'pendiente' });
    await caso.enviar(rol, 'PUT', '/gestion/catalogo/30', { activa: false }, 400);
    assert.equal(caso.catalogo[0].activa, true);
    await caso.enviar(rol, 'POST', '/gestion/ediciones/20/catalogo', { nombre: 'Segunda opción', unidad: 'paquetes', cantidad_minima: 2 }, 201);
    await caso.enviar(rol, 'PUT', '/gestion/catalogo/30', { activa: false });
    assert.equal(caso.catalogo[0].activa, false);
    assert.equal(caso.catalogo[1].activa, true);
  }
  const encargado = await escenario(t, { estado: 'publicada', id_responsable: 2 });
  await encargado.enviar(2, 'PUT', '/gestion/catalogo/30', { nombre: 'No autorizado' }, 403);
});

test('la publicación directa valida el catálogo obligatorio y la pertenencia del PDF de Misiones', async (t) => {
  const aportes = await escenario(t, { estado: 'borrador', requiere_registro: true, requiere_aportacion: true, inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-01' });
  aportes.catalogo[0].activa = false;
  await aportes.enviar(3, 'POST', '/gestion/ediciones/20/publicar', {}, 400);
  assert.deepEqual(aportes.eventos, []);
  const configuracion = { ...configuracionMisionesInicial(null), codigo_obligatorio: true, codigo_documento: '00000000-0000-4000-8000-000000000001' };
  const misiones = await escenario(t, { estado: 'borrador', plantilla: 'misiones', requiere_registro: true, inscripcion_desde: '2026-11-01', inscripcion_hasta: '2026-12-01', configuracion_misiones: configuracion, campos_registro: camposPlantillaActividad('misiones', configuracion).map((campo) => campo.clave === 'talla' ? { ...campo, opciones: ['M'] } : campo) });
  const error = await misiones.enviar(7, 'POST', '/gestion/ediciones/20/publicar', {}, 400);
  assert.match(error.error, /código de conducta cargado para esta actividad/);
  assert.deepEqual(misiones.eventos, []);
});

test('el encargado conserva el envío a revisión y debe retirar una propuesta antes de editarla', async (t) => {
  const caso = await escenario(t, { estado: 'borrador', id_responsable: 2 }, { actividad: { estado: 'borrador', id_responsable: 2 } });
  for (const recurso of ['actividades/10', 'ediciones/20']) {
    await caso.enviar(2, 'POST', '/gestion/' + recurso + '/revision', {});
    await caso.enviar(2, 'PUT', '/gestion/' + recurso, { nombre: 'Corrección' }, 409);
    await caso.enviar(2, 'POST', '/gestion/' + recurso + '/revision', { retirar: true });
    await caso.enviar(2, 'PUT', '/gestion/' + recurso, { nombre: 'Corrección' });
  }
});

test('clubes y publicaciones archivadas conservan sus límites para todos los perfiles', async (t) => {
  for (const rol of [3, 4, 7]) {
    const club = await escenario(t, {}, { actividad: { tipo: 'club', estado: 'pendiente' } });
    await club.enviar(rol, 'POST', '/gestion/actividades/10/publicar', {}, 403);
    await club.enviar(rol, 'PUT', '/gestion/actividades/10', { nombre: 'Club' }, 409);
    await club.enviar(rol, 'POST', '/gestion/actividades/10/imagen', {}, 409);
    assert.equal(club.subidas, 0);
    assert.deepEqual(club.eventos, []);
    const archivada = await escenario(t, { estado: 'archivada' }, { actividad: { estado: 'archivada' } });
    for (const recurso of ['actividades/10', 'ediciones/20']) {
      await archivada.enviar(rol, 'POST', '/gestion/' + recurso + '/publicar', {}, 409);
      await archivada.enviar(rol, 'PUT', '/gestion/' + recurso, { nombre: 'Cambio' }, 409);
    }
    await archivada.enviar(rol, 'POST', '/gestion/ediciones/20/catalogo', { nombre: 'Cambio', unidad: 'piezas', cantidad_minima: 1 }, 409);
    await archivada.enviar(rol, 'POST', '/gestion/actividades/10/imagen', {}, 409);
    assert.equal(archivada.subidas, 0);
    assert.deepEqual(archivada.eventos, []);
  }
});
