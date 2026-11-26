import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';

const router = Router();

const TIPOS_PERMITIDOS = new Set(['texto', 'textarea', 'numero', 'seleccion', 'fecha']);

function esAdminOCoord(req) {
  return req.user?.id_rol === ROL_ADMIN || req.user?.id_rol === ROL_COORDINACION;
}

// Plantillas por categoría (preguntas adicionales sugeridas).
const PLANTILLAS = {
  Deportivos: [
    { etiqueta: '¿Has participado antes en este tipo de club?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Cuál es tu nivel de experiencia?', tipo: 'seleccion', configuracion: { opciones: ['Principiante', 'Intermedio', 'Avanzado'] }, obligatorio: false },
    { etiqueta: '¿Tienes el equipo necesario para participar?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No', 'Parcialmente'] }, obligatorio: false },
    { etiqueta: '¿Qué talla de playera utilizas?', tipo: 'texto', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Qué talla de short o pants utilizas?', tipo: 'texto', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Tienes alguna condición médica que debamos conocer?', tipo: 'textarea', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Puedes participar en competencias o partidos fuera del campus?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No', 'Depende'] }, obligatorio: false },
  ],
  Culturales: [
    { etiqueta: '¿Tienes experiencia previa?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Qué instrumento sabes tocar?', tipo: 'texto', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Qué tipo de danza o género artístico te interesa?', tipo: 'texto', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Tienes instrumento o materiales propios?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Qué materiales necesitas?', tipo: 'textarea', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Te interesa participar en presentaciones o exposiciones?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Tienes alguna habilidad adicional (maquillaje, escenografía, edición de audio)?', tipo: 'textarea', configuracion: {}, obligatorio: false },
  ],
  Tecnologicos: [
    { etiqueta: '¿Qué conocimientos previos tienes?', tipo: 'textarea', configuracion: {}, obligatorio: false },
    { etiqueta: '¿Qué herramientas o programas sabes utilizar?', tipo: 'textarea', configuracion: {}, obligatorio: false },
  ],
  Sociales: [
    { etiqueta: '¿Has participado en actividades comunitarias o de voluntariado?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Qué tipo de causa social te interesa más?', tipo: 'seleccion', configuracion: { opciones: ['Medio ambiente', 'Educación', 'Salud', 'Inclusión', 'Otra'] }, obligatorio: false },
    { etiqueta: '¿Tienes experiencia organizando eventos?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
    { etiqueta: '¿Cuánto tiempo puedes dedicar por semana?', tipo: 'seleccion', configuracion: { opciones: ['1-2 horas', '3-5 horas', 'Más de 5 horas'] }, obligatorio: false },
    { etiqueta: '¿Te interesa asumir un rol de coordinación/liderazgo?', tipo: 'seleccion', configuracion: { opciones: ['Sí', 'No'] }, obligatorio: false },
  ],
};

// GET preguntas de un club (público para alumnos autenticados)
router.get('/:id/preguntas', authenticate, async (req, res) => {
  try {
    const idClub = Number(req.params.id);
    const result = await pool.query(
      `SELECT id_pregunta, id_club, etiqueta, tipo, configuracion, obligatorio, orden, activo
       FROM club_formulario_preguntas
       WHERE id_club = $1 AND activo = TRUE
       ORDER BY orden ASC, id_pregunta ASC`,
      [idClub],
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar preguntas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST crear pregunta
router.post('/:id/preguntas', authenticate, async (req, res) => {
  if (!esAdminOCoord(req)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const idClub = Number(req.params.id);
    const { etiqueta, tipo = 'texto', configuracion = {}, obligatorio = false, orden } = req.body || {};
    if (!etiqueta || typeof etiqueta !== 'string') {
      return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }
    if (!TIPOS_PERMITIDOS.has(tipo)) {
      return res.status(400).json({ error: 'Tipo de pregunta no válido' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const club = await client.query(
        "SELECT id_club FROM clubes WHERE id_club = $1 AND tipo = 'club' FOR UPDATE",
        [idClub],
      );
      if (club.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Club no encontrado' });
      }
      const ordenFinal = Number.isInteger(orden) ? orden : (await client.query(
        'SELECT COALESCE(MAX(orden),0)+1 AS o FROM club_formulario_preguntas WHERE id_club = $1 AND activo = TRUE',
        [idClub],
      )).rows[0].o;
      const result = await client.query(
        `INSERT INTO club_formulario_preguntas (id_club, etiqueta, tipo, configuracion, obligatorio, orden)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [idClub, etiqueta.trim(), tipo, JSON.stringify(configuracion), !!obligatorio, ordenFinal],
      );
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al crear pregunta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT actualizar pregunta
router.put('/:id/preguntas/:idPregunta', authenticate, async (req, res) => {
  if (!esAdminOCoord(req)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const idClub = Number(req.params.id);
    const idPregunta = Number(req.params.idPregunta);
    const { etiqueta, tipo, configuracion, obligatorio, orden, activo } = req.body || {};
    const campos = [];
    const valores = [];
    let idx = 1;
    if (etiqueta !== undefined) { campos.push(`etiqueta = $${idx++}`); valores.push(String(etiqueta).trim()); }
    if (tipo !== undefined) {
      if (!TIPOS_PERMITIDOS.has(tipo)) return res.status(400).json({ error: 'Tipo de pregunta no válido' });
      campos.push(`tipo = $${idx++}`); valores.push(tipo);
    }
    if (configuracion !== undefined) { campos.push(`configuracion = $${idx++}`); valores.push(JSON.stringify(configuracion)); }
    if (obligatorio !== undefined) { campos.push(`obligatorio = $${idx++}`); valores.push(!!obligatorio); }
    if (orden !== undefined) { campos.push(`orden = $${idx++}`); valores.push(Number(orden)); }
    if (activo !== undefined) { campos.push(`activo = $${idx++}`); valores.push(!!activo); }
    if (campos.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    valores.push(idClub, idPregunta);
    const result = await pool.query(
      `UPDATE club_formulario_preguntas SET ${campos.join(', ')}
       WHERE id_club = $${idx} AND id_pregunta = $${idx + 1} RETURNING *`,
      valores,
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar pregunta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE pregunta
router.delete('/:id/preguntas/:idPregunta', authenticate, async (req, res) => {
  if (!esAdminOCoord(req)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const idClub = Number(req.params.id);
    const idPregunta = Number(req.params.idPregunta);
    const result = await pool.query(
      `UPDATE club_formulario_preguntas SET activo = FALSE
       WHERE id_club = $1 AND id_pregunta = $2 RETURNING id_pregunta`,
      [idClub, idPregunta],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar pregunta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST aplicar plantilla por categoría
router.post('/:id/preguntas/plantilla', authenticate, async (req, res) => {
  if (!esAdminOCoord(req)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const idClub = Number(req.params.id);
    const { categoria } = req.body || {};
    const plantilla = PLANTILLAS[categoria];
    if (!plantilla) return res.status(400).json({ error: 'Categoría sin plantilla' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const club = await client.query(
        "SELECT id_club FROM clubes WHERE id_club = $1 AND tipo = 'club' FOR UPDATE",
        [idClub],
      );
      if (club.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Club no encontrado' });
      }

      // La sustitución es atómica: un fallo conserva el formulario anterior.
      // Las preguntas anteriores se archivan para mantener su historial.
      await client.query(
        'UPDATE club_formulario_preguntas SET activo = FALSE WHERE id_club = $1 AND activo = TRUE',
        [idClub],
      );
      let orden = 1;
      for (const p of plantilla) {
        await client.query(
          `INSERT INTO club_formulario_preguntas (id_club, etiqueta, tipo, configuracion, obligatorio, orden)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [idClub, p.etiqueta, p.tipo, JSON.stringify(p.configuracion), p.obligatorio, orden++],
        );
      }
      const result = await client.query(
        `SELECT id_pregunta, id_club, etiqueta, tipo, configuracion, obligatorio, orden, activo
         FROM club_formulario_preguntas WHERE id_club = $1 AND activo = TRUE ORDER BY orden ASC`,
        [idClub],
      );
      await client.query('COMMIT');
      res.json(result.rows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al aplicar plantilla:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
