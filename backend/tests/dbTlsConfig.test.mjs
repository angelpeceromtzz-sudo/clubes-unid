// Pruebas de construcción de la configuración de conexión (auditoría H4).
//
// Verifican el modo remoto con TLS verificado, el rechazo de parámetros TLS
// en DATABASE_URL (por la precedencia real de pg 8.21.0), el mecanismo de CA
// vía DB_SSL_CA_FILE, la ausencia de respaldos inseguros y el modo local.
// Sin red y sin PostgreSQL: solo construcción de configuración. Datos ficticios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirConfigPg } from '../lib/dbTls.js';

const URL_REMOTA_FICTICIA = 'postgresql://usuario_ficticio:clave_ficticia@db.ejemplo.invalid:5432/postgres';
const PEM_FICTICIO = '-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----\n';

function envRemoto(extra = {}) {
  return { DATABASE_URL: URL_REMOTA_FICTICIA, ...extra };
}

function leerArchivoFalso(contenido = PEM_FICTICIO) {
  return (ruta) => {
    if (ruta === '/ca/ejemplo.pem') return contenido;
    const err = new Error('ENOENT');
    err.code = 'ENOENT';
    throw err;
  };
}

// --- Modo remoto: TLS con verificación ---

test('remoto sin parámetros TLS en la URL: ssl con rejectUnauthorized true y sin CA propia', () => {
  const config = construirConfigPg(envRemoto(), { leerArchivo: leerArchivoFalso() });
  assert.equal(config.connectionString, URL_REMOTA_FICTICIA);
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('remoto: la configuración no contiene ningún respaldo inseguro', () => {
  const config = construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '/ca/ejemplo.pem' }), { leerArchivo: leerArchivoFalso() });
  const serializado = JSON.stringify(config);
  assert.ok(!serializado.includes('rejectUnauthorized":false'), 'no debe aparecer rejectUnauthorized: false');
  assert.ok(!serializado.includes('checkServerIdentity'), 'no debe anularse la comprobación de identidad');
  assert.equal(config.ssl.rejectUnauthorized, true, 'debe ser true explícito, no indefinido');
});

test('remoto con DB_SSL_CA_FILE: añade la CA y conserva la verificación', () => {
  const config = construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '/ca/ejemplo.pem' }), { leerArchivo: leerArchivoFalso() });
  assert.equal(config.ssl.ca, PEM_FICTICIO);
  assert.equal(config.ssl.rejectUnauthorized, true);
});

test('remoto con DB_SSL_CA_FILE ilegible: error claro y sin degradar a conexión sin CA', () => {
  assert.throws(
    () => construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '/no/existe.pem' }), { leerArchivo: leerArchivoFalso() }),
    (err) => {
      assert.match(err.message, /DB_SSL_CA_FILE/);
      assert.match(err.message, /no se pudo leer/);
      return true;
    },
  );
});

test('remoto con DB_SSL_CA_FILE apuntando a contenido que no es PEM: error', () => {
  assert.throws(
    () => construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '/ca/ejemplo.pem' }), { leerArchivo: leerArchivoFalso('no soy un pem') }),
    /no es un certificado PEM/,
  );
});

test('remoto con DB_SSL_CA_FILE vacío o en blanco: se ignora y se usa el almacén del sistema', () => {
  const vacio = construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '' }), { leerArchivo: leerArchivoFalso() });
  const blancos = construirConfigPg(envRemoto({ DB_SSL_CA_FILE: '   ' }), { leerArchivo: leerArchivoFalso() });
  assert.deepEqual(vacio.ssl, { rejectUnauthorized: true });
  assert.deepEqual(blancos.ssl, { rejectUnauthorized: true });
});

// --- Tratamiento de parámetros SSL en la URL ---

test('sslmode=verify-full en la URL también se rechaza: la URL no debe controlar TLS', () => {
  // Incluso el valor "seguro" se rechaza porque, según la documentación de
  // node-postgres y el código de pg 8.21.0, su presencia reemplaza el objeto
  // ssl completo (perdería, p. ej., la CA de DB_SSL_CA_FILE).
  assert.throws(
    () => construirConfigPg(envRemoto({ DATABASE_URL: `${URL_REMOTA_FICTICIA}?sslmode=verify-full` })),
    /sslmode/,
  );
});

