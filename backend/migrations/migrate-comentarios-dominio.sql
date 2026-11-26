-- Aclara los conceptos de dominio directamente en el catálogo de PostgreSQL.
COMMENT ON TABLE clubes IS 'Catálogo común. tipo distingue clubes y actividades; los campos exclusivos de club se validan según el tipo.';
COMMENT ON COLUMN clubes.tipo IS 'club para membresía y convocatorias; actividad para ediciones y registros de actividades.';

COMMENT ON TABLE convocatorias IS 'Invitaciones a alumnos preseleccionados para una postulación; no representa el ciclo general de inscripción.';
COMMENT ON TABLE solicitudes_convocatoria IS 'Solicitud del responsable para abrir o cambiar una convocatoria de inscripción, sujeta a revisión.';
COMMENT ON TABLE convocatorias_inscripcion IS 'Ciclo aprobado de inscripción de un club; los formularios se vinculan al ciclo al que pertenecen.';
COMMENT ON TABLE formularios IS 'Postulación de un alumno a un club y ciclo; conserva la información y respuestas entregadas al solicitar ingreso.';

COMMENT ON TABLE club_formulario_preguntas IS 'Preguntas configurables propias de cada club, por ejemplo talla o información de salud.';
COMMENT ON TABLE formulario_respuestas_extra IS 'Respuestas configurables normalizadas con una copia inmutable del contexto de la pregunta al contestar.';

COMMENT ON TABLE encuestas IS 'Encuestas independientes de las postulaciones; cada una define si es pública anónima o institucional.';
COMMENT ON COLUMN encuestas.tipo_privacidad IS 'publico_anonimo no guarda identidad; institucional requiere sesión y asocia al respondiente.';
COMMENT ON TABLE preguntas IS 'Preguntas de una encuesta específica; detalle_respuestas valida que la respuesta y la pregunta sean de la misma encuesta.';
COMMENT ON TABLE respuestas_encuesta IS 'Un envío completo de una encuesta; id_usuario queda NULL en respuestas anónimas.';
COMMENT ON COLUMN respuestas_encuesta.id_usuario IS 'Identidad solo para encuestas institucionales; las respuestas anónimas históricas no se atribuyen después.';
COMMENT ON TABLE detalle_respuestas IS 'Valores individuales por pregunta; las claves foráneas preservan la pertenencia a la misma encuesta.';

COMMENT ON TABLE noticias IS 'Contenido editorial institucional; contenido es texto y url_imagen guarda la imagen de portada.';
