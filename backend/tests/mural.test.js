import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

process.env.JWT_SECRET = 'mural-solo-pruebas';
const campos = ['titulo', 'subtitulo', 'contenido', 'url_imagen', 'enlace_url', 'enlace_texto', 'publicada', 'destacada', 'fecha_retiro'];
let registros = [];
let configuracion = { url_publica: null };
let id = 0;
let consultas = [];
let rolActual = 3;
pool.query = async (sql, valores = []) => {
  if (sql.includes('FROM usuarios u') && sql.includes('deleted_at')) {
    return { rows: [{ id_usuario: valores[0], nombre_completo: 'Editor de prueba', id_rol: rolActual }] };
  }
  consultas.push({ sql, valores });
  if (sql.includes('historial_admin')) return { rows: [] };
  if (sql.includes('configuracion_mural')) {
    if (sql.startsWith('INSERT')) configuracion = { url_publica: valores[0] };
    return { rows: [configuracion] };
  }
  assert.match(sql, /publicaciones_mural/);
  assert.doesNotMatch(sql, /\bnoticias\b|fechas_calendario|notificaciones/);
  if (sql.startsWith('INSERT')) {
    const fila = { id_publicacion: ++id, ...Object.fromEntries(campos.map((campo, i) => [campo, valores[i]])) };
    registros.push(fila); return { rows: [{ ...fila }] };
  }
  if (sql.startsWith('UPDATE')) {
    const fila = registros.find((item) => item.id_publicacion === Number(valores[9]));
    if (!fila) return { rows: [] };
    Object.assign(fila, Object.fromEntries(campos.map((campo, i) => [campo, valores[i]])));
    return { rows: [{ ...fila }] };
  }
  if (sql.startsWith('DELETE')) {
    const fila = registros.find((item) => item.id_publicacion === Number(valores[0]));
    registros = registros.filter((item) => item.id_publicacion !== Number(valores[0]));
    return { rows: fila ? [{ ...fila }] : [] };
  }
  if (valores.length) return { rows: registros.filter((item) => item.id_publicacion === Number(valores[0])).map((item) => ({ ...item })) };
  if (sql.includes('WHERE publicada = TRUE')) {
    assert.match(sql, /fecha_retiro IS NULL OR fecha_retiro >=/);
    assert.match(sql, /America\/Mexico_City/);
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return { rows: registros.filter((item) => item.publicada && (!item.fecha_retiro || item.fecha_retiro >= hoy)).map((item) => ({ ...item })) };
  }
  return { rows: registros.map((item) => ({ ...item })) };
};
const { default: router } = await import('../routes/mural.js');
const app = express(); app.use(express.json()); app.use('/mural', router);
const servidor = app.listen(0, '127.0.0.1');
await new Promise((resolve) => servidor.once('listening', resolve));
after(async () => { await new Promise((resolve) => servidor.close(resolve)); await pool.end(); });
const base = `http://127.0.0.1:${servidor.address().port}/mural`;
async function enviar(metodo, datos, rol = 3, ruta = '', usuario = 7) {
  consultas = [];
  rolActual = rol ?? 3;
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: usuario, id_rol: rol, nombre_completo: 'Editor de prueba' }, process.env.JWT_SECRET)}`;
  const res = await fetch(`${base}${ruta}`, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
  return { status: res.status, datos: await res.json() };
}
const datos = { titulo: ' Convocatoria cultural ', contenido: 'Participa en las actividades del campus.', enlace_url: 'https://example.org/registro', enlace_texto: 'Inscribirme' };

test('la consulta pública y el QR no requieren sesión; administración, rectoría, responsable mural y coordinación editan el mural', async () => {
  for (const ruta of ['', '/config']) assert.equal((await enviar('GET', null, null, ruta)).status, 200);
  for (const rol of [null, 1, 2, 5]) {
    for (const [metodo, ruta] of [['GET', '/admin'], ['POST', ''], ['PUT', '/1'], ['DELETE', '/1'], ['PUT', '/config']]) {
      assert.equal((await enviar(metodo, metodo === 'GET' ? null : datos, rol, ruta)).status, rol ? 403 : 401);
      assert.equal(consultas.length, 0);
    }
  }
  for (const rol of [3, 4, 6, 7]) assert.equal((await enviar('POST', datos, rol)).status, 201);
});

test('el responsable edita publicaciones existentes, administra visibilidad y QR, y elimina desde su panel', async () => {
  const creada = (await enviar('POST', datos, 3)).datos;
  const ruta = `/${creada.id_publicacion}`;
  const borradores = await enviar('GET', null, 6, '/admin', 9);
  assert.equal(borradores.status, 200);
  assert.ok(borradores.datos.some((item) => item.id_publicacion === creada.id_publicacion));

  const editada = await enviar('PUT', { titulo: 'Cartel actualizado', publicada: true, destacada: true,
    url_imagen: 'https://example.org/cartel.png', fecha_retiro: '2099-12-31' }, 6, ruta, 9);
  assert.equal(editada.status, 200);
  assert.equal(editada.datos.titulo, 'Cartel actualizado');
  assert.equal(editada.datos.contenido, datos.contenido);
  assert.equal(editada.datos.enlace_url, datos.enlace_url);
  assert.equal(editada.datos.url_imagen, 'https://example.org/cartel.png');
  assert.equal(editada.datos.destacada, true);
  assert.ok((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion));

  assert.equal((await enviar('PUT', { publicada: false }, 6, ruta, 9)).status, 200);
  assert.equal((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion), false);
  const config = await enviar('PUT', { url_publica: 'https://campus.example.org' }, 6, '/config', 9);
  assert.equal(config.status, 200);
  assert.equal(config.datos.url_publica, 'https://campus.example.org/calendario?vista=mural');
  assert.equal((await enviar('DELETE', null, 6, ruta, 9)).status, 200);
  assert.equal((await enviar('GET', null, 6, '/admin', 9)).datos.some((item) => item.id_publicacion === creada.id_publicacion), false);
  assert.equal(consultas.some((item) => item.sql.includes('noticias') || item.sql.includes('fechas_calendario')), false);
});

test('crear, editar, destacar, ocultar y eliminar conserva una publicación independiente del feed', async () => {
  const creada = (await enviar('POST', datos)).datos;
  assert.equal(creada.publicada, false);
  assert.equal(creada.titulo, 'Convocatoria cultural');
  const ruta = `/${creada.id_publicacion}`;
  const cambio = await enviar('PUT', { publicada: true, destacada: true, subtitulo: 'Una invitación para todos', fecha_retiro: '2099-12-31', url_imagen: 'https://example.org/cartel.png' }, 4, ruta);
  assert.equal(cambio.status, 200);
  assert.equal(cambio.datos.enlace_url, datos.enlace_url);
  assert.equal(cambio.datos.destacada, true);
  assert.equal(cambio.datos.contenido, datos.contenido);
  assert.ok((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion));
  assert.equal((await enviar('PUT', { publicada: false, url_imagen: null, enlace_url: null, fecha_retiro: null }, 3, ruta)).status, 200);
  assert.equal((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion), false);
  assert.ok((await enviar('GET', null, 3, '/admin')).datos.some((item) => item.id_publicacion === creada.id_publicacion));
  assert.equal((await enviar('DELETE', null, 3, ruta)).status, 200);
  assert.equal((await enviar('PUT', { publicada: true }, 3, ruta)).status, 404);
  assert.equal((await enviar('DELETE', null, 3, ruta)).status, 404);
});

test('el público no recibe borradores ni retiradas; administración conserva ambas', async () => {
  const borrador = (await enviar('POST', datos)).datos;
  const retirada = (await enviar('POST', { ...datos, publicada: true, fecha_retiro: '2000-01-01' })).datos;
  const visible = (await enviar('POST', { ...datos, publicada: true })).datos;
  const publico = (await enviar('GET', null, null)).datos;
  assert.equal(publico.some((item) => [borrador.id_publicacion, retirada.id_publicacion].includes(item.id_publicacion)), false);
  assert.ok(publico.some((item) => item.id_publicacion === visible.id_publicacion));
  const admin = (await enviar('GET', null, 3, '/admin')).datos;
  for (const item of [borrador, retirada, visible]) assert.ok(admin.some((fila) => fila.id_publicacion === item.id_publicacion));
});

test('rechaza enlaces ejecutables, fechas inexistentes y opciones mal formadas antes de escribir', async () => {
  for (const cambio of [{ titulo: '' }, { contenido: ' ' }, { titulo: 'x'.repeat(201) }, { contenido: 'x'.repeat(20001) }, { enlace_url: 'javascript:alert(1)' }, { enlace_url: 'https://usuario:clave@example.org' }, { url_imagen: 'data:image/svg+xml,bad' }, { fecha_retiro: '2027-02-29' }, { fecha_retiro: false }, { publicada: 'true' }, { destacada: 1 }]) {
    assert.equal((await enviar('POST', { ...datos, ...cambio })).status, 400);
    assert.equal(consultas.length, 0);
  }
  for (const invalido of ['0', '-1', 'abc', '99999999999999999999']) {
    for (const metodo of ['PUT', 'DELETE']) assert.equal((await enviar(metodo, datos, 3, `/${invalido}`)).status, 400);
  }
});

test('guarda el destino compartido del QR y lo normaliza hacia el mural público', async () => {
  const guardado = await enviar('PUT', { url_publica: 'https://campus.example.org/admin/panel?seccion=usuarios#privado' }, 4, '/config');
  assert.equal(guardado.status, 200);
  assert.equal(guardado.datos.url_publica, 'https://campus.example.org/calendario?vista=mural');
  assert.equal((await enviar('GET', null, null, '/config')).datos.url_publica, guardado.datos.url_publica);
  for (const url of ['javascript:alert(1)', '/calendario', 15, 'https://usuario:clave@example.org']) {
    assert.equal((await enviar('PUT', { url_publica: url }, 3, '/config')).status, 400);
  }
  assert.equal((await enviar('PUT', { url_publica: null }, 3, '/config')).datos.url_publica, null);
});

test('Coordinación (rol 7) puede crear una publicación en el mural', async () => {
  const creada = await enviar('POST', datos, 7);
  assert.equal(creada.status, 201);
  assert.equal(typeof creada.datos.id_publicacion, 'number');
});
