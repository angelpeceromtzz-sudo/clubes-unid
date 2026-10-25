import { Router } from 'express';
import { isIP } from 'node:net';
import { otpStore } from '../lib/otpStore.js';
import { mailer } from '../lib/mailer.js';
import { generarToken } from '../lib/jwt.js';
import {
  normalizarCorreoInstitucional,
  esCorreoInstitucionalValido,
} from '../lib/institutionalEmail.js';
import {
  MAX_INTENTOS_OTP,
  calcularExpiracionOtp,
  compararHashOtp,
  esCodigoOtpValido,
  estaExpiradoOtp,
  generarCodigoOtp,
  generarHashOtp,
  normalizarCodigoOtp,
  obtenerMinutosExpiracionOtp,
} from '../lib/otp.js';
import {
  limitadorOtpSolicitudIp,
  limitadorOtpSolicitudCuenta,
  limitadorOtpVerificacionIp,
  limitadorOtpVerificacionCuenta,
} from '../lib/rateLimits.js';

const router = Router();

const MENSAJE_SOLICITUD_GENERICO = 'Si el correo es válido, recibirás un código de acceso.';
const MENSAJE_VERIFICACION_GENERICO = 'Código inválido o expirado.';
const MENSAJE_NO_DISPONIBLE = 'El acceso mediante código no está disponible.';
const MENSAJE_ERROR_INTERNO = 'No se pudo procesar la solicitud.';

const ROLES_SIN_OTP = new Set([3, 4]);
const NOMBRES_ROL = {
  1: 'alumno',
  2: 'presidente',
  3: 'admin',
  4: 'rectoria',
  5: 'vicepresidente',
};

function otpHabilitado() {
  return String(process.env.AUTH_OTP_ENABLED || '').trim().toLowerCase() === 'true';
}

function exigirOtpHabilitado(req, res, next) {
  if (!otpHabilitado()) {
    return res.status(503).json({ error: MENSAJE_NO_DISPONIBLE });
  }

  next();
}

function pepperConfigurado() {
  return typeof process.env.OTP_PEPPER === 'string' && process.env.OTP_PEPPER.length > 0;
}

function responderSolicitudGenerica(res) {
  return res.status(200).json({ message: MENSAJE_SOLICITUD_GENERICO });
}

function responderVerificacionGenerica(res) {
  return res.status(401).json({ error: MENSAJE_VERIFICACION_GENERICO });
}

function ipSolicitud(req) {
  const ip = typeof req.ip === 'string' ? req.ip : '';

  return isIP(ip) ? ip : null;
}

function nombreError(err) {
  return err?.name || 'Error';
}

function codigoError(err) {
  return err?.code || '';
}

function usuarioBloqueadoParaOtp(usuario) {
  return Boolean(usuario?.deleted_at) || ROLES_SIN_OTP.has(Number(usuario?.id_rol));
}

function rolDesdeFila(usuario) {
  return usuario.rol || NOMBRES_ROL[Number(usuario.id_rol)] || 'alumno';
}

function respuestaUsuario(usuario) {
  return {
    id_usuario: usuario.id_usuario,
    nombre_completo: usuario.nombre_completo,
    correo_institucional: usuario.correo_institucional,
    institutional_id: usuario.institutional_id,
    id_rol: usuario.id_rol,
    rol: rolDesdeFila(usuario),
  };
}

// POST /api/auth/otp/solicitar
//
// Genera un código de un solo uso y lo envía por la abstracción de mailer.
// La respuesta es genérica exista o no la cuenta. No se envía código a
// cuentas desactivadas ni a roles que no tienen permitido OTP.
router.post(
  '/solicitar',
  exigirOtpHabilitado,
  limitadorOtpSolicitudIp,
  limitadorOtpSolicitudCuenta,
  async (req, res) => {
    const correo = normalizarCorreoInstitucional(req.body?.correo);

    if (!esCorreoInstitucionalValido(correo)) {
      return res.status(400).json({ error: 'Correo institucional inválido.' });
    }

    if (!pepperConfigurado()) {
      console.error('OTP no disponible: OTP_PEPPER no está configurado.');
      return res.status(503).json({ error: MENSAJE_NO_DISPONIBLE });
    }

    if (typeof mailer.estaDisponible === 'function' && !mailer.estaDisponible()) {
      console.error(
        'OTP no disponible: proveedor de correo no configurado.',
        mailer.motivoNoDisponible || '',
      );
      return res.status(503).json({ error: MENSAJE_NO_DISPONIBLE });
    }

    try {
      const usuario = await otpStore.buscarUsuario({ correo });

      // No se envía código a cuentas desactivadas ni a admin/rectoría. La
      // respuesta sigue siendo genérica para no revelar el estado de la cuenta.
      if (usuario && usuarioBloqueadoParaOtp(usuario)) {
        return responderSolicitudGenerica(res);
      }

      const codigo = generarCodigoOtp();
      const codigoHash = generarHashOtp(codigo);
      const minutosExpiracion = obtenerMinutosExpiracionOtp();
      const expiraEn = calcularExpiracionOtp(new Date(), minutosExpiracion);

      const registro = await otpStore.invalidarYGuardar({
        correo,
        codigoHash,
        expiraEn,
        maxIntentos: MAX_INTENTOS_OTP,
        ip: ipSolicitud(req),
        userAgent: (req.get('user-agent') || '').slice(0, 500) || null,
      });

      if (registro?.id_otp == null) {
        console.error('No se pudo registrar el código OTP.');
        return responderSolicitudGenerica(res);
      }

      try {
        await mailer.enviarCodigoOtp({
          correo,
          codigo,
          expiracion: expiraEn,
          minutos: minutosExpiracion,
        });
      } catch (err) {
        // El fallo se registra sin el código. El código recién guardado se
        // invalida para que no quede un registro activo sin correo enviado.
        console.error('Error al enviar el código OTP:', nombreError(err), codigoError(err));
        await otpStore.marcarConsumido({ idOtp: registro.id_otp, codigoHash }).catch(() => {});
      }

      return responderSolicitudGenerica(res);
    } catch (err) {
      console.error('Error en la solicitud de OTP:', nombreError(err), codigoError(err));
      return res.status(500).json({ error: MENSAJE_ERROR_INTERNO });
    }
  },
);

// POST /api/auth/otp/verificar
//
// Verifica el código, lo consume de forma atómica y emite exactamente el mismo
// JWT que login-local/login-microsoft. Nunca acepta un rol del cliente: el rol
// sale de usuarios.id_rol. Admin y rectoría quedan fuera del flujo OTP.
router.post(
  '/verificar',
  exigirOtpHabilitado,
  limitadorOtpVerificacionIp,
  limitadorOtpVerificacionCuenta,
  async (req, res) => {
    const correo = normalizarCorreoInstitucional(req.body?.correo);
    const codigo = normalizarCodigoOtp(req.body?.codigo);

    if (!esCorreoInstitucionalValido(correo) || !esCodigoOtpValido(codigo)) {
      return res.status(400).json({ error: MENSAJE_VERIFICACION_GENERICO });
    }

    if (!pepperConfigurado()) {
      console.error('OTP no disponible: OTP_PEPPER no está configurado.');
      return res.status(503).json({ error: MENSAJE_NO_DISPONIBLE });
    }

    try {
      const registro = await otpStore.buscarCodigoActivo({ correo });

      if (!registro) {
        return responderVerificacionGenerica(res);
      }

      if (
        estaExpiradoOtp(registro.expira_en) ||
        Number(registro.intentos) >= Number(registro.max_intentos)
      ) {
        await otpStore.marcarConsumido({
          idOtp: registro.id_otp,
          codigoHash: registro.codigo_hash,
        });
        return responderVerificacionGenerica(res);
      }

      if (!compararHashOtp(codigo, registro.codigo_hash)) {
        await otpStore.registrarIntentoFallido({
          idOtp: registro.id_otp,
          codigoHash: registro.codigo_hash,
        });
        return responderVerificacionGenerica(res);
      }

      // Consumo atómico: solo una petición puede pasar de aquí con el mismo
      // código, incluso si llegan dos verificaciones concurrentes o si una
      // solicitud nueva reemplaza el código entre la lectura y el consumo.
      const consumido = await otpStore.consumirCodigo({
        idOtp: registro.id_otp,
        codigoHash: registro.codigo_hash,
      });

      if (!consumido) {
        return responderVerificacionGenerica(res);
      }

      let usuario = await otpStore.buscarUsuario({ correo });

      if (usuario && usuarioBloqueadoParaOtp(usuario)) {
        return responderVerificacionGenerica(res);
      }

      if (!usuario) {
        const nombre = correo.split('@')[0];
        const creado = await otpStore.crearUsuarioOtp({ correo, nombre });

        if (creado) {
          usuario = { ...creado, deleted_at: null };
        } else {
          // Otra petición pudo crear la cuenta entre la búsqueda y el INSERT.
          usuario = await otpStore.buscarUsuario({ correo });
        }

        if (!usuario || usuarioBloqueadoParaOtp(usuario)) {
          return responderVerificacionGenerica(res);
        }
      } else {
        await otpStore.actualizarLastLogin({ idUsuario: usuario.id_usuario });
      }

      const token = generarToken(usuario);

      return res.json({
        token,
        user: respuestaUsuario(usuario),
      });
    } catch (err) {
      console.error('Error en la verificación de OTP:', nombreError(err), codigoError(err));
      return res.status(500).json({ error: MENSAJE_ERROR_INTERNO });
    }
  },
);

export default router;
