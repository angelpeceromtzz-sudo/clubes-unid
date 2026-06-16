// Conexión a la base de datos PostgreSQL usando un pool de conexiones
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Configuración híbrida del pool (Producción en la nube / Desarrollo local)
const isProduction = process.env.DATABASE_URL ? true : false;

const pool = new Pool({
  // Si existe DATABASE_URL (en Render), la usa directamente. Si no, usa los campos sueltos locales.
  connectionString: process.env.DATABASE_URL,
  
  ...(isProduction 
    ? {
        // Configuración requerida por Render para conexiones seguras SSL
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        // Tus credenciales locales por defecto
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'clubs_bd',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
  )
});

// Fuerza codificación UTF-8 en las consultas
pool.query("SET client_encoding TO 'UTF8';").catch(() => {});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});


export default pool;  

// ✦ A