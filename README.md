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

Las propuestas de convocatoria pendientes pasan a **Vencida · requiere nuevas fechas** si llega su cierre de inscripciones o la fecha y hora de evaluación antes de aprobarse. La comprobación se realiza al consultar y al intentar aprobar, usando la zona `America/Mexico_City` para los bloques. El presidente puede corregir y reenviar; Coordinación debe revisar otra vez. No se cambia la convocatoria publicada ni se convoca a alumnos al vencer. Las propuestas de inscripción anteriores se conservan en su tabla. Sin fecha de cierre, la propuesta de inscripción no vence; una apertura que ya pasó puede aprobarse mientras el cierre siga vigente. No se aceptan nuevos envíos a revisión con un cierre o una evaluación en el pasado. El estado nuevo se incorpora automáticamente al reiniciar el backend con `schema.sql`.

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
| **Infraestructura** | Frontend en Vercel, backend en Render, base de datos en Supabase (comunicado por el equipo; **destino desplegado pendiente de confirmación** — el repositorio no es evidencia de él) |

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

- Node.js 20+
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

Crear el archivo `backend/.env` a partir de `backend/.env.example` (los valores
reales nunca se versionan). El frontend usa su propio `.env.local`, basado en el
`.env.example` de la raíz.

Variables del backend (valores falsos; los reales van solo en `backend/.env` o
en el panel de Render/GitHub Secrets):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clubs_bd
DB_USER=postgres
DB_PASSWORD=tu_password_local
DATABASE_URL=
JWT_SECRET=tu_jwt_secret
PORT=4000
ADMIN_CORREO=admin@ejemplo.com
ADMIN_SECRET=tu_admin_secret
CLOUDINARY_URL=cloudinary://api_key_falsa:api_secret_falso@cloud_name_falso
CORS_ORIGIN=http://localhost:5173

# TLS hacia la BD remota: cuando existe DATABASE_URL, el backend exige TLS con
# verificación completa; la cadena NO debe llevar ssl/sslmode/sslrootcert.
# Solo si el proveedor usa una CA propia:
DB_SSL_CA_FILE=

# Rate limiting (H5a/H8): activos por defecto con los valores seguros de
# lib/rateLimits.js. Solo se sobrescribe un umbral concreto si hace falta;
# bloque completo con sus valores por defecto en backend/.env.example. Ejemplos:
# RATE_LIMIT_GLOBAL_MINUTO=1200
# RATE_LIMIT_LOGIN_IP_15MIN=20
# RATE_LIMIT_LOGIN_CUENTA_15MIN=5
# RATE_LIMIT_UPLOAD_MINUTO=30
# En producción (Render) debe existir NODE_ENV=production (H8).
```

Migraciones manuales (el backend ya **no** las ejecuta al arrancar):

```bash
cd backend
# Revisar antes de aplicar. No usar schema.sql completo contra una BD
# compartida sin autorización: contiene DDL legacy.
node migrate.js

# Migración aditiva de OTP (fuente de verdad de otp_codigos):
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/migrate-otp-codigos.sql
```

`otp_codigos` no se crea desde `schema.sql`; se aplica solo con la migración
manual, con respaldo previo. No se ejecuta automáticamente al desplegar.

(Opcional, solo desarrollo local) Sembrar datos de prueba. Úsalo **únicamente
con una base de datos local desechable**: nunca contra Render, Supabase ni
ninguna BD compartida o de producción (crea cuentas demo con contraseña
pública; ver H17 en `AUDITORIA-SEGURIDAD.md`). Apunta siempre a `localhost`
mediante una variable local propia, jamás a `DATABASE_URL`:

```bash
# Requiere psql. Cadena exclusivamente local (sin credenciales reales):
export DATABASE_URL_LOCAL="postgresql://localhost:5432/clubs_bd_local"
psql "$DATABASE_URL_LOCAL" -f backend/seed.sql
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
# Tercera opción de acceso; ponla en true solo si el backend tiene
# AUTH_OTP_ENABLED=true y la migración OTP ya fue aplicada.
VITE_AUTH_OTP_ENABLED=false
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
| **Render** | Backend | Servicio Web, variables de entorno desde dashboard |
| **Supabase** | Base de datos (PostgreSQL) | Conexión desde backend vía `DATABASE_URL` (SSL) |

