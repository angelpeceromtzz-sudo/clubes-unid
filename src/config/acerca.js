// Contenido editable de la página pública /acerca-del-proyecto.
//
// Reglas de exactitud (revisar antes de editar):
// - No inventar nombres, cargos, testimonios, fechas ni metodología.
// - Los campos en null no se muestran en la página pública (sin textos
//   «pendiente» ni perfiles ficticios); se dejan listos para completarlos.
// - La colaboración del periódico mural está en conversación: redactarla
//   como algo propuesto, nunca como trabajo ya entregado.
// - El proyecto es una iniciativa estudiantil de un proyecto académico; no
//   afirmar adopción institucional oficial si no está confirmada.
//
// Modelo por persona (equipo y colaboradores):
// - nombre:  identidad pública (obligatorio para publicar el perfil).
// - rol:     relación real con el proyecto; en el equipo es el cargo
//            principal (null → no se muestra la línea).
// - aportacion: descripción breve de la persona (null → no se muestra).
// - roles:   roles de trabajo complementarios (solo equipo de desarrollo);
//            se muestran como línea discreta. Son roles del trabajo en el
//            proyecto, no permisos ni roles de usuario del sistema.
// - responsabilidades: lista completa de responsabilidades; se conserva
//            como información estructurada en esta configuración y NO se
//            renderiza en la página (evita presentarlas como logros).
// - frase:   cita personal aprobada por la persona (null → no se reserva
//            espacio; solo se publica con su autorización).
// - foto:    ruta en public/ (null → silueta ámbar provisional).
// - mostrarFoto: autorización explícita de publicación. Tener la foto en el
//            repositorio NO significa mostrarla: debe ser true y la persona
//            debe haberla autorizado.
// - visible: false → el perfil completo se omite (para quien no desea
//            aparecer públicamente). No publicar perfiles anónimos.
//
// PENDIENTE (documentar, no renderizar):
// - Fotos de cada persona + su autorización (mostrarFoto) — por ahora todas
//   null: se muestra la silueta ámbar provisional.
// - Frases personales aprobadas por cada integrante/colaborador.
//
// Ejemplo de perfil omitido (persona que no desea aparecer):
//   { nombre: 'Nombre autorizado', rol: null, aportacion: null, frase: null,
//     foto: null, mostrarFoto: false, visible: false }

export const RUTA_ACERCA = '/acerca-del-proyecto';

