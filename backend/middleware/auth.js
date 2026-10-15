import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;

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

// Solo el PRESIDENTE del club (rol 2). El vicepresidente NO tiene acceso en Asistencia V1.
// Si no llega id_club en la petición, se resuelve el club donde el usuario es presidente.
export async function requireClubPresident(req, res, next) {
  try {
    if (!req.user || req.user.id_rol !== 2) {
      return res.status(403).json({ error: 'Solo el presidente del club puede realizar esta acción' });
    }

    const clubId = req.params.id_club || req.params.idClub || req.body?.id_club || req.query?.id_club;

    if (clubId) {
      const club = await pool.query(
        'SELECT id_presidente FROM clubes WHERE id_club = $1',
        [clubId]
      );
      if (club.rows.length === 0) {
        return res.status(404).json({ error: 'Club no encontrado' });
      }
      if (club.rows[0].id_presidente !== req.user.id) {
        return res.status(403).json({ error: 'No eres el presidente de este club' });
      }
      req.idClub = parseInt(clubId, 10);
      return next();
    }

    const propios = await pool.query(
      'SELECT id_club FROM clubes WHERE id_presidente = $1',
      [req.user.id]
    );
    if (propios.rows.length === 0) {
      return res.status(403).json({ error: 'No eres presidente de ningún club' });
    }
    req.idClub = propios.rows[0].id_club;
    next();
  } catch (err) {
    console.error('Error en requireClubPresident:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Verifica que el usuario autenticado sea el presidente del club de la sesión indicada en :id.
// Carga la sesión en req.sesion y el club en req.idClub.
export async function requirePresidenteDeLaSesion(req, res, next) {
  try {
    if (!req.user || req.user.id_rol !== 2) {
      return res.status(403).json({ error: 'Solo el presidente del club puede realizar esta acción' });
    }

    const idSesion = parseInt(req.params.id, 10);
    if (!Number.isInteger(idSesion)) {
      return res.status(400).json({ error: 'id de sesión inválido' });
    }

    const sesion = await pool.query(
      'SELECT * FROM sesiones WHERE id_sesion = $1',
      [idSesion]
    );
    if (sesion.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [sesion.rows[0].id_club]
    );
    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente del club de esta sesión' });
    }

    req.sesion = sesion.rows[0];
    req.idClub = sesion.rows[0].id_club;
    next();
  } catch (err) {
    console.error('Error en requirePresidenteDeLaSesion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
