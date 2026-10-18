import pkg from 'pg';
import dns from 'node:dns';
import dotenv from 'dotenv';
import { construirConfigPg } from './lib/dbTls.js';

dotenv.config();

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

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export default pool;