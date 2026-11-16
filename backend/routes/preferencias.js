// Preferencias del onboarding para alumnos (id_rol = 1). Todas las consultas
// usan req.user.id: ningún endpoint acepta un id de usuario del cliente.
import { Router } from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { resolverPeriodoVigente } from '../lib/periodos.js';
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
  const filaBase = (await db.query('SELECT * FROM preferencias_usuario WHERE id_usuario = $1', [idUsuario])).rows[0] ?? null;
  let fila = filaBase;
  if (fila) {
    const lic = fila.id_licenciatura
      ? (await db.query('SELECT nombre FROM cat_licenciaturas WHERE id_licenciatura = $1', [fila.id_licenciatura])).rows[0]
      : null;
    const perIngreso = fila.id_periodo_ingreso
      ? (await db.query('SELECT nombre FROM periodos_actividad WHERE id_periodo = $1', [fila.id_periodo_ingreso])).rows[0]
      : null;
    const resolucionActual = await resolverPeriodoVigente(db);
    if (resolucionActual.inconsistencia) {
      const err = new Error('Configuracion de periodos inconsistente');
      err.code = 'PERIODO_INCONSISTENTE';
      err.candidatos = resolucionActual.candidatos;
      throw err;
    }
    const perActual = resolucionActual.periodo ?? null;
    fila = {
      ...fila,
      licenciatura_nombre: lic?.nombre ?? null,
      periodo_ingreso_nombre: perIngreso?.nombre ?? null,
      periodo_actual_id: perActual?.id_periodo ?? null,
      periodo_actual_nombre: perActual?.nombre ?? null,
    };
  } else {
    const resolucionActual = await resolverPeriodoVigente(db);
    if (resolucionActual.inconsistencia) {
      const err = new Error('Configuracion de periodos inconsistente');
      err.code = 'PERIODO_INCONSISTENTE';
      err.candidatos = resolucionActual.candidatos;
      throw err;
    }
    const perActual = resolucionActual.periodo ?? null;
    fila = {
      periodo_actual_id: perActual?.id_periodo ?? null,
      periodo_actual_nombre: perActual?.nombre ?? null,
    };
  }
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
  if (actual?.estado_onboarding === 'completado') {
    datos.id_licenciatura = null;
    datos.id_periodo_ingreso = null;
    datos.origen = 'perfil';
  }
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
       id_licenciatura = COALESCE($10, id_licenciatura),
       id_periodo_ingreso = COALESCE($11, id_periodo_ingreso),
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
      datos.id_licenciatura, datos.id_periodo_ingreso,
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
    if (err && err.code === 'PERIODO_INCONSISTENTE') {
      return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: err.candidatos || [] });
    }
    console.error('Error al leer preferencias:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudieron cargar tus preferencias' });
  }
});

router.put('/preferencias', authenticate, requireRole(ROL_ALUMNO), limitadorPreferencias, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const actual = (await client.query(
      'SELECT * FROM preferencias_usuario WHERE id_usuario = $1 FOR UPDATE',
      [req.user.id],
    )).rows[0] ?? null;
    const body = { ...req.body };
    if (actual?.estado_onboarding === 'completado') {
      body.origen = 'perfil';
      delete body.id_licenciatura;
      delete body.id_periodo_ingreso;
    } else {
      body.origen = 'onboarding';
    }
    const catalogo = indexarCatalogo(await cargarCatalogoIntereses(client));
    const datos = validarPreferencias(body, catalogo);
    const resultado = await guardarPreferencias(client, req.user.id, datos);
    await client.query('COMMIT');
    res.json(resultado);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
    if (err && err.code === 'PERIODO_INCONSISTENTE') return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: err.candidatos || [] });
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resolucion = await resolverPeriodoVigente(client);
    if (resolucion.inconsistencia) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: resolucion.candidatos || [] });
    }
    await client.query(
      `INSERT INTO preferencias_usuario (id_usuario, estado_onboarding, onboarding_omitido_en)
       VALUES ($1, 'omitido', CURRENT_TIMESTAMP)
       ON CONFLICT (id_usuario) DO UPDATE SET
         estado_onboarding = 'omitido',
         onboarding_omitido_en = CURRENT_TIMESTAMP,
         actualizado_en = CURRENT_TIMESTAMP
       WHERE preferencias_usuario.estado_onboarding = 'pendiente'`,
      [req.user.id],
    );
    const resultado = await respuestaPreferencias(client, req.user.id);
    await client.query('COMMIT');
    res.json(resultado);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err && err.code === 'PERIODO_INCONSISTENTE') {
      return res.status(409).json({ error: 'Configuracion de periodos inconsistente', candidatos: err.candidatos || [] });
    }
    console.error('Error al omitir onboarding:', { codigo: err.code, mensaje: err.message });
    res.status(500).json({ error: 'No se pudo registrar la decisión. Puedes intentarlo de nuevo.' });
  } finally {
    client.release();
  }
});

router.get('/preferencias/insights', authenticate, requireRole(3, 4, 7), async (req, res) => {
  try {
    const estados = (await pool.query(
      `SELECT estado_onboarding, COUNT(*)::int AS total
       FROM preferencias_usuario
       GROUP BY estado_onboarding`,
    )).rows;

    const categorias = (await pool.query(
      `SELECT ci.nombre, COUNT(*)::int AS total
       FROM usuario_categorias_interes uci
       JOIN cat_categorias_interes ci ON ci.id_categoria_interes = uci.id_categoria_interes
       GROUP BY ci.nombre
       ORDER BY total DESC`,
    )).rows;

    const motivaciones = (await pool.query(
      `SELECT cm.nombre, COUNT(*)::int AS total
       FROM usuario_motivaciones um
       JOIN cat_motivaciones cm ON cm.id_motivacion = um.id_motivacion
       GROUP BY cm.nombre
       ORDER BY total DESC`,
    )).rows;

    const licenciaturas = (await pool.query(
      `SELECT cl.nombre, COUNT(*)::int AS total
       FROM preferencias_usuario pu
       JOIN cat_licenciaturas cl ON cl.id_licenciatura = pu.id_licenciatura
       GROUP BY cl.nombre
       ORDER BY total DESC`,
    )).rows;

    const propuestas = (await pool.query(
      `SELECT texto, COUNT(*)::int AS total
       FROM actividades_propuestas
       GROUP BY texto
       ORDER BY total DESC, texto ASC
       LIMIT 20`,
    )).rows;

    res.json({ estados, categorias, motivaciones, licenciaturas, propuestas });
  } catch (err) {
    console.error('Error al obtener insights de preferencias:', err);
    res.status(500).json({ error: 'No se pudieron cargar los insights' });
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
