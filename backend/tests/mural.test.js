import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

process.env.JWT_SECRET = 'mural-solo-pruebas';
const camposEditables = ['titulo', 'subtitulo', 'contenido', 'url_imagen', 'enlace_url', 'enlace_texto', 'destacada', 'fecha_retiro'];
const camposFila = [...camposEditables, 'publicada', 'status', 'motivo_rechazo', 'id_revisor', 'fecha_revision', 'enviado_revision_at', 'id_autor'];
let registros = [];
let configuracion = { url_publica: null };
let id = 0;
let consultas = [];
let rolActual = 3;
let usuarioActual = 7;
let fallarAprobar = false;
let fallarDevolver = false;
pool.query = async (sql, valores = []) => {
  if (sql.includes('FROM usuarios u') && sql.includes('deleted_at')) {
    return { rows: [{ id_usuario: valores[0], nombre_completo: 'Editor de prueba', id_rol: rolActual }] };
  }
  consultas.push({ sql, valores });
  if (sql.includes('historial_admin')) return { rows: [] };
  if (sql.includes('configuracion_mural')) {
    if (sql.startsWith('INSERT')) configuracion = { url_publica: valores[0] };
    return { rows: [configuracion] };
  }
  assert.match(sql, /publicaciones_mural/);
  assert.doesNotMatch(sql, /\bnoticias\b|fechas_calendario|notificaciones/);
  if (sql.startsWith('INSERT')) {
    const valoresPorCampo = {};
    camposEditables.forEach((campo, i) => { valoresPorCampo[campo] = valores[i]; });
    const idAutor = valores[camposEditables.length];
    const fila = {
      id_publicacion: ++id,
      ...valoresPorCampo,
      publicada: false,
      status: 'draft',
      motivo_rechazo: null,
      id_revisor: null,
      fecha_revision: null,
      enviado_revision_at: null,
      id_autor: idAutor,
    };
    registros.push(fila); return { rows: [{ ...fila }] };
  }
  if (sql.startsWith('UPDATE')) {
    let idPublicacion;
    // PUT /:id tiene el id al final y usa motivo_rechazo = CASE WHEN; los endpoints de revisión no.
    const esPutEdicion = sql.includes('motivo_rechazo = CASE WHEN');
    if (esPutEdicion) idPublicacion = Number(valores[valores.length - 1]);
    else idPublicacion = Number(valores[0]);
    const fila = registros.find((item) => item.id_publicacion === idPublicacion);
    if (!fila) return { rows: [] };

    // PUT /:id edita contenido y puede cambiar el estado a pending si era published.
    if (esPutEdicion) {
      camposEditables.forEach((campo, i) => { if (valores[i] !== undefined) fila[campo] = valores[i]; });
      if (valores[camposEditables.length] !== undefined) fila.status = valores[camposEditables.length];
      if (valores[camposEditables.length + 1]) fila.motivo_rechazo = null;
    }
    // POST /:id/enviar-aprobacion
    else if (sql.includes("SET status = 'pending'")) {
      fila.status = 'pending';
      fila.enviado_revision_at = new Date().toISOString();
      fila.motivo_rechazo = null;
    }
    // POST /:id/aprobar
    else if (sql.includes("SET status = 'published'")) {
      if (fallarAprobar) throw new Error('Error simulado al aprobar');
      if (fila.status !== 'pending') return { rows: [] };
      fila.status = 'published';
      fila.publicada = true;
      fila.id_revisor = valores[1];
      fila.fecha_revision = new Date().toISOString();
      fila.motivo_rechazo = null;
    }
    // POST /:id/devolver
    else if (sql.includes("SET status = 'rejected'")) {
      if (fallarDevolver) throw new Error('Error simulado al devolver');
      if (fila.status !== 'pending') return { rows: [] };
      fila.status = 'rejected';
      fila.id_revisor = valores[1];
      fila.fecha_revision = new Date().toISOString();
      fila.motivo_rechazo = valores[2];
    }
    fila.publicada = fila.status === 'published';
    return { rows: [{ ...fila }] };
  }
  if (sql.startsWith('DELETE')) {
    const fila = registros.find((item) => item.id_publicacion === Number(valores[0]));
    registros = registros.filter((item) => item.id_publicacion !== Number(valores[0]));
    return { rows: fila ? [{ ...fila }] : [] };
  }
  if (valores.length && sql.includes('WHERE id_publicacion =')) {
    return { rows: registros.filter((item) => item.id_publicacion === Number(valores[0])).map((item) => ({ ...item })) };
  }
  if (sql.includes('WHERE status = \'published\'')) {
    assert.match(sql, /fecha_retiro IS NULL OR fecha_retiro >=/);
    assert.match(sql, /America\/Mexico_City/);
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return { rows: registros.filter((item) => item.status === 'published' && item.publicada && (!item.fecha_retiro || item.fecha_retiro >= hoy)).map((item) => ({ ...item })) };
  }
  if (sql.includes('WHERE id_autor =')) {
    return { rows: registros.filter((item) => item.id_autor === valores[0]).map((item) => ({ ...item })) };
  }
  if (sql.includes("WHERE status = 'pending'")) {
    return { rows: registros.filter((item) => item.status === 'pending').map((item) => ({ ...item })) };
  }
  return { rows: registros.map((item) => ({ ...item })) };
};
const { default: router } = await import('../routes/mural.js');
const app = express(); app.use(express.json()); app.use('/mural', router);
const servidor = app.listen(0, '127.0.0.1');
await new Promise((resolve) => servidor.once('listening', resolve));
after(async () => { await new Promise((resolve) => servidor.close(resolve)); await pool.end(); });
const base = `http://127.0.0.1:${servidor.address().port}/mural`;
async function enviar(metodo, datos, rol = 3, ruta = '', usuario = 7) {
  consultas = [];
  rolActual = rol ?? 3;
  usuarioActual = usuario;
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: usuario, id_rol: rol, nombre_completo: 'Editor de prueba' }, process.env.JWT_SECRET)}`;
  const res = await fetch(`${base}${ruta}`, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
  return { status: res.status, datos: await res.json() };
}
const datos = { titulo: ' Convocatoria cultural ', contenido: 'Participa en las actividades del campus.', enlace_url: 'https://example.org/registro', enlace_texto: 'Inscribirme' };

test('la consulta pública y el QR no requieren sesión; solo el responsable del mural crea contenido', async () => {
  for (const ruta of ['', '/config']) assert.equal((await enviar('GET', null, null, ruta)).status, 200);
  for (const rol of [null, 1, 2, 5, 7]) {
    for (const [metodo, ruta] of [['GET', '/admin'], ['POST', ''], ['PUT', '/1'], ['DELETE', '/1'], ['PUT', '/config']]) {
      assert.equal((await enviar(metodo, metodo === 'GET' ? null : datos, rol, ruta)).status, rol ? 403 : 401);
      assert.equal(consultas.length, 0);
    }
  }
  // Coordinación y rectoría no pueden crear publicaciones del mural.
  assert.equal((await enviar('POST', datos, 3)).status, 403);
  assert.equal((await enviar('POST', datos, 4)).status, 403);
  // El responsable sí puede crear y nace en borrador.
  const creada = await enviar('POST', datos, 6, '', 9);
  assert.equal(creada.status, 201);
  assert.equal(creada.datos.status, 'draft');
  assert.equal(creada.datos.publicada, false);
});

test('el responsable edita sus borradores, los envía a aprobación y Coordinación aprueba o devuelve', async () => {
  const creada = (await enviar('POST', datos, 6, '', 9)).datos;
  const ruta = `/${creada.id_publicacion}`;

  // Coordinación no edita contenido.
  assert.equal((await enviar('PUT', { titulo: 'Cambio no permitido' }, 3, ruta)).status, 403);
  // Otro responsable no edita la publicación ajena.
  assert.equal((await enviar('PUT', { titulo: 'Cambio no permitido' }, 6, ruta, 99)).status, 403);

  const editada = await enviar('PUT', { titulo: 'Cartel actualizado', url_imagen: 'https://example.org/cartel.png', destacada: true }, 6, ruta, 9);
  assert.equal(editada.status, 200);
  assert.equal(editada.datos.titulo, 'Cartel actualizado');
  assert.equal(editada.datos.status, 'draft');
  // Verifica que status, limpiarRechazo e id vayan en las posiciones correctas.
  const queryEditar = consultas.find((item) => item.sql.startsWith('UPDATE') && item.sql.includes('motivo_rechazo = CASE WHEN'));
  assert.equal(queryEditar.valores[camposEditables.length], 'draft');
  assert.equal(queryEditar.valores[camposEditables.length + 1], true);
  assert.equal(queryEditar.valores[camposEditables.length + 2], String(creada.id_publicacion));

  const envio = await enviar('POST', null, 6, `${ruta}/enviar-aprobacion`, 9);
  assert.equal(envio.status, 200);
  assert.equal(envio.datos.status, 'pending');

  // El responsable no puede editar una pendiente.
  assert.equal((await enviar('PUT', { titulo: 'Cambio durante revisión' }, 6, ruta, 9)).status, 409);

  // Coordinación devuelve con observaciones.
  const devuelta = await enviar('POST', { motivo: 'Falta fecha de retiro' }, 3, `${ruta}/devolver`);
  assert.equal(devuelta.status, 200);
  assert.equal(devuelta.datos.status, 'rejected');
  assert.equal(devuelta.datos.motivo_rechazo, 'Falta fecha de retiro');

  // El responsable corrige y reenvía; el motivo de rechazo se conserva durante
  // la corrección y se limpia al volver a enviar a aprobación.
  const corregida = await enviar('PUT', { fecha_retiro: '2099-12-31' }, 6, ruta, 9);
  assert.equal(corregida.status, 200);
  assert.equal(corregida.datos.status, 'rejected');
  assert.equal(corregida.datos.motivo_rechazo, 'Falta fecha de retiro');
  const queryCorregir = consultas.find((item) => item.sql.startsWith('UPDATE') && item.sql.includes('motivo_rechazo = CASE WHEN'));
  assert.equal(queryCorregir.valores[camposEditables.length], 'rejected');
  assert.equal(queryCorregir.valores[camposEditables.length + 1], false);
  assert.equal(queryCorregir.valores[camposEditables.length + 2], String(creada.id_publicacion));

  const reenvio = await enviar('POST', null, 6, `${ruta}/enviar-aprobacion`, 9);
  assert.equal(reenvio.status, 200);
  assert.equal(reenvio.datos.status, 'pending');
  assert.equal(reenvio.datos.motivo_rechazo, null);

  // Coordinación aprueba y publica.
  const aprobada = await enviar('POST', null, 3, `${ruta}/aprobar`);
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.datos.status, 'published');
  assert.equal(aprobada.datos.publicada, true);
  assert.ok((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion));

  // Al editar una publicada vuelve a revisión.
  const reedicion = await enviar('PUT', { titulo: 'Cartel con ajustes' }, 6, ruta, 9);
  assert.equal(reedicion.status, 200);
  assert.equal(reedicion.datos.status, 'pending');
  assert.equal(reedicion.datos.publicada, false);
  const queryReedicion = consultas.find((item) => item.sql.startsWith('UPDATE') && item.sql.includes('motivo_rechazo = CASE WHEN'));
  assert.equal(queryReedicion.valores[camposEditables.length], 'pending');
  assert.equal(queryReedicion.valores[camposEditables.length + 1], true);
  assert.equal(queryReedicion.valores[camposEditables.length + 2], String(creada.id_publicacion));
  assert.equal((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion), false);

  assert.equal(consultas.some((item) => item.sql.includes('noticias') || item.sql.includes('fechas_calendario')), false);
});

test('informa con error 500 si falla la aprobación o la devolución, sin alterar el estado', async () => {
  const creada = (await enviar('POST', datos, 6, '', 9)).datos;
  await enviar('POST', null, 6, `/${creada.id_publicacion}/enviar-aprobacion`, 9);
  const ruta = `/${creada.id_publicacion}`;

  fallarAprobar = true;
  const errorAprobar = await enviar('POST', null, 3, `${ruta}/aprobar`);
  assert.equal(errorAprobar.status, 500);
  assert.match(errorAprobar.datos.error, /aprobar/);
  fallarAprobar = false;

  const aprobada = await enviar('POST', null, 3, `${ruta}/aprobar`);
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.datos.status, 'published');

  // Volver a enviar a revisión para probar devolución fallida.
  await enviar('PUT', { titulo: 'Ajuste' }, 6, ruta, 9);
  await enviar('POST', null, 6, `${ruta}/enviar-aprobacion`, 9);

  fallarDevolver = true;
  const errorDevolver = await enviar('POST', { motivo: 'Revisar imagen' }, 3, `${ruta}/devolver`);
  assert.equal(errorDevolver.status, 500);
  assert.match(errorDevolver.datos.error, /devolver/);
  fallarDevolver = false;

  const devuelta = await enviar('POST', { motivo: 'Revisar imagen' }, 3, `${ruta}/devolver`);
  assert.equal(devuelta.status, 200);
  assert.equal(devuelta.datos.status, 'rejected');
});

test('evita decisiones simultáneas: solo una revisión afecta la publicación', async () => {
  const creada = (await enviar('POST', datos, 6, '', 9)).datos;
  await enviar('POST', null, 6, `/${creada.id_publicacion}/enviar-aprobacion`, 9);
  const ruta = `/${creada.id_publicacion}`;

  // La primera petición (aprobar) tiene éxito.
  const aprobada = await enviar('POST', null, 3, `${ruta}/aprobar`);
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.datos.status, 'published');

  // La segunda petición (devolver) detecta que ya no está pendiente.
  const devolver = await enviar('POST', { motivo: 'Duplicado' }, 3, `${ruta}/devolver`);
  assert.equal(devolver.status, 409);
  assert.match(devolver.datos.error, /ya fue aprobada/);
  assert.equal(devolver.datos.status, 'published');

  // Caso inverso: aprobar después de devolver también falla.
  const otra = (await enviar('POST', datos, 6, '', 9)).datos;
  await enviar('POST', null, 6, `/${otra.id_publicacion}/enviar-aprobacion`, 9);
  const devuelta = await enviar('POST', { motivo: 'Corregir' }, 3, `/${otra.id_publicacion}/devolver`);
  assert.equal(devuelta.status, 200);
  const aprobarFallida = await enviar('POST', null, 3, `/${otra.id_publicacion}/aprobar`);
  assert.equal(aprobarFallida.status, 409);
  assert.match(aprobarFallida.datos.error, /devuelta para correcciones/);
});

test('Coordinación tiene bandeja de revisión; el responsable gestiona sus publicaciones', async () => {
  const borrador = (await enviar('POST', datos, 6, '', 9)).datos;
  const pendiente = (await enviar('POST', { ...datos, titulo: 'Pendiente' }, 6, '', 9)).datos;
  await enviar('POST', null, 6, `/${pendiente.id_publicacion}/enviar-aprobacion`, 9);

  const bandejaAdmin = await enviar('GET', null, 3, '/admin');
  assert.equal(bandejaAdmin.status, 200);
  assert.ok(bandejaAdmin.datos.some((item) => item.id_publicacion === pendiente.id_publicacion));
  assert.equal(bandejaAdmin.datos.some((item) => item.id_publicacion === borrador.id_publicacion), false);

  const propias = await enviar('GET', null, 6, '/admin', 9);
  assert.equal(propias.status, 200);
  assert.ok(propias.datos.some((item) => item.id_publicacion === borrador.id_publicacion));
  assert.ok(propias.datos.some((item) => item.id_publicacion === pendiente.id_publicacion));
});

test('crear, destacar, ocultar y eliminar conserva una publicación independiente del feed', async () => {
  const creada = (await enviar('POST', datos, 6, '', 9)).datos;
  assert.equal(creada.publicada, false);
  assert.equal(creada.titulo, 'Convocatoria cultural');
  const ruta = `/${creada.id_publicacion}`;

  // No se puede publicar directamente desde PUT.
  assert.equal((await enviar('PUT', { publicada: true, destacada: true, subtitulo: 'Una invitación para todos', fecha_retiro: '2099-12-31', url_imagen: 'https://example.org/cartel.png' }, 6, ruta, 9)).datos.status, 'draft');

  await enviar('POST', null, 6, `${ruta}/enviar-aprobacion`, 9);
  const aprobada = await enviar('POST', null, 3, `${ruta}/aprobar`);
  assert.equal(aprobada.datos.destacada, true);
  assert.ok((await enviar('GET', null, null)).datos.some((item) => item.id_publicacion === creada.id_publicacion));

  // El responsable puede eliminar solo borradores o rechazadas.
  assert.equal((await enviar('DELETE', null, 6, ruta, 9)).status, 409);
  // Para eliminar una publicada, primero se edita (pasa a pending) y se devuelve.
  await enviar('PUT', { titulo: 'A eliminar' }, 6, ruta, 9);
  await enviar('POST', { motivo: 'Eliminar' }, 3, `${ruta}/devolver`);
  assert.equal((await enviar('DELETE', null, 6, ruta, 9)).status, 200);
  assert.equal((await enviar('PUT', { titulo: 'x' }, 6, ruta, 9)).status, 404);
  assert.equal((await enviar('DELETE', null, 6, ruta, 9)).status, 404);
});

test('el público no recibe borradores ni retiradas; la bandeja conserva ambas', async () => {
  const borrador = (await enviar('POST', datos, 6, '', 9)).datos;
  const retirada = (await enviar('POST', { ...datos, titulo: 'Retirada' }, 6, '', 9)).datos;
  const visible = (await enviar('POST', { ...datos, titulo: 'Visible' }, 6, '', 9)).datos;
  for (const item of [retirada, visible]) {
    await enviar('POST', null, 6, `/${item.id_publicacion}/enviar-aprobacion`, 9);
    await enviar('POST', null, 3, `/${item.id_publicacion}/aprobar`);
  }
  await enviar('PUT', { fecha_retiro: '2000-01-01' }, 6, `/${retirada.id_publicacion}`, 9);

  const publico = (await enviar('GET', null, null)).datos;
  assert.equal(publico.some((item) => [borrador.id_publicacion, retirada.id_publicacion].includes(item.id_publicacion)), false);
  assert.ok(publico.some((item) => item.id_publicacion === visible.id_publicacion));
});

test('rechaza enlaces ejecutables, fechas inexistentes y opciones mal formadas antes de escribir', async () => {
  for (const cambio of [{ titulo: '' }, { contenido: ' ' }, { titulo: 'x'.repeat(201) }, { contenido: 'x'.repeat(20001) }, { enlace_url: 'javascript:alert(1)' }, { enlace_url: 'https://usuario:clave@example.org' }, { url_imagen: 'data:image/svg+xml,bad' }, { fecha_retiro: '2027-02-29' }, { fecha_retiro: false }, { destacada: 1 }]) {
    assert.equal((await enviar('POST', { ...datos, ...cambio }, 6, '', 9)).status, 400);
    assert.equal(consultas.length, 0);
  }
  for (const invalido of ['0', '-1', 'abc', '99999999999999999999']) {
    for (const metodo of ['PUT', 'DELETE']) assert.equal((await enviar(metodo, datos, 6, `/${invalido}`, 9)).status, 400);
  }
});

test('guarda el destino compartido del QR y lo normaliza hacia el mural público', async () => {
  const guardado = await enviar('PUT', { url_publica: 'https://campus.example.org/admin/dashboard?seccion=usuarios#privado' }, 4, '/config');
  assert.equal(guardado.status, 200);
  assert.equal(guardado.datos.url_publica, 'https://campus.example.org/calendario?vista=mural');
  assert.equal((await enviar('GET', null, null, '/config')).datos.url_publica, guardado.datos.url_publica);
  for (const url of ['javascript:alert(1)', '/calendario', 15, 'https://usuario:clave@example.org']) {
    assert.equal((await enviar('PUT', { url_publica: url }, 3, '/config')).status, 400);
  }
  assert.equal((await enviar('PUT', { url_publica: null }, 3, '/config')).datos.url_publica, null);
});
