import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { hoyEnCampus } from '../lib/fechasEvento.js';
import { crearRouterActividades } from '../lib/actividadesRouter.js';
import { upload } from './upload.js';
import { limitadorUpload, limitadorEscritura, limitadorMisionesRegistro, limitadorMisionesReenvio } from '../lib/rateLimits.js';
import { v2 as cloudinary } from 'cloudinary';
import { crearAlmacenPdfMisiones } from '../lib/misionesArchivos.js';
import { crearCorreoMisiones } from '../lib/misionesCorreo.js';

export default crearRouterActividades({
  db: pool, autenticar: authenticate, hoy: hoyEnCampus, subirImagen: upload,
  secretoAdmin: process.env.ADMIN_SECRET,
  limitarEscritura: limitadorEscritura, limitarSubida: limitadorUpload,
  limitarRegistro: limitadorMisionesRegistro, limitarReenvio: limitadorMisionesReenvio,
  almacenPdf: crearAlmacenPdfMisiones(), correoMisiones: crearCorreoMisiones(),
  limpiarImagenes: async (archivos) => {
    const resultados = await Promise.allSettled(archivos.filter((archivo) => typeof archivo.filename === 'string' && archivo.filename.startsWith('clubs-unid/')).map((archivo) => cloudinary.uploader.destroy(archivo.filename)));
    if (resultados.some((resultado) => resultado.status === 'rejected')) throw new Error('Limpieza incompleta');
  },
});
