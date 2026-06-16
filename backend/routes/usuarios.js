// Rutas de usuarios — solo accesibles por administradores
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Lista todos los usuarios (solo admin)
router.get('/', authenticate, requireRole(3), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
              u.id_rol, r.nombre_rol as rol,
              i.id_inscripcion, c.nombre_club
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
       LEFT JOIN inscripciones i ON i.id_usuario = u.id_usuario AND i.id_estatus_inscripcion = 1
       LEFT JOIN clubes c ON c.id_club = i.id_club
       ORDER BY u.id_usuario`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambia el rol de un usuario (solo admin, no puede auto-modificarse)
router.put('/:id/rol', authenticate, requireRole(3), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_rol } = req.body;

    if (![1, 2, 3].includes(id_rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'No puedes modificar tu propio rol' });
    }

    const result = await pool.query(
      `UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2
       RETURNING id_usuario, nombre_completo, correo_institucional, id_rol`,
      [id_rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rolResult = await pool.query(
      'SELECT nombre_rol FROM cat_roles WHERE id_rol = $1',
      [id_rol]
    );

    res.json({
      ...result.rows[0],
      rol: rolResult.rows[0]?.nombre_rol || 'desconocido',
    });
  } catch (err) {
    console.error('Error al cambiar rol:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

// ✦ A
