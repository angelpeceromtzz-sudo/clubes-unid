-- ============================================================
-- SCRIPT DE INSERCIÓN — CUENTAS DE PRUEBA PARA CLUBS UNID
-- ============================================================
-- Para testear todos los flujos de la plataforma.
-- Las contraseñas están en texto plano (solo para desarrollo).
-- En producción usar bcrypt o similar.
-- ============================================================

-- 1. ALUMNO LIBRE (sin inscripción activa)
--    → Puede ver el catálogo y usar el formulario de inscripción.
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
VALUES (
  'Luis Miguel Hernández Pérez',
  'alumno.libre@unid.mx',
  '123456',
  1  -- alumno
);

-- 2. ALUMNO YA INSCRITO (con inscripción activa en el club 4 - Basketball)
--    → Al iniciar sesión se redirige automáticamente a su Dashboard.
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
VALUES (
  'María Fernanda López García',
  'alumno.inscrito@unid.mx',
  '123456',
  1  -- alumno
);

-- 3. PRESIDENTE DEL CLUB (rol presidente, y es presidente del club 4 - Basketball)
--    → Puede publicar/borrar avisos, ver miembros, gestionar entrenamientos.
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
VALUES (
  'Carlos Alberto Méndez Rivas',
  'presidente@unid.mx',
  '123456',
  2  -- presidente
);

-- 4. ADMINISTRADOR GLOBAL
--    → Panel de control con estadísticas, gestión de usuarios y clubes.
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
VALUES (
  'Ana Sofía Ramírez Domínguez',
  'admin@unid.mx',
  '123456',
  3  -- admin
);

-- ============================================================
-- ASIGNAR PRESIDENTE AL CLUB DE BASKETBALL (id_club = 4)
-- ============================================================
UPDATE clubes
SET id_presidente = (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx')
WHERE id_club = 4;

-- ============================================================
-- INSCRIPCIONES DE PRUEBA
-- ============================================================

-- María Fernanda (alumno.inscrito) inscrita en Basketball (activa)
INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
VALUES (
  (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'alumno.inscrito@unid.mx'),
  4,  -- Equipo de Basketball
  1   -- activo
);

-- Carlos Alberto (presidente) inscrito en Basketball (activa)
INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
VALUES (
  (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),
  4,  -- Equipo de Basketball
  1   -- activo
);

-- ============================================================
-- AVISOS DE PRUEBA PARA EL CLUB DE BASKETBALL
-- ============================================================
INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido)
VALUES (
  4,
  (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),
  'Horario especial esta semana',
  'Recuerden que este sábado el entrenamiento será a las 10:00 AM por mantenimiento del gimnasio. ¡No falten!'
);

INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido)
VALUES (
  4,
  (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),
  'Confirmación para torneo',
  'Necesito que todos confirmen su asistencia al torneo del próximo mes a más tardar el viernes. Pasen conmigo a firmar la hoja de inscripción.'
);
