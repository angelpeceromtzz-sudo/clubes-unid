# Clubes UNID Campeche — SPA

Sistema de gestión de clubes universitarios para UNID Campeche. Permite a alumnos postularse a clubes, y a presidentes/administradores gestionar convocatorias, bloques, asistencias y ofertas de ingreso.

---

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

Ejecutar migraciones:

```bash
node migrate.js
```

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
VITE_API_URL=http://localhost:4000
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
2. El proceso en Render ejecuta `node migrate.js` (aplica `schema.sql`,
   idempotente) **al arrancar**: solo debe hacerlo tras superar el paso 1.
3. **Migración aditiva del hero**: aplicar
   `backend/migrations/migrate-diapositivas-hero-movil.sql` (o asegurar que
   `schema.sql` versionado ya contenga `url_imagen_movil`) **antes** de
   usar la nueva columna en API/UI. `migrate.js` solo ejecuta `schema.sql`;
   el archivo de migración del hero no corre solo.

### Orden operativo

1. Revisar H17 y planificar la remediación de las cuentas demo (seed) antes
   de abrir el servicio a usuarios reales.
2. Coordinar la rotación de credenciales (H3) con la actualización de los
   servicios consumidores (Render, Vercel, GitHub) para no romper llamadas
   en vuelo.
3. Incluir la migración aditiva del hero antes de utilizar la nueva
   columna `url_imagen_movil`.
4. Comprobar TLS mediante una conexión aislada antes de arrancar el backend
   con migraciones automáticas.
5. Desplegar en este orden, cuando se autorice: backend en Render →
   frontend en Vercel (con los merges y arreglos registrados en
   `SEGURIDAD-PROGRESO.md`).
6. Verificación posterior: cabeceras H5b (`curl -I`), 404 global, rate
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

# Backend
cd backend && npm run dev     # Desarrollo con hot-reload
cd backend && npm start       # Producción
```
