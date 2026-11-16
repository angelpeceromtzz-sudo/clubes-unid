import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Reconocimientos del alumno autenticado.
router.get('/mios', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id_reconocimiento, r.codigo, r.descripcion, r.fecha_otorgado,
              n.id_noticia, n.titulo AS noticia_titulo, n.categoria AS noticia_categoria
       FROM reconocimientos_usuario r
       LEFT JOIN noticias n ON n.id_noticia = r.id_noticia
       WHERE r.id_usuario = $1
       ORDER BY r.fecha_otorgado DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener reconocimientos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Otorgar reconocimiento (admin, coordinación, rectoría).
router.post('/', authenticate, requireRole(3, 4, 7), async (req, res) => {
  try {
    const { id_usuario, id_noticia, codigo, descripcion } = req.body || {};
    if (!Number.isSafeInteger(id_usuario) || id_usuario <= 0 || id_usuario > 2147483647) {
      return res.status(400).json({ error: 'id_usuario debe ser un entero positivo' });
    }
    const codigoLimpio = typeof codigo === 'string' ? codigo.trim() : '';
    if (codigoLimpio === '' || codigoLimpio.length > 40) {
      return res.status(400).json({ error: 'codigo debe ser texto no vacío de hasta 40 caracteres' });
    }
    if (descripcion != null && (typeof descripcion !== 'string' || descripcion.length > 200)) {
      return res.status(400).json({ error: 'descripcion opcional de hasta 200 caracteres' });
    }
    if (id_noticia != null && (!Number.isSafeInteger(id_noticia) || id_noticia <= 0 || id_noticia > 2147483647)) {
      return res.status(400).json({ error: 'id_noticia debe ser un entero positivo' });
    }

    const alumno = (await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND id_rol = 1', [id_usuario])).rows[0];
    if (!alumno) return res.status(404).json({ error: 'El destinatario no es un alumno válido' });

    if (id_noticia != null) {
      const noticia = (await pool.query('SELECT id_noticia FROM noticias WHERE id_noticia = $1', [id_noticia])).rows[0];
      if (!noticia) return res.status(404).json({ error: 'La noticia vinculada no existe' });
    }

    const result = await pool.query(
      `INSERT INTO reconocimientos_usuario (id_usuario, id_noticia, codigo, descripcion, otorgado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_usuario, id_noticia || null, codigoLimpio, descripcion || null, req.user.id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al otorgar reconocimiento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;