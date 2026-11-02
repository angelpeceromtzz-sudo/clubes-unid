import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION } from '../constants/roles.js';
import { registrarHistorial } from '../lib/audit.js';
import { errorProgramacionEvento } from '../lib/fechasEvento.js';

const router = Router();
const TIPOS_FECHA = ['examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite'];
const CAMPOS = `id_fecha, titulo, tipo_fecha, fecha_inicio::text AS fecha_inicio,
                fecha_fin::text AS fecha_fin, nota, url_imagen, publicada, mostrar_en_mural, id_autor,
                fecha_creacion, fecha_actualizacion`;

function idValido(valor) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
}

function errorFecha(datos, original) {
  if (typeof datos.titulo !== 'string' || !datos.titulo.trim() || datos.titulo.length > 200) return 'Escribe un concepto de hasta 200 caracteres';
  if (!TIPOS_FECHA.includes(datos.tipo_fecha)) return 'Tipo de fecha académica no válido';
  const errorPeriodo = errorProgramacionEvento(datos.fecha_inicio, datos.fecha_fin, { inicioOriginal: original?.fecha_inicio, finOriginal: original?.fecha_fin });
  if (errorPeriodo) return errorPeriodo;
  if (datos.nota != null && typeof datos.nota !== 'string') return 'Nota no válida';
  if (typeof datos.publicada !== 'boolean') return 'Visibilidad de la fecha no válida';
  if (datos.mostrar_en_mural !== undefined && typeof datos.mostrar_en_mural !== 'boolean') return 'Opción de mural no válida';
  return null;
}

function errorModelo(datos) {
  return ['categoria', 'categoria_evento', 'solo_calendario', 'fecha_evento', 'fecha_fin_evento', 'hora_evento', 'lugar_evento'].some((campo) => campo in datos)
    ? 'Las fechas académicas tienen un tipo propio y no son publicaciones ni eventos'
    : null;
}

function auditar(req, fecha, accion, verbo) {
  registrarHistorial({ idAdmin: req.user.id, adminNombre: req.user.nombre_completo, accion,
    descripcion: `${req.user.nombre_completo} ${verbo} la fecha académica "${fecha.titulo}"`,
    entidadTipo: 'fecha_calendario', entidadId: fecha.id_fecha, detalles: { tipo: fecha.tipo_fecha, titulo: fecha.titulo } });
}

router.get('/', authenticate, async (_req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS} FROM fechas_calendario WHERE publicada = TRUE ORDER BY fecha_inicio, id_fecha`);
    res.set('Cache-Control', 'private, no-store');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al consultar fechas académicas:', err);
    res.status(500).json({ error: 'No se pudieron cargar las fechas académicas' });
  }
});

router.get('/admin', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (_req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${CAMPOS} FROM fechas_calendario ORDER BY fecha_inicio, id_fecha`);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al administrar fechas académicas:', err);
    res.status(500).json({ error: 'No se pudieron cargar las fechas académicas' });
  }
});

router.post('/', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    const datos = { ...req.body, publicada: req.body.publicada ?? true };
    const error = errorModelo(datos) || errorFecha(datos);
    if (error) return res.status(400).json({ error });
    const resultado = await pool.query(
      `INSERT INTO fechas_calendario (titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, publicada, mostrar_en_mural, id_autor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${CAMPOS}`,
      [datos.titulo.trim(), datos.tipo_fecha, datos.fecha_inicio, datos.fecha_fin || null, datos.nota?.trim() || null, datos.publicada, datos.mostrar_en_mural === true, req.user.id]
    );
    auditar(req, resultado.rows[0], 'crear_fecha_calendario', 'agregó');
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al guardar fecha académica:', err);
    res.status(500).json({ error: 'No se pudo guardar la fecha académica' });
  }
});

router.put('/:id', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Fecha académica no válida' });
    const modelo = errorModelo(req.body);
    if (modelo) return res.status(400).json({ error: modelo });
    const actual = await pool.query(`SELECT ${CAMPOS} FROM fechas_calendario WHERE id_fecha = $1`, [req.params.id]);
    if (!actual.rows.length) return res.status(404).json({ error: 'Fecha académica no encontrada' });
    const datos = { ...actual.rows[0] };
    for (const campo of ['titulo', 'tipo_fecha', 'fecha_inicio', 'fecha_fin', 'nota', 'publicada', 'mostrar_en_mural']) {
      if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    }
    const error = errorFecha(datos, actual.rows[0]);
    if (error) return res.status(400).json({ error });
    const resultado = await pool.query(
      `UPDATE fechas_calendario SET titulo = $1, tipo_fecha = $2, fecha_inicio = $3,
       fecha_fin = $4, nota = $5, publicada = $6, mostrar_en_mural = $7, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id_fecha = $8 RETURNING ${CAMPOS}`,
      [datos.titulo.trim(), datos.tipo_fecha, datos.fecha_inicio, datos.fecha_fin || null, datos.nota?.trim() || null, datos.publicada, datos.mostrar_en_mural === true, req.params.id]
    );
    auditar(req, resultado.rows[0], 'actualizar_fecha_calendario', 'actualizó');
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Error al actualizar fecha académica:', err);
    res.status(500).json({ error: 'No se pudo actualizar la fecha académica' });
  }
});

router.delete('/:id', authenticate, requireRole(ROL_ADMIN, ROL_RECTORIA, ROL_COORDINACION), async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Fecha académica no válida' });
    const resultado = await pool.query(`DELETE FROM fechas_calendario WHERE id_fecha = $1 RETURNING ${CAMPOS}`, [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ error: 'Fecha académica no encontrada' });
    auditar(req, resultado.rows[0], 'eliminar_fecha_calendario', 'eliminó');
    res.json({ mensaje: 'Fecha académica eliminada' });
  } catch (err) {
    console.error('Error al eliminar fecha académica:', err);
    res.status(500).json({ error: 'No se pudo eliminar la fecha académica' });
  }
});

export default router;
