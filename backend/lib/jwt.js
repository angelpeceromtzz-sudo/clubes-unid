import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const FORMATO_GENERACION = /^[a-f0-9]{64}$/i;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

// Advertencia de robustez (T-034): un secreto corto debilita la firma. No se
// bloquea para no romper entornos de desarrollo, pero en producción debe
// tener al menos 32 caracteres (ver docs/SEGURIDAD-OPERACION.md).
if (JWT_SECRET.length < 32) {
  console.warn('ADVERTENCIA: JWT_SECRET tiene menos de 32 caracteres; rota a un valor más largo en producción.');
}

// Mantiene el contrato que ya consumía el frontend:
// id (id_usuario), nombre_completo, correo_institucional, institutional_id,
// id_rol y rol. Las sesiones confiables añaden el dispositivo y su generación;
// esta última es obligatoria para evitar reactivar JWT antiguos sin ese vínculo.
export function generarToken(user, { idDispositivoConfiable, generacion } = {}) {
  const payload = {
    id: user.id_usuario,
    nombre_completo: user.nombre_completo,
    correo_institucional: user.correo_institucional,
    institutional_id: user.institutional_id,
    id_rol: user.id_rol,
    rol: user.rol,
  };

  if (idDispositivoConfiable != null) {
    if (!FORMATO_GENERACION.test(generacion || '')) {
      throw new Error('No se puede emitir un JWT confiable sin una generación válida.');
    }

    payload.id_dispositivo_confiable = idDispositivoConfiable;
    payload.generacion_dispositivo_confiable = generacion.toLowerCase();
  }

  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '24h' },
  );
}
