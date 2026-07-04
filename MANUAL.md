# Manual de Uso — Sistema de Gestión de Clubes UNID

## 1. Introducción

Plataforma web para la gestión de clubes universitarios de la UNID (Universidad Hispanoamericana de Oriente). Permite a alumnos explorar clubes, inscribirse, y a los administradores/presidentes/rectoría gestionar usuarios, clubes, convocatorias y asistencia.

**Tecnologías:** React 19, Vite 8, Tailwind CSS 4, MSAL (Azure AD), React Router 7.

---

## 2. Roles del Sistema

| Rol | id_rol | Permisos |
|-----|--------|----------|
| **Alumno** | 1 | Explorar catálogo, inscribirse, ver postulaciones, ver su club |
| **Presidente** | 2 | Gestionar su club, revisar solicitudes, crear convocatorias, seleccionar alumnos |
| **Administrador** | 3 | Gestionar usuarios, clubes, anuncios globales, ver historial |
| **Rectoría** | 4 | Ver estadísticas, consultar clubes, padrón de alumnos, listas de asistencia |

---

## 3. Instalación y Ejecución

### Requisitos
- Node.js 18+
- NPM

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en desarrollo (con proxy al backend en localhost:4000)
npm run dev

# 3. Compilar para producción
npm run build

# 4. Previsualizar build
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
| Rectoría | `rectoria@unid.mx` | `123456` |

### Cierre de sesión
Desde el menú de usuario (esquina superior derecha), selecciona **"Cerrar Sesión"**.

---

## 5. Navegación General

### Barra superior
- **Logo UNID** — Volver al catálogo de clubes.
- **Categorías** — Filtrar clubes por "Todos", "Deportes", "Cultura", "Tecnología".
- **Campana** — Notificaciones (si hay sesión iniciada).
- **Icono de cuadrícula** — Ir al dashboard (si hay sesión).
- **Menú de usuario** — Dashboard / Cerrar sesión.

### Navegación inferior (móvil)
- **Inicio** — Volver al catálogo.
- **Mi Club** — Acceso directo al panel del alumno (si tiene inscripción activa).
- **Perfil / Iniciar Sesión** — Acceso al dashboard o al login.

---

## 6. Catálogo de Clubes (Visitante / Alumno)

Ruta: `/`

### Hero / Carrusel
- Presentación visual con imágenes de actividades universitarias.
- Botón **"Explorar Clubes"** que hace scroll al catálogo.

### Catálogo
- Grid de tarjetas con imagen, categoría, nombre, descripción y cupo disponible.
- **Clic en una tarjeta** abre la vista de detalle del club.
- Las tarjetas con estado "Próximamente" se muestran atenuadas y no son seleccionables.
- Si el club está lleno, se muestra el texto en rojo.

### Detalle del Club
- **Sidebar:** Datos del club (categoría, estatus, horarios, lugar).
- **Información general:** Descripción del club.
- **Horarios:** Días y horas de actividad.
- **Ubicación:** Lugar donde se reúne el club.
- **Formulario de inscripción:** Visible si el alumno no está autenticado (se le pide iniciar sesión). Si está autenticado y no tiene club, puede subir su CV y postularse.

---

## 7. Panel del Alumno

Ruta: `/dashboard`

### Vista "Mi Club" (si es miembro)
- **Banner de bienvenida** con el nombre del club (descartable).
- **Información del club:** Descripción, horarios.
- **Avisos del club:** Publicaciones del presidente visibles para miembros.
- **Miembros:** Lista de miembros del club con avatar y nombre.

### Vista "Mis Postulaciones" (si no es miembro)
- **Tarjeta de postulación:** Muestra el estado de cada postulación a clubes.
- **Timeline:** Progreso visual de la postulación (registro, revisión, convocatoria, oferta, aceptación).
- **Oferta:** Si el presidente le ofrece un cupo, puede aceptar o rechazar.

### Redirección automática
Si el usuario tiene rol Presidente, Admin o Rectoría, es redirigido automáticamente a su dashboard correspondiente.

---

## 8. Panel del Presidente

Ruta: `/presidente/dashboard`

### Mi Club
- **Información del club:** Datos generales.
- **Avisos:** Crear y gestionar publicaciones visibles para los miembros del club.
- **Enviar Anuncio:** Enviar notificaciones push a todos los miembros del club.
- **Miembros:** Lista de miembros inscritos.

### Formularios (Solicitudes)
- Solicitudes de alumnos que desean inscribirse al club.
- Acciones: **Aprobar** o **Rechazar** solicitudes.
- Los alumnos aprobados pueden ser asignados a bloques horarios.

### Convocatorias
- **Generar convocatoria:** Crea automáticamente horarios basados en los bloques del club.
- **Vista previa:** Muestra cómo se verá la convocatoria antes de enviarla.
- **Enviar:** Notifica a los alumnos aprobados sobre los horarios disponibles.
- **Editar / Eliminar:** Gestionar convocatorias existentes.

### Selección Final
- **Preseleccionados con bloque:** Alumnos aprobados con bloque horario asignado.
- **Preseleccionados sin bloque:** Alumnos aprobados pendientes de asignación de horario.
- **Ofertar cupo:** Envía ofertas de inscripción a los alumnos seleccionados.
- **Tarjetas de alumno:** Muestra nombre, correo y acciones para cada preseleccionado.

---

## 9. Panel del Administrador

Ruta: `/admin/dashboard`

### Resumen / Dashboard
- Tarjetas con totales: **Alumnos**, **Clubes Activos**, **Inscripciones Activas**.

