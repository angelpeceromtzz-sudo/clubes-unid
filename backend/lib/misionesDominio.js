// Reglas puras compartidas por el formulario, el servidor y sus pruebas.
export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ROLES_MISION = ['Responsable', 'Misionero'];
export const FORMATO_MEGAMISIONES = 'megamisiones-2026';
export const CAMPUS_MEGAMISIONES = ['Campeche', 'Ciudad del Carmen', 'Mérida', 'N/A'];
export const FAMILIA_UNID_MEGAMISIONES = ['Estudiante de Licenciatura', 'Estudiante de Maestría', 'Egresado', 'Docente', 'Colaborador', 'Invitado'];
export const RELIGIONES_MEGAMISIONES = ['Iglesia católica apostólica romana', 'Iglesia bautista', 'Iglesia evangélica', 'Iglesia de Jesucristo de los Santos de los Últimos Días (mormones)', 'Testigos de Jehová', 'Iglesia Pentecostal', 'Ninguna', 'Otra'];
export const GRUPOS_MEGAMISIONES = ['No pertenezco', 'Movimiento Regnum Christi, incorporado (Juventud y Familia Misionera, Club Faro, Club Giro, Club NET)', 'Movimiento Regnum Christi, no incorporado (Juventud y Familia Misionera, Club Faro, Club Giro, Club NET)', 'Movimiento de Jornadas de Vida Cristiana', 'Movimiento de Cursillos de Vida Cristiana', 'Movimiento de Renovación Carismática Católica en el Espíritu Santo', 'Movimiento Familiar Cristiano', 'Movimiento de Pascua Juvenil', 'Camino Neocatecumenal', 'Otro'];
export const UUID_MISIONES = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fallo = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });
const objeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor, maximo, etiqueta, requerido = false) => {
  if (typeof valor !== 'string' || valor.trim().length > maximo || (requerido && !valor.trim())) throw fallo('Revisa ' + etiqueta);
  return valor.trim();
};

export function configuracionMisionesInicial(formato = FORMATO_MEGAMISIONES) {
  return { version: 2, ...(formato ? { formato, informacion_kit: '' } : {}), codigo_documento: null, codigo_obligatorio: false, productos: [] };
}

export function esFormatoMegamisiones(configuracion) {
  return configuracion?.formato === FORMATO_MEGAMISIONES;
}

export function esMisionesNueva(edicion) {
  return edicion?.plantilla === 'misiones' && edicion?.configuracion_misiones?.version === 2;
}

