# Manual de Uso — Sistema de Gestión de Clubes UNID

## 1. Introducción

Plataforma web para la gestión de clubes universitarios de la UNID (Universidad Hispanoamericana de Oriente). Permite a alumnos explorar clubes, postularse, y a los administradores/presidentes/rectoría gestionar usuarios, clubes, convocatorias y asistencia.

**Tecnologías:** React 19, Vite 8, Tailwind CSS 4, MSAL (Azure AD), React Router 7, Recharts, Leaflet.

---

## 2. Roles del Sistema

| Rol | id_rol | Permisos |
|-----|--------|----------|
| **Alumno** | 1 | Explorar catálogo, postularse, ver postulaciones, ver su club y horarios |
| **Presidente** | 2 | Gestionar su club, revisar solicitudes, crear convocatorias, seleccionar alumnos, gestionar horarios |
| **Vicepresidente** | 5 | Mismas capacidades que el presidente sobre el club asignado (revisar solicitudes, gestionar horarios) |
| **Administrador** | 3 | Gestionar usuarios, clubes, banners del hero, anuncios globales, ver historial y actividad |
| **Rectoría** | 4 | Ver estadísticas, consultar clubes, padrón de alumnos, listas de asistencia, actividad del sistema |

---

## 3. Instalación y Ejecución

### Requisitos
- Node.js 18+
- NPM
- PostgreSQL (para el backend)

### Pasos

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Instalar dependencias del backend
cd backend
npm install
cd ..

# 3. Configurar variables de entorno (copiar .env.example a .env en backend/)
cp .env.example backend/.env

# 4. Iniciar backend (puerto 4000)
cd backend
npm run dev

# 5. En otra terminal, iniciar frontend en desarrollo
npm run dev

# 6. Compilar para producción
npm run build

# 7. Previsualizar build
npm run preview
```

El servidor de desarrollo corre en `http://localhost:5173`. Las peticiones a `/api/*` se redirigen automáticamente a `http://localhost:4000/*`.

### Variables de entorno
En producción, la API base apunta a `https://clubes-unid.onrender.com/api`. En desarrollo usa el proxy de Vite.

---

## 4. Autenticación

### Inicio de sesión local
1. Haz clic en **"Iniciar Sesión"** (esquina superior derecha).
2. Ingresa correo institucional y contraseña.
3. Haz clic en **"Ingresar"**.

### Inicio de sesión con Microsoft (Azure AD)
1. En el modal de inicio de sesión, haz clic en **"Iniciar sesión con correo institucional"**.
2. Serás redirigido a la página de inicio de sesión de Microsoft.
3. Tras autenticarte, serás redirigido de vuelta a la aplicación.

### Cuentas de prueba

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Alumno sin club | `alumno.libre@unid.mx` | `123456` |
| Alumno inscrito | `alumno.inscrito@unid.mx` | `123456` |
| Presidente | `presidente@unid.mx` | `123456` |
| Admin | `admin@unid.mx` | `123456` |

### Cierre de sesión
Desde el menú de usuario (esquina superior derecha), selecciona **"Cerrar Sesión"**.

---

## 5. Navegación General

### Barra superior
- **Logo UNID** — Volver al catálogo de clubes.
- **Categorías** — Filtrar clubes por "Todos", "Deportes", "Cultura", "Tecnología".
- **Estado** — Píldoras para filtrar: "Todos", "Abiertos", "Próximos", "Cerrados".
- **Campana** — Notificaciones (si hay sesión iniciada). Polling cada 30s.
- **Icono de cuadrícula** — Ir al dashboard (si hay sesión).
- **Menú de usuario** — Dashboard / Ayuda / Cerrar sesión.

### Navegación inferior (móvil)
- **Inicio** — Volver al catálogo.
- **Mi Club** — Acceso directo al panel del alumno (si tiene inscripción activa).
- **Perfil / Iniciar Sesión** — Acceso al dashboard o al login.

### Splash Screen
Al cargar la aplicación, se muestra una pantalla de presentación mientras se inicializan la autenticación y los datos.

---

## 6. Catálogo de Clubes (Visitante / Alumno)

Ruta: `/`

### Hero / Carrusel
- Presentación visual con imágenes de actividades universitarias. Las diapositivas se gestionan desde el panel de administración.
- Botón **"Explorar Clubes"** que hace scroll al catálogo.

### Catálogo
- Grid de tarjetas con imagen, categoría, nombre, descripción y cupo disponible.
- **Clic en una tarjeta** abre la vista de detalle del club.
- Las tarjetas con estado "Próximamente" se muestran atenuadas y no son seleccionables.
- Si el club está lleno, se muestra el texto en rojo.
- Filtros por categoría y por estado (abiertos/próximos/cerrados).