### Gestión de Usuarios
- **Barra de búsqueda:** Filtra por ID, nombre o correo.
- **Tabla de usuarios:** Muestra ID, nombre, correo, rol, club y acciones.
- **Cambiar rol:** Selector para cambiar entre Alumno (1) y Presidente (2).
- **Asignar club (a presidentes):** Selector para asignar/desasignar un presidente a un club.
- **Dar de baja:** Remover a un alumno de su club.

### Gestión de Clubes
- **Tabla de clubes:** Muestra ID, nombre, categoría, cupo, estatus y acciones.
- **Cambiar estatus:** Selector con opciones Activo / Próximamente / Inactivo.
- **Editar:** Modificar nombre, categoría y cupo del club.
- **Dar de Baja:** Cambia el estatus a Inactivo.
- **Agregar Nuevo Club:** Modal para crear un club con nombre, categoría y cupo.

### Anuncios Globales
- Formulario para redactar y enviar anuncios a todos los usuarios o a un club específico.

### Historial de Acciones
- Tabla con fecha, administrador, acción y descripción de todos los cambios realizados en el sistema.

---

## 10. Panel de Rectoría

Ruta: `/rectoria/dashboard`

### Dashboard (Resumen)
- **Tarjetas de estadísticas:** Totales del sistema.
- **Barras de ocupación:** Porcentaje de ocupación por club con código de colores:
  - Verde (< 50%), Ámbar (50-79%), Rojo (≥ 80%).
- **Top clubes:** Clubes con mayor ocupación.

### Consulta de Clubes
- Tabla detallada de todos los clubes con información completa.

### Padrón de Alumnos
- **Filtros:** Por club, carrera, turno y búsqueda por nombre.
- **Tabla de resultados:** Muestra los datos de los alumnos filtrados.

### Listas de Asistencia
- **Selector de club:** Elige el club a consultar.
- **Tabla de asistencia:** Alumnos con fecha y hora de registro de asistencia.

---

## 11. Estructura del Proyecto

```
src/
├── assets/            # Imágenes, SVGs
├── components/
│   ├── admin/         # Componentes del panel de administración
│   ├── alumno/        # Componentes del panel del alumno
│   ├── clubes/        # Catálogo y detalle de clubes
│   ├── formularios/   # Formularios de inscripción y notificaciones
│   ├── layout/        # Barra de navegación, footer, sidebar, etc.
│   ├── modals/        # Modales de inicio de sesión y otros
│   ├── presidente/    # Componentes del panel del presidente
│   ├── rectoria/      # Componentes del panel de rectoría
│   └── ui/            # Componentes atómicos reutilizables
├── constants/         # Constantes (colores, etc.)
├── contexts/          # Contextos de React (Auth, Theme)
├── data/              # Datos estáticos
├── hooks/             # Custom hooks (usePanelAdmin, useClubes, etc.)
├── pages/             # Páginas principales (App, Paneles, Inicio)
├── services/          # Servicios (API, auth config)
└── utils/             # Utilidades
```

---

## 12. API — Endpoints Principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login-local` | Login con correo y contraseña |
| POST | `/api/auth/login-microsoft` | Login con token de Microsoft |
| GET | `/api/auth/me` | Obtener perfil del usuario actual |

### Clubes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clubes` | Listar todos los clubes |
| GET | `/api/clubes/:id` | Obtener detalle de un club |
| PUT | `/api/clubes/:id/estatus` | Cambiar estatus |
| POST | `/api/clubes` | Crear club |
| PUT | `/api/clubes/:id` | Actualizar club |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios` | Listar usuarios |
| PUT | `/api/usuarios/:id/rol` | Cambiar rol |
| PUT | `/api/usuarios/:id/asignar-club` | Asignar club a presidente |

### Inscripciones / Formularios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inscripciones/activa` | Obtener inscripción activa |
| POST | `/api/inscripciones` | Crear inscripción |
| GET | `/api/formularios` | Listar formularios (alumno) |
| GET | `/api/formularios/pendientes/:clubId` | Solicitudes pendientes |
| PUT | `/api/formularios/:id/estatus` | Aprobar/rechazar solicitud |
| POST | `/api/formularios/seleccionar` | Seleccionar alumnos (presidente) |

### Convocatorias
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/convocatorias/:clubId` | Listar convocatorias |
| POST | `/api/convocatorias/generar` | Generar convocatoria |
| PUT | `/api/convocatorias/:id` | Actualizar convocatoria |
| POST | `/api/convocatorias/:id/enviar` | Enviar convocatoria |

### Ofertas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/convocatorias/ofertas` | Enviar ofertas a alumnos |
| PUT | `/api/ofertas/:id/respuesta` | Aceptar/rechazar oferta |

---

## 13. Componentes UI Reutilizables

| Componente | Descripción |
|------------|-------------|
| `Icono` | Renderiza iconos SVG por nombre clave (Heroicons) |
| `Alerta` | Alertas contextuales con variantes: error, success, warning, info |
| `BotonAccion` | Botón reutilizable con variantes primary, danger, success, outline |
| `ModalBase` | Modal con overlay, cierre al hacer clic fuera y ancho configurable |
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

---

## 14. Solución de Problemas

### Error: "usuario is null" o pantalla en blanco
- Asegúrate de que el backend esté corriendo (puerto 4000 en desarrollo).
- Limpia localStorage y recarga: `localStorage.clear(); location.reload();`

### Error al iniciar sesión con Microsoft
- Verifica que la aplicación esté registrada en Azure AD con el redirect URI correcto.
- En desarrollo, el redirect URI debe ser `http://localhost:5173`.

### Error de compilación
```bash
npm run build
```
Si falla, revisa que no haya errores de sintaxis o imports faltantes.

### Proxy no funciona en desarrollo
- Verifica que el backend esté corriendo en `http://localhost:4000`.
- La configuración del proxy está en `vite.config.js`.
