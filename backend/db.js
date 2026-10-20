import pkg from 'pg';
import dns from 'node:dns';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { construirConfigPg } from './lib/dbTls.js';
import { TIMEZONE_IANA } from './config/timezone.js';

// Anclar .env a este archivo: con dotenv.config() simple solo funciona si el
// proceso arranca con cwd = backend/ (falla al lanzar desde la raiz o por servicio).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Render no alcanza por IPv6 a hosts como Neon/Supabase (ENETUNREACH con
// direcciones AAAA). Prioriza IPv4 antes de que pg resuelva DATABASE_URL.
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pkg;

// La construcción de la configuración (modo remoto con TLS verificado o modo
// local explícito) vive en lib/dbTls.js. Ante cualquier error de configuración
// se aborta el arranque con el mensaje claro, sin crear el pool.
let config;
try {
  config = construirConfigPg(process.env);
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
}

// PBI-05: cada conexión arranca con la zona horaria institucional para que
// CURRENT_DATE y los cast ::date del módulo de asistencia se resuelvan en
// America/Merida aunque el servidor esté en UTC. No toca la configuración
// TLS que construye dbTls (rejectUnauthorized: true con CA propia).
config.options = `-c TimeZone=${TIMEZONE_IANA}`;

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export default pool;