export const ACERCA = {
  nombre: 'Acerca de Clubs UNID',
  kicker: 'Iniciativa estudiantil',
  intro:
    'Detrás de Clubs UNID hay un equipo estudiantil que construye una propuesta para acercar a los alumnos a actividades que les interesan. Aquí contamos de dónde viene la idea y quién la hace posible.',
  comoNacio: {
    titulo: 'Cómo nació',
    // Frase del texto aprobado destacada en la composición editorial.
    destacado:
      'Esa inquietud tomó forma cuando un profesor propuso desarrollar una aplicación que resolviera un problema real.',
    texto: [
      'Clubs UNID nació de la experiencia de encontrar pocas oportunidades para participar de forma constante en actividades extracurriculares. Esa inquietud tomó forma cuando un profesor propuso desarrollar una aplicación que resolviera un problema real.',
      'Desde entonces, el proyecto ha crecido con el trabajo del equipo y las ideas, orientación y colaboración de la comunidad universitaria. Su propósito es abrir más oportunidades para que los estudiantes desarrollen sus intereses y encuentren un espacio donde participar y pertenecer.',
    ],
    // Hitos discretos tomados del propio relato (sin fechas).
    hitos: [
      'La necesidad detectada',
      'El proyecto universitario',
      'El crecimiento con la comunidad',
    ],
    // Fotografía opcional de la vida universitaria de UNID Campeche (no es
    // un momento de Clubs UNID): se muestra con leyenda honesta. Reemplazar
    // por una foto propia del proyecto cuando exista autorización.
    imagen: {
      src: '/como-nacio.jpeg',
      alt: 'Estudiantes de UNID Campeche en el campus',
      leyenda: 'Vida universitaria en UNID Campeche',
    },
  },
  paraQuien: {
    titulo: 'Para quién lo construimos',
    // Título protagonista: fragmento literal del texto aprobado.
    protagonista: 'Estudiantes de UNID Campeche',
    texto: [
      'Clubs UNID está pensado para los estudiantes de UNID Campeche y para quienes organizan, coordinan y acompañan la vida universitaria.',
      'Buscamos facilitar que los alumnos conozcan las actividades disponibles, participen y den continuidad a sus intereses. También desarrollamos herramientas para apoyar su organización y seguimiento.',
      'Dentro del proyecto académico, el rector participa como beneficiario y aporta necesidades que orientan su desarrollo. Las opiniones de los alumnos, las conversaciones con colaboradores y las pruebas del sistema nos ayudan a mejorar la propuesta.',
    ],
    // Subtítulos de los bloques secundarios (fragmentos del texto aprobado).
    organizadoresTitulo: 'Quienes organizan y coordinan',
    rectorTitulo: 'El rector, beneficiario académico',
    // Fotografía opcional: estudiantes participando en una actividad del
    // campus (no es un momento de Clubs UNID). Misma regla de reemplazo.
    imagen: {
      src: '/para-quien.jpeg',
      alt: 'Estudiantes de UNID Campeche interactuando con una niña durante una actividad en el campus',
      leyenda: 'Estudiantes de UNID Campeche en actividad universitaria',
    },
  },
  equipo: {
    titulo: 'Equipo de desarrollo',
    intro: 'Estudiantes que diseñan, construyen y presentan el proyecto.',
    // Roles y responsabilidades confirmados por el equipo (roles de trabajo
    // del proyecto; no tocan permisos ni roles de usuario del sistema).
    integrantes: [
      {
        nombre: 'Ángel Pecero',
        rol: 'Fundador y líder del proyecto',
        aportacion:
          'Dirige el proyecto y conecta las necesidades de la comunidad con su desarrollo. Participa en la arquitectura y la programación para facilitar el uso de la plataforma.',
        roles: ['Project Lead', 'Product Owner', 'Tech Lead', 'Full Stack Developer'],
        responsabilidades: [
          'Dirigir el proyecto y definir la visión del producto.',
          'Recopilar necesidades y mantener la comunicación con el beneficiario y la universidad.',
          'Definir prioridades y requisitos.',
          'Tomar decisiones de arquitectura y establecer criterios técnicos.',
          'Desarrollar funcionalidades y revisar su integración.',
          'Presentar los avances del proyecto.',
        ],
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Jorge Martínez',
        rol: 'Coordinador operativo y desarrollador',
        aportacion:
          'Coordina el trabajo operativo y el seguimiento de los sprints. Facilita los acuerdos del equipo, documenta los avances y desarrolla las funcionalidades asignadas.',
        roles: ['Scrum Master', 'Coordinador operativo', 'Full Stack Developer'],
        responsabilidades: [
          'Facilitar la organización de los sprints y el seguimiento de tareas.',
          'Coordinar reuniones y dar seguimiento a los acuerdos.',
          'Ayudar a identificar y gestionar impedimentos del equipo.',
          'Documentar el desarrollo y las decisiones acordadas.',
          'Desarrollar las funcionalidades asignadas.',
          'Probar y corregir su propio código antes de entregarlo.',
        ],
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Gustavo Gallegos',
        rol: 'Responsable de calidad y desarrollador',
        aportacion:
          'Coordina la revisión de calidad mediante pruebas, registro de errores y validación de correcciones. También participa en el desarrollo y aporta observaciones para mejorar el funcionamiento del sistema.',
        roles: ['QA Lead', 'Software Tester', 'Full Stack Developer'],
        responsabilidades: [
          'Planificar las pruebas y los criterios de revisión de calidad.',
          'Diseñar y ejecutar casos de prueba.',
          'Detectar y registrar defectos con pasos para reproducirlos.',
          'Verificar las correcciones y comprobar que no afecten funcionalidades existentes.',
          'Revisar los flujos de usuario y su funcionamiento en distintos tamaños de pantalla.',
          'Desarrollar las funcionalidades asignadas.',
          'Probar y corregir su propio código.',
        ],
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
    ],
  },
  colaboradores: {
    titulo: 'Personas que contribuyen',
    intro: 'Además del equipo, otras personas de la comunidad han aportado ideas, orientación y apoyo.',
    // Acompañamiento: docencia, coordinación y dirección que orientan el
    // proyecto académico. Orden: docentes primero, luego coordinación y, al
    // final, el acompañamiento de mercadotecnia.
    acompanamiento: [
      {
        nombre: 'Cecilia Teresa Ocampo',
        rol: 'Docente de Mercadotecnia',
        aportacion: 'Nos apoyó con Samai en las decisiones de marketing de la encuesta y la landing.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Aldo Roberto Echeverría',
        rol: 'Docente de Ing. en Software y Sist.',
        aportacion: 'Nos pidió el proyecto, da seguimiento a su avance y lo califica.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Omar Elías Aguilar',
        rol: 'Docente de Educación Física',
        aportacion: 'Nos apoyó con el rol de Presidente de un club en el sistema.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Avelina García Romero',
        rol: 'Coordinación Académica',
        aportacion: 'Nos ha apoyado en el desarrollo del proyecto.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Samai Bastarrachea',
        rol: 'Mercadotecnia',
        aportacion: 'Nos guió en marketing: la encuesta, la landing y la forma de presentar el proyecto.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
    ],
    // Colaboración: aportes puntuales de la comunidad universitaria. Orden:
    // primero el beneficiario académico (rector), luego las comunicaciones.
    colaboracion: [
      {
        nombre: 'David Antonio Chacón González',
        rol: 'Rector de la universidad',
        aportacion: 'Beneficiario del proyecto: aporta necesidades que orientan su desarrollo.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Alma Celeste Márquez Moctezuma',
        rol: 'Comunicaciones',
        aportacion: 'Colaboración para dar a conocer el proyecto en el campus y expandir noticias del periodico mural.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
      {
        nombre: 'Margarita Elena Moo Matú',
        rol: 'Comunicaciones',
        aportacion: 'Colaboración para dar a conocer el proyecto en el campus y expandir noticias del periodico mural.',
        frase: null,
        foto: null,
        mostrarFoto: false,
        visible: true,
      },
    ],
  },
  comoTrabajamos: {
    titulo: 'Cómo trabajamos',
    intro: 'Un proyecto académico, construido con la comunidad y validado paso a paso.',
    pasos: [
      {
        icono: 'users',
        titulo: 'Escuchamos',
        texto: 'La encuesta busca conocer intereses, preferencias, disponibilidad y obstáculos antes de decidir.',
      },
      {
        icono: 'grid',
        titulo: 'Proponemos',
        texto: 'Las ideas de clubes se presentan como propuestas con estados claros, sin anticipar aprobaciones.',
      },
      {
        icono: 'check-circle',
        titulo: 'Validamos',
        texto: 'Los avances se revisan con la comunidad: el interés registrado ayuda a decidir qué propuestas avanzan.',
      },
    ],
  },
  cierre: {
    titulo: 'El proyecto sigue creciendo',
    texto:
      'Esta página se irá actualizando a medida que el proyecto avance. Si te interesa ser parte, la encuesta es el mejor lugar para empezar.',
    btnVolver: 'Volver',
  },
};
