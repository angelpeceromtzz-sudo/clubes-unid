import { after, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { errorPeriodoEvento, fechaEventoValida } from '../lib/fechasEvento.js';

// Todas las consultas se sustituyen antes de montar las rutas. No se conecta a una base real.
process.env.JWT_SECRET = 'calendario-test-secret';
const consultas = [];
let actual = {};
let fallarMural = false;
let liberadas = 0;
let rolActual = 3;
pool.query = async (sql, valores = []) => {
  if (sql.includes('FROM usuarios u') && sql.includes('deleted_at')) {
    return { rows: [{ id_usuario: valores[0], nombre_completo: 'Prueba', id_rol: rolActual }] };
  }
  consultas.push({ sql, valores });
  if (sql.includes('SELECT url_imagen')) return { rows: [actual] };
  if (sql.includes('INSERT INTO notificaciones')) return { rows: [{ id_notificacion: 9 }] };
  return { rows: [{ id_noticia: 8, titulo: 'Prueba', publicada: true }] };
};
pool.connect = async () => ({ query: async (sql, valores) => {
  if (fallarMural && sql.includes('INSERT INTO noticias')) throw new Error('Fallo simulado');
  return pool.query(sql, valores);
}, release: () => { liberadas += 1; } });
const { default: router } = await import('../routes/noticias.js');
const { default: notificacionesRouter } = await import('../routes/notificaciones.js');
const app = express();
app.use(express.json());
app.use('/noticias', router);
app.use('/notificaciones', notificacionesRouter);
const servidor = app.listen(0, '127.0.0.1');
await new Promise((resolve) => servidor.once('listening', resolve));
const base = `http://127.0.0.1:${servidor.address().port}`;
after(async () => { await new Promise((resolve) => servidor.close(resolve)); await pool.end(); });

async function enviar(method, datos, rol = 3, ruta = '', modulo = 'noticias') {
  consultas.length = 0;
  rolActual = rol ?? 3;
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: 7, id_rol: rol, nombre_completo: 'Prueba' }, process.env.JWT_SECRET)}`;
  const respuesta = await fetch(`${base}/${modulo}${ruta}`, { method, headers, body: datos ? JSON.stringify(datos) : undefined });
  return { status: respuesta.status, datos: await respuesta.json() };
}
const datosEvento = { titulo: 'Jornada de clubes', contenido: 'Actividades de la comunidad', categoria: 'evento', fecha_evento: '2099-12-20', fecha_fin_evento: '2100-01-06', categoria_evento: 'social' };

test('valida fechas reales, fin opcional e inicio anterior al fin', () => {
  assert.equal(fechaEventoValida('2028-02-29'), true);
  for (const invalida of ['2027-02-29', '2026-04-31', 'no-es-fecha', 123]) assert.equal(fechaEventoValida(invalida), false);
  assert.equal(errorPeriodoEvento('2026-10-16', null), null);
  assert.equal(errorPeriodoEvento('2026-10-16', '2026-10-16'), null);
  assert.match(errorPeriodoEvento('2026-10-16', '2026-10-15'), /anterior/);
});

test('solo administración, rectoría y responsable del mural pueden redactar', async () => {
  for (const rol of [null, 1, 2, 5]) {
    assert.equal((await enviar('POST', datosEvento, rol)).status, rol ? 403 : 401);
    assert.equal(consultas.length, 0);
  }
  for (const rol of [3, 4, 6]) assert.equal((await enviar('POST', datosEvento, rol)).status, 201);
});

test('guarda las tres categorías de eventos y el periodo completo', async () => {
  for (const categoria of ['social', 'deportivo', 'cultural']) {
    assert.equal((await enviar('POST', { ...datosEvento, categoria_evento: categoria })).status, 201);
    const insercion = consultas.find((item) => item.sql.includes('INSERT INTO noticias'));
    assert.equal(insercion.valores[10], categoria);
    assert.equal(insercion.valores[13], '2100-01-06');
  }
});

test('rechaza periodos inválidos al crear y al cambiar parcialmente la fecha de inicio', async () => {
  assert.equal((await enviar('POST', { ...datosEvento, fecha_fin_evento: '2099-12-19' })).status, 400);
  assert.equal(consultas.length, 0);
  actual = { categoria: 'evento', fecha_evento: '2099-12-20', fecha_fin_evento: '2100-01-06', status: 'draft', id_autor: 7 };
  assert.equal((await enviar('PUT', { fecha_evento: '2100-01-10' }, 3, '/8')).status, 400);
  assert.equal(consultas.some((item) => item.sql.includes('UPDATE noticias')), false);
  assert.equal((await enviar('PUT', { fecha_fin_evento: '2100-02-30' }, 3, '/8')).status, 400);
});

test('permite quitar el fin de un periodo y conserva los datos omitidos en otras ediciones', async () => {
  actual = { categoria: 'evento', fecha_evento: '2099-12-20', fecha_fin_evento: '2100-01-06', status: 'draft', id_autor: 7 };
  assert.equal((await enviar('PUT', { fecha_fin_evento: null }, 3, '/8')).status, 200);
  let cambio = consultas.find((item) => item.sql.includes('UPDATE noticias'));
  assert.equal(cambio.valores[16], true);
  assert.equal(cambio.valores[17], null);
  assert.equal((await enviar('PUT', { titulo: 'Título corregido' }, 3, '/8')).status, 200);
  cambio = consultas.find((item) => item.sql.includes('UPDATE noticias'));
  assert.equal(cambio.valores[16], false);
  assert.equal(cambio.valores[18], null);
});

test('rectoría publica avisos de mural y la consulta pública exige aprobación y selección explícita', async () => {
  assert.equal((await enviar('POST', { titulo: 'Aviso', contenido: 'Información', mostrar_en_mural: true }, 4)).status, 201);
  assert.equal(consultas.find((item) => item.sql.includes('INSERT INTO noticias')).valores[14], true);
  assert.equal((await enviar('GET', null, null, '/mural')).status, 200);
  assert.match(consultas[0].sql, /publicada = TRUE AND mostrar_en_mural = TRUE AND solo_calendario = FALSE/);
  assert.match(consultas[0].sql, /status = 'published'/);
  assert.equal((await enviar('POST', { titulo: 'Aviso', contenido: 'Información', mostrar_en_mural: 'true' })).status, 400);
});

test('las fechas académicas no pueden crearse ni editarse como eventos', async () => {
  for (const categoria of ['examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite']) {
    assert.equal((await enviar('POST', { ...datosEvento, categoria_evento: categoria })).status, 400);
    assert.equal(consultas.length, 0);
    assert.equal((await enviar('PUT', { categoria_evento: categoria }, 3, '/8')).status, 400);
    assert.equal(consultas.length, 0);
  }
  const resultado = await enviar('POST', { ...datosEvento, solo_calendario: true });
  assert.equal(resultado.status, 400);
  assert.match(resultado.datos.error, /Calendario académico/);
  assert.equal(consultas.length, 0);
  assert.equal((await enviar('PUT', { solo_calendario: true }, 3, '/8')).status, 400);
});

test('guarda el aviso y su tarjeta en una transacción; solo rectoría publica directamente en el mural', async () => {
  for (const rol of [3, 4]) {
    const resultado = await enviar('POST', { titulo: 'Aviso', mensaje: 'Información pública', audiencia: 'global', mostrar_en_mural: true, url_imagen: 'https://example.com/cartel.png' }, rol, '', 'notificaciones');
    assert.equal(resultado.status, 201);
    assert.equal(resultado.datos.publicacion_mural.id_noticia, 8);
    assert.equal(consultas[0].sql, 'BEGIN');
    assert.equal(consultas.some((item) => item.sql === 'COMMIT'), true);
    assert.equal(consultas.find((item) => item.sql.includes('INSERT INTO noticias')).valores[2], 'https://example.com/cartel.png');
    assert.equal(consultas.find((item) => item.sql.includes('INSERT INTO noticias')).valores[4], rol === 4 ? 'published' : 'draft');
  }
  assert.equal(liberadas, 2);
});

test('no publica mensajes de audiencias limitadas o de líderes de club en el mural público', async () => {
  const datos = { titulo: 'Aviso', mensaje: 'Información privada', audiencia: 'global', mostrar_en_mural: true };
  for (const rol of [1, 2, 5]) assert.equal((await enviar('POST', datos, rol, '', 'notificaciones')).status, 403);
  for (const cambio of [{ audiencia: 'alumnos' }, { audiencia: 'presidentes' }, { audiencia: 'club', id_club: 1 }, { id_destinatario: 7 }]) {
    assert.equal((await enviar('POST', { ...datos, ...cambio }, 3, '', 'notificaciones')).status, 403);
    assert.equal(consultas.length, 0);
  }
});

test('revierte el envío si falla la publicación del mural para evitar avisos duplicados al reintentar', async () => {
  fallarMural = true;
  const silenciar = mock.method(console, 'error', () => {});
  try {
    const resultado = await enviar('POST', { titulo: 'Aviso', mensaje: 'Información pública', audiencia: 'global', mostrar_en_mural: true }, 3, '', 'notificaciones');
    assert.equal(resultado.status, 500);
    assert.equal(consultas.some((item) => item.sql === 'ROLLBACK'), true);
    assert.equal(consultas.some((item) => item.sql === 'COMMIT'), false);
    assert.equal(liberadas, 3);
  } finally { fallarMural = false; silenciar.mock.restore(); }
});
