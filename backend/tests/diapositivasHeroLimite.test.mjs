// Pruebas del máximo de banners del hero: el backend debe rechazar la
// creación cuando ya se alcanzó el límite, aunque el panel venga desactualizado
// y aunque lleguen peticiones simultáneas.
// Pool simulado con tabla en memoria; el bloqueo de aviso se emula con un
// mutex para reproducir la serialización de PostgreSQL.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: diapositivasRouter } = await import('../routes/diapositivasHero.js');

const MAX_BANNERS = 6;

// Estado de la tabla simulada
let banneres = [];
let siguienteId = 1;

// Consultas registradas con su origen ('cliente' = dentro de la transacción)
const consultas = [];

// Mutex que emula pg_advisory_xact_lock: el segundo recorte espera a que el
// primero cierre su transacción (COMMIT/ROLLBACK).
class Mutex {
  constructor() {
    this.cola = Promise.resolve();
  }

  async adquirir() {
    let liberar;
    const mio = new Promise((resolver) => { liberar = resolver; });
    const previo = this.cola;
    this.cola = previo.then(() => mio);
    await previo;
    return liberar;
  }
}

const mutex = new Mutex();

// Barrera del conteo: reproduce la carrera real de PostgreSQL. Sin bloqueo,
// las dos peticiones leen el MISMO total (el anterior a cualquier INSERT) y
// las dos insertan. Con bloqueo, la segunda petición no llega al conteo
// hasta que la primera cierra su transacción, así que lee el total ya
// actualizado.
let barrera = null;

function activarBarrera() {
  let resolver;
  const promesa = new Promise((r) => { resolver = r; });
  barrera = {
    total: banneres.length,
    esperados: 2,
    llegaron: 0,
    cerrada: false,
    resolver,
    promesa,
  };
  // Si la segunda petición nunca llega (porque está bloqueada), el primero
  // sigue con el conteo real y no se cuelga la prueba.
  const timer = setTimeout(() => resolver(), 150);
  if (typeof timer.unref === 'function') timer.unref();
}

function conteoEnBarrera() {
  if (!barrera || barrera.cerrada) {
    return { rows: [{ total: banneres.length }], rowCount: 1 };
  }
  barrera.llegaron++;
  if (barrera.llegaron >= barrera.esperados) {
    barrera.cerrada = true;
    barrera.resolver();
    return { rows: [{ total: barrera.total }], rowCount: 1 };
  }
  return barrera.promesa.then(() => {
    if (barrera.cerrada) {
      return { rows: [{ total: barrera.total }], rowCount: 1 };
    }
    barrera.cerrada = true;
    return { rows: [{ total: banneres.length }], rowCount: 1 };
  });
}

function fila(orden, extra = {}) {
  return {
    id_diapositiva: siguienteId++,
    titulo: `Banner ${orden}`,
    subtitulo: null,
    url_imagen: `https://example.com/banner-${orden}.jpg`,
    url_imagen_movil: null,
    orden,
    activa: true,
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
    ...extra,
  };
}

function sembrar(cantidad) {
  banneres = [];
  siguienteId = 1;
  for (let i = 1; i <= cantidad; i++) banneres.push(fila(i));
}

