import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

const BLOQUES = ['A', 'B'];
const LIMITE_POSTULACIONES = 3;

function calcularBloque(asignadosA, asignadosB, cupoMaximo) {
  const cupoMitad = Math.ceil(cupoMaximo / 2);

  if (asignadosA < cupoMitad && asignadosA <= asignadosB) return 'A';
  if (asignadosB < cupoMitad && asignadosB < asignadosA) return 'B';
  if (asignadosA < cupoMitad) return 'A';
  if (asignadosB < cupoMitad) return 'B';

  return 'E';
}

// Devuelve los id_club a los que el alumno ya envió formulario
router.get('/', authenticate, requireRole(1), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_club FROM formularios WHERE id_alumno = $1',
      [req.user.id],
    );
    res.json(result.rows.map((r) => r.id_club));
  } catch (err) {
    console.error('Error al obtener formularios del alumno:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, requireRole(1), async (req, res) => {
  try {
    const {
      id_club,
      nombre_completo,
      matricula,
      carrera,
      cuatrimestre,
      turno,
      telefono_contacto,
      motivo_ingreso,
      experiencia_previa,
    } = req.body;

    if (!id_club || !nombre_completo || !matricula || !carrera || !cuatrimestre || !turno || !telefono_contacto || !motivo_ingreso) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben estar llenos' });
    }

    const clubValido = await pool.query(
      'SELECT cupo_maximo, id_estatus_club FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (clubValido.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (clubValido.rows[0].id_estatus_club !== 1) {
      return res.status(400).json({ error: 'El club no está disponible para inscripciones' });
    }

    const activa = await pool.query(
      `SELECT id_inscripcion FROM inscripciones
       WHERE id_usuario = $1 AND id_estatus_inscripcion = 1
       LIMIT 1`,
      [req.user.id],
    );

    if (activa.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una inscripción activa en un club' });
    }

    const duplicado = await pool.query(
      `SELECT id_formulario FROM formularios
       WHERE id_alumno = $1 AND id_club = $2`,
      [req.user.id, id_club],
    );

    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: 'Ya enviaste un formulario para este club' });
    }

    const totalFormularios = await pool.query(
      'SELECT COUNT(*) as total FROM formularios WHERE id_alumno = $1',
      [req.user.id],
    );

    if (parseInt(totalFormularios.rows[0].total, 10) >= LIMITE_POSTULACIONES) {
      return res.status(400).json({
        error: `Has alcanzado el límite de ${LIMITE_POSTULACIONES} postulaciones`,
      });
    }

    const conteo = await pool.query(
      `SELECT bloque_asignado, COUNT(*) as total
       FROM formularios
       WHERE id_club = $1 AND bloque_asignado IN ('A', 'B')
       GROUP BY bloque_asignado`,
      [id_club],
    );

    const asignados = { A: 0, B: 0 };
    for (const fila of conteo.rows) {
      asignados[fila.bloque_asignado] = parseInt(fila.total, 10);
    }

    const cupoMaximo = clubValido.rows[0].cupo_maximo;
    const bloque = calcularBloque(asignados.A, asignados.B, cupoMaximo);

    const result = await pool.query(
      `INSERT INTO formularios (id_alumno, id_club, bloque_asignado,
        nombre_completo, matricula, carrera, cuatrimestre, turno,
        telefono_contacto, motivo_ingreso, experiencia_previa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id,
        id_club,
        bloque,
        nombre_completo,
        matricula,
        carrera,
        cuatrimestre,
        turno,
        telefono_contacto,
        motivo_ingreso,
        experiencia_previa || '',
      ],
    );

    res.status(201).json({
      message: 'Formulario enviado correctamente',
      formulario: result.rows[0],
    });
  } catch (err) {
    console.error('Error al crear formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Devuelve todos los formularios de un club (solo para el presidente de ese club)
router.get('/pendientes/:id_club', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id_club } = req.params;

    const club = await pool.query(
      'SELECT id_presidente FROM clubes WHERE id_club = $1',
      [id_club],
    );

    if (club.rows.length === 0) {
      return res.status(404).json({ error: 'El club no existe' });
    }

    if (club.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    const result = await pool.query(
      `SELECT id_formulario, id_alumno, id_club, fecha_envio, bloque_asignado,
              nombre_completo, matricula, carrera, cuatrimestre, turno,
              telefono_contacto, motivo_ingreso, experiencia_previa, status
       FROM formularios
       WHERE id_club = $1
       ORDER BY fecha_envio DESC`,
      [id_club],
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener formularios del club:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualiza el estatus de un formulario (Aceptado / Rechazado)
router.put('/:id/estatus', authenticate, requireRole(2), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Aceptado', 'Rechazado'].includes(status)) {
      return res.status(400).json({ error: 'Estatus inválido. Debe ser Aceptado o Rechazado' });
    }

    const formulario = await pool.query(
      `SELECT f.*, c.id_presidente
       FROM formularios f
       JOIN clubes c ON c.id_club = f.id_club
       WHERE f.id_formulario = $1`,
      [id],
    );

    if (formulario.rows.length === 0) {
      return res.status(404).json({ error: 'El formulario no existe' });
    }

    if (formulario.rows[0].id_presidente !== req.user.id) {
      return res.status(403).json({ error: 'No eres el presidente de este club' });
    }

    if (formulario.rows[0].status !== 'Pendiente') {
      return res.status(400).json({ error: 'El formulario ya fue procesado' });
    }

    const result = await pool.query(
      'UPDATE formularios SET status = $1 WHERE id_formulario = $2 RETURNING *',
      [status, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar estatus del formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