### Detalle del Club
- **Sidebar:** Datos del club (categoría, estatus, horarios, lugar).
- **Información general:** Descripción del club.
- **Horarios:** Días y horas de actividad (vista de calendario semanal con mapa de ubicación).
- **Ubicación:** Lugar donde se reúne el club con mapa interactivo (Leaflet).
- **Formulario de inscripción:** Visible si el alumno no está autenticado (se le pide iniciar sesión). Si está autenticado y no tiene club, puede postularse.

---

## 7. Panel del Alumno

Ruta: `/dashboard`

### Vista "Mi Club" (si es miembro)
- **Banner de bienvenida** con el nombre del club (descartable).
- **Información del club:** Descripción, horarios.
- **Horarios:** Calendario semanal del club con días, horas y lugar.
- **Avisos del club:** Publicaciones del presidente visibles para miembros.
- **Miembros:** Lista de miembros del club con avatar y nombre.

### Vista "Mis Postulaciones" (si no es miembro)
- **Tarjeta de postulación:** Muestra el estado de cada postulación a clubes (máximo 3 activas).
- **Timeline:** Progreso visual de la postulación con 6 estados:
  - En revisión → Preseleccionado → Convocado → Oferta enviada → Miembro oficial / Rechazado
- **Oferta:** Si el presidente le ofrece un cupo, puede aceptar o rechazar.
- **Cancelar postulación:** El alumno puede retirar su solicitud si está en revisión, preseleccionado, convocado u oferta enviada.

### Redirección automática
Si el usuario tiene rol Presidente, Vicepresidente, Admin o Rectoría, es redirigido automáticamente a su dashboard correspondiente.

---

## 8. Panel del Presidente / Vicepresidente

Ruta: `/presidente/dashboard`

### Mi Club
- **Información del club:** Datos generales.
- **Avisos:** Crear y gestionar publicaciones visibles para los miembros del club.
- **Enviar Anuncio:** Enviar notificaciones push a todos los miembros del club.
- **Miembros:** Lista de miembros inscritos.
- **Horarios:** Gestión de horarios semanales del club (día, hora inicio, hora fin, lugar, ubicación en mapa).

### Formularios (Solicitudes)
- Solicitudes de alumnos que desean inscribirse al club, con 5 etapas:
  1. **Estado** — Configuración de convocatoria (fechas, cupo máximo)
  2. **Formularios** — Revisión de solicitudes entrantes
  3. **Evaluaciones** — Preseleccionar o rechazar solicitantes
  4. **Selección** — Asignar bloques y enviar ofertas
  5. **Ofertas** — Seguimiento de ofertas enviadas (aceptadas/rechazadas/expiradas)

### Convocatorias
- **Configuración:** Fecha de apertura, fecha límite, cupo máximo de postulaciones.
- **Cierre manual:** Opción para cerrar la convocatoria manualmente.
- **Generar convocatoria:** Crea automáticamente horarios basados en los bloques del club.
- **Vista previa:** Muestra cómo se verá la convocatoria antes de enviarla.
- **Enviar:** Notifica a los alumnos aprobados sobre los horarios disponibles.
- **Editar / Eliminar:** Gestionar convocatorias existentes.

### Selección Final
- **Preseleccionados con bloque:** Alumnos aprobados con bloque horario asignado.
- **Preseleccionados sin bloque:** Alumnos aprobados pendientes de asignación de horario.
- **Ofertar cupo:** Envía ofertas de inscripción a los alumnos seleccionados (expiran en 72h).
- **Tarjetas de alumno:** Muestra nombre, correo y acciones para cada preseleccionado.

---

## 9. Panel del Administrador

Ruta: `/admin/dashboard`

### Resumen / Dashboard
- Tarjetas con totales: **Alumnos**, **Clubes Activos**, **Inscripciones Activas**.
- Gráfica de inscripciones por mes.
- Clubes más populares.
- Últimas inscripciones y actividad reciente.

### Gestión de Usuarios
- **Barra de búsqueda:** Filtra por ID, nombre o correo.
- **Tabla de usuarios:** Muestra ID, nombre, correo, rol, club y acciones.
- **Cambiar rol:** Selector para cambiar entre Alumno (1) y Presidente (2).
- **Asignar club (a presidentes):** Selector para asignar/desasignar un presidente a un club.
- **Crear usuario:** Modal para registrar nuevos usuarios.
- **Dar de baja:** Soft-delete de usuario (se marca `deleted_at`).
- **Reactivar:** Restaurar un usuario dado de baja.
- **Acciones protegidas:** Cambios de rol a Admin requieren contraseña secundaria.

