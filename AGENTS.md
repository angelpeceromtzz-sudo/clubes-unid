Clubs UNID — Instrucciones para agentes
1. Propósito y aplicación
Este archivo orienta el trabajo de las IA de programación dentro del repositorio de Clubs UNID. Establece prácticas generales y reglas específicas para la landing pública de Clubs UNID Campeche.
Estas instrucciones no ordenan implementar todos los módulos ni todas las funcionalidades descritas. Trabaja únicamente en la tarea solicitada por el usuario.
Las instrucciones explícitas del usuario prevalecen sobre las convenciones de este documento. Revisa también los archivos AGENTS.md aplicables a los directorios que modificarás. Si detectas una contradicción que afecta una regla de negocio o la seguridad, comunícala antes de aplicar la parte conflictiva.
2. Identidad del proyecto
- Nombre del sistema: Clubs UNID.
- Nombre de la presentación pública: Clubs UNID Campeche.
- El proyecto se presenta como una iniciativa estudiantil a cargo de Ángel Pecero, Jorge Martínez y Gustavo Gallegos.
- Redacta el contenido y los reportes para el usuario en español claro.
- No atribuyas al equipo cargos, autorizaciones institucionales, patrocinios ni respaldo oficial que no estén documentados.
3. Inspección antes de implementar
Antes de modificar código:
1. Revisa las instrucciones aplicables, el estado de Git y los cambios existentes.
2. Identifica la estructura real, el framework, el gestor de paquetes y los comandos disponibles en la documentación, los manifiestos y la configuración.
3. Localiza las rutas, los componentes, los estilos y los servicios relacionados con la tarea.
4. Revisa las reglas de negocio vigentes del módulo afectado.
5. Explica brevemente el enfoque y continúa con el trabajo autorizado.
No inventes rutas de archivos, tablas, comandos, endpoints ni tecnologías. Si una decisión depende de información indispensable que falta, solicita ese dato y continúa con las partes independientes cuando sea posible.
4. Ramas y preservación del trabajo
- Implementa cambios en una rama dedicada; no trabajes directamente sobre main.
- Para la landing se sugiere feat/landing-clubs-campeche.
- Revisa la rama actual antes de crear otra. Conserva una rama de trabajo adecuada si ya existe.
- Si hay cambios sin confirmar, identifica su relación con la tarea y presérvalos. No los descartes, incluyas en commits ni muevas mediante stash automáticamente.
- Evita refactorizaciones y cambios de formato ajenos al objetivo.
- No ejecutes operaciones destructivas ni reescribas el historial sin una instrucción explícita.
- No hagas commits, push, merge ni despliegues salvo que el usuario lo solicite o ya lo haya autorizado.
5. Integración y arquitectura
- Reutiliza los componentes, estilos, servicios, validaciones y patrones existentes.
- Mantén separados el contenido público y las herramientas administrativas según la arquitectura actual.
- No dupliques entidades, tablas o estados que ya tengan una representación equivalente.
- Agrega dependencias solo cuando una necesidad concreta lo justifique y las herramientas existentes no la resuelvan adecuadamente.
- Limita cualquier cambio de backend o datos al alcance autorizado. Una tarea de presentación no implica permiso para modificar reglas de negocio o esquemas.
- No reinicies bases de datos, borres registros ni apliques migraciones en servicios compartidos como parte incidental de una tarea.
6. Seguridad e integridad
- Conserva la autenticación y autorización existentes.
- No conviertas recursos protegidos en públicos para simplificar una integración.
- Las restricciones de acceso a información o acciones protegidas deben validarse en el backend o en las políticas de acceso correspondientes, no únicamente ocultando controles.
- No expongas secretos, tokens, credenciales ni datos personales en el código del cliente, los registros o los reportes.
- Consulta únicamente los datos necesarios para la funcionalidad.
- Cuando se modifique un módulo con historial, preserva sus registros y aplica sus reglas documentadas de corrección y eliminación.
7. Diseño y experiencia de usuario
- **Obligatorio antes de modificar o crear interfaces:** lee `DESIGN.md` en la raíz del repositorio. Documenta la identidad verificada (paleta, tipografía, componentes, breakpoints) y las inconsistencias conocidas. No introduzcas tokens ni patrones visuales nuevos sin justificarlos; si cambias una regla visual, actualiza `DESIGN.md` con la marca Verificado / Inconsistencia / Propuesta.
- Diseña primero para teléfonos y adapta después a pantallas mayores.
- Respeta los colores, las tipografías, los recursos gráficos y las convenciones verificadas del proyecto.
- Prioriza textos breves, jerarquía clara, controles táctiles cómodos y acciones comprensibles.
- Evita desbordamientos horizontales, contenido recortado y navegación innecesaria.
- Usa HTML semántico, encabezados ordenados, contraste legible, foco visible y navegación con teclado.
- Proporciona textos alternativos pertinentes y respeta la preferencia de movimiento reducido.
- Usa imágenes optimizadas y evita dependencias o animaciones que perjudiquen la carga en móviles.
- Maneja los estados de carga, vacío y error cuando la funcionalidad consulte datos.
- Skills de apoyo en `.opencode/skills/`: `clubs-unid-landing-design` (al diseñar/implementar la landing o UI pública) y `clubs-unid-ui-review` (al revisar el resultado). Carga con la herramienta de skills cuando estén disponibles en la sesión; si no lo están, sigue su contenido leyendo los `SKILL.md`.
8. Landing pública — Objetivo y alcance
Estas reglas se aplican cuando la tarea afecte a la landing de Clubs UNID Campeche.
La landing debe explicar qué son los clubes, presentar las propuestas y facilitar que los estudiantes respondan una encuesta de interés con suficiente contexto.
- Se integra en el mismo repositorio y con la tecnología actual.
- Ruta sugerida: /conoce-clubs. Verifica que esté disponible antes de utilizarla.
- Debe abrirse sin iniciar sesión, mediante un enlace directo o un QR.
- Conserva el inicio actual del sistema salvo una indicación distinta del usuario.
- No requiere crear otro sistema de usuarios, catálogo, panel de administración ni módulo de encuestas.
- No implementes funcionalidades futuras como parte incidental de esta página.
9. Landing pública — Organización del contenido
El recorrido propuesto es:
1. Presentación inicial: nombre del proyecto, invitación centrada en el alumno y acciones para explorar los clubes o responder la encuesta.
2. Qué es un club: explicación sencilla y ejemplos de actividades compartidas entre estudiantes con intereses comunes.
3. Propuestas de clubes: tarjetas con nombre, descripción, recurso visual y actividades de ejemplo. Utiliza categorías si facilitan la exploración.
4. Por qué participar en la encuesta: explicar que permite conocer intereses, preferencias, disponibilidad y obstáculos.
5. Invitación final: repetir el acceso a la encuesta y, si esta lo permite, invitar a proponer otros clubes.
6. Acerca del proyecto: propósito estudiantil y presentación de Ángel Pecero, Jorge Martínez y Gustavo Gallegos.
Adapta la composición al diseño existente sin perder este contenido esencial. La identidad del equipo debe acompañar la propuesta de valor para los estudiantes.
10. Landing pública — Reglas del contenido
- Despierta curiosidad mediante actividades y posibilidades concretas, sin presionar al estudiante para declarar interés.
- Distingue las propuestas de los clubes confirmados con información verificada.
- No asumas que un registro visible en el sistema significa que el club está aprobado u operando.
- No inventes horarios, cuotas, cupos, instalaciones, reconocimientos, testimonios, estadísticas ni beneficios garantizados.
- No presentes imágenes genéricas como fotografías reales de actividades o instalaciones del campus.
- Reutiliza contenido autorizado y recursos existentes cuando correspondan.
- Centraliza la configuración del contenido editable según los patrones del proyecto y reporta los datos faltantes.
- No publiques contenido ficticio de prueba como información real.
11. Landing pública — Integración de la encuesta
- Localiza la encuesta correcta y reutiliza su ruta o enlace real.
- Si existen varias candidatas y no puedes resolver cuál corresponde, solicita su identificador o enlace.
- No crees una segunda encuesta ni modifiques sus preguntas sin una solicitud específica.
- Mantén el acceso visible desde el inicio y al final de la página; no exijas leer todas las secciones ni completar un temporizador.
- Aclara que responder expresa interés y no equivale a inscribirse, reservar un lugar o garantizar la apertura de un club.
- No prometas anonimato, duración o funcionalidades de la encuesta sin verificarlos.
- Si la encuesta requiere autenticación, conserva esa restricción e informa al usuario. La landing debe seguir siendo pública.
- Si falta el destino definitivo, deja su configuración localizada y muestra un estado honesto; no uses botones activos con enlaces inventados, # o rutas inexistentes.
- La integración de la encuesta no se considera terminada hasta verificar el destino real.
12. Documentos de reglas de negocio
Los documentos específicos de cada módulo deben consultarse cuando la tarea los afecte. Un diseño funcional no demuestra que una funcionalidad ya esté implementada.
No traslades reglas entre módulos por analogía. Por ejemplo, las restricciones y la evolución futura de Asistencia V1 no forman parte del alcance de la landing.
Si una regla necesaria admite interpretaciones incompatibles, explica el caso concreto y solicita una definición antes de implementar el comportamiento dependiente. No inventes permisos, umbrales ni decisiones institucionales.
13. Verificación proporcional al cambio
- Ejecuta los comandos existentes que correspondan al cambio: compilación, análisis estático y pruebas relevantes, según el repositorio.
- No inventes scripts ni afirmes que una comprobación pasó si no se ejecutó.
- Agrega pruebas cuando validen un comportamiento nuevo o un riesgo concreto; evita pruebas que solo repitan la implementación o cambios cosméticos triviales.
- Verifica en navegador los cambios de interfaz cuando tengas herramientas disponibles. Si no puedes hacerlo, declara la limitación.
- No ejecutes pruebas de carga ni escrituras de prueba contra producción sin autorización.
- Distingue los errores introducidos por la tarea de los problemas preexistentes.
Para la landing, verifica al menos:
1. Acceso sin sesión y sin redirecciones indebidas al inicio de sesión.
2. Navegación directa y recarga de su ruta, considerando la configuración del despliegue.
3. Visualización en móvil y escritorio sin desbordamientos.
4. Funcionamiento de enlaces, botones y navegación por teclado.
5. Integración con la encuesta correcta o reporte explícito del bloqueo pendiente.
6. Conservación de las restricciones de las rutas protegidas.
7. Ausencia de errores nuevos de compilación y, cuando pueda comprobarse, de consola.
14. Criterios de aceptación de la landing
La landing está lista para revisión cuando:
- Presenta correctamente Clubs UNID Campeche y a sus tres responsables.
- Explica qué es un club con lenguaje accesible.
- Muestra propuestas verificadas y comunica su situación sin generar falsas expectativas.
- Incluye invitaciones claras a responder la encuesta y explica su propósito.
- Permite acceder a la encuesta sin obligar a terminar de leer la página.
- Funciona como página pública sin debilitar los permisos del sistema.
- Respeta la identidad visual y ofrece una experiencia móvil legible y accesible.
- Conserva el inicio actual y las funcionalidades existentes.
- Tiene un destino real de encuesta verificado y no contiene enlaces provisionales activos.
- Se han realizado las comprobaciones aplicables y documentado las limitaciones.
Si falta contenido, acceso o configuración indispensable, entrega los avances indicando exactamente qué impide considerarla terminada. No confundas una maqueta con una integración validada.
15. Reporte de entrega
Al terminar una tarea, informa de forma breve:
- Qué cambió y para qué.
- Rama y archivos principales modificados.
- Ruta o forma de acceder a la funcionalidad, cuando corresponda.
- Comprobaciones ejecutadas y sus resultados.
- Pendientes reales, limitaciones o decisiones necesarias.
Solicita revisión sobre un resultado concreto. Evita pedir confirmación repetidamente para acciones rutinarias ya autorizadas.
16. Regla rectora
Prioriza que Clubs UNID sea claro para los estudiantes, útil para sus responsables y coherente con las reglas documentadas. Implementa el alcance solicitado con la menor complejidad necesaria y conserva el trabajo existente.