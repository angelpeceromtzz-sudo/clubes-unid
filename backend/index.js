import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { migrate } from './migrate.js';
migrate();

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import clubesRoutes from './routes/clubes.js';
import inscripcionesRoutes from './routes/inscripciones.js';
import avisosRoutes from './routes/avisos.js';
import formulariosRoutes from './routes/formularios.js';
import ofertasRoutes from './routes/ofertas.js';
import notificacionesRoutes from './routes/notificaciones.js';
import historialRoutes from './routes/historial.js';
import convocatoriasRoutes from './routes/convocatorias.js';
import estadisticasRoutes from './routes/estadisticas.js';
import uploadRoutes from './routes/upload.js';
import horariosRoutes from './routes/horarios.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (como Postman) o si está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clubes', clubesRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/convocatorias', convocatoriasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/ofertas', ofertasRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/admin', adminRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`Servidor de Clubs UNID corriendo en puerto ${PORT}`);
});
