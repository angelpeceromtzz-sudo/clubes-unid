import { createHash, randomUUID } from 'node:crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { errorActividad } from './actividadesDominio.js';

export const MAX_PDF_MISIONES = 10 * 1024 * 1024;
const cargar = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PDF_MISIONES, files: 1, fields: 2, fieldSize: 128 * 1024 } }).single('pdf');

export function recibirPdfMisiones(req, res, next) {
  cargar(req, res, (error) => {
    if (error) return next(errorActividad(error.code === 'LIMIT_FILE_SIZE' ? 'El PDF debe pesar hasta 10 MB' : 'Envía un solo PDF con el formulario'));
    try {
      if (req.file) validarPdfMisiones(req.file);
      if (req.body?.formulario !== undefined) {
        const datos = JSON.parse(req.body.formulario);
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new Error();
        req.body = datos;
      }
      next();
    } catch (fallo) { next(fallo.status ? fallo : errorActividad('Revisa el formulario y el PDF adjunto')); }
  });
}

export function validarPdfMisiones(archivo) {
  if (!archivo?.buffer || archivo.mimetype !== 'application/pdf' || archivo.buffer.length > MAX_PDF_MISIONES ||
      archivo.buffer.subarray(0, 5).toString('ascii') !== '%PDF-' || !archivo.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) {
    throw errorActividad('Adjunta un archivo PDF válido de hasta 10 MB');
  }
  return archivo;
}

export function crearAlmacenPdfMisiones({ proveedor = cloudinary, fetchImpl = globalThis.fetch } = {}) {
  return {
    async guardar(archivo) {
      validarPdfMisiones(archivo);
      const public_id = 'clubs-unid/misiones/' + randomUUID() + '.pdf';
      try {
        await new Promise((resolve, reject) => {
          const stream = proveedor.uploader.upload_stream({ public_id, resource_type: 'raw', type: 'authenticated', overwrite: false, timeout: 20000 }, (error, resultado) => error ? reject(error) : resolve(resultado));
          stream.on('error', reject);
          stream.end(archivo.buffer);
        });
      } catch {
        // Una respuesta perdida puede dejar el recurso creado en el proveedor.
        await proveedor.uploader.destroy(public_id, { resource_type: 'raw', type: 'authenticated', timeout: 10000 }).catch(() => {});
        throw errorActividad('No se pudo guardar el PDF. Tu inscripción no se confirmó; intenta de nuevo', 503);
      }
      return { public_id, nombre: (archivo.originalname || 'codigo-conducta.pdf').replace(/[\r\n/\\\x00-\x1f]/g, '_').slice(0, 200), bytes: archivo.buffer.length, sha256: createHash('sha256').update(archivo.buffer).digest('hex') };
    },
    async leer(documento) {
      // El enlace firmado solo se usa en el servidor; la API entrega los bytes al propietario.
      // https://cloudinary.com/documentation/control_access_to_media#authenticated_media_assets
      const url = proveedor.url(documento.public_id, { resource_type: 'raw', type: 'authenticated', secure: true, sign_url: true });
      const respuesta = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
      if (!respuesta.ok) throw errorActividad('No se pudo descargar el PDF. Intenta de nuevo', 503);
      const buffer = Buffer.from(await respuesta.arrayBuffer());
      if (buffer.length > MAX_PDF_MISIONES || createHash('sha256').update(buffer).digest('hex') !== documento.sha256) throw errorActividad('No se pudo comprobar el PDF guardado', 503);
      return buffer;
    },
    async eliminar(documento) {
      await proveedor.uploader.destroy(documento.public_id, { resource_type: 'raw', type: 'authenticated', invalidate: true, timeout: 10000 });
    },
  };
}
