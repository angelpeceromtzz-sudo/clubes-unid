# Registro de progreso — Fase de seguridad (autónoma)

Este archivo registra el estado de cada hallazgo de `AUDITORIA-SEGURIDAD.md`
y del trabajo funcional autónomo asociado. Sin secretos ni credenciales.
Ramas de trabajo: `fix/seguridad-fase1` (worktree `../clubes-unid-fase1`) y
una rama dedicada para la tarea funcional de hero (ver más abajo). Sin
commits, push, merge ni despliegues.

## Fase de seguridad (worktree `../clubes-unid-fase1`)

| Hallazgo | Prioridad | Estado | Archivos | Pruebas | Dependencias / pendientes |
|---|---|---|---|---|---|
| H1 XSS asistencia | Alta | Corregido (código + pruebas) | `backend/lib/asistenciaTemplate.js` | 7 (unitarias) | Verificación en navegador con servidor real |
| H7 permisos notificaciones | Media | Corregido (código + pruebas) | `backend/lib/notificacionPermisos.js`, `backend/routes/notificaciones.js` | 16 helper + 14 ruta | Regla del rol 4 pendiente de confirmar (§8.2.1) |
| H3 secretos históricos | Inmediata | Mitigado (config) | `.gitleaks.toml` | gitleaks 8.28.0 (historial limpio) | **Operativo:** verificar/rotar credenciales en Render (fuera de este entorno) |
| H2 revalidación JWT | Alta | Corregido (código + pruebas) | `backend/middleware/auth.js`, `backend/routes/auth.js` | 11 + 14 ruta | Verificación con BD real de Render |
| H4 TLS BD | Alta | Corregido (código + pruebas) | `backend/lib/dbTls.js`, `backend/db.js` | 22 + 3 handshake | Verificar despliegue en Render (quitar `sslmode` de la URL) |
| H5a rate limiting | Alta | Corregido (código + pruebas) | `backend/lib/rateLimits.js`, `backend/index.js`, rutas auth/encuestas/formularios/upload/notificaciones | 15 (integración, incluye campus combinado 50 usuarios/IP) | Umbrales provisionales por env; medir uso real y ajustar; verificar XFF de Render |
| H8 skip NODE_ENV encuestas | Media | Corregido (código + pruebas) | `backend/routes/encuestas.js` (+ `lib/rateLimits.js`) | incluidas en las 15 | `NODE_ENV=production` en Render sigue pendiente para otros comportamientos |
| H5b cabeceras | Alta | Corregido (código/config + pruebas) | `backend/lib/securityHeaders.js`, `backend/index.js`, `vercel.json` | 2 | Verificar con `curl -I` tras desplegar; CSP queda en H9 |
| H6 PII clubes público | Media | Corregido (código + pruebas) | `backend/routes/clubes.js`, `src/services/club.service.js`, `src/services/api.js`, `src/hooks/useAdminClubes.js` | 4 (clubesPublico) | H6b: `/:id` sin `presidente_correo`/`id_vicepresidente`; detalle no filtra estatus 3 (decisión). Verificar con `curl` tras desplegar |
| Cloudinary huérfanos | Media | Corregido (código + pruebas) | `backend/lib/eliminarImagenCloudinary.js`, `routes/noticias.js`, `routes/clubes.js` (portada) | 9 (unitarias sin red) | Bug de doble carpeta corregido; borrado con `await` + identidad + `invalidate`; BD antes que borrar. **`diapositivasHero.js` corregido en la rama hero (12 pruebas):** mismo lib (hash idéntico → merge limpio), `await`, `''` → null en escritorio, candidatas post-escritura, guard por identidad |
| H9 JWT en localStorage | Media | Pendiente (diseño) | — | — | Dos frentes separados: **CSP** = cabeceras (defensa en profundidad, no toca auth) y **cookie HttpOnly** = cambio arquitectónico de sesión que exige propuesta revisable antes de implementar. Fase estratégica |
| H10 validación URLs | Media/Baja | Corregido (código + pruebas) | `backend/lib/validarUrl.js`, `routes/horarios.js`, `routes/clubes.js` | 10 (4 helper + 6 ruta) | Esquema http(s) para `ubicacion_maps`; esquema + `/uploads/` para `imagen_portada`. Allowlist estricta Cloudinary opcional. Vector en navegador sin fix: innecesario tras el fix |
| H11 TRUNCATE en arranque | Media | Corregido (código + pruebas) | `backend/schema.sql`, `backend/migrations/migrate-horarios-legado-semanal.sql` | 4 (schemaArranque) | Bloque `DO $$` retirado del arranque; migración manual con advertencias (psql, `pg_dump`, condición `fecha` → no-op). **Operativo:** verificar columna `fecha` en BD de Render |
| H12 SVG subidas | Baja | Corregido (código + pruebas) | `backend/routes/upload.js` | 3 (uploadSvg) | Rechazo 400 antes de Cloudinary; recursos existentes intactos; UI con `accept="image/*"` |
| H13 IDs no numéricos | Baja | Corregido (código + pruebas) | `backend/lib/validarId.js`, 12 routers, `routes/estadisticas.js` | 12 (validarId) | `validarParamsEnteros` en 12 routers; `slug` y router `horarios` excluidos a propósito; query `?id_club` de `/padron` validado |
| H14 `err.message` debug | Baja | Corregido (código + pruebas) | `backend/routes/formularios.js` | 2 (debugPostulaciones) | Detalle solo en `console.error` |
| H15 manejador global | Baja | Corregido (código + pruebas) | `backend/lib/errorHandler.js`, `backend/index.js` | 3 (errorHandler) | 500 genérico; 4xx de `err.status` preservado (JSON malformado → 400) |
| H16 `requireClubLeader` | Baja | Corregido (código + pruebas) | `backend/middleware/auth.js`, `backend/routes/horarios.js` | 13 + 13 (horariosAutorizacion, dos pasos) | Acepta `idClub`/`id_club`/`id`; `requireHorarioLeader` nuevo; inline retirado tras demostración. Reasignación a coordinación: fase aparte |
| H17 seed hash compartido | Baja | Documentado (código) | `backend/seed.sql` | cubierto por 4 (schemaArranque) | Solo advertencia en cabecera; hashes distintos descartados (justificación en §8B.7). **Operativo:** verificar que BD de Render no aplicó el seed |
| H18 URL Cloudinary substring | Baja | Corregido (código + pruebas) | `backend/lib/eliminarImagenCloudinary.js`, `routes/diapositivasHero.js` (+ hero: mismo lib + `routes/noticias.js`) | +3 (eliminarImagenCloudinary) | `esUrlCloudinary` por hostname exacto; ediciones idénticas fase1/hero → merge limpio |
| H19 textos crudos UI | Baja | Corregido (código + pruebas) | `src/services/api-core.js`, `backend/index.js` | 1 estática (errorHandler) + ESLint/build | Mapeo central en `api-core.request()`: fallos sistémicos → texto propio; 4xx de contrato (validación, credenciales, permisos, 429) conservados; 404 global sin método/ruta. Decisión §8B.9 |
| H20 deps de servidor en raíz | Baja | Corregido (manifest + pruebas) | `package.json`, `pnpm-lock.yaml` | ESLint 0, build 0 | `cloudinary`/`multer-storage-cloudinary` fuera del manifest raíz; backend conserva las suyas |
| H21 node_modules stale | Baja | Corregido (local) | `backend/` (`npm ci`) | 154/154 con Express 5.3.0 | Lockfile SÍ estaba en sync; **operativo:** confirmar install command de Render con lockfile |

