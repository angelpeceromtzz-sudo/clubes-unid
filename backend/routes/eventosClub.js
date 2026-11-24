import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireClubLeader } from '../middleware/auth.js';
import { esIdEntero, validarParamsEnteros } from '../lib/validarId.js';
import { fechaEventoValida, hoyEnCampus } from '../lib/fechasEvento.js';

const router = Router();
validarParamsEnteros(router);
router.param('idEvento', (req, res, next, valor) => {
  if (!esIdEntero(valor)) return res.status(400).json({ error: 'idEvento inválido' });
  next();
});

const CAMPOS = `id_evento_club, id_club, id_autor, titulo, descripcion,
  fecha_evento::text AS fecha_evento, fecha_fin_evento::text AS fecha_fin_evento,
  hora_evento, lugar_evento, fecha_creacion`;

function validarEvento(body) {
  const { titulo, descripcion, fecha_evento, fecha_fin_evento, hora_evento, lugar_evento } = body;
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 150) return 'El título es obligatorio y debe tener máximo 150 caracteres';
  if (typeof descripcion !== 'string' || !descripcion.trim() || descripcion.trim().length > 2000) return 'La descripción es obligatoria y debe tener máximo 2000 caracteres';
  if (!fechaEventoValida(fecha_evento)) return 'La fecha del evento no es válida';
  const hoy = hoyEnCampus();
  const ultimoDiaDelAnio = `${hoy.slice(0, 4)}-12-31`;
  if (fecha_evento < hoy) return 'La fecha de inicio no puede ser anterior a hoy';
  if (fecha_evento > ultimoDiaDelAnio) return 'Solo puedes programar eventos dentro del año actual';
  if (fecha_fin_evento != null && fecha_fin_evento !== '') {
    if (!fechaEventoValida(fecha_fin_evento)) return 'La fecha de término no es válida';
    if (fecha_fin_evento < fecha_evento) return 'La fecha de término no puede ser anterior al inicio';
    if (fecha_fin_evento > ultimoDiaDelAnio) return 'La fecha de término debe estar dentro del año actual';
  }
  if (hora_evento != null && hora_evento !== '' && (typeof hora_evento !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora_evento))) return 'La hora del evento no es válida';
  if (lugar_evento != null && (typeof lugar_evento !== 'string' || lugar_evento.trim().length > 200)) return 'El lugar debe tener máximo 200 caracteres';
  return null;
}

// Próximos eventos para el detalle público del club.
router.get('/:idClub', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS} FROM eventos_clubes
       WHERE id_club = $1 AND COALESCE(fecha_fin_evento, fecha_evento) >= $2::date
       ORDER BY fecha_evento, hora_evento NULLS LAST, id_evento_club LIMIT 6`,
      [req.params.idClub, hoyEnCampus()]
    );
    res.set('Cache-Control', 'public, max-age=60');
    res.json(rows);
  } catch (err) {
    console.error('Error al listar eventos del club:', err);
    res.status(500).json({ error: 'No se pudieron cargar los eventos del club' });
  }
});

// El panel del líder muestra también eventos ya realizados para permitir editarlos o borrarlos.
router.get('/gestionar/:idClub', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${CAMPOS} FROM eventos_clubes WHERE id_club = $1
       ORDER BY fecha_evento DESC, hora_evento DESC NULLS LAST, id_evento_club DESC`,
      [req.params.idClub]
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(rows);
  } catch (err) {
    console.error('Error al cargar gestión de eventos del club:', err);
    res.status(500).json({ error: 'No se pudieron cargar los eventos del club' });
  }
});

router.post('/:idClub', authenticate, requireClubLeader, async (req, res) => {
  const error = validarEvento(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const { titulo, descripcion, fecha_evento, fecha_fin_evento, hora_evento, lugar_evento } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO eventos_clubes (id_club, id_autor, titulo, descripcion, fecha_evento, fecha_fin_evento, hora_evento, lugar_evento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${CAMPOS}`,
      [req.params.idClub, req.user.id, titulo.trim(), descripcion.trim(), fecha_evento, fecha_fin_evento || null, hora_evento || null, lugar_evento?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error al crear evento del club:', err);
    res.status(500).json({ error: 'No se pudo crear el evento' });
  }
});

router.put('/:idClub/:idEvento', authenticate, requireClubLeader, async (req, res) => {
  const error = validarEvento(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const { titulo, descripcion, fecha_evento, fecha_fin_evento, hora_evento, lugar_evento } = req.body;
    const { rows } = await pool.query(
      `UPDATE eventos_clubes SET titulo=$1, descripcion=$2, fecha_evento=$3, fecha_fin_evento=$4, hora_evento=$5, lugar_evento=$6
       WHERE id_evento_club=$7 AND id_club=$8 RETURNING ${CAMPOS}`,
      [titulo.trim(), descripcion.trim(), fecha_evento, fecha_fin_evento || null, hora_evento || null, lugar_evento?.trim() || null, req.params.idEvento, req.params.idClub]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al editar evento del club:', err);
    res.status(500).json({ error: 'No se pudo editar el evento' });
  }
});

router.delete('/:idClub/:idEvento', authenticate, requireClubLeader, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM eventos_clubes WHERE id_evento_club=$1 AND id_club=$2',
      [req.params.idEvento, req.params.idClub]
    );
    if (!rowCount) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ eliminado: true });
  } catch (err) {
    console.error('Error al eliminar evento del club:', err);
    res.status(500).json({ error: 'No se pudo eliminar el evento' });
  }
});

export default router;
