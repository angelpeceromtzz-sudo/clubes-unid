export const TIPOS_FECHA = [
  { value: 'examen', label: 'Exámenes', emoji: '📝', icono: 'clipboard' },
  { value: 'pago', label: 'Pagos', emoji: '💳', icono: 'calendar' },
  { value: 'vacaciones', label: 'Vacaciones', emoji: '🗓️', icono: 'sun' },
  { value: 'academico', label: 'Cuatrimestre', emoji: '🎓', icono: 'book' },
  { value: 'calificaciones', label: 'Calificaciones', emoji: '📊', icono: 'chart-bar' },
  { value: 'inhabil', label: 'Días inhábiles', emoji: '🚫', icono: 'alert-triangle' },
  { value: 'tramite', label: 'Trámites', emoji: '📋', icono: 'file' },
];

export const CONCEPTOS_CALENDARIO = [
  { titulo: 'Inicio de cuatrimestre', tipo: 'academico' },
  { titulo: '1er parcial', tipo: 'examen' },
  { titulo: '2do parcial', tipo: 'examen' },
  { titulo: 'Examen final', tipo: 'examen' },
  { titulo: 'Fecha límite para subir calificaciones ESCO', tipo: 'calificaciones' },
  ...['M1', 'M2', 'M3'].map((modulo) => ({ titulo: `Fecha límite para subir calificaciones ${modulo}`, tipo: 'calificaciones' })),
  { titulo: 'Fin de cuatrimestre', tipo: 'academico' },
  { titulo: 'Solicitud de extraordinarios', tipo: 'tramite' },
  { titulo: 'Día inhábil', tipo: 'inhabil' },
  { titulo: 'Vacaciones cuatrimestrales', tipo: 'vacaciones' },
  { titulo: 'Fecha límite de pago', tipo: 'pago' },
];

export function tipoFecha(valor) {
  return TIPOS_FECHA.find((tipo) => tipo.value === valor) || TIPOS_FECHA.find((tipo) => tipo.value === 'academico');
}
