export const PARTICIPACION = [
  { valor: 'masculina', etiqueta: 'Varonil' },
  { valor: 'femenina', etiqueta: 'Femenil' },
  { valor: 'mixta', etiqueta: 'Mixto' },
];

export const NIVELES = [
  { id_nivel: 1, nombre_nivel: 'principiante', etiqueta: 'Principiante' },
  { id_nivel: 2, nombre_nivel: 'intermedio', etiqueta: 'Intermedio' },
  { id_nivel: 3, nombre_nivel: 'avanzado', etiqueta: 'Avanzado' },
];

export const CUPOS_CLUB = [10, 15, 20, 25, 30, 40, 50];

export function etiquetaParticipacion(valor) {
  return PARTICIPACION.find((p) => p.valor === valor)?.etiqueta || valor || '';
}

export function etiquetaNivel(idNivel) {
  return NIVELES.find((n) => n.id_nivel === idNivel)?.etiqueta || '';
}
