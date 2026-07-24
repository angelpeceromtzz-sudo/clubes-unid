import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate, requireRole } from '../middleware/auth.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'clubs-unid',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [
      { width: 1920, crop: 'limit' },
      { fetch_format: 'auto', quality: 'auto' },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.post('/imagen', authenticate, requireRole(3), upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen o el formato no es válido' });
    }
    res.json({ url: req.file.path });
  } catch (err) {
    console.error('Error al subir imagen:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error de upload: ${err.message}` });
  }
  if (err.message && err.message.includes('Cloudinary')) {
    return res.status(500).json({ error: 'Error al subir a Cloudinary. Verifica CLOUDINARY_URL.' });
  }
  next(err);
});

export default router;
