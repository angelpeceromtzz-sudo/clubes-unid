// Catálogos públicos de la UNID.
//
// Sin autenticación a propósito: los consumen dos pantallas que no son la misma.
// La encuesta de intereses se abre por link público, sin sesión, y el formulario
// de inscripción a club tampoco puede exigirla porque el alumno aún no postuló.
//
// Nota: aquí no se sirven datos personales. Sólo nombres oficiales de programa.
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Programas de la UNID para el <select> del frontend.
// Cacheado en memoria: el catálogo cambia una o dos veces al año y cada render
// del formulario lo pide. TTL corto por si se actualiza en caliente.
let cacheLicenciaturas = null;
let cacheLicenciaturasEn = 0;
const TTL_CACHE_MS = 10 * 60 * 1000;

router.get('/licenciaturas', async (req, res) => {
  const ahora = Date.now();

  if (cacheLicenciaturas && ahora - cacheLicenciaturasEn < TTL_CACHE_MS) {
    return res.json(cacheLicenciaturas);
  }

  try {
    const result = await pool.query(
      `SELECT id_licenciatura, nombre
       FROM cat_licenciaturas
       ORDER BY orden ASC, nombre ASC`
    );

    cacheLicenciaturas = result.rows;
    cacheLicenciaturasEn = ahora;

    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar licenciaturas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Se invalida a mano desde el panel cuando alguien da de alta un programa nuevo,
// para que el <select> no sirva el catálogo viejo hasta que expire el TTL.
router.post('/licenciaturas/cache', authenticate, requireRole(3), (req, res) => {
  cacheLicenciaturas = null;
  res.json({ ok: true });
});

export default router;