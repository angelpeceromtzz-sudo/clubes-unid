import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContenidoOtp, esLogoOtpUrlValida } from '../lib/otpMailContent.js';

const CODIGO = '654321';
const LOGO = 'https://res.cloudinary.com/o7ozc3zt/image/upload/v1792979538/lobounid_jw1mjq.png';

test('genera un texto plano completo y sin imágenes', () => {
  const { subject, text, html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10 });

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
  const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10 });

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

test('muestra el logo configurado como única imagen externa', () => {
  const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10, logoUrl: LOGO });

  assert.match(html, /<img src="https:\/\/res\.cloudinary\.com\/o7ozc3zt\/image\/upload\/v1\/clubs-unid\/logo\.png"/);
  assert.match(html, /alt="Clubs UNID"/);
  assert.equal((html.match(/<img /g) || []).length, 1);
  assert.equal(html.includes('<a '), false);
});

test('omite la imagen si logoUrl está vacía o es inválida', () => {
  const casos = [
    '',
    '   ',
    'http://res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png',
    'javascript:alert(1)',
    'https://usuario:clave@res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png',
  ];

  for (const caso of casos) {
    const { html } = crearContenidoOtp({ codigo: CODIGO, minutos: 10, logoUrl: caso });
    assert.equal(html.includes('<img'), false);
    assert.match(html, /Clubs UNID/);
    assert.match(html, /Acceso seguro/);
  }
});

test('escapa cualquier valor dinámico dentro del HTML', () => {
  const { html } = crearContenidoOtp({
    codigo: '<script>alert("x")</script>',
    minutos: 10,
    logoUrl: 'https://res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png?x=" onerror="alert(1)',
  });

  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('onerror="alert(1)"'), false);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&quot; onerror=&quot;alert\(1\)/);
});

test('valida que el logo sea una URL HTTPS pública', () => {
  assert.equal(esLogoOtpUrlValida(''), false);
  assert.equal(esLogoOtpUrlValida('   '), false);
  assert.equal(esLogoOtpUrlValida('http://res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png'), false);
  assert.equal(esLogoOtpUrlValida('javascript:alert(1)'), false);
  assert.equal(esLogoOtpUrlValida('https://usuario:clave@res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png'), false);
  assert.equal(esLogoOtpUrlValida('no-es-una-url'), false);
  assert.equal(esLogoOtpUrlValida(LOGO), true);
});

test('usa la expiración para calcular los minutos cuando no recibe minutos', () => {
  const { text } = crearContenidoOtp({
    codigo: CODIGO,
    expiracion: new Date(Date.now() + 10 * 60 * 1000),
  });

  assert.match(text, /vence en 10 minutos/);
});
