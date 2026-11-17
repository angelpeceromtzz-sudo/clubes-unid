import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { diagnosticarSolicitudOtp, registrarConfiguracionOtp } from '../lib/otpDiagnostico.js';

function capturar(accion) {
  const original = console.info;
  const registros = [];
  console.info = (prefijo, dato) => {
    assert.equal(prefijo, '[OTP]');
    registros.push(JSON.parse(dato));
  };
  try {
    accion();
    return registros;
  } finally {
    console.info = original;
  }
}

test('al arrancar informa del proveedor realmente cargado y no imprime valores privados', () => {
  const registros = capturar(() => registrarConfiguracionOtp({
    proveedor: 'mock', estaDisponible: () => true,
  }, {
    OTP_MAIL_PROVIDER: 'resend', AUTH_OTP_ENABLED: ' TRUE ',
    OTP_PEPPER: 'pepper-privado', RESEND_API_KEY: 're_privada',
    RESEND_FROM: 'remitente@privado.test',
  }));

  assert.deepEqual(registros, [{
    evento: 'configuracion_cargada', proveedor: 'mock',
    habilitado: true, disponible: true, pepper_configurado: true,
  }]);
});

test('los proveedores no soportados no se copian al registro de arranque', () => {
  const registros = capturar(() => registrarConfiguracionOtp({
    proveedor: 'valor-privado\nproveedor-falso', estaDisponible: () => false,
  }, {}));

  assert.deepEqual(registros, [{
    evento: 'configuracion_cargada', proveedor: 'no_soportado',
    habilitado: false, disponible: false, pepper_configurado: false,
  }]);
});

test('la traza usa su propio identificador y descarta detalles privados o estados HTTP inválidos', () => {
  const req = {
    body: { correo: 'alumno@red.unid.mx', codigo: '123456' },
    headers: { authorization: 'Bearer secreto', 'x-request-id': 'identificador-del-cliente' },
  };
  const res = new EventEmitter();
  res.locals = {};
  res.statusCode = 429;
  let continuo = false;
  const registros = capturar(() => {
    diagnosticarSolicitudOtp({ proveedor: 'resend' })(req, res, () => { continuo = true; });
    res.locals.registrarOtp('envio_fallido', {
      http_proveedor: 403, correo: req.body.correo, codigo: req.body.codigo,
      authorization: req.headers.authorization, message: 'respuesta privada',
    });
    res.locals.registrarOtp('envio_fallido', { http: '200', http_proveedor: 999 });
    res.emit('finish');
  });

  assert.equal(continuo, true);
  assert.match(registros[0].solicitud_id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.equal(new Set(registros.map((r) => r.solicitud_id)).size, 1);
  assert.equal(registros.at(-1).http, 429);
  assert.equal(registros[1].http_proveedor, 403);
  for (const [indice, registro] of registros.entries()) {
    assert.deepEqual(Object.keys(registro).sort(), [
      'evento', 'proveedor', 'solicitud_id',
      ...(indice === 1 ? ['http_proveedor'] : []),
      ...(indice === 3 ? ['http'] : []),
    ].sort());
  }
});
