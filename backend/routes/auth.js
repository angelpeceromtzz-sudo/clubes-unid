import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

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
              u.password_hash, u.id_rol, r.nombre_rol as rol
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

    if (!correo) {
      return res.status(400).json({ error: 'No se pudo obtener el correo desde Microsoft' });
    }

    const ADMIN_CORREO = '00906641@red.unid.mx';
    let idRol = 1;

    if (correo === ADMIN_CORREO) {
      const adminResult = await pool.query(
        `SELECT id_rol FROM cat_roles WHERE nombre_rol = 'admin'`,
      );
      idRol = adminResult.rows.length > 0 ? adminResult.rows[0].id_rol : 3;
    }

    const existing = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.correo_institucional = $1`,
      [correo],
    );

    let user;

    if (existing.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO usuarios (nombre_completo, correo_institucional, microsoft_id, id_rol)
         VALUES ($1, $2, $3, $4)
         RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
        [nombre, correo, microsoftId, idRol],
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
      user = existing.rows[0];

      if (correo === ADMIN_CORREO && user.id_rol !== idRol) {
        await pool.query(
          `UPDATE usuarios SET id_rol = $1, microsoft_id = COALESCE(microsoft_id, $2)
           WHERE id_usuario = $3`,
          [idRol, microsoftId, user.id_usuario],
        );

        user.id_rol = idRol;
        user.rol = 'admin';
      } else if (!user.rol) {
        const rolResult = await pool.query(
          `SELECT nombre_rol FROM cat_roles WHERE id_rol = $1`,
          [user.id_rol],
        );
        user.rol = rolResult.rows[0]?.nombre_rol || 'alumno';
      }
    }

    const token = generarToken(user);

    res.json({
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        correo_institucional: user.correo_institucional,
        id_rol: user.id_rol,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error('Error en login-microsoft:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve el perfil del usuario autenticado con su club actual
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol,
              i.id_club, c.nombre_club, c.categoria, c.cupo_maximo,
              c.id_presidente
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
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
