# Especificación de Requisitos Software (SRS)

## Sistema de Gestión de Clubes Universitarios — Clubs UNID

**Versión:** 1.0
**Estándar:** IEEE 830-1998
**Fecha:** Julio 2026
**Estado:** [COMPLETAR: Borrador / Aprobado]

---

## 1. Introducción

### 1.1 Propósito

El presente documento constituye la Especificación de Requisitos Software (SRS) para el sistema **Clubs UNID**, una plataforma web de gestión de clubes universitarios. Este documento está dirigido al equipo de desarrollo responsable de la implementación y mantenimiento del sistema, al docente evaluador de la materia, y a los stakeholders institucionales de la Universidad UNID que requieren visibilidad sobre el alcance y funcionamiento de la herramienta.

El SRS describe de manera completa y no ambigua el comportamiento esperado del sistema, las funcionalidades que debe proveer, las restricciones bajo las cuales opera, y los criterios de aceptación que permitirán verificar su correcto funcionamiento. Todas las especificaciones aquí contenidas se derivan del análisis directo del código fuente del repositorio, incluyendo rutas de API, modelos de base de datos, componentes de interfaz de usuario, configuraciones de seguridad, y dependencias tecnológicas.

### 1.2 Alcance

El sistema **Clubs UNID** es una aplicación web para la gestión del ciclo de vida de clubes universitarios en la Universidad UNID. Sus funciones principales incluyen: el registro y autenticación de usuarios (alumnos, presidentes de club, administradores y rectoría) mediante credenciales locales o cuenta institucional Microsoft; la consulta y filtrado de un catálogo público de clubes; la inscripción de alumnos a clubes con control de cupo; un sistema de postulación y reclutamiento de miembros con flujo de revisión por parte del presidente del club; la generación de convocatorias por bloques para evaluaciones presenciales; el envío y respuesta de ofertas de ingreso con vencimiento temporal; la publicación de avisos por club; un sistema de notificaciones segmentadas por audiencia; paneles de administración con gestión de usuarios, roles y clubes; un panel de rectoría con estadísticas, padron de alumnos y reportes de ocupación; y un registro de auditoría de acciones administrativas.

El sistema **no** incluye: módulo de pagos o cobro de cuotas; integración con sistemas SGA (Sistema de Gestión Académica) externos; aplicación móvil nativa; notificaciones push ni SMS; mensajería interna entre usuarios (chat); módulo de evaluaciones o calificaciones; sistema de encuestas; ni generación de certificados digitales.

### 1.3 Glosario

