// Punto de entrada del servidor Express — configura middlewares y rutas
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import clubesRoutes from './routes/clubes.js';
import inscripcionesRoutes from './routes/inscripciones.js';
import avisosRoutes from './routes/avisos.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
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
app.use('/api/avisos', avisosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor de Clubs UNID corriendo en puerto ${PORT}`);
});

// ✦ A
