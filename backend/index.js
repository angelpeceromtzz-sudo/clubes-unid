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

const app = express();
const PORT = process.env.PORT || 4000;

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN }));
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