| Término | Definición |
|---------|-----------|
| **Club** | Entidad que agrupa alumnos en torno a una actividad deportiva, cultural o tecnológica. Posee un nombre, categoría, descripción, cupo máximo, presidente asignado y estatus (activo, próximamente, inactivo). Modelado en la tabla `clubes`. |
| **Alumno** | Perfil de usuario con `id_rol = 1`. Puede explorar el catálogo, postularse a clubes mediante formulario, recibir ofertas de ingreso, aceptarlas/rechazarlas, y tener una inscripción activa en un solo club a la vez. |
| **Presidente** | Perfil de usuario con `id_rol = 2`. Es el responsable de un club: revisa postulaciones, cambia estatus de formularios, genera convocatorias, envía ofertas, publica avisos y notificaciones a los miembros de su club. |
| **Admin** | Perfil de usuario con `id_rol = 3`. Administrador global con acceso a gestión de usuarios (cambio de roles), creación/edición de clubes, cambio de estatus de clubes, asignación de presidentes a clubes, baja de inscripciones, y envío de anuncios globales. |
| **Rectoría** | Perfil de usuario con `id_rol = 4`. Rol de consulta con acceso a estadísticas generales del ecosistema de clubes (ocupación, top clubes, total de alumnos), padrón de postulantes con filtros, y listados de asistencia. No puede modificar datos. |
| **Formulario / Postulación** | Solicitud de ingreso que un alumno envía a un club. Contiene datos personales, académicos (matrícula, carrera, cuatrimestre, turno), motivo de ingreso y experiencia previa. Tiene un estatus que avanza por un flujo de estados definido. Límite de 3 postulaciones activas por alumno. Modelado en la tabla `formularios`. |
| **Flujo de estatus de postulación** | Secuencia de transiciones de estado de un formulario: `En revisión → Preseleccionado → Convocado → Oferta enviada → Miembro oficial` (éxito) o `Rechazado` desde cualquier estado intermedio. Cada transición tiene reglas definidas en el backend. |
| **Convocatoria** | Agrupación de alumnos preseleccionados en bloques (A, B, C, etc.) para evaluaciones presenciales. Cada bloque tiene hasta 20 alumnos. Incluye fecha, hora y lugar. Se genera automáticamente al distribuir equitativamente a los preseleccionados. |
| **Oferta de ingreso** | Invitación formal que el presidente extiende a un alumno convocado después de la evaluación presencial. Tiene una vigencia de 3 días (72 horas) configurable (`DIAS_VIGENCIA_OFERTA`). Si vence sin respuesta, el sistema la rechaza automáticamente. |
| **Inscripción activa** | Registro que vincula a un alumno con un club en el que es miembro oficial. Cada alumno puede tener máximo una inscripción activa, validado mediante un índice único parcial (`uq_un_club_activo_por_alumno`). |
| **Aviso** | Publicación realizada por el presidente o admin en un club específico. Visible para cualquier usuario que consulte ese club. Contiene título, contenido, autor y fecha de publicación. Modelado en la tabla `avisos_clubes`. |
| **Notificación** | Mensaje dirigido a una audiencia específica (`global`, `presidentes`, `alumnos`, `club`) o a un destinatario individual. Se genera automáticamente en eventos del sistema (cambio de estatus, oferta enviada, etc.) o manualmente por administradores. Incluye seguimiento de lectura. |

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

**Clubs UNID** es un sistema web **standalone** que no depende de sistemas externos para su funcionamiento principal. Sin embargo, se integra con los siguientes servicios externos:

- **Microsoft Azure Active Directory (MSAL)** para autenticación OAuth 2.0 mediante cuentas institucionales @unid.mx. Se utiliza la biblioteca `@azure/msal-browser` v5 y `@azure/msal-react` v5 en el frontend, y se valida el token contra Microsoft Graph API (`https://graph.microsoft.com/v1.0/me`) en el backend.
- **Microsoft Graph API** para obtener la identidad del usuario (nombre, correo, ID de Microsoft) durante el inicio de sesión con cuenta institucional.
- **PostgreSQL** como sistema gestor de base de datos, alojado localmente o en producción mediante conexión SSL.
- **Vercel** como plataforma de despliegue del frontend (build con Vite).
- **Render** como plataforma de despliegue del backend (según la URL configurada en producción).

No se integra con sistemas de pago, ERP, SGA, ni servicios de terceros adicionales.

### 2.2 Funciones del Producto

1. **Autenticación híbrida** — Inicio de sesión mediante correo/contraseña local o mediante cuenta institucional Microsoft Azure AD. Gestión de sesiones con JWT (expiración 24h).
2. **Catálogo público de clubes** — Visualización, filtrado por categoría (Deportes, Cultura, Tecnología) y consulta de detalle de clubes con su información, cupo disponible y estatus.
3. **Inscripción directa a clubes** — Permite a un alumno sin inscripción activa inscribirse directamente a un club, con validación de cupo máximo, club activo y duplicados.
4. **Postulación y reclutamiento de miembros** — Flujo completo de postulación: envío de formulario, revisión por presidente, preselección, generación de convocatorias por bloques, evaluación presencial, envío de ofertas con vencimiento, y aceptación/rechazo por parte del alumno.
5. **Gestión de avisos por club** — Publicación, consulta y eliminación de avisos por parte del presidente o administrador del club.
6. **Sistema de notificaciones** — Notificaciones segmentadas por audiencia (global, presidentes, alumnos, club) con seguimiento de lectura y polling automático cada 30 segundos.
7. **Panel de administración** — Gestión de usuarios (cambio de roles, asignación de presidentes a clubes, baja de inscripciones), CRUD de clubes, historial de auditoría, y envío de anuncios.
8. **Panel de rectoría** — Dashboard con estadísticas de ocupación, top clubes, padrón de postulantes con filtros avanzados, y listados de asistencia por bloque.
9. **Registro de auditoría** — Trazabilidad de acciones administrativas (cambio de roles, creación de clubes, asignación de presidentes, etc.) almacenada en `historial_admin`.
10. **Modo oscuro** — Interfaz con soporte de tema claro/oscuro persistente en `localStorage`.

