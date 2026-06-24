// Punto de entrada del servidor Express — configura middlewares y rutas
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { migrate } from './migrate.js';
migrate();

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import clubesRoutes from './routes/clubes.js';
import inscripcionesRoutes from './routes/inscripciones.js';
import avisosRoutes from './routes/avisos.js';
import formulariosRoutes from './routes/formularios.js';
import notificacionesRoutes from './routes/notificaciones.js';
import historialRoutes from './routes/historial.js';
import convocatoriasRoutes from './routes/convocatorias.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clubes', clubesRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/convocatorias', convocatoriasRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all 404: cualquier ruta no definida responde JSON, nunca HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor de Clubs UNID corriendo en puerto ${PORT}`);
});

// ✦ A
