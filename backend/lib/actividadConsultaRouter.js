import { Router } from 'express';
import { errorActividad, fechaActividad, textoActividad } from './actividadesDominio.js';

const DESDE = `FROM actividad_clubes a
  LEFT JOIN catalogo_recursos c ON c.id_club=a.id_club
  LEFT JOIN actividades_ediciones e ON e.id_edicion=a.id_edicion
  LEFT JOIN usuarios u ON u.id_usuario=a.id_actor`;

export function crearRouterConsultaActividad({ db, autenticar }) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(autenticar);
  router.use((req, res, next) => [3, 4, 7].includes(req.user.id_rol) ? next() : res.status(403).json({ error: 'No tienes acceso a la bitácora' }));

  router.get('/filtros', async (_req, res) => {
    try {
      const [actores, tipos, recursos] = await Promise.all([
        db.query(`SELECT DISTINCT u.id_usuario AS id,u.nombre_completo AS nombre
          FROM actividad_clubes a JOIN usuarios u ON u.id_usuario=a.id_actor ORDER BY nombre`),
        db.query("SELECT DISTINCT tipo_evento AS tipo FROM actividad_clubes WHERE tipo_evento<>'' ORDER BY tipo"),
        db.query(`SELECT DISTINCT c.id_club AS id,c.nombre AS nombre,c.tipo
          FROM actividad_clubes a JOIN catalogo_recursos c ON c.id_club=a.id_club ORDER BY nombre`),
      ]);
      res.json({ actores: actores.rows, tipos: tipos.rows.map((fila) => fila.tipo), clubes: recursos.rows });
    } catch {
      res.status(500).json({ error: 'No se pudieron consultar los filtros de la bitácora' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      if (!Number.isSafeInteger(page)) throw errorActividad('Página no válida');
      const limit = 50;
      const desde = fechaActividad(req.query.desde);
      const hasta = fechaActividad(req.query.hasta);
      if (desde && hasta && desde > hasta) throw errorActividad('El rango de fechas no es válido');
      const recurso = req.query.recurso || '';
      if (!['', 'club', 'actividad'].includes(recurso)) throw errorActividad('Tipo de recurso no válido');
      const club = req.query.club ? Number(req.query.club) : null;
      if (club !== null && (!/^[1-9]\d*$/.test(req.query.club) || !Number.isSafeInteger(club))) throw errorActividad('El recurso no es válido');
      const actor = textoActividad(req.query.actor, 150, 'Autor');
      const tipo = textoActividad(req.query.tipo, 80, 'Acción');
      const filtros = `WHERE ($1::date IS NULL OR a.fecha_creacion >= $1::date)
        AND ($2::date IS NULL OR a.fecha_creacion < ($2::date + INTERVAL '1 day'))
        AND ($3::text IS NULL OR u.nombre_completo ILIKE '%' || $3 || '%')
        AND ($4::text IS NULL OR a.tipo_evento=$4)
        AND ($5::int IS NULL OR a.id_club=$5)
        AND ($6::text IS NULL OR c.tipo=$6)`;
      const valores = [desde, hasta, actor || null, tipo || null, club, recurso || null];
      const total = (await db.query('SELECT COUNT(*)::int AS total ' + DESDE + ' ' + filtros, valores)).rows[0].total;
      const eventos = (await db.query(`SELECT a.id_evento,a.tipo_evento,a.descripcion,a.detalles,a.fecha_creacion,
          a.id_club,a.id_edicion,a.origen,a.id_historial_actividad_anterior,
          c.nombre AS nombre_club,c.tipo AS tipo_recurso,e.nombre AS edicion_nombre,u.nombre_completo AS actor_nombre
        ${DESDE} ${filtros}
        ORDER BY a.fecha_creacion DESC,a.id_evento DESC LIMIT $7 OFFSET $8`, [...valores, limit, (page - 1) * limit])).rows;
      res.json({ eventos, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo consultar la bitácora' });
    }
  });
  return router;
}