### 2.3 Perfiles de Usuario

| Rol | id_rol | Nivel técnico | Frecuencia de uso | Motivación |
|-----|--------|--------------|-------------------|------------|
| **Alumno** | 1 | Bajo (usuario final, requiere interfaz guiada) | Semanal a diario durante períodos de inscripción | Explorar clubes disponibles, postularse a los de su interés, gestionar su inscripción activa y responder ofertas de ingreso. |
| **Presidente de club** | 2 | Medio (capaz de gestionar formularios y convocatorias) | Diario durante procesos de reclutamiento; semanal en operación regular | Revisar y gestionar las postulaciones recibidas, programar evaluaciones, seleccionar nuevos miembros, publicar avisos y comunicarse con su club. |
| **Administrador** | 3 | Alto (gestión del sistema) | Diario | Administrar usuarios y roles, crear y configurar clubes, asignar presidentes, monitorear la plataforma y enviar comunicados globales. |
| **Rectoría** | 4 | Bajo (solo consulta) | Mensual o por requerimiento | Visualizar estadísticas generales del ecosistema de clubes, consultar el padrón de alumnos y generar reportes de ocupación y asistencia. |

### 2.4 Restricciones Generales

- **Tecnológica**: El frontend debe ejecutarse en un navegador web moderno con soporte para ES Modules, puesto que la aplicación se construye con Vite 8 y React 19, y utiliza Tailwind CSS v4 para estilos. El backend requiere Node.js 18+ con soporte para módulos ES (`"type": "module"`).
- **Base de datos**: El sistema requiere una instancia PostgreSQL 12+ con capacidad para conexiones concurrentes. La estructura de datos se gestiona mediante migraciones SQL ejecutadas automáticamente al iniciar el servidor.
- **Autenticación**: El inicio de sesión con Microsoft Azure AD requiere que el usuario tenga una cuenta institucional activa en el tenant configurado (`953420d2-c95e-4f65-9573-b601a94f4390`) y que el navegador no bloquee redirecciones OAuth.
- **Despliegue**: El frontend se despliega en Vercel y el backend en Render. No hay soporte para despliegue on-premise documentado.
- **Concurrencia**: Un alumno no puede tener más de una inscripción activa simultáneamente, ni más de 3 postulaciones activas al mismo tiempo.

---

## 3. Requisitos Específicos

### 3.1 Requisitos Funcionales

---

**RF-01**: El sistema **permitirá** a cualquier usuario **autenticarse** mediante correo institucional y contraseña, o mediante cuenta Microsoft Azure AD.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Autenticación híbrida

Criterio de aceptación (Gherkin):
  Given un usuario no autenticado en la página de inicio
  When hace clic en "Iniciar Sesión" e ingresa credenciales válidas (correo y contraseña) o selecciona "Iniciar sesión con correo institucional"
  Then el sistema redirige al panel correspondiente según su rol
  And se almacena un token JWT en localStorage con vigencia de 24 horas

  Given un usuario intenta autenticarse
  When ingresa credenciales incorrectas
  Then el sistema muestra el mensaje "Credenciales inválidas" y no inicia sesión

---

**RF-02**: El sistema **permitirá** a cualquier visitante **consultar el catálogo de clubes** filtrando por categoría (Deportes, Cultura, Tecnología) y visualizando el detalle de cada club con su información, cupo disponible y estatus.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Catálogo público de clubes

Criterio de aceptación (Gherkin):
  Given un visitante en la página de inicio
  When la página se carga
  Then se muestran los clubes con estatus "activo" y "próximamente"
  And se excluyen los clubes con estatus "inactivo"
  And se muestra el cupo actual calculado dinámicamente para cada club

  Given un visitante en el catálogo
  When selecciona una categoría distinta de "Todos"
  Then solo se muestran los clubes de esa categoría

