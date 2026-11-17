import { Router } from 'express';
import { guardarPublicacionFotos } from './mediosOferta.js';
import { migrarLegadoActividades } from './actividadesLegado.js';
import { registrarActividadCatalogo } from './actividadCatalogo.js';
import { montarAsistenciaActividades, consultarAsistencia, asistenciaPropia } from './actividadesAsistencia.js';
import {
  ROLES_CREAN_ACTIVIDADES, ROLES_SUPERVISAN_ACTIVIDADES, REACCIONES_ACTIVIDAD,
  errorActividad, textoActividad, normalizarRecursoCatalogo, normalizarEdicionActividad,
  validarPublicacionEdicion, esDestacadaActividad, estadoRegistroActividad,
  validarRespuestasActividad, validarAportacionesActividad,
  normalizarOpcionAportacion,
  disponibilidadAsistenciaActividad,
} from './actividadesDominio.js';

const FECHAS = ['fecha_inicio', 'fecha_fin', 'inscripcion_desde', 'inscripcion_hasta', 'destacada_desde', 'destacada_hasta'];
const SELECT_EDICION = 'e.*, ' + FECHAS.map((clave) => 'e.' + clave + '::text AS ' + clave).join(', ') + ', a.plantilla, a.nombre AS actividad_nombre, a.slug AS actividad_slug, a.estado AS estado_actividad, a.id_responsable, a.id_autor';
const DESDE_EDICION = ' FROM actividades_ediciones e JOIN catalogo_recursos a ON a.id_actividad = e.id_actividad ';
const TABLAS = { actividad: ['catalogo_recursos', 'id_actividad'], edicion: ['actividades_ediciones', 'id_edicion'] };
const supervisa = (usuario) => ROLES_SUPERVISAN_ACTIVIDADES.includes(usuario.id_rol);
const aprueba = (usuario) => usuario.id_rol === 4;
const puedeGestionar = (usuario, actividad) => supervisa(usuario) || actividad.id_responsable === usuario.id || (!actividad.id_responsable && actividad.id_autor === usuario.id);

function comprobarGestion(usuario, actividad) {
  if (!puedeGestionar(usuario, actividad)) throw errorActividad('No tienes acceso a esta actividad', 403);
}

function edicionPublica(edicion, hoy) {
  const { propuesta: _propuesta, estado_propuesta: _revision, motivo_rechazo: _motivo, id_autor: _autor, id_responsable: _encargado, ...publica } = edicion;
  return { ...publica, destacada: esDestacadaActividad(edicion, hoy), estado_registro: estadoRegistroActividad(edicion, hoy) };
}

async function obtenerActividad(db, id, bloquear = false) {
  const { rows } = await db.query('SELECT * FROM catalogo_recursos WHERE id_actividad = $1' + (bloquear ? ' FOR UPDATE' : ''), [id]);
  if (!rows[0]) throw errorActividad('Actividad no encontrada', 404);
  rows[0].niveles = (await db.query('SELECT id_nivel FROM clubes_niveles WHERE id_club=$1 ORDER BY id_nivel', [id])).rows.map((fila) => fila.id_nivel);
  return rows[0];
}

async function obtenerEdicion(db, id, bloquear = false) {
  const { rows } = await db.query('SELECT ' + SELECT_EDICION + DESDE_EDICION + 'WHERE e.id_edicion = $1' + (bloquear ? ' FOR UPDATE OF a, e' : ''), [id]);
  if (!rows[0]) throw errorActividad('Edición no encontrada', 404);
  return rows[0];
}

function comprobarPublica(edicion) {
  if (edicion.estado !== 'publicada' || edicion.estado_actividad !== 'publicada') throw errorActividad('Edición no disponible', 404);
}

async function catalogoEdicion(db, id) {
  return (await db.query('SELECT * FROM actividades_aportes_catalogo WHERE id_edicion = $1 ORDER BY id_opcion', [id])).rows;
}

async function aportesRegistro(db, id) {
  return (await db.query('SELECT * FROM actividades_aportaciones WHERE id_registro = $1 ORDER BY id_aportacion', [id])).rows;
}

async function guardarColumnas(db, tabla, idCampo, id, datos) {
  const claves = Object.keys(datos).filter((clave) => clave !== 'niveles');
  if (tabla === 'catalogo_recursos' && datos.tipo === 'club' && datos.cupo_maximo) {
    const activos = (await db.query('SELECT COUNT(*)::int AS total FROM inscripciones WHERE id_club=$1 AND id_estatus_inscripcion=1', [id])).rows[0].total;
    if (activos > datos.cupo_maximo) throw errorActividad('El cupo no puede ser menor que la cantidad de miembros activos', 409);
  }
  const valores = claves.map((clave) => clave === 'campos_registro' ? JSON.stringify(datos[clave]) : datos[clave]);
  const cambios = claves.map((clave, indice) => clave + ' = $' + (indice + 1)).join(', ');
  const resultado = (await db.query('UPDATE ' + tabla + ' SET ' + cambios + ', actualizado_en = NOW() WHERE ' + idCampo + ' = $' + (valores.length + 1) + ' RETURNING *', [...valores, id])).rows[0];
  if (tabla === 'catalogo_recursos' && datos.niveles) {
    await db.query('DELETE FROM clubes_niveles WHERE id_club=$1', [id]);
    for (const nivel of datos.niveles) await db.query('INSERT INTO clubes_niveles(id_club,id_nivel) VALUES($1,$2)', [id, nivel]);
  }
  return resultado;
}

async function auditar(db, usuario, accion, detalle) {
  await registrarActividadCatalogo(db, { idActor: usuario.id, accion, detalle });
}

