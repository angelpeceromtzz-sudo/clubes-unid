import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Versiones vigentes de documentos legales.
export const VERSION_TERMINOS = '1.0';
export const VERSION_PRIVACIDAD = '1.0';

router.get('/estado', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT documento, version, aceptado_en
       FROM aceptaciones_legales
       WHERE id_usuario = $1`,
      [req.user.id],
    );
    const aceptados = Object.fromEntries(result.rows.map((r) => [r.documento, r.version]));
    const completo =
      aceptados.terminos === VERSION_TERMINOS &&
      aceptados.privacidad === VERSION_PRIVACIDAD;
    res.json({ completo, versiones: { terminos: VERSION_TERMINOS, privacidad: VERSION_PRIVACIDAD }, aceptados });
  } catch (err) {
    console.error('Error al consultar consentimiento legal:', err);
    res.status(500).json({ error: 'No se pudo consultar el consentimiento legal' });
  }
});

router.post('/aceptar', authenticate, async (req, res) => {
  try {
    const { terminos, privacidad } = req.body || {};
    if (terminos !== true || privacidad !== true) {
      return res.status(400).json({ error: 'Debes aceptar ambos documentos' });
    }
    await pool.query(
      `INSERT INTO aceptaciones_legales (id_usuario, documento, version, aceptado_en)
       VALUES ($1, 'terminos', $2, NOW())
       ON CONFLICT (id_usuario, documento) DO UPDATE SET version = $2, aceptado_en = NOW()`,
      [req.user.id, VERSION_TERMINOS],
    );
    await pool.query(
      `INSERT INTO aceptaciones_legales (id_usuario, documento, version, aceptado_en)
       VALUES ($1, 'privacidad', $2, NOW())
       ON CONFLICT (id_usuario, documento) DO UPDATE SET version = $2, aceptado_en = NOW()`,
      [req.user.id, VERSION_PRIVACIDAD],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al registrar consentimiento legal:', err);
    res.status(500).json({ error: 'No se pudo registrar el consentimiento legal' });
  }
});

export default router;