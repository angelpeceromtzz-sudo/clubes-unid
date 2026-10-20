import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { migrate } from './migrate.js';
await migrate();

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
import adminDashboardRoutes from './routes/adminDashboard.js';
import catalogosRoutes from './routes/catalogos.js';
import encuestasRoutes from './routes/encuestas.js';
import diapositivasHeroRoutes from './routes/diapositivasHero.js';
import noticiasRoutes from './routes/noticias.js';
import { limitadorGlobal } from './lib/rateLimits.js';
import { cabecerasSeguridad } from './lib/securityHeaders.js';
import { manejadorErroresGlobal } from './lib/errorHandler.js';
import asistenciaRoutes from './routes/asistencia.js';

const app = express();
// Render termina TLS y reenvía con X-Forwarded-For (un solo proxy).
// Pendiente de verificar en Render: si algún día hay un proxy adicional
// (p. ej. CDN), el valor debe ajustarse al número real de saltos.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

// Cabeceras de seguridad (H5b) antes de todo: también aplican a respuestas
// de error, 404 y preflight.
app.use(cabecerasSeguridad);

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

// Cobertura general de API por IP (H5a): red de seguridad única para todas
// las rutas /api. Va después de CORS (los OPTIONS de preflight los responde
// CORS) y antes de express.json para frenar también el costo de parseo.
app.use('/api', limitadorGlobal);

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
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/diapositivas-hero', diapositivasHeroRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/encuestas', encuestasRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/asistencia', asistenciaRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  // H19: método y ruta solo quedan en el log del servidor; la respuesta no
  // expone la estructura interna de endpoints en la UI.
  console.warn(`Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// H15: respaldo de errores que escapen de los handlers (incluye next(err)
// del callback de CORS). Sin este manejador, el manejador por defecto de
// Express puede devolver err.message y el stack en HTML.
app.use(manejadorErroresGlobal);

app.listen(PORT, () => {
  console.log(`Servidor de Clubs UNID corriendo en puerto ${PORT}`);
});
