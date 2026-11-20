import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCorreoMisiones, construirEnlaceMisiones } from '../lib/misionesCorreo.js';
import { crearMailerResend } from '../lib/resendMailer.js';
import { validarPdfMisiones } from '../lib/misionesArchivos.js';
import { claveUsuario } from '../lib/rateLimits.js';

const datos = { correo: 'invitado@example.test', folio: 'de24b149-c9ed-4d15-8857-211326bcd124', token: 'b'.repeat(43), edicion: 'Misiones QA' };
const env = { NODE_ENV: 'production', MISIONES_MAIL_PROVIDER: 'resend', MISIONES_PUBLIC_URL: 'https://clubs.example.test', RESEND_API_KEY: 're_qa_ficticia', RESEND_FROM: 'QA <qa@example.test>' };

test('el correo operativo acepta invitados y el OTP sigue restringido a cuentas institucionales', async () => {
  const enviados = [];
  const fetchImpl = async (_url, opciones) => { enviados.push(JSON.parse(opciones.body)); return { ok: true }; };
  await crearCorreoMisiones({ env, fetchImpl }).enviarEnlace(datos);
  assert.deepEqual(enviados[0].to, [datos.correo]);
  assert.match(enviados[0].text, /#acceso=/);
  assert.doesNotMatch(enviados[0].text, /sangre|alergias|pdf/i);
  await assert.rejects(crearMailerResend({ env, fetchImpl }).enviarCodigoOtp({ correo: datos.correo, codigo: '123456', expiracion: new Date() }), { code: 'OTP_RESEND_DESTINATARIO' });
  assert.equal(enviados.length, 1);
});

test('un fallo de correo se propaga y mock no simula entregas en producción', async () => {
  await assert.rejects(crearCorreoMisiones({ env, fetchImpl: async () => ({ ok: false }) }).enviarEnlace(datos));
  await assert.rejects(crearCorreoMisiones({ env: { ...env, MISIONES_MAIL_PROVIDER: 'mock' } }).enviarEnlace(datos));
  assert.throws(() => construirEnlaceMisiones(datos.folio, datos.token, 'http://remoto.example.test'));
});

test('el documento requiere formato PDF real en su cabecera y cierre, además del tipo declarado', () => {
  const archivo = { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocumento QA\n%%EOF') };
  assert.equal(validarPdfMisiones(archivo), archivo);
  for (const cambio of [{ mimetype: 'image/png' }, { buffer: Buffer.from('<html>No es PDF</html>') }, { buffer: Buffer.from('%PDF-1.4\nincompleto') }]) assert.throws(() => validarPdfMisiones({ ...archivo, ...cambio }));
});

test('los invitados comparten cuota por red, sin mezclar todas las direcciones anónimas', () => {
  assert.notEqual(claveUsuario({ ip: '192.0.2.1' }), claveUsuario({ ip: '192.0.2.2' }));
  assert.equal(claveUsuario({ ip: '2001:db8:abcd:ef00::1' }), claveUsuario({ ip: '2001:db8:abcd:ef01::2' }));
  assert.equal(claveUsuario({ ip: '192.0.2.1', user: { id: 7 } }), 'usuario:7');
});
