// Preferencias del onboarding para alumnos (id_rol = 1). Todas las consultas
// usan req.user.id: ningún endpoint acepta un id de usuario del cliente.
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { ROL_ALUMNO } from '../constants/roles.js';
import { limitadorPreferencias } from '../lib/rateLimits.js';
import { CORREOS_NO_CONFIGURABLES, VERSION_AVISO_PUBLICADA } from '../lib/preferenciasCorreo.js';
import {
  ErrorValidacion,
  MAX_PROPUESTAS_PENDIENTES,
  calcularCambiosConsentimiento,
  cargarCatalogoIntereses,
  correoDesdeFila,
  indexarCatalogo,
  serializarPreferencias,
  validarPreferencias,
} from '../lib/preferencias.js';

const router = Router();
const fallo = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const SELECCIONES = [
  { tabla: 'usuario_categorias_interes', columna: 'id_categoria_interes' },
  { tabla: 'usuario_actividades_interes', columna: 'id_actividad' },
  { tabla: 'usuario_motivaciones', columna: 'id_motivacion' },
];

async function leerPreferencias(db, idUsuario) {
  const fila = (await db.query('SELECT * FROM preferencias_usuario WHERE id_usuario = $1', [idUsuario])).rows[0] ?? null;
  const categorias = (await db.query(
    'SELECT id_categoria_interes FROM usuario_categorias_interes WHERE id_usuario = $1 ORDER BY id_categoria_interes',
    [idUsuario],
  )).rows.map((r) => r.id_categoria_interes);
  const actividades = (await db.query(
    'SELECT id_actividad FROM usuario_actividades_interes WHERE id_usuario = $1 ORDER BY id_actividad',
    [idUsuario],
  )).rows.map((r) => r.id_actividad);
  const motivaciones = (await db.query(
    'SELECT id_motivacion FROM usuario_motivaciones WHERE id_usuario = $1 ORDER BY id_motivacion',
    [idUsuario],
  )).rows.map((r) => r.id_motivacion);
  const propuestas = (await db.query(
    `SELECT id_propuesta AS id, texto, estado
     FROM actividades_propuestas
     WHERE id_usuario = $1
     ORDER BY creada_en DESC, id_propuesta DESC`,
    [idUsuario],
  )).rows;
  return serializarPreferencias({ fila, categorias, actividades, motivaciones, propuestas });
}

async function respuestaPreferencias(db, idUsuario, extra = {}) {
  return {
    ...(await leerPreferencias(db, idUsuario)),
    correos_no_configurables: CORREOS_NO_CONFIGURABLES,
    ...extra,
  };
}

async function reemplazarSeleccion(client, idUsuario, { tabla, columna }, ids) {
  await client.query(`DELETE FROM ${tabla} WHERE id_usuario = $1`, [idUsuario]);
  await client.query(
    `INSERT INTO ${tabla} (id_usuario, ${columna})
     SELECT $1::int, unnest($2::int[])`,
    [idUsuario, ids],
  );
}

