/* Constantes compartidas del módulo de Asistencia (frontend). */

// Estados efectivos de una sesión (PBI-05 §17) -> etiqueta y color de badge.
export const ESTADOS_SESION = {
  pendiente: { label: 'Pendiente', color: 'blue' },
  en_progreso: { label: 'En progreso', color: 'indigo' },
  completada: { label: 'Completada', color: 'emerald' },
  cancelada: { label: 'Cancelada', color: 'red' },
  no_registrada: { label: 'No registrada', color: 'slate' },
  no_completada: { label: 'No completada', color: 'yellow' },
};

// Catálogo de motivos de cancelación (debe coincidir con cat_motivos_cancelacion).
export const MOTIVOS_CANCELACION = [
  { codigo: 'evento_institucional', label: 'Evento institucional' },
  { codigo: 'clima', label: 'Condiciones climáticas' },
  { codigo: 'instalaciones', label: 'Instalaciones no disponibles' },
  { codigo: 'ausencia_responsable', label: 'Ausencia del responsable' },
  { codigo: 'dia_inhabil', label: 'Día inhábil o suspensión institucional' },
  { codigo: 'otro', label: 'Otro' },
];

// Estados de asistencia del integrante (PBI-05 §11) -> botones de la toma.
export const ESTADOS_ASISTENCIA = [
  { valor: 'presente', label: 'Presente', corto: 'P', colorSeleccion: 'bg-emerald-500 text-black border-emerald-400', colorBase: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15' },
  { valor: 'ausente', label: 'Ausente', corto: 'A', colorSeleccion: 'bg-red-500 text-white border-red-400', colorBase: 'border-red-500/40 text-red-400 hover:bg-red-500/15' },
  { valor: 'justificado', label: 'Justificado', corto: 'J', colorSeleccion: 'bg-amber-400 text-[#0e162c] border-amber-300', colorBase: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/15' },
];

// Colores de porcentaje de asistencia (§29 — umbrales referenciales).
export function colorPorcentaje(porcentaje) {
  if (porcentaje === null || porcentaje === undefined) return 'text-slate-400';
  if (porcentaje >= 90) return 'text-emerald-400';
  if (porcentaje >= 70) return 'text-amber-400';
  return 'text-red-400';
}

// Clave de localStorage del indicador visual de autoguardado por sesión.
export function claveLocalAsistencia(idSesion) {
  return `unid_asistencia_sesion_${idSesion}`;
}