export function camposMisiones(configuracion = null) {
  const campo = (clave, etiqueta, tipo = 'texto', extra = {}) => ({ clave, etiqueta, tipo, obligatorio: false, opciones: [], ...extra });
  const condicion = (clave, valor) => ({ visible_si: { campo: clave, valor }, obligatorio: true });
  if (esFormatoMegamisiones(configuracion)) {
    const requerido = (clave, etiqueta, tipo = 'texto', extra = {}) => campo(clave, etiqueta, tipo, { obligatorio: true, ...extra });
    return [
      requerido('fecha_nacimiento', 'Fecha de nacimiento', 'fecha', { no_futura: true }),
      requerido('sexo', 'Sexo', 'seleccion', { opciones: ['Hombre', 'Mujer'] }),
      requerido('rol_mision', 'Rol en la misión', 'seleccion', { opciones: ['Misionero', 'Responsable de equipo'], ayuda: 'Responsable de equipo: únicamente con autorización de Coordinación General. Esta respuesta no concede permisos en ClubsUNID.' }),
      requerido('campus', 'Campus UNID de procedencia', 'seleccion', { opciones: [...CAMPUS_MEGAMISIONES] }),
      requerido('familia_unid', 'Formo parte de la Familia UNID como', 'seleccion', { opciones: [...FAMILIA_UNID_MEGAMISIONES] }),
      requerido('cuatrimestre', 'Actualmente curso el', 'seleccion', { opciones: [...Array.from({ length: 10 }, (_, i) => String(i + 1) + '° cuatrimestre'), 'N/A'] }),
      requerido('tipo_sangre', 'Tipo de sangre', 'seleccion', { opciones: [...TIPOS_SANGRE] }),
      requerido('alergias_medicamentos', '¿Eres alérgico a algún medicamento? Indica cuál', 'texto_largo', { ayuda: 'Si no tienes alergias a medicamentos, escribe «Ninguna».' }),
      requerido('alergias_alimentos', '¿Eres alérgico a algún alimento o material?', 'texto_largo', { ayuda: 'Si no tienes estas alergias, escribe «Ninguna».' }),
      requerido('enfermedades', '¿Padeces alguna enfermedad? Indica cuál', 'texto_largo', { ayuda: 'Si no padeces ninguna, escribe «Ninguna».' }),
      requerido('tutor_nombre', 'Nombre del contacto de emergencia'),
      requerido('tutor_telefono', 'Teléfono del contacto de emergencia', 'texto', { validacion: 'telefono' }),
      requerido('talla', 'Talla de playera', 'seleccion', { opciones: ['Chica', 'Mediana', 'Grande', 'Extragrande', 'Doble extragrande'], ayuda: 'Las playeras son de corte de hombre.' }),
      requerido('religion', '¿A qué religión perteneces?', 'seleccion', { opciones: [...RELIGIONES_MEGAMISIONES] }),
      requerido('religion_otro', 'Especifica tu religión', 'texto', condicion('religion', 'Otra')),
      requerido('grupo_juvenil', 'Movimiento o grupo juvenil', 'seleccion', { opciones: [...GRUPOS_MEGAMISIONES] }),
      requerido('grupo_juvenil_otro', 'Nombre de tu movimiento o grupo', 'texto', condicion('grupo_juvenil', 'Otro')),
      requerido('parroquia', 'Parroquia o comunidad de tu grupo', 'texto', { visible_si: { campo: 'grupo_juvenil', distinto: 'No pertenezco' }, ayuda: 'Si tu grupo no pertenece a una parroquia, escribe «N/A».' }),
      requerido('conocimientos_misiones', '¿Qué sabes de las Misiones y por qué te interesa participar?', 'texto_largo'),
      requerido('participacion_previa', '¿Has ido alguna vez de Misiones?', 'seleccion', { opciones: ['Sí', 'Nunca'] }),
      requerido('participaciones_veces', '¿Cuántas veces has participado?', 'seleccion', { opciones: ['1 ocasión', '2 ocasiones', '3 ocasiones', '4 ocasiones', '5 o más ocasiones'], ...condicion('participacion_previa', 'Sí') }),
    ];
  }
  return [
    campo('edad', 'Edad', 'numero', { minimo: 1, maximo: 120 }),
    campo('talla', 'Talla de camisa', 'seleccion', { obligatorio: true }),
    campo('licenciatura', 'Licenciatura', 'licenciatura'),
    campo('campus', 'Campus, institución o comunidad de procedencia'),
    campo('tipo_sangre', 'Tipo de sangre', 'seleccion', { opciones: [...TIPOS_SANGRE] }),
    campo('alergias', '¿Tienes alergias?', 'seleccion', { opciones: ['Sí', 'No'] }),
    campo('alergias_detalle', 'Describe tus alergias', 'texto_largo', condicion('alergias', 'Sí')),
    campo('tutor_nombre', 'Nombre del contacto de emergencia'),
    campo('tutor_parentesco', 'Parentesco del contacto de emergencia'),
    campo('tutor_telefono', 'Teléfono del contacto de emergencia'),
    campo('religion', 'Religión', 'seleccion', { opciones: ['Ninguna', 'Otra'] }),
    campo('religion_otro', 'Especifica tu religión', 'texto', condicion('religion', 'Otra')),
    campo('grupo_juvenil', 'Grupo juvenil', 'seleccion', { opciones: ['No pertenezco', 'Otro'] }),
    campo('grupo_juvenil_otro', 'Nombre de tu grupo juvenil', 'texto', condicion('grupo_juvenil', 'Otro')),
    campo('conocimientos_misiones', '¿Qué sabes de misiones?', 'texto_largo'),
    campo('participacion_previa', '¿Has asistido o ayudado en misiones?', 'seleccion', { opciones: ['Sí', 'No'] }),
    campo('participaciones_veces', '¿Cuántas veces has participado?', 'numero', { minimo: 1, maximo: 1000, ...condicion('participacion_previa', 'Sí') }),
    campo('experiencia_misiones', 'Describe tu experiencia y cómo has ayudado', 'texto_largo', condicion('participacion_previa', 'Sí')),
    campo('rol_mision', 'Rol en la misión', 'seleccion', { opciones: [...ROLES_MISION] }),
  ];
}

export function campoActividadVisible(campo, respuestas = {}) {
  if (!campo.visible_si) return true;
  const valor = respuestas[campo.visible_si.campo];
  return campo.visible_si.distinto !== undefined ? Boolean(valor) && valor !== campo.visible_si.distinto : valor === campo.visible_si.valor;
}