### Gestión de Clubes
- **Tabla de clubes:** Muestra ID, nombre, categoría, cupo, estatus y acciones.
- **Cambiar estatus:** Selector con opciones Activo / Próximamente / Inactivo.
- **Editar:** Modificar nombre, categoría y cupo del club.
- **Dar de Baja:** Cambia el estatus a Inactivo.
- **Agregar Nuevo Club:** Modal para crear un club con nombre, categoría y cupo.

### Banner Principal
- Gestión del carrusel de diapositivas del hero (página de inicio).
- **Agregar:** Nueva diapositiva con título, subtítulo e imagen (subida a Cloudinary).
- **Editar:** Modificar texto o imagen de diapositivas existentes.
- **Reordenar:** Arrastrar y soltar para cambiar el orden (máximo 6 activas).
- **Activar/Desactivar:** Control de visibilidad individual.
- El sistema protege contra eliminar la última diapositiva activa.

### Anuncios Globales
- Formulario para redactar y enviar anuncios a todos los usuarios o a un club específico.

### Historial de Acciones
- Tabla con fecha, administrador, acción y descripción de todos los cambios realizados en el sistema.

### Actividad del Sistema
- Feed en tiempo real de eventos del sistema (creación de clubes, postulaciones, cambios de estatus, etc.).

---

## 10. Panel de Rectoría

Ruta: `/rectoria/dashboard`

### Dashboard (Resumen)
- **Tarjetas de estadísticas:** Totales del sistema (alumnos, inscritos, clubes, % ocupación).
- **Barras de ocupación:** Porcentaje de ocupación por club con código de colores:
  - Verde (< 50%), Ámbar (50-79%), Rojo (≥ 80%).
- **Top clubes:** Clubes con mayor ocupación.

### Consulta de Clubes
- Tabla detallada de todos los clubes con información completa.

### Padrón de Alumnos
- **Filtros:** Por club, carrera y búsqueda por nombre o matrícula.
- **Tabla de resultados:** Muestra los datos de los alumnos filtrados.
- **Exportar CSV:** Descarga el padrón filtrado en formato CSV.

### Listas de Asistencia
- **Selector de club:** Elige el club a consultar.
- **Tabla de asistencia:** Alumnos con bloque asignado y estatus.

### Actividad del Sistema
- Feed de eventos del sistema similar al del panel de administración.

---

## 11. Estructura del Proyecto

```
clubes-unid/
├── backend/
│   ├── index.js                  # Servidor Express
│   ├── db.js                     # Pool de PostgreSQL
│   ├── schema.sql                # Esquema completo de BD
│   ├── seed.sql                  # Datos de prueba
│   ├── migrate.js                # Ejecutor de migraciones
│   ├── middleware/
│   │   └── auth.js               # JWT, roles, club leader
│   ├── lib/
│   │   ├── audit.js              # Logging de acciones admin
│   │   ├── clubActivity.js       # Logging de eventos del sistema
│   │   ├── estadoClub.js         # Máquina de estados de convocatoria
│   │   └── asistenciaTemplate.js # Template HTML de asistencia
│   ├── routes/                   # 17 archivos de rutas
│   └── migrations_legacy/        # Migraciones históricas (22 scripts)
├── src/
│   ├── main.jsx                  # Entry point (MSAL + Router + Contexts)
│   ├── App.jsx                   # Rutas, navbar, modales, splash
│   ├── index.css                 # Tailwind v4
│   ├── assets/                   # Imágenes, SVGs
│   ├── config/
│   │   └── layout.js             # Constantes de layout
│   ├── constants/
│   │   └── colores.js            # Constantes de colores
│   ├── contexts/
│   │   ├── AuthContext.jsx        # Estado de autenticación
│   │   ├── NotificationContext.jsx # Sistema de notificaciones
│   │   └── ThemeContext.jsx       # Tema claro/oscuro
│   ├── hooks/                    # 14 custom hooks
│   ├── services/
│   │   ├── api.js                # Capa de servicio API (~80 métodos)
│   │   └── authConfig.js         # Configuración MSAL (Azure AD)
│   ├── utils/
│   │   ├── formato.js            # Formateo de strings
│   │   ├── fechas.js             # Utilidades de fecha
│   │   └── imagen.js             # Resolución de URLs de imágenes
│   ├── pages/                    # 5 páginas principales
│   └── components/
│       ├── admin/                # ~15 componentes del panel admin
│       ├── alumno/               # Componentes del panel del alumno
│       ├── clubes/               # Catálogo y detalle de clubes
│       │   └── sections/         # Subcomponentes (horarios, etc.)
│       ├── formularios/          # Formularios de inscripción
│       ├── layout/               # 9 componentes de layout
│       ├── modals/               # Modales (login, éxito)
│       ├── presidente/           # ~20 componentes del panel presidente
│       ├── rectoria/             # Componentes del panel rectoría
│       └── ui/                   # ~20 componentes atómicos reutilizables
├── package.json                  # Dependencias del frontend
├── vite.config.js                # Configuración de Vite
├── postcss.config.js             # PostCSS + Tailwind v4
├── eslint.config.js              # ESLint flat config
└── vercel.json                   # Configuración de despliegue Vercel
```

