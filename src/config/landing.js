// Contenido editable de la landing pública /conoce-clubs.
//
// El slug de la encuesta es la única pieza que se activa al publicarla:
// mientras sea null, los CTAs de la landing muestran un estado honesto y no
// navegan a ninguna ruta. Al tener el enlace real, se asigna el slug y los
// botones apuntan a /encuesta/<slug> (ver rutaEncuesta()).

export const ENCUESTA_SLUG = null;

export function hayEncuesta() {
  return Boolean(ENCUESTA_SLUG);
}

export function rutaEncuesta() {
  return hayEncuesta() ? `/encuesta/${ENCUESTA_SLUG}` : null;
}

export const LANDING = {
  nombre: 'Clubs UNID Campeche',
  kicker: 'Iniciativa estudiantil',
  invitacion:
    'Explora intereses, comparte actividades y conoce compañeros que disfrutan lo mismo que tú. Así se empieza a construir un club.',
  // Composición del panel del hero: experiencia + identidad + dato real.
  // "Clubs Lobos Rojos" es el nombre con el que el sistema ya presenta los
  // clubes (navbar y pie); aquí se explicita su relación con el nombre de la
  // iniciativa sin atribuirle una definición institucional nueva.
  heroPanel: {
    identidadRotulo: 'Clubs Lobos Rojos',
    identidadRelacion: 'Así se presenta la comunidad de clubes de UNID Campeche.',
    experienciasTitulo: 'En el campus podrías',
    experiencias: [
      { icono: 'zap', texto: 'Entrenar y competir' },
      { icono: 'pencil', texto: 'Crear y expresarse' },
      { icono: 'grid', texto: 'Construir proyectos' },
      { icono: 'users', texto: 'Servir a la comunidad' },
    ],
    propuestasCount: (n) =>
      n === 1
        ? '1 propuesta de club esperando tu interés'
        : `${n} propuestas de club esperando tu interés`,
  },
  equipo: ['Ángel Pecero', 'Jorge Martínez', 'Gustavo Gallegos'],
  proposito:
    'Clubs UNID Campeche es una iniciativa estudiantil que busca acercar a los alumnos a actividades que les interesan, conocer qué propuestas querrían ver en el campus y orientar las próximas decisiones sobre clubes.',
  equipoTitulo: 'A cargo de',
  secciones: [
    { href: '#que-es-un-club', etiqueta: 'Qué es un club' },
    { href: '#propuestas', etiqueta: 'Propuestas' },
    { href: '#encuesta', etiqueta: 'Encuesta' },
    { href: '#acerca', etiqueta: 'Acerca' },
  ],
  queEsClub: {
    titulo: '¿Qué es un club universitario?',
    texto:
      'Un club es un espacio donde estudiantes con intereses comunes se juntan para aprender, practicar y compartir. No es una clase: es un grupo que se organiza para hacer algo que les gusta.',
    ejemplos: [
      {
        titulo: 'Deporte y movimiento',
        detalle: 'Entrenamientos, partidos amistosos y preparación para torneos.',
        icono: 'zap',
      },
      {
        titulo: 'Arte y cultura',
        detalle: 'Talleres de dibujo, música, lectura o escritura creativa.',
        icono: 'pencil',
      },
      {
        titulo: 'Tecnología y juegos',
        detalle: 'Proyectos, retos y torneos competitivos.',
        icono: 'grid',
      },
      {
        titulo: 'Comunidad',
        detalle: 'Voluntariado, campañas y acciones de apoyo al entorno.',
        icono: 'users',
      },
    ],
  },
  propuestas: {
    titulo: 'Explora las propuestas de clubes',
    subtitulo:
      'Estas son algunas de las ideas que se están considerando para el campus. Puede que aún no estén en operación: tu interés ayuda a decidir cuáles avanzan.',
    vacio:
      'Todavía no hay propuestas visibles. Vuelve pronto para conocer las ideas que se están considerando.',
    mostrarMas: 'Mostrar más',
    error:
      'No se pudieron cargar las propuestas en este momento. Puede ser una falla temporal del servicio.',
    errorReintentar: 'Reintentar',
  },
  encuesta: {
    titulo: 'Tu opinión ayuda a dar forma al proyecto',
    subtitulo:
      'La encuesta busca conocer qué te interesa, cómo prefieres participar, cuánto tiempo podrías dedicar y qué obstáculos tendrías. Con eso se orientan las decisiones sobre clubes.',
    aclaracion:
      'Responder expresa interés. No es una inscripción, no reserva un lugar ni garantiza que un club se abra.',
    sinDestino:
      'La encuesta se publicará pronto. Por ahora puedes explorar las propuestas y volver cuando esté disponible.',
    btnDisponible: 'Responder la encuesta',
    btnNoDisponible: 'Encuesta en preparación',
    propositos: [
      { icono: 'star', etiqueta: 'Intereses' },
      { icono: 'filter', etiqueta: 'Preferencias' },
      { icono: 'clock', etiqueta: 'Disponibilidad' },
      { icono: 'alert-triangle', etiqueta: 'Obstáculos' },
    ],
  },
  explorar: {
    btn: 'Explorar los clubes',
    seccionPropuestas: 'propuestas',
  },
  // Modelo de Formación Integral (MFI) de UNID, en versión breve para la
  // landing. No es una sección con chip propio: aparece después de la
  // encuesta para situar los clubes dentro de la formación, sin interrumpir
  // el recorrido propuestas → encuesta.
  mfi: {
    kicker: 'Modelo de Formación Integral',
    titulo: 'Tus intereses también te forman',
    intro:
      'El Modelo de Formación Integral de UNID pone en el centro tus valores y en experiencias significativas, dentro y fuera del aula, para impactar en tu vida y transformar tu entorno.',
    valoresTitulo: 'Seis valores que caminan contigo',
    valores: ['Verdad', 'Confianza', 'Respeto', 'Solidaridad', 'Fraternidad', 'Caridad'],
    dimensiones: [
      {
        icono: 'users',
        titulo: 'Impacto social',
        texto: 'Participar y ser agente de cambio dentro y fuera de la Universidad.',
      },
      {
        icono: 'zap',
        titulo: 'Vida universitaria',
        texto: 'Deporte, arte, cultura y liderazgo: entrenar para un torneo, estrenar en un taller o liderar una campaña.',
      },
      {
        icono: 'sun',
        titulo: 'Espiritualidad',
        texto: 'Fe viva con retiros, misiones y acompañamiento personalizado.',
      },
    ],
    puente: 'Los clubes son una puerta de entrada a esta vida universitaria. Tu interés puede ser el primer paso.',
  },
};