**Suite backend fase1:** `node --test tests/*.test.mjs` en `../clubes-unid-fase1/backend` → **154/154** (133 previos + 21 nuevos de Fase 2: H13 ×12, H14 ×2, H15 ×3, H18 ×3, H19 ×1). Frontend fase1: ESLint OK, `vite build` OK. Hero (worktree `../clubes-unid-hero`): **12/12**.

## Fase 2 — decisiones de alcance (detalle completo en `AUDITORIA-SEGURIDAD.md` §8B)

- **H13:** solución genérica `validarParamsEnteros` (por `router.param`) en
  los 12 routers con ids; horarios excluido (los middlewares de H16 ya
  validan con mensajes propios, probados), `slug` excluido (cadena legítima
  en encuestas públicas); `/padron` con validación explícita de query.
  Orden `router.param` vs `router.use` documentado en `lib/validarId.js`.
- **H17:** solo advertencia en `seed.sql`; hashes distintos descartados (la
  contraseña está en texto claro en el propio archivo y el arranque no
  ejecuta el seed — cubierto por `schemaArranque.test.mjs`).
- **H19:** mapeo central en `api-core.request()` en vez de los ~65 sitios de
  pintado (`set*(err.message)`): fallos sistémicos (red, no-JSON, ≥500, 404
  global) → texto propio; 4xx de contrato (400 validación, 401
  `Credenciales inválidas`, 403, 429) → conserva `data.error` — mapearlos
  por componente habría roto mensajes necesarios (p. ej. login).