---

## 12. API — Endpoints Principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login-local` | Login con correo y contraseña |
| POST | `/api/auth/login-microsoft` | Login con token de Microsoft |
| POST | `/api/auth/register` | Registrar nuevo usuario (admin) |
| GET | `/api/auth/me` | Obtener perfil del usuario actual |

### Clubes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clubes` | Listar todos los clubes |
| GET | `/api/clubes/:id` | Obtener detalle de un club |
| POST | `/api/clubes` | Crear club |
| PUT | `/api/clubes/:id` | Actualizar club |
| PUT | `/api/clubes/:id/estatus` | Cambiar estatus |
| PUT | `/api/clubes/:id/vicepresidente` | Asignar/remover vicepresidente |
| GET | `/api/clubes/:id/miembros` | Listar miembros del club |
| GET | `/api/clubes/:id/convocatoria` | Obtener configuración de convocatoria |
| PUT | `/api/clubes/:id/convocatoria` | Actualizar configuración de convocatoria |
| POST | `/api/clubes/:id/cerrar-convocatoria` | Cerrar convocatoria manualmente |
| GET | `/api/clubes/actividad` | Obtener actividad del sistema |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios` | Listar usuarios |
| PUT | `/api/usuarios/:id/rol` | Cambiar rol |
| PUT | `/api/usuarios/:id/asignar-club` | Asignar club a presidente |
| DELETE | `/api/usuarios/:id` | Soft-delete de usuario |
| PATCH | `/api/usuarios/:id/reactivar` | Reactivar usuario |
| POST | `/api/usuarios/admin-action` | Acciones protegidas (requiere contraseña admin) |

### Inscripciones / Formularios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inscripciones/activa` | Obtener inscripción activa |
| POST | `/api/inscripciones` | Crear inscripción |
| DELETE | `/api/inscripciones/:userId` | Dar de baja inscripción |
| GET | `/api/formularios` | Listar formularios del alumno |
| GET | `/api/formularios/mis-postulaciones` | Postulaciones del alumno con detalle |
| POST | `/api/formularios` | Enviar formulario de postulación |
| GET | `/api/formularios/pendientes/:clubId` | Solicitudes pendientes del club |
| GET | `/api/formularios/todos/:clubId` | Todas las solicitudes del club |
| PUT | `/api/formularios/:id/estatus` | Actualizar estatus de solicitud |
| PUT | `/api/formularios/:id/bloque` | Asignar bloque horario |
| PATCH | `/api/formularios/:id/cancelar` | Cancelar postulación (alumno) |
| POST | `/api/formularios/seleccionar` | Seleccionar alumnos finales |
| GET | `/api/formularios/ofertas/:clubId` | Historial de ofertas del club |

### Convocatorias
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/convocatorias/preview/:clubId` | Vista previa de convocatoria |
| POST | `/api/convocatorias/generar` | Generar convocatoria |
| GET | `/api/convocatorias/:clubId` | Listar convocatorias |
| PUT | `/api/convocatorias/:id` | Actualizar convocatoria |
| POST | `/api/convocatorias/:id/enviar` | Enviar convocatoria |
| POST | `/api/convocatorias/ofertas` | Enviar ofertas a alumnos |

### Ofertas
| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/api/ofertas/:id/respuesta` | Aceptar/rechazar oferta |

### Avisos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/avisos/:clubId` | Listar avisos del club |
| POST | `/api/avisos` | Crear aviso |
| DELETE | `/api/avisos/:id` | Eliminar aviso |

### Notificaciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notificaciones` | Listar notificaciones del usuario |
| GET | `/api/notificaciones/actividad` | Notificaciones de actividad |
| POST | `/api/notificaciones` | Crear notificación |
| POST | `/api/notificaciones/:id/leer` | Marcar como leída |
| POST | `/api/notificaciones/leer-todas` | Marcar todas como leídas |
| DELETE | `/api/notificaciones/:id` | Eliminar notificación |
| DELETE | `/api/notificaciones/all` | Eliminar todas las notificaciones |

