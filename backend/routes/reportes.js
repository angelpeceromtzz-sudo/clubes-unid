import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ADMIN } from '../constants/roles.js';

const router = Router();

const TIPOS_PERMITIDOS = [
  'Error técnico',
  'Problema de acceso',
  'Información incorrecta',
  'Problema con un club',
  'Problema con una convocatoria',
  'Problema con una inscripción',
  'Problema con una asistencia',
  'Sugerencia de mejora',
  'Otro',
];

const IMPORTANCIAS_PERMITIDAS = ['Bajo', 'Medio', 'Alto', 'Crítico'];
const ESTADOS_PERMITIDOS = ['Pendiente', 'En revisión', 'Resuelto', 'Cerrado'];

function generarFolio() {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `REP-${hoy}-${rnd}`;
}

router.post('/', async (req, res) => {
  try {
    const { tipo, modulo, descripcion, pasos, importancia, correo, captura_url } = req.body || {};

    if (!tipo || !TIPOS_PERMITIDOS.includes(String(tipo))) {
      return res.status(400).json({ error: 'El tipo de problema no es válido.' });
    }
    if (!modulo || String(modulo).trim().length === 0) {
      return res.status(400).json({ error: 'El módulo donde ocurrió es obligatorio.' });
    }
    if (!descripcion || String(descripcion).trim().length === 0) {
      return res.status(400).json({ error: 'La descripción del problema es obligatoria.' });
    }
    if (!importancia || !IMPORTANCIAS_PERMITIDAS.includes(String(importancia))) {
      return res.status(400).json({ error: 'El nivel de importancia no es válido.' });
    }
    const correoStr = String(correo || '').trim();
    if (!correoStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoStr)) {
      return res.status(400).json({ error: 'El correo de contacto no es válido.' });
    }

    let folio = generarFolio();
    for (let i = 0; i < 5; i += 1) {
      const existe = await pool.query('SELECT 1 FROM reportes WHERE folio = $1', [folio]);
      if (existe.rowCount === 0) break;
      folio = generarFolio();
    }

    const idUsuario = req.user?.id || null;

    const result = await pool.query(
      `INSERT INTO reportes (folio, tipo, modulo, descripcion, pasos, importancia, correo_contacto, captura_url, estado, id_usuario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pendiente',$9)
       RETURNING id_reporte, folio, estado, creado_en`,
      [
        folio,
        String(tipo),
        String(modulo).trim(),
        String(descripcion).trim(),
        pasos ? String(pasos).trim() : null,
        String(importancia),
        correoStr,
        captura_url ? String(captura_url) : null,
        idUsuario,
      ]
    );

    const row = result.rows[0];

    // Notificar a todos los admins (mejor esfuerzo)
    try {
      const adminRes = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE id_rol = $1 AND deleted_at IS NULL ORDER BY id_usuario ASC',
        [ROL_ADMIN]
      );
      const emisorId = adminRes.rows[0]?.id_usuario || idUsuario || null;
      if (emisorId && adminRes.rows.length > 0) {
        const valores = [];
        const params = [];
        let idx = 1;
        for (const a of adminRes.rows) {
          valores.push(`($${idx++}, $${idx++}, $${idx++}, 'global', NULL, $${idx++})`);
          params.push(emisorId, 'Nuevo reporte recibido', `Se recibió el reporte ${row.folio} (${String(tipo)}). Revisa el panel de administración.`, a.id_usuario);
        }
        await pool.query(
          `INSERT INTO notificaciones (id_emisor, titulo, mensaje, audiencia, id_club, id_destinatario)
           VALUES ${valores.join(', ')}`,
          params
        );
      }
    } catch (notifErr) {
      console.error('No se pudo crear notificación de reporte:', notifErr);
    }

    return res.status(201).json({
      folio: row.folio,
      estado: row.estado,
      creado_en: row.creado_en,
    });
  } catch (err) {
    console.error('Error al crear reporte:', err);
    return res.status(500).json({ error: 'No se pudo enviar el reporte. Intenta de nuevo.' });
  }
});

router.get('/', authenticate, requireRole(ROL_ADMIN), async (req, res) => {
  try {
    const { estado, tipo } = req.query || {};
    const where = [];
    const params = [];
    let idx = 1;
    if (estado && ESTADOS_PERMITIDOS.includes(String(estado))) {
      where.push(`estado = $${idx++}`);
      params.push(String(estado));
    }
    if (tipo && TIPOS_PERMITIDOS.includes(String(tipo))) {
      where.push(`tipo = $${idx++}`);
      params.push(String(tipo));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id_reporte, folio, tipo, modulo, descripcion, pasos, importancia, correo_contacto, captura_url, estado, id_usuario, creado_en, actualizado_en, notas_admin, resuelto_en
       FROM reportes
       ${whereSql}
       ORDER BY creado_en DESC
       LIMIT 300`,
      params
    );
    return res.json({ reportes: result.rows });
  } catch (err) {
    console.error('Error al listar reportes:', err);
    return res.status(500).json({ error: 'No se pudieron cargar los reportes.' });
  }
});

router.patch('/:id', authenticate, requireRole(ROL_ADMIN), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    const { estado, notas_admin } = req.body || {};
    if (estado && !ESTADOS_PERMITIDOS.includes(String(estado))) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }
    const sets = [];
    const params = [];
    let idx = 1;
    if (estado) {
      sets.push(`estado = $${idx++}`);
      params.push(String(estado));
      if (String(estado) === 'Resuelto' || String(estado) === 'Cerrado') {
        sets.push(`resuelto_en = COALESCE(resuelto_en, NOW())`);
      } else {
        sets.push(`resuelto_en = NULL`);
      }
    }
    if (typeof notas_admin !== 'undefined') {
      sets.push(`notas_admin = $${idx++}`);
      params.push(notas_admin ? String(notas_admin) : null);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'No hay cambios para aplicar.' });
    }
    sets.push(`actualizado_en = NOW()`);
    params.push(id);
    const result = await pool.query(
      `UPDATE reportes SET ${sets.join(', ')} WHERE id_reporte = $${idx} RETURNING id_reporte, folio, estado, notas_admin, resuelto_en, actualizado_en`,
      params
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado.' });
    }
    return res.json({ reporte: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar reporte:', err);
    return res.status(500).json({ error: 'No se pudo actualizar el reporte.' });
  }
});

export default router;
