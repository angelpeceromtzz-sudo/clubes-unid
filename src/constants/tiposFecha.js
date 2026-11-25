export const TIPOS_FECHA = [
  { value: 'examen', label: 'Exámenes', icono: 'clipboard-pen' },
  { value: 'pago', label: 'Pagos', icono: 'credit-card' },
  { value: 'vacaciones', label: 'Vacaciones', icono: 'palm-tree' },
  { value: 'academico', label: 'Cuatrimestre', icono: 'graduation-cap' },
  { value: 'calificaciones', label: 'Calificaciones', icono: 'chart-bar' },
  { value: 'inhabil', label: 'Días inhábiles', icono: 'calendar-off' },
  { value: 'tramite', label: 'Trámites', icono: 'file-check' },
];

const ESTILOS_TIPO_FECHA = {
  examen: { claro: 'border-violet-200 bg-violet-50 text-violet-700', oscuro: 'border-violet-400/30 bg-violet-400/10 text-violet-300' },
  pago: { claro: 'border-emerald-200 bg-emerald-50 text-emerald-700', oscuro: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  vacaciones: { claro: 'border-cyan-200 bg-cyan-50 text-cyan-700', oscuro: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' },
  academico: { claro: 'border-[#e8ddb9] bg-[#fbf7ea] text-[#8b6a1f]', oscuro: 'border-[#d6b866]/35 bg-[#d6b866]/10 text-[#e3ca82]' },
  calificaciones: { claro: 'border-blue-200 bg-blue-50 text-blue-700', oscuro: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
  inhabil: { claro: 'border-[#c7cdd3] bg-[#f4f5f6] text-[#5e666f]', oscuro: 'border-[#aeb5bc]/45 bg-[#aeb5bc]/12 text-[#dbe0e5]' },
  tramite: { claro: 'border-red-200 bg-red-50 text-red-700', oscuro: 'border-red-400/30 bg-red-400/10 text-red-300' },
};

export function estiloTipoFecha(valor, modoOscuro) {
  return ESTILOS_TIPO_FECHA[tipoFecha(valor).value][modoOscuro ? 'oscuro' : 'claro'];
}

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
