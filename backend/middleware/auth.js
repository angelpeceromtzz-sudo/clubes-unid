import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  let token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.id_rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
