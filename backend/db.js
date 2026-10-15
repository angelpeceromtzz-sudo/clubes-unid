import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { TIMEZONE_IANA } from './config/timezone.js';

// Anclar .env a este archivo: con dotenv.config() simple solo funciona si el
// proceso arranca con cwd = backend/ (falla al lanzar desde la raiz o por servicio).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pkg;

// Falla con un error claro en vez de caer a credenciales por defecto.
function requerido(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`FATAL: falta la variable de entorno ${nombre}. Revisa backend/.env (ver backend/.env.example).`);
    process.exit(1);
  }
  return valor;
}

const isProduction = Boolean(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Zona horaria institucional (Campeche, México) aplicada al iniciar cada conexión
  options: `-c TimeZone=${TIMEZONE_IANA}`,

  ...(isProduction
    ? {
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'clubs_bd',
        user: process.env.DB_USER || 'postgres',
        password: requerido('DB_PASSWORD'),
      }
  )
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export default pool;