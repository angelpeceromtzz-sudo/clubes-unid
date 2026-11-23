// Presentación del onboarding de preferencias. Los datos (categorías,
// actividades y motivaciones) llegan del backend; aquí solo viven iconos y
// textos asociados por nombre o código.

export const TOTAL_PASOS_ONBOARDING = 10;

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

export const DECISIONES_CORREO_ONBOARDING = Object.freeze([
  { valor: 'aceptar', etiqueta: 'Sí, quiero recibir novedades por correo' },
  { valor: 'rechazar', etiqueta: 'No, no quiero recibir correos opcionales' },
]);

// Opcionales visibles: convocatorias, eventos, noticias, recordatorios.
// 'mis_clubes' es legacy (no se muestra): si el alumno es miembro, las
// comunicaciones de su club llegan por el canal operativo; si no es miembro,
// no recibe notificaciones de clubes. Las convocatorias solo se envían si el
// alumno NO pertenece a ningún club.
export const TIPOS_CORREO_ONBOARDING = Object.freeze([
  {
    id: 'clubes_convocatorias',
    titulo: 'Clubes y convocatorias',
    descripcion: 'Nuevos clubes y convocatorias que coincidan con tus intereses (solo si no perteneces a un club).',
    icono: 'trophy',
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
