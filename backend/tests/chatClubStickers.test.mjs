import test, { after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PASSWORD ||= 'ficticio';
const { default: pool } = await import('../db.js');
const { default: router } = await import('../routes/chatClub.js');
const ruta = router.stack.find(capa => capa.route?.path === '/clubes/:idClub/mensajes' && capa.route.methods.post);
const enviarMensaje = ruta.route.stack[0].handle;
const conectarOriginal = pool.connect;
after(() => { pool.connect = conectarOriginal; });

async function invocar(body, { silenciado = false, conDestinatario = false } = {}) {
  const consultas = [];
  let liberado = false;
  pool.connect = async () => ({
    release: () => { liberado = true; },
    query: async (sql, params = []) => {
      consultas.push({ sql: String(sql), params });
      if (/FROM clubes_operativos c/.test(sql)) return { rows: [{ id_club: 2, nombre_club: 'Club de Prueba', es_responsable: false, es_vicepresidente: false, es_miembro: true }] };
      if (/FROM club_chat_silencios/.test(sql)) return { rows: silenciado ? [{ uno: 1 }] : [] };
      if (/EXTRACT\(EPOCH/.test(sql)) return { rows: [{ segundos: null }] };
      if (/INSERT INTO club_chat_mensajes/.test(sql)) return { rows: [{ id_mensaje: 31, contenido: params[2] }] };
      if (/SELECT DISTINCT u.id_usuario/.test(sql)) return { rows: conDestinatario ? [{ id_usuario: 20 }] : [] };
      if (/INSERT INTO notificaciones \(/.test(sql)) return { rows: [{ id_notificacion: 41 }] };
      return { rows: [] };
    },
  });
  const respuesta = { statusCode: 200, body: null, status(codigo) { this.statusCode = codigo; return this; }, json(body) { this.body = body; return this; } };
  await enviarMensaje({ params: { idClub: '2' }, body, user: { id: 9, id_rol: 1, nombre_completo: 'Ana' } }, respuesta);
  return { respuesta, consultas, liberado };
}

test('envía el sticker como mensaje persistente con el mismo permiso y cadencia del chat', async () => {
  const { respuesta, consultas, liberado } = await invocar({ sticker: 'saludo' });
  assert.equal(respuesta.statusCode, 201);
  assert.equal(respuesta.body.contenido, '[uriel-sticker:saludo]');
  assert.ok(consultas.some(({ sql }) => /pg_advisory_xact_lock/.test(sql)));
  assert.ok(consultas.some(({ sql }) => /EXTRACT\(EPOCH/.test(sql)));
  assert.equal(liberado, true);
});

test('rechaza stickers ajenos al catálogo y el marcador escrito como texto', async () => {
  const desconocido = await invocar({ sticker: 'externo' });
  assert.equal(desconocido.respuesta.statusCode, 400);
  assert.equal(desconocido.consultas.length, 0);
  const falso = await invocar({ contenido: '[uriel-sticker:saludo]' });
  assert.equal(falso.respuesta.statusCode, 400);
  assert.equal(falso.consultas.length, 0);
});

test('una persona silenciada no puede enviar stickers', async () => {
  const { respuesta, consultas } = await invocar({ sticker: 'abrazo' }, { silenciado: true });
  assert.equal(respuesta.statusCode, 403);
  assert.equal(consultas.some(({ sql }) => /INSERT INTO club_chat_mensajes/.test(sql)), false);
});

test('la notificación describe el sticker con palabras comprensibles', async () => {
  const { consultas } = await invocar({ sticker: 'gracias' }, { conDestinatario: true });
  const notificacion = consultas.find(({ sql }) => /INSERT INTO notificaciones \(/.test(sql));
  assert.match(notificacion.params[2], /Sticker de Uriel: ¡Gracias!/);
  assert.doesNotMatch(notificacion.params[2], /uriel-sticker:/);
});