async function guardarPreferencias(client, idUsuario, datos) {
  await client.query(
    'INSERT INTO preferencias_usuario (id_usuario) VALUES ($1) ON CONFLICT (id_usuario) DO NOTHING',
    [idUsuario],
  );
  const actual = (await client.query(
    'SELECT * FROM preferencias_usuario WHERE id_usuario = $1 FOR UPDATE',
    [idUsuario],
  )).rows[0];
  const correoAnterior = correoDesdeFila(actual);

  await reemplazarSeleccion(client, idUsuario, SELECCIONES[0], datos.categorias);
  await reemplazarSeleccion(client, idUsuario, SELECCIONES[1], datos.actividades);
  await reemplazarSeleccion(client, idUsuario, SELECCIONES[2], datos.motivaciones);

  const duplicadas = [];
  const nuevas = [];
  for (const propuesta of datos.propuestas) {
    const insertada = await client.query(
      `INSERT INTO actividades_propuestas (id_usuario, texto, texto_normalizado)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_usuario, texto_normalizado) DO NOTHING
       RETURNING id_propuesta`,
      [idUsuario, propuesta.texto, propuesta.normalizado],
    );
    if (insertada.rows.length === 0) duplicadas.push(propuesta.texto);
    else nuevas.push(propuesta.texto);
  }
  if (nuevas.length > 0) {
    const pendientes = (await client.query(
      `SELECT count(*)::int AS n FROM actividades_propuestas WHERE id_usuario = $1 AND estado = 'pendiente'`,
      [idUsuario],
    )).rows[0].n;
    if (pendientes > MAX_PROPUESTAS_PENDIENTES) {
      throw fallo(409, `Tienes demasiadas propuestas pendientes de revisión (máximo ${MAX_PROPUESTAS_PENDIENTES})`);
    }
  }

  const { correo } = datos;
  await client.query(
    `UPDATE preferencias_usuario SET
       genero = $2,
       estado_onboarding = 'completado',
       onboarding_completado_en = COALESCE(onboarding_completado_en, CURRENT_TIMESTAMP),
       correo_activo = $3,
       correo_frecuencia = $4,
       correo_clubes_convocatorias = $5,
       correo_mis_clubes = $6,
       correo_eventos = $7,
       correo_noticias = $8,
       correo_recordatorios = $9,
       actualizado_en = CURRENT_TIMESTAMP
     WHERE id_usuario = $1`,
    [
      idUsuario, datos.genero, correo.activo, correo.frecuencia,
      correo.tipos.clubes_convocatorias, correo.tipos.mis_clubes, correo.tipos.eventos,
      correo.tipos.noticias, correo.tipos.recordatorios,
    ],
  );

  const cambios = calcularCambiosConsentimiento(correoAnterior, correo);
  if (cambios.length > 0) {
    await client.query(
      `INSERT INTO historial_consentimiento_correo (id_usuario, tipo, accion, frecuencia, origen, version_aviso)
       SELECT $1::int, t.tipo, t.accion, t.frecuencia, $2::text, $3::text
       FROM unnest($4::text[], $5::text[], $6::text[]) AS t(tipo, accion, frecuencia)`,
      [
        idUsuario,
        datos.origen,
        VERSION_AVISO_PUBLICADA,
        cambios.map((c) => c.tipo),
        cambios.map((c) => c.accion),
        cambios.map((c) => c.frecuencia),
      ],
    );
  }

  return respuestaPreferencias(client, idUsuario, { propuestas_duplicadas: duplicadas });
}

router.get('/preferencias', authenticate, requireRole(ROL_ALUMNO), async (req, res) => {
  try {
    res.json(await respuestaPreferencias(pool, req.user.id));
  } catch (err) {
    console.error('Error al leer preferencias:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudieron cargar tus preferencias' });
  }
});

router.put('/preferencias', authenticate, requireRole(ROL_ALUMNO), limitadorPreferencias, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const catalogo = indexarCatalogo(await cargarCatalogoIntereses(client));
    const datos = validarPreferencias(req.body, catalogo);
    const resultado = await guardarPreferencias(client, req.user.id, datos);
    await client.query('COMMIT');
    res.json(resultado);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error('Error al guardar preferencias:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudieron guardar tus preferencias. Puedes intentarlo de nuevo.' });
  } finally {
    client.release();
  }
});

// Omitir solo cambia un estado 'pendiente'. Si ya hay respuestas (completado) o
// ya se omitió, la instrucción no altera nada.
router.post('/preferencias/omitir', authenticate, requireRole(ROL_ALUMNO), limitadorPreferencias, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO preferencias_usuario (id_usuario, estado_onboarding, onboarding_omitido_en)
       VALUES ($1, 'omitido', CURRENT_TIMESTAMP)
       ON CONFLICT (id_usuario) DO UPDATE SET
         estado_onboarding = 'omitido',
         onboarding_omitido_en = CURRENT_TIMESTAMP,
         actualizado_en = CURRENT_TIMESTAMP
       WHERE preferencias_usuario.estado_onboarding = 'pendiente'`,
      [req.user.id],
    );
    res.json(await respuestaPreferencias(pool, req.user.id));
  } catch (err) {
    console.error('Error al omitir onboarding:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudo registrar la decisión. Puedes intentarlo de nuevo.' });
  }
});

router.get('/preferencias/historial-correo', authenticate, requireRole(ROL_ALUMNO), async (req, res) => {
  try {
    const historial = await pool.query(
      `SELECT tipo, accion, frecuencia, origen, version_aviso, creado_en
       FROM historial_consentimiento_correo
       WHERE id_usuario = $1
       ORDER BY creado_en DESC, id_consentimiento DESC
       LIMIT 200`,
      [req.user.id],
    );
    res.json({ historial: historial.rows });
  } catch (err) {
    console.error('Error al leer historial de consentimiento:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudo cargar el historial' });
  }
});

export default router;
