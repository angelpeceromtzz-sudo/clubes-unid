// Reglas puras compartidas por el formulario, el servidor y sus pruebas.
export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ROLES_MISION = ['Responsable', 'Misionero'];
export const UUID_MISIONES = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fallo = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });
const objeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor, maximo, etiqueta, requerido = false) => {
  if (typeof valor !== 'string' || valor.trim().length > maximo || (requerido && !valor.trim())) throw fallo('Revisa ' + etiqueta);
  return valor.trim();
};

export function configuracionMisionesInicial() {
  return { version: 2, codigo_documento: null, codigo_obligatorio: false, productos: [] };
}

export function esMisionesNueva(edicion) {
  return edicion?.plantilla === 'misiones' && edicion?.configuracion_misiones?.version === 2;
}

export function camposMisiones() {
  const campo = (clave, etiqueta, tipo = 'texto', extra = {}) => ({ clave, etiqueta, tipo, obligatorio: false, opciones: [], ...extra });
  const condicion = (clave, valor) => ({ visible_si: { campo: clave, valor }, obligatorio: true });
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
  return !campo.visible_si || respuestas[campo.visible_si.campo] === campo.visible_si.valor;
}

export function normalizarConfiguracionMisiones(valor) {
  if (!objeto(valor) || valor.version !== 2 || !Array.isArray(valor.productos) || valor.productos.length > 40) throw fallo('Revisa la configuración de Misiones');
  if (valor.codigo_documento != null && !UUID_MISIONES.test(valor.codigo_documento)) throw fallo('Selecciona un PDF del código de conducta válido');
  const ids = new Set();
  const productos = valor.productos.map((producto) => {
    if (!objeto(producto) || !UUID_MISIONES.test(producto.id_producto) || ids.has(producto.id_producto.toLowerCase())) throw fallo('Revisa los artículos promocionales');
    ids.add(producto.id_producto.toLowerCase());
    if (!Number.isSafeInteger(producto.precio_centavos) || producto.precio_centavos < 0 || producto.precio_centavos > 100000000) throw fallo('Revisa el precio del artículo');
    if (!Array.isArray(producto.tallas) || producto.tallas.length > 30) throw fallo('Revisa las tallas del artículo');
    const tallas = [...new Set(producto.tallas.map((talla) => texto(talla, 30, 'la talla', true)))];
    return {
      id_producto: producto.id_producto.toLowerCase(), nombre: texto(producto.nombre, 160, 'el nombre del artículo', true),
      precio_centavos: producto.precio_centavos, requiere_talla: producto.requiere_talla === true,
      tallas, activo: producto.activo !== false,
    };
  });
  return { version: 2, codigo_documento: valor.codigo_documento?.toLowerCase() || null, codigo_obligatorio: valor.codigo_obligatorio === true, productos };
}

export function validarCamposMisiones(campos) {
  for (const base of camposMisiones()) {
    const campo = campos.find((item) => item.clave === base.clave);
    if (!campo || campo.tipo !== base.tipo) throw fallo('Conserva las preguntas base de Misiones');
    if (base.clave === 'talla' && !campo.obligatorio) throw fallo('La talla de camisa es obligatoria');
    // Las condiciones son parte de la plantilla; el cliente no puede alterarlas.
    if (base.visible_si) {
      campo.visible_si = { ...base.visible_si };
      campo.obligatorio = true;
    } else delete campo.visible_si;
    if (base.tipo === 'numero') { campo.minimo = base.minimo; campo.maximo = base.maximo; }
    if (['tipo_sangre', 'rol_mision', 'alergias', 'participacion_previa'].includes(base.clave)) {
      if (campo.opciones.length !== base.opciones.length || base.opciones.some((opcion) => !campo.opciones.includes(opcion))) throw fallo('Conserva las opciones de ' + base.etiqueta.toLowerCase());
    }
    if (['religion', 'grupo_juvenil'].includes(base.clave) && base.opciones.some((opcion) => !campo.opciones.includes(opcion))) throw fallo('Conserva las opciones ' + base.opciones.join(' y '));
  }
  return campos;
}

export function validarContactoInvitado(datos) {
  if (!objeto(datos)) throw fallo('Revisa tus datos de contacto');
  const nombre_completo = texto(datos.nombre_completo, 150, 'tu nombre completo', true);
  const correo = texto(datos.correo, 254, 'tu correo', true).toLowerCase();
  const telefono = texto(datos.telefono, 40, 'tu teléfono', true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw fallo('Escribe un correo válido');
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
    if (producto.requiere_talla && !producto.tallas.includes(linea.talla)) throw fallo('Selecciona una talla disponible para ' + producto.nombre);
    if (!producto.requiere_talla && linea.talla) throw fallo('Este artículo no requiere talla');
    return { ...linea, nombre: producto.nombre, precio_centavos: producto.precio_centavos, subtotal_centavos: producto.precio_centavos * linea.cantidad };
  });
  return { moneda: 'MXN', lineas: cotizadas, total_centavos: cotizadas.reduce((total, linea) => total + linea.subtotal_centavos, 0) };
}
