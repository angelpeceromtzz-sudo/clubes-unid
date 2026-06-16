// Datos de prueba para desarrollo local sin base de datos real
export const MOCK_USERS = [
  {
    id: 1,
    nombre_completo: "Luis Miguel Hernández Pérez",
    correo_institucional: "alumno.libre@unid.mx",
    password_hash: "123456",
    id_rol: 1,
    rol: "alumno",
  },
  {
    id: 2,
    nombre_completo: "María Fernanda López García",
    correo_institucional: "alumno.inscrito@unid.mx",
    password_hash: "123456",
    id_rol: 1,
    rol: "alumno",
  },
  {
    id: 3,
    nombre_completo: "Carlos Alberto Méndez Rivas",
    correo_institucional: "presidente@unid.mx",
    password_hash: "123456",
    id_rol: 2,
    rol: "presidente",
  },
  {
    id: 4,
    nombre_completo: "Ana Sofía Ramírez Domínguez",
    correo_institucional: "admin@unid.mx",
    password_hash: "123456",
    id_rol: 3,
    rol: "admin",
  },
];

// Lista simulada de clubes universitarios
export const MOCK_CLUBES = [
  {
    id: 1,
    nombre_club: "Equipo de Voleibol",
    descripcion: "Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.",
    categoria: "Deportes",
    cupo_maximo: 40,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop",
    lugar: "Campus Campeche — Gimnasio Auditorio",
    horarios: [
      { dia: "Lunes", horario: "6:00 PM - 8:00 PM" },
      { dia: "Miércoles", horario: "6:00 PM - 8:00 PM" },
      { dia: "Viernes", horario: "4:00 PM - 6:00 PM" },
    ],
  },
  {
    id: 2,
    nombre_club: "Taller de Dibujo y Pintura Analítica",
    descripcion: "Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.",
    categoria: "Cultura",
    cupo_maximo: 20,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Aula de Artes, Edificio B",
    horarios: [
      { dia: "Martes", horario: "4:00 PM - 7:00 PM" },
      { dia: "Jueves", horario: "4:00 PM - 7:00 PM" },
    ],
  },
  {
    id: 3,
    nombre_club: "Brigada de Apoyo Comunitario",
    descripcion: "Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.",
    categoria: "Cultura",
    cupo_maximo: 40,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop",
    lugar: "Campus Campeche — Sala de Vinculación Social",
    horarios: [
      { dia: "Sábado", horario: "9:00 AM - 12:00 PM" },
    ],
  },
  {
    id: 4,
    nombre_club: "Equipo de Basketball",
    descripcion: "Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.",
    categoria: "Deportes",
    cupo_maximo: 30,
    id_presidente: 3,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Gimnasio Universitario",
    horarios: [
      { dia: "Sábado (Mañana)", horario: "8:00 AM - 10:00 AM" },
      { dia: "Domingo (Tarde)", horario: "4:00 PM - 6:00 PM" },
    ],
  },
  {
    id: 5,
    nombre_club: "Equipo de Esports y Gaming Competitivo",
    descripcion: "Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.",
    categoria: "Tecnología",
    cupo_maximo: 25,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Laboratorio de Cómputo, Edificio C",
    horarios: [
      { dia: "Martes", horario: "5:00 PM - 8:00 PM" },
      { dia: "Jueves", horario: "5:00 PM - 8:00 PM" },
      { dia: "Sábado", horario: "10:00 AM - 2:00 PM" },
    ],
  },
  {
    id: 6,
    nombre_club: "Taller de Música y Ensamble Acústico",
    descripcion: "Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.",
    categoria: "Cultura",
    cupo_maximo: 20,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Sala de Música, Edificio de Cultural",
    horarios: [
      { dia: "Lunes", horario: "5:00 PM - 7:00 PM" },
      { dia: "Miércoles", horario: "5:00 PM - 7:00 PM" },
    ],
  },
  {
    id: 7,
    nombre_club: "Equipo de Atletismo",
    descripcion: "Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.",
    categoria: "Deportes",
    cupo_maximo: 30,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Pista de Atletismo",
    horarios: [
      { dia: "Lunes a Viernes", horario: "6:00 AM - 7:30 AM" },
      { dia: "Sábado", horario: "7:00 AM - 9:00 AM" },
    ],
  },
  {
    id: 8,
    nombre_club: "Club de Boxeo",
    descripcion: "Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.",
    categoria: "Deportes",
    cupo_maximo: 20,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Ring de Boxeo, Gimnasio de Combate",
    horarios: [
      { dia: "Martes y Jueves", horario: "6:00 PM - 8:00 PM" },
      { dia: "Sábado", horario: "10:00 AM - 12:00 PM" },
    ],
  },
  {
    id: 9,
    nombre_club: "Club de Literatura y Escritura Creativa",
    descripcion: "Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.",
    categoria: "Cultura",
    cupo_maximo: 20,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop",
    lugar: "Campus Campeche — Biblioteca Central, Sala de Lectura",
    horarios: [
      { dia: "Miércoles", horario: "4:00 PM - 6:00 PM" },
      { dia: "Viernes", horario: "4:00 PM - 6:00 PM" },
    ],
  },
  {
    id: 10,
    nombre_club: "Equipo de Porristas",
    descripcion: "Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.",
    categoria: "Deportes",
    cupo_maximo: 50,
    id_presidente: null,
    id_estatus_club: 1,
    estatus: "activo",
    imagen: "https://images.unsplash.com/photo-1589748239338-afe695e833d3?q=80&w=1026&auto=format&fit=crop",
    lugar: "Campus Campeche — Gimnasio Auditorio",
    horarios: [
      { dia: "Lunes y Miércoles", horario: "5:00 PM - 7:00 PM" },
      { dia: "Viernes", horario: "3:00 PM - 5:00 PM" },
    ],
  },
];

