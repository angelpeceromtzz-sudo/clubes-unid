import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
try {
  await pool.query(sql);
  console.log('ok');
} catch(e) {
  console.error('code:', e.code);
  console.error('msg:', e.message);
  console.error('pos:', e.position);
} finally {
  await pool.end();
}