---

**RF-03**: El sistema **permitirá** a un alumno **inscribirse directamente** a un club siempre que cumpla las validaciones de negocio.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Inscripción directa a clubes

Criterio de aceptación (Gherkin):
  Given un alumno autenticado sin inscripción activa
  When selecciona un club activo y confirma la inscripción
  Then el sistema crea una inscripción con estatus "activo"
  And el cupo actual del club se incrementa en 1

  Given un alumno con una inscripción activa
  When intenta inscribirse a otro club
  Then el sistema rechaza la operación con el mensaje "Ya tienes una inscripción activa"

  Given un club ha alcanzado su cupo máximo
  When un alumno intenta inscribirse
  Then el sistema rechaza la operación con el mensaje "El club ha alcanzado su cupo máximo"

---

**RF-04**: El sistema **permitirá** a un alumno **enviar un formulario de postulación** a un club, con un límite máximo de 3 postulaciones activas.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Postulación y reclutamiento

Criterio de aceptación (Gherkin):
  Given un alumno autenticado sin inscripción activa
  When completa y envía el formulario de postulación con todos los campos obligatorios
  Then el sistema crea el formulario con estatus "En revisión"
  And lo asocia al club seleccionado

  Given un alumno ha alcanzado el límite de 3 postulaciones
  When intenta enviar un nuevo formulario
  Then el sistema rechaza con el mensaje "Has alcanzado el límite de 3 postulaciones"

  Given un alumno ya envió un formulario a un club específico
  When intenta enviar otro formulario al mismo club
  Then el sistema rechaza con el mensaje "Ya enviaste un formulario para este club"

---

**RF-05**: El sistema **permitirá** al presidente de un club **revisar y actualizar el estatus** de los formularios de postulación, siguiendo una máquina de estados con transiciones permitidas.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Postulación y reclutamiento

Criterio de aceptación (Gherkin):
  Given un presidente autenticado en el panel de su club
  When accede a la sección de solicitudes pendientes
  Then ve todos los formularios con estatus distinto de "Miembro oficial" y "Rechazado"

  Given un formulario en estatus "En revisión"
  When el presidente lo actualiza a "Preseleccionado"
  Then el sistema cambia el estatus y crea una notificación personal al alumno

  Given un formulario en estatus "En revisión"
  When el presidente intenta cambiarlo a "Oferta enviada" (salto no permitido)
  Then el sistema rechaza con el mensaje de transición no válida

---

**RF-06**: El sistema **permitirá** al presidente **generar convocatorias por bloques** a partir de los alumnos preseleccionados, distribuyéndolos equitativamente en grupos de hasta 20 alumnos.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Postulación y reclutamiento

Criterio de aceptación (Gherkin):
  Given un presidente con alumnos en estatus "Preseleccionado"
  When genera las convocatorias
  Then el sistema distribuye los alumnos en bloques (A, B, C, ...)
  And actualiza el estatus de los alumnos a "Convocado"

  Given no hay alumnos preseleccionados
  When el presidente intenta generar convocatorias
  Then el sistema responde "No hay alumnos preseleccionados"

---

**RF-07**: El sistema **permitirá** al presidente **enviar ofertas de ingreso** a los alumnos aprobados en la evaluación presencial, con una vigencia de 3 días.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Postulación y reclutamiento

Criterio de aceptación (Gherkin):
  Given un presidente con alumnos en estatus "Convocado"
  When selecciona los aprobados y envía ofertas
  Then los seleccionados cambian a "Oferta enviada" con fecha de expiración en 3 días
  And los no seleccionados cambian a "Rechazado"
  And se crean notificaciones para todos los afectados

---

**RF-08**: El sistema **permitirá** a un alumno **aceptar o rechazar una oferta de ingreso** recibida, con validación de vencimiento y efectos colaterales.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Postulación y reclutamiento

