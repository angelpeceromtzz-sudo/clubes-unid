// El límite de presencia cubre el tráfico del cliente visible y se comparte por
// usuario (no por pestaña/club), sin compartir cuota entre cuentas de la misma IP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-ficticio-de-pruebas-chat-presencia';
process.env.DB_PASSWORD = 'ficticio';
// Una cadena vacía evita que dotenv recupere un override local y permite probar
// el default real de 30/min.
process.env.RATE_LIMIT_CHAT_PRESENCIA_MINUTO = '';
process.env.RATE_LIMIT_CHAT_LECTURA_MINUTO = '';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: chatRouter } = await import('../routes/chatClub.js');
const { UMBRALES } = await import('../lib/rateLimits.js');

let servidor;
let base;
let presenciaEscrita = 0;
let presenciaEliminada = 0;
const parametrosPresencia = [];

pool.query = async (sql, params = []) => {
  const texto = String(sql);
  if (/FROM usuarios u[\s\S]*u\.deleted_at IS NULL/.test(texto)) {
    return { rows: [{ id_usuario: Number(params[0]), nombre_completo: 'Miembro Ficticio', id_rol: 1 }], rowCount: 1 };
  }
  if (/FROM clubes_operativos c/.test(texto)) {
    return {
      rows: [{
        id_club: Number(params[0]),
        nombre_club: 'Club Ficticio',
        id_responsable_club: 99,
        id_vicepresidente: 98,
        es_responsable: false,
        es_vicepresidente: false,
        es_miembro: true,
      }],
      rowCount: 1,
    };
  }
  if (/INSERT INTO club_chat_presencia/.test(texto)) {
    presenciaEscrita += 1;
    parametrosPresencia.push({ texto, params: [...params] });
  }
  if (/DELETE FROM club_chat_presencia/.test(texto)) presenciaEliminada += 1;
  if (/COUNT\(\*\)::int AS total/.test(texto)) return { rows: [{ total: 0, primero: null }], rowCount: 1 };
  return { rows: [], rowCount: 0 };
};

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat-clubes', chatRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}/api/chat-clubes`;
});

after(() => servidor?.close());

async function presencia(idUsuario, idClub = 1, activo = true, cuerpo = {}) {
  const token = jwt.sign({ id: idUsuario }, process.env.JWT_SECRET, { expiresIn: '5m' });
  return fetch(`${base}/clubes/${idClub}/presencia`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ activo, escribiendo: false, ...cuerpo }),
  });
}

async function leerChat(idUsuario, idClub = 1) {
  const token = jwt.sign({ id: idUsuario }, process.env.JWT_SECRET, { expiresIn: '5m' });
  return fetch(`${base}/clubes/${idClub}/chat`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

test('el default de presencia cubre 24 pings/min del cliente y rechaza el exceso', async () => {
  assert.equal(UMBRALES.chatPresenciaMinuto, 30);
  for (let indice = 0; indice < 24; indice += 1) {
    assert.equal((await presencia(10)).status, 200, `ping ${indice + 1}`);
  }
  for (let indice = 24; indice < 30; indice += 1) {
    assert.equal((await presencia(10)).status, 200, `margen ${indice + 1}`);
  }
  const limitada = await presencia(10, 2);
  assert.equal(limitada.status, 429, 'la cuota se comparte entre clubs del mismo usuario');
  assert.ok(Number(limitada.headers.get('retry-after')) > 0);
  assert.equal(presenciaEscrita, 30, 'el limitador evita escrituras de presencia adicionales');
});

test('otra cuenta desde la misma IP conserva su cuota', async () => {
  assert.equal((await presencia(11)).status, 200);
});

test('heartbeat, typing=true y typing=false usan el contrato tri-state', async () => {
  const inicio = parametrosPresencia.length;
  assert.equal((await presencia(12, 1, true, { escribiendo: undefined })).status, 200);
  assert.equal((await presencia(12, 1, true, { escribiendo: true })).status, 200);
  assert.equal((await presencia(12, 1, true, { escribiendo: false })).status, 200);

  const escrituras = parametrosPresencia.slice(inicio);
  assert.deepEqual(escrituras.map((item) => item.params[2]), [null, true, false]);
  assert.match(escrituras[0].texto, /WHEN \$3::boolean IS NULL THEN club_chat_presencia\.escribiendo_hasta/);
});

test('rechaza typing no booleano y permite cleanup activo=false', async () => {
  const escriturasAntes = parametrosPresencia.length;
  assert.equal((await presencia(13, 1, true, { escribiendo: 'true' })).status, 400);
  assert.equal(parametrosPresencia.length, escriturasAntes);

  const eliminadasAntes = presenciaEliminada;
  assert.equal((await presencia(13, 1, false)).status, 200);
  assert.equal(presenciaEliminada, eliminadasAntes + 1);
});

test('el GET del chat tiene límite por usuario y comparte cuota entre clubs', async () => {
  for (let indice = 0; indice < 30; indice += 1) {
    assert.equal((await leerChat(20)).status, 200, `lectura ${indice + 1}`);
  }
  const limitada = await leerChat(20, 2);
  assert.equal(limitada.status, 429);
  assert.ok(Number(limitada.headers.get('retry-after')) > 0);
  assert.equal((await leerChat(21)).status, 200, 'otra cuenta conserva su cuota');
});
