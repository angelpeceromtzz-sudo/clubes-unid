# Clubes UNID Campeche — SPA

Sistema de gestión de clubes universitarios para UNID Campeche. Permite a alumnos postularse a clubes, y a presidentes/administradores gestionar convocatorias, bloques, asistencias y ofertas de ingreso.

---

## Mural digital

Administración, Rectoría y el rol **responsable del mural** tienen la sección **Mural digital** para crear, editar, publicar, destacar, ocultar y eliminar publicaciones con imagen, resumen, mensaje, enlace y último día visible. También pueden configurar la dirección del QR. Se pueden editar desde el panel o desde las tarjetas públicas al iniciar sesión como editor. El responsable accede desde `/mural/dashboard`; sus noticias y eventos siguen el flujo de aprobación de Rectoría. Las fechas académicas se administran desde Coordinación y Rectoría.

En el panel, **Dirección pública del sitio** guarda en la base de datos el destino del QR. También se utiliza `VITE_PUBLIC_URL` o el origen actual si no hay una dirección guardada. El QR abre `/calendario?vista=mural`, sin sesión, y se descarga en PNG o SVG. Una dirección localhost solo sirve en el equipo de desarrollo; usa el dominio publicado para compartirlo con teléfonos.

Al reiniciar el backend, `schema.sql` crea `publicaciones_mural` y `configuracion_mural` de forma aditiva. No hay que ejecutar el seed. Las publicaciones vencidas permanecen en administración y se excluyen de la consulta pública usando la fecha de America/Mexico_City. Validación: `npm run test:mural` y `npm run test:calendario`.

## PBI-12 y PBI-13: Coordinación VIVE

Coordinación VIVE corresponde al rol existente `admin` (id 3). En el panel dispone de **Convocatorias VIVE** y **Aprobación de horarios**. El presidente crea las convocatorias de su propio club (inscripción y bloques de evaluación), completa sus datos y las envía a revisión. Admin aprueba y publica/envía, o devuelve con observaciones obligatorias. Una propuesta de inscripción no altera la configuración pública antes de ser aprobada; generar o enviar un bloque a revisión tampoco convoca alumnos. Los vicepresidentes conservan la consulta; la preselección y selección mantienen su flujo existente. Las escrituras comprueban rol, club y estado en el backend.

El presidente elige días y horas recurrentes desde **Horario** y pulsa **Enviar horario a aprobación**, sin un paso visible de guardar borrador. El horario se repite cada semana sin límite de semanas y, por defecto, no vence. Se puede delimitar un periodo opcional de inicio y término. Puede retirar una propuesta pendiente para corregirla. Coordinación aprueba o rechaza con observaciones; el sistema notifica a los interesados y registra la decisión. Los horarios oficiales solo cambian con una aprobación. Un reemplazo futuro conserva el horario anterior hasta su inicio de vigencia. Las sesiones previas al cambio se conservan como horarios oficiales existentes.

Los espacios se eligen de un catálogo administrado por Coordinación. Se comprueban cruces dentro del club y ocupación de espacios entre clubes, incluyendo vigencias y horas consecutivas. Al aprobar se repite la validación dentro de una transacción con bloqueo para evitar reservas simultáneas. Las antiguas escrituras directas de horarios devuelven 409 y no permiten eludir la revisión. La migración aditiva se ejecuta al iniciar el backend; no se necesita el seed.

Verificación: `npm run test:permisos-horarios` ejecuta pruebas de integración de PostgreSQL en un esquema temporal exclusivo, que se elimina al finalizar. No utiliza las tablas de datos del sistema. Requiere las credenciales del archivo `backend/.env`.

## Tech Stack

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| **Backend** | Express.js, PostgreSQL (pg), JWT |
| **Autenticación** | Azure MSAL (Microsoft Entra ID) |
| **Almacenamiento** | Cloudinary (imágenes) |
| **Mapas** | Leaflet / react-leaflet |
| **Gráficos** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Infraestructura** | Vercel (frontend), Render (backend + DB) |

---

## Características

