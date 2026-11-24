import { leerConfiguracionResend } from './resendMailer.js';
import { leerConfiguracionSmtp, crearOpcionesNodemailer } from './smtpMailer.js';

export function construirEnlaceMisiones(folio, token, origen, ruta = 'misiones') {
  const url = new URL(origen);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('MISIONES_PUBLIC_URL inválida');
  if (url.username || url.password) throw new Error('MISIONES_PUBLIC_URL inválida');
  if (!['misiones', 'trineo'].includes(ruta)) throw new Error('Ruta de invitado inválida');
  return new URL('/actividades/' + ruta + '/registro/' + folio + '#acceso=' + token, url.origin).href;
}

// Canal operativo independiente: el acceso OTP conserva su validación institucional.
export function crearCorreoMisiones({ env = process.env, fetchImpl = globalThis.fetch, crearTransporte, enviados = [] } = {}) {
  let transporte;
  return {
    enviados,
    async enviarEnlace({ correo, folio, token, edicion, ruta = 'misiones', titulo = 'Misiones' }) {
      const origen = env.MISIONES_PUBLIC_URL?.trim() || env.PUBLIC_URL?.trim() || 'https://clubsunid.com.mx';
      const enlace = construirEnlaceMisiones(folio, token, origen, ruta);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || /[\r\n]/.test(correo)) throw new Error('Destinatario inválido');
      const mensaje = {
        to: correo, subject: 'Tu inscripción a ' + titulo,
        text: `Tu inscripción a ${edicion} está confirmada.\n\nFolio: ${folio}\n\nConsulta y edita tu registro desde este enlace privado:\n${enlace}\n\nTambién lo usarás para identificar tu inscripción al pasar lista por QR. Guarda este enlace y compártelo únicamente si necesitas ayuda del encargado.`,
      };
      const proveedor = (env.MISIONES_MAIL_PROVIDER || env.OTP_MAIL_PROVIDER || 'mock').toLowerCase();
      if (proveedor === 'mock' && env.NODE_ENV !== 'production') { enviados.push({ ...mensaje, enlace }); return; }
      if (proveedor === 'resend') {
        const { config, errores } = leerConfiguracionResend(env);
        if (errores.length) throw new Error('Correo de Misiones no configurado');
        const respuesta = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mensaje, from: config.from, to: [correo] }), signal: AbortSignal.timeout(10000),
        });
        if (!respuesta.ok) throw new Error('No se pudo enviar el enlace');
        return;
      }
      if (proveedor === 'smtp') {
        const { config, errores } = leerConfiguracionSmtp(env);
        if (errores.length) throw new Error('Correo de Misiones no configurado');
        if (!transporte) {
          const crear = crearTransporte || (await import('nodemailer')).default.createTransport;
          transporte = crear(crearOpcionesNodemailer(config));
        }
        await transporte.sendMail({ ...mensaje, from: config.from, disableFileAccess: true, disableUrlAccess: true });
        return;
      }
      throw new Error('Proveedor de correo de Misiones no disponible');
    },
    cerrar() { transporte?.close?.(); },
  };
}
