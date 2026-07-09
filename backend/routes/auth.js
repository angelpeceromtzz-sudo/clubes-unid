import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno');
  process.exit(1);
}

function generarToken(user) {
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

router.post('/login-local', loginLimiter, async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.institutional_id, u.password_hash, u.id_rol, r.nombre_rol as rol
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.correo_institucional = $1`,
      [correo],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Esta cuenta usa inicio de sesión con Microsoft' });
    }

    const passwordMatch = await bcrypt.compare(contrasena, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generarToken(user);

    res.json({
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        correo_institucional: user.correo_institucional,
        institutional_id: user.institutional_id,
        id_rol: user.id_rol,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error('Error en login-local:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/login-microsoft', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token de Microsoft es obligatorio' });
    }

    let graphData;
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      graphData = response.data;
    } catch {
      return res.status(401).json({ error: 'Token de Microsoft inválido o expirado' });
    }

    const microsoftId = graphData.id;
    const nombre = graphData.displayName || 'Usuario Microsoft';
    const correo = graphData.mail || graphData.userPrincipalName;
    const userPrincipalName = graphData.userPrincipalName || '';

    if (!correo) {
      return res.status(400).json({ error: 'No se pudo obtener el correo desde Microsoft' });
    }

    const institutionalId = (userPrincipalName && userPrincipalName.includes('@'))
      ? userPrincipalName.split('@')[0]
      : null;

    const ADMIN_CORREO = process.env.ADMIN_CORREO;
    let idRol = 1;

    if (correo === ADMIN_CORREO) {
      const adminResult = await pool.query(
        `SELECT id_rol FROM cat_roles WHERE nombre_rol = 'admin'`,
      );
      idRol = adminResult.rows.length > 0 ? adminResult.rows[0].id_rol : 3;
    }

    let existing = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol, u.institutional_id, u.deleted_at
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.microsoft_id = $1`,
      [microsoftId],
    );

    if (existing.rows.length === 0) {
      existing = await pool.query(
        `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
                u.id_rol, r.nombre_rol as rol, u.institutional_id, u.deleted_at
         FROM usuarios u
         JOIN cat_roles r ON r.id_rol = u.id_rol
         WHERE u.correo_institucional = $1`,
        [correo],
      );
    }

    let user;

    if (existing.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO usuarios (nombre_completo, correo_institucional, microsoft_id, institutional_id, id_rol, last_login)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id_usuario, nombre_completo, correo_institucional, id_rol, institutional_id`,
        [nombre, correo, microsoftId, institutionalId, idRol],
      );

      const rolResult = await pool.query(
        `SELECT nombre_rol FROM cat_roles WHERE id_rol = $1`,
        [idRol],
      );

      user = {
        ...insertResult.rows[0],
        rol: rolResult.rows[0]?.nombre_rol || 'alumno',
      };
    } else {
      const row = existing.rows[0];

      if (row.deleted_at) {
        return res.status(403).json({
          error: 'Cuenta desactivada. Contacta al administrador.',
        });
      }

      await pool.query(
        `UPDATE usuarios SET
           nombre_completo = $1,
           microsoft_id = COALESCE(microsoft_id, $2),
           institutional_id = COALESCE($3, institutional_id),
           last_login = NOW()
         WHERE id_usuario = $4`,
        [nombre, microsoftId, institutionalId, row.id_usuario],
      );

      if (correo === ADMIN_CORREO && row.id_rol !== idRol) {
        await pool.query(
          `UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2`,
          [idRol, row.id_usuario],
        );

        row.id_rol = idRol;
        row.rol = 'admin';
      } else if (!row.rol) {
        const rolResult = await pool.query(
          `SELECT nombre_rol FROM cat_roles WHERE id_rol = $1`,
          [row.id_rol],
        );
        row.rol = rolResult.rows[0]?.nombre_rol || 'alumno';
      }

      user = {
        id_usuario: row.id_usuario,
        nombre_completo: nombre,
        correo_institucional: row.correo_institucional,
        institutional_id: institutionalId || row.institutional_id,
        id_rol: row.id_rol,
        rol: row.rol,
      };
    }

    const token = generarToken(user);

    res.json({
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        correo_institucional: user.correo_institucional,
        institutional_id: user.institutional_id,
        id_rol: user.id_rol,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error('Error en login-microsoft:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario (solo admin)
router.post('/register', authenticate, requireRole(3), async (req, res) => {
  try {
    const { nombre_completo, correo_institucional, contrasena, id_rol } = req.body;

    if (!nombre_completo || !correo_institucional || !contrasena) {
      return res.status(400).json({ error: 'nombre_completo, correo_institucional y contrasena son obligatorios' });
    }

    const existe = await pool.query('SELECT id_usuario FROM usuarios WHERE correo_institucional = $1', [correo_institucional]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(contrasena, salt);
    const rolFinal = id_rol || 1;

    const result = await pool.query(
      `INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
      [nombre_completo.trim(), correo_institucional.trim(), password_hash, rolFinal],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve el perfil del usuario autenticado con su club actual
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.institutional_id, u.id_rol, r.nombre_rol as rol,
              COALESCE(cp.id_club, i.id_club) AS id_club,
              COALESCE(cp.nombre_club, c.nombre_club) AS nombre_club,
              COALESCE(cp.categoria, c.categoria) AS categoria,
              COALESCE(cp.cupo_maximo, c.cupo_maximo) AS cupo_maximo,
              cp.id_presidente
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN clubes cp ON cp.id_presidente = u.id_usuario
       LEFT JOIN inscripciones i ON i.id_usuario = u.id_usuario AND i.id_estatus_inscripcion = 1
       LEFT JOIN clubes c ON c.id_club = i.id_club
       WHERE u.id_usuario = $1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
