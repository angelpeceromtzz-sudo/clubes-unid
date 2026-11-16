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
import { ROL_ADMIN, ROL_COORDINACION } from '../constants/roles.js';
import { cargarCatalogoIntereses } from '../lib/preferencias.js';
import { resolverPeriodoVigente } from '../lib/periodos.js';

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
router.post('/licenciaturas/cache', authenticate, requireRole(ROL_ADMIN, ROL_COORDINACION), (req, res) => {
  cacheLicenciaturas = null;
  res.json({ ok: true });
});

// Catálogo del onboarding de preferencias. Solo nombres y estructura, sin datos
// personales. El catálogo estable se cachea; el periodo vigente se resuelve
// en cada petición para no ocultar cambios ni inconsistencias.
let cacheIntereses = null;
let cacheInteresesEn = 0;

router.get('/intereses', async (req, res) => {
  const ahora = Date.now();

  let catalogoEstable = cacheIntereses;
  if (!catalogoEstable || ahora - cacheInteresesEn >= TTL_CACHE_MS) {
    try {
      const completo = await cargarCatalogoIntereses(pool);
      const { periodoActivo, ...estable } = completo;
      catalogoEstable = estable;
      cacheIntereses = estable;
      cacheInteresesEn = ahora;
    } catch (err) {
      if (err && err.code === 'PERIODO_INCONSISTENTE') {
        return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: err.candidatos || [] });
      }
      console.error('Error al listar intereses:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  try {
    const resolucion = await resolverPeriodoVigente(pool);
    if (resolucion.inconsistencia) {
      return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: resolucion.candidatos || [] });
    }
    const catalogo = { ...catalogoEstable, periodoActivo: resolucion.periodo ? { id: resolucion.periodo.id_periodo, nombre: resolucion.periodo.nombre, fecha_inicio: resolucion.periodo.fecha_inicio, fecha_fin: resolucion.periodo.fecha_fin } : null };
    res.json(catalogo);
  } catch (err) {
    if (err && err.code === 'PERIODO_INCONSISTENTE') {
      return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: err.candidatos || [] });
    }
    console.error('Error al listar intereses:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
