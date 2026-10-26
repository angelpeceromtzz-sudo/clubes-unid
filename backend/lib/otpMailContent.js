const ASUNTO_OTP = 'Tu código de acceso a Clubs UNID';
const COLOR_AZUL = '#0e162c';
const COLOR_AZUL_CLARO = '#121c33';
const COLOR_AMBAR = '#fbbf24';
const COLOR_BORDE = '#e2e8f0';
const COLOR_FONDO = '#f1f5f9';
const COLOR_TEXTO = '#334155';
const COLOR_MUTED = '#64748b';

function minutosDeVigencia(minutos, expiracion) {
  const valor = Number(minutos);

  if (Number.isInteger(valor) && valor > 0) {
    return valor;
  }

  if (expiracion) {
    const fecha = expiracion instanceof Date ? expiracion : new Date(expiracion);
    const diferencia = Math.ceil((fecha.getTime() - Date.now()) / 60000);

    if (Number.isFinite(diferencia) && diferencia > 0) {
      return diferencia;
    }
  }

  return 10;
}

function escaparHtml(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => {
    const entidades = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entidades[caracter];
  });
}

export function esLogoOtpUrlValida(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    return false;
  }

  try {
    const url = new URL(valor.trim());
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function crearContenidoOtp({ codigo, expiracion, minutos, logoUrl = '' }) {
  const vigencia = minutosDeVigencia(minutos, expiracion);
  const codigoSeguro = escaparHtml(codigo);
  const logo = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  const logoValido = esLogoOtpUrlValida(logo);
  const logoHtml = logoValido
    ? `<img src="${escaparHtml(logo)}" alt="Clubs UNID" width="56" style="display:block;width:56px;max-width:56px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : '';
  const celdaLogo = logoHtml
    ? `<td width="56" valign="middle" style="padding-right:14px;">${logoHtml}</td>`
    : '';

  const text = [
    'Clubs UNID',
    'Acceso seguro',
    '',
    'Hola,',
    '',
    `Tu código de acceso a Clubs UNID es: ${codigo}`,
    '',
    `Este código vence en ${vigencia} minutos.`,
    '',
    'No compartas este código con nadie. Clubs UNID nunca te pedirá el código por teléfono, mensaje o correo.',
    'Si no solicitaste este código, puedes ignorar este correo.',
    '',
    'Clubs UNID',
    'Correo automático de seguridad.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escaparHtml(ASUNTO_OTP)}</title>
<style>
  @media (max-width: 600px) {
    .otp-shell { padding: 16px !important; }
    .otp-card { padding: 28px 20px !important; }
    .otp-code { font-size: 32px !important; letter-spacing: 6px !important; }
    .otp-title { font-size: 22px !important; }
    .otp-header { padding: 20px !important; }
    .otp-footer { padding: 18px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLOR_FONDO};">
  <div style="display:none;font-size:1px;color:${COLOR_FONDO};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Tu código de acceso a Clubs UNID vence en ${vigencia} minutos.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR_FONDO};">
    <tr>
      <td align="center" class="otp-shell" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${COLOR_BORDE};">
          <tr>
            <td class="otp-header" style="background:${COLOR_AZUL};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${celdaLogo}
                  <td valign="middle">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:0.4px;">Clubs UNID</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;font-weight:700;color:${COLOR_AMBAR};letter-spacing:1.2px;text-transform:uppercase;">Acceso seguro</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:${COLOR_AMBAR};line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="otp-card" style="padding:36px 32px 32px;">
              <p class="otp-title" style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;font-weight:700;color:${COLOR_AZUL};">Tu código de acceso</p>
              <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLOR_TEXTO};">Hola, usa este código para entrar a Clubs UNID:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:14px;padding:22px 18px;">
                    <div class="otp-code" style="font-family:'Courier New',Courier,monospace;font-size:40px;line-height:1.1;font-weight:700;letter-spacing:10px;color:${COLOR_AZUL_CLARO};white-space:nowrap;">${codigoSeguro}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;font-weight:700;color:${COLOR_AZUL};">Este código vence en ${vigencia} minutos.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#fffbeb;border-left:4px solid ${COLOR_AMBAR};border-radius:0 8px 8px 0;padding:14px 16px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;font-weight:700;color:#92400e;">No compartas este código con nadie</p>
                    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#78350f;">Clubs UNID nunca te pedirá el código por teléfono, mensaje o correo.</p>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${COLOR_MUTED};">Si no solicitaste este código, puedes ignorar este correo.</p>
            </td>
          </tr>
          <tr>
            <td class="otp-footer" style="background:#f8fafc;border-top:1px solid ${COLOR_BORDE};padding:20px 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;font-weight:700;color:${COLOR_AZUL};">Clubs UNID</p>
              <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLOR_MUTED};">Correo automático de seguridad.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: ASUNTO_OTP,
    text,
    html,
  };
}