- **H20:** `pnpm remove` en la raíz (manifest + lock, −6 paquetes).
- **H21:** `npm ci` local → Express 5.3.0; no era divergencia de lockfile.

**Hallazgo reportado en Fase 1 (corregido en la Fase 2 — H16):**
`requireClubLeader` ahora acepta `idClub`/`id_club`/`id` con validación de
entero; nuevo `requireHorarioLeader` en `PUT/DELETE /api/horarios/:id`; la
verificación inline de horarios se retiró tras demostrarla en dos pasos
(`horariosAutorizacion.test.mjs` 13/13 en cada paso). Existe igual en
`main` → aplicarlo al mergear.

## Tarea funcional autónoma: hero/banner con imagen móvil

Objetivo: cada slide del hero de `/` puede tener una imagen exclusiva para
móvil (con respaldo a la de escritorio si no existe), reutilizando el flujo
de subida/API/persistencia existente de `diapositivasHero`.

- **Rama/worktree:** `feat/hero-banner-movil` en `../clubes-unid-hero`
  (base `dbd62a5`, sin commits).
- **Estado: implementado y verificado localmente.**
- **Alcance (registrado en `DESIGN.md` §9/§13.2):** `url_imagen_movil`
  aplica solo al carrusel de `/` (`Heroe.jsx` en `PaginaInicio`); la landing
  `/conoce-clubs` usa su hero estático `LANDING.hero.imagen`
  (`src/config/landing.js`) y no consume `diapositivas_hero` — diferencia de
  alcance intencional, no un fallo.
- **Cloudinary en `diapositivasHero.js` (B2, corregido):** reemplaza los
  helpers locales bug (public_id doble, sin `await`) por
  `lib/eliminarImagenCloudinary.js` (archivo idéntico al de fase1, mismo
  hash → merge sin conflicto add/add); `await` en los 4 call sites; escritorio
  `''` → null (COALESCE conserva la imagen obligatoria); candidatas leídas
  DESPUÉS del UPDATE/DELETE; guard por identidad (misma imagen en escritorio
  y móvil no se destruye). `backend/tests/diapositivasHeroMovil.test.mjs`:
  **12/12** (8 originales + 4 nuevas de limpieza, con
  `cloudinary.uploader.destroy` stubbeado). Nota de merge: `noticias.js` de
  esta rama NO se tocó (sigue con los helpers bug de la base); al mergear con
  fix/seguridad-fase1 gana la versión corregida de fase1 sin conflicto.
- Cambios: `schema.sql` (+ `url_imagen_movil`), migración aditiva
  `backend/migrations/migrate-diapositivas-hero-movil.sql` (**no ejecutada**),
  rutas `diapositivasHero.js` (SELECT/POST/PUT/DELETE con limpieza Cloudinary;
  `''` limpia, ausente conserva), `Heroe.jsx` (`<picture>` con
  `source media="(min-width:1024px)"` y preload por viewport; sin imagen móvil
  se conserva el comportamiento actual), `SubirImagen.jsx` (`onRemove`,
  `ayuda`), modal/hook/listas admin (campo, subir/quitar, chip «Con imagen
  móvil»), `DESIGN.md` actualizado.
- Verificaciones: 8/8 pruebas nuevas (`backend/tests/diapositivasHeroMovil.test.mjs`,
  pool simulado), ESLint de los archivos tocados, `vite build` OK.
- Pendientes: verificación visual en navegador; validación de Cloudinary real.

### Guía para mañana (pasos concretos)