export function normalizarConfiguracionMisiones(valor) {
  if (!objeto(valor) || valor.version !== 2 || !Array.isArray(valor.productos) || valor.productos.length > 40) throw fallo('Revisa la configuración de Misiones');
  if (valor.formato !== undefined && valor.formato !== FORMATO_MEGAMISIONES) throw fallo('Formato de Misiones no válido');
  if (valor.codigo_documento != null && !UUID_MISIONES.test(valor.codigo_documento)) throw fallo('Selecciona un PDF del código de conducta válido');
  const ids = new Set();
  const productos = valor.productos.map((producto) => {
    if (!objeto(producto) || !UUID_MISIONES.test(producto.id_producto) || ids.has(producto.id_producto.toLowerCase())) throw fallo('Revisa los artículos promocionales');
    ids.add(producto.id_producto.toLowerCase());
    if (!(producto.precio_centavos === null && producto.activo === false) && (!Number.isSafeInteger(producto.precio_centavos) || producto.precio_centavos < 0 || producto.precio_centavos > 100000000)) throw fallo('Configura el precio antes de ofrecer el artículo');
    if (!Array.isArray(producto.tallas) || producto.tallas.length > 30) throw fallo('Revisa las tallas del artículo');
    const tallas = [...new Set(producto.tallas.map((talla) => texto(talla, 30, 'la talla', true)))];
    return {
      id_producto: producto.id_producto.toLowerCase(), nombre: texto(producto.nombre, 160, 'el nombre del artículo', true),
      precio_centavos: producto.precio_centavos, requiere_talla: producto.requiere_talla === true,
      tallas, activo: producto.activo !== false,
    };
  });
  return { version: 2, ...(valor.formato ? { formato: valor.formato, informacion_kit: texto(valor.informacion_kit ?? '', 2000, 'la información del kit') } : {}), codigo_documento: valor.codigo_documento?.toLowerCase() || null, codigo_obligatorio: valor.codigo_obligatorio === true, productos };
}

export function validarCamposMisiones(campos, configuracion = null) {
  const mega = esFormatoMegamisiones(configuracion);
  for (const base of camposMisiones(configuracion)) {
    const campo = campos.find((item) => item.clave === base.clave);
    if (!campo || campo.tipo !== base.tipo) throw fallo('Conserva las preguntas base de Misiones');
    if (base.clave === 'talla' && !campo.obligatorio) throw fallo('La talla de camisa es obligatoria');
    if (mega && base.obligatorio && !campo.obligatorio) throw fallo('Conserva las preguntas obligatorias de MEGAMISIONES');
    for (const clave of ['ayuda', 'no_futura', 'validacion']) {
      if (base[clave] !== undefined) campo[clave] = base[clave];
    }
    // Las condiciones son parte de la plantilla; el cliente no puede alterarlas.
    if (base.visible_si) {
      campo.visible_si = { ...base.visible_si };
      campo.obligatorio = true;
    } else delete campo.visible_si;
    if (base.tipo === 'numero') { campo.minimo = base.minimo; campo.maximo = base.maximo; }
    if ((mega && base.tipo === 'seleccion' && !['talla', 'religion', 'grupo_juvenil'].includes(base.clave)) || ['tipo_sangre', 'rol_mision', 'alergias', 'participacion_previa'].includes(base.clave)) {
      if (campo.opciones.length !== base.opciones.length || base.opciones.some((opcion) => !campo.opciones.includes(opcion))) throw fallo('Conserva las opciones de ' + base.etiqueta.toLowerCase());
    }
    if (['religion', 'grupo_juvenil'].includes(base.clave) && base.opciones.some((opcion) => !campo.opciones.includes(opcion))) throw fallo('Conserva las opciones ' + base.opciones.join(' y '));
  }
  return campos;
}