for (const param of ['sslmode=require', 'sslmode=no-verify', 'sslmode=disable', 'ssl=true', 'sslrootcert=/x.pem', 'sslcert=/x.pem', 'sslkey=/x.pem']) {
  test(`URL con "${param}" se rechaza con error claro sin filtrar la cadena`, () => {
    const url = `${URL_REMOTA_FICTICIA}?${param}`;
    assert.throws(
      () => construirConfigPg(envRemoto({ DATABASE_URL: url })),
      (err) => {
        const nombre = param.split('=')[0];
        assert.ok(err.message.includes(nombre), `el mensaje debe nombrar ${nombre}`);
        assert.ok(!err.message.includes('clave_ficticia'), 'no debe imprimir credenciales');
        assert.ok(!err.message.includes('postgresql://'), 'no debe imprimir la URL');
        return true;
      },
    );
  });
}

test('URL con parámetro TLS en mayúsculas también se rechaza', () => {
  assert.throws(
    () => construirConfigPg(envRemoto({ DATABASE_URL: `${URL_REMOTA_FICTICIA}?SSLMODE=require` })),
    /sslmode/i,
  );
});

test('URL con esquema distinto de postgres: rechazo sin tocar host ni puerto', () => {
  assert.throws(
    () => construirConfigPg(envRemoto({ DATABASE_URL: 'https://db.ejemplo.invalid/postgres' })),
    /postgres:\/\//,
  );
});

test('URL no parseable: rechazo claro sin imprimir la cadena', () => {
  assert.throws(
    () => construirConfigPg(envRemoto({ DATABASE_URL: 'no es una url' })),
    (err) => {
      assert.match(err.message, /DATABASE_URL no es una URL válida/);
      assert.ok(!err.message.includes('no es una url'));
      return true;
    },
  );
});

// --- Precedencia real en pg (instalado) ---

test('pg 8.21.0: con nuestra configuración sanitizada, ConnectionParameters conserva el ssl explícito', async () => {
  const { default: ConnectionParameters } = await import('pg/lib/connection-parameters.js');
  const config = construirConfigPg(envRemoto(), { leerArchivo: leerArchivoFalso() });
  const parametros = new ConnectionParameters(config);
  assert.equal(parametros.ssl.rejectUnauthorized, true);
});

test('pg 8.21.0: una URL con sslmode SOBRESCRIBE el ssl explícito (motivo del rechazo)', async () => {
  const { default: ConnectionParameters } = await import('pg/lib/connection-parameters.js');
  const parametros = new ConnectionParameters({
    connectionString: `${URL_REMOTA_FICTICIA}?sslmode=require`,
    ssl: { rejectUnauthorized: true, ca: PEM_FICTICIO },
  });
  assert.notEqual(parametros.ssl?.rejectUnauthorized, true, 'la URL pisa el objeto ssl explícito');
  assert.equal(parametros.ssl?.ca, undefined, 'y pierde la CA configurada');
});

// --- Modo local ---

test('sin DATABASE_URL: modo local explícito, sin ssl, con los DB_* del entorno', () => {
  const config = construirConfigPg({
    DB_HOST: '127.0.0.1',
    DB_PORT: '5544',
    DB_NAME: 'bd_ficticia',
    DB_USER: 'usuario_ficticio',
    DB_PASSWORD: 'clave_local_ficticia',
  });
  assert.deepEqual(config, {
    host: '127.0.0.1',
    port: 5544,
    database: 'bd_ficticia',
    user: 'usuario_ficticio',
    password: 'clave_local_ficticia',
  });
  assert.ok(!('ssl' in config), 'el modo local no declara ssl');
  assert.ok(!('connectionString' in config));
});

test('DATABASE_URL vacío: se trata como ausente (modo local)', () => {
  const config = construirConfigPg({ DATABASE_URL: '', DB_PASSWORD: 'clave_local_ficticia' });
  assert.equal(config.host, 'localhost');
  assert.ok(!('ssl' in config));
});

test('modo local sin DB_PASSWORD: mismo error documentado que antes', () => {
  assert.throws(
    () => construirConfigPg({ DB_HOST: 'localhost' }),
    /falta la variable de entorno DB_PASSWORD/,
  );
});
