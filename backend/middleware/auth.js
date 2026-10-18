import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { esIdEntero } from '../lib/validarId.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // 1) Firma y expiración con el mecanismo existente. Si falla, se rechaza
  //    aquí mismo: no se consulta la base.
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // El claim "id" es el id_usuario (ver generarToken en routes/auth.js).
  if (!decoded?.id) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // 2)-4) Revalidación contra la BD (auditoría H2): la vigencia de la cuenta
  //      (deleted_at) y el rol actuales mandan, no los claims del token.
  //      deleted_at IS NULL filtra cuentas desactivadas en la propia consulta.
  let resultado;
  try {
    resultado = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.id_rol
       FROM usuarios u
       WHERE u.id_usuario = $1 AND u.deleted_at IS NULL`,
      [decoded.id]
    );
  } catch (err) {
    // Fail closed: ante un fallo de la BD no se aceptan los claims del token
    // como respaldo ni se exponen detalles del error.
    console.error('Error al revalidar usuario en authenticate:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  if (resultado.rows.length === 0) {
    return res.status(401).json({ error: 'Sesión no válida o cuenta desactivada' });
  }

  const fila = resultado.rows[0];

  // 5) req.user se construye SOLO con datos actuales de la BD. Los claims del
  //    token no se mezclan (ni siquiera en último lugar), para que un rol
  //    retirado o un nombre antiguo no sobrevivan dentro de la sesión.
  req.user = {
    id: fila.id_usuario,
    nombre_completo: fila.nombre_completo,
    id_rol: fila.id_rol,
  };
  next();
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

  // H16: antes solo se leían `id`/`id_club`, así que las rutas con `:idClub`
  // (POST /api/horarios/club/:idClub) respondían siempre 400. Se aceptan los
  // tres nombres de parámetro usados en el backend; `idClub` va primero porque
  // en horarios `:id` es el id del horario, no del club.
  const clubId = req.params.idClub || req.params.id_club || req.params.id;
  if (!clubId) {
    return res.status(400).json({ error: 'id_club requerido' });
  }
  // H13: un identificador no numérico hoy llegaba a PostgreSQL y terminaba
  // en un 500 por error de casteo.
  if (!esIdEntero(clubId)) {
    return res.status(400).json({ error: 'id_club inválido' });
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

// H16: variante para rutas cuyo parámetro `:id` es un HORARIO y no un club
// (PUT/DELETE /api/horarios/:id). `requireClubLeader` no puede conocer el
// club sin consultar la BD y, con `id` = id de horario, verificaba el
// liderazgo contra el club equivocado. Este middleware resuelve el club real
// del horario y aplica las mismas restricciones: rol líder (2/5), horario
// existente (404) y liderazgo sobre su club (403).
export async function requireHorarioLeader(req, res, next) {
  if (!req.user || (req.user.id_rol !== 2 && req.user.id_rol !== 5)) {
    return res.status(403).json({ error: 'No tienes permisos para esta acción' });
  }

  const horarioId = req.params.id;
  if (!esIdEntero(horarioId)) {
    return res.status(400).json({ error: 'id de horario inválido' });
  }

  try {
    const horario = await pool.query(
      'SELECT id_club FROM horarios_club WHERE id_horario = $1',
      [horarioId]
    );
    if (horario.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    const club = await pool.query(
      'SELECT id_club FROM clubes WHERE id_club = $1 AND (id_presidente = $2 OR id_vicepresidente = $2)',
      [horario.rows[0].id_club, req.user.id]
    );
    if (club.rows.length === 0) {
      return res.status(403).json({ error: 'No eres líder de este club' });
    }
    next();
  } catch (err) {
    console.error('Error en requireHorarioLeader:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