1. Revisar el diff de `feat/hero-banner-movil` (`../clubes-unid-hero`).
2. Decidir cuándo aplicar la migración aditiva
   (`migrate-diapositivas-hero-movil.sql`) sobre la BD desplegada; el backend
   sin la columna falla en SELECT/INSERT/PUT que la mencionen → aplicar antes
   de desplegar el backend.
3. Desplegar backend + frontend, y probar en el panel admin: crear/editar un
   banner subiendo una imagen móvil de prueba (retrato, p. ej. 1080×1350),
   verificar el chip «Con imagen móvil», el botón «Quitar» y el carrusel en
   `/` a 390 px (imagen móvil, `object-cover`) y a 1440 px (imagen de
   escritorio).
4. Reemplazar/eliminar la imagen de prueba y verificar que Cloudinary limpia
   los recursos antiguos.

## Tarea C — fix del doble scroll en modales (worktree hero)

Objetivo: eliminar la doble barra de scroll y el doble padding de los
modales (`ModalBase`), incluido el caso de `ModalActualizaciones`.

- **Rama/worktree:** `feat/hero-banner-movil` en `../clubes-unid-hero`
  (misma rama de la tarea hero; sin commits).
- **Causa raíz:** el panel y el div interno de `ModalBase` llevaban ambos
  `max-h-[85vh] overflow-y-auto p-4 sm:p-8` → dos barras apiladas y padding
  doble (32 px móvil / 64 px escritorio) en las 15 llamadas a `ModalBase`.
- **C1 `src/components/ui/ModalBase.jsx`:** panel por defecto solo marco
  visual (border + colores; sin `max-h`/`overflow`/`p-*`/`scrollbar-amber`;
  sin `overflow-hidden` para no recortar la X de `externalClose`); div
  interno como única zona de scroll (`max-h-[85vh] overflow-y-auto
  overscroll-contain p-5 sm:p-8 scrollbar-amber`); nueva prop
  `innerClassName` (override del wrapper para modales que gestionan su
  propio alto con `panelClassName`); `useBloqueoScroll(show)` para bloquear
  el scroll del body mientras el modal está abierto (hook ya existente).
- **C2 `src/components/noticias/ModalActualizaciones.jsx`:**
  `innerClassName=""` (layout propio, sin wrapper con padding/scroll);
  hijo `h-[85vh]` → `h-full` (los `max-h-[92vh] md:max-h-[88vh]` + listas
  `flex-1 min-h-0 overflow-y-auto` quedan como única zona con scroll);
  sin borde propio (el marco lo pone el panel; evita línea doble al
  quitar el padding del wrapper).
- **Alcance:** 15 llamadas `<ModalBase` en hero; modales de capa única
  (`ModalConfirmacion`, `ModalidadClub`, `ModalVP`, etc.) sin cambios;
  `ModalActualizaciones` es el único usuario de `panelClassName`/`innerClassName`.
- **Documentación:** `DESIGN.md` §6 (fila ModalBase), §13.1 fila 8
  (inconsistencia corregida) y §13.2 (iteración con pendiente visual).
- **Verificaciones ejecutadas:** ESLint (`npm run lint`) OK; `npm run build`
  OK (aviso de chunk >500 kB preexistente); backend hero
  `node --test tests/*.test.mjs` → **12/12**; backend fase1 → **113/113**.
- **Pendiente:** verificación visual en navegador (una sola barra en
  móvil/escritorio, sin desbordes, X de `externalClose` sin recorte,
  bloqueo del fondo) — sin navegador en la sesión.
- **Comprobación concreta de integración (pendiente, al unir ramas):**
  compatibilidad de `ModalInicioSesion` con `ModalBase` nuevo. En el
  worktree landing (`../clubes-unid`), `ModalInicioSesion` pasa
  `panelClassName` con `max-h-[85vh] overflow-y-auto p-3 sm:p-5`
  (auto-gestión estilo antiguo). Al mergear hay que simplificarlo (retirar
  `max-h`/`overflow`/`p-*` del panel y dejar el div interno por defecto, o
  usar `innerClassName=""`) para no duplicar padding, y verificar el modal
  de login abierto: un solo scroll, padding correcto, bloqueo del fondo.

## Cierre de la entrega — 17/10/2026

**Estado: implementación local integrada y validada con servicios simulados.**

