import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';

const router = Router();
const esAdmin = (req) => requireRole(ROL_ADMIN, ROL_COORDINACION)(req, null, () => {});

router.use(authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION));

// Listar insignias del catálogo.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_insignia, nombre, descripcion, imagen, activa, creada_en, actualizada_en
         FROM insignias
        ORDER BY nombre`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar insignias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear insignia.
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, imagen } = req.body || {};
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (nombre.trim().length > 60) {
      return res.status(400).json({ error: 'El nombre no puede exceder 60 caracteres' });
    }
    const desc = descripcion ? String(descripcion).trim().slice(0, 500) : null;
    const img = imagen ? String(imagen).trim() : null;
    const result = await pool.query(
      `INSERT INTO insignias (nombre, descripcion, imagen)
       VALUES ($1, $2, $3)
       RETURNING id_insignia, nombre, descripcion, imagen, activa, creada_en`,
      [nombre.trim(), desc, img],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear insignia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Editar insignia (global: afecta a todos los que la tienen).
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Identificador inválido' });
    const { nombre, descripcion, imagen, activa } = req.body || {};
    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 60)) {
      return res.status(400).json({ error: 'Nombre inválido (1-60 caracteres)' });
    }
    const result = await pool.query(
      `UPDATE insignias
          SET nombre = COALESCE($2, nombre),
              descripcion = COALESCE($3, descripcion),
              imagen = COALESCE($4, imagen),
              activa = COALESCE($5, activa),
              actualizada_en = NOW()
        WHERE id_insignia = $1
        RETURNING id_insignia, nombre, descripcion, imagen, activa, creada_en, actualizada_en`,
      [id, nombre ? nombre.trim() : null, descripcion !== undefined ? String(descripcion).trim().slice(0, 500) : null, imagen ? String(imagen).trim() : null, typeof activa === 'boolean' ? activa : null],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insignia no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al editar insignia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar (soft delete).
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Identificador inválido' });
    const result = await pool.query(
      `UPDATE insignias SET activa = FALSE, actualizada_en = NOW() WHERE id_insignia = $1 RETURNING id_insignia`,
      [id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insignia no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar insignia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignar insignia a un alumno (individual).
router.post('/:id/otorgar', async (req, res) => {
  try {
    const idInsignia = parseInt(req.params.id, 10);
    if (!Number.isInteger(idInsignia) || idInsignia <= 0) return res.status(400).json({ error: 'Identificador inválido' });
    const { id_usuario, id_edicion } = req.body || {};
    const idUsuario = parseInt(id_usuario, 10);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: 'Usuario inválido' });
    const edicion = id_edicion ? parseInt(id_edicion, 10) : null;

    const ins = await pool.query('SELECT nombre, imagen FROM insignias WHERE id_insignia = $1 AND activa = TRUE', [idInsignia]);
    if (ins.rows.length === 0) return res.status(404).json({ error: 'Insignia no encontrada o inactiva' });

    const dup = await pool.query(
      'SELECT id_reconocimiento FROM expediente_reconocimientos WHERE id_usuario = $1 AND id_insignia = $2',
      [idUsuario, idInsignia],
    );
    if (dup.rows.length > 0) return res.status(409).json({ error: 'Este usuario ya tiene esta insignia.' });

    const result = await pool.query(
      `INSERT INTO expediente_reconocimientos
         (id_usuario, id_edicion, tipo_actividad, nombre_actividad, nombre_edicion, anio, insignia_key, id_insignia, otorgada_en)
       VALUES ($1, $2, 'manual', $3, $3, EXTRACT(YEAR FROM NOW())::int, $4, $5, NOW())
       RETURNING id_reconocimiento, id_usuario, id_insignia, nombre_actividad, anio, otorgada_en, oculta`,
      [idUsuario, edicion, ins.rows[0].nombre, ins.rows[0].imagen, idInsignia],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al otorgar insignia:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Asignación masiva por edición (otorga a asistentes reales).
router.post('/:id/otorgar-por-edicion', async (req, res) => {
  try {
    const idInsignia = parseInt(req.params.id, 10);
    if (!Number.isInteger(idInsignia) || idInsignia <= 0) return res.status(400).json({ error: 'Identificador inválido' });
    const { id_edicion, solo_ganadores, ids_usuarios } = req.body || {};
    const idEdicion = parseInt(id_edicion, 10);
    if (!Number.isInteger(idEdicion) || idEdicion <= 0) return res.status(400).json({ error: 'Edición inválida' });

    const ins = await pool.query('SELECT nombre, imagen FROM insignias WHERE id_insignia = $1 AND activa = TRUE', [idInsignia]);
    if (ins.rows.length === 0) return res.status(404).json({ error: 'Insignia no encontrada o inactiva' });

    // Determinar alumnos elegibles.
    let elegibles = [];
    if (Array.isArray(ids_usuarios) && ids_usuarios.length) {
      elegibles = ids_usuarios.map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n > 0);
    } else {
      // Asistentes reales (presente) de la edición.
      const r = await pool.query(
        `SELECT DISTINCT a.id_usuario
           FROM asistencias a
           JOIN sesiones s ON s.id_sesion = a.id_sesion
          WHERE s.id_edicion = $1 AND a.estado = 'presente'`,
        [idEdicion],
      );
      elegibles = r.rows.map((x) => x.id_usuario);
    }

    const otorgadas = [];
    for (const idUsuario of elegibles) {
      const dup = await pool.query(
        'SELECT 1 FROM expediente_reconocimientos WHERE id_usuario = $1 AND id_insignia = $2',
        [idUsuario, idInsignia],
      );
      if (dup.rows.length > 0) continue;
      const res = await pool.query(
        `INSERT INTO expediente_reconocimientos
           (id_usuario, id_edicion, tipo_actividad, nombre_actividad, nombre_edicion, anio, insignia_key, id_insignia, otorgada_en)
         VALUES ($1, $2, 'actividad', $3, $3, EXTRACT(YEAR FROM NOW())::int, $4, $5, NOW())
         RETURNING id_reconocimiento`,
        [idUsuario, idEdicion, ins.rows[0].nombre, ins.rows[0].imagen, idInsignia],
      );
      otorgadas.push(res.rows[0].id_reconocimiento);
    }
    res.json({ otorgadas: otorgadas.length, total_elegibles: elegibles.length });
  } catch (err) {
    console.error('Error al otorgar por edición:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
