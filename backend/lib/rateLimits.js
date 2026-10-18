import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Umbrales provisionales (§8.8 del informe) hasta medir uso real. Se pueden
// sobrescribir por variable de entorno con valores enteros positivos; si la
// variable falta o no es válida, se usa el default seguro. Los límites están
// activos por defecto en todos los entornos (H8): no hay salto por NODE_ENV.
function enteroPositivo(texto, defecto) {
  const n = Number.parseInt(texto ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : defecto;
}

export const UMBRALES = {
  globalMinuto: enteroPositivo(process.env.RATE_LIMIT_GLOBAL_MINUTO, 1200),
  loginIp15Min: enteroPositivo(process.env.RATE_LIMIT_LOGIN_IP_15MIN, 20),
  loginCuenta15Min: enteroPositivo(process.env.RATE_LIMIT_LOGIN_CUENTA_15MIN, 5),
  microsoft15Min: enteroPositivo(process.env.RATE_LIMIT_MICROSOFT_15MIN, 20),
  registroHora: enteroPositivo(process.env.RATE_LIMIT_REGISTRO_HORA, 10),
  envioEncuestasMinuto: enteroPositivo(process.env.RATE_LIMIT_ENCUESTAS_MINUTO, 300),
  formulariosHora: enteroPositivo(process.env.RATE_LIMIT_FORMULARIOS_HORA, 5),
  uploadMinuto: enteroPositivo(process.env.RATE_LIMIT_UPLOAD_MINUTO, 30),
  notificacionesMinuto: enteroPositivo(process.env.RATE_LIMIT_NOTIFICACIONES_MINUTO, 30),
  lecturasPesadasMinuto: enteroPositivo(process.env.RATE_LIMIT_LECTURAS_MINUTO, 60),
};

const MENSAJE_429 =
  'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.';

function opcionesComunes() {
  return {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // express-rate-limit añade Retry-After y RateLimit automáticamente
    // antes de llamar al handler (dist/index.cjs).
    handler: (req, res) => {
      res.status(429).json({ error: MENSAJE_429 });
    },
  };
}

// Clave por usuario autenticado y REVALIDADA (req.user tras authenticate/H2).
// Nunca proviene del body ni de un JWT decodificado sin verificar. Defensa en
// profundidad: si req.user faltara (montaje incorrecto), cae a la IP.
// ipKeyGenerator agrupa IPv6 por red /56 (require de express-rate-limit v8
// para keyGenerators personalizados que usan req.ip).
export function claveUsuario(req) {
  if (req.user?.id != null) {
    return `usuario:${req.user.id}`;
  }
  return `ip:${ipKeyGenerator(req, 56)}`;
}

// Clave por cuenta para intentos de login: el correo del body, normalizado.
// El límite por IP sigue existiendo en paralelo; esta clave evita la fuerza
// bruta contra una cuenta concreta sin castigar al resto del NAT del campus.
// Un atacante puede variar el correo para obtener cuotas frescas, pero sigue
// topando con el límite por IP de la misma ventana.
export function claveCuentaLogin(req) {
  const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  if (correo === '') {
    return `ip:${ipKeyGenerator(req, 56)}`;
  }
  return `cuenta:${correo.slice(0, 180)}`;
}

// Factory reutilizable por los limitadores del módulo y por las pruebas, que
// inyectan ventanas/umbrales pequeños sin exponer ningún bypass por petición.
export function crearLimitador({ identifier, windowMs, limit, keyGenerator, skip } = {}) {
  return rateLimit({
    ...opcionesComunes(),
    identifier,
    windowMs,
    limit,
    keyGenerator,
    skip,
    // La clave IPv6 por defecto de la v8 agrupa por red /56 (ipv6Subnet: 56),
    // recomendada para clientes móviles; no se sobreescribe.
  });
}

// La IP usa el keyGenerator por defecto de express-rate-limit v8:
// req.ip (con trust proxy=1 toma la última IP del X-Forwarded-For que agregó
// el proxy de Render; las entradas izquierdas spoofables no se usan) y
// agrupación IPv6 /56.

export const limitadorGlobal = crearLimitador({
  identifier: 'global-api',
  windowMs: 60 * 1000,
  limit: UMBRALES.globalMinuto,
  // OPTIONS lo responde el middleware de CORS antes de llegar aquí; el skip
  // es defensa en profundidad. /api/health lo consultan orquestadores.
  skip: (req) => req.method === 'OPTIONS' || (req.method === 'GET' && req.path === '/health'),
});

export const limitadorLoginLocalIp = crearLimitador({
  identifier: 'login-local-ip',
  windowMs: 15 * 60 * 1000,
  limit: UMBRALES.loginIp15Min,
});

export const limitadorLoginLocalCuenta = crearLimitador({
  identifier: 'login-local-cuenta',
  windowMs: 15 * 60 * 1000,
  limit: UMBRALES.loginCuenta15Min,
  keyGenerator: claveCuentaLogin,
});

export const limitadorLoginMicrosoft = crearLimitador({
  identifier: 'login-microsoft-ip',
  windowMs: 15 * 60 * 1000,
  limit: UMBRALES.microsoft15Min,
});

export const limitadorRegistro = crearLimitador({
  identifier: 'register-ip',
  windowMs: 60 * 60 * 1000,
  limit: UMBRALES.registroHora,
});

export const limitadorEnvioEncuestas = crearLimitador({
  identifier: 'envio-encuestas-ip',
  windowMs: 60 * 1000,
  limit: UMBRALES.envioEncuestasMinuto,
});

export const limitadorFormularios = crearLimitador({
  identifier: 'formularios-usuario',
  windowMs: 60 * 60 * 1000,
  limit: UMBRALES.formulariosHora,
  keyGenerator: claveUsuario,
});

export const limitadorUpload = crearLimitador({
  identifier: 'upload-usuario',
  windowMs: 60 * 1000,
  limit: UMBRALES.uploadMinuto,
  keyGenerator: claveUsuario,
});

export const limitadorNotificaciones = crearLimitador({
  identifier: 'notificaciones-usuario',
  windowMs: 60 * 1000,
  limit: UMBRALES.notificacionesMinuto,
  keyGenerator: claveUsuario,
});

export const limitadorLecturasPesadas = crearLimitador({
  identifier: 'lecturas-pesadas-usuario',
  windowMs: 60 * 1000,
  limit: UMBRALES.lecturasPesadasMinuto,
  keyGenerator: claveUsuario,
});