Criterio de aceptación (Gherkin):
  Given un alumno con una oferta vigente (estatus "Oferta enviada")
  When acepta la oferta
  Then su estatus cambia a "Miembro oficial"
  And se crea una inscripción activa en el club
  And todas sus otras postulaciones activas se rechazan automáticamente con motivo "El alumno aceptó otra oferta"

  Given un alumno con una oferta vigente
  When rechaza la oferta
  Then su estatus cambia a "Rechazado" con motivo "Oferta rechazada por el alumno"
  And se notifica al presidente del club

  Given una oferta ha expirado (más de 72 horas desde su creación)
  When el alumno intenta responder
  Then el sistema rechaza con el mensaje "La oferta ha expirado"

---

**RF-09**: El sistema **permitirá** al presidente o administrador **publicar y eliminar avisos** en un club específico.
Prioridad: Media
Trazabilidad: Sección 2.2 → Gestión de avisos por club

Criterio de aceptación (Gherkin):
  Given un presidente autenticado en el panel de su club
  When publica un aviso con título y contenido
  Then el aviso es visible en la sección de avisos del club

  Given un administrador autenticado
  When elimina un aviso de cualquier club
  Then el aviso se elimina permanentemente

  Given un usuario que no es presidente ni admin
  When intenta publicar un aviso
  Then el sistema responde 403 "Solo el presidente del club puede publicar avisos"

---

**RF-10**: El sistema **enviará notificaciones automáticas** ante cambios de estatus en postulaciones y ofertas, y **permitirá** a los usuarios **consultar y marcar como leídas** sus notificaciones.
Prioridad: Media
Trazabilidad: Sección 2.2 → Sistema de notificaciones

Criterio de aceptación (Gherkin):
  Given el presidente cambia el estatus de un formulario a "Preseleccionado" o "Rechazado"
  When se procesa la actualización
  Then el sistema inserta una notificación personal para el alumno afectado

  Given un usuario autenticado
  When accede a su panel
  Then el sistema muestra sus notificaciones filtradas por audiencia (global, por rol, por club, personales)
  And las notificaciones se refrescan automáticamente cada 30 segundos

  Given un usuario ve una notificación no leída
  When hace clic en ella
  Then el sistema la marca como leída en la tabla `notificaciones_leidas`

---

**RF-11**: El sistema **permitirá** al administrador **gestionar usuarios** (cambiar roles, asignar presidentes a clubes, dar de baja inscripciones).
Prioridad: Alta
Trazabilidad: Sección 2.2 → Panel de administración

Criterio de aceptación (Gherkin):
  Given un administrador autenticado
  When cambia el rol de un usuario
  Then el sistema valida que el rol destino sea válido (1-4)
  And si el usuario era presidente (rol 2) y cambia a otro rol, el sistema limpia su relación con el club
  And se registra la acción en el historial de auditoría

  Given un administrador autenticado
  When asigna un club a un presidente
  Then el sistema limpia la presidencia anterior de ese club y registra una inscripción activa para el presidente

---

**RF-12**: El sistema **permitirá** al administrador **crear, editar y cambiar el estatus** de los clubes.
Prioridad: Alta
Trazabilidad: Sección 2.2 → Panel de administración

Criterio de aceptación (Gherkin):
  Given un administrador autenticado
  When crea un nuevo club con nombre, categoría y cupo máximo
  Then el sistema crea el club con estatus "activo" y cupo actual 0

  Given un administrador autenticado
  When cambia el estatus de un club a "inactivo"
  Then el club deja de aparecer en el catálogo público

---

**RF-13**: El sistema **proporcionará** a rectoría **estadísticas generales** del ecosistema de clubes, un **padrón de postulantes con filtros** y listados de asistencia.
Prioridad: Media
Trazabilidad: Sección 2.2 → Panel de rectoría

Criterio de aceptación (Gherkin):
  Given un usuario de rectoría autenticado
  When accede al dashboard
  Then visualiza: total de alumnos, alumnos inscritos, total de clubes, porcentaje de ocupación, y solicitudes agrupadas por estatus

  Given un usuario de rectoría en la sección padrón
  When aplica filtros por club, búsqueda por nombre/matrícula, carrera o turno
  Then el sistema devuelve los resultados filtrados en tiempo real

---