- Postulación en línea con formulario dinámico
- Gestión de convocatorias con generación automática de bloques
- Lista de asistencia con impresión
- Panel de presidente (selección de postulantes, bloques, ofertas)
- Panel de administración (CRUD de usuarios, clubes, carreras)
- Panel de rectoría (estadísticas, control de clubes)
- Notificaciones en app + notificaciones nativas del navegador
- Autenticación con cuenta institucional Microsoft
- Modo oscuro / claro
- Calendario académico con captura en administración mediante concepto, símbolo y fecha o periodo; incluye sugerencias para parciales, calificaciones, pagos y vacaciones
- Vista pública con emojis y pestañas de calendario y mural; las noticias y los avisos globales se agregan al mural mediante una opción al publicar

---

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Cuenta de Azure AD con aplicación registrada (MSAL)
- Cuenta de Cloudinary (opcional, para imágenes)

---

## Instalación

### 1. Clonar

```bash
git clone https://github.com/angelpeceromtzz-sudo/clubes-unid.git
cd clubes-unid
```

### 2. Backend

```bash
cd backend
npm install
```

Crear archivo `.env` en `backend/` basado en `.env.example`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clubs_bd
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_secreto_jwt
PORT=4000
ADMIN_CORREO=admin@ejemplo.com
ADMIN_SECRET=clave_admin
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CORS_ORIGIN=http://localhost:5173
```

Ejecutar migraciones:

```bash
node migrate.js
```

(Opcional) Sembrar datos de prueba:

```bash
node seed.sql  # o el script que corresponda
```

### 3. Frontend

```bash
cd ..
npm install
```

Crear archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:4000/api
VITE_AZURE_CLIENT_ID=tu_client_id_de_azure
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/tu_tenant_id
VITE_AZURE_REDIRECT_URI=http://localhost:5173
```

---

## Ejecución local

En dos terminales:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend
npm run dev
```

El frontend corre en `http://localhost:5173`, el backend en `http://localhost:4000`.

---

## Estructura del proyecto

```
clubes-unid/
├── backend/
│   ├── routes/          # Rutas Express por módulo
│   ├── lib/             # Utilidades (template asistencia, etc.)
│   ├── middleware/       # Autenticación y roles
│   ├── migrations/      # Migraciones de base de datos
│   ├── index.js         # Punto de entrada del servidor
│   └── db.js            # Pool de conexión PostgreSQL
├── src/
│   ├── components/      # Componentes React organizados por feature
│   ├── contexts/        # Contextos (auth, theme, notifications)
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Páginas principales
│   └── services/        # Llamadas a la API
├── public/              # Assets estáticos
├── package.json         # Dependencias frontend
├── vite.config.js       # Configuración de Vite
├── vercel.json          # Configuración de despliegue Vercel
└── .env.example         # Variables de entorno de ejemplo
```

---

## Despliegue

| Plataforma | Componente | Configuración |
|---|---|---|
| **Vercel** | Frontend | `vercel.json` apunta a Vite, SPA fallback a `index.html` |
| **Render** | Backend + DB | Servicio Web + PostgreSQL, variables de entorno desde dashboard |

Las variables de entorno en producción deben configurarse en cada plataforma. El backend en Render usa `DATABASE_URL` para la conexión SSL a PostgreSQL.

---

## Scripts disponibles

```bash
# Frontend
npm run dev      # Servidor de desarrollo
npm run build    # Build producción
npm run lint     # ESLint
npm run preview  # Vista previa del build
npm run test:calendario  # Pruebas de periodos, mural y permisos (sin conexión a la base de datos)

# Backend
cd backend && npm run dev     # Desarrollo con hot-reload
cd backend && npm start       # Producción
```

Los cambios del calendario requieren actualizar frontend y backend. Al iniciar el backend, `migrate()` ejecuta `schema.sql`: crea la tabla independiente `fechas_calendario` y traslada las fechas académicas del formato anterior, conservando concepto, periodo, nota, imagen, autor y visibilidad. La copia y retirada del origen se ejecutan juntas para evitar pérdida o duplicación al reintentar. Las fechas se consultan y administran mediante `/api/calendario` y `/api/calendario/admin`; no son noticias ni eventos y no se agregan al mural. Los eventos conservan sus categorías social, deportiva y cultural. Noticias y eventos tienen la opción «También en el mural»; en «Avisos y anuncios» está disponible para la audiencia global. El aviso y su publicación en el mural se guardan en una sola transacción. El mural es público y solo incluye las publicaciones seleccionadas; los eventos vencidos dejan de mostrarse.
