// Pruebas de handshake TLS con un entorno local desechable (auditoría H4).
//
// Generan con OpenSSL (si está disponible) una CA y un certificado de servidor
// con SAN DNS:localhost en un directorio temporal, levantan un tls.Server de
// Node en 127.0.0.1 y conectan con las MISMAS opciones que construye
// construirConfigPg para el modo remoto. Validan la semántica de verificación
// de cadena e identidad del servidor. NO son una prueba contra PostgreSQL
// (el servidor real de BD queda pendiente; ver informe §8.7).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tls from 'node:tls';
import { construirConfigPg } from '../lib/dbTls.js';

function localizarOpenssl() {
  const candidatas = [
    process.env.OPENSSL_BIN,
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
  ].filter(Boolean);
  for (const ruta of candidatas) {
    if (existsSync(ruta)) return ruta;
  }
  return null;
}

const openssl = localizarOpenssl();
const sinOpenssl = openssl ? false : 'openssl no disponible en esta máquina (prueba omitida)';

let dir;
let servidor;
let puerto;

function opensslSeguro(args) {
  execFileSync(openssl, args, { stdio: 'pipe' });
}

function generarCertificados() {
  dir = mkdtempSync(join(tmpdir(), 'clubs-tls-'));
  const caKey = join(dir, 'ca.key');
  const caPem = join(dir, 'ca.pem');
  const srvKey = join(dir, 'servidor.key');
  const srvCsr = join(dir, 'servidor.csr');
  const srvPem = join(dir, 'servidor.pem');
  const ext = join(dir, 'ext.cnf');

  opensslSeguro(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', caKey, '-out', caPem,
    '-days', '2', '-subj', '/CN=ClubsUNID-Test-CA',
    '-addext', 'basicConstraints=critical,CA:TRUE',
    '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  opensslSeguro(['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', srvKey, '-out', srvCsr,
    '-subj', '/CN=localhost']);
  writeFileSync(ext, '[v3]\nsubjectAltName=DNS:localhost\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n');
  opensslSeguro(['x509', '-req', '-in', srvCsr, '-CA', caPem, '-CAkey', caKey, '-CAcreateserial',
    '-out', srvPem, '-days', '2', '-extfile', ext, '-extensions', 'v3']);

  return { caPem, srvKey, srvPem };
}

function sslRemoto(caPath) {
  const env = { DATABASE_URL: 'postgresql://u_ficticio:c_ficticio@db.ejemplo.invalid:5432/postgres' };
  if (caPath) env.DB_SSL_CA_FILE = caPath;
  return construirConfigPg(env).ssl;
}

function conectar(sslOptions, host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: puerto, ...sslOptions }, () => {
      resolve({ ok: true, autorizado: socket.authorized });
      socket.destroy();
    });
    socket.on('error', (err) => {
      resolve({ ok: false, codigo: err.code });
      socket.destroy();
    });
  });
}

before(async () => {
  if (!openssl) return;
  const { caPem, srvKey, srvPem } = generarCertificados();
  const clave = readFileSync(srvKey);
  const cert = readFileSync(srvPem);
  await new Promise((resolve) => {
    servidor = tls.createServer({ key: clave, cert }, (conexion) => conexion.end());
    servidor.on('tlsClientError', () => {});
    servidor.listen(0, '127.0.0.1', resolve);
  });
  puerto = servidor.address().port;
});

after(() => {
  if (servidor) servidor.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test('cadena confiable con la CA en DB_SSL_CA_FILE: la conexión TLS se acepta', { skip: sinOpenssl }, async () => {
  const r = await conectar(sslRemoto(join(dir, 'ca.pem')), 'localhost');
  assert.equal(r.ok, true, 'la verificación de cadena e identidad debe pasar');
  assert.equal(r.autorizado, true);
});

test('sin CA propia (solo almacén del sistema): certificado no confiable se rechaza', { skip: sinOpenssl }, async () => {
  // La CA de la prueba no está en el almacén del sistema: sin DB_SSL_CA_FILE
  // la verificación debe fallar (no hay respaldo que la desactive).
  const r = await conectar(sslRemoto(null), 'localhost');
  assert.equal(r.ok, false);
  assert.match(String(r.codigo), /UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED/);
});

test('nombre de servidor incorrecto (IP sin SAN iPAddress): se rechaza pese a la CA', { skip: sinOpenssl }, async () => {
  const r = await conectar(sslRemoto(join(dir, 'ca.pem')), '127.0.0.1');
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'ERR_TLS_CERT_ALTNAME_INVALID');
});
