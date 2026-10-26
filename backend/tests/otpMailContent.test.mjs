import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearContenidoOtp,
  esLogoOtpUrlValida,
  resolverLogoOtpUrl,
} from '../lib/otpMailContent.js';

const CODIGO = '654321';
const URL_VALIDA = 'https://ejemplo.test/logo.png';

test('genera un texto plano completo y sin imágenes', () => {
  const { subject, text, html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10, logoUrl: '' });

  assert.equal(subject, 'Tu código de acceso a Clubs UNID');
  assert.match(text, /^Clubs UNID\nAcceso seguro/);
  assert.match(text, new RegExp(CODIGO));
  assert.match(text, /vence en 10 minutos/);
  assert.match(text, /No compartas este código con nadie/);
  assert.match(text, /Clubs UNID\nCorreo automático de seguridad\.$/);
  assert.equal(text.includes('<'), false);
  assert.equal(html.includes('<img'), false);
});

test('incluye encabezado, colores de marca, código y aviso de seguridad en HTML', () => {
  const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10, logoUrl: '' });

  assert.match(html, /<!doctype html>/);
  assert.match(html, /lang="es"/);
  assert.match(html, /Clubs UNID/);
  assert.match(html, /Acceso seguro/);
  assert.match(html, new RegExp(CODIGO));
  assert.match(html, /vence en 10 minutos/);
  assert.match(html, /No compartas este código con nadie/);
  assert.match(html, /#0e162c/);
  assert.match(html, /#fbbf24/);
  assert.match(html, /class="otp-code"/);
  assert.equal(html.includes('<a '), false);
  assert.equal(html.includes('http'), false);
});

test('muestra el logo configurado como única imagen externa cuando recibe una URL HTTPS válida', () => {
  const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10, logoUrl: URL_VALIDA });

  assert.match(html, /<img src="https:\/\/ejemplo\.test\/logo\.png"/);
  assert.match(html, /alt="Clubs UNID"/);
  assert.equal((html.match(/<img /g) || []).length, 1);
  assert.equal(html.includes('<a '), false);
});

test('omite la imagen si logoUrl está vacía', () => {
  for (const vacio of ['', '   ', null, undefined]) {
    const { html } = crearContenidoOtp({
      codigo: CODIGO,
      minutos: 10,
      logoUrl: vacio,
      env: {},
    });
    assert.equal(html.includes('<img'), false);
    assert.match(html, /Clubs UNID/);
    assert.match(html, /Acceso seguro/);
  }
});

test('omite la imagen si logoUrl es inválida', () => {
  const invalidas = [
    'http://inseguro.test/logo.png',
    'javascript:alert(1)',
    'https://usuario:clave@ejemplo.test/logo.png',
    'no-es-una-url',
    'ftp://ejemplo.test/logo.png',
  ];

  for (const invalida of invalidas) {
    const { html } = crearContenidoOtp({
      codigo: CODIGO,
      minutos: 10,
      logoUrl: invalida,
      env: {},
    });
    assert.equal(html.includes('<img'), false);
    assert.match(html, /Clubs UNID/);
    assert.match(html, /Acceso seguro/);
  }
});

test('lee OTP_LOGO_URL desde el objeto env si no se pasa logoUrl directamente', () => {
  const { html } = crearContenidoOtp({
    codigo: CODIGO,
    minutos: 10,
    env: { OTP_LOGO_URL: 'https://desde-env.test/icono.png' },
  });

  assert.match(html, /<img src="https:\/\/desde-env\.test\/icono\.png"/);
  assert.match(html, /alt="Clubs UNID"/);
});

test('lee OTP_LOGO_URL desde process.env como respaldo', () => {
  const original = process.env.OTP_LOGO_URL;
  process.env.OTP_LOGO_URL = 'https://desde-process-env.test/logo.png';

  try {
    const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10 });
    assert.match(html, /<img src="https:\/\/desde-process-env\.test\/logo\.png"/);
  } finally {
    if (original === undefined) {
      delete process.env.OTP_LOGO_URL;
    } else {
      process.env.OTP_LOGO_URL = original;
    }
  }
});

test('escapa cualquier valor dinámico dentro del HTML', () => {
  const { html } = crearContenidoOtp({
    codigo: '<script>alert("x")</script>',
    minutos: 10,
    logoUrl: 'https://ejemplo.test/logo.png?x=" onerror="alert(1)',
  });

  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('onerror="alert(1)"'), false);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&quot; onerror=&quot;alert\(1\)/);
});

test('valida que el logo sea una URL HTTPS pública', () => {
  assert.equal(esLogoOtpUrlValida(''), false);
  assert.equal(esLogoOtpUrlValida('   '), false);
  assert.equal(esLogoOtpUrlValida('http://ejemplo.test/logo.png'), false);
  assert.equal(esLogoOtpUrlValida('javascript:alert(1)'), false);
  assert.equal(esLogoOtpUrlValida('https://usuario:clave@ejemplo.test/logo.png'), false);
  assert.equal(esLogoOtpUrlValida('no-es-una-url'), false);
  assert.equal(esLogoOtpUrlValida(URL_VALIDA), true);
});

test('resolverLogoOtpUrl retorna cadena vacía ante URLs vacías o inválidas', () => {
  assert.equal(resolverLogoOtpUrl({ logoUrl: '' }), '');
  assert.equal(resolverLogoOtpUrl({ logoUrl: 'http://inseguro.test/logo.png' }), '');
  assert.equal(resolverLogoOtpUrl({ logoUrl: URL_VALIDA }), URL_VALIDA);
});

test('usa la expiración para calcular los minutos cuando no recibe minutos', () => {
  const { text } = crearContenidoOtp({
    codigo: CODIGO,
    expiracion: new Date(Date.now() + 10 * 60 * 1000),
    logoUrl: '',
  });

  assert.match(text, /vence en 10 minutos/);
});
