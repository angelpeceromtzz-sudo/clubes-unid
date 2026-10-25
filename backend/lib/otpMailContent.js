const ASUNTO_OTP = 'Tu código de acceso a Clubs UNID';

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

export function crearContenidoOtp({ codigo, expiracion, minutos }) {
  const vigencia = minutosDeVigencia(minutos, expiracion);
  const codigoSeguro = escaparHtml(codigo);

  return {
    subject: ASUNTO_OTP,
    text: [
      'Hola,',
      '',
      `Tu código de acceso a Clubs UNID es: ${codigo}`,
      '',
      `El código es válido durante ${vigencia} minutos.`,
      'Si no solicitaste este código, puedes ignorar este correo. No compartas el código con nadie.',
      '',
      'Clubs UNID',
    ].join('\n'),
    html: [
      '<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">',
      '<p>Hola,</p>',
      '<p>Tu código de acceso a Clubs UNID es:</p>',
      `<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${codigoSeguro}</p>`,
      `<p>El código es válido durante ${vigencia} minutos.</p>`,
      '<p>Si no solicitaste este código, puedes ignorar este correo. No compartas el código con nadie.</p>',
      '<p>Clubs UNID</p>',
      '</div>',
    ].join(''),
  };
}