> **Destino desplegado: pendiente de confirmación.** La infraestructura
> comunicada es frontend en Vercel, backend en Render y BD en Supabase; la
> confirmación del destino real requiere información autorizada (estos
> documentos no la sustituyen). No imprimir `DATABASE_URL` ni credenciales
> en documentos, reportes o logs.

### Variables en producción

- **Vercel**: variables `VITE_*` (URL del API, Azure), horneadas en el build.
- **Render** (dashboard): `DATABASE_URL` **sin** parámetros `ssl`/`sslmode`
  (el backend exige TLS verificado; ver `backend/.env.example`) y sin `DB_*`
  locales; `JWT_SECRET` y `ADMIN_SECRET` con valores nuevos (H3);
  `CLOUDINARY_URL`; `CORS_ORIGIN` de producción; `NODE_ENV=production` (H8);
  `DB_SSL_CA_FILE` solo si el proveedor exige CA propia; umbrales
  `RATE_LIMIT_*` solo si hay que ajustar un valor (defectos en
  `backend/.env.example`).
- `backend/seed.sql` **nunca se ejecuta en producción** (solo BD local
  desechable; ver apartado de instalación).

### Migraciones y verificación previa

1. **Comprobar TLS con una conexión aislada** (cliente `psql` u otro desde
   una terminal, fuera del servicio) contra la BD **antes** de arrancar el
   backend: la cadena no debe llevar `sslmode` y la validación debe
   completarse sin errores. No imprimir la URL ni credenciales.
2. El proceso en Render **no ejecuta** `schema.sql` al arrancar. Las
   migraciones se aplican manualmente, con respaldo previo, desde una terminal
   autorizada. `migrate.js` queda como comando manual y no debe usarse con
   `schema.sql` completo contra una BD compartida sin revisión.
3. **Migración aditiva del hero**: aplicar
   `backend/migrations/migrate-diapositivas-hero-movil.sql` (o asegurar que
   `schema.sql` versionado ya contenga `url_imagen_movil`) **antes** de
   usar la nueva columna en API/UI. `migrate.js` solo ejecuta `schema.sql`;
   el archivo de migración del hero no corre solo.

### Correo OTP en Render Free (Resend)

Render Free bloquea las conexiones SMTP salientes en los puertos 25, 465 y 587.
Para producción usa Resend por HTTPS; SMTP queda solo como compatibilidad.

En Render configura explícitamente:

```env
OTP_MAIL_PROVIDER=resend
RESEND_API_KEY=tu_api_key_de_resend
RESEND_FROM=Clubs UNID <no-reply@tu-dominio-verificado>
```

`RESEND_FROM` debe usar un remitente de un dominio verificado en Resend. Si
faltan estas variables, el backend falla cerrado y responde 503 sin generar
código.

`backend/.env.example` conserva `OTP_MAIL_PROVIDER=mock` como valor seguro por
defecto para desarrollo y pruebas.

### Orden operativo

1. Revisar H17 y planificar la remediación de las cuentas demo (seed) antes
   de abrir el servicio a usuarios reales.
2. Coordinar la rotación de credenciales (H3) con la actualización de los
   servicios consumidores (Render, Vercel, GitHub) para no romper llamadas
   en vuelo.
3. Incluir la migración aditiva del hero antes de utilizar la nueva
   columna `url_imagen_movil`.
4. **OTP**: aplicar `backend/migrations/migrate-otp-codigos.sql` antes de
   habilitar `AUTH_OTP_ENABLED=true`. Es la fuente de verdad de
   `otp_codigos`; no está en `schema.sql` ni se ejecuta al desplegar.
5. Comprobar TLS mediante una conexión aislada antes de arrancar el backend
   con migraciones manuales.
6. Desplegar en este orden, cuando se autorice: backend en Render →
   frontend en Vercel (con los merges y arreglos registrados en
   `SEGURIDAD-PROGRESO.md`).
7. Verificación posterior: cabeceras H5b (`curl -I`), 404 global, rate
   limits, login real y hero móvil con dato real.

> Las comprobaciones que dependen del entorno desplegado (rotación H3, H4,
> `NODE_ENV`, cabeceras, datos de BD, install command de Render, umbrales
> efectivos) quedan **pendientes** con sus estados en
> `SEGURIDAD-PROGRESO.md`.

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