### Estadísticas (Rectoría)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/estadisticas/dashboard` | Estadísticas generales |
| GET | `/api/estadisticas/ocupacion-clubes` | Ocupación por club |
| GET | `/api/estadisticas/top-clubes` | Clubes con más miembros |
| GET | `/api/estadisticas/clubes-detalle` | Detalle de todos los clubes |
| GET | `/api/estadisticas/padron` | Padrón de alumnos (con filtros) |
| GET | `/api/estadisticas/asistencia/:clubId` | Lista de asistencia por club |

### Horarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/horarios/club/:idClub` | Obtener horarios del club |
| POST | `/api/horarios/club/:idClub` | Agregar horario al club |
| PUT | `/api/horarios/:id` | Actualizar horario |
| DELETE | `/api/horarios/:id` | Eliminar horario |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/asignar-alumno` | Asignar alumno a club |
| GET | `/api/admin/dashboard-data` | Datos del dashboard admin |

### Diapositivas Hero
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/diapositivas-hero` | Listar diapositivas activas (público) |
| GET | `/api/diapositivas-hero/admin` | Listar todas (admin) |
| POST | `/api/diapositivas-hero` | Crear diapositiva |
| PUT | `/api/diapositivas-hero/:id` | Actualizar diapositiva |
| DELETE | `/api/diapositivas-hero/:id` | Eliminar diapositiva |

### Otros
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/historial` | Historial de acciones admin |
| POST | `/api/upload/imagen` | Subir imagen a Cloudinary |
| GET | `/api/health` | Health check |

---

## 13. Componentes UI Reutilizables

| Componente | Descripción |
|------------|-------------|
| `Icono` | Renderiza iconos SVG por nombre clave (Heroicons) |
| `Alerta` | Alertas contextuales con variantes: error, success, warning, info |
| `BotonAccion` | Botón reutilizable con variantes primary, danger, success, outline |
| `ModalBase` | Modal con overlay, cierre al hacer clic fuera y ancho configurable |
| `ModalConfirmacion` | Modal de confirmación con acciones sí/no |
| `Spinner` | Indicador de carga circular con tamaños sm, md, lg |
| `Badge` | Etiqueta tipo badge con colores predefinidos |
| `CampoTexto` | Input/textarea con label y validación de error |
| `CampoSelect` | Select con label, placeholder y opciones |
| `EncabezadoPagina` | Título + subtítulo + área de acciones |
| `TarjetaStat` | Tarjeta de estadística con valor numérico |
| `BarraOcupacion` | Barra de progreso con color según umbrales |
| `AvatarInicial` | Avatar circular con la inicial del nombre |
| `PantallaCompletado` | Pantalla de éxito con icono, texto y botón de volver |
| `EmptyState` | Estado vacío con icono y mensaje |
| `BadgeNotificaciones` | Indicador de notificaciones no leídas |
| `ErrorBoundary` | Captura de errores de React |
| `SplashScreen` | Pantalla de carga inicial |
| `SelectorMapa` | Selector de ubicación con Leaflet |
| `CeldasTabla` | Componentes Th/Td para tablas |
| `BotonMicrosoft` | Botón de inicio de sesión con Microsoft |

---

## 14. Solución de Problemas

### Error: "usuario is null" o pantalla en blanco
- Asegúrate de que el backend esté corriendo (puerto 4000 en desarrollo).
- Limpia localStorage y recarga: `localStorage.clear(); location.reload();`

### Error al iniciar sesión con Microsoft
- Verifica que la aplicación esté registrada en Azure AD con el redirect URI correcto.
- En desarrollo, el redirect URI debe ser `http://localhost:5173`.

### Error "Cuenta desactivada" al iniciar sesión
- El administrador pudo haber dado de baja la cuenta (soft-delete).
- Contacta al administrador para reactivar la cuenta.

### Error al realizar acciones de administrador
- Algunas acciones (como cambiar a rol admin) requieren una contraseña secundaria (`ADMIN_SECRET`).
- Consulta con el administrador del sistema la contraseña requerida.

### Error de compilación
```bash
npm run build
```
Si falla, revisa que no haya errores de sintaxis o imports faltantes.

### Proxy no funciona en desarrollo
- Verifica que el backend esté corriendo en `http://localhost:4000`.
- La configuración del proxy está en `vite.config.js`.

### Error al subir imágenes
- Verifica que las credenciales de Cloudinary estén configuradas correctamente en las variables de entorno.