export function adoptarFormatoMegamisiones(edicion) {
  if (edicion.estado !== 'borrador' || esFormatoMegamisiones(edicion.configuracion_misiones)) throw fallo('El formato se puede adoptar en un borrador anterior sin inscripciones', 409);
  const configuracion = { ...configuracionMisionesInicial(), ...edicion.configuracion_misiones, formato: FORMATO_MEGAMISIONES };
  const anteriores = edicion.campos_registro || [];
  const clavesAnteriores = new Set([...camposMisiones().map((campo) => campo.clave), 'edad', 'talla', 'licenciatura']);
  const campos = camposMisiones(configuracion).map((base) => {
    const anterior = anteriores.find((campo) => campo.clave === base.clave && campo.tipo === base.tipo);
    if (!anterior) return base;
    return { ...anterior, ...base, ...(base.tipo === 'seleccion' && ['talla', 'religion', 'grupo_juvenil'].includes(base.clave)
      ? { opciones: [...new Set([...base.opciones, ...(anterior.textoOpciones?.split(/\r?\n/).map((opcion) => opcion.trim()).filter(Boolean) || anterior.opciones || [])])], textoOpciones: undefined } : {}) };
  });
  const clavesNuevas = new Set(campos.map((campo) => campo.clave));
  campos.push(...anteriores.filter((campo) => !clavesAnteriores.has(campo.clave) && !clavesNuevas.has(campo.clave)));
  if (campos.length > 25) throw fallo('El nuevo formato admite hasta cuatro preguntas adicionales. Retira las preguntas extra que sobren antes de adoptarlo.');
  return { configuracion_misiones: configuracion, campos_registro: campos };
}

export function validarTelefonoMisiones(valor) {
  if (typeof valor !== 'string' || !/^[+\d\s().-]{7,40}$/.test(valor)) throw fallo('Escribe un teléfono válido');
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length < 7 || digitos.length > 15) throw fallo('El teléfono debe contener entre 7 y 15 dígitos');
  return digitos;
}

export function validarContactoInvitado(datos) {
  if (!objeto(datos)) throw fallo('Revisa tus datos de contacto');
  const nombre_completo = texto(datos.nombre_completo, 150, 'tu nombre completo', true);
  const correo = texto(datos.correo, 254, 'tu correo', true).toLowerCase();
  const telefono = texto(datos.telefono, 40, 'tu teléfono', true);
  // Buscar los separadores evita el retroceso entre grupos de una expresión regular.
  const arroba = correo.indexOf('@');
  const dominio = correo.slice(arroba + 1);
  const punto = dominio.indexOf('.', 1);
  if (arroba < 1 || correo.indexOf('@', arroba + 1) !== -1 || /\s/.test(correo)
    || punto < 1 || punto >= dominio.length - 1) throw fallo('Escribe un correo válido');
  if (!/^[+\d\s().-]{7,40}$/.test(telefono) || telefono.replace(/\D/g, '').length < 7) throw fallo('Escribe un teléfono válido');
  return { nombre_completo, correo, telefono };
}

function seleccionPedido(seleccion) {
  if (!Array.isArray(seleccion) || seleccion.length > 40) throw fallo('Revisa los artículos de tu pedido');
  const claves = new Set();
  return seleccion.map((linea) => {
    if (!objeto(linea) || !UUID_MISIONES.test(linea.id_producto) || !Number.isInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > 99) throw fallo('Revisa las cantidades de tu pedido');
    const talla = texto(linea.talla ?? '', 30, 'la talla');
    const id_producto = linea.id_producto.toLowerCase();
    const clave = id_producto + ':' + talla;
    if (claves.has(clave)) throw fallo('No repitas un artículo con la misma talla');
    claves.add(clave);
    return { id_producto, cantidad: linea.cantidad, talla };
  });
}

export function cotizarPedidoMisiones(productos, seleccion, anterior = null) {
  const lineas = seleccionPedido(seleccion);
  const canon = (valores) => JSON.stringify(valores.map(({ id_producto, cantidad, talla }) => ({ id_producto, cantidad, talla })).sort((a, b) => (a.id_producto + a.talla).localeCompare(b.id_producto + b.talla)));
  if (anterior && canon(lineas) === canon(anterior.lineas)) return anterior;
  const cotizadas = lineas.map((linea) => {
    const producto = productos.find((item) => item.id_producto === linea.id_producto && item.activo);
    if (!producto) throw fallo('Hay artículos que ya no están disponibles. Actualiza tu pedido', 409);
    if (!Number.isSafeInteger(producto.precio_centavos) || producto.precio_centavos < 0) throw fallo('El encargado debe configurar el precio de ' + producto.nombre, 409);
    if (producto.requiere_talla && !producto.tallas.includes(linea.talla)) throw fallo('Selecciona una talla disponible para ' + producto.nombre);
    if (!producto.requiere_talla && linea.talla) throw fallo('Este artículo no requiere talla');
    return { ...linea, nombre: producto.nombre, precio_centavos: producto.precio_centavos, subtotal_centavos: producto.precio_centavos * linea.cantidad };
  });
  return { moneda: 'MXN', lineas: cotizadas, total_centavos: cotizadas.reduce((total, linea) => total + linea.subtotal_centavos, 0) };
}
