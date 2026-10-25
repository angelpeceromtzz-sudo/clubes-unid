import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

// Mantiene exactamente el contrato que ya consumía el frontend:
// id (id_usuario), nombre_completo, correo_institucional, institutional_id,
// id_rol y rol. No se agregan claims que cambien el comportamiento actual.
export function generarToken(user) {
  return jwt.sign(
    {
      id: user.id_usuario,
      nombre_completo: user.nombre_completo,
      correo_institucional: user.correo_institucional,
      institutional_id: user.institutional_id,
      id_rol: user.id_rol,
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
}
