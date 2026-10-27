import { Router } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generarToken } from '../lib/jwt.js';
import {
  limitadorLoginLocalIp,
  limitadorLoginLocalCuenta,
  limitadorLoginMicrosoft,
  limitadorRegistro,
} from '../lib/rateLimits.js';
import otpRouter from './otp.js';

const router = Router();

// Acceso alternativo por código OTP. No reemplaza ni modifica los flujos
// existentes de Microsoft ni de correo/contraseña.
router.use('/otp', otpRouter);

// Doble límite (H5a): por IP (protege contra fuerza bruta distribuida desde
// una máquina) y por cuenta (correo del body, normalizado; evita el ataque a
// una cuenta concreta sin castigar al resto del NAT del campus).
router.post('/login-local', limitadorLoginLocalIp, limitadorLoginLocalCuenta, async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    // El correo se normaliza antes de comparar: en la base está en minúsculas
    // y el alumno lo escribe como le da la gana.
    const correoLimpio = correo.toLowerCase().trim();

    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.institutional_id, u.password_hash, u.id_rol, u.deleted_at,
              r.nombre_rol as rol
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       WHERE u.correo_institucional = $1`,
      [correoLimpio],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Cuenta desactivada (soft-delete): no se emite token. Mismo mensaje que
    // una contraseña incorrecta para no revelar el estado de la cuenta.
    if (user.deleted_at) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

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

// Cada intento dispara una llamada saliente a Microsoft Graph: el límite por
// IP frena la amplificación de coste (H5a).
router.post('/login-microsoft', limitadorLoginMicrosoft, async (req, res) => {
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
    const correo = (graphData.mail || graphData.userPrincipalName || '').toLowerCase().trim();
    const userPrincipalName = graphData.userPrincipalName || '';

    if (!correo) {
      return res.status(400).json({ error: 'No se pudo obtener el correo desde Microsoft' });
    }

    // El ID institucional es la parte local del UPN (ej: "00906641" de
    // "00906641@red.unid.mx"). Uso userPrincipalName en vez de mail porque
    // mail puede venir null o ser distinto del UPN. Si el UPN no tiene @
    // (caso raro) devuelvo null para no guardar basura — dos strings vacíos
    // sí chocan en el UNIQUE constraint, dos null no.
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

    // Busco primero por microsoft_id (el GUID de Entra no cambia nunca).
    // Si no lo encuentro, busco por correo_institucional para cubrir el
    // caso de un usuario local que inició sesión con Microsoft por primera
    // vez — en ese escenario el microsoft_id aún es null en la DB.
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

      // Si la cuenta está desactivada, no la reactivo automáticamente.
      // Prefiero que el admin decida cuándo reactivar manualmente con
      // el endpoint PATCH /:id/reactivar, así evitamos que alguien que
      // fue eliminado por una razón específica vuelva a entrar solo
      // porque Microsoft lo autentica.
      if (row.deleted_at) {
        return res.status(403).json({
          error: 'Cuenta desactivada. Contacta al administrador.',
        });
      }

      // Actualizo los datos que Microsoft me dio. Uso COALESCE en
      // microsoft_id para no pisarlo si ya existe (en usuarios que
      // encontré por correo pero aún no tenían microsoft_id asignado).
      // En institutional_id usé COALESCE al revés: si Microsoft no
      // devuelve UPN (institutionalId = null), conservo el que ya
      // tenía guardado en la DB para no borrarlo accidentalmente.
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

      // Si Microsoft no envió UPN (institutionalId = null), me quedo
      // con el que ya tenía la fila en la DB.
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
// El límite por IP va antes de authenticate: también frena inundaciones de
// peticiones sin sesión válida contra esta ruta.
router.post('/register', limitadorRegistro, authenticate, requireRole(3), async (req, res) => {
  try {
    const { nombre_completo, correo_institucional, contrasena, id_rol } = req.body;

    if (!nombre_completo || !correo_institucional || !contrasena) {
      return res.status(400).json({ error: 'nombre_completo, correo_institucional y contrasena son obligatorios' });
    }

    // El correo se normaliza para no duplicar cuentas por mayúsculas/minúsculas.
    const correoLimpio = correo_institucional.toLowerCase().trim();

    if (id_rol != null && ![1, 2, 4, 6].includes(id_rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const existe = await pool.query('SELECT id_usuario FROM usuarios WHERE correo_institucional = $1', [correoLimpio]);
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
      [nombre_completo.trim(), correoLimpio, password_hash, rolFinal],
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
              COALESCE(cp.id_club, cv.id_club, i.id_club) AS id_club,
              COALESCE(cp.nombre_club, cv.nombre_club, c.nombre_club) AS nombre_club,
              COALESCE(cp.categoria, cv.categoria, c.categoria) AS categoria,
              COALESCE(cp.cupo_maximo, cv.cupo_maximo, c.cupo_maximo) AS cupo_maximo,
              cp.id_presidente,
              cv.id_vicepresidente
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN clubes cp ON cp.id_presidente = u.id_usuario
       LEFT JOIN clubes cv ON cv.id_vicepresidente = u.id_usuario AND cp.id_club IS NULL
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