- Alcance cerrado: Fase 2 (H11–H21) en `fix/seguridad-fase1` e integración
  con `feat/hero-banner-movil` validada en la copia
  `../clubes-unid-integracion` (backend **166/166**, lint 0, build OK,
  navegador **14/14** con servicios simulados, cero datos reales, cero
  conexiones a servicios externos). Ajustes de documentación de cierre en
  `README.md` (seed solo local con `DATABASE_URL_LOCAL`, variables
  `DB_SSL_CA_FILE`/`RATE_LIMIT_*`, guía de despliegue y orden operativo),
  `SRS.md` (Express 5; infraestructura y destino de BD) y `MANUAL.md`
  (nota de seed local).
- **Ajustes de código conservados solo en la copia de integración** con su
  reproducción en la sección "Integración temporal fase1 + hero" (merges de
  schema/diapositivasHero, stub de revalidación H2, aserción de uploadSvg).
- **Sin validar aún**: la combinación completa fase1 + hero + **landing**.
  Al incorporar la landing debe aplicarse el arreglo de `ModalInicioSesion`
  (retirar `max-h/overflow/p-*` de `panelClassName`, dejando solo clases
  visuales en esa var) y volver a validarla; hasta entonces la integración
  total no se considera probada.
- **Pendientes conservados con su estado** (no los cierra esta entrega):
  H9 (diseño: CSP como cabecera separada de la cookie HttpOnly, que exige
  propuesta revisable antes de tocar autenticación); decisiones de negocio
  (rol 4 / §8.2.1); comprobaciones desplegadas (H3 rotación, H4 desplegado,
  `NODE_ENV=production`, cabeceras H5b, datos de BD, install command de
  Render/H21, umbrales efectivos); H17 (consulta y remediación de cuentas
  demo antes de abrir a usuarios); destino desplegado de la BD (pendiente
  de confirmación; ver "Despliegue" en `README.md`).
- Sin commit, merge, push, despliegues ni cambios en servicios externos.

---

## Integración temporal fase1 + hero (copia de validación — 17/10/2026)

Copia plana sin `.git` en `../clubes-unid-integracion`: los worktrees
`fix/seguridad-fase1` y `feat/hero-banner-movil` quedaron **intactos**; sin
commits, push, merge ni despliegues. Incluye archivos nuevos y dependencias.

### Reproducción

1. Copia de fase1 excluyendo `.git`, `node_modules` (raíz y backend), `dist`
   y `.env` (sin secretos):
   `robocopy ..\clubes-unid-fase1 ..\clubes-unid-integracion /E /XD node_modules dist /XF .git .env .env.local`
2. Overlay de los **14** archivos de hero (11 de `src/` + `DESIGN.md` +
   `backend/lib/eliminarImagenCloudinary.js` +
   `backend/migrations/migrate-diapositivas-hero-movil.sql` +
   `backend/tests/diapositivasHeroMovil.test.mjs`), **sin** copiar
   `backend/routes/noticias.js` ni `backend/schema.sql` (resolución abajo).
   `backend/routes/diapositivasHero.js` de hero sí se copia.
3. Merges puntuales en la copia:
   - `backend/schema.sql`: añadir `url_imagen_movil VARCHAR(500),` dentro
     de `diapositivas_hero` (cambio de hero) sobre la copia de fase1 (ya
     sin el bloque TRUNCATE).
   - `backend/routes/diapositivasHero.js`: versión de hero + re-añadir
     `import { validarParamsEnteros } from '../lib/validarId.js';` y
     `validarParamsEnteros(router);` (H13 de fase1).
   - `backend/routes/noticias.js`: se conserva la de fase1 (subsume el H18
     de hero: ya delega en la lib corregida).
4. Instalaciones limpias: raíz `pnpm install --frozen-lockfile` (RC=0);
   backend `npm ci` (RC=0; express=5.3.0, cloudinary=1.41.3).
5. Verificación: backend `node --test tests/*.test.mjs` → **166/166**;
   `pnpm run lint` → 0; `pnpm run build` → OK; navegador → 14/14.

### Conflictos funcionales resueltos (Git no los habría marcado)

