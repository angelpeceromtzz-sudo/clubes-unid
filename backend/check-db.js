import pool from './db.js';

async function check() {
  // Check status values
  const statuses = await pool.query('SELECT DISTINCT status FROM formularios');
  console.log('Statuses in DB:', statuses.rows.map(r => r.status));

  // Check constraints on formularios
  const constraints = await pool.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'formularios'::regclass
  `);
  console.log('Constraints on formularios:');
  constraints.rows.forEach(r => console.log(`  ${r.conname} (${r.contype}): ${r.def}`));

  // Check if convocatorias table exists
  const tables = await pool.query(`
    SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'convocatorias'
  `);
  console.log('convocatorias table exists:', tables.rows.length > 0);

  await pool.end();
}

check().catch(err => { console.error(err); process.exit(1); });
