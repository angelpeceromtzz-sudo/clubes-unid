// Presentación del onboarding de preferencias. Los datos (categorías,
// actividades y motivaciones) llegan del backend; aquí solo viven iconos y
// textos asociados por nombre o código.

export const TOTAL_PASOS_ONBOARDING = 5;

export const ICONO_CATEGORIA = Object.freeze({
  Deportivos: 'trophy',
  Culturales: 'palette',
  Sociales: 'heart-handshake',
  Tecnología: 'cpu',
});

export const DESCRIPCION_CATEGORIA = Object.freeze({
  Deportivos: 'Actividad física, competencias y trabajo en equipo.',
  Culturales: 'Arte, música, creatividad y expresión.',
  Sociales: 'Comunidad, bienestar y actividades espirituales.',
  Tecnología: 'Programación, robótica y proyectos digitales.',
});

export const ICONO_MOTIVACION = Object.freeze({
  amistades: 'users',
  aprender: 'book-open',
  condicion_fisica: 'activity',
  talentos: 'star',
  comunidad: 'hand-heart',
  bienestar: 'heart',
});

export const GENEROS_ONBOARDING = Object.freeze([
  { valor: 'mujer', etiqueta: 'Mujer' },
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'otra_identidad', etiqueta: 'Otra identidad' },
  { valor: 'prefiero_no_responder', etiqueta: 'Prefiero no responder' },
]);

export const FRECUENCIAS_ONBOARDING = Object.freeze([
  { valor: 'inmediata', etiqueta: 'En cuanto haya una novedad' },
  { valor: 'diaria', etiqueta: 'Resumen diario' },
  { valor: 'semanal', etiqueta: 'Resumen semanal' },
]);

export const TIPOS_CORREO_ONBOARDING = Object.freeze([
  {
    id: 'clubes_convocatorias',
    titulo: 'Clubes y convocatorias',
    descripcion: 'Nuevos clubes y convocatorias que coincidan con tus intereses.',
    icono: 'trophy',
  },
  {
    id: 'mis_clubes',
    titulo: 'Notificaciones de mis clubes',
    descripcion: 'Avisos, novedades y mensajes de los clubes en los que participas.',
    icono: 'bell',
  },
  {
    id: 'eventos',
    titulo: 'Eventos universitarios',
    descripcion: 'Próximos eventos y actividades de la universidad.',
    icono: 'calendar-days',
  },
  {
    id: 'noticias',
    titulo: 'Noticias y novedades',
    descripcion: 'Publicaciones y noticias de la comunidad UNID.',
    icono: 'newspaper',
  },
  {
    id: 'recordatorios',
    titulo: 'Recordatorios de actividades',
    descripcion: 'Avisos sobre próximas sesiones y actividades programadas.',
    icono: 'clock-3',
  },
]);
