import { randomUUID } from 'node:crypto';

const PROVEEDORES = new Set(['mock', 'resend', 'smtp']);

function proveedorCargado(mailer) {
  return PROVEEDORES.has(mailer?.proveedor) ? mailer.proveedor : 'no_soportado';
}

function estadoHttpValido(valor) {
  return Number.isInteger(valor) && valor >= 100 && valor <= 599;
}

export function registrarConfiguracionOtp(mailer, env = process.env) {
  console.info('[OTP]', JSON.stringify({
    evento: 'configuracion_cargada',
    proveedor: proveedorCargado(mailer),
    habilitado: String(env.AUTH_OTP_ENABLED || '').trim().toLowerCase() === 'true',
    disponible: typeof mailer?.estaDisponible === 'function' && mailer.estaDisponible(),
    pepper_configurado: typeof env.OTP_PEPPER === 'string' && env.OTP_PEPPER.length > 0,
  }));
}

// El identificador se genera en el servidor. No se copian datos de la petición,
// credenciales, códigos ni respuestas del proveedor a los registros.
export function diagnosticarSolicitudOtp(mailer) {
  return (req, res, next) => {
    const solicitudId = randomUUID();
    const proveedor = proveedorCargado(mailer);

    res.locals.registrarOtp = (evento, detalle = {}) => {
      const registro = { evento, solicitud_id: solicitudId, proveedor };

      for (const campo of ['http', 'http_proveedor']) {
        if (estadoHttpValido(detalle[campo])) {
          registro[campo] = detalle[campo];
        }
      }

      console.info('[OTP]', JSON.stringify(registro));
    };

    res.locals.registrarOtp('solicitud_recibida');
    res.once('finish', () => {
      res.locals.registrarOtp('solicitud_finalizada', { http: res.statusCode });
    });
    next();
  };
}
