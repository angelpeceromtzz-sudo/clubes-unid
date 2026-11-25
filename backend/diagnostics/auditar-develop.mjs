import dotenv from 'dotenv';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirConfigPg } from '../lib/dbTls.js';

const { Client } = pg;
const directorio = path.dirname(fileURLToPath(import.meta.url));
const directorioBackend = path.resolve(directorio, '..');
dotenv.config({ path: path.join(directorioBackend, '.env') });

const referenciaEsperada = 'mhbhdrgpqqpcwhrtbnmw';
const urlBase = process.env.SUPABASE_DEVELOP_DATABASE_URL;

if (!urlBase) {
  console.error('Falta SUPABASE_DEVELOP_DATABASE_URL en backend/.env.');
  process.exit(1);
}

let url;
try {
  url = new URL(urlBase);
} catch {
  console.error('La URL de desarrollo no tiene un formato válido.');
  process.exit(1);
}

const referenciaEnHost = url.hostname.toLowerCase().includes(referenciaEsperada);
const referenciaEnUsuario = url.username.toLowerCase().includes(referenciaEsperada);
if (!referenciaEnHost && !referenciaEnUsuario) {
  console.error('La conexión no identifica el proyecto Supabase clubsunid-develop esperado. Auditoría cancelada.');
  process.exit(1);
}

let client;
try {
  const config = construirConfigPg({
    ...process.env,
    DATABASE_URL: urlBase,
  });
  client = new Client({
    ...config,
    application_name: 'clubsunid-develop-readonly-audit',
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '15s'");
  const sql = await readFile(path.join(directorio, 'auditar-develop.sql'), 'utf8');
  const resultado = await client.query(sql);
  await client.query('ROLLBACK');
  console.log(JSON.stringify(resultado.rows[0] ?? {}, null, 2));
} catch (error) {
  if (client) {
    try { await client.query('ROLLBACK'); } catch { /* cierra una conexión fallida */ }
  }
  console.error(`Auditoría cancelada (${error?.code ?? 'error'}). No se mostró la URL ni el mensaje del servidor.`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await client.end(); } catch { /* evita imprimir datos de conexión */ }
  }
}
