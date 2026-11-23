import {
  fechaActividad, textoActividad, normalizarCamposActividad,
  normalizarConfiguracionMisiones, normalizarOpcionAportacion,
} from '../../shared/actividades.js';
import { normalizarEnlaceMapa } from '../../shared/ubicacionMaps.js';

export const PASOS_EDICION = [
  { titulo: 'Información' },
  { titulo: 'Fechas' },
  { titulo: 'Inscripciones' },
  { titulo: 'Vista previa' },
];

export function prepararDatosEdicion(datos, plantilla) {
  const requiereRegistro = ['trineo', 'misiones'].includes(plantilla) || datos.requiere_registro === true;
  return {
    ...datos,
    requiere_registro: requiereRegistro,
    requiere_aportacion: requiereRegistro && datos.requiere_aportacion === true,
    campos_registro: (datos.campos_registro || []).map(({ textoOpciones, ...campo }) => ({
      ...campo,
      opciones: textoOpciones == null ? campo.opciones : textoOpciones.split(/\r?\n/).map((valor) => valor.trim()).filter(Boolean),
    })),
  };
}

// Revisa cada apartado independientemente, incluso cuando los demás estén incompletos.
// El guardado conserva además la normalización y las reglas compartidas del servidor.
export function pendientesEdicion(datos, plantilla, { catalogo = [], existente = false, cargandoCatalogo = false, errorCatalogo = '' } = {}) {
  const pendientes = [[], [], []];
  const entrada = prepararDatosEdicion(datos, plantilla);
  const agregar = (paso, mensaje) => { if (!pendientes[paso].includes(mensaje)) pendientes[paso].push(mensaje); };
  const comprobar = (paso, accion) => { try { return accion(); } catch (error) { agregar(paso, error.message); return null; } };
  const fecha = (clave, etiqueta, paso, obligatoria = false) => {
    if (!entrada[clave]) { if (obligatoria) agregar(paso, 'Completa: ' + etiqueta); return null; }
    try { return fechaActividad(entrada[clave]); } catch { agregar(paso, 'Revisa: ' + etiqueta); return null; }
  };
  comprobar(0, () => textoActividad(entrada.nombre, 160, 'Nombre de la edición', true));
  comprobar(0, () => textoActividad(entrada.lugar, 240, 'Lugar', true));
  comprobar(0, () => normalizarEnlaceMapa(entrada.ubicacion_maps));
  comprobar(0, () => textoActividad(entrada.descripcion, 5000, 'Información de la edición'));

  const inicio = fecha('fecha_inicio', 'Fecha de inicio', 1, true);
  const fin = fecha('fecha_fin', 'Fecha de fin', 1);
  const finEvento = fin || inicio;
  if (inicio && fin && inicio > fin) agregar(1, 'La fecha de fin debe ser igual o posterior al inicio de la actividad.');
  const hora = comprobar(1, () => textoActividad(entrada.hora_inicio, 5, 'Hora de inicio'));
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) agregar(1, 'Revisa la hora de inicio.');
  const destacadaDesde = fecha('destacada_desde', 'Destacar desde', 1, entrada.destacable);
  const destacadaHasta = fecha('destacada_hasta', 'Destacar hasta', 1, entrada.destacable);
  if (destacadaDesde && destacadaHasta && destacadaDesde > destacadaHasta) agregar(1, 'El periodo de destacado debe terminar después de su inicio.');
  if (destacadaHasta && finEvento && destacadaHasta > finEvento) agregar(1, 'El destacado debe terminar a más tardar al finalizar la actividad.');

  const inscripcionDesde = fecha('inscripcion_desde', 'Inscripciones desde', 2, entrada.requiere_registro);
  const inscripcionHasta = fecha('inscripcion_hasta', 'Inscripciones hasta', 2, entrada.requiere_registro);
  if (inscripcionDesde && inscripcionHasta && inscripcionDesde > inscripcionHasta) agregar(2, 'Las inscripciones deben cerrar después de su apertura.');
  if (inscripcionHasta && finEvento && inscripcionHasta > finEvento) agregar(2, 'Las inscripciones deben cerrar a más tardar al finalizar la actividad.');
  const campos = comprobar(2, () => normalizarCamposActividad(entrada.campos_registro, plantilla, entrada.configuracion_misiones));
  if (entrada.requiere_registro && campos) {
    for (const campo of campos.filter((item) => item.tipo === 'seleccion' && item.obligatorio && !item.opciones.length)) agregar(2, 'Completa las opciones de: ' + campo.etiqueta);
  }
  if (plantilla === 'misiones' && entrada.configuracion_misiones != null) {
    const config = comprobar(2, () => normalizarConfiguracionMisiones(entrada.configuracion_misiones));
    if (config?.codigo_obligatorio && !config.codigo_documento) agregar(2, 'Adjunta el PDF del código de conducta.');
    for (const producto of config?.productos || []) {
      if (producto.activo && producto.requiere_talla && !producto.tallas.length) agregar(2, 'Configura las tallas de: ' + producto.nombre);
    }
  }
  if (entrada.requiere_registro && (entrada.requiere_aportacion || catalogo.length)) {
    if (existente && cargandoCatalogo) agregar(2, 'Espera a que se cargue el catálogo de aportaciones.');
    else if (existente && errorCatalogo) agregar(2, 'Vuelve a cargar el catálogo de aportaciones.');
    else {
      const opciones = existente ? catalogo : catalogo.map((opcion) => comprobar(2, () => ({ ...normalizarOpcionAportacion(opcion), activa: true }))).filter(Boolean);
      if (entrada.requiere_aportacion && !opciones.some((opcion) => opcion.activa && Number(opcion.cantidad_minima) > 0)) agregar(2, 'Configura al menos una aportación disponible con su cantidad mínima.');
    }
  }
  return pendientes;
}

export function resolverPasoEdicion({ paso, alcanzado }, destino, pendientes) {
  if (!Number.isInteger(destino) || destino < 0 || destino > 3) return { paso, alcanzado, pendiente: null };
  if (destino <= alcanzado) return { paso: destino, alcanzado, pendiente: null };
  // Los encabezados no permiten saltarse un paso que aún no se ha alcanzado.
  if (destino !== paso + 1 || destino !== alcanzado + 1) return { paso, alcanzado, pendiente: null };
  const pendiente = pendientes.findIndex((errores, indice) => indice < destino && errores.length > 0);
  return pendiente >= 0 ? { paso: pendiente, alcanzado, pendiente } : { paso: destino, alcanzado: destino, pendiente: null };
}
