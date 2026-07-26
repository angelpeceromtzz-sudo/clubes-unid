import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/horarios/club/:idClub — listar todos los horarios del club
router.get('/club/:idClub', async (req, res) => {
  try {
    const { idClub } = req.params;
    const result = await pool.query(
      `SELECT id_horario, id_club, dia_semana, hora_inicio, hora_fin,
              lugar, ubicacion_maps, descripcion
       FROM horarios_club
       WHERE id_club = $1
       ORDER BY dia_semana ASC, hora_inicio ASC`,
      [idClub]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar horarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/horarios/club/:idClub — crear horarios para uno o varios días
router.post('/club/:idClub', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { idClub } = req.params;
    const { dias_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion } = req.body;

    if (!dias_semana?.length || !hora_inicio || !hora_fin || !lugar) {
      return res.status(400).json({ error: 'Días, hora inicio, hora fin y lugar son obligatorios' });
    }

    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio' });
    }

    await client.query('BEGIN');

    // Verificar conflictos para cada día
    for (const dia of dias_semana) {
      const conflicto = await client.query(
        `SELECT id_horario, hora_inicio, hora_fin, lugar
         FROM horarios_club
         WHERE id_club = $1 AND dia_semana = $2
           AND hora_inicio < $4 AND hora_fin > $3`,
        [idClub, dia, hora_inicio, hora_fin]
      );
      if (conflicto.rows.length > 0) {
        await client.query('ROLLBACK');
        const c = conflicto.rows[0];
        return res.status(409).json({
          error: `Conflicto de horario: ya existe un entrenamiento de ${c.hora_inicio?.slice(0,5)} a ${c.hora_fin?.slice(0,5)} en ${c.lugar}`,
          conflicto: c,
        });
      }
    }

    const horariosCreados = [];
    for (const dia of dias_semana) {
      const result = await client.query(
        `INSERT INTO horarios_club (id_club, dia_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_horario, id_club, dia_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion`,
        [idClub, dia, hora_inicio, hora_fin, lugar, ubicacion_maps || '', descripcion || '']
      );
      horariosCreados.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(horariosCreados);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/horarios/:id — actualizar un horario individual
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion } = req.body;

    if (hora_inicio && hora_fin && hora_fin <= hora_inicio) {
      return res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio' });
    }

    // Verificar conflicto si se cambia día/hora
    if (dia_semana !== undefined && hora_inicio && hora_fin) {
      const actual = await pool.query(
        'SELECT id_club FROM horarios_club WHERE id_horario = $1', [id]
      );
      if (actual.rows.length > 0) {
        const conflicto = await pool.query(
          `SELECT id_horario, hora_inicio, hora_fin, lugar
           FROM horarios_club
           WHERE id_club = $1 AND dia_semana = $2 AND id_horario != $3
             AND hora_inicio < $5 AND hora_fin > $4`,
          [actual.rows[0].id_club, dia_semana, id, hora_inicio, hora_fin]
        );
        if (conflicto.rows.length > 0) {
          const c = conflicto.rows[0];
          return res.status(409).json({
            error: `Conflicto: ya existe un entrenamiento de ${c.hora_inicio?.slice(0,5)} a ${c.hora_fin?.slice(0,5)} en ${c.lugar}`,
            conflicto: c,
          });
        }
      }
    }

    const result = await pool.query(
      `UPDATE horarios_club
       SET dia_semana = COALESCE($1, dia_semana),
           hora_inicio = COALESCE($2, hora_inicio),
           hora_fin = COALESCE($3, hora_fin),
           lugar = COALESCE($4, lugar),
           ubicacion_maps = COALESCE($5, ubicacion_maps),
           descripcion = COALESCE($6, descripcion)
       WHERE id_horario = $7
       RETURNING id_horario, id_club, dia_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion`,
      [dia_semana, hora_inicio, hora_fin, lugar, ubicacion_maps, descripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/horarios/:id — eliminar un horario
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM horarios_club WHERE id_horario = $1 RETURNING id_horario',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    res.json({ mensaje: 'Horario eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
