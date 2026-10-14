import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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