import { camposMisiones, campoActividadVisible, normalizarConfiguracionMisiones, validarCamposMisiones, validarTelefonoMisiones } from './misionesDominio.js';
import { normalizarEnlaceMapa } from './ubicacionMaps.js';
export * from './misionesDominio.js';
// Contrato compartido entre la API, los formularios y las pruebas del módulo.
// Los identificadores históricos admin (3) y coordinacion (7) representan Coordinación.
export const ROLES_CREAN_ACTIVIDADES = [3, 4, 7];
export const ROLES_SUPERVISAN_ACTIVIDADES = [3, 4, 7];
export const ROLES_APRUEBAN_EDICIONES = [3, 4, 7];
export const ROLES_PUBLICAN_ACTIVIDADES = [3, 4, 7];
export const REACCIONES_ACTIVIDAD = ['like', 'love', 'clap'];
export const ESTADOS_ACTIVIDAD = ['borrador', 'pendiente', 'publicada', 'rechazada', 'archivada'];

export const ETIQUETAS_ACTIVIDAD_CATALOGO = {
  actividad_creada: 'Registro del catálogo creado',
  encargado_asignado: 'Responsable asignado',
  edicion_creada: 'Edición creada',
  actividad_editada: 'Información general editada',
  edicion_editada: 'Edición editada',
  actividad_enviada_revision: 'Información general enviada a revisión',
  edicion_enviada_revision: 'Edición enviada a revisión',
  actividad_retirada_revision: 'Información general retirada de revisión',
  edicion_retirada_revision: 'Edición retirada de revisión',
  actividad_publicada: 'Información general publicada',
  edicion_publicada: 'Edición publicada',
  actividad_rechazada: 'Cambios solicitados en la información general',
  edicion_rechazada: 'Cambios solicitados en la edición',
  actividad_archivada: 'Publicación archivada',
  edicion_archivada: 'Edición archivada',
  actividad_restaurada: 'Publicación restaurada como borrador',
  edicion_restaurada: 'Edición restaurada como borrador',
  inscripciones_actualizadas: 'Disponibilidad de inscripciones actualizada',
  opcion_aportacion_creada: 'Opción de aportación creada',
  catalogo_actualizado: 'Opción de aportación actualizada',
  aportacion_recibida: 'Recepción de aportación confirmada',
  carta_creada: 'Carta del Trineo capturada',
  carta_actualizada: 'Carta del Trineo actualizada',
  carta_reservada: 'Carta del Trineo reservada',
  carta_liberada: 'Reserva de carta liberada',
  responsable_adicional_asignado: 'Responsable adicional asignado',
  responsable_adicional_retirado: 'Responsable adicional retirado',
  regalo_carta_recibido: 'Regalo de la carta recibido',
  portada_actualizada: 'Imagen de presentación actualizada',
  fotos_agregadas: 'Fotografías agregadas',
  foto_publicada: 'Fotografía aprobada',
  foto_rechazada: 'Fotografía rechazada',
  foto_eliminada: 'Fotografía retirada',
  registro_confirmado: 'Inscripción confirmada',
  registro_cancelado: 'Inscripción cancelada',
  registro_editado: 'Inscripción actualizada',
  codigo_conducta_cargado: 'Código de conducta cargado',
  asistencia_acceso_creado: 'Acceso al pase de lista generado',
  asistencia_registrada: 'Asistencia registrada',
  asistencia_corregida: 'Asistencia corregida por el encargado',
  legado_migrado: 'Participantes de un club anterior trasladados',
};

export function errorActividad(mensaje, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

// El servidor proporciona "hoy" en la zona del campus. La inscripción y la
// hora de inicio no limitan el pase: incluye todos los días de la edición.
export function disponibilidadAsistenciaActividad(edicion, hoy) {
  if (!edicion.requiere_registro || edicion.estado !== 'publicada' ||
      edicion.estado_actividad !== 'publicada' || !edicion.fecha_inicio) return 'no_disponible';
  if (hoy < edicion.fecha_inicio) return 'proxima';
  if (hoy > (edicion.fecha_fin || edicion.fecha_inicio)) return 'finalizada';
  return 'disponible';
}

export function normalizarCodigoAsistencia(valor) {
  if (typeof valor !== 'string' || valor.length > 32) throw errorActividad('Revisa el código de asistencia');
  const codigo = valor.trim().toUpperCase().replace(/[ -]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(codigo)) throw errorActividad('Escribe los ocho caracteres del código de asistencia');
  return codigo;
}

export function textoActividad(valor, maximo, nombre, obligatorio = false) {
  if (valor != null && typeof valor !== 'string') throw errorActividad(nombre + ' no es válido');
  const texto = (valor || '').trim();
  if ((obligatorio && !texto) || texto.length > maximo) throw errorActividad('Revisa ' + nombre.toLowerCase());
  return texto;
}

export function fechaActividad(valor) {
  if (!valor) return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < '0001-01-01') throw errorActividad('Fecha no válida');
  const fecha = new Date(valor + 'T12:00:00Z');
  if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) throw errorActividad('Fecha no válida');
  return valor;
}

export function imagenActividad(valor) {
  const url = textoActividad(valor, 1000, 'Imagen');
  if (url && !/^https?:\/\/[^\s]+$/i.test(url) && !/^\/(?!\/)[\w\-./%]+$/.test(url)) throw errorActividad('Usa una imagen del sitio o una dirección HTTP o HTTPS');
  return url;
}