- **authenticate (H2) vs test de hero:** `diapositivasHeroMovil.test.mjs`
  recibía 401: su stub no contemplaba la revalidación en BD que añadió
  fase1 → añadida la rama `FROM usuarios u… deleted_at IS NULL` (admin
  ficticio id 3) al stub.
- **uploadSvg vs diapositivas de hero:** la 3ª prueba leía el texto de
  `routes/diapositivasHero.js` buscando `svg`; con hero esa extracción vive
  en la lib → la aserción ahora llama a `extraerPublicId()` de la lib con
  una URL `.svg` (verifica comportamiento, no texto).
- **ModalBase nuevo + ModalInicioSesion:** en fase1 y hero,
  `ModalInicioSesion` **no** pasa `panelClassName` (var intacta en ambas) →
  compatible de origen: una sola zona de scroll con padding (S1 en
  navegador). La variante antigua (`panelClassName` con `max-h/overflow/p-*`)
  está **solo** en el worktree landing → al unirla: dejar en `panelClassName`
  solo clases visuales (border/colores) o usar `innerClassName` con su
  padding, para no recuperar el doble scroll.
- **noticias:** fase1 subsume el H18 de hero (lib con hash idéntico
  `52EA205B…` en ambas ramas).
- **schema:** cambios independientes (TRUNCATE fuera en fase1; columna
  móvil en hero) → ambos aplicados.

### Validación en navegador (Chromium local, servicios simulados, sin datos reales)

Build combinado servido con `vite preview` + `playwright-core` (caché local
`chromium-1248`) interceptando **toda** request no-local con `page.route`
(cero conexión a Render u otros servicios). **14/14:**

- Hero 1440: slide A con `<picture>` muestra la de escritorio; slide B
  (sin móvil) usa fondo de escritorio. A 390: A carga `mobile-a`, B respalda
  con la de escritorio.
- Modal login: panel **sin** scroll propio, 1 única zona de scroll interna
  con padding (20 px), cierre por backdrop.
- H19: 500 con stack → mensaje propio y sin `ECONNREFUSED` en pantalla;
  401 de contrato → `Credenciales inválidas` conservado; red caída →
  mensaje propio y sin `Failed to fetch`.

Capturas (6 PNG): `C:\Users\Cuent\AppData\Local\Temp\opencode\pw\capturas\`.
Limitación: los flujo con backend/BD reales no se probaron aquí (pasos
abajo).

### Pasos de prueba manual restantes (BD local desechable o despliegue)

1. PostgreSQL **local desechable** únicamente (nunca Render ni BD
   compartida): cluster temporal → `node migrate.js` → `psql -f
   backend/seed.sql` solo en esa BD (cuentas demo `123456`).
2. Backend `npm run dev` (4000) + frontend `pnpm dev` (proxy) → login real
   local `admin@unid.mx / 123456`, sesión y roles.
3. Panel admin → Diapositivas: crear banner con imagen móvil, chip «Con
   imagen móvil», «Quitar», editar/eliminar; si no hay cuenta de prueba de
   Cloudinary, usar URLs existentes (la limpieza queda stubbeada por los
   tests).
4. Hero `/` a 390 y 1440 px con esos datos; `ModalActualizaciones` con
   noticias locales: una sola barra de scroll.
5. H19 en vivo: parar el backend → acción → «No se pudo conectar…»;
   reiniciar con fallo simulado → «El servidor tuvo un problema…».
6. Cierre: parar el cluster temporal y borrar sus datos.

### Notas de merge (cuando se autorice)

- Los dos ajustes de tests (stub de revalidación; aserción de uploadSvg
  contra la lib) existen **solo en la copia** → aplicarlos al hacer el merge
  real.
- Landing: aplicar el fix de `ModalInicioSesion` descrito arriba al unir
  `ModalBase` nuevo.
- `requireClubLeader`/`requireHorarioLeader`/`lib/validarId.js` solo viven
  en fase1 → llevarlos al merge final.

---

## Reglas del ciclo autónomo (recordatorio)

- Terminar la fase/hallazgo actual → registrar aquí → siguiente hallazgo.
- Sin commit/push/merge/despliegues; sin tocar Render/Vercel/Supabase/Cloudinary/GitHub; sin rotar credenciales; sin migraciones ni pruebas contra datos reales; landing intacta; no ampliar una fase a otros hallazgos.
