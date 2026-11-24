import { request, API_BASE, getToken } from './api-core';

const raiz = '/actividades';
const enviar = (ruta, method, body) => request(raiz + ruta, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

async function subirArchivos(ruta, campo, archivos, datos = {}) {
  const formulario = new FormData();
  for (const archivo of archivos) formulario.append(campo, archivo);
  for (const [clave, valor] of Object.entries(datos)) formulario.append(clave, valor);
  let respuesta;
  try { respuesta = await fetch(API_BASE + raiz + ruta, { method: 'POST', headers: { Authorization: 'Bearer ' + getToken() }, body: formulario }); }
  catch { throw new Error('No se pudieron cargar las imágenes. Revisa tu conexión e inténtalo de nuevo.'); }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.error || 'No se pudieron subir las imágenes');
  return cuerpo;
}

async function subirImagenCampo(idEdicion, clave, archivo) {
  return subirArchivos('/gestion/ediciones/' + idEdicion + '/campos/' + encodeURIComponent(clave) + '/imagen', 'imagen', [archivo]);
}

export const actividadService = {
  guardarActividad: (id, datos) => enviar('/gestion/actividades' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', datos),
  guardarEdicion: (idActividad, idEdicion, datos) => enviar(idEdicion ? '/gestion/ediciones/' + idEdicion : '/gestion/actividades/' + idActividad + '/ediciones', idEdicion ? 'PUT' : 'POST', datos),
  publicar: (tipo, id) => enviar('/gestion/' + tipo + '/' + id + '/publicar', 'POST', {}),
  revision: (tipo, id, retirar = false) => enviar('/gestion/' + tipo + '/' + id + '/revision', 'POST', { retirar }),
  decidir: (tipo, id, aprobar, motivo = '') => enviar('/gestion/' + tipo + '/' + id + '/decision', 'POST', { aprobar, motivo }),
  archivar: (tipo, id, archivar) => enviar('/gestion/' + tipo + '/' + id + '/archivo', 'POST', { archivar }),
  borrarActividad: (id) => enviar('/gestion/actividades/' + id, 'DELETE', { confirmar: true }),
  borrarEdicion: (id) => enviar('/gestion/ediciones/' + id, 'DELETE', { confirmar: true }),
  asignarEncargado: (id, idResponsable) => enviar('/gestion/actividades/' + id + '/responsable', 'PUT', { id_responsable: idResponsable }),
  listarResponsables: (id) => request(raiz + '/gestion/actividades/' + id + '/responsables'),
  agregarResponsable: (id, idResponsable) => enviar('/gestion/actividades/' + id + '/responsables', 'POST', { id_responsable: idResponsable }),
  quitarResponsable: (id, idResponsable) => enviar('/gestion/actividades/' + id + '/responsables/' + idResponsable, 'DELETE'),
  buscarEncargados: (buscar,tipo='actividad') => request(raiz + '/gestion/encargados?buscar=' + encodeURIComponent(buscar)+'&tipo='+tipo),
  abrirInscripciones: (id, abiertas) => enviar('/gestion/ediciones/' + id + '/inscripciones', 'PUT', { abiertas }),
  guardarOpcion: (idEdicion, idOpcion, datos) => enviar(idOpcion ? '/gestion/catalogo/' + idOpcion : '/gestion/ediciones/' + idEdicion + '/catalogo', idOpcion ? 'PUT' : 'POST', datos),
  recibirAportacion: (id) => enviar('/gestion/aportaciones/' + id + '/recibir', 'POST', {}),
  recibirRegaloCarta: (idReserva) => enviar('/gestion/cartas-reservas/' + idReserva + '/recibir', 'POST', {}),
  asignarCartaRegistro: (idEdicion, idRegistro, idCarta) => enviar('/gestion/ediciones/' + idEdicion + '/registros/' + idRegistro + '/carta', 'PUT', { id_carta: idCarta }),
  guardarCarta: (idEdicion, idCarta, datos) => enviar('/gestion/ediciones/' + idEdicion + '/cartas' + (idCarta ? '/' + idCarta : ''), idCarta ? 'PUT' : 'POST', datos),
  guardarRegistro: (id, datos) => enviar('/ediciones/' + id + '/registro', 'PUT', datos),
  cancelarRegistro: (id) => enviar('/ediciones/' + id + '/registro', 'DELETE'),
  generarAccesoAsistencia: (id) => enviar('/gestion/ediciones/' + id + '/asistencia/acceso', 'POST', {}),
  registrarAsistencia: (id, codigo, origen) => enviar('/ediciones/' + id + '/asistencia', 'POST', { codigo, origen }),
  corregirAsistencia: (idEdicion, idRegistro, estado, motivo) => enviar('/gestion/ediciones/' + idEdicion + '/asistencia/' + idRegistro, 'PUT', { estado, motivo }),
  reaccionar: (id, reaccion) => enviar('/ediciones/' + id + '/reaccion', 'PUT', { reaccion }),
  reaccionarClub: (id, reaccion) => enviar('/clubes/' + id + '/reaccion', 'PUT', { reaccion }),
  clubesParaTraslado: () => request(raiz + '/gestion/traslados/clubes'),
  revisarTraslado: (idClub,idEdicion) => request(raiz + '/gestion/traslados/' + idClub + '/' + idEdicion),
  aplicarTraslado: (idClub,idEdicion) => enviar('/gestion/traslados/' + idClub + '/' + idEdicion,'POST',{confirmar:true}),
  revisarFoto: (id, estado) => enviar('/gestion/fotos/' + id, 'PUT', { estado }),
  subirImagen: (ruta, archivo, datos = {}) => subirArchivos(ruta, 'imagen', [archivo], datos),
  subirFotos: (idEdicion, archivos, pie) => subirArchivos('/gestion/ediciones/' + idEdicion + '/fotos/lote', 'imagenes', archivos, { pie }),
  subirFotosClub: (idClub, archivos, pie) => subirArchivos('/gestion/actividades/' + idClub + '/fotos/lote', 'imagenes', archivos, { pie }),
  subirImagenCampo,
  eliminarImagenCampo: (idEdicion, clave) => enviar('/gestion/ediciones/' + idEdicion + '/campos/' + encodeURIComponent(clave) + '/imagen', 'DELETE'),
};
