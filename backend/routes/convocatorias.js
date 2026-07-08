import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generarListaAsistencia } from '../lib/asistenciaTemplate.js';

const router = Router();

const DIAS_VIGENCIA_OFERTA = 3; // 72 horas

function distribuirEnBloques(cantidad) {
  if (cantidad <= 0) return [];
  const totalBloques = Math.ceil(cantidad / 20);
  const base = Math.floor(cantidad / totalBloques);
  const resto = cantidad % totalBloques;
  const distribucion = [];
  for (let i = 0; i < totalBloques; i++) {
    distribucion.push(i < resto ? base + 1 : base);
  }
  return distribucion;
}

const NOMBRES_BLOQUES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Vista previa de cuántos bloques se generarán
router.get('/preview/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;
    const club = await pool.query('SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1', [id_club]);
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });

    const preseleccionados = await pool.query(
      `SELECT COUNT(*) as total FROM formularios WHERE id_club = $1 AND status = 'Preseleccionado'`,
      [id_club],
    );
    const total = parseInt(preseleccionados.rows[0].total, 10);
    const distribucion = distribuirEnBloques(total);
    const bloques = distribucion.map((cantidad, i) => ({
      bloque: NOMBRES_BLOQUES[i],
      alumnos: cantidad,
    }));

    res.json({ total, bloques });
  } catch (err) {
    console.error('Error en preview:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Generar convocatorias a partir de preseleccionados
router.post('/generar', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.body;
    if (!id_club) return res.status(400).json({ error: 'id_club es obligatorio' });

    const club = await pool.query(
      'SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1',
      [id_club],
    );
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });

    const preseleccionados = await pool.query(
      `SELECT id_formulario, id_alumno, nombre_completo FROM formularios
       WHERE id_club = $1 AND status = 'Preseleccionado'
       ORDER BY fecha_envio ASC`,
      [id_club],
    );

    if (preseleccionados.rows.length === 0) {
      return res.status(400).json({ error: 'No hay alumnos preseleccionados' });
    }

    const distribucion = distribuirEnBloques(preseleccionados.rows.length);
    const periodo = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    const idPresidente = club.rows[0].id_presidente;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let idx = 0;
      for (let b = 0; b < distribucion.length; b++) {
        const bloqueNombre = NOMBRES_BLOQUES[b];
        const numAlumnos = distribucion[b];

        const conv = await client.query(
          `INSERT INTO convocatorias
             (id_club, id_presidente, fecha, hora, lugar, bloque, periodo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id_convocatoria`,
          [
            id_club,
            idPresidente,
            null,
            null,
            null,
            bloqueNombre,
            periodo,
          ],
        );
        const idConv = conv.rows[0].id_convocatoria;

        for (let a = 0; a < numAlumnos; a++) {
          const form = preseleccionados.rows[idx];
          await client.query(
            `UPDATE formularios
             SET status = 'Convocado', id_convocatoria = $1
             WHERE id_formulario = $2`,
            [idConv, form.id_formulario],
          );
          idx++;
        }
      }

      await client.query('COMMIT');
      res.json({
        mensaje: `Convocatorias generadas: ${distribucion.length} bloque(s) para ${preseleccionados.rows.length} alumno(s)`,
        bloques: distribucion.map((cantidad, i) => ({
          bloque: NOMBRES_BLOQUES[i],
          alumnos: cantidad,
        })),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al generar convocatorias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar convocatorias de un club
router.get('/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;
    const club = await pool.query('SELECT id_presidente FROM clubes WHERE id_club = $1', [id_club]);
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });

    const convocatorias = await pool.query(
      `SELECT c.*,
              (SELECT json_agg(json_build_object(
                'id_formulario', f.id_formulario,
                'id_alumno', f.id_alumno,
                'nombre_completo', f.nombre_completo,
                'matricula', f.matricula
              ) ORDER BY f.fecha_envio ASC)
               FROM formularios f WHERE f.id_convocatoria = c.id_convocatoria AND f.status = 'Convocado') AS alumnos
       FROM convocatorias c
       WHERE c.id_club = $1
       ORDER BY c.bloque ASC`,
      [id_club],
    );

    res.json(convocatorias.rows);
  } catch (err) {
    console.error('Error al listar convocatorias:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar fecha, hora, lugar de una convocatoria
router.put('/:id', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, lugar } = req.body;

    const conv = await pool.query(
      `SELECT c.* FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 AND cl.id_presidente = $2`,
      [id, req.user.id],
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Convocatoria no encontrada' });

    const result = await pool.query(
      `UPDATE convocatorias
       SET fecha = COALESCE($1, fecha),
           hora = COALESCE($2, hora),
           lugar = COALESCE($3, lugar)
       WHERE id_convocatoria = $4
       RETURNING *`,
      [fecha || null, hora || null, lugar || null, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar convocatoria:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Enviar convocatoria a todo un bloque
router.post('/:id/enviar', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;

    const conv = await pool.query(
      `SELECT c.*, cl.nombre_club, cl.id_presidente
       FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 AND cl.id_presidente = $2`,
      [id, req.user.id],
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Convocatoria no encontrada' });
    const c = conv.rows[0];

    if (!c.fecha || !c.hora || !c.lugar) {
      return res.status(400).json({ error: 'Debes establecer fecha, hora y lugar antes de enviar la convocatoria' });
    }

    const alumnos = await pool.query(
      `SELECT id_alumno, nombre_completo FROM formularios WHERE id_convocatoria = $1`,
      [id],
    );

    for (const alumno of alumnos.rows) {
      await pool.query(
        `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
         VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
        [
          req.user.id,
          `Convocatoria: ${c.nombre_club} - Bloque ${c.bloque}`,
          `Has sido convocado a una evaluación presencial para "${c.nombre_club}".\nBloque: ${c.bloque}\nLugar: ${c.lugar}\nFecha: ${c.fecha}\nHora: ${c.hora}`,
          c.id_club,
          alumno.id_alumno,
        ],
      );
    }

    await pool.query(
      'UPDATE convocatorias SET enviada = TRUE WHERE id_convocatoria = $1',
      [id],
    );

    res.json({ mensaje: `Convocatoria enviada a ${alumnos.rows.length} alumno(s)` });
  } catch (err) {
    console.error('Error al enviar convocatoria:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Generar lista de asistencia para imprimir
router.get('/:id/asistencia', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;

    const conv = await pool.query(
      `SELECT c.*, cl.nombre_club
       FROM convocatorias c
       JOIN clubes cl ON cl.id_club = c.id_club
       WHERE c.id_convocatoria = $1 AND cl.id_presidente = $2`,
      [id, req.user.id],
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Convocatoria no encontrada' });
    const c = conv.rows[0];

    const alumnos = await pool.query(
      `SELECT nombre_completo, matricula FROM formularios
       WHERE id_convocatoria = $1
       ORDER BY fecha_envio ASC`,
      [id],
    );

    const html = generarListaAsistencia(c.nombre_club, c.bloque, c.fecha, c.hora, c.lugar, alumnos.rows);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Error al generar asistencia:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Enviar ofertas a alumnos aprobados en selección final
router.post('/ofertas', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club, aprobados } = req.body;
    if (!id_club || !Array.isArray(aprobados)) {
      return res.status(400).json({ error: 'id_club y aprobados[] son obligatorios' });
    }

    const club = await pool.query(
      'SELECT id_presidente, nombre_club FROM clubes WHERE id_club = $1',
      [id_club],
    );
    if (club.rows.length === 0) return res.status(404).json({ error: 'Club no encontrado' });
    if (club.rows[0].id_presidente !== req.user.id) return res.status(403).json({ error: 'No eres el presidente' });
    const nombreClub = club.rows[0].nombre_club;

    const convocados = await pool.query(
      `SELECT id_formulario, id_alumno, nombre_completo
       FROM formularios
       WHERE id_club = $1 AND status = 'Convocado'`,
      [id_club],
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let ofertados = 0;
      for (const form of convocados.rows) {
        if (aprobados.includes(form.id_formulario)) {
          await client.query(
            `UPDATE formularios
             SET status = 'Oferta enviada',
                 fecha_oferta = NOW(),
                 fecha_expiracion = NOW() + INTERVAL '1 day' * $1
             WHERE id_formulario = $2`,
            [DIAS_VIGENCIA_OFERTA, form.id_formulario],
          );
          ofertados++;

          await client.query(
            `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
             VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
            [
              req.user.id,
              `Oferta de ingreso: ${nombreClub}`,
              `"${nombreClub}" te ha extendido una oferta de ingreso. Tienes ${DIAS_VIGENCIA_OFERTA} días para aceptarla desde tu panel de postulaciones.`,
              id_club,
              form.id_alumno,
            ],
          );
        } else {
          await client.query(
            `UPDATE formularios
             SET status = 'Rechazado', motivo_rechazo = 'No seleccionado en la evaluaci\u00f3n final'
             WHERE id_formulario = $1`,
            [form.id_formulario],
          );

          await client.query(
            `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
             VALUES ($1, $2, $3, 'alumnos', $4, $5)`,
            [
              req.user.id,
              `Postulaci\u00f3n en ${nombreClub}`,
              `Tu postulaci\u00f3n en "${nombreClub}" ha concluido. No fuiste seleccionado en esta ocasi\u00f3n.`,
              id_club,
              form.id_alumno,
            ],
          );
        }
      }

      await client.query('COMMIT');
      res.json({
        mensaje: `Ofertas enviadas a ${ofertados} alumno(s)`,
        total: convocados.rows.length,
        ofertados,
        rechazados: convocados.rows.length - ofertados,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al enviar ofertas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