export function crearSlugActividad(nombre) {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

export function normalizarActividad(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw errorActividad('Revisa los datos de la actividad');
  const nombre = textoActividad(datos.nombre, 160, 'Nombre de la actividad', true);
  const slug = datos.slug ? textoActividad(datos.slug, 100, 'Dirección de la actividad', true) : crearSlugActividad(nombre);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw errorActividad('La dirección debe contener letras minúsculas, números y guiones');
  return {
    nombre, slug,
    descripcion: textoActividad(datos.descripcion, 5000, 'Descripción', true),
    categoria: textoActividad(datos.categoria, 80, 'Categoría', true),
    url_imagen: imagenActividad(datos.url_imagen),
    mostrar_en_oferta: datos.mostrar_en_oferta !== false,
  };
}

export function normalizarRecursoCatalogo(datos) {
  const comun = normalizarActividad(datos);
  const tipo = datos.tipo || 'actividad';
  if (!['club', 'actividad'].includes(tipo)) throw errorActividad('Selecciona Club o Actividad');
  if (tipo === 'actividad') return { ...comun, tipo, id_estatus_club: null };
  const cupo = Number(datos.cupo_maximo);
  if (![10, 15, 20, 25, 30, 40, 50].includes(cupo)) throw errorActividad('Selecciona un cupo válido para el club');
  const participacion = datos.participacion || 'mixta';
  if (!['masculina', 'femenina', 'mixta'].includes(participacion)) throw errorActividad('Selecciona la participación del club');
  if (!Array.isArray(datos.niveles) || !datos.niveles.length || !datos.niveles.every((nivel) => [1, 2, 3].includes(Number(nivel)))) throw errorActividad('Selecciona al menos un nivel de participación para el club');
  return { ...comun, tipo, id_estatus_club: 2, cupo_maximo: cupo, participacion, niveles: [...new Set(datos.niveles.map(Number))], lugar_actividades: textoActividad(datos.lugar_actividades, 255, 'Lugar del club') };
}

export function camposPlantillaActividad(plantilla = 'general', configuracion = null) {
  if (plantilla === 'misiones' && configuracion?.version === 2) return camposMisiones(configuracion);
  if (!['trineo', 'misiones'].includes(plantilla)) return [];
  return [
    { clave: 'edad', etiqueta: 'Edad', tipo: 'numero', obligatorio: true, minimo: 1, maximo: 120, opciones: [] },
    { clave: 'talla', etiqueta: 'Talla de camisa', tipo: 'seleccion', obligatorio: plantilla !== 'trineo', opciones: [] },
    { clave: 'licenciatura', etiqueta: 'Licenciatura', tipo: 'licenciatura', obligatorio: false, opciones: [] },
  ];
}

export function camposRegistroTrineo(campos) {
  const resultado = campos.map((campo) => campo.clave === 'talla' ? { ...campo, obligatorio: false } : campo);
  const indiceTelefono = resultado.findIndex((campo) => campo.clave === 'telefono');
  const telefono = indiceTelefono >= 0
    ? resultado[indiceTelefono]
    : { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', obligatorio: true, opciones: [], validacion: 'telefono' };
  const sinTelefono = resultado.filter((campo) => campo.clave !== 'telefono');
  const indiceEdad = sinTelefono.findIndex((campo) => campo.clave === 'edad');
  sinTelefono.splice(indiceEdad < 0 ? 0 : indiceEdad, 0, telefono);
  return sinTelefono;
}

export function cotizarCamisaTrineo({ campo, solicita, talla, anterior = null }) {
  const previo = anterior?.tipo === 'camisa_trineo' ? anterior : null;
  const necesita = solicita === undefined ? previo ? Boolean(previo.lineas.length) : null : solicita;
  if (necesita === null) throw errorActividad('Indica si ya tienes camisa o necesitas una');
  if (typeof necesita !== 'boolean') throw errorActividad('Indica si necesitas camisa');
  if (!necesita) return { tipo: 'camisa_trineo', moneda: 'MXN', lineas: [], total_centavos: 0 };
  if (typeof talla !== 'string' || !talla.trim()) throw errorActividad('Selecciona la talla de tu camisa');
  if (previo?.lineas.length === 1 && previo.lineas[0].talla === talla) return previo;
  if (!campo?.opciones?.includes(talla)) throw errorActividad('Selecciona una talla disponible para la camisa');
  const precio = campo.precio_camisa_centavos;
  if (!Number.isSafeInteger(precio) || precio < 0 || precio > 100000000) throw errorActividad('El encargado debe configurar el precio de la camisa', 409);
  return {
    tipo: 'camisa_trineo', moneda: 'MXN',
    lineas: [{ id_producto: 'camisa_trineo', nombre: 'Camisa del Trineo de los Sueños', cantidad: 1, talla, precio_centavos: precio, subtotal_centavos: precio }],
    total_centavos: precio,
  };
}

export function normalizarCamposActividad(valor, plantilla = 'general', configuracion = null) {
  if (!Array.isArray(valor) || valor.length > 25) throw errorActividad('Configura hasta 25 campos de registro');
  const claves = new Set(['nombre_completo', 'matricula', '__proto__', 'constructor', 'prototype']);
  const campos = valor.map((campo) => {
    if (!campo || typeof campo !== 'object') throw errorActividad('Campo de registro no válido');
    const clave = textoActividad(campo.clave, 50, 'Clave del campo', true);
    if (!/^[a-z][a-z0-9_]*$/.test(clave) || claves.has(clave)) throw errorActividad('Cada campo necesita una clave única y válida');
    claves.add(clave);
    if (!['texto', 'texto_largo', 'numero', 'seleccion', 'licenciatura', 'fecha'].includes(campo.tipo)) throw errorActividad('Tipo de campo no válido');
    const opciones = campo.tipo === 'seleccion' ? campo.opciones : [];
    if (!Array.isArray(opciones) || opciones.length > 80) throw errorActividad('Opciones del campo no válidas');
    const resultado = {
      clave, etiqueta: textoActividad(campo.etiqueta, 120, 'Etiqueta del campo', true),
      tipo: campo.tipo, obligatorio: plantilla === 'trineo' && clave === 'talla' ? false : campo.obligatorio === true,
      opciones: [...new Set(opciones.map((opcion) => textoActividad(opcion, 120, 'Opción', true)))],
    };
    if (plantilla === 'trineo' && clave === 'talla' && campo.precio_camisa_centavos != null) {
      if (!Number.isSafeInteger(campo.precio_camisa_centavos) || campo.precio_camisa_centavos < 0 || campo.precio_camisa_centavos > 100000000) throw errorActividad('Indica un precio válido para la camisa');
      resultado.precio_camisa_centavos = campo.precio_camisa_centavos;
    }
    if (campo.imagen_url != null) {
      const imagen = textoActividad(campo.imagen_url, 1000, 'Imagen del campo');
      if (!/^(https?:\/\/|\/)[^\s<>"']+$/i.test(imagen)) throw errorActividad('La imagen del campo no es válida');
      resultado.imagen_url = imagen;
    }
    if (campo.imagen_public_id != null) {
      resultado.imagen_public_id = textoActividad(campo.imagen_public_id, 255, 'Identificador de imagen');
    }
    if (campo.tipo === 'numero') {
      resultado.minimo = campo.minimo === '' || campo.minimo == null ? 0 : Number(campo.minimo);
      resultado.maximo = campo.maximo === '' || campo.maximo == null ? 1000000 : Number(campo.maximo);
      if (!Number.isFinite(resultado.minimo) || !Number.isFinite(resultado.maximo) || resultado.minimo > resultado.maximo) throw errorActividad('Límites del campo no válidos');
    }
    return resultado;
  });
  if (plantilla === 'misiones' && configuracion?.version === 2) return validarCamposMisiones(campos, configuracion);
  for (const obligatorio of camposPlantillaActividad(plantilla)) {
    const campo = campos.find((item) => item.clave === obligatorio.clave);
    if (!campo && plantilla === 'misiones') continue;
    if (!campo || campo.tipo !== obligatorio.tipo || campo.obligatorio !== obligatorio.obligatorio) throw errorActividad('Esta actividad requiere edad y talla configuradas, y licenciatura opcional');
    if (campo.clave === 'edad') {
      campo.minimo = 1;
      campo.maximo = 120;
    }
  }
  return campos;
}

export function normalizarEdicionActividad(datos, plantilla = 'general') {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw errorActividad('Revisa los datos de la edición');
  if (plantilla === 'trineo' && datos.carta_obligatoria !== undefined && typeof datos.carta_obligatoria !== 'boolean') throw errorActividad('Indica si la carta del Trineo es obligatoria');
  if (plantilla === 'trineo' && datos.cartas_habilitadas !== undefined && typeof datos.cartas_habilitadas !== 'boolean') throw errorActividad('Indica si las cartas estarán disponibles');
  const configuracion = plantilla === 'misiones' && datos.configuracion_misiones != null ? normalizarConfiguracionMisiones(datos.configuracion_misiones) : null;
  const resultado = {
    nombre: textoActividad(datos.nombre, 160, 'Nombre de la edición', true),
    descripcion: textoActividad(datos.descripcion, 5000, 'Información de la edición'),
    lugar: textoActividad(datos.lugar, 240, 'Lugar'),
    ubicacion_maps: normalizarEnlaceMapa(datos.ubicacion_maps),
    hora_inicio: textoActividad(datos.hora_inicio, 5, 'Hora'),
    requiere_registro: datos.requiere_registro === true,
    requiere_aportacion: datos.requiere_aportacion === true,
    carta_obligatoria: plantilla === 'trineo' ? datos.carta_obligatoria !== false : false,
    cartas_habilitadas: plantilla === 'trineo' ? datos.cartas_habilitadas === true : false,
    destacable: datos.destacable === true,
    campos_registro: normalizarCamposActividad(datos.campos_registro || camposPlantillaActividad(plantilla, configuracion), plantilla, configuracion),
  };
  if (configuracion) resultado.configuracion_misiones = configuracion;
  if (['trineo', 'misiones'].includes(plantilla)) resultado.requiere_registro = true;
  if (!resultado.requiere_registro) resultado.requiere_aportacion = false;
  if (resultado.hora_inicio && !/^([01]\d|2[0-3]):[0-5]\d$/.test(resultado.hora_inicio)) throw errorActividad('Hora no válida');
  for (const clave of ['fecha_inicio', 'fecha_fin', 'inscripcion_desde', 'inscripcion_hasta', 'destacada_desde', 'destacada_hasta']) resultado[clave] = fechaActividad(datos[clave]);
  for (const [inicio, fin, etiqueta] of [['fecha_inicio', 'fecha_fin', 'la actividad'], ['inscripcion_desde', 'inscripcion_hasta', 'las inscripciones'], ['destacada_desde', 'destacada_hasta', 'el destacado']]) {
    if (resultado[inicio] && resultado[fin] && resultado[inicio] > resultado[fin]) throw errorActividad('Revisa el periodo de ' + etiqueta);
  }
  const finEvento = resultado.fecha_fin || resultado.fecha_inicio;
  if (finEvento && resultado.inscripcion_hasta && resultado.inscripcion_hasta > finEvento) throw errorActividad('Las inscripciones deben cerrar a más tardar al finalizar la actividad');
  if (finEvento && resultado.destacada_hasta && resultado.destacada_hasta > finEvento) throw errorActividad('El destacado debe terminar a más tardar al finalizar la actividad');
  return resultado;
}

export function validarPublicacionEdicion(edicion, catalogo = []) {
  if (!edicion.fecha_inicio || !edicion.lugar) throw errorActividad('Completa la fecha y el lugar antes de publicar');
  if (edicion.requiere_registro) {
    if (!edicion.inscripcion_desde || !edicion.inscripcion_hasta) throw errorActividad('Configura el periodo de inscripción');
    if (edicion.campos_registro.some((campo) => campo.tipo === 'seleccion' && (campo.obligatorio || campo.precio_camisa_centavos != null) && !campo.opciones.length)) throw errorActividad('Completa las opciones de los campos obligatorios y las tallas de las camisas disponibles');
  }
  if (edicion.destacable && (!edicion.destacada_desde || !edicion.destacada_hasta)) throw errorActividad('Configura desde cuándo y hasta cuándo se destaca');
  if (edicion.requiere_aportacion && (!edicion.requiere_registro || !catalogo.some((opcion) => opcion.activa && Number(opcion.cantidad_minima) > 0))) throw errorActividad('Configura al menos una aportación disponible con su mínimo');
  if (edicion.configuracion_misiones?.version === 2) {
    const config = edicion.configuracion_misiones;
    if (config.codigo_obligatorio && !config.codigo_documento) throw errorActividad('Adjunta el PDF del código de conducta antes de enviar a revisión');
    if (config.productos.some((producto) => producto.activo && producto.requiere_talla && !producto.tallas.length)) throw errorActividad('Configura las tallas de los artículos disponibles');
  }
}

export function normalizarOpcionAportacion(datos) {
  if(!datos || typeof datos!=='object' || Array.isArray(datos)) throw errorActividad('Revisa las opciones de aportación');
  const minimo=typeof datos.cantidad_minima==='number' || typeof datos.cantidad_minima==='string' ? Number(datos.cantidad_minima) : NaN;
  if(!Number.isFinite(minimo) || minimo<=0 || minimo>1000000 || Math.abs(minimo*1000-Math.round(minimo*1000))>0.00001) throw errorActividad('Indica una cantidad mínima válida');
  return {nombre:textoActividad(datos.nombre,160,'Nombre de la aportación',true),unidad:textoActividad(datos.unidad,60,'Unidad',true),descripcion:textoActividad(datos.descripcion,1000,'Descripción'),cantidad_minima:minimo};
}

export function esDestacadaActividad(edicion, hoy) {
  return edicion.estado === 'publicada' && edicion.destacable === true && Boolean(edicion.destacada_desde && edicion.destacada_hasta) && edicion.destacada_desde <= hoy && hoy <= edicion.destacada_hasta && hoy <= (edicion.fecha_fin || edicion.fecha_inicio);
}

export function estadoRegistroActividad(edicion, hoy) {
  if (!edicion.requiere_registro) return 'informativa';
  if (edicion.estado !== 'publicada') return 'cerrada';
  if ((edicion.fecha_fin || edicion.fecha_inicio) < hoy) return 'finalizada';
  if (!edicion.inscripcion_desde || !edicion.inscripcion_hasta) return 'cerrada';
  if (hoy < edicion.inscripcion_desde) return 'proxima';
  if (!edicion.inscripciones_habilitadas || hoy > edicion.inscripcion_hasta) return 'cerrada';
  return 'abierta';
}

export function validarRespuestasActividad(campos, respuestas, hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())) {
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) throw errorActividad('Revisa tus respuestas');
  const resultado = {};
  for (const campo of campos) {
    if (!campoActividadVisible(campo, respuestas)) continue;
    const valor = respuestas[campo.clave];
    if (valor == null || valor === '') {
      if (campo.obligatorio) throw errorActividad('Completa: ' + campo.etiqueta);
      continue;
    }
    if (campo.tipo === 'numero') {
      const numero = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
      if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero < campo.minimo || numero > campo.maximo) throw errorActividad('Revisa: ' + campo.etiqueta);
      resultado[campo.clave] = numero;
    } else if (campo.tipo === 'fecha') {
      const fecha = fechaActividad(valor);
      if (!fecha || (campo.no_futura && fecha > hoy)) throw errorActividad('Revisa: ' + campo.etiqueta + '. La fecha no puede ser futura');
      resultado[campo.clave] = fecha;
    } else if (campo.tipo === 'licenciatura') {
      const numero = Number(valor);
      if (!Number.isSafeInteger(numero) || numero < 1) throw errorActividad('Selecciona una licenciatura válida');
      resultado[campo.clave] = numero;
    } else {
      const texto = textoActividad(valor, campo.tipo === 'texto_largo' ? 2000 : 500, campo.etiqueta, campo.obligatorio);
      if (campo.tipo === 'seleccion' && !campo.opciones.includes(texto)) throw errorActividad('Selecciona una opción válida: ' + campo.etiqueta);
      resultado[campo.clave] = campo.validacion === 'telefono' ? validarTelefonoMisiones(texto) : texto;
    }
  }
  return resultado;
}

export function validarAportacionesActividad(seleccion, catalogo, obligatoria, anteriores = []) {
  if (!Array.isArray(seleccion) || seleccion.length > 20 || (obligatoria && !seleccion.length)) throw errorActividad('Registra al menos una aportación válida');
  const ids = new Set();
  return seleccion.map((aporte) => {
    if (!aporte || typeof aporte !== 'object' || Array.isArray(aporte)) throw errorActividad('Revisa tus aportaciones');
    const id = Number(aporte.id_opcion);
    const anterior = anteriores.find((item) => item.id_opcion === id && item.estado !== 'cancelada');
    const opcion = catalogo.find((item) => item.id_opcion === id && item.activa);
    if ((!opcion && !anterior) || ids.has(id)) throw errorActividad('Selecciona aportaciones disponibles, sin repetirlas');
    ids.add(id);
    const cantidad = typeof aporte.cantidad === 'number' || typeof aporte.cantidad === 'string' ? Number(aporte.cantidad) : NaN;
    const minimo = Number(anterior?.cantidad_minima || opcion.cantidad_minima);
    if (!Number.isFinite(cantidad) || cantidad < minimo || cantidad > 1000000 || Math.abs(cantidad * 1000 - Math.round(cantidad * 1000)) > 0.00001) throw errorActividad('Revisa la cantidad y el mínimo de cada aportación');
    if (anterior?.estado === 'recibida' && cantidad !== Number(anterior.cantidad)) throw errorActividad('Una aportación recibida conserva su cantidad registrada');
    return { id_opcion: id, cantidad, cantidad_minima: minimo, nombre: anterior?.nombre || opcion.nombre, unidad: anterior?.unidad || opcion.unidad };
  });
}