**RF-14**: El sistema **registrará en un historial de auditoría** todas las acciones administrativas relevantes (cambio de roles, creación/edición de clubes, asignación de presidentes, bajas, anuncios).
Prioridad: Media
Trazabilidad: Sección 2.2 → Registro de auditoría

Criterio de aceptación (Gherkin):
  Given un administrador realiza una acción con efecto en el sistema
  When la acción se ejecuta
  Then el sistema inserta un registro en `historial_admin` con: ID del admin, nombre, acción, descripción, tipo y ID de entidad, detalles en JSON, y timestamp

  Given un administrador autenticado
  When accede a la sección de historial
  Then visualiza los últimos 200 registros ordenados por fecha descendente

---

### 3.2 Requisitos No Funcionales

---

**RNF-01 — Rendimiento**: El tiempo de respuesta del backend para cualquier endpoint de consulta (GET) no debe exceder los 2 segundos bajo condiciones normales de carga (hasta 50 usuarios concurrentes). Las operaciones de escritura (POST, PUT, DELETE) no deben exceder los 3 segundos. El frontend debe cargar el bundle inicial en menos de 3 segundos en conexiones de banda ancha (10 Mbps+).
*Evidencia en código:* No se encontró configuración de timeout o benchmarks en el código; el valor es inferido como objetivo de calidad.

---

**RNF-02 — Seguridad**: El sistema implementa los siguientes mecanismos de seguridad:
- **JWT con expiración de 24 horas** para gestión de sesiones (`backend/middleware/auth.js:18`).
- **Hashing de contraseñas con bcryptjs** (algoritmo bcrypt, 10 rondas de sal) (`backend/routes/auth.js:65`).
- **Rate limiting en el endpoint de login**: máximo 10 intentos por ventana de 15 minutos por IP (`backend/routes/auth.js:9-15`).
- **CORS configurado por origen** desde variable de entorno `CORS_ORIGIN` (`backend/index.js:25-26`).
- **Cabecera `Content-Type: application/json; charset=utf-8`** en todas las respuestas (`backend/index.js:29`).
- **Autorización basada en roles**: middleware `requireRole()` para restringir acceso a endpoints según `id_rol` (`backend/middleware/auth.js:26-32`).
- **Validación de transiciones de estatus** en el flujo de postulaciones, impidiendo saltos no permitidos (`backend/routes/formularios.js:15-22`).

---

**RNF-03 — Usabilidad**: La interfaz debe ser responsiva y funcional en dispositivos móviles (320 px de ancho mínimo) y de escritorio. El sistema debe proporcionar retroalimentación visual inmediata para todas las acciones del usuario (carga, éxito, error) mediante componentes de interfaz dedicados, y debe mantener un modo oscuro/claro persistente.
*Evidencia en código:* El frontend utiliza `NavegacionInferiorMovil` para navegación en móviles (src/components/NavegacionInferiorMovil.jsx), Tailwind CSS v4 con clases responsivas, y el hook `useTema` (src/hooks/useTema.js) persiste la preferencia de tema en `localStorage`.

---

**RNF-04 — Disponibilidad**: El sistema debe estar disponible el 99% del tiempo durante el horario académico semestral (lunes a viernes de 7:00 a 22:00, hora del centro de México). Las ventanas de mantenimiento deben programarse fuera de este horario.
*Evidencia en código:* No se encontró configuración de uptime, monitoreo o SLAs en el código; el valor es inferido como objetivo.

---

**RNF-05 — Mantenibilidad**: El backend debe realizar migraciones de base de datos automáticamente al iniciar, ejecutando archivos SQL en orden alfabético desde el directorio del servidor.
*Evidencia en código:* `backend/migrate.js` implementa la ejecución automática de archivos `migrate-*.sql` al arrancar el servidor (`backend/index.js:7-8`).

---

**RNF-06 — Portabilidad**: El frontend debe poder ejecutarse en los navegadores Chrome 90+, Firefox 90+, Edge 90+, y Safari 15+.
*Evidencia en código:* No se encontró configuración de `browserslist`; Vite 8 por defecto compila para navegadores con soporte de ES Modules.

---

### 3.3 Restricciones de Diseño

