import 'dotenv/config';
import pool from './db.js';
const r = await pool.query(`SELECT id_encuesta, slug, titulo, estado, fecha_inicio, fecha_fin,
  (SELECT COUNT(*) FROM respuestas_encuesta x WHERE x.id_encuesta = e.id_encuesta) AS resp
  FROM encuestas e ORDER BY id_encuesta`);
console.log('ENCUESTAS=' + r.rows.length);
for (const e of r.rows) console.log(JSON.stringify(e));
const q = await pool.query(`SELECT p.id_pregunta,p.id_encuesta,p.tipo,p.es_obligatoria,p.escala_min,p.escala_max,
  (SELECT COUNT(*) FROM opciones_pregunta o WHERE o.id_pregunta=p.id_pregunta) AS ops FROM preguntas p ORDER BY p.id_encuesta,p.orden`);
console.log('PREGUNTAS=' + q.rows.length);
for (const x of q.rows) console.log(JSON.stringify(x));
pool.end();