function crearCliente() {
  let liberar = null;
  return {
    query: async (sql, params = []) => {
      const texto = String(sql).trim();
      consultas.push({ sql: texto, params, origen: 'cliente' });

      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(texto)) {
        if (texto !== 'BEGIN' && liberar) {
          liberar();
          liberar = null;
        }
        return { rows: [], rowCount: 0 };
      }

      // Bloqueo de aviso de transacción: serializa las creaciones.
      if (/pg_advisory_xact_lock/.test(texto)) {
        liberar = await mutex.adquirir();
        return { rows: [], rowCount: 1 };
      }

      if (/COUNT\(\*\)::int AS total FROM diapositivas_hero/.test(texto)) {
        return conteoEnBarrera();
      }

      if (/INSERT INTO diapositivas_hero/.test(texto)) {
        const nueva = {
          id_diapositiva: siguienteId++,
          titulo: params[0],
          subtitulo: params[1],
          url_imagen: params[2],
          url_imagen_movil: params[3],
          orden: params[4],
          activa: params[5],
          fecha_creacion: new Date(),
          fecha_actualizacion: new Date(),
        };
        banneres.push(nueva);
        return { rows: [nueva], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    },
    release: () => {
      if (liberar) {
        liberar();
        liberar = null;
      }
    },
  };
}

pool.query = async (sql, params = []) => {
  const texto = String(sql).trim();
  consultas.push({ sql: texto, params, origen: 'pool' });
  // Revalidación de authenticate (H2): sin esta rama el token recibiría 401.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    if (params[0] === 3) {
      return { rows: [{ id_usuario: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  // Auditoría (INSERT INTO historial_admin): se acepta y se ignora.
  return { rows: [], rowCount: 0 };
};

pool.connect = async () => crearCliente();

const token = jwt.sign(
  { id: 3, nombre_completo: 'Admin Ficticio', id_rol: 3 },
  process.env.JWT_SECRET,
  { expiresIn: '5m' },
);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/diapositivas-hero', diapositivasRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

beforeEach(() => {
  consultas.length = 0;
  barrera = null;
});

const encabezadoAuth = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

function crearBanner(titulo = 'Nuevo banner') {
  return fetch(`${base}/api/diapositivas-hero`, {
    method: 'POST',
    headers: encabezadoAuth,
    body: JSON.stringify({ titulo, url_imagen: 'https://example.com/nuevo.jpg', orden: 1 }),
  });
}

test('POST con el límite alcanzado responde 409 y no inserta', async () => {
  sembrar(MAX_BANNERS);
  const r = await crearBanner();

  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.match(cuerpo.error, /Límite de 6 banners alcanzado/);
  assert.equal(banneres.length, MAX_BANNERS, 'no debe insertarse un banner más');
  assert.ok(
    !consultas.some((c) => /INSERT INTO diapositivas_hero/.test(c.sql)),
    'no debe ejecutarse el INSERT',
  );
  assert.ok(
    consultas.some((c) => c.sql === 'ROLLBACK'),
    'la transacción debe cerrarse con ROLLBACK',
  );
});

test('POST con siete banners (estado actual) no borra nada y responde 409', async () => {
  sembrar(MAX_BANNERS + 1);
  const idsPrevios = banneres.map((b) => b.id_diapositiva);

  const r = await crearBanner();

  assert.equal(r.status, 409);
  assert.equal(banneres.length, MAX_BANNERS + 1, 'los siete registros se conservan');
  assert.deepEqual(banneres.map((b) => b.id_diapositiva), idsPrevios, 'no se modifica ningún registro');
  assert.ok(
    !consultas.some((c) => /DELETE FROM/i.test(c.sql)),
    'no debe ejecutarse ningún DELETE',
  );
});

test('POST por debajo del límite crea el banner y lo registra', async () => {
  sembrar(MAX_BANNERS - 1);

  const r = await crearBanner('Sexto banner');

  assert.equal(r.status, 201);
  const cuerpo = await r.json();
  assert.equal(cuerpo.titulo, 'Sexto banner');
  assert.equal(banneres.length, MAX_BANNERS);
});

test('el conteo y el INSERT se ejecutan en la misma transacción, tras el bloqueo', async () => {
  sembrar(MAX_BANNERS - 1);

  const r = await crearBanner();

  assert.equal(r.status, 201);
  const delCliente = consultas.filter((c) => c.origen === 'cliente').map((c) => c.sql);
  const iBegin = delCliente.indexOf('BEGIN');
  const iLock = delCliente.findIndex((s) => /pg_advisory_xact_lock/.test(s));
  const iCount = delCliente.findIndex((s) => /COUNT\(\*\)::int AS total/.test(s));
  const iInsert = delCliente.findIndex((s) => /INSERT INTO diapositivas_hero/.test(s));
  const iCommit = delCliente.indexOf('COMMIT');

  assert.ok(iBegin >= 0, 'debe abrir la transacción');
  assert.ok(iLock > iBegin, 'el bloqueo va después del BEGIN');
  assert.ok(iCount > iLock, 'el conteo va después del bloqueo');
  assert.ok(iInsert > iCount, 'el INSERT va después del conteo');
  assert.ok(iCommit > iInsert, 'el COMMIT cierra la transacción');
});

test('dos peticiones simultáneas con cinco banners: solo una crea el sexto', async () => {
  sembrar(MAX_BANNERS - 1);
  activarBarrera();

  const [r1, r2] = await Promise.all([crearBanner('A'), crearBanner('B')]);
  const estados = [r1.status, r2.status].sort();

  assert.deepEqual(estados, [201, 409], 'una creación se acepta y la otra se rechaza');
  assert.equal(banneres.length, MAX_BANNERS, 'no puede quedar un séptimo banner');
});