| Categoría | Restricción | Evidencia en código |
|-----------|-------------|-------------------|
| **Frontend** | React 19 con Vite 8 como bundler, Tailwind CSS v4 para estilos, React Router v7 para enrutamiento. | `package.json` (raíz): dependencias `react@^19.2.6`, `react-router-dom@^7.18.0`, devDependencies `vite@^8.0.12`, `tailwindcss@^4.3.0`. |
| **Backend** | Node.js con Express 4 y módulos ES. PostgreSQL como base de datos con driver `pg`. | `backend/package.json`: `"type": "module"`, dependencias `express@^4.21.0`, `pg@^8.13.0`. |
| **Proxy de desarrollo** | Vite proxy configura `/api` hacia `localhost:4000` en desarrollo. | `vite.config.js:11-16` — `server.proxy` |
| **Autenticación** | Integración con MSAL de Azure AD para OAuth. | `src/services/authConfig.js`: tenant `953420d2-c95e-4f65-9573-b601a94f4390`, clientId `89262870-12e6-41ab-b212-07f34b9bde0a`. |
| **Despliegue** | Frontend desplegado en Vercel con framework Vite. Backend desplegado en Render. | `vercel.json`: framework `vite`, build command `vite build`. `src/services/api.js:2-4`: URL producción `https://clubes-unid.onrender.com/api`. |
| **Navegadores** | Debe ser compatible con navegadores modernos con soporte ES Modules (Vite target modern). | `index.html` y configuración Vite por defecto. |

### 3.4 Diagrama de Arquitectura

```mermaid
graph TB
    subgraph Cliente [Navegador Web]
        A[React 19 + Vite 8 + Tailwind CSS 4]
        B[React Router 7]
        C[MSAL React / Azure AD OAuth]
        D[Notificaciones Polling 30s]
    end

    subgraph Vercel [Vercel - Frontend CDN]
        E[Build Estático dist/]
    end

    subgraph Servidor [Render - Backend Node.js]
        F[Express 4 + CORS + Rate Limiting]
        G[JWT Auth Middleware]
        H[Role-based Access Control]
    end

    subgraph API [API REST Endpoints]
        I[/api/auth/*]
        J[/api/usuarios/*]
        K[/api/clubes/*]
        L[/api/inscripciones/*]
        M[/api/formularios/*]
        N[/api/avisos/*]
        O[/api/convocatorias/*]
        P[/api/ofertas/*]
        Q[/api/notificaciones/*]
        R[/api/historial/*]
        S[/api/estadisticas/*]
        T[/api/health]
    end

    subgraph DB [PostgreSQL 12+]
        U[(clubs_bd)]
    end

    subgraph Externo [Servicios Externos]
        V[Microsoft Graph API<br/>/v1.0/me]
        W[Azure AD Tenant<br/>953420d2-...]
    end

    A -->|fetch / axios| E
    E -->|proxy dev: localhost:4000<br/>prod: clubs-unid.onrender.com| F
    
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    H --> N
    H --> O
    H --> P
    H --> Q
    H --> R
    H --> S
    H --> T

    I --> U
    J --> U
    K --> U
    L --> U
    M --> U
    N --> U
    O --> U
    P --> U
    Q --> U
    R --> U
    S --> U

    C -->|OAuth redirect| W
    C -->|access token| I
    I -->|validate token| V

    D -->|GET /api/notificaciones cada 30s| Q

    style Cliente fill:#1e293b,color:#fff
    style Vercel fill:#7c3aed,color:#fff
    style Servidor fill:#0f766e,color:#fff
    style API fill:#0284c7,color:#fff
    style DB fill:#b45309,color:#fff
    style Externo fill:#6b7280,color:#fff
```

**Flujo de comunicación: REST**. Todas las interacciones entre frontend y backend utilizan llamadas HTTP REST con JSON como formato de intercambio. La autenticación se realiza mediante token JWT en el header `Authorization: Bearer <token>`. No se utilizan WebSocket, GraphQL ni SSE.

---

## Tabla de Trazabilidad RF/RNF → Archivos de Código

