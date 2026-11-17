import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { hoyEnCampus } from '../lib/fechasEvento.js';

// Requiere una base de pruebas explícita. Nunca usa backend/.env ni sus tablas.
const databaseUrl = process.env.NOTICIAS_TEST_DATABASE_URL;

describe('integración de aprobación, eventos y mural', { skip: !databaseUrl }, () => {
  const esquema = `noticias_test_${randomBytes(6).toString('hex')}`;
  const cliente = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  let pool, servidor, base, sql, conectado = false, creado = false;

  before(async () => {
    await cliente.connect(); conectado = true;
    await cliente.query(`CREATE SCHEMA "${esquema}"`); creado = true;
    await cliente.query(`SET search_path TO "${esquema}"`);
    sql = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');

    // Simula la versión de Calendario-mural anterior al flujo de aprobación.
    const inicio = sql.indexOf('-- PBI-17 — Flujo de aprobación previa de publicaciones');
    const fin = sql.indexOf('CREATE TABLE IF NOT EXISTS intereses_eventos', inicio);
    assert.ok(inicio >= 0 && fin > inicio);
    await cliente.query(sql.slice(0, inicio) + sql.slice(fin));
    await cliente.query(`INSERT INTO noticias (titulo, contenido, publicada) VALUES
      ('Publicación anterior', 'Se conserva visible', TRUE), ('Borrador anterior', 'Se conserva oculto', FALSE)`);
    await cliente.query(sql);
    await cliente.query(`INSERT INTO usuarios (id_usuario, nombre_completo, correo_institucional, id_rol) VALUES
      (1, 'Alumno QA', 'alumno@example.test', 1),
      (3, 'Admin QA', 'admin@example.test', 3),
      (4, 'Rectoría QA', 'rectoria@example.test', 4),
      (6, 'Responsable QA', 'responsable@example.test', 6),
      (66, 'Otro responsable QA', 'otro@example.test', 6)`);

    process.env.JWT_SECRET = 'noticias-integracion-solo-pruebas';
    ({ default: pool } = await import('../db.js'));
    pool.query = cliente.query.bind(cliente);
    pool.connect = async () => ({ query: cliente.query.bind(cliente), release() {} });
    const [{ default: noticias }, { default: notificaciones }] = await Promise.all([
      import('../routes/noticias.js'), import('../routes/notificaciones.js'),
    ]);
    const app = express(); app.use(express.json());
    app.use('/noticias', noticias); app.use('/notificaciones', notificaciones);
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });

  after(async () => {
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
    if (creado) await cliente.query(`DROP SCHEMA "${esquema}" CASCADE`);
    if (conectado) await cliente.end();
    if (pool) await pool.end();
  });

  async function enviar(metodo, ruta, datos, rol = 3, usuario = rol) {
    const headers = { 'Content-Type': 'application/json' };
    if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: usuario, id_rol: rol, nombre_completo: 'Editor QA' }, process.env.JWT_SECRET)}`;
    const respuesta = await fetch(`${base}${ruta}`, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
    return { status: respuesta.status, datos: await respuesta.json() };
  }

  const inicioEvento = new Date(`${hoyEnCampus()}T12:00:00Z`);
  inicioEvento.setUTCDate(inicioEvento.getUTCDate() + 30);
  const finEvento = new Date(inicioEvento);
  finEvento.setUTCDate(finEvento.getUTCDate() + 17);
  const evento = { titulo: 'Evento con periodo', contenido: 'Actividad para el campus', categoria: 'evento',
    fecha_evento: inicioEvento.toISOString().slice(0, 10), fecha_fin_evento: finEvento.toISOString().slice(0, 10), hora_evento: '10:30',
    lugar_evento: 'Auditorio', categoria_evento: 'cultural', mostrar_en_mural: true };

  async function verificarVisible(id, visible, rol = 1) {
    for (const ruta of ['/noticias', '/noticias/eventos', '/noticias/mural']) {
      const respuesta = await enviar('GET', ruta, null, rol);
      assert.equal(respuesta.status, 200);
      assert.equal(respuesta.datos.some((fila) => fila.id_noticia === id), visible, ruta);
    }
  }

  test('noticias, eventos y avisos del mural requieren sesión', async () => {
    for (const ruta of ['/noticias', '/noticias/eventos', '/noticias/mural']) {
      assert.equal((await enviar('GET', ruta, null, null)).status, 401, ruta);
    }
  });

  test('la migración conserva publicaciones anteriores y agrega el rol responsable', async () => {
    const anteriores = await cliente.query('SELECT titulo, status, publicada FROM noticias ORDER BY id_noticia');
    assert.deepEqual(anteriores.rows.map((fila) => [fila.status, fila.publicada]), [['published', true], ['draft', false]]);
    assert.equal((await cliente.query('SELECT nombre_rol FROM cat_roles WHERE id_rol = 6')).rows[0].nombre_rol, 'responsable_mural');
  });

  test('el responsable conserva periodo y selección del mural al editar solo sus borradores', async () => {
    assert.equal((await enviar('POST', '/noticias', evento, 1)).status, 403);
    const creada = await enviar('POST', '/noticias', evento, 6);
    assert.equal(creada.status, 201);
    assert.equal(creada.datos.status, 'draft');
    assert.equal(creada.datos.publicada, false);
    assert.equal(creada.datos.fecha_fin_evento, evento.fecha_fin_evento);
    assert.equal(creada.datos.mostrar_en_mural, true);
    const ruta = `/noticias/${creada.datos.id_noticia}`;
    assert.equal((await enviar('PUT', ruta, { titulo: 'No autorizado' }, 6, 66)).status, 403);
    assert.equal((await enviar('PUT', ruta, { fecha_evento: '2100-01-10' }, 6)).status, 400);
    const editada = await enviar('PUT', ruta, { titulo: 'Evento corregido', fecha_fin_evento: null }, 6);
    assert.equal(editada.status, 200);
    assert.equal(editada.datos.fecha_fin_evento, null);
    assert.equal(editada.datos.fecha_evento, evento.fecha_evento);
    assert.equal(editada.datos.mostrar_en_mural, true);
    assert.equal(editada.datos.hora_evento, '10:30:00');
    const listado = await enviar('GET', '/noticias/admin?status=draft', null, 6, 66);
    assert.equal(listado.status, 200);
    assert.equal(listado.datos.some((fila) => fila.id_noticia === creada.datos.id_noticia), false);
  });

  test('rechazo, corrección y aprobación preservan el evento; solo rectoría lo hace público', async () => {
    const creada = await enviar('POST', '/noticias', { ...evento, publicada: true });
    assert.equal(creada.status, 201);
    assert.equal(creada.datos.publicada, false);
    const id = creada.datos.id_noticia;
    const ruta = `/noticias/${id}`;
    await verificarVisible(id, false);
    assert.equal((await enviar('POST', '/noticias', { ...evento, status: 'published' })).status, 403);
    assert.equal((await enviar('PUT', ruta, { status: 'published' })).status, 403);
    assert.equal((await enviar('POST', `${ruta}/enviar-revision`, null, 6)).status, 403);
    assert.equal((await enviar('POST', `${ruta}/enviar-revision`)).datos.status, 'pending');
    assert.equal((await enviar('PUT', ruta, { titulo: 'Cambio durante revisión' })).status, 409);
    assert.equal((await enviar('POST', `${ruta}/aprobar`)).status, 403);
    const rechazada = await enviar('POST', `${ruta}/rechazar`, { motivo: ' Aclarar lugar ' }, 4);
    assert.equal(rechazada.status, 200);
    assert.equal(rechazada.datos.motivo_rechazo, 'Aclarar lugar');
    assert.equal((await enviar('PUT', ruta, { lugar_evento: 'Auditorio principal' })).status, 200);
    assert.equal((await enviar('POST', `${ruta}/enviar-revision`)).status, 200);
    const aprobada = await enviar('POST', `${ruta}/aprobar`, null, 4);
    assert.equal(aprobada.status, 200);
    assert.equal(aprobada.datos.status, 'published');
    assert.equal(aprobada.datos.publicada, true);
    assert.equal(aprobada.datos.motivo_rechazo, null);
    assert.equal(aprobada.datos.fecha_fin_evento, evento.fecha_fin_evento);
    assert.equal(aprobada.datos.lugar_evento, 'Auditorio principal');
    await verificarVisible(id, true);
    assert.equal((await enviar('POST', `${ruta}/ocultar`, null, 4)).datos.publicada, false);
    await verificarVisible(id, false);
  });

  test('los anuncios ya no se agregan al mural; cualquier intento es rechazado', async () => {
    for (const rol of [3, 4, 6]) {
      const resultado = await enviar('POST', '/notificaciones', { titulo: 'Aviso con imagen', mensaje: 'Mensaje para todos',
        audiencia: 'global', mostrar_en_mural: true, url_imagen: 'https://example.test/cartel.png' }, rol);
      assert.equal(resultado.status, 403);
    }
  });

  test('reaplicar el esquema conserva pendientes, borradores, publicaciones y periodos', async () => {
    const creada = await enviar('POST', '/noticias', evento);
    assert.equal((await enviar('POST', `/noticias/${creada.datos.id_noticia}/enviar-revision`)).status, 200);
    const consulta = 'SELECT id_noticia, status, publicada, fecha_evento::text, fecha_fin_evento::text, mostrar_en_mural FROM noticias ORDER BY id_noticia';
    const antes = (await cliente.query(consulta)).rows;
    await cliente.query(sql);
    await cliente.query(sql);
    assert.deepEqual((await cliente.query(consulta)).rows, antes);
  });
});
