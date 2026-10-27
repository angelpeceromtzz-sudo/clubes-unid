import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

// Solo memoria: cualquier acceso accidental a noticias hace fallar la prueba.
process.env.JWT_SECRET = 'fechas-academicas-test-secret';
let registros = [];
let consultas = [];
let siguienteId = 1;
let rolActual = 3;
pool.query = async (sql, valores = []) => {
  if (sql.includes('FROM usuarios u') && sql.includes('deleted_at')) {
    return { rows: [{ id_usuario: valores[0], nombre_completo: 'Prueba', id_rol: rolActual }] };
  }
  consultas.push({ sql, valores });
  if (sql.includes('historial_admin')) return { rows: [] };
  assert.match(sql, /fechas_calendario/);
  assert.doesNotMatch(sql, /\bnoticias\b|categoria_evento|solo_calendario/);
  if (sql.includes('INSERT INTO')) {
    const [titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, publicada, mostrar_en_mural, id_autor] = valores;
    const fila = { id_fecha: siguienteId++, titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, publicada, mostrar_en_mural, id_autor };
    registros.push(fila);
    return { rows: [fila] };
  }
  if (sql.startsWith('UPDATE')) {
    const [titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, publicada, mostrar_en_mural, id] = valores;
    const fila = registros.find((item) => item.id_fecha === Number(id));
    Object.assign(fila, { titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, publicada, mostrar_en_mural });
    return { rows: [fila] };
  }
  if (sql.startsWith('DELETE')) {
    const filas = registros.filter((item) => item.id_fecha === Number(valores[0]));
    registros = registros.filter((item) => item.id_fecha !== Number(valores[0]));
    return { rows: filas };
  }
  return { rows: registros.filter((item) => valores.length ? item.id_fecha === Number(valores[0]) : !sql.includes('publicada = TRUE') || item.publicada) };
};
const { default: router } = await import('../routes/calendario.js');
const app = express();
app.use(express.json());
app.use('/calendario', router);
const servidor = app.listen(0, '127.0.0.1');
await new Promise((resolve) => servidor.once('listening', resolve));
const base = `http://127.0.0.1:${servidor.address().port}/calendario`;
after(async () => { await new Promise((resolve) => servidor.close(resolve)); await pool.end(); });
async function enviar(metodo, datos, rol = 3, ruta = '') {
  consultas = [];
  rolActual = rol ?? 3;
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: 7, id_rol: rol, nombre_completo: 'Prueba' }, process.env.JWT_SECRET)}`;
  const respuesta = await fetch(`${base}${ruta}`, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
  return { status: respuesta.status, datos: await respuesta.json() };
}
const fecha = { titulo: ' Examen final ', tipo_fecha: 'examen', fecha_inicio: '2020-12-14', fecha_fin: '2020-12-17', nota: ' Solo vespertino ' };

test('captura fechas pasadas de los siete tipos sin noticia ni evento', async () => {
  registros = [];
  for (const tipo_fecha of ['examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite']) {
    const resultado = await enviar('POST', { ...fecha, tipo_fecha });
    assert.equal(resultado.status, 201);
    assert.equal(resultado.datos.titulo, 'Examen final');
    assert.equal(resultado.datos.nota, 'Solo vespertino');
    assert.equal(resultado.datos.tipo_fecha, tipo_fecha);
    assert.equal('id_noticia' in resultado.datos, false);
    assert.equal('categoria_evento' in resultado.datos, false);
    assert.ok(consultas.some((item) => item.sql.includes('INSERT INTO fechas_calendario')));
  }
  const sencilla = await enviar('POST', { titulo: 'Pago', tipo_fecha: 'pago', fecha_inicio: '2020-09-01' });
  assert.equal(sencilla.status, 201);
  assert.equal(sencilla.datos.fecha_fin, null);
  assert.equal(sencilla.datos.nota, null);
});

test('solo administración y rectoría administran las fechas; la consulta pública no exige sesión', async () => {
  for (const rol of [null, 1, 2, 5]) {
    for (const [metodo, ruta] of [['POST', ''], ['PUT', '/1'], ['DELETE', '/1'], ['GET', '/admin']]) {
      assert.equal((await enviar(metodo, metodo === 'GET' ? null : fecha, rol, ruta)).status, rol ? 403 : 401);
      assert.equal(consultas.length, 0);
    }
  }
  for (const rol of [3, 4]) assert.equal((await enviar('POST', fecha, rol)).status, 201);
  assert.equal((await enviar('GET', null, null)).status, 200);
});

test('valida concepto, tipo, fechas reales, rango y visibilidad antes de guardar', async () => {
  for (const cambio of [{ titulo: '' }, { titulo: 'x'.repeat(201) }, { tipo_fecha: 'social' }, { fecha_inicio: '2027-02-29' }, { fecha_inicio: null }, { fecha_fin: '2020-12-13' }, { fecha_fin: '2020-13-01' }, { nota: 3 }, { publicada: 'true' }, { mostrar_en_mural: 'true' }]) {
    assert.equal((await enviar('POST', { ...fecha, ...cambio })).status, 400);
    assert.equal(consultas.length, 0);
  }
  assert.equal((await enviar('POST', { ...fecha, fecha_inicio: '2028-02-29', fecha_fin: '2028-02-29' })).status, 201);
  for (const campo of ['categoria', 'categoria_evento', 'solo_calendario', 'fecha_evento']) {
    assert.equal((await enviar('POST', { ...fecha, [campo]: 'evento' })).status, 400);
    assert.equal(consultas.length, 0);
  }
  assert.equal((await enviar('POST', { ...fecha, mostrar_en_mural: true })).status, 201);
});

test('edita y oculta una fecha sin modificar noticias; conserva los datos omitidos', async () => {
  const creada = (await enviar('POST', fecha)).datos;
  const ruta = `/${creada.id_fecha}`;
  assert.equal((await enviar('PUT', { fecha_inicio: '2020-12-18' }, 3, ruta)).status, 400);
  assert.equal(consultas.some((item) => item.sql.startsWith('UPDATE')), false);
  const cambio = await enviar('PUT', { publicada: false }, 4, ruta);
  assert.equal(cambio.status, 200);
  assert.equal(cambio.datos.publicada, false);
  assert.equal(cambio.datos.tipo_fecha, 'examen');
  assert.equal(cambio.datos.fecha_fin, '2020-12-17');
  assert.equal((await enviar('GET', null, null)).datos.some((item) => item.id_fecha === creada.id_fecha), false);
  assert.equal((await enviar('GET', null, 3, '/admin')).datos.some((item) => item.id_fecha === creada.id_fecha), true);
  const limpia = await enviar('PUT', { fecha_fin: null, nota: null, publicada: true }, 3, ruta);
  assert.equal(limpia.datos.fecha_fin, null);
  assert.equal(limpia.datos.nota, null);
  assert.equal((await enviar('DELETE', null, 3, ruta)).status, 200);
  assert.equal((await enviar('GET', null, 3, '/admin')).datos.some((item) => item.id_fecha === creada.id_fecha), false);
  assert.equal((await enviar('DELETE', null, 3, ruta)).status, 404);
});

test('rechaza identificadores inválidos y fechas inexistentes', async () => {
  for (const metodo of ['PUT', 'DELETE']) {
    for (const id of ['0', '-1', 'no-es-id', '999999999999999999']) {
      assert.equal((await enviar(metodo, fecha, 3, `/${id}`)).status, 400);
      assert.equal(consultas.length, 0);
    }
    assert.equal((await enviar(metodo, fecha, 3, '/987654')).status, 404);
  }
});