// Inscripciones simuladas de alumnos a clubes
export const MOCK_INSCRIPCIONES = [
  {
    id_inscripcion: 1,
    id_usuario: 2,
    id_club: 4,
    id_estatus_inscripcion: 1,
    estatus: "activo",
    fecha_inscripcion: "2026-01-15T00:00:00Z",
  },
  {
    id_inscripcion: 2,
    id_usuario: 3,
    id_club: 4,
    id_estatus_inscripcion: 1,
    estatus: "activo",
    fecha_inscripcion: "2025-09-01T00:00:00Z",
  },
];

// Avisos simulados publicados por presidentes de clubes
export const MOCK_AVISOS = [
  {
    id_aviso: 1,
    id_club: 4,
    id_autor: 3,
    autor: "Carlos Alberto Méndez Rivas",
    titulo: "Horario especial esta semana",
    contenido: "Recuerden que este sábado el entrenamiento será a las 10:00 AM por mantenimiento del gimnasio. ¡No falten!",
    fecha_publicacion: "2026-06-08T00:00:00Z",
  },
  {
    id_aviso: 2,
    id_club: 4,
    id_autor: 3,
    autor: "Carlos Alberto Méndez Rivas",
    titulo: "Confirmación para torneo",
    contenido: "Necesito que todos confirmen su asistencia al torneo del próximo mes a más tardar el viernes. Pasen conmigo a firmar la hoja de inscripción.",
    fecha_publicacion: "2026-06-01T00:00:00Z",
  },
];

// Obtiene la inscripción activa de un usuario
export function getActiveInscripcion(usuarioId) {
  return MOCK_INSCRIPCIONES.find(
    (i) => i.id_usuario === usuarioId && i.id_estatus_inscripcion === 1
  ) || null;
}

// Obtiene un club por su ID
export function getClubById(clubId) {
  return MOCK_CLUBES.find((c) => c.id === clubId) || null;
}

// Obtiene los avisos de un club ordenados por fecha descendente
export function getAvisosByClub(clubId) {
  return MOCK_AVISOS.filter((a) => a.id_club === clubId).sort(
    (a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion)
  );
}

// Obtiene los miembros inscritos en un club
export function getMiembrosByClub(clubId) {
  const inscritos = MOCK_INSCRIPCIONES.filter(
    (i) => i.id_club === clubId && i.id_estatus_inscripcion === 1
  );
  return inscritos.map((i) => {
    const user = MOCK_USERS.find((u) => u.id === i.id_usuario);
    return { ...user, fecha_inscripcion: i.fecha_inscripcion };
  });
}

// Calcula el cupo actual ocupado por alumnos en un club
export function getCupoActual(clubId) {
  return MOCK_INSCRIPCIONES.filter((i) => {
    if (i.id_club !== clubId || i.id_estatus_inscripcion !== 1) return false;
    const user = MOCK_USERS.find((u) => u.id === i.id_usuario);
    return user && user.id_rol === 1;
  }).length;
}

// Cambia el rol de un usuario en los datos mock
export function changeUserRole(userId, newRoleId) {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) return false;
  const roleMap = { 1: 'alumno', 2: 'presidente', 3: 'admin' };
  user.id_rol = newRoleId;
  user.rol = roleMap[newRoleId] || 'alumno';
  return true;
}

// Cambia el estatus de un club en los datos mock
export function changeClubStatus(clubId, newStatusId) {
  const club = MOCK_CLUBES.find((c) => c.id === clubId);
  if (!club) return false;
  const statusMap = { 1: 'activo', 2: 'proximamente', 3: 'inactivo' };
  club.id_estatus_club = newStatusId;
  club.estatus = statusMap[newStatusId] || 'activo';
  return true;
}

// ✦ A
