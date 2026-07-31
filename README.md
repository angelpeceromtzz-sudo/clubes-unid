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

# Backend
cd backend && npm run dev     # Desarrollo con hot-reload
cd backend && npm start       # Producción
```
