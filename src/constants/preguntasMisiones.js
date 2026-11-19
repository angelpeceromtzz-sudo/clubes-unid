import { esFormatoMegamisiones } from '../../shared/actividades.js';

export const GRUPOS_PREGUNTAS_MISIONES = [
  { titulo: 'Datos personales', descripcion: 'Edad, prendas, licenciatura y procedencia.', claves: ['edad', 'talla', 'licenciatura', 'campus'] },
  { titulo: 'Salud y contacto de emergencia', descripcion: 'Tipo de sangre, alergias y persona de contacto.', claves: ['tipo_sangre', 'alergias', 'alergias_detalle', 'tutor_nombre', 'tutor_parentesco', 'tutor_telefono'] },
  { titulo: 'Religión y grupo juvenil', descripcion: 'Opciones de religión y pertenencia a un grupo juvenil.', claves: ['religion', 'religion_otro', 'grupo_juvenil', 'grupo_juvenil_otro'] },
  { titulo: 'Experiencia y rol', descripcion: 'Conocimientos, participación previa y rol en la misión.', claves: ['conocimientos_misiones', 'participacion_previa', 'participaciones_veces', 'experiencia_misiones', 'rol_mision'] },
];

const GRUPOS_MEGAMISIONES = [
  { id: 'contacto', titulo: 'Presentación y contacto', descripcion: 'Tu inscripción y los avisos de esta misión.', claves: [] },
  { id: 'personales', titulo: 'Datos personales', descripcion: 'Identidad, procedencia y participación en UNID.', claves: ['fecha_nacimiento', 'sexo', 'rol_mision', 'campus', 'familia_unid', 'cuatrimestre'] },
  { id: 'salud', titulo: 'Salud y emergencia', descripcion: 'Información para que el equipo pueda apoyarte durante la misión.', claves: ['tipo_sangre', 'alergias_medicamentos', 'alergias_alimentos', 'enfermedades', 'tutor_nombre', 'tutor_telefono'] },
  { id: 'logistica', titulo: 'Logística', descripcion: 'Playera, kit y artículos opcionales de esta edición.', claves: ['talla'] },
  { id: 'experiencia', titulo: 'Datos religiosos y experiencia', descripcion: 'Tu comunidad, motivación y experiencia en Misiones.', claves: ['religion', 'religion_otro', 'grupo_juvenil', 'grupo_juvenil_otro', 'parroquia', 'conocimientos_misiones', 'participacion_previa', 'participaciones_veces'] },
];

export function gruposPreguntasMisiones(configuracion) {
  return esFormatoMegamisiones(configuracion) ? GRUPOS_MEGAMISIONES : GRUPOS_PREGUNTAS_MISIONES;
}
