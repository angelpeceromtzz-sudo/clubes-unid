import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { crearAlmacenPdfMisiones } from '../lib/misionesArchivos.js';

const pdf = Buffer.from('%PDF-1.4\nDocumento ficticio QA\n%%EOF');
const archivo = { originalname: 'codigo.pdf', mimetype: 'application/pdf', buffer: pdf };

test('los PDFs mantienen sus bytes, se cargan autenticados y se leen sin entregar la URL del proveedor', async () => {
  const llamadas = [];
  const proveedor = {
    uploader: {
      upload_stream(opciones, callback) {
        llamadas.push(opciones);
        const partes = [];
        return new Writable({ write(parte, _codificacion, siguiente) { partes.push(parte); siguiente(); }, final(siguiente) { assert.deepEqual(Buffer.concat(partes), pdf); callback(null, {}); siguiente(); } });
      },
      async destroy(id, opciones) { llamadas.push({ id, ...opciones }); },
    },
    url(id, opciones) { llamadas.push({ id, ...opciones }); return 'https://archivo.example.test/firmado'; },
  };
  const almacen = crearAlmacenPdfMisiones({ proveedor, fetchImpl: async () => ({ ok: true, arrayBuffer: async () => pdf }) });
  const documento = await almacen.guardar(archivo);
  assert.equal(llamadas[0].resource_type, 'raw'); assert.equal(llamadas[0].type, 'authenticated');
  assert.equal(documento.bytes, pdf.length); assert.equal(documento.url, undefined);
  assert.deepEqual(await almacen.leer(documento), pdf);
  assert.equal(llamadas[1].sign_url, true); assert.equal(llamadas[1].type, 'authenticated');
  await almacen.eliminar(documento);
  assert.equal(llamadas[2].id, documento.public_id); assert.equal(llamadas[2].type, 'authenticated');
  const alterado = crearAlmacenPdfMisiones({ proveedor, fetchImpl: async () => ({ ok: true, arrayBuffer: async () => Buffer.from('alterado') }) });
  await assert.rejects(alterado.leer(documento), { status: 503 });
});

test('si se pierde la respuesta de una carga se intenta retirar únicamente su recurso privado', async () => {
  const eliminados = [];
  const proveedor = { uploader: {
    upload_stream(_opciones, callback) { return new Writable({ write(_parte, _codificacion, siguiente) { siguiente(); }, final(siguiente) { callback(new Error('Fallo simulado')); siguiente(); } }); },
    async destroy(id, opciones) { eliminados.push({ id, ...opciones }); },
  } };
  await assert.rejects(crearAlmacenPdfMisiones({ proveedor }).guardar(archivo), { status: 503 });
  assert.equal(eliminados.length, 1); assert.match(eliminados[0].id, /^clubs-unid\/misiones\/.+\.pdf$/);
  assert.equal(eliminados[0].type, 'authenticated');
});
