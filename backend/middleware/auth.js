import jwt from 'jsonwebtoken';
import pool from '../db.js';

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

export function requireClubLeader(req, res, next) {
  if (!req.user || (req.user.id_rol !== 2 && req.user.id_rol !== 5)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }

  const clubId = req.params.id || req.params.id_club;
  if (!clubId) {
    return res.status(400).json({ error: 'id_club requerido' });
  }

  pool.query(
    'SELECT id_presidente, id_vicepresidente FROM clubes WHERE id_club = $1',
    [clubId]
  ).then(({ rows }) => {
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    const club = rows[0];
    if (club.id_presidente !== req.user.id && club.id_vicepresidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres líder de este club' });
    }
    next();
  }).catch(err => {
    console.error('Error en requireClubLeader:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
}
