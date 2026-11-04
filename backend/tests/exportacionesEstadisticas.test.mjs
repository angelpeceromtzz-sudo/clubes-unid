import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';

process.env.JWT_SECRET = 'secreto-ficticio-exportaciones';
process.env.DB_PASSWORD = 'ficticio';
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const { default: pool } = await import('../db.js');
const { default: router } = await import('../routes/estadisticas.js');
const consultas = [];
pool.query = async (sql, params = []) => {
  if (/WHERE u.id_usuario = \$1 AND u.deleted_at IS NULL/.test(sql)) return { rows: [{ id_usuario: params[0], id_rol: params[0] === 1 ? 1 : 3, nombre_completo: 'Prueba' }] };
  consultas.push({ sql, params });
  let rows;
  if (/SELECT nombre_club FROM clubes/.test(sql)) rows = params[0] === 999 ? [] : [{ nombre_club: 'Robótica' }];
  else if (/SELECT nombre, fecha_inicio/.test(sql)) rows = [{ nombre: 'Otoño 2026', fecha_inicio: '2026-09-01', fecha_fin: '2026-12-20' }];
  else if (/SELECT nombre FROM cat_licenciaturas/.test(sql)) rows = [{ nombre: 'Ingeniería' }];
  else if (/AS cupo_total/.test(sql)) rows = [{ cupo_total: 40, ocupado_total: 10 }];
  else if (/SELECT f.status/.test(sql)) rows = [{ status: 'Pendiente', total: 3 }];
  else if (/COUNT\(\*\) FILTER/.test(sql)) rows = [{ nombre_club: 'Robótica', presentes: 6, ausentes: 2, justificadas: 1, total: 9 }];
  else if (/SELECT e.id_encuesta/.test(sql)) rows = [{ titulo: 'Intereses', estado: 'activa', total_respuestas: 8 }];
  else if (/SELECT l.id_licenciatura/.test(sql)) rows = [{ nombre: 'Ingeniería', respuestas: 8 }];
  else if (/AS respuestas/.test(sql)) rows = [{ respuestas: 0 }];
  else if (/to_char\(/.test(sql)) rows = [{ mes: '2026-11', total: 3 }];
  else if (/SELECT c.id_club, c.nombre_club, c.cupo_maximo/.test(sql)) rows = [{ nombre_club: 'Robótica', cupo_maximo: 20, cupo_ocupado: 5 }];
  else if (/COUNT\(/.test(sql)) rows = [{ total: 20 }];
  else throw new Error(`Consulta sin simular: ${sql}`);
  return { rows };
};
let servidor;
let base;
before(async () => {
  const app = express();
  app.use('/api/estadisticas', router);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}/api/estadisticas/ejecutivo/exportar`;
});
after(() => servidor?.close());
function pedir(query = '', id = 3) {
  consultas.length = 0;
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '5m' });
  return fetch(`${base}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
}

test('la descarga real de Excel conserva datos, MIME, filtros legibles y el periodo completo', async () => {
  const respuesta = await pedir('formato=xlsx&id_club=1&id_periodo=2&carrera=3&estado=Pendiente');
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /spreadsheetml/);
  assert.match(respuesta.headers.get('content-disposition'), /\.xlsx/);
  const libro = XLSX.read(Buffer.from(await respuesta.arrayBuffer()), { type: 'buffer' });
  assert.equal(libro.Sheets.Clubes.A5.v, 'Robótica');
  assert.equal(libro.Sheets.Alcance.B8.v, 'Otoño 2026');
  const postulaciones = consultas.filter(({ sql }) => /FROM formularios f/.test(sql));
  assert.equal(postulaciones.length, 2);
  for (const { sql, params } of postulaciones) {
    assert.match(sql, /f.fecha_envio >= \$4::date/);
    assert.match(sql, /f.fecha_envio < \(\$5::date \+ INTERVAL '1 day'\)/);
    assert.deepEqual(params, [1, 3, 'Pendiente', '2026-09-01', '2026-12-20']);
  }
  const inscripciones = consultas.find(({ sql }) => /to_char\(i.fecha_inscripcion/.test(sql));
  assert.match(inscripciones.sql, /i.fecha_inscripcion < \(\$3::date \+ INTERVAL '1 day'\)/);
  assert.deepEqual(inscripciones.params, [1, '2026-09-01', '2026-12-20']);
  const ocupacionGlobal = consultas.find(({ sql }) => /AS cupo_total/.test(sql));
  assert.deepEqual(ocupacionGlobal.params, [], 'El KPI de ocupación usa todos los clubes activos como el resumen');
});

test('el CSV conserva acentos y separa correctamente las secciones', async () => {
  const respuesta = await pedir('formato=csv');
  assert.equal(respuesta.status, 200);
  const contenido = Buffer.from(await respuesta.arrayBuffer());
  assert.deepEqual([...contenido.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.match(contenido.toString('utf8'), /Alcance[\s\S]*KPIs[\s\S]*Participación/);
});

test('filtros inválidos o inexistentes se rechazan y no generan un reporte general por accidente', async () => {
  assert.equal((await pedir('formato=xlsx&id_periodo=abc')).status, 400);
  assert.equal(consultas.length, 0);
  assert.equal((await pedir('formato=xlsx&id_club=999')).status, 404);
  assert.equal((await pedir('formato=pdf')).status, 400);
});

test('la exportación mantiene la autenticación y los permisos administrativos', async () => {
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await pedir('formato=xlsx', 1)).status, 403);
});
