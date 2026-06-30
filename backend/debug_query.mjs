import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'clubs_bd',
  user: 'postgres',
  password: 'angel2007',
});

async function main() {
  try {
    const r = await pool.query(
      `SELECT f.id_formulario, f.id_club, f.id_alumno, f.status, c.nombre_club
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       ORDER BY f.id_alumno, f.fecha_envio DESC`
    );
    console.log('=== DATOS DE FORMULARIOS ===');
    console.log(JSON.stringify(r.rows, null, 2));
    
    console.log('\n=== ANÁLISIS DE DUPLICADOS ===');
    const ids = r.rows.map(r => r.id_formulario);
    const seen = new Map();
    ids.forEach((id, i) => {
      if (seen.has(id)) {
        console.log(`DUPLICADO: id_formulario=${id} en índices ${seen.get(id)} y ${i}`);
      } else {
        seen.set(id, i);
      }
    });
    console.log(`Total: ${r.rows.length} registros, ${seen.size} IDs únicos`);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
}

main();