export function crearRouterActividades({ db, autenticar, hoy, subirImagen, secretoAdmin, limpiarImagenes = async () => {}, limitarEscritura = (_req, _res, next) => next(), limitarSubida = (_req, _res, next) => next() }) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  for (const parametro of ['idActividad', 'idEdicion', 'idFoto', 'idAporte', 'idOpcion', 'idClub', 'idRegistro']) {
    router.param(parametro, (_req, _res, next, valor) => {
      if (!/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) return next(errorActividad('Identificador no válido'));
      next();
    });
  }

  async function transaccion(trabajo) {
    const cliente = await db.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally { cliente.release(); }
  }

  router.get('/', async (req, res) => {
    const tipo = req.query.tipo || 'actividad';
    if (!['club', 'actividad', 'todos'].includes(tipo)) throw errorActividad('Filtro de tipo no válido');
    const actividades = (await db.query("SELECT id_actividad,id_club,tipo,slug,nombre,descripcion,categoria,url_imagen,plantilla,mostrar_en_oferta FROM catalogo_recursos WHERE estado='publicada' AND (tipo<>'club' OR id_estatus_club<>3) AND ($1='todos' OR tipo=$1) ORDER BY id_actividad", [tipo])).rows;
    const ediciones = (await db.query('SELECT ' + SELECT_EDICION + DESDE_EDICION + "WHERE e.estado = 'publicada' AND a.estado = 'publicada' ORDER BY e.fecha_inicio NULLS LAST, e.id_edicion")).rows;
    const fecha = hoy();
    res.json({ hoy: fecha, actividades: actividades.map((actividad) => ({ ...actividad, ediciones: ediciones.filter((edicion) => edicion.id_actividad === actividad.id_actividad).map((edicion) => edicionPublica(edicion, fecha)) })) });
  });

  router.get('/detalle/:slug', async (req, res) => {
    if (!/^[a-z0-9-]{1,100}$/.test(req.params.slug)) throw errorActividad('Actividad no encontrada', 404);
    const { rows } = await db.query("SELECT id_actividad,id_club,tipo,slug,nombre,descripcion,categoria,url_imagen,plantilla,mostrar_en_oferta FROM catalogo_recursos WHERE slug = $1 AND estado = 'publicada' AND (tipo<>'club' OR id_estatus_club<>3)", [req.params.slug]);
    if (!rows[0]) throw errorActividad('Actividad no encontrada', 404);
    const ediciones = (await db.query('SELECT ' + SELECT_EDICION + DESDE_EDICION + "WHERE e.id_actividad = $1 AND e.estado = 'publicada' ORDER BY e.fecha_inicio DESC NULLS LAST, e.id_edicion DESC", [rows[0].id_actividad])).rows;
    const resultado = [];
    for (const edicion of ediciones) {
      const catalogo = await catalogoEdicion(db, edicion.id_edicion);
      const fotos = (await db.query("SELECT id_foto, url_imagen, pie, creado_en FROM actividades_fotos WHERE id_edicion = $1 AND estado = 'publicada' ORDER BY creado_en DESC, id_foto DESC", [edicion.id_edicion])).rows;
      const reacciones = (await db.query('SELECT reaccion, COUNT(*)::int AS total FROM reacciones_catalogo WHERE id_edicion = $1 GROUP BY reaccion', [edicion.id_edicion])).rows;
      resultado.push({ ...edicionPublica(edicion, hoy()), catalogo: catalogo.filter((opcion) => opcion.activa), fotos, reacciones });
    }
    const fotos = rows[0].tipo === 'club' ? (await db.query("SELECT id_foto,url_imagen,pie,creado_en FROM actividades_fotos WHERE id_club=$1 AND id_edicion IS NULL AND estado='publicada' ORDER BY creado_en DESC,id_foto DESC", [rows[0].id_club])).rows : [];
    res.json({ actividad: rows[0], ediciones: resultado, fotos, hoy: hoy() });
  });

  router.get('/legado/club/:idClub', async (req, res) => {
    const { rows } = await db.query("SELECT a.slug,e.id_edicion FROM migraciones_catalogo l JOIN actividades_ediciones e ON e.id_edicion=l.id_edicion_destino JOIN catalogo_recursos a ON a.id_actividad=e.id_actividad WHERE l.tipo='traslado_club' AND l.id_club_origen=$1 AND a.estado='publicada' AND e.estado='publicada'", [req.params.idClub]);
    res.json(rows[0] || null);
  });

  router.get('/clubes/:idClub/galeria', async (req,res) => {
    const club=await obtenerActividad(db,req.params.idClub);
    if(club.tipo!=='club' || club.estado!=='publicada' || club.id_estatus_club===3) throw errorActividad('Club no disponible',404);
    const fotos=(await db.query("SELECT id_foto,url_imagen,pie,creado_en FROM actividades_fotos WHERE id_club=$1 AND id_edicion IS NULL AND estado='publicada' ORDER BY creado_en DESC,id_foto DESC",[club.id_club])).rows;
    const reacciones=(await db.query('SELECT reaccion,COUNT(*)::int AS total FROM reacciones_catalogo WHERE id_club=$1 AND id_edicion IS NULL GROUP BY reaccion',[club.id_club])).rows;
    res.json({fotos,reacciones});
  });
  router.get('/clubes/:idClub/mi-reaccion',autenticar,async(req,res)=>{
    const club=await obtenerActividad(db,req.params.idClub);
    if(club.tipo!=='club' || club.estado!=='publicada' || club.id_estatus_club===3) throw errorActividad('Club no disponible',404);
    res.json({reaccion:(await db.query('SELECT reaccion FROM reacciones_catalogo WHERE id_club=$1 AND id_usuario=$2 AND id_edicion IS NULL',[club.id_club,req.user.id])).rows[0]?.reaccion || null});
  });
  router.put('/clubes/:idClub/reaccion',autenticar,limitarEscritura,async(req,res)=>{
    if(req.body.reaccion!=null && !REACCIONES_ACTIVIDAD.includes(req.body.reaccion)) throw errorActividad('Reacción no válida');
    res.json(await transaccion(async(cliente)=>{
      const club=await obtenerActividad(cliente,req.params.idClub,true);
      if(club.tipo!=='club' || club.estado!=='publicada' || club.id_estatus_club===3) throw errorActividad('Club no disponible',404);
      if(req.body.reaccion) await cliente.query('INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion) VALUES($1,$2,$3) ON CONFLICT(id_club,id_usuario) WHERE id_edicion IS NULL DO UPDATE SET reaccion=EXCLUDED.reaccion',[club.id_club,req.user.id,req.body.reaccion]);
      else await cliente.query('DELETE FROM reacciones_catalogo WHERE id_club=$1 AND id_usuario=$2 AND id_edicion IS NULL',[club.id_club,req.user.id]);
      return {reaccion:req.body.reaccion || null,totales:(await cliente.query('SELECT reaccion,COUNT(*)::int AS total FROM reacciones_catalogo WHERE id_club=$1 AND id_edicion IS NULL GROUP BY reaccion',[club.id_club])).rows};
    }));
  });

  router.use('/gestion', autenticar);
  router.use('/gestion', (req, res, next) => req.method === 'GET' ? next() : limitarEscritura(req, res, next));

  router.get('/gestion/asignadas', async (req, res) => {
    const { rows } = await db.query(`SELECT id_actividad,nombre,descripcion,categoria,estado,slug
      FROM catalogo_recursos WHERE tipo='actividad' AND id_responsable=$1
      ORDER BY nombre,id_actividad`, [req.user.id]);
    res.json(rows);
  });

  async function actividadAsignada(req) {
    if (!/^[1-9]\d*$/.test(req.params.idActividad) || !Number.isSafeInteger(Number(req.params.idActividad))) throw errorActividad('Actividad no válida');
    const actividad = await obtenerActividad(db, req.params.idActividad);
    if (actividad.tipo !== 'actividad' || actividad.id_responsable !== req.user.id) throw errorActividad('Esta actividad no está asignada a tu cuenta', 403);
    return actividad;
  }

  router.get('/gestion/asignadas/:idActividad', async (req, res) => {
    const actividad = await actividadAsignada(req);
    actividad.responsable_nombre = (await db.query('SELECT nombre_completo FROM usuarios WHERE id_usuario=$1', [req.user.id])).rows[0]?.nombre_completo || null;
    const ediciones = (await db.query('SELECT ' + SELECT_EDICION + DESDE_EDICION + 'WHERE e.id_actividad=$1 ORDER BY e.id_edicion DESC', [actividad.id_actividad])).rows;
    res.json({ actividad, ediciones, puede_aprobar: aprueba(req.user) });
  });

  router.get('/gestion/asignadas/:idActividad/historial', async (req, res) => {
    const actividad = await actividadAsignada(req);
    const page = Number(req.query.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger((page - 1) * 25)) throw errorActividad('Página no válida');
    const total = (await db.query('SELECT COUNT(*)::int AS total FROM actividad_clubes WHERE id_club=$1', [actividad.id_actividad])).rows[0].total;
    const eventos = (await db.query(`SELECT a.id_evento,a.tipo_evento,a.descripcion,a.fecha_creacion,
      u.nombre_completo AS actor_nombre,e.nombre AS edicion_nombre
      FROM actividad_clubes a LEFT JOIN usuarios u ON u.id_usuario=a.id_actor
      LEFT JOIN actividades_ediciones e ON e.id_edicion=a.id_edicion
      WHERE a.id_club=$1 ORDER BY a.fecha_creacion DESC,a.id_evento DESC LIMIT 25 OFFSET $2`, [actividad.id_actividad, (page - 1) * 25])).rows;
    res.json({ eventos, page, total, totalPages: Math.max(1, Math.ceil(total / 25)) });
  });

  router.get('/gestion', async (req, res) => {
    const actividades = (await db.query('SELECT a.*,u.nombre_completo AS responsable_nombre FROM catalogo_recursos a LEFT JOIN usuarios u ON u.id_usuario=a.id_responsable WHERE ($1::boolean OR a.id_responsable=$2 OR (a.id_responsable IS NULL AND a.id_autor=$2)) ORDER BY a.id_actividad', [supervisa(req.user), req.user.id])).rows;
    for (const actividad of actividades) actividad.niveles = (await db.query('SELECT id_nivel FROM clubes_niveles WHERE id_club=$1 ORDER BY id_nivel', [actividad.id_actividad])).rows.map((fila) => fila.id_nivel);
    const ids = actividades.map((item) => item.id_actividad);
    const ediciones = ids.length ? (await db.query('SELECT ' + SELECT_EDICION + DESDE_EDICION + 'WHERE e.id_actividad = ANY($1::int[]) ORDER BY e.id_edicion DESC', [ids])).rows : [];
    res.json({ actividades, ediciones, puede_crear: ROLES_CREAN_ACTIVIDADES.includes(req.user.id_rol), puede_crear_club: [3,7].includes(req.user.id_rol), puede_asignar: supervisa(req.user), puede_aprobar: aprueba(req.user) });
  });

  router.get('/gestion/encargados', async (req, res) => {
    if (!supervisa(req.user)) throw errorActividad('Solo Coordinación, Administración y Rectoría asignan encargados', 403);
    const buscar = textoActividad(req.query.buscar, 100, 'Nombre');
    res.json((await db.query("SELECT id_usuario, nombre_completo FROM usuarios WHERE deleted_at IS NULL AND nombre_completo ILIKE $1 AND ($2::boolean=FALSE OR id_rol IN (1,2)) ORDER BY nombre_completo LIMIT 50", ['%' + buscar + '%',req.query.tipo==='club'])).rows);
  });

  router.get('/gestion/traslados/clubes', async (req,res) => {
    if (![3,7].includes(req.user.id_rol)) throw errorActividad('Coordinación administra los traslados',403);
    res.json((await db.query("SELECT id_club,nombre_club FROM clubes WHERE tipo='club' ORDER BY nombre_club")).rows);
  });
  router.get('/gestion/traslados/:idClub/:idEdicion', async (req,res) => {
    if (![3,7].includes(req.user.id_rol)) throw errorActividad('Coordinación administra los traslados',403);
    res.json(await migrarLegadoActividades(db,{idClub:Number(req.params.idClub),idEdicion:Number(req.params.idEdicion)}));
  });
  router.post('/gestion/traslados/:idClub/:idEdicion', async (req,res) => {
    if (![3,7].includes(req.user.id_rol)) throw errorActividad('Coordinación administra los traslados',403);
    if(req.body.confirmar!==true) throw errorActividad('Revisa el resumen y confirma el traslado');
    res.json(await migrarLegadoActividades(db,{idClub:Number(req.params.idClub),idEdicion:Number(req.params.idEdicion),aplicar:true,idActor:req.user.id}));
  });
  router.get('/gestion/actividades/:idActividad/fotos', async (req,res) => {
    const recurso=await obtenerActividad(db,req.params.idActividad);
    comprobarGestion(req.user,recurso);
    if(recurso.tipo!=='club') throw errorActividad('Selecciona la edición de la actividad');
    res.json({recurso,fotos:(await db.query("SELECT * FROM actividades_fotos WHERE id_club=$1 AND id_edicion IS NULL AND estado<>'eliminada' ORDER BY creado_en DESC,id_foto DESC",[recurso.id_club])).rows});
  });

  router.post('/gestion/actividades', async (req, res) => {
    if (!ROLES_CREAN_ACTIVIDADES.includes(req.user.id_rol)) throw errorActividad('Solo Administración, Coordinación y Rectoría pueden crear actividades', 403);
    const datos = normalizarRecursoCatalogo(req.body);
    if (datos.tipo === 'club' && (![3,7].includes(req.user.id_rol) || !secretoAdmin || req.body.password !== secretoAdmin)) throw errorActividad('La creación de clubes requiere Coordinación y su contraseña de administración', 403);
    const resultado = await transaccion(async (cliente) => {
      const claves = Object.keys(datos).filter((clave) => clave !== 'niveles');
      const { rows } = await cliente.query('INSERT INTO catalogo_recursos (' + claves.join(',') + ',id_autor,id_responsable) VALUES (' + claves.map((_clave,indice) => '$' + (indice+1)).join(',') + ',$' + (claves.length+1) + ',$' + (claves.length+2) + ') RETURNING *', [...claves.map((clave) => datos[clave]),req.user.id,datos.tipo==='club' ? null : req.user.id]);
      if (datos.niveles) for (const nivel of datos.niveles) await cliente.query('INSERT INTO clubes_niveles(id_club,id_nivel) VALUES($1,$2)', [rows[0].id_actividad,nivel]);
      await auditar(cliente, req.user, 'actividad_creada', { id_actividad: rows[0].id_actividad });
      return rows[0];
    });
    res.status(201).json(resultado);
  });

  router.put('/gestion/actividades/:idActividad/responsable', async (req, res) => {
    if (!supervisa(req.user)) throw errorActividad('No tienes permiso para asignar encargados', 403);
    const id = Number(req.body.id_responsable);
    if (!Number.isSafeInteger(id) || id < 1) throw errorActividad('Selecciona un encargado');
    res.json(await transaccion(async (cliente) => {
      const recurso=await obtenerActividad(cliente, req.params.idActividad, true);
      if(recurso.tipo==='club' && ![3,7].includes(req.user.id_rol)) throw errorActividad('Coordinación y Administración asignan responsables de clubes',403);
      const usuario = await cliente.query('SELECT id_usuario,id_rol FROM usuarios WHERE id_usuario = $1 AND deleted_at IS NULL FOR UPDATE', [id]);
      if (!usuario.rows.length) throw errorActividad('Encargado no disponible');
      if(recurso.tipo==='club') {
        if(![1,2].includes(usuario.rows[0].id_rol)) throw errorActividad('Selecciona un alumno o responsable para el club');
        if(recurso.id_responsable && recurso.id_responsable!==id) throw errorActividad('Retira primero la responsabilidad anterior desde Usuarios',409);
        const otro=await cliente.query("SELECT id_club FROM clubes WHERE tipo='club' AND id_responsable_club=$1 AND id_club<>$2",[id,recurso.id_club]);
        if(otro.rows.length) throw errorActividad('Esta persona ya es responsable de otro club; revisa la reasignación en Usuarios',409);
        await cliente.query('UPDATE usuarios SET id_rol=2 WHERE id_usuario=$1',[id]);
      }
      const fila = await guardarColumnas(cliente, 'catalogo_recursos', 'id_actividad', req.params.idActividad, { id_responsable: id });
      await auditar(cliente, req.user, 'encargado_asignado', { id_actividad: fila.id_actividad, id_responsable: id });
      return fila;
    }));
  });

  router.post('/gestion/actividades/:idActividad/ediciones', async (req, res) => {
    res.status(201).json(await transaccion(async (cliente) => {
      const actividad = await obtenerActividad(cliente, req.params.idActividad, true);
      comprobarGestion(req.user, actividad);
      if (actividad.tipo !== 'actividad') throw errorActividad('Los clubes usan sus convocatorias y horarios; las ediciones corresponden a actividades');
      const datos = normalizarEdicionActividad(req.body, actividad.plantilla);
      let opciones=[];
      if(req.body.catalogo_aportaciones!==undefined) {
        if(!Array.isArray(req.body.catalogo_aportaciones) || req.body.catalogo_aportaciones.length>50) throw errorActividad('Configura hasta 50 opciones de aportación');
        opciones=req.body.catalogo_aportaciones.map(normalizarOpcionAportacion);
        if(datos.requiere_aportacion && !opciones.length) throw errorActividad('Agrega al menos una aportación para esta edición');
        if(!datos.requiere_aportacion && opciones.length) throw errorActividad('Habilita las aportaciones antes de configurar sus opciones');
      }
      const claves = Object.keys(datos);
      const valores = claves.map((clave) => clave === 'campos_registro' ? JSON.stringify(datos[clave]) : datos[clave]);
      const { rows } = await cliente.query('INSERT INTO actividades_ediciones (id_actividad,' + claves.join(',') + ') VALUES ($1,' + claves.map((_clave, indice) => '$' + (indice + 2)).join(',') + ') RETURNING *', [actividad.id_actividad, ...valores]);
      for(const opcion of opciones) await cliente.query('INSERT INTO actividades_aportes_catalogo(id_edicion,nombre,unidad,descripcion,cantidad_minima) VALUES($1,$2,$3,$4,$5)',[rows[0].id_edicion,opcion.nombre,opcion.unidad,opcion.descripcion,opcion.cantidad_minima]);
      await auditar(cliente, req.user, 'edicion_creada', { id_edicion: rows[0].id_edicion });
      return rows[0];
    }));
  });

  for (const [tipo, [tabla, campoId]] of Object.entries(TABLAS)) {
    const parametro = tipo === 'actividad' ? 'idActividad' : 'idEdicion';
    const ruta = '/gestion/' + (tipo === 'actividad' ? 'actividades' : 'ediciones') + '/:' + parametro;
    const obtener = tipo === 'actividad' ? obtenerActividad : obtenerEdicion;
    const normalizar = (datos, entidad) => tipo === 'actividad' ? normalizarRecursoCatalogo(datos) : normalizarEdicionActividad(datos, entidad.plantilla);

    router.put(ruta, async (req, res) => {
      res.json(await transaccion(async (cliente) => {
        const entidad = await obtener(cliente, req.params[parametro], true);
        comprobarGestion(req.user, entidad);
        if (tipo === 'actividad' && req.body.tipo && req.body.tipo !== entidad.tipo) throw errorActividad('El tipo se elige al crear. Para registros existentes utiliza el traslado revisado', 409);
        if (entidad.estado === 'archivada') throw errorActividad('Esta actividad está archivada', 409);
        if (entidad.estado === 'pendiente' || entidad.estado_propuesta === 'pendiente') throw errorActividad('Retira la propuesta de revisión antes de editarla', 409);
        const datos = normalizar({ ...entidad, ...entidad.propuesta, ...req.body }, entidad);
        if (tipo === 'actividad' && entidad.plantilla !== 'general' && datos.slug !== entidad.slug) throw errorActividad('La dirección de esta actividad institucional se conserva');
        let resultado;
        if (entidad.estado === 'publicada') {
          resultado = (await cliente.query('UPDATE ' + tabla + " SET propuesta = $1, estado_propuesta = 'borrador', motivo_rechazo = NULL, actualizado_en = NOW() WHERE " + campoId + ' = $2 RETURNING *', [JSON.stringify(datos), entidad[campoId]])).rows[0];
        } else resultado = await guardarColumnas(cliente, tabla, campoId, entidad[campoId], { ...datos, estado: 'borrador', motivo_rechazo: null });
        await auditar(cliente, req.user, tipo + '_editada', { [campoId]: entidad[campoId] });
        return resultado;
      }));
    });

    router.post(ruta + '/revision', async (req, res) => {
      res.json(await transaccion(async (cliente) => {
        const entidad = await obtener(cliente, req.params[parametro], true);
        comprobarGestion(req.user, entidad);
        if (entidad.estado === 'archivada') throw errorActividad('Esta actividad está archivada', 409);
        if (req.body.retirar === true) {
          const columna = entidad.propuesta ? 'estado_propuesta' : 'estado';
          if (entidad[columna] !== 'pendiente') throw errorActividad('No hay una propuesta pendiente', 409);
          await auditar(cliente, req.user, tipo + '_retirada_revision', { [campoId]: entidad[campoId] });
          return (await cliente.query('UPDATE ' + tabla + ' SET ' + columna + " = 'borrador', actualizado_en = NOW() WHERE " + campoId + ' = $1 RETURNING *', [entidad[campoId]])).rows[0];
        }
        if (entidad.estado === 'publicada' && !entidad.propuesta) throw errorActividad('No hay cambios para enviar a revisión', 409);
        const datos = normalizar({ ...entidad, ...entidad.propuesta }, entidad);
        if (tipo === 'edicion') validarPublicacionEdicion(datos, await catalogoEdicion(cliente, entidad.id_edicion));
        const columna = entidad.propuesta ? 'estado_propuesta' : 'estado';
        const resultado = (await cliente.query('UPDATE ' + tabla + ' SET ' + columna + " = 'pendiente', motivo_rechazo = NULL, actualizado_en = NOW() WHERE " + campoId + ' = $1 RETURNING *', [entidad[campoId]])).rows[0];
        await auditar(cliente, req.user, tipo + '_enviada_revision', { [campoId]: entidad[campoId] });
        return resultado;
      }));
    });

    router.post(ruta + '/decision', async (req, res) => {
      if (!aprueba(req.user)) throw errorActividad('Rectoría autoriza la publicación', 403);
      if (typeof req.body.aprobar !== 'boolean') throw errorActividad('Indica la decisión');
      const motivo = textoActividad(req.body.motivo, 1000, 'Observaciones', !req.body.aprobar);
      res.json(await transaccion(async (cliente) => {
        const entidad = await obtener(cliente, req.params[parametro], true);
        const columna = entidad.propuesta ? 'estado_propuesta' : 'estado';
        if (entidad[columna] !== 'pendiente') throw errorActividad('La propuesta ya no está pendiente', 409);
        let resultado;
        if (req.body.aprobar) {
          const datos = normalizar({ ...entidad, ...entidad.propuesta }, entidad);
          if (tipo === 'edicion') {
            if (entidad.estado_actividad !== 'publicada') throw errorActividad('Publica primero la actividad');
            validarPublicacionEdicion(datos, await catalogoEdicion(cliente, entidad.id_edicion));
          }
          resultado = await guardarColumnas(cliente, tabla, campoId, entidad[campoId], { ...datos, estado: 'publicada', propuesta: null, estado_propuesta: null, motivo_rechazo: null });
        } else resultado = (await cliente.query('UPDATE ' + tabla + ' SET ' + columna + " = 'rechazada', motivo_rechazo = $1, actualizado_en = NOW() WHERE " + campoId + ' = $2 RETURNING *', [motivo, entidad[campoId]])).rows[0];
        await auditar(cliente, req.user, tipo + (req.body.aprobar ? '_publicada' : '_rechazada'), { [campoId]: entidad[campoId], motivo });
        return resultado;
      }));
    });

    router.post(ruta + '/archivo', async (req, res) => {
      if (!aprueba(req.user)) throw errorActividad('Rectoría administra las publicaciones archivadas', 403);
      if (typeof req.body.archivar !== 'boolean') throw errorActividad('Indica si se archivará la publicación');
      res.json(await transaccion(async (cliente) => {
        const entidad = await obtener(cliente, req.params[parametro], true);
        if (!req.body.archivar && entidad.estado !== 'archivada') throw errorActividad('La publicación no está archivada', 409);
        const resultado = await guardarColumnas(cliente, tabla, campoId, entidad[campoId], { estado: req.body.archivar ? 'archivada' : 'borrador', propuesta: null, estado_propuesta: null });
        await auditar(cliente, req.user, tipo + (req.body.archivar ? '_archivada' : '_restaurada'), { [campoId]: entidad[campoId] });
        return resultado;
      }));
    });
  }

  router.get('/gestion/ediciones/:idEdicion', async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarGestion(req.user, edicion);
    const registros = (await db.query('SELECT * FROM actividades_registros WHERE id_edicion = $1 ORDER BY nombre_completo, id_registro', [edicion.id_edicion])).rows;
    const aportes = (await db.query('SELECT p.* FROM actividades_aportaciones p JOIN actividades_registros r ON r.id_registro = p.id_registro WHERE r.id_edicion = $1 ORDER BY p.id_aportacion', [edicion.id_edicion])).rows;
    const fotos = (await db.query("SELECT * FROM actividades_fotos WHERE id_edicion = $1 AND estado <> 'eliminada' ORDER BY id_foto DESC", [edicion.id_edicion])).rows;
    res.json({ edicion, catalogo: await catalogoEdicion(db, edicion.id_edicion), registros: registros.map((registro) => ({ ...registro, aportaciones: aportes.filter((aporte) => aporte.id_registro === registro.id_registro) })), fotos });
  });

  router.put('/gestion/ediciones/:idEdicion/inscripciones', async (req, res) => {
    if (typeof req.body.abiertas !== 'boolean') throw errorActividad('Indica si las inscripciones están abiertas');
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion);
      const resultado = await guardarColumnas(cliente, 'actividades_ediciones', 'id_edicion', edicion.id_edicion, { inscripciones_habilitadas: req.body.abiertas });
      await auditar(cliente, req.user, 'inscripciones_actualizadas', { id_edicion: edicion.id_edicion, abiertas: req.body.abiertas });
      return resultado;
    }));
  });

  router.post('/gestion/ediciones/:idEdicion/catalogo', async (req, res) => {
    res.status(201).json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion);
      if (edicion.estado === 'publicada' && !aprueba(req.user)) throw errorActividad('Rectoría debe actualizar el catálogo publicado', 403);
      if (edicion.estado === 'pendiente' || edicion.estado_propuesta === 'pendiente') throw errorActividad('Retira la edición de revisión antes de cambiar su catálogo', 409);
      const {nombre,unidad,descripcion,cantidad_minima:minimo}=normalizarOpcionAportacion(req.body);
      const { rows } = await cliente.query('INSERT INTO actividades_aportes_catalogo (id_edicion,nombre,descripcion,unidad,cantidad_minima) VALUES ($1,$2,$3,$4,$5) RETURNING *', [edicion.id_edicion, nombre, descripcion, unidad, minimo]);
      await auditar(cliente, req.user, 'opcion_aportacion_creada', { id_opcion: rows[0].id_opcion });
      return rows[0];
    }));
  });

  router.put('/gestion/catalogo/:idOpcion', async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const opcion = (await cliente.query('SELECT * FROM actividades_aportes_catalogo WHERE id_opcion = $1', [req.params.idOpcion])).rows[0];
      if (!opcion) throw errorActividad('Aportación no encontrada', 404);
      const edicion = await obtenerEdicion(cliente, opcion.id_edicion, true);
      comprobarGestion(req.user, edicion);
      if (edicion.estado === 'publicada' && !aprueba(req.user)) throw errorActividad('Rectoría debe actualizar el catálogo publicado', 403);
      if (edicion.estado === 'pendiente' || edicion.estado_propuesta === 'pendiente') throw errorActividad('Retira la edición de revisión antes de cambiar su catálogo', 409);
      const datos = { ...opcion, ...req.body };
      if (typeof datos.activa !== 'boolean') throw errorActividad('Indica la disponibilidad de la aportación');
      const nombre = textoActividad(datos.nombre, 160, 'Nombre de la aportación', true);
      const unidad = textoActividad(datos.unidad, 60, 'Unidad', true);
      const descripcion = textoActividad(datos.descripcion, 1000, 'Descripción');
      const minimo = Number(datos.cantidad_minima);
      if (!Number.isFinite(minimo) || minimo <= 0 || minimo > 1000000 || Math.abs(minimo * 1000 - Math.round(minimo * 1000)) > 0.00001) throw errorActividad('Indica una cantidad mínima válida');
      const catalogo = await catalogoEdicion(cliente, edicion.id_edicion);
      if (!datos.activa && edicion.estado === 'publicada' && edicion.requiere_aportacion && !catalogo.some((item) => item.id_opcion !== opcion.id_opcion && item.activa)) throw errorActividad('Conserva al menos una aportación disponible');
      const resultado = (await cliente.query('UPDATE actividades_aportes_catalogo SET activa = $1, nombre = $2, unidad = $3, descripcion = $4, cantidad_minima = $5 WHERE id_opcion = $6 RETURNING *', [datos.activa, nombre, unidad, descripcion, minimo, opcion.id_opcion])).rows[0];
      await auditar(cliente, req.user, 'catalogo_actualizado', { id_opcion: opcion.id_opcion });
      return resultado;
    }));
  });

  router.post('/gestion/aportaciones/:idAporte/recibir', async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const referencia = (await cliente.query('SELECT r.id_edicion FROM actividades_aportaciones p JOIN actividades_registros r ON r.id_registro = p.id_registro WHERE p.id_aportacion = $1', [req.params.idAporte])).rows[0];
      if (!referencia) throw errorActividad('Aportación no encontrada', 404);
      const edicion = await obtenerEdicion(cliente, referencia.id_edicion, true);
      comprobarGestion(req.user, edicion);
      const aporte = (await cliente.query('SELECT p.*, r.estado AS estado_registro FROM actividades_aportaciones p JOIN actividades_registros r ON r.id_registro = p.id_registro WHERE p.id_aportacion = $1 FOR UPDATE OF r, p', [req.params.idAporte])).rows[0];
      if (aporte.estado === 'cancelada' || aporte.estado_registro !== 'confirmado') throw errorActividad('El compromiso ya no está activo', 409);
      const resultado = (await cliente.query("UPDATE actividades_aportaciones SET estado = 'recibida', recibida_por = COALESCE(recibida_por,$1), recibida_en = COALESCE(recibida_en,NOW()) WHERE id_aportacion = $2 AND estado <> 'cancelada' RETURNING *", [req.user.id, aporte.id_aportacion])).rows[0];
      await auditar(cliente, req.user, 'aportacion_recibida', { id_aportacion: aporte.id_aportacion });
      return resultado;
    }));
  });

  if (subirImagen) {
    const autorizarPortada = async (req, _res, next) => {
      try {
        const actividad = await obtenerActividad(db, req.params.idActividad);
        comprobarGestion(req.user, actividad);
        if(actividad.estado==='archivada') throw errorActividad('Esta publicación está archivada',409);
        if (actividad.estado === 'pendiente' || actividad.estado_propuesta === 'pendiente') throw errorActividad('Retira la propuesta de revisión antes de cambiar la imagen', 409);
        req.fotosActividadEnProceso=true;
        next();
      } catch (error) { next(error); }
    };
    router.post('/gestion/actividades/:idActividad/imagen', autorizarPortada, limitarSubida, subirImagen.single('imagen'), async (req, res) => {
      if (!req.file) throw errorActividad('Selecciona una imagen JPG, PNG, GIF o WebP de hasta 5 MB');
      const resultado=await transaccion(async (cliente) => {
        const actividad = await obtenerActividad(cliente, req.params.idActividad, true);
        comprobarGestion(req.user, actividad);
        if(actividad.estado==='archivada') throw errorActividad('Esta publicación está archivada',409);
        if (actividad.estado === 'pendiente' || actividad.estado_propuesta === 'pendiente') throw errorActividad('La propuesta está en revisión', 409);
        let resultado;
        if (actividad.estado === 'publicada') {
          const propuesta = normalizarRecursoCatalogo({ ...actividad, ...actividad.propuesta, url_imagen: req.file.path });
          resultado = (await cliente.query("UPDATE catalogo_recursos SET propuesta=$1,estado_propuesta='borrador',actualizado_en=NOW() WHERE id_actividad=$2 RETURNING *", [JSON.stringify(propuesta), actividad.id_actividad])).rows[0];
        } else resultado = await guardarColumnas(cliente, 'catalogo_recursos', 'id_actividad', actividad.id_actividad, { url_imagen: req.file.path });
        await auditar(cliente, req.user, 'portada_actualizada', { id_actividad: actividad.id_actividad });
        return resultado;
      });
      req.fotosActividadGuardadas=true;
      res.json(resultado);
    });
    const contextoFotos = async (cliente,req,bloquear=false) => {
      const recurso=req.params.idEdicion ? await obtenerEdicion(cliente,req.params.idEdicion,bloquear) : await obtenerActividad(cliente,req.params.idActividad,bloquear);
      comprobarGestion(req.user,recurso);
      if(!req.params.idEdicion && recurso.tipo!=='club') throw errorActividad('Selecciona la edición para compartir las fotos');
      return recurso;
    };
    const autorizarSubida = async (req, _res, next) => {
      try {
        await contextoFotos(db,req);
        req.fotosActividadEnProceso = true;
        next();
      } catch (error) { next(error); }
    };
    const guardarFotos = async (req, res) => {
      if (req.files != null && !Array.isArray(req.files)) throw errorActividad('La carga de imágenes no es válida');
      const archivos = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      if (!archivos.length || archivos.length > 10) throw errorActividad('Selecciona de 1 a 10 imágenes JPG, PNG, GIF o WebP de hasta 5 MB cada una');
      const pie = textoActividad(req.body.pie, 300, 'Descripción de las fotos');
      const fotos = await transaccion(async (cliente) => {
        const recurso=await contextoFotos(cliente,req,true);
        const resultado=await guardarPublicacionFotos(cliente,{idRecurso:recurso.id_actividad,idEdicion:recurso.id_edicion || null,pie,idAutor:req.user.id,publicada:aprueba(req.user),archivos});
        await auditar(cliente, req.user, 'fotos_agregadas', { id_club:recurso.id_actividad,id_edicion:recurso.id_edicion || null,ids_fotos: resultado.map((foto) => foto.id_foto) });
        return resultado;
      });
      req.fotosActividadGuardadas = true;
      res.status(201).json(req.file ? fotos[0] : fotos);
    };
    router.post('/gestion/ediciones/:idEdicion/fotos', autorizarSubida, limitarSubida, subirImagen.single('imagen'), guardarFotos);
    router.post('/gestion/ediciones/:idEdicion/fotos/lote', autorizarSubida, limitarSubida, subirImagen.array('imagenes', 10), guardarFotos);
    router.post('/gestion/actividades/:idActividad/fotos/lote', autorizarSubida, limitarSubida, subirImagen.array('imagenes',10), guardarFotos);
  }

  router.put('/gestion/fotos/:idFoto', async (req, res) => {
    if (!['publicada', 'rechazada', 'eliminada'].includes(req.body.estado)) throw errorActividad('Estado de fotografía no válido');
    res.json(await transaccion(async (cliente) => {
      let foto = (await cliente.query('SELECT * FROM actividades_fotos WHERE id_foto = $1', [req.params.idFoto])).rows[0];
      if (!foto) throw errorActividad('Fotografía no encontrada', 404);
      comprobarGestion(req.user, await obtenerActividad(cliente,foto.id_club,true));
      foto=(await cliente.query('SELECT * FROM actividades_fotos WHERE id_foto=$1',[foto.id_foto])).rows[0];
      if (foto.estado === 'eliminada') throw errorActividad('La fotografía ya fue retirada', 409);
      if (req.body.estado !== 'eliminada' && !aprueba(req.user)) throw errorActividad('Rectoría revisa las fotografías', 403);
      await cliente.query('UPDATE publicaciones_imagenes SET estado=$1 WHERE id_foto=$2',[req.body.estado,foto.id_foto]);
      const resultado=(await cliente.query('SELECT * FROM actividades_fotos WHERE id_foto=$1',[foto.id_foto])).rows[0];
      await auditar(cliente, req.user, 'foto_' + req.body.estado, { id_foto: foto.id_foto });
      return resultado;
    }));
  });

  router.get('/mis-registros', autenticar, async (req, res) => {
    const registros = (await db.query(`SELECT r.*,e.nombre AS edicion_nombre,e.fecha_inicio::text,e.fecha_fin::text,
      e.requiere_registro,e.estado AS estado_edicion,a.estado AS estado_actividad,
      a.nombre AS actividad_nombre,a.slug AS actividad_slug,a.url_imagen,
      CASE WHEN asistencia.id_registro IS NULL THEN NULL ELSE json_build_object(
        'estado',asistencia.estado,'registrada_en',asistencia.registrada_en,'origen',asistencia.origen) END AS asistencia
      FROM actividades_registros r JOIN actividades_ediciones e ON e.id_edicion=r.id_edicion
      JOIN catalogo_recursos a ON a.id_actividad=e.id_actividad
      LEFT JOIN actividades_asistencias asistencia ON asistencia.id_registro=r.id_registro
      WHERE r.id_usuario=$1 ORDER BY e.fecha_inicio DESC NULLS LAST,r.id_registro DESC`,[req.user.id])).rows;
    for (const registro of registros) {
      registro.aportaciones = await aportesRegistro(db, registro.id_registro);
      registro.asistencia = asistenciaPropia(registro.asistencia);
      registro.disponibilidad_asistencia = disponibilidadAsistenciaActividad({ ...registro, estado: registro.estado_edicion }, hoy());
    }
    res.json(registros);
  });

  router.get('/ediciones/:idEdicion/mi-registro', autenticar, async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarPublica(edicion);
    const registro = (await db.query('SELECT * FROM actividades_registros WHERE id_edicion = $1 AND id_usuario = $2', [edicion.id_edicion, req.user.id])).rows[0] || null;
    if (registro) registro.aportaciones = await aportesRegistro(db, registro.id_registro);
    const reaccion = (await db.query('SELECT reaccion FROM reacciones_catalogo WHERE id_edicion = $1 AND id_usuario = $2', [edicion.id_edicion, req.user.id])).rows[0]?.reaccion || null;
    res.json({ registro, reaccion, asistencia: await consultarAsistencia(db, registro?.id_registro),
      disponibilidad_asistencia: disponibilidadAsistenciaActividad(edicion, hoy()) });
  });

  router.put('/ediciones/:idEdicion/registro', autenticar, limitarEscritura, async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarPublica(edicion);
      if (estadoRegistroActividad(edicion, hoy()) !== 'abierta') throw errorActividad('Las inscripciones no están abiertas', 409);
      const usuario = (await cliente.query('SELECT nombre_completo, institutional_id FROM usuarios WHERE id_usuario = $1 AND deleted_at IS NULL', [req.user.id])).rows[0];
      if (!usuario) throw errorActividad('La sesión ya no está disponible', 401);
      const nombre = textoActividad(usuario.nombre_completo, 150, 'Nombre completo', true);
      const matricula = textoActividad(usuario.institutional_id || req.body.matricula, 50, 'Matrícula', true);
      if (!/^\d{1,30}$/.test(matricula)) throw errorActividad('La matrícula debe contener números');
      const anterior = (await cliente.query('SELECT * FROM actividades_registros WHERE id_edicion = $1 AND id_usuario = $2 FOR UPDATE', [edicion.id_edicion, req.user.id])).rows[0];
      const campos = anterior?.estado === 'confirmado' ? anterior.formulario_snapshot : edicion.campos_registro;
      const respuestas = validarRespuestasActividad(campos, req.body.respuestas || {});
      for (const campo of campos.filter((item) => item.tipo === 'licenciatura' && respuestas[item.clave])) {
        const existe = await cliente.query('SELECT id_licenciatura FROM cat_licenciaturas WHERE id_licenciatura = $1', [respuestas[campo.clave]]);
        if (!existe.rows.length) throw errorActividad('La licenciatura seleccionada no está disponible');
      }
      const previos = anterior ? await aportesRegistro(cliente, anterior.id_registro) : [];
      const aportes = validarAportacionesActividad(req.body.aportaciones || [], await catalogoEdicion(cliente, edicion.id_edicion), edicion.requiere_aportacion, previos);
      if (previos.some((aporte) => aporte.estado === 'recibida' && !aportes.some((nuevo) => nuevo.id_opcion === aporte.id_opcion))) throw errorActividad('Conserva las aportaciones que ya fueron recibidas');
      const { rows } = await cliente.query("INSERT INTO actividades_registros (id_edicion,id_usuario,nombre_completo,matricula,respuestas,formulario_snapshot) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id_edicion,id_usuario) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, matricula = EXCLUDED.matricula, respuestas = EXCLUDED.respuestas, formulario_snapshot = EXCLUDED.formulario_snapshot, estado = 'confirmado', actualizado_en = NOW() RETURNING *", [edicion.id_edicion, req.user.id, nombre, matricula, JSON.stringify(respuestas), JSON.stringify(campos)]);
      const registro = rows[0];
      await cliente.query("UPDATE actividades_aportaciones SET estado = 'cancelada' WHERE id_registro = $1 AND estado = 'comprometida' AND NOT (id_opcion = ANY($2::int[]))", [registro.id_registro, aportes.map((item) => item.id_opcion)]);
      for (const aporte of aportes) await cliente.query("INSERT INTO actividades_aportaciones (id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id_registro,id_opcion) DO UPDATE SET nombre = EXCLUDED.nombre, unidad = EXCLUDED.unidad, cantidad = EXCLUDED.cantidad, cantidad_minima = EXCLUDED.cantidad_minima, estado = 'comprometida' WHERE actividades_aportaciones.estado <> 'recibida'", [registro.id_registro, aporte.id_opcion, aporte.nombre, aporte.unidad, aporte.cantidad, aporte.cantidad_minima]);
      await auditar(cliente, req.user, 'registro_confirmado', { id_registro: registro.id_registro });
      return { ...registro, aportaciones: await aportesRegistro(cliente, registro.id_registro) };
    }));
  });

  router.delete('/ediciones/:idEdicion/registro', autenticar, limitarEscritura, async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      const registro = (await cliente.query('SELECT * FROM actividades_registros WHERE id_edicion = $1 AND id_usuario = $2 FOR UPDATE', [edicion.id_edicion, req.user.id])).rows[0];
      if (!registro) throw errorActividad('Registro no encontrado', 404);
      if (registro.estado === 'cancelado') return registro;
      comprobarPublica(edicion);
      if (estadoRegistroActividad(edicion, hoy()) !== 'abierta') throw errorActividad('El periodo para cancelar ya terminó', 409);
      await cliente.query("UPDATE actividades_aportaciones SET estado = 'cancelada' WHERE id_registro = $1 AND estado = 'comprometida'", [registro.id_registro]);
      const { rows } = await cliente.query("UPDATE actividades_registros SET estado = 'cancelado', actualizado_en = NOW() WHERE id_registro = $1 RETURNING *", [registro.id_registro]);
      await auditar(cliente, req.user, 'registro_cancelado', { id_registro: registro.id_registro });
      return rows[0];
    }));
  });

  router.put('/ediciones/:idEdicion/reaccion', autenticar, limitarEscritura, async (req, res) => {
    if (req.body.reaccion != null && !REACCIONES_ACTIVIDAD.includes(req.body.reaccion)) throw errorActividad('Reacción no válida');
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarPublica(edicion);
      if (req.body.reaccion) await cliente.query('INSERT INTO reacciones_catalogo (id_club,id_edicion,id_usuario,reaccion) VALUES ($1,$2,$3,$4) ON CONFLICT (id_edicion,id_usuario) WHERE id_edicion IS NOT NULL DO UPDATE SET reaccion = EXCLUDED.reaccion', [edicion.id_actividad, edicion.id_edicion, req.user.id, req.body.reaccion]);
      else await cliente.query('DELETE FROM reacciones_catalogo WHERE id_edicion = $1 AND id_usuario = $2', [edicion.id_edicion, req.user.id]);
      return { reaccion: req.body.reaccion || null, totales: (await cliente.query('SELECT reaccion, COUNT(*)::int AS total FROM reacciones_catalogo WHERE id_edicion = $1 GROUP BY reaccion', [edicion.id_edicion])).rows };
    }));
  });

  montarAsistenciaActividades(router, {
    db, autenticar, limitarEscritura, hoy, obtenerEdicion, comprobarGestion, transaccion, auditar,
  });

  router.use(async (error, req, res, _next) => {
    if (req.fotosActividadEnProceso && !req.fotosActividadGuardadas) {
      try { await limpiarImagenes(Array.isArray(req.files) ? req.files : (req.file ? [req.file] : [])); }
      catch { console.error('[actividades] No se pudieron limpiar las imágenes de una carga incompleta'); }
    }
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'Este registro o dirección ya existe' });
    if (error.code === '23514' || error.code === '23503') return res.status(400).json({error:'La operación no corresponde al tipo de registro o a sus relaciones actuales'});
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen debe pesar hasta 5 MB' });
    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Selecciona hasta 10 imágenes por publicación' });
    if (error.code === '42P01') return res.status(503).json({ error: 'El apartado de actividades aún no está disponible' });
    console.error('[actividades] Error interno:', error.code || error.name);
    res.status(500).json({ error: 'No se pudo completar la operación de actividades' });
  });
  return router;
}
