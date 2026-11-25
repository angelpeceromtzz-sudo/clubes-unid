import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate, requireRole } from '../middleware/auth.js';
import { limitadorUpload } from '../lib/rateLimits.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'clubs-unid',
    // H12: 'svg' retirado — un SVG puede contener scripts y servido desde
    // cloudinary.com habilitaría contenido activo. Los recursos SVG ya
    // subidos siguen existiendo y manejándose (lectura/limpieza intactas);
    // lo que se bloquea es subir SVG NUEVOS. En el panel no hay ninguna
    // funcionalidad que dependa de subir SVG (los logos/iconos del UI son
    // assets incluidos en el código, no subidas).
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1920, crop: 'limit' },
      { fetch_format: 'auto', quality: 'auto' },
    ],
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // H12: sin image/svg+xml; un mimetype no listado responde 400 en la ruta.
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// 30/min (H5a): cada archivo tiene costo real de Cloudinary.
router.post('/imagen', authenticate, requireRole(3, 4, 6), limitadorUpload, upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen o el formato no es válido' });
    }
    res.json({ url: req.file.path });
  } catch (err) {
    console.error('Error al subir imagen:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Subida pública para capturas de reportes (cualquiera puede reportar)
router.post('/reporte-imagen', limitadorUpload, upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen o el formato no es válido' });
    }
    res.json({ url: req.file.path });
  } catch (err) {
    console.error('Error al subir imagen de reporte:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error de upload: ${err.message}` });
  }
  if (err && err.message && String(err.message).includes('Cloudinary')) {
    return res.status(500).json({ error: 'Error al subir a Cloudinary. Verifica CLOUDINARY_URL.' });
  }
  next(err);
});

export default router;