| ID | Archivo(s) de implementación (ruta relativa) |
|----|---------------------------------------------|
| **RF-01** | `backend/routes/auth.js`, `backend/middleware/auth.js`, `src/services/authConfig.js`, `src/contexts/AuthContext.jsx`, `src/components/ModalInicioSesion.jsx`, `src/components/BotonMicrosoft.jsx` |
| **RF-02** | `backend/routes/clubes.js:10-79`, `src/App.jsx:30-41`, `src/pages/PaginaInicio.jsx` |
| **RF-03** | `backend/routes/inscripciones.js:36-91`, `src/services/api.js:122-128` |
| **RF-04** | `backend/routes/formularios.js:103-194`, `backend/migrate-formularios.sql`, `src/services/api.js:156-162` |
| **RF-05** | `backend/routes/formularios.js:197-321`, `src/components/SolicitudesPresidente.jsx` |
| **RF-06** | `backend/routes/convocatorias.js:25-123`, `backend/migrate-z4-reclutamiento-v3.sql` |
| **RF-07** | `backend/routes/convocatorias.js:269-358`, `src/services/api.js:220-225` |
| **RF-08** | `backend/routes/ofertas.js:7-177`, `src/services/api.js:227-231`, `src/components/SeccionPostulaciones.jsx` |
| **RF-09** | `backend/routes/avisos.js:28-99`, `src/components/SeccionAvisos.jsx` |
| **RF-10** | `backend/routes/notificaciones.js`, `backend/migrate-notificaciones.sql`, `src/contexts/NotificationContext.jsx` |
| **RF-11** | `backend/routes/usuarios.js`, `src/pages/PanelAdmin.jsx`, `src/components/admin/UserTable.jsx` |
| **RF-12** | `backend/routes/clubes.js:82-223`, `src/components/admin/ClubTable.jsx`, `src/components/admin/ClubFormModal.jsx` |
| **RF-13** | `backend/routes/estadisticas.js`, `src/pages/PanelRectoria.jsx`, `src/components/rectoria/SeccionResumen.jsx`, `src/components/rectoria/SeccionPadron.jsx`, `src/components/rectoria/SeccionClubes.jsx`, `src/components/rectoria/SeccionAsistencia.jsx` |
| **RF-14** | `backend/lib/audit.js`, `backend/routes/historial.js`, `backend/migrate-historial.sql`, `src/components/admin/HistorialTable.jsx` |
| **RNF-01** | No implementado explícitamente (objetivo de calidad) |
| **RNF-02** | `backend/middleware/auth.js`, `backend/routes/auth.js:9-15`, `backend/index.js:25-30`, `backend/routes/formularios.js:15-22` |
| **RNF-03** | `src/hooks/useTema.js`, `src/components/NavegacionInferiorMovil.jsx`, `tailwind.config` (herencia Tailwind), clases responsivas en múltiples componentes |
| **RNF-04** | No implementado explícitamente (objetivo de calidad) |
| **RNF-05** | `backend/migrate.js`, `backend/index.js:7-8` |
| **RNF-06** | Configuración Vite por defecto, `vite.config.js` |

---

## Notas Finales

- **Funcionalidades implícitas detectadas**: Se documentaron 14 RF (superando el mínimo de 10) y 6 RNF (superando las 4 categorías obligatorias). Todos los RF están fundamentados en rutas de API, lógica de negocio o componentes UI verificados en el código.
- **Módulos pendientes o en progreso**: Se detectaron funciones de API declaradas en `src/services/api.js` que no tienen implementación en el backend correspondiente (por ejemplo, `asignarBloque`, `deleteConvocatoria`, `seleccionarOfertas`). Estos se consideran **en progreso** y no se incluyeron como RF completos.
- **Sin test automatizados**: No se encontraron archivos de prueba unitaria, de integración ni end-to-end en el repositorio. No hay dependencias de testing en ningún `package.json`.
- **Autenticación local**: Los hash de contraseñas en el seed data (`backend/seed.sql`) corresponden a la contraseña en texto plano `123456`. En producción se deben generar nuevos hash.

---

*Documento generado a partir del análisis del código fuente del repositorio SPA-Angel. Las secciones marcadas como `[COMPLETAR: ...]` deben ser llenadas con información contextual del proyecto (stakeholders, entrevistas, actas de reunión, etc.).*
