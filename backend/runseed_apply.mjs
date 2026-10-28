import fs from 'fs';
import pool from './db.js';
const sql = fs.readFileSync('./seed.sql','utf8');
try {
  await pool.query(sql);
  console.log('SEED_OK');
} catch(e) {
  console.error('ERR',e.message);
} finally {
  await pool.end();
}
