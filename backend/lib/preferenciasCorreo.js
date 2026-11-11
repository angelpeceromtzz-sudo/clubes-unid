// Clasificación de los correos de Clubs UNID y consentimiento de los opcionales.
//
// Solo los correos de la clase "opcional" dependen de las preferencias del
// alumno. Los operativos, transaccionales y de seguridad se envían siempre y
// nunca consultan preferencias_usuario. Esta fase no envía ningún correo.

export const TIPOS_CORREO_OPCIONAL = Object.freeze([
  'clubes_convocatorias',
  'mis_clubes',
  'eventos',
  'noticias',
  'recordatorios',
]);

export const FRECUENCIAS_CORREO = Object.freeze(['inmediata', 'diaria', 'semanal']);

export const CORREOS_NO_CONFIGURABLES = Object.freeze([
  { clase: 'transaccional', descripcion: 'Códigos de acceso y mensajes de tu cuenta.' },
  { clase: 'seguridad', descripcion: 'Alertas de seguridad de tu cuenta.' },
  { clase: 'operativo', descripcion: 'Resultados de tus postulaciones e inscripciones a clubes.' },
]);

// Versión publicada del aviso de privacidad. Mientras no exista una versión
// publicada se registra NULL: nunca un valor provisional.
const versionAvisoEnv = process.env.VERSION_AVISO_PREFERENCIAS?.trim() || null;
if (versionAvisoEnv && versionAvisoEnv.length > 40) {
  throw new Error('VERSION_AVISO_PREFERENCIAS supera los 40 caracteres permitidos por la columna version_aviso');
}
export const VERSION_AVISO_PUBLICADA = versionAvisoEnv;
