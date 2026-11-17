const formatoNumero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

export const COLORES_GRAFICA = [
  'var(--grafica-ambar)',
  'var(--grafica-azul)',
  'var(--grafica-turquesa)',
  'var(--grafica-arena)',
  'var(--grafica-indigo)',
  'var(--grafica-neutral)',
];

export function numeroGrafica(valor) {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function formatoGrafica(valor, unidad = '') {
  const numero = numeroGrafica(valor);
  if (numero === null) return 'Sin registros';
  const singular = { integrantes: 'integrante', respuestas: 'respuesta', alumnos: 'alumno', plazas: 'plaza' };
  const etiqueta = numero === 1 ? (singular[unidad] ?? unidad) : unidad;
  return `${formatoNumero.format(numero)}${etiqueta ? ` ${etiqueta}` : ''}`;
}

export function lineasEtiqueta(valor, longitud = 20, maximo = 3) {
  const palabras = String(valor ?? '').trim().split(/\s+/);
  const lineas = [];
  let linea = '';
  for (const palabra of palabras) {
    const partes = palabra.match(new RegExp(`.{1,${longitud}}`, 'gu')) ?? [''];
    for (const parte of partes) {
      if (linea && `${linea} ${parte}`.length > longitud) {
        lineas.push(linea);
        linea = parte;
      } else {
        linea = linea ? `${linea} ${parte}` : parte;
      }
    }
  }
  if (linea) lineas.push(linea);
  if (lineas.length > maximo) return [...lineas.slice(0, maximo - 1), `${lineas[maximo - 1].slice(0, longitud - 1)}…`];
  return lineas;
}

// El pastel conserva el total y el detalle completo al agrupar categorías pequeñas.
// Un dato desconocido o negativo invalida la composición: no se omite en silencio.
export function prepararPastel(datos = [], dataKey = 'valor', labelKey = 'nombre', maximo = 6) {
  const filas = datos.map((fila, indice) => ({
    id: fila.id ?? fila.id_opcion ?? `categoria-${indice}`,
    nombre: String(fila[labelKey] ?? ''),
    valor: numeroGrafica(fila[dataKey]),
    color: fila.color,
  }));
  if (filas.some((fila) => fila.valor === null || fila.valor < 0)) {
    return { valida: false, total: null, filas, sectores: [] };
  }
  const total = filas.reduce((suma, fila) => suma + fila.valor, 0);
  const positivas = filas.filter((fila) => fila.valor > 0);
  const limite = Math.max(2, Math.trunc(maximo));
  let sectores = positivas;
  if (positivas.length > limite) {
    const ordenadas = [...positivas].sort((a, b) => b.valor - a.valor);
    sectores = [
      ...ordenadas.slice(0, limite - 1),
      {
        id: 'otras-categorias',
        nombre: 'Otras opciones',
        valor: ordenadas.slice(limite - 1).reduce((suma, fila) => suma + fila.valor, 0),
        color: 'var(--grafica-neutral)',
        agrupada: true,
      },
    ];
  }
  return {
    valida: true,
    total,
    filas: filas.map((fila) => ({ ...fila, porcentaje: total > 0 ? (fila.valor / total) * 100 : null })),
    sectores: sectores.map((fila, indice) => ({ ...fila, color: fila.color ?? COLORES_GRAFICA[indice % COLORES_GRAFICA.length], porcentaje: (fila.valor / total) * 100 })),
  };
}

export function prepararOcupacion(datos = []) {
  return datos.map((fila) => {
    const ocupado = numeroGrafica(fila.ocupado);
    const cupo = numeroGrafica(fila.cupo);
    const porcentaje = ocupado !== null && ocupado >= 0 && cupo !== null && cupo > 0
      ? (ocupado / cupo) * 100
      : null;
    return {
      ...fila,
      ocupado,
      cupo,
      porcentaje,
      porcentajeOcupado: porcentaje === null ? null : Math.min(porcentaje, 100),
      porcentajeDisponible: porcentaje === null ? null : Math.max(100 - porcentaje, 0),
      disponible: porcentaje === null ? null : Math.max(cupo - ocupado, 0),
      exceso: porcentaje === null ? 0 : Math.max(ocupado - cupo, 0),
    };
  });
}

export function admitePastel(pregunta) {
  if (!pregunta || !['opcion_unica', 'licenciatura'].includes(pregunta.tipo)) return false;
  const base = numeroGrafica(pregunta.respuestas);
  const composicion = prepararPastel(pregunta.opciones ?? [], 'conteo', 'texto');
  return composicion.valida && base > 0 && composicion.total === base;
}
