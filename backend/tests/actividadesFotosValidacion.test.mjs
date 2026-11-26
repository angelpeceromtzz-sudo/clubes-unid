import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { crearRouterActividades } from '../lib/actividadesRouter.js';

test('la carga de fotos valida arreglos y conserva las respuestas individual y por lote', async (t) => {
  let transacciones = 0;
  const fotos = [];
  const limpiezas = [];
  const recurso = { id_actividad: 1, id_edicion: 2, tipo: 'club', id_responsable: 4 };
  const query = async (sql, params) => {
    if (/^SELECT (?:e\.\*|a\.\*|\* FROM catalogo_recursos)/.test(sql)) return { rows: [{ ...recurso }] };
    if (/^SELECT id_nivel/.test(sql)) return { rows: [] };
    if (sql === 'BEGIN') { fotos.length = 0; return { rows: [] }; }
    if (sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (/^INSERT INTO publicaciones_oferta/.test(sql)) return { rows: [{ id_publicacion: 3 }] };
    if (/^INSERT INTO publicaciones_imagenes/.test(sql)) {
      const foto = { id_foto: fotos.length + 1, url_imagen: params[1] };
      fotos.push(foto);
      return { rows: [foto] };
    }
    if (/^SELECT \* FROM actividades_fotos/.test(sql)) return { rows: [...fotos] };
    if (/^SELECT COALESCE/.test(sql)) return { rows: [{ id_edicion: 2 }] };
    if (/^SELECT c\.id_club/.test(sql)) return { rows: [{ id_club: 1 }] };
    if (/^INSERT INTO actividad_clubes/.test(sql)) return { rows: [{ id_evento: 1 }] };
    throw new Error('Consulta inesperada en la prueba: ' + sql);
  };
  const app = express();
  app.use(express.json());
  app.use(crearRouterActividades({
    db: { query, connect: async () => { transacciones += 1; return { query, release() {} }; } },
    autenticar: (req, _res, next) => { req.user = { id: 4, id_rol: 4 }; next(); },
    hoy: () => '2026-11-17',
    subirImagen: {
      single: () => (req, _res, next) => { req.file = req.body.archivo; next(); },
      array: () => (req, _res, next) => { req.files = req.body.archivos; next(); },
    },
    limpiarImagenes: async (archivos) => { limpiezas.push(archivos); },
  }));
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  const base = 'http://127.0.0.1:' + servidor.address().port;
  const pedir = (ruta, body) => fetch(base + ruta, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const archivo = { path: 'https://example.test/foto.jpg', filename: 'clubs-unid/qa' };

  for (const ruta of ['/gestion/ediciones/2/fotos/lote', '/gestion/actividades/1/fotos/lote']) {
    for (const archivos of ['foto.jpg', { length: 1 }, { imagenes: [archivo] }, [], Array(11).fill(archivo), null]) {
      const antes = transacciones;
      const respuesta = await pedir(ruta, { archivos });
      assert.equal(respuesta.status, 400, ruta + ' ' + JSON.stringify(archivos));
      assert.equal(transacciones, antes, 'una carga inválida no abre transacciones');
      assert.ok(Array.isArray(limpiezas.at(-1)), 'la limpieza siempre recibe un arreglo');
    }
    for (const cantidad of [1, 10]) {
      const respuesta = await pedir(ruta, { archivos: Array(cantidad).fill(archivo) });
      assert.equal(respuesta.status, 201);
      assert.equal((await respuesta.json()).length, cantidad);
    }
  }
  const sinArchivo = await pedir('/gestion/ediciones/2/fotos', {});
  assert.equal(sinArchivo.status, 400);
  const individual = await pedir('/gestion/ediciones/2/fotos', { archivo });
  assert.equal(individual.status, 201);
  assert.equal((await individual.json()).url_imagen, archivo.path);
});
