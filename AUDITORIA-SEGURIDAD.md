# Auditoría de seguridad — Clubs UNID

**Fecha:** 2026-10-16
**Rama del informe:** `docs/auditoria-seguridad` (worktree en `../clubes-unid-auditoria`)
**Commit base:** `dbd62a5` — `feat(landing): hero fotografico, posteres de actividades y ajustes moviles de /conoce-clubs`
**Modo:** auditoría y planificación. No se implementaron correcciones en la fase de auditoría, no se ejecutó el servidor, no se modificaron credenciales ni servicios externos.
**Actualización (Fase 1):** correcciones acotadas de H1, H7, H3, H2, H4, H5a, H8, H5b y H6 aplicadas en la rama `fix/seguridad-fase1` (misma base `dbd62a5`, worktree `../clubes-unid-fase1`). El informe en esa rama incorpora los estados y verificaciones ejecutados de la Fase 1 (§8).

---

## 1. Resumen de riesgos principales

| ID | Riesgo | Prioridad | Estado |
|----|--------|-----------|--------|
| H3 | Secretos históricos reales escritos en `.gitleaks.toml` (versionado); la allowlist suprimía futuras detecciones de esas cadenas | **Inmediata** | **Mitigado (Fase 1):** configuración sin allowlists; escaneo limpio ≠ ausencia de secretos ni revocación. **Pendiente operativo:** verificar/rotar credenciales en Render |
| H1 | XSS almacenado: la lista de asistencia se sirve como HTML sin escapar, con `nombre_completo`/`matricula` controlados por alumnos | **Alta** | **Corregido (Fase 1):** escape de todas las interpolaciones de datos + 7 pruebas unitarias. Pendiente de verificación en navegador con el servidor real |
| H2 | Autorización basada solo en claims del JWT: rol no revocable y cuentas desactivadas activas hasta 24 h | **Alta** | **Corregido (Fase 1):** `authenticate` revalida usuario/estado/rol en BD por request (vía A), `login-local` no emite token a cuentas desactivadas; 13 pruebas nuevas (§8.6). Pendiente: verificación con servidor real y BD de Render |
| H4 | TLS hacia la base de datos con `rejectUnauthorized: false` | **Alta** | **Corregido (Fase 1):** TLS con verificación de cadena e identidad (equivalente a `verify-full`), rechazo de parámetros TLS en `DATABASE_URL`, CA propia opcional vía `DB_SSL_CA_FILE` (§8.7). **Pendiente desplegado:** verificar en el backend de Render con una consulta inocua |
| H5a | Cobertura de rate limiting: solo `login-local` y envío de encuestas tienen límite | **Alta** | **Corregido (Fase 1):** política única global + específicas por operación (§8.8), 14 pruebas nuevas; umbrales provisionales por env con defaults seguros |
| H5b | Sin cabeceras de seguridad ni en el backend (sin helmet) ni en el frontend (`vercel.json` sin `headers`): clickjacking sobre los paneles administrativos servidos por Vercel | **Alta** | **Corregido (Fase 1):** middleware de cabeceras en el backend (sin helmet, justificado en §8.9) + `headers` en `vercel.json` (§8.9). CSP queda para H9/fase estratégica |
| H6 | `GET /api/clubes` (público) expone nombre del presidente y clubes sin filtrar por estatus (el filtro es solo de cliente) | **Media** | **Corregido (Fase 1):** el público filtra estatus 3 en servidor y excluye `id_presidente`/`presidente_nombre`; nuevo `GET /api/clubes/admin` (rol 3) para el panel (§8.10). **H6b:** `GET /:id` ya no expone `presidente_correo` ni `id_vicepresidente` (0 consumidores); se conservan `presidente_nombre` e `id_presidente` (tarjeta pública y badge de panel). El detalle **no** filtra estatus 3 por decisión explícita (la misma ruta sirve al panel alumno/presidente) |
| H7 | `POST /api/notificaciones`: un alumno (rol 1) puede crear notificaciones con audiencia `global`/`presidentes` | **Media** | **Corregido (Fase 1):** matriz explícita verificada con 16 pruebas de helper + 12 de ruta (denegadas sin inserciones). Regla del rol 4 pendiente de confirmar (§8.2.1) |
| H8 | Rate limit de encuestas desactivado cuando `NODE_ENV !== 'production'`; el backend de desarrollo es público | **Media** | **Corregido (Fase 1):** el `skip` por `NODE_ENV` se eliminó; todos los límites están activos en todo entorno (§8.8). `NODE_ENV` de Render sigue pendiente de comprobar para otros comportamientos |
| H9 | JWT (y tokens de MSAL) en `localStorage`: un XSS futuro tendría acceso a ambos | **Media** | Confirmado en código (fuera de la Fase 1) |
| H10 | `ubicacion_maps` (href) admite esquemas como `javascript:`; `imagen_portada` sin validación de dominio | **Media / Baja** | **Corregido (Fase 1):** validación de esquema en servidor para ambos campos (§8.11); la ejecución del vector en navegador sigue pendiente de verificación (el fix la previene de cualquier modo) |
| H11 | `TRUNCATE horarios_club` condicional dentro de `schema.sql` ejecutado en cada arranque por `migrate()` | **Media** | Confirmado en código; solo afecta BD legada sin migrar |
| H12–H21 | Hallazgos de menor severidad (ver §4) | Baja / Higiene | **Corregidos en la Fase 2** (§8B.2–§8B.11, código + pruebas); H17 solo documentación de advertencia; H21 verificado localmente (install command de Render pendiente) |

**Hallazgo estructural (causa raíz de H5a):** no existía un rate limit global de aplicación; cada ruta que lo necesita lo implementaba por su cuenta y solo dos lo hacían. Esto explica gran parte del volumen de alertas de CodeQL de tipo «Missing rate limiting»: no son N vulnerabilidades independientes, sino una ausencia de política única. **Corregido en la Fase 1** (§8.8): limitador global en `/api` + limiters específicos centralizados en `backend/lib/rateLimits.js`.

**Controles positivos verificados (evidencia en código):**
- No se identificó inyección SQL en las 88 interpolaciones de template literals dentro de `routes/` revisadas: todas las que aparecen dentro de SQL usan placeholders parametrizados (`$n`) o fragmentos constantes generados por código (`$${idx}`), no entrada de usuario.
- Sin secretos hardcodeados en el código fuente (grep sobre `*.js|mjs|sql|json` fuera de `node_modules`: 0 coincidencias reales).
- El módulo de encuestas valida longitudes, estados, IDs enteros y usa slugs de 110 bits generados con `crypto.randomBytes` y alfabeto de tamaño potencia de dos (sin sesgo módulo) — `backend/lib/slug.js:11-37`.
- La autorización por propiedad (IDOR) está bien resuelta en formularios, ofertas, avisos, convocatorias, inscripciones y horarios (verificados en §4).
- Gitleaks y pre-commit están configurados en el repositorio (`.gitleaks.toml`, `.pre-commit-config.yaml`, `.github/workflows/gitleaks.yml`).
- El backend valida autenticación y rol en las rutas administrativas; la protección de cliente (`RutaProtegida`) no es la única barrera.

---

## 2. Alcance, rama y limitaciones

### 2.1 Alcance revisado
- Backend: `backend/` completo (Express 5, `pg`, JWT HS256, bcryptjs, Cloudinary + multer). 98 rutas inventariadas en 19 archivos montados en `backend/index.js:60-78`.
- Frontend: `src/` (React 19, Vite 8, react-router 7, MSAL), `vercel.json`, `index.html`, `package.json` raíz.
- Configuración: `.gitignore`, `.gitleaks.toml`, `.pre-commit-config.yaml`, `.env.example` (raíz y backend), `schema.sql`, `seed.sql`, migraciones.
- Estado Git: rama `docs/auditoria-seguridad` creada desde `dbd62a5`. Los cambios pendientes de la landing (`feat/landing-clubs-campeche`: `.gitignore` modificado, `AGENTS.md`/`.opencode` fuera del índice, `PBI-05.md` sin trackear) permanecen intactos en el worktree principal.

### 2.2 Limitaciones del acceso utilizado
- **Alertas de CodeQL:** no fue posible consultar el inventario de las 191 alertas abiertas. La herramienta `gh` (GitHub CLI) no está instalada en el entorno de auditoría; esa es la vía que no se pudo usar, no la única posible (la interfaz web de GitHub o un token de API también permitirían el listado pagado). Por ello, las categorías visibles en la captura se mapearon contra el código revisado (§3), sin afirmar haber revisado las 191 alertas.
- **Sin ejecución:** no se arrancó el servidor ni se ejecutaron requests; las pruebas documentadas en §4 son ejemplos propuestos con datos ficticios, no resultados observados.
- **Configuración desplegada:** no se inspeccionaron las variables de entorno reales de Render ni los headers que Vercel sirve efectivamente en producción; se documentan como pendientes.
- **Dependencias:** no se ejecutó `npm audit`/`pnpm audit` (requiere red); no se cotejaron versiones contra CVEs.
- **Historial de Git:** no se purgó ni se modificó; se verificaron solo los archivos actuales.

---

## 3. Alertas de CodeQL — agrupación por causa raíz

Sin acceso al inventario, se mapean las cuatro categorías visibles contra el código. Categorías no localizadas quedan explícitamente como pendientes.

| Categoría CodeQL | Mapeo al código | Conclusión |
|---|---|---|
| **Missing rate limiting** | Confirmado: solo `backend/routes/auth.js:9-15,43` (`login-local`, 10/15 min por IP) y `backend/routes/encuestas.js:72-85` (envío, 300/min por IP) tienen límite. Las ~96 rutas restantes no. | **Confirmado.** Causa raíz única: falta de rate limit global (ver §5). No tratar cada ubicación como tarea independiente. |
| **Incomplete URL substring sanitization** | Localizado en `backend/routes/diapositivasHero.js:9` y `backend/routes/noticias.js:39`: `url.includes('cloudinary.com')` antes de extraer el `public_id` y llamar `cloudinary.uploader.destroy` (`diapositivasHero.js:14-18`, `noticias.js:44-48`). | **Confirmado el patrón, impacto limitado.** La extracción además exige el patrón final `/upload/(v\d+/)?NOMBRE.ext` y acota el `public_id` al prefijo `clubs-unid/` (H18 en §4). La llamada destructiva requiere rol editor (3/4), que ya puede esas imágenes por la API normal. |
| **Creating biased random numbers…** | No se localizó `Math.random` en el repositorio (grep sobre `*.js,*.jsx`: 0 resultados). El candidato principal, `backend/lib/slug.js:29-33`, usa `crypto.randomBytes` con alfabeto de 32 símbolos (múltiplo exacto de 2^8), por lo que `byte % 32` es uniforme sin sesgo. | **No reproducida en el código revisado.** Si la alerta apunta a otra ubicación, se necesita el archivo:línea del inventario para evaluarla. |
| **Use of externally-controlled format string** | No se localizó un receptor de formato controlado por entrada externa (`util.format`/`sprintf` con input de usuario) en el código revisado. | **Pendiente de ubicación.** Requiere el detalle de la alerta; no se atribuye severidad sin ver el flujo. |

---

## 4. Hallazgos

Convenciones: **Evidencia** = observado en código; **Riesgo inferido** = deducido de la evidencia sin ejecución; **Pendiente** = requiere verificación adicional. Las pruebas son ejemplos propuestos, no ejecutados. No se reproducen valores de secretos.

---

### H3 — Secretos históricos reales en `.gitleaks.toml` (y allowlist que suprime futuras detecciones)

- **Regla relacionada:** secretos en repositorio; configuración de escaneo.
- **Ubicación:** `.gitleaks.toml:23-29` (allowlist con tres literales: una contraseña corta, un secreto JWT y un secreto ADMIN_SECRET, referidos en el informe solo por tipo).
- **Flujo:** el archivo está versionado (`git ls-files` lo confirma). Cualquier persona con acceso al repo lee los valores. Las regex de la allowlist se aplican globalmente en Gitleaks: cualquier futura aparición de esas mismas cadenas en el repositorio quedará silenciada, no solo las del historial.
- **Estado (Fase 1):** **mitigado en código**: la allowlist con los tres literales y las exclusiones globales por contenido fueron retiradas de `.gitleaks.toml` (§8.3); el historial escanea limpio con gitleaks 8.28.0 y la detección fue verificada con credenciales ficticias en un repo temporal. **No está completamente resuelto:** la verificación y rotación de las credenciales en Render (y la confirmación de la contraseña del usuario administrativo) siguen como **tarea operativa pendiente** — limpiar el archivo no revoca una credencial. Que el `JWT_SECRET` del `.env` local actual no coincida con el valor histórico **no demuestra** que la credencial histórica esté revocada en todos los entornos.
- **Severidad original:** alta (fuga de credencial). **Prioridad propuesta:** **inmediata**. **Confianza:** alta (presencia), desconocida (vigencia).
- **Condiciones e impacto:** si alguna credencial sigue vigente, cualquier lector del repo puede firmar tokens o autenticarse. Incluso rotadas, los valores reales en el repo son un riesgo residual (reutilización en otros sistemas) y un supresor de detecciones.
- **Acción necesaria (no ejecutada en esta auditoría):**
  1. Verificar en Render (y donde aplique) si `JWT_SECRET` y `ADMIN_SECRET` vigentes coinciden con los históricos; si se coincide o hay duda, **rotar** (generar valor nuevo, actualizar la variable en Render, reiniciar) y verificar la contraseña asociada al usuario `admin@unid.mx`.
  2. Reemplazar en `.gitleaks.toml:26-28` los literales por huellas (p. ej. prefijo+hash) o eliminar la allowlist una vez confirmada la rotación, para no suprimir detecciones futuras.
  3. No reescribir el historial de Git como parte de esta auditoría (colaboradores activos); documentar el riesgo residual del historial.
- **Corrección recomendada y prueba de validación:** tras rotar, un token firmado con el secreto histórico debe ser rechazado: `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer <token-firmado-con-secreto-historico>" https://<backend>/api/usuarios` → esperado `401`. Verificar además que Gitleaks marca de nuevo una aparición de la cadena (prueba en rama temporal: agregar la cadena en un archivo de prueba, confirmar detección, revertir).
- **Otras alertas que resolvería:** elimina la fuente real de las alertas de secretos históricos y restaura la detección futura.

---

### H1 — XSS almacenado en la lista de asistencia (HTML sin escapar)

- **Regla relacionada:** XSS (cross-site scripting almacenado).
- **Ubicación:** `backend/lib/asistenciaTemplate.js:14,31-40` (interpolación sin escapar de `nombreClub`, `lugar`, `nombre_completo`, `matricula`); consumidor: `backend/routes/convocatorias.js:289-313`.
- **Flujo completo:**
  1. Entrada: un alumno (rol 1) envía `POST /api/formularios` con `nombre_completo` y otros campos (`backend/routes/formularios.js:107-153`); el nombre se persiste sin sanitizar.
  2. Un líder (rol 2/5) solicita `GET /api/convocatorias/:id/asistencia` (`convocatorias.js:289`).
  3. El servidor construye HTML con los nombres sin escapar y lo responde con `Content-Type: text/html; charset=utf-8` (`convocatorias.js:312-313`).
  4. El navegador del líder lo interpreta como página HTML (tiene `onload="window.print()"`, está pensado para renderizar e imprimir en navegador) **en el origen del backend** (dominio de Render), no en el del frontend.
- **Estado:** **corregido en la Fase 1** (rama `fix/seguridad-fase1`): todas las interpolaciones de datos del template pasan por `escapeHtml` en `backend/lib/asistenciaTemplate.js`; 7 pruebas unitarias con payloads cubren nombre, matrícula, club, bloque y lugar (§8.1). La corrección es del marcado, no de la descarga (se conserva la renderización e impresión). **Pendiente:** verificación en navegador con servidor real (no ejecutada; las pruebas son unitarias sobre el HTML generado).
- **Severidad original:** alta. **Prioridad propuesta:** **alta**. **Confianza:** alta sobre el flujo; media sobre explotación práctica (depende de la validación del campo en el cliente y de restricciones del navegador).
- **Condiciones e impacto:** el atacante necesita una cuenta de alumno y postularse a una convocatoria; la víctima es un líder que abre la lista. El XSS ejecuta en el origen del backend: **no** tiene acceso directo al `localStorage` del frontend (otro origen, y la autenticación es por header JWT que la página no posee), por lo que el robo directo de tokens no es el impacto principal. Impactos reales: exfiltración de la matrícula y nombres de todos los postulados de esa convocatoria hacia un servidor del atacante, alteración del documento que se imprime/firma, y phishing en un dominio institucional (p. ej. un formulario falso de "iniciar sesión para continuar").
- **Corrección recomendada:** escapar HTML en `asistenciaTemplate.js` para todas las interpolaciones de datos (`nombre_completo`, `matricula`, `nombre_club`, `lugar`), p. ej. con una utilidad `escapeHtml`; opcionalmente servir con `Content-Disposition: attachment` para que no se renderice en pestaña. También validar longitud del nombre en el servidor (H13).
- **Prueba de validación (propuesta, datos ficticios):**
  1. Registrar/alumno ficticio `prueba_xss@unid.mx` con nombre `"><img src=x onerror=alert(1)>` (vía `POST /api/formularios` o insert directo en BD desechable).
  2. Como líder ficticio, abrir `GET /api/convocatorias/<id>/asistencia` en navegador.
  - **Esperado con el fix:** el texto se muestra literal, sin ejecución de script.
  - **Actual (sin fix):** el `onerror` se ejecuta al cargar la página.
- **Otras alertas que resolvería:** elimina una instancia concreta de la categoría XSS de CodeQL si existe en el inventario.

---

### H2 — Autorización basada solo en claims del JWT sin revalidación

- **Regla relacionada:** autenticación/autorización (revocación de permisos).
- **Ubicación:** `backend/middleware/auth.js:10-34` (`authenticate` hace solo `jwt.verify`; `requireRole` lee `req.user.id_rol` del token); emisión con `expiresIn: '24h'` en `backend/routes/auth.js:28-41`.
- **Flujo:** la firma y la expiración **sí** se verifican correctamente (`jwt.verify`, algoritmo HS256 con secreto de entorno, sin riesgo de confusión de algoritmo con la versión instalada de `jsonwebtoken`). El problema es la **revocación**: ni el cambio de rol de un usuario ni la desactivación de su cuenta invalidan tokens ya emitidos; siguen siendo válidos hasta 24 h. El chequeo de cuenta desactivada existe solo en el login con Microsoft (`auth.js:191-195`), no en cada request.
- **Estado:** **corregido en la Fase 1 (vía A)** — ver §8.6. `authenticate` ahora revalida `id_usuario` con `deleted_at IS NULL` y monta `req.user` solo con datos actuales de la BD; `login-local` rechaza cuentas desactivadas. Pendiente de verificación con servidor real/BD de Render.
- **Severidad original:** alta. **Prioridad propuesta:** **alta**. **Confianza:** alta.
- **Condiciones e impacto:** requiere que un token legítimo siga vivo tras retirar permisos (egreso de un admin, remoción de presidente, desactivación de cuenta). En un sistema universitario con rotación de cargos, es un escenario realista.
- **Corrección recomendada (dos vías, elegir una):**
  - **Vía A (revalidar):** en `authenticate`, consultar `id_rol`/`deleted_at` en BD (una consulta por request sobre `usuarios`; costo aceptable al volumen actual). Es la más robusta.
  - **Vía B (reducir ventana):** bajar `expiresIn` a 15-30 min con refresh, o bien invalidar al desactivar/cambiar rol emitiendo un "not-before" por usuario. Más trabajo de front.
- **Prueba de validación (propuesta):**
  1. Emitir token de un usuario admin ficticio.
  2. En BD desechable, cambiar `id_rol` a alumno o marcar `deleted_at`.
  3. Reutilizar el token en `GET /api/usuarios`.
  - **Esperado con fix vía A:** `401`/`403` inmediato. **Actual:** `200` hasta que expire el token.
- **Otras alertas que resolvería:** mitiga de raíz cualquier escalada por revocación tardía (no depende de la rotación de secretos).

---

### H4 — TLS hacia la base de datos sin verificación de certificado

- **Regla relacionada:** transporte cifrado / validación de certificado.
- **Ubicación:** `backend/db.js:28-33` — con `DATABASE_URL` presente (producción/desarrollo remoto), `ssl: { rejectUnauthorized: false }`.
- **Flujo:** toda la conexión a Postgres hospedado (Supabase/Neon u otro) se realiza sin validar la cadena del certificado del servidor.
- **Estado:** **corregido en la Fase 1** — ver §8.7. Se eliminó `rejectUnauthorized: false`; el modo remoto valida cadena e identidad del servidor (equivalente a `sslmode=verify-full`), con CA propia opcional vía `DB_SSL_CA_FILE`. La verificación en el despliegue real (Render → proveedor de BD) sigue pendiente.
- **Severidad original:** alta. **Prioridad propuesta:** **alta**. **Confianza:** alta sobre el código; media sobre explotabilidad (requiere ataque MITM en la red entre Render y el proveedor de BD).
- **Condiciones e impacto:** un MITM podría leer/alterar tráfico de BD, incluidas credenciales de la cadena de conexión y datos de alumnos.
- **Corrección recomendada:** `rejectUnauthorized: true` apuntando al CA bundle del proveedor (p. ej. `pg-cert` de Neon/Supabase o `NODE_EXTRA_CA_CERTS`), validando primero en staging. Si el proveedor no ofrece CA estable, documentar la excepción y acotarla.
- **Prueba de validación:** en entorno desechable, conexión con `rejectUnauthorized: true` + CA correcta → pool conecta y consultas responden; sin CA → falla con error de certificado (comportamiento deseado).
- **Otras alertas que resolvería:** elimina la exposición de credenciales y datos en tránsito no verificado.

---

### H5 — Rate limiting, cabeceras y CORS (hallazgos separados)

#### H5a — Cobertura de rate limiting ausente (causa raíz de la mayoría de alertas «Missing rate limiting»)

- **Ubicación:** solo `backend/routes/auth.js:9-15,43` (`login-local`) y `backend/routes/encuestas.js:72-85` (envío público) limitan. No hay limitador global en `backend/index.js`. Sin límite en: `POST /auth/login-microsoft` (hace una llamada saliente a Microsoft Graph por intento — amplificación), `POST /auth/register`, `POST /formularios`, `POST /upload/imagen`, `POST /notificaciones`, ni en el resto.
- **Estado:** confirmado en código. **Prioridad:** alta (con la política detallada en §5).
- **Nota de infraestructura:** `trust proxy = 1` (`index.js:35`) es correcto detrás de Render, pero hace que la identificación por IP use `X-Forwarded-For`; el contador en memoria se reinicia en cada deploy y es por instancia (relevante solo si hay más de una instancia; el servicio actual parece de instancia única — pendiente confirmar en Render).

#### H5b — Cabeceras de seguridad y clickjacking (frontend y backend por separado)

- **Backend:** no hay `helmet` ni set equivalente (`backend/index.js` completo, 92 líneas): faltan `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Strict-Transport-Security`. La ausencia de la librería no es el problema per se; lo que falta son las protecciones concretas.
- **Frontend (donde viven los paneles):** los paneles administrativos (presidente/admin/rectoría) son páginas React servidas por **Vercel** (`vercel.json` define solo `framework`, `buildCommand`, `outputDirectory`, `installCommand` y `rewrites`; **no hay sección `headers`**). Por lo tanto, la configuración versionada no envía `X-Frame-Options` ni `Content-Security-Policy: frame-ancestors` para el origen del frontend. **El impacto de clickjacking corresponde al hosting del frontend (Vercel), no a las cabeceras del backend**: un atacante puede iframar el panel y manipular al usuario para que haga clic en acciones (p. ej. aprobar inscripciones) tras haber iniciado sesión. *Pendiente:* verificar en producción (`curl -I https://<frontend>/admin/panel`) si Vercel inyecta alguna cabecera por defecto; no se asume ni se descarta.
- **Estado:** confirmado en configuración versionada; efectividad en producción **pendiente**.
- **Prioridad:** alta. **Confianza:** alta sobre la ausencia en el repo; media sobre el impacto final (depende de headers del CDN y de la interacción del usuario).
- **Corrección recomendada:** agregar en `vercel.json` `headers` con `X-Frame-Options: DENY` y `Content-Security-Policy: frame-ancestors 'none'` (al menos para rutas `/panel`, `/presidente/*`, `/admin/*`, `/rectoria/*`); en el backend, `helmet()` con política de `frame-ancestors 'none'` (protege también la página HTML de H1) y `X-Content-Type-Options: nosniff`.
- **Prueba de validación:** página HTML que embeba `https://<frontend>/admin/panel` en un `<iframe>`; **esperado tras fix:** el navegador bloquea el frame. `curl -I` debe mostrar `x-frame-options`/`content-security-policy`.

#### H5c — CORS acepta peticiones sin `Origin` — **informativo, no explotable como autorización**

- **Ubicación:** `backend/index.js:42-51` — `if (!origin || allowedOrigins.includes(origin))` (comentario: “como Postman”).
- **Análisis:** la autenticación es por header `Authorization: Bearer`; no hay cookies de sesión, por lo que **no existe superficie CSRF** que el CORS protegería, y aceptar requests sin `Origin` (cliente no navegador) no otorga permisos adicionales: el JWT se exige igual. El CORS no es control de acceso aquí. Riesgo residual: el mensaje `new Error('No permitido por CORS')` devuelve un `500` con texto de error en vez de `403` (menor); y no hay ninguna otra barrera de origen, lo cual es aceptable dado que la autorización es por token.
- **Estado:** confirmado; clasificado como **informativo/bajo**. No se atribuye severidad alta por la ausencia de `helmet` ni por aceptar requests sin `Origin` sin flujo explotable demostrado.
- **Acción recomendada (higiene):** devolver `403` en vez de lanzar excepción, y documentar la decisión.

---

### H6 — `GET /api/clubes` público expone PII y no filtra por estatus

- **Ubicación:** `backend/routes/clubes.js:11-37` (sin `authenticate`): selecciona `c.id_presidente` y `p.nombre_completo AS presidente_nombre`, y devuelve **todos** los clubes sin `WHERE` de estatus. El filtro de estatus existe solo en el cliente: `src/pages/PaginaConoceClubs.jsx:339` — `(data||[]).filter((c) => c.id_estatus_club !== 3)`.
- **Estado:** confirmado en código.
- **Severidad original:** media. **Prioridad propuesta:** **media**. **Confianza:** alta.
- **Condiciones e impacto:** cualquier visitante (sin sesión) puede listar propuestas de clubes que la landing presenta como “en consideración”, junto con el nombre completo del alumno responsable. Es PII de un estudiante vinculada a una iniciativa no aprobada; la regla del proyecto distingue propuestas de clubes confirmados y este endpoint no lo hace del lado del servidor.
- **Corrección recomendada:** en el endpoint público, filtrar en servidor los estatus permitidos para exposición pública y excluir `id_presidente`/`presidente_nombre` del SELECT público (o exponerlos solo en rutas autenticadas con rol autorizado). Alinear el filtro con lo que la landing debe mostrar.
- **Prueba de validación:** `curl -s https://<backend>/api/clubes` → **esperado tras fix:** solo clubes de estatus público, sin campos del presidente; actual: lista completa con `presidente_nombre`.
- **Otras alertas que resolvería:** elimina la discrepancia servidor/cliente que hace que futuros cambios de UI no protejan el dato.

---

### H7 — Autorización insuficiente en `POST /api/notificaciones`

- **Ubicación:** `backend/routes/notificaciones.js:102-159`. La única restricción de audiencia aplica a roles 2/5 (`:121-132`: solo audiencia `club` y solo si es líder de ese club). **No hay restricción para el rol 1 (alumno)**: un alumno autenticado puede enviar `audiencia: 'global'` o `'presidentes'`, e incluso `id_destinatario` sin validar (`:138`). El historial de auditoría se registra solo para rol 3 (`:141-152`), no para alumnos.
- **Alcance real de las notificaciones:** las lecturas (`GET` de bandeja, `:8` y siguientes) filtran por el usuario receptor según la audiencia, de modo que una notificación `global` creada por un alumno **sí llegaría al resto de usuarios** en su bandeja.
- **Estado:** **corregido en la Fase 1** (rama `fix/seguridad-fase1`): la autorización de `POST /api/notificaciones` ahora pasa por la matriz explícita de `backend/lib/notificacionPermisos.js` (rol × audiencia × club × destinatario) con 16 pruebas unitarias (§8.2). Los flujos de líderes (audiencia `club` de su club) y administradores se conservan. **Regla pendiente de confirmar:** si el rol 4 (rectoría) debe emitir anuncios (aquí se permite por paridad con la lectura; no hay UI de rectoría).**Prioridad:** media. **Confianza:** alta.
- **Condiciones e impacto:** requiere una cuenta de alumno válida. Impacto: phishing/engañamiento masivo con apariencia de notificación oficial del sistema (campus-wide o solo presidentes), sin registrar la acción en historial.
- **Corrección recomendada:** exigir `requireRole(3)` (o whitelist explícita) para audiencias `global`/`presidentes`/`alumnos`; validar `id_destinatario` contra el destinatario autorizado; registrar historial para cualquier emisor, no solo admin.
- **Prueba de validación (ficticia):** con token de alumno `alumno_prueba@unid.mx`, `POST /api/notificaciones` con `{"titulo":"Prueba","mensaje":"x","audiencia":"global"}` → **esperado tras fix:** `403`; actual: `201` y visible en bandeja de otro usuario ficticio.

---

### H8 — Rate limit de encuestas condicionado a `NODE_ENV` con backend de desarrollo público

- **Ubicación:** `backend/routes/encuestas.js:72-85` — `skip: () => process.env.NODE_ENV !== 'production'` (`:79`). El backend de desarrollo es alcanzable públicamente: `src/services/api-core.js:4` usa `https://clubsunid-develop.onrender.com/api` como fallback. `NODE_ENV` no aparece en las claves de `backend/.env` local ni en `backend/.env.example`.
- **Estado:** el comportamiento del código está confirmado; **la variable del despliegue está pendiente de comprobar** (Render sol inyectar `NODE_ENV=production` por defecto en servicios Node; si así es, el límite está activo en ambos entornos y el hallazgo se reduce a documentación).
- **Prioridad propuesta:** **media** — deliberadamente por debajo de H1 (pérdida de datos potencial, condicional) y de H7 (autorización), conforme a la exposición real: si `NODE_ENV=production` está definido en Render, la exposición desaparece.
- **Condiciones e impacto:** si la variable no está definida, el endpoint público de envío de encuestas queda sin límite en un servicio expuesto a internet (spam/borrado de capacidad de respuesta).
- **Corrección recomendada:** definir `NODE_ENV=production` explícitamente en Render, añadir `NODE_ENV` a `backend/.env.example` como variable requerida, y preferir un patrón fail-safe (aplicar el límite salvo `NODE_ENV === 'development'` explícito).
- **Prueba de validación:** con el backend en el estado desplegado, enviar >300 posts válidos en un minuto a `POST /api/encuestas/publico/<slug-ficticio>` → **esperado:** `429` con `retry-after` (y `standardHeaders` draft-7).

---

### H9 — JWT y tokens de MSAL en `localStorage`

- **Ubicación:** `src/services/api-core.js:8,20,24,29` (`unid_session` en `localStorage`); `src/services/authConfig.js:10` (`cacheLocation: 'localStorage'` para MSAL).
- **Estado:** confirmado en código.
- **Prioridad:** media. **Confianza:** alta (el almacenamiento); el impacto depende de que exista un sink XSS en el origen del frontend — actualmente **no se encontró** `dangerouslySetInnerHTML`, `eval`, `innerHTML` ni equivalentes en `src/` (grep: 0 resultados), por lo que es un riesgo de amplificación, no una vulnerabilidad activa.
- **Condiciones e impacto:** cualquier XSS futuro en el origen de Vercel robaría simultáneamente el JWT del sistema (24 h, con PII en el payload) y los tokens de Microsoft.
- **Corrección recomendada (estratégica, no urgente):** valorar cookie `HttpOnly`+`Secure`+`SameSite` para la sesión (elimina el robo por XSS; implica cambios de arquitectura de servicios) o, como mínimo, mantener la ausencia de sinks y añadir CSP (H5b) como defensa en profundidad.
- **Prueba de validación:** tras cualquier cambio, login completo y requests autenticados siguen funcionando; con un XSS de prueba controlado, verificar que el token no es legible desde `document.cookie`/`localStorage` (si se migró a cookie HttpOnly).

---

### H10 — URLs de usuario: `javascript:` en href (pendiente de validación) e imagen sin allowlist

Se mantienen separados por contexto y impacto distinto.

**(a) `ubicacion_maps` en `<a href>` — riesgo pendiente de validación en navegador**
- **Ubicación:** entrada `src/components/clubes/sections/horarios/HorarioFormModal.jsx:90` (`<input type="url">` sin validación de esquema en JS); persistencia sin sanitizar en `backend/routes/horarios.js:65-68` (INSERT) y `:134-138` (UPDATE); render en `src/components/clubes/sections/horarios/HorarioStackedView.jsx:55` y `HorarioPreviewModal.jsx:60` — `<a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer">`.
- **Estado:** **riesgo inferido, pendiente de validación en navegador.** No se ejecutó el componente. React 19 advierte en desarrollo sobre URLs `javascript:` pero puede seguirlas renderizando en producción, y los navegadores aún interpretan `javascript:` en clics de anclas con activación del usuario en algunos entornos; el comportamiento exacto con React 19 + el navegador objetivo debe comprobarse antes de tratarlo como explotado. `rel="noopener"` no mitiga `javascript:`.
- **Condiciones:** requiere un líder de club (rol 2/5, ya autenticado y con club asignado) que persista la URL; la víctima sería un alumno que hace clic.
- **Prioridad:** media-baja como hardening; **corregir igualmente** validando el esquema en el servidor (solo `https://` y, si se quiere, host de Google Maps/OSM).
- **Prueba de validación (propuesta):** como líder ficticio, guardar un horario con `ubicacion_maps = "javascript:alert(1)"`; abrir la vista de horarios como alumno. **Resultado esperado tras fix (validación de esquema):** `400` al guardar. **Pendiente de observar:** si sin fix el clic ejecuta el script en el navegador objetivo.
- **Corregido (Fase 1, §8.11):** `esUrlMapsValida` en `backend/lib/validarUrl.js` valida el esquema en servidor (solo `http:`/`https:`, con límite de 500 caracteres) en el POST y el PUT de `horarios.js`; pruebas en `tests/validarUrl.test.mjs` (400 con `javascript:`/`data:` y 200 con URL https).

**(b) `imagen_portada` sin restricción de dominio — riesgo bajo**
- **Ubicación:** entrada desde clubes (`backend/routes/clubes.js:223,244` POST; `:286,309` PUT rol 3); uso en `<img src>` vía `src/utils/imagen.js:5-7` (solo fuerza `https://`), en la landing `src/pages/PaginaConoceClubs.jsx:135,158-159` e inicio `src/pages/PaginaInicio.jsx:120`.
- **Análisis por contexto:** `<img src>` no ejecuta scripts (a diferencia del contexto href del punto a), por lo que **no es XSS**. El impacto real es contenido remoto arbitrario y tracking/píxeles en páginas públicas, e inconsistencia con noticias y diapositivas, que sí exigen `cloudinary.com` (`noticias.js:39`, `diapositivasHero.js:9`).
- **Prioridad:** baja. Una allowlist de dominio es **recomendable por consistencia y control de contenido**, no obligatoria por mitigar ejecución de código.
- **Prueba de validación:** con rol 3, PUT de `imagen_portada = "https://ejemplo-externo.test/foto.png"` → **esperado tras fix con allowlist:** `400`; actual: `200` y la landing carga la imagen remota.
- **Corregido (Fase 1, §8.11) — decisión de alcance:** en lugar de una allowlist solo de `cloudinary.com` (que rompería las rutas locales `/uploads/` que `src/utils/imagen.js` sí resuelve), se valida el **esquema**: solo `http:`/`https:` o rutas `/uploads/`, con el límite de 255 caracteres de la columna. `javascript:`, `data:`, `//host` y protocolos como `ftp:` quedan rechazados con `400`. Si se decide restringir además a Cloudinary, es un ajuste posterior de una línea en `esImagenPortadaValida`.

---

### H11 — `TRUNCATE horarios_club` condicional en el script de arranque

- **Ubicación:** `backend/schema.sql:443-462` (bloque `DO $$`); ejecución: `backend/index.js:11-12` llama `await migrate()` en **cada arranque**, y `backend/migrate.js:8-23` ejecuta el `schema.sql` completo con `pool.query(sql)`.
- **Flujo y condición:** el `TRUNCATE TABLE horarios_club` (`schema.sql:450`) está dentro de `IF EXISTS (... column_name = 'fecha' ...)`: **solo se ejecuta si la tabla aún tiene la columna `fecha`** (esquema legado de “eventos puntuales”). El `CREATE TABLE IF NOT EXISTS` de `horarios_club` actual (`:427-439`) no define `fecha`, así que:
  - BD nueva o ya migrada: la columna no existe → el bloque completo (incluido el TRUNCATE) **no se ejecuta** en arranques siguientes.
  - BD legada con `fecha`: en el primer arranque posterior, se vacía la tabla y se convierte a horario semanal recurrente (intención documentada del comentario `:443`).
- **Estado:** confirmado en código. No se ejecutó contra ninguna base (ni siquiera local).
- **Intención vs riesgo:** la migración es **intencional** (cambio de modelo de datos). El **riesgo** es operativo: la conversión ocurre automáticamente al arrancar la aplicación, sin confirmación, sin backup previo y con `catch` que solo loguea errores (`migrate.js:20-22`), de modo que una BD legada que aún tenga horarios cargados los pierde sin respaldo. Es un riesgo **condicional** a que exista una instancia desplegada sin migrar — pendiente verificar el estado real de la BD de Render (si la columna `fecha` ya no existe, el riesgo está consumido).
- **Prioridad propuesta:** **media** (no inmediata: no hay evidencia de una BD legada conectada al servicio actual; si la verificación de Render muestra la columna `fecha` presente con datos, elevar a inmediata).
- **Corrección recomendada:** separar migraciones destructivas del boot: ejecutarlas una sola vez con script/flag explícito y backup previo, y dejar en el arranque solo operaciones idempotentes y no destructivas.
- **Prueba de validación:** en una BD desechable con el esquema legado (`fecha` poblada con filas de prueba), arrancar el backend → verificar si se vacía la tabla; tras el fix, verificar que el arranque normal no la vacía y que el script de migración dedicado sí lo hace bajo flag.
- **Corregido (Fase 2, §8B.1 — código + pruebas):** bloque `DO $$` retirado de `schema.sql`; la conversión queda como migración manual `backend/migrations/migrate-horarios-legado-semanal.sql` con advertencias (psql, `pg_dump` previo, condición de columna `fecha` → no-op). Pruebas: `tests/schemaArranque.test.mjs` (4). **Pendiente:** verificar el estado real de la BD de Render.

---

### H12 — SVG permitido en subidas

- **Ubicación:** `backend/routes/upload.js:11,23` (formato `svg` en `allowed_formats` y mimetype `image/svg+xml`); límite de 5 MB y roles 3/4 correctos (`:21,30`); subida firmada desde servidor con `CLOUDINARY_URL` (sin endpoint unsigned) — controles positivos.
- **Riesgo:** un SVG con scripts se sirve desde `cloudinary.com`; si alguien lo abre en pestaña directamente, los scripts corren en el origen de Cloudinary (no en el de la app), lo que reduce el impacto; el riesgo mayor es contenido activo inesperado en imágenes.
- **Prioridad:** baja. **Corrección:** retirar `svg` de los formatos si no es un requisito documentado; si lo es, servir con `Content-Disposition` o sanitizar.
- **Prueba:** intentar subir un SVG de prueba con `<script>` como rol 3 → **esperado tras fix:** `400`.
- **Corregido (Fase 2, §8B.2 — código + pruebas):** evidencia previa: sin dependencia funcional de SVG en la UI (`accept="image/*"`, iconos inline/assets propios); `'svg'` retirado de `allowed_formats` e `image/svg+xml` del `fileFilter` → rechazo `400` antes de llamar a Cloudinary. Recursos existentes intactos (la lectura de `diapositivasHero.js` conserva la extensión). Pruebas: `tests/uploadSvg.test.mjs` (3).

### H13 — IDs no validados producen 500 en vez de 400

- **Ubicación:** ejemplos `backend/routes/avisos.js:85-88`, `backend/routes/clubes.js:162-166`, `backend/routes/estadisticas.js:185+` (`parseInt` sin chequeo de `NaN`), `backend/routes/formularios.js:362-383`.
- **Riesgo:** ruido de errores y posible fuga de mensajes del driver vía handler por defecto de Express (ver H15). Sin inyección (los parámetros están parametrizados).
- **Prioridad:** baja. **Corrección:** helper de validación de IDs enteros → `400`.
- **Corregido (Fase 2, §8B.3 — código + pruebas):** `lib/validarId.js` (`esIdEntero` + `validarParamsEnteros` por `router.param`) registrado en los 12 routers con parámetros de id; `slug` de encuestas y router `horarios` excluidos a propósito; `?id_club` de `/padron` con validación explícita. Pruebas: `tests/validarId.test.mjs` (12).

### H14 — `err.message` en endpoint de depuración

- **Ubicación:** `backend/routes/formularios.js:27-45` (`GET /debug-postulaciones`, rol 3, devuelve `err.message`).
- **Prioridad:** baja (requiere rol admin). **Corrección:** devolver mensaje genérico; retirar el endpoint si es desechable.
- **Corregido (Fase 2, §8B.4 — código + pruebas):** `500` con mensaje genérico; el detalle de PostgreSQL queda en `console.error`. Pruebas: `tests/debugPostulaciones.test.mjs` (2).

### H15 — Sin manejador global de errores de Express

- **Ubicación:** `backend/index.js` (no existe `app.use((err, req, res, next) => ...)`).
- **Riesgo:** con `NODE_ENV` sin definir, el handler por defecto de Express puede devolver páginas con stack traces en errores no capturados.
- **Prioridad:** baja. **Corrección:** manejador final que responda `500` genérico y loguee el detalle servidor-side.
- **Corregido (Fase 2, §8B.5 — código + pruebas):** `lib/errorHandler.js` (`manejadorErroresGlobal`) registrado en `index.js` después del 404: log server-side, conserva `err.status` 4xx (p. ej. JSON malformado → 400) y responde 500 genérico. Pruebas: `tests/errorHandler.test.mjs` (3 + 1 de H19).

### H16 — `requireClubLeader` no reconoce el parámetro `:idClub`

- **Ubicación:** `backend/middleware/auth.js:41` (`req.params.id || req.params.id_club`) vs `backend/routes/horarios.js:27,85,152` (usan `:idClub`).
- **Efecto:** el middleware responde `400 "id_club requerido"` para rutas de horarios; las rutas compensan verificando la propiedad dentro del handler, por lo que **no hay IDOR**, pero la capa de middleware queda muerta para esos endpoints y un refactor futuro podría eliminar la verificación inline pensando que el middleware la hace.
- **Prioridad:** baja (deuda de autorización). **Corrección:** aceptar `idClub` en el middleware y quitar la duplicación inline.
- **Registro (Fase 1):** inconsistencia confirmada y **diferida** — la Fase 1 no tocó `requireClubLeader` ni las rutas de horarios; queda para la revisión posterior de autorización (H2/H16 se benefician del mismo repaso del middleware).
- **Corregido (Fase 2, §8B.6 — código + pruebas):** `requireClubLeader` acepta `idClub`/`id_club`/`id` con validación de entero; nuevo `requireHorarioLeader` (roles 2/5) en `PUT/DELETE /api/horarios/:id`; la verificación inline se retiró tras demostrarla en dos pasos (403/404/400 conservados). Reasignación de horarios a coordinación: **no incorporada** (fase aparte). Pruebas: `tests/horariosAutorizacion.test.mjs` (13 + 13 en dos pasos).

### H17 — Hash bcrypt compartido en seed

- **Ubicación:** `backend/seed.sql:66,171` — un mismo hash para `admin@unid.mx` y el resto de usuarios seed.
- **Riesgo:** si `seed.sql` se ejecuta en un entorno accesible, existe una credencial de demostración conocida (mismo hash = misma contraseña).
- **Prioridad:** baja (script de desarrollo). **Corrección:** documentar “no ejecutar en producción”, usar hashes distintos o excluir el seed del artefacto de despliegue. Verificar que no se aplicó en la BD actual (pendiente de despliegue).
- **Documentado (Fase 2, §8B.7):** advertencia en la cabecera de `seed.sql` (solo desarrollo local, NO ejecutar en producción/compartida, credencial demo `123456` documentada, el arranque no lo ejecuta — cubierto por `schemaArranque.test.mjs`). **Decisión de alcance:** no se generaron hashes distintos: la contraseña está en texto claro en el propio archivo y hashes distintos no mitigan el riesgo real (ejecutar el seed en un entorno accesible). **Pendiente:** verificar que la BD de Render no aplicó el seed.

### H18 — Sanitización de URL por substring para Cloudinary (mapeo CodeQL)

- **Ubicación:** `backend/routes/diapositivasHero.js:8-18` y `backend/routes/noticias.js:38-48` — `url.includes('cloudinary.com')` + regex final `/upload/(v\d+\/)?(.+?)\.(ext)$` + prefijo fijo `clubs-unid/` en el `public_id`.
- **Análisis:** el check por substring es el patrón que CodeQL marca como *Incomplete URL substring sanitization*. La extracción acota el `public_id` a la carpeta del proyecto, y la destrucción requiere rol editor (3/4) que ya puede gestionar esas imágenes. Un `url` manipulado tipo `https://atacante.test/upload/v1/x.jpg?q=cloudinary.com` podría hacer que se intente borrar `clubs-unid/x.jpg` (un asset propio), no recursos ajenos.
- **Estado:** patrón confirmado; **impacto limitado** (no escalada). **Prioridad:** baja.
- **Registro (Fase 1):** inconsistencia (substring vs `URL.hostname`) confirmada y **diferida**; la sanitización de URL por host se agenda junto con H10 en una fase posterior.
- **Corrección:** validar hostname con `URL` de Node (`new URL(url).hostname.endsWith('cloudinary.com')` con comparación de partes, no substring) y permitir solo hosts de Cloudinary conocidos.
- **Corregido (Fase 2, §8B.8 — código + pruebas):** `esUrlCloudinary()` exportado de `lib/eliminarImagenCloudinary.js` (protocolo http(s) + hostname exacto `.cloudinary.com`), usado por `extraerPublicId` y `routes/diapositivasHero.js` en fase1; en `clubes-unid-hero` misma edición en la copia idéntica del lib + `routes/noticias.js` (ediciones idénticas → merge limpio). URL ajena con `?q=cloudinary.com` → rechazada. Pruebas: `tests/eliminarImagenCloudinary.test.mjs` (+3); fase1 154/154, hero 12/12.

### H19 — Textos crudos del backend mostrados en UI de cliente

- **Ubicación:** `src/services/api-core.js:61` propaga `data.error` tal cual; se pintan en `src/components/presidente/secciones/SeccionConvocatorias.jsx:20,79`, `src/components/formularios/inscripcion/FormularioInscripcion.jsx:86,180`, `src/components/modals/ModalInicioSesion.jsx:34,77`, `src/hooks/useSeccionEncuestas.js:123,170,446`, `src/components/admin/seccion-encuestas/SeccionEncuestas.jsx:181`, y `alert(err.message)` en `SeccionPostulaciones.jsx:23`. La 404 global incluye método y ruta (`backend/index.js:86-88`), que puede llegar a pantalla. No se observaron stack traces al usuario (solo `data.error` + `status`).
- **Prioridad:** baja (higiene/UX). **Corrección:** mapear códigos de estado a mensajes propios por componente, como ya hace correctamente `src/pages/PaginaEncuesta.jsx:356-367`.
- **Corregido (Fase 2, §8B.9 — código + pruebas, con decisión de alcance):** mapeo **central** en `src/services/api-core.js` (`request()`) en vez de por componente (~65 sitios de pintado): fallos sistémicos (red, respuesta no-JSON, ≥500, 404 global) → mensaje propio; 4xx de contrato (400 validación, 401 `Credenciales inválidas`, 403, 429) → conserva `data.error` (mapearlos por componente habría roto mensajes necesarios). `404` global sin método/ruta en la respuesta (van al `console.warn`). Pruebas: estática en `tests/errorHandler.test.mjs`; ESLint y `vite build` 0.

### H20 — Dependencias de servidor en el `package.json` del frontend

- **Ubicación:** `package.json:18,20` (`cloudinary`, `multer-storage-cloudinary` en `dependencies`); no se importan en `src/` (grep: 0). Ya existen en `backend/package.json`.
- **Prioridad:** baja (higiene; riesgo de empaquetado accidental). **Corrección:** quitarlas del manifest raíz.
- **Corregido (Fase 2, §8B.10 — manifest + verificación):** `pnpm remove cloudinary multer-storage-cloudinary` (manifest + lock raíz, −6 paquetes); grep de imports en `src/`: 0; `server/`: sin uso; backend conserva ambas en `backend/package.json`. ESLint 0, `vite build` 0.

### H21 — `node_modules` local desincronizado del lockfile (solo observación local)

- **Evidencia:** `backend/node_modules/.package-lock.json` refleja Express 4.x y no registra `cloudinary`/`multer-storage-cloudinary`, mientras `backend/package.json` declara Express ^5 y el lock raíz resuelve las versiones nuevas. El despliegue debe instalar desde el lock, pero **conviene verificar** que Render usa `pnpm install`/`npm ci` con lockfile y no una instalación sin fijar. **Pendiente de despliegue.** Acción: `npm install`/`pnpm install` local y confirmar el install command del servicio.
- **Corregido localmente (Fase 2, §8B.11 — verificado):** `npm ci` en `backend/` → Express **5.3.0** (el lockfile SÍ estaba en sync; `node_modules` estaba stale) y `cloudinary` presente. Suite backend **154/154** bajo Express 5. **Pendiente (operativo):** confirmar el install command de Render (que use lockfile).

---

## 5. Política propuesta de rate limiting

Principios: (1) no hay un “tamaño único” correcto — cada operación se dimensiona según su costo, su público y su abuso más realista; (2) la identificación por IP sola es insuficiente en la red del campus (NAT: decenas o cientos de alumnos comparten IP pública), por lo que **cuando hay usuario autenticado la clave debe ser el usuario**, con la IP solo como respaldo anónimo; (3) contadores en memoria (`express-rate-limit`, ya instalado: `^8.5.2`) son suficientes para una instancia única; **no se propone Redis** mientras no haya múltiples instancias verificadas — si las hay, el límite efectivo se multiplica por instancia y deberá documentarse; (4) esto **no sustituye** una protección perimetral contra DoS (CDN/WAF), que queda fuera de alcance.

> **Fase 1:** esta política **ya se implementó** (H5a + H8, §8.8) en `backend/lib/rateLimits.js` con umbrales por variable de entorno (`RATE_LIMIT_*`, valores por defecto positivos documentados en `.env.example`). El umbral global subió a 1200/min por IP (defensa holgada para los paneles que hacen muchas llamadas por sesión); el resto de filas se aplicó como se propone.

| Operación | Ruta | Umbral propuesto | Clave | Justificación |
|---|---|---|---|---|
| Login local | `POST /auth/login-local` | **ya existe:** 10 / 15 min | IP | Fuerza bruta de credenciales. Con NAT de campus, 10/15 min por IP puede bloquear usuarios legítimos detrás del mismo NAT en hora pico; se recomienda **subir a ~20/15 min por IP y agregar 5/15 min por intento fallido por cuenta** (contador por `correo` normalizado) para no castigar al vecino de IP. |
| Login Microsoft | `POST /auth/login-microsoft` | **20 / 15 min** | IP | Cada intento dispara una llamada saliente a Microsoft Graph (costo amplificado). Sin límite actual. Clave por IP: no hay cuenta aún en este punto. |
| Registro | `POST /auth/register` | 10 / hora | IP + usuario admin (header JWT) | Solo rol 3; bajo volumen legítimo. |
| Envío de encuesta | `POST /encuestas/publico/:slug` | **ya existe:** 300 / min | IP | Dimensionado al peor caso realista de NAT de campus (código lo documenta en `encuestas.js:57-69`). Mantener. Corregir el `skip` de H8. |
| Postulación (formulario) | `POST /formularios` | 5 / hora | **id de usuario** (JWT) | El límite de negocio ya existe (3 postulaciones); el rate limit evita spam automatizado desde una cuenta real. IP no sirve como clave por el NAT compartido; el usuario sí identifica al atacante. |
| Subida de imagen | `POST /upload/imagen` | 30 / min | id de usuario (JWT) | Rol 3/4, costo Cloudinary por archivo. |
| Creación de notificaciones | `POST /notificaciones` | 30 / min | id de usuario (JWT) | Evita spam masivo (complementa H7, que debe restringir la autorización). |
| Global de API | `app.use('/api', …)` | **implementado:** 1200 / min | IP (`X-Forwarded-For[0]` con `trust proxy=1`) | Red de seguridad única para el resto de rutas; umbral holgado para no afectar paneles que hacen muchas llamadas. No sustituye límites por operación en las sensibles. |
| Health | `GET /api/health` | exento | — | Los orquestadores (Render) lo consultan con frecuencia. |

Notas de implementación (aplicadas en la Fase 1, §8.8):
- `standardHeaders: 'draft-7'`, `legacyHeaders: false`, handler con `429` JSON + `Retry-After` (añadido automáticamente por express-rate-limit v8).
- `OPTIONS` y `GET /api/health` exentos del global.
- Claves `usuario:${id}` / `ip:${ip}` / `cuenta:${correo}` según la fila; los fallbacks a IP usan `ipKeyGenerator` (agrupación IPv6 /56).

---

## 6. Plan de corrección por fases

**Fase 0 — Inmediato (sin despliegue riesgoso)**
1. H3: verificar/rotar secretos en Render; limpiar `.gitleaks.toml` (huellas, no valores); confirmar que la allowlist deja de suprimir detecciones.
2. H1: escapar HTML en `asistenciaTemplate.js` + `Content-Disposition` opcional.
3. ~~H5b: agregar `headers` en `vercel.json` (`X-Frame-Options`, `frame-ancestors`) para el frontend; `helmet()` en el backend.~~ — **hecho en la Fase 1** (§8.9): `headers` en `vercel.json` y middleware explícito en el backend (sin helmet, por los motivos documentados en §8.9); CSP queda para H9.

**Fase 1 — Corto plazo**
4. ~~H2: revalidar usuario/rol en BD desde `authenticate` (vía A)~~ — **hecho en la Fase 1** (§8.6); la vía B (reducir ventana) queda innecesaria de momento.
5. ~~H4: TLS verificado con CA del proveedor (probar primero en el entorno de desarrollo de Render)~~ — **hecho en la Fase 1 a nivel de código** (§8.7); falta la verificación en el despliegue.
6. ~~H5a + §5: rate limit global + límites de `login-microsoft` y `POST /formularios` con clave por usuario~~ — **hecho en la Fase 1** (§8.8); los umbrales son provisionales y configurables por env.
7. H7: restringir audiencias de notificaciones por rol; validar `id_destinatario`; auditar historial.
8. ~~H6: filtrar el endpoint público de clubes y excluir PII del presidente~~ — **hecho en la Fase 1** (§8.10).

**Fase 2 — Corto/medio plazo**
9. ~~H8: `NODE_ENV=production` en Render, documentar en `.env.example`, patrón fail-safe~~ — **fail-safe hecho en la Fase 1:** los límites ya no dependen de `NODE_ENV` (§8.8) y `.env.example` documenta `RATE_LIMIT_*`. **Pendiente:** declarar `NODE_ENV=production` en Render para los demás comportamientos condicionados.
10. ~~H10: validar esquema de `ubicacion_maps` en servidor; validación de `imagen_portada`~~ — **hecho en la Fase 1** (§8.11); la allowlist estricta de dominio quedó como opción posterior.
11. ~~H11: migración destructiva fuera del arranque~~ — **hecho en la Fase 2** (§8B.1): `backend/migrations/migrate-horarios-legado-semanal.sql` manual; **pendiente** verificar el estado real de la BD desplegada.
12. ~~H12-H21: hardening menor agrupado (IDs, manejador de errores, SVG, mensajes, dependencias)~~ — **hecho en la Fase 2** (§8B.2–§8B.11); ver §8B.13 para los chequeos pendientes antes de desplegar.

**Fase 3 — Estratégica**
13. H9: evaluar sesión en cookie `HttpOnly` + CSP estricta; reconsiderar `localStorage` de MSAL.
14. Revisión tras obtener acceso al inventario CodeQL (cerrar §3 con ubicaciones exactas de aleatoriedad y format string).

---

## 7. Evidencia de comprobaciones realizadas

**Ejecutado (análisis estático, solo lectura):**
- Inventario completo de rutas backend (19 archivos montados, 98 rutas) con su protección por middleware.
- Revisión de las 88 apariciones de interpolación en template literals dentro de `backend/routes/` para descartar inyección SQL con input de usuario (conclusión delimitada en §1).
- Grep de `Math.random` (0 resultados), `dangerouslySetInnerHTML|eval|innerHTML|new Function|document.write` en `src/` (0), `supabase`/`service_role` en cliente (0), secretos hardcodeados en código fuente (0).
- Lectura completa de: `middleware/auth.js`, `routes/auth.js` (login/register), `routes/notificaciones.js` (POST), `routes/upload.js`, `routes/clubes.js` (público), `routes/convocatorias.js` (asistencia), `routes/encuestas.js` (bloque de rate limit y rutas públicas), `lib/asistenciaTemplate.js`, `lib/slug.js`, `migrate.js`, `index.js` (backend), `db.js`, `schema.sql` (bloque horarios), `.gitleaks.toml`, `vercel.json`, `api-core.js`, y verificaciones puntuales en el resto.
- Verificación de tracking (`git ls-files`, `git check-ignore`) de `.env`, `.gitleaks.toml` y afines.
- Confirmación de que `backend/.env` local **no** contiene la variable `NODE_ENV` (solo se inspeccionaron nombres de claves, no valores).

**No ejecutado / pendiente (no se hizo por decisión de alcance, no por imposibilidad de la prueba):**
- Inventario paginado de las 191 alertas de CodeQL (limitación de acceso, §2.2).
- Arranque del servidor y pruebas de requests (incluidas las pruebas propuestas en §4).
- `pnpm audit` / `npm audit` y cotejo de CVEs.
- Verificación en navegador: ejecución del vector H10(a), clickjacking real en el despliegue (H5b), H1.
- Inspección de variables y headers reales de Render y Vercel (H4, H5b, H8, H17, H21).

---

## 8. Fase 1 — correcciones aplicadas y verificaciones ejecutadas

**Rama:** `fix/seguridad-fase1` (worktree `../clubes-unid-fase1`), base `dbd62a5` + este informe. Sin commits (confirmación pendiente del equipo). Alcance acotado: H1, H7, H3, H2, H4, H5a, H8, H5b y H6. Sin cambios en migraciones, sesiones ni servicios externos.

### 8.1 H1 — escape de HTML en la lista de asistencia (corregido)

- **Archivo:** `backend/lib/asistenciaTemplate.js` — nueva función `escapeHtml` aplicada a todas las interpolaciones de datos (`nombreClub`, `bloque`, `fecha`/`hora` formateados, `lugar`, `nombre_completo`, `matricula`). Se conserva la estructura, los estilos, el botón y `window.print()`.
- **Pruebas:** `backend/tests/asistenciaTemplate.test.mjs` (7 pruebas, `node:test`, sin BD ni red, datos ficticios): payloads de `<script>`, ruptura de atributo con `"><img … onerror>`, quotes en matrícula, marcado en club/bloque/lugar, acentos preservados, marcadores de vacío y ampersand.
- **Ejecutado:** `node --test` en `backend/` → **23/23 pruebas pasan** (7 de H1 + 16 de H7). Verificación adicional: ninguna aparición de `onerror`/`onmouseover` dentro de etiquetas reales del HTML generado (aserción por regex en la prueba).
- **Estado:** corregido a nivel unitario. La verificación en navegador con servidor real queda pendiente (no ejecutada).

### 8.2 H7 — matriz de permisos de notificaciones (corregido)

- **Archivos:** nuevo `backend/lib/notificacionPermisos.js` (función pura `validarCreacionNotificacion`) y `backend/routes/notificaciones.js` (`POST /` delega la autorización en el helper tras consultar la fila del club cuando se pide `id_club`).
- **Matriz implementada** (derivada de los flujos observados: `SeccionAnuncios` de admin, `SeccionAvisos` de líderes con `audienciaFija="club"`, y la consulta de bandeja existente):

  | Rol | Audiencias | Club | id_destinatario |
  |---|---|---|---|
  | 1 alumno | ninguna (403) | — | — |
  | 2/5 líder | solo `club` | debe existir y el emisor debe ser presidente/vicepresidente (403 si es de otro club, 404 si no existe) | no permitido (403) |
  | 3 admin | todas | si `club`: debe existir (404) | entero positivo (400 si no) |
  | 4 rectoría | todas *(capacidad previa a la auditoría, conservada — ver §8.2.1)* | si `club`: debe existir (404) | entero positivo (400 si no) |

- **Regla de negocio pendiente de confirmar (señalada en §8.2.1):** si el rol 4 debe conservar la emisión vía API. No se concedieron privilegios nuevos: se mantuvo el alcance previo.
- **Comportamiento mejorado (documentado):** un `id_club` inexistente con audiencia `club` ahora responde `404` en vez de depend del error de FK (`500`). Los flujos de líder y admin legítimos se conservan.
- **Pruebas de helper:** `backend/tests/notificacionPermisos.test.mjs` (16 pruebas, función pura): alumno denegado en todas las audiencias; líder autorizado solo en su club y **denegado en club ajeno** (incluye vicepresidente); líder sin `id_club` (400), club inexistente (404), `id_destinatario` (403); admin/rectoría con audiencias globales, club existente/inexistente, `id_destinatario` válido e inválido; audiencia desconocida (400) y rol inválido (403); normalización de `id_club` a `null` fuera de audiencia `club`.
- **Pruebas de ruta (integración):** `backend/tests/notificacionesRuta.test.mjs` (12 pruebas de H7 en su momento; el archivo hoy suma 14 con las 2 de revalidación de §8.6) montan el router real en Express con el middleware `authenticate` auténtico (JWT firmado con un secreto ficticio solo de prueba) y el `pool.query` sustituido por un stub que registra cada consulta. Cubren: `401` sin token; denegaciones con **cero inserciones** (alumno global/club, líder de otro club, líder con audiencia global o sin `id_club`, admin a club inexistente, `id_destinatario` inválido, audiencia desconocida) — incluyendo el caso en que la matriz rechaza **antes de cualquier consulta** a la base —; y autorizaciones con **exactamente una inserción** con valores normalizados (`id_club`, `id_destinatario`). Se verifica además la posición de la matriz respecto a la escritura: ninguna solicitud denegada alcanza el `INSERT`.
- **Bug detectado y corregido por estas pruebas de ruta:** el bloque de historial del `POST /` referenciaba `id_club` tras el renombre de la variable destructurada (`idClub`), lo que producía un `500` en todo envío de admin. Corregido en `routes/notificaciones.js` (`detalles: { titulo, audiencia, id_club: idClub }`). Demuestra el valor de probar la ruta además del helper.
- **Ejecutado:** `node --test` en `backend/` → **35/35 pruebas pasan** (7 H1 + 16 helper H7 + 12 ruta H7). `node --check` de los archivos modificados → sin errores de sintaxis.

### 8.2.1 Rectoría (rol 4) — comportamiento implementado y decisión pendiente

Se distinguen dos capacidades:

1. **Emitir notificaciones (capacidad de la API `POST /api/notificaciones`):** el código **previo a la auditoría** ya permitía al rol 4 crear notificaciones con cualquier audiencia (solo se restringían los roles 2/5). La matriz de la Fase 1 **conserva esa capacidad sin ampliarla** — no es un privilegio nuevo por inferencia, es el mantenimiento del comportamiento existente. Existe una prueba de ruta que lo fija explícitamente.
2. **Publicar anuncios (flujo de producto):** el único panel que publica anuncios es el de administración (`SeccionAnuncios` → `FormularioNotificacion`, sin `audienciaFija`), es decir, el rol 3. **No existe UI de rectoría** para emitir notificaciones (verificado por grep de `FormularioNotificacion`/`crearNotificacion` en `src/`).

**Decisión de negocio pendiente (registrada):** si rectoría debe conservar la capacidad de emisión de la API o si debe restringirse al rol 3. Hasta que el equipo decida, se mantiene el comportamiento previo (emisión permitida) y se evita conceder cualquier privilegio adicional; si la decisión es restringir, el ajuste es quitar `4` de `ROLES_INSTITUCIONALES` en `lib/notificacionPermisos.js` y ajustar la prueba correspondiente.
- **Estado:** corregido; regla del rol 4 pendiente de confirmación (si el equipo la rechaza, el ajuste es quitar 4 de `ROLES_INSTITUCIONALES`).

### 8.3 H3 — configuración de detección de secretos (mitigado)

- **Archivo:** `.gitleaks.toml` reducido a `useDefault = true`, **sin ninguna allowlist**: se retiraron (a) la allowlist con los tres literales históricos, (b) las exclusiones globales por contenido de los placeholders y (c) la exclusión de lockfiles.
- **Justificación de retirar la exclusión de lockfiles:** se escaneó el historial completo con una configuración sin allowlists y el resultado fue limpio (0 hallazgos); por lo tanto la exclusión no era necesaria con gitleaks 8.28.0 y se retiró para dejar la configuración mínima. Si una versión futura llegara a marcar hashes de integridad de los lockfiles, puede reincorporarse una allowlist **solo por ruta** documentando ese motivo concreto.
- **Aclaración necesaria sobre el resultado de los escaneos:** un escaneo limpio de Gitleaks **no significa** que no existan secretos en el historial de Git (la herramienta detecta patrones conocidos, no garantiza ausencia) **ni demuestra** que las credenciales históricas estén revocadas en los servicios. La única forma de cerrar H3 es la **verificación y rotación operativa en Render** (y la confirmación de la contraseña administrativa), que sigue pendiente y no se tocó en esta fase.
- **Verificaciones ejecutadas (gitleaks 8.28.0, binario descargado a un directorio temporal):**
  1. Historial completo (217 commits) con la configuración **sin** la allowlist histórica → **0 hallazgos** (los literales no coinciden con ninguna regla por defecto de esa versión; la allowlist era innecesaria y solo añadía el riesgo de silenciar detecciones futuras).
  2. Historial completo con configuración **sin allowlists** (prueba de justificación de lockfiles) → **0 hallazgos**.
  3. Historial completo con la configuración final (`useDefault` solo) → **0 hallazgos**.
  4. **Detección verificada** en un repositorio temporal (solo allí, con credenciales **ficticias** que siguen patrones de reglas reales: JWT ficticio y clave AWS de ejemplo de documentación; nunca se escribieron secretos reales): el JWT ficticio fue detectado (regla `jwt`). Una contraseña arbitraria sin patrón no es detectada por las reglas por defecto — comportamiento esperado de las reglas genéricas.
- **Cambio de comportamiento documentado:** al retirar las exclusiones por contenido, cualquier **futura** aparición de cadenas parecidas a las históricas será marcada por el escáner (comportamiento deseado). Si una versión futura de Gitleaks llegara a marcar los hallazgos históricos del repo, la supresión debe hacerse con **fingerprints específicos** generados con esa versión (formato `compromiso:ruta:línea`), nunca volviendo a excluir por contenido.
- **Estado:** mitigado en el archivo de configuración; **tarea operativa pendiente sin cambios:** verificar/rotar las credenciales históricas en Render y confirmar la contraseña del usuario administrativo (la auditoría no rotó credenciales ni tocó servicios, y una limpieza de configuración no revoca secretos).

### 8.4 Archivos modificados (Fase 1)

| Archivo | Cambio |
|---|---|
| `backend/lib/asistenciaTemplate.js` | escape de datos en el HTML |
| `backend/lib/notificacionPermisos.js` | nuevo: matriz de permisos pura |
| `backend/routes/notificaciones.js` | `POST /` delega autorización en el helper; corrección del bug de historial detectado por las pruebas de ruta |
| `backend/tests/asistenciaTemplate.test.mjs` | nuevo: 7 pruebas unitarias H1 |
| `backend/tests/notificacionPermisos.test.mjs` | nuevo: 16 pruebas unitarias del helper H7 |
| `backend/tests/notificacionesRuta.test.mjs` | nuevo: 12 pruebas de integración de la ruta H7 (Express + JWT + pool simulado) |
| `backend/package.json` | script `test` (`node --test`) |
| `backend/middleware/auth.js` | **H2:** `authenticate` revalida usuario/estado/rol en BD por request |
| `backend/routes/auth.js` | **H2:** `login-local` rechaza cuentas con `deleted_at` sin emitir token |
| `backend/tests/authRevalidacion.test.mjs` | **H2:** nuevo: 11 pruebas de la revalidación |
| `backend/lib/dbTls.js` | **H4:** nuevo: construcción de la configuración de conexión con TLS verificado |
| `backend/db.js` | **H4:** usa `construirConfigPg`; se eliminó `rejectUnauthorized: false` |
| `backend/tests/dbTlsConfig.test.mjs` | **H4:** nuevo: 22 pruebas de construcción de configuración |
| `backend/tests/dbTlsHandshake.test.mjs` | **H4:** nuevo: 3 pruebas de handshake TLS local desechable (OpenSSL) |
| `backend/.env.example` | **H4:** documentación de `DB_SSL_CA_FILE` y de la regla de la URL sin parámetros TLS; **H5a/H8:** documentación de `RATE_LIMIT_*` y de `NODE_ENV` |
| `backend/lib/rateLimits.js` | **H5a/H8:** nuevo: umbrales por env, factory y singletons (global + por operación) |
| `backend/index.js` | **H5a:** `app.use('/api', limitadorGlobal)` tras CORS y antes de `express.json` |
| `backend/routes/auth.js` | **H5a:** límites por IP+cuenta en `login-local`, por IP en `login-microsoft` y `register` |
| `backend/routes/encuestas.js` | **H5a/H8:** el `skip` por `NODE_ENV` se eliminó; límite de lectura pesada en resultados admin |
| `backend/routes/formularios.js` | **H5a:** límite por usuario en `POST /` |
| `backend/routes/upload.js` | **H5a:** límite por usuario antes de `multer` |
| `backend/routes/notificaciones.js` | **H5a:** límite por usuario en `POST /` tras `authenticate` |
| `backend/tests/rateLimit.test.mjs` | **H5a/H8:** nuevo: 15 pruebas de integración (incluye campus combinado de 50 usuarios con la misma IP) |
| `backend/lib/securityHeaders.js` | **H5b:** nuevo: middleware de cabeceras de seguridad |
| `backend/index.js` | **H5a:** montaje del limitador global; **H5b:** montaje de `cabecerasSeguridad` |
| `vercel.json` | **H5b:** `headers` globales (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) |
| `backend/tests/securityHeaders.test.mjs` | **H5b:** nuevo: 2 pruebas de cabeceras |
| `backend/routes/clubes.js` | **H6:** público sin PII de presidente y con filtro de estatus 3; nuevo `GET /admin` (rol 3) |
| `src/services/club.service.js` | **H6:** `getClubesAdmin` |
| `src/services/api.js` | **H6:** expone `getClubesAdmin` |
| `src/hooks/useAdminClubes.js` | **H6:** el panel admin usa `getClubesAdmin` |
| `backend/tests/clubesPublico.test.mjs` | **H6:** nuevo: 4 pruebas (público vs admin + detalle sin PII) |
| `backend/lib/eliminarImagenCloudinary.js` | **Cloudinary:** nuevo: extracción de `public_id` sin doble carpeta, comparación por identidad, destrucción con `invalidate` |
| `backend/routes/noticias.js` | **Cloudinary:** usa el lib; limpieza con `await` tras UPDATE/DELETE exitosos y verificación de referencia por identidad |
| `backend/routes/clubes.js` | **Cloudinary:** limpieza de portada tras COMMIT con verificación de referencia (además de H6/H6b) |
| `backend/tests/eliminarImagenCloudinary.test.mjs` | **Cloudinary:** nuevo: 9 pruebas unitarias sin red |
| `backend/lib/validarUrl.js` | **H10:** nuevo: validadores de esquema para `ubicacion_maps` e `imagen_portada` |
| `backend/routes/horarios.js` | **H10:** valida `ubicacion_maps` en POST y PUT (además de lo ya existente) |
| `backend/tests/validarUrl.test.mjs` | **H10:** nuevo: 10 pruebas (helper + rutas) |
| `.gitleaks.toml` | sin allowlists (solo `useDefault`); sin secretos ni exclusiones por contenido ni de lockfiles |
| `AUDITORIA-SEGURIDAD.md` | este informe (copia en la rama de correcciones) |

### 8.5 Verificaciones ejecutadas vs inferidas

- **Pruebas del helper (unitarias, función pura):** 23 (7 de H1 sobre el template + 16 de H7 sobre la matriz). Sin Express, sin BD, sin red.
- **Pruebas de revalidación (H2, unitarias del middleware):** 11 en `authRevalidacion.test.mjs` con JWT ficticio y `pool.query` simulado; incluyen los casos fail-closed y «cero consultas» para tokens inválidos.
- **Pruebas de ruta (integración, H7 + H2):** 14 sobre el router real con `authenticate` (JWT ficticio) y `pool.query` simulado; verifican autorización, normalización, que **las denegaciones no generan inserciones**, y la revalidación por request (rol antiguo → 403; desactivado → 401). No cubren: la consulta real a PostgreSQL, el resto de rutas de notificaciones (GET/leer/eliminar) ni interacción con el frontend.
- **Pruebas de configuración TLS (H4):** 22 unitarias sobre `construirConfigPg` (construcción, rechazos, CA, precedencia real en `ConnectionParameters` de pg 8.21.0) + 3 de handshake TLS contra un `tls.Server` local con certificados desechables de OpenSSL (cadena confiable aceptada; sin CA → rechazado; nombre incorrecto → rechazado). No son pruebas contra PostgreSQL; ver §8.7.
- **Pruebas de rate limiting (H5a/H8, integración):** 15 en `rateLimit.test.mjs` con el orden de middlewares de `index.js` y umbrales pequeños por env (ver §8.8). Incluyen el escenario campus combinado de **50 usuarios compartiendo IP** con el montaje real (global + por ruta), que demuestra que el NAT del campus no produce bloqueos cruzados: cada usuario agota su propia cuota sin afectar a los demás.
- **Pruebas de cabeceras de seguridad (H5b):** 2 en `securityHeaders.test.mjs` sobre el middleware montado en Express local (respuesta 200 y 404).
- **Pruebas de clubes público/admin (H6):** 3 en `clubesPublico.test.mjs` (pool simulado + JWT ficticio): el SELECT público no contiene campos de presidente y filtra estatus 3; `/admin` exige sesión/rol y sí los incluye.
- **Pruebas de Cloudinary (helper + rutas):** 9 en `eliminarImagenCloudinary.test.mjs` (sin red; `destroy` sustituido por stub): extracción de `public_id` con y sin carpeta del upload, query string, mayúsculas, transformación en URL, URLs no destructibles; comparación por identidad (misma imagen con distinta versión = misma identidad); destrucción con `invalidate`; no destrucción si otra candidata sigue refiriendo el recurso; tolerancia a `not found` y errores.
- **Pruebas H10 (URLs):** 10 en `validarUrl.test.mjs` (4 unitarias + 6 de ruta con pool simulado), ver §8.11.
- **Total Fase 1:** `node --test` en `backend/` → **113/113**.
- **Comprobaciones operativas pendientes (no ejecutadas):** verificación/rotación de credenciales H3 en Render; comportamiento del servidor real con datos de prueba (H1 en navegador); `NODE_ENV=production` en Render (para los demás comportamientos condicionados, H8); **verificación real de las cabeceras en Render y Vercel con `curl -I`** (H5b); inspección de la BD de Render (H11/H17); ESLint sobre `backend/` (la config actual solo cubre `src/` y `server/`). Ninguna prueba se ejecutó contra entornos compartidos ni de producción.

### 8.6 H2 — revalidación de sesión contra la BD (corregido)

- **Archivos:** `backend/middleware/auth.js` (`authenticate` pasa a `async` y revalida por request) y `backend/routes/auth.js` (`login-local` deja de emitir tokens a cuentas desactivadas).
- **Comportamiento implementado (vía A de la §H2):**
  1. `jwt.verify` primero (firma y expiración con el mecanismo existente); token ausente, inválido o expirado → `401` **sin consultar la BD**. Token sin claim `id` → `401` también sin consultar.
  2. Con el `id` del token verificado, consulta mínima: `SELECT id_usuario, nombre_completo, id_rol FROM usuarios WHERE id_usuario = $1 AND deleted_at IS NULL` — la vigencia de la cuenta se filtra en la propia consulta.
  3. Sin fila activa (inexistente o desactivada) → `401` (`Sesión no válida o cuenta desactivada`).
  4. Error de la BD → `500` controlado (**fail closed**): no se hace `next()`, no se exponen detalles y `req.user` **no** se monta con los claims del token como respaldo.
  5. `req.user` se construye **solo** con los datos actuales de la BD (`id`, `nombre_completo`, `id_rol`); los claims del token no se mezclan — un rol retirado no sobrevive en la sesión. `requireRole`/`requireClubLeader` leen por tanto el rol vigente → el rol antiguo del token queda sin efecto (403).
- **Emisión (login-local):** se añade `u.deleted_at` a la consulta; cuenta desactivada → `401` con el mismo mensaje de credenciales inválidas (sin nuevo oráculo de enumeración). El login con Microsoft ya lo verificaba (`auth.js:191-195`) y no se tocó.
- **Inventario de consumidores de `req.user`** (grep completo): solo `id`, `id_rol` y `nombre_completo` — los tres ahora provienen de la BD. El frontend solo lee `exp` del token (`src/utils/jwt.js`), por lo que el formato del JWT y su expiración de 24 h **no cambian**. Existe un único punto de emisión (`generarToken`). Las verificaciones de propiedad/clubes por rutas (p. ej. `id_emisor`/`id_club`) se conservan intactas.
- **Pruebas nuevas:** `backend/tests/authRevalidacion.test.mjs` — **11 pruebas** (JWT con secreto ficticio + pool simulado): activo aceptado con datos de BD; claims obsoletos reemplazados sin mezcla; alumno con token de admin → `403` en ruta de rol 3 y admin real → paso; token ausente/firma inválida/expirado/sin `id` → `401` con **cero consultas**; inexistente y desactivado → `401`; fallo de BD → `500` sin `next()` y sin `req.user`.
- **Pruebas de ruta (integración):** `notificacionesRuta.test.mjs` ampliado de 12 a **14** pruebas: el stub ahora responde también la consulta de revalidación; se añade el caso de rol antiguo en token (403, sin inserción) y de usuario desactivado (401, sin inserción). Las dos aserciones previas de «cero consultas» se ajustaron a «solo la consulta de revalidación», porque `authenticate` ahora consulta la BD una vez por request autenticado.
- **Ejecutado:** `node --test` en `backend/` → **48/48 pruebas pasan** (7 H1 + 16 helper H7 + 14 ruta H7/H2 + 11 revalidación H2).
- **Limitaciones declaradas:** sin verificación en navegador ni contra una BD real (las pruebas usan pool simulado); la latencia de una consulta extra por request autenticado no se midió con volumen real; el registro del fallo de BD usa `console.error`, el patrón ya presente en el proyecto.

### 8.7 H4 — TLS verificado hacia PostgreSQL (corregido a nivel de código)

- **Versiones efectivas inspeccionadas:** `pg@8.21.0` (declarado `^8.13.0`), `pg-pool@3.14.0`, `pg-connection-string@2.13.0`. Un único punto de creación del pool (`backend/db.js`); el resto de módulos importan ese pool. `DATABASE_URL` definida ⇒ modo remoto; sin ella ⇒ modo local con `DB_*` (comportamiento previo conservado, sin TLS).
- **Diagnóstico de precedencia (verificado en el código instalado):** en `pg/lib/connection-parameters.js` la configuración se construye con `Object.assign({}, config, parse(connectionString))` — **los parámetros de la URL sobrescriben el objeto `ssl` explícito**. En `pg-connection-string@2.13.0`, la presencia de `sslmode`/`sslrootcert`/`sslcert`/`sslkey` (o `ssl=true`) en la cadena **reemplaza** el objeto `ssl` completo (se pierde, p. ej., una CA configurada) y `sslmode=no-verify` produce `rejectUnauthorized: false`. La documentación oficial de node-postgres lo advierte explícitamente (`node-postgres.com/features/ssl`, «Usage with connectionString»). Además, `PGSSLMODE` solo se consulta cuando no hay `ssl` explícito, por lo que con nuestra configuración remota queda ignorado.
- **Comportamiento implementado** (nuevo módulo puro `backend/lib/dbTls.js`, usado por `backend/db.js`):
  1. **Modo remoto** (`DATABASE_URL` presente): `ssl: { rejectUnauthorized: true }` — validación de cadena de confianza **e identidad del servidor** (hostname/SAN), equivalente práctico a `verify-full` de libpq (PostgreSQL docs, §32.19.1 y Tabla 32.1: `verify-full` es el único modo con protección contra MITM completa). La cadena de confianza por defecto es la del sistema (almacén de CA de Node); **no se asume** que el proveedor necesite CA ni certificados de cliente adicionales.
  2. **Rechazo de parámetros TLS en la URL:** si `DATABASE_URL` contiene `ssl`, `sslmode`, `sslrootcert`, `sslcert` o `sslkey` (en cualquier combinación, mayúsculas incluidas), el arranque falla con un error claro que nombra los parámetros y explica el remedio, **sin imprimir la cadena ni credenciales**. Esto impide la sobrescritura silenciosa descrita arriba y evita modos débiles (`require`, `no-verify`, `disable`) — Tabla 32.1 de libpq: `require` no protege contra MITM. También se rechazan URL no parseables y esquemas distintos de `postgres://`/`postgresql://`.
  3. **CA propia opcional:** `DB_SSL_CA_FILE=/ruta/ca.pem` — si se declara, el archivo se lee y se usa como `ssl.ca`; archivo ilegible o sin contenido PEM ⇒ error de arranque (**fail closed**: no se degrada a conexión sin la CA pedida). Si la variable no existe o está vacía, se usa el almacén del sistema (una CA del sistema **puede ser suficiente**; no se exige CA personalizada).
  4. **Sin respaldos inseguros:** no hay ningún camino que desactive la validación ni reintente con `rejectUnauthorized: false`. Se eliminó por completo el literal `rejectUnauthorized: false` del código del backend (verificado por grep; solo queda `true`).
  5. **Modo local conservado:** solo cuando `DATABASE_URL` está ausente (configuración local explícita con `DB_*`), con los mismos valores por defecto que antes y sin declarar `ssl`; `DB_PASSWORD` sigue siendo obligatoria con el mismo mensaje de error.
- **Pruebas de construcción de configuración:** `backend/tests/dbTlsConfig.test.mjs` — **22 pruebas** (pool simulado innecesario; función pura con `leerArchivo` inyectable): remoto con verificación; ausencia de respaldos inseguros en la configuración serializada; CA correcta, ilegible, no-PEM y vacía; rechazo de cada parámetro TLS de URL (incluido `sslmode=verify-full`, porque su presencia reemplazaría el objeto `ssl` completo) sin filtrar URL ni credenciales; URL con mayúsculas, esquema inválido y no parseable; modo local (valores, ausencia de `ssl`, `DATABASE_URL` vacío); y dos pruebas contra el `ConnectionParameters` **real instalado** que fijan la precedencia: con nuestra URL sanitizada el `ssl` explícito se conserva, y con `?sslmode=require` la URL lo pisa (motivo documentado del rechazo).
- **Pruebas de handshake TLS (entorno local desechable):** `backend/tests/dbTlsHandshake.test.mjs` — **3 pruebas** que generan con OpenSSL (3.5.4 disponible vía Git for Windows; rutas conocidas + `OPENSSL_BIN`; si no hay OpenSSL, se omiten con motivo) una CA y un certificado de servidor con `SAN DNS:localhost` en un directorio temporal, levantan un `tls.Server` de Node en `127.0.0.1` y conectan con las opciones exactas que produce `construirConfigPg`: (a) con `DB_SSL_CA_FILE` = CA de la prueba → conexión aceptada y `authorized: true`; (b) sin CA (solo almacén del sistema) → rechazo (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`); (c) CA correcta pero conectando por `127.0.0.1` sin SAN de IP → rechazo (`ERR_TLS_CERT_ALTNAME_INVALID`). **Son pruebas de la capa TLS de Node con nuestras opciones, no una sesión con PostgreSQL**; se distinguen expresamente de la verificación desplegada pendiente.
- **Ejecutado:** `node --test` en `backend/` → **73/73 pruebas pasan** (48 previas + 25 nuevas). `node --check` de los archivos modificados → sin errores de sintaxis.
- **Requisitos concretos para verificar en el backend de desarrollo (pendiente, sin ejecutar aquí):**
  1. Ajustar `DATABASE_URL` en Render quitando cualquier `sslmode`/`ssl*` de la cadena (Supabase/Neon suelen entregar `?sslmode=require`; el backend rechaza arrancar con ese parámetro y explica el motivo).
  2. Reiniciar el servicio y confirmar que arranca sin el error de configuración.
  3. Ejecutar una consulta inocua aislada de `migrate()` (p. ej. `node -e` con `pool.query('SELECT 1')` y `pool.end()`, o el script existente `check-db.js` revisado) — **no** arrancar el servidor completo ni reejecutar migraciones para esta comprobación.
  4. Si la conexión falla con error de certificado: comprobar con `openssl s_client -connect <host>:<puerto> -servername <host>` si el servidor presenta cadena de CA pública; si usa una CA propia, guardar su PEM y declarar `DB_SSL_CA_FILE` en Render, repitiendo el paso 3.
  5. Confirmar que el log de arranque no muestra advertencias TLS y que una consulta `SELECT 1` responde.
- **Estado:** cambio local implementado y verificado con pruebas de construcción y de handshake TLS; **la verificación contra el backend desplegado (Render → proveedor de BD) queda pendiente** por requerir acceso al servicio real, que esta fase no toca.

### 8.8 H5a + H8 — política única de rate limiting (corregido a nivel de código)

- **Nuevo `backend/lib/rateLimits.js`:** centraliza todos los limitadores. `UMBRALES` lee variables `RATE_LIMIT_*` con `enteroPositivo` (valor inválido o ausente ⇒ default seguro positivo); `opcionesComunes()` fija `standardHeaders: 'draft-7'`, `legacyHeaders: false` y handler `429` JSON (`{ error: 'Demasiadas solicitudes…' }`); express-rate-limit v8 añade `Retry-After` y `RateLimit` automáticamente. **No hay `skip` por `NODE_ENV` en ningún limitador (H8).**
- **Claves:** `usuario:${req.user.id}` cuando hay identidad revalidada (H2) y respaldo `ip:${ipKeyGenerator(req, 56)}` (el helper obligatorio de la v8 para IPv6, agrupa por red /56); `claveCuentaLogin` usa el correo del body normalizado (trim + minúsculas, cap 180) y **nunca elude** el límite IP paralelo.
- **Montaje** (`backend/index.js`): orden `cors` → `app.use('/api', limitadorGlobal)` → `express.json` → rutas. El global salta `OPTIONS` (preflights de CORS) y `GET /api/health` (orquestadores). `trust proxy` permanece en `1` (Render termina TLS y agrega `X-Forwarded-For`; comentado que debe ajustarse si hay un proxy adicional).
- **Tabla de limitadores implementados:**

  | Limitador | Ruta(s) | Ventana | Límite | Clave | Posición |
  |---|---|---|---|---|---|
  | global | todo `/api` | 1 min | 1200 | IP (última del XFF) | tras CORS, antes de `express.json` |
  | login-local IP | `POST /auth/login-local` | 15 min | 20 | IP | primera, en paralelo |
  | login-local cuenta | `POST /auth/login-local` | 15 min | 5 | `cuenta:` + correo | segunda, en paralelo |
  | login-microsoft | `POST /auth/login-microsoft` | 15 min | 20 | IP | antes del handler |
  | registro | `POST /auth/register` | 1 h | 10 | IP | antes de `authenticate` (frena peticiones sin sesión) |
  | envío encuestas | `POST /encuestas/publico/:slug` | 1 min | 300 | IP | reemplaza al `limiteEnvio` local (sin `skip`) |
  | formularios | `POST /formularios` | 1 h | 5 | usuario | tras `authenticate`+`requireRole(1)` |
  | upload | `POST /upload/imagen` | 1 min | 30 | usuario | tras auth, **antes de `multer`** (no parsear multipart si ya agotó) |
  | notificaciones | `POST /notificaciones` | 1 min | 30 | usuario | tras `authenticate`, antes de la matriz H7 |
  | lecturas pesadas | `GET /encuestas/admin/:id/resultados` | 1 min | 60 | usuario | tras auth (`json_agg` completo) |

- **Notas de diseño:**
  - El límite por IP de login sube a 20/15 min (el de 10/15 min original bloqueaba usuarios legítimos detrás del NAT del campus) y se compensa con 5/15 min por cuenta: la combinación frena la fuerza bruta contra una cuenta sin castigar al vecino de IP; la cuenta agotada lo sigue estando aunque el atacante cambie de IP.
  - El global es holgado (1200/min por IP) a propósito: es red de seguridad única, no sustituye límites por operación. Los umbrales son **provisionales** y configurables por env sin redeploy de código.
  - Store en memoria: por instancia y se reinicia en cada despliegue. Aceptable para una instancia única; con varias instancias el límite efectivo se multiplica (documentado; sin Redis porque no hay instancias múltiples verificadas).
  - El frontend no tiene reintentos automáticos (single fetch en `src/services/api-core.js`): un 429 no genera bucles.
- **Pruebas nuevas:** `backend/tests/rateLimit.test.mjs` — **15 pruebas** (Express local en puerto efímero, umbrales pequeños por env, datos ficticios): 429 con JSON + `Retry-After` + `RateLimit`; operación protegida no ejecutada tras el 429; recuperación al cerrar la ventana; usuarios distintos con la misma IP no comparten contador; separación de contadores (agotar formularios no bloquea el global); doble límite de login (IP y cuenta con cambio de IP para eludirlo); envío de encuestas activo con `NODE_ENV` ausente **y** con `development` (H8); `X-Forwarded-For` spoofed (solo cuenta la IP más cercana al proxy); agrupación IPv6 /56; health y OPTIONS exentos; escenario campus ficticio (10 usuarios, 20 peticiones, misma IP, sin bloqueo); **escenario campus combinado: 50 usuarios con la misma IP detrás del global + el limitador por ruta (montaje idéntico al de `index.js`): las 100 primeras operaciones (50 × 2 envíos) pasan todas, la 3.ª de cada usuario cae con 429 por su cuota individual y un usuario nuevo sigue operando — el bloqueo nunca es de la IP compartida**; montaje real del router de notificaciones (límite corta antes del INSERT).
- **Ejecutado:** `node --test` en `backend/` → **87/87 pruebas pasan** (73 previas + 14 nuevas). `node --check` de los archivos modificados → sin errores de sintaxis.
- **Limitaciones declaradas:** sin medición con volumen real ni con el despliegue; sin Redis/almacén compartido (por diseño, mientras sea instancia única); el comportamiento real del `X-Forwarded-For` de Render con `trust proxy=1` está basado en el patrón estándar de Render y debe confirmarse en el despliegue (log de la IP resultante en un entorno de desarrollo); ESLint no cubre `backend/` con la config actual.
- **Estado:** corregido a nivel de código y pruebas locales; los umbrales definitivos deben ajustarse tras medir uso real; la verificación con tráfico del despliegue queda pendiente.

### 8.9 H5b — cabeceras de seguridad en backend y frontend (corregido)

- **Backend (nuevo `backend/lib/securityHeaders.js`, montado primero en `index.js`):** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: cross-origin` y `X-Permitted-Cross-Domain-Policies: none`. Va antes de CORS para cubrir también preflights, errores y 404.
- **Decisión: sin helmet, con justificación.** El informe proponía `helmet()`, pero sus defaults incluyen `Cross-Origin-Resource-Policy: same-origin` y `Content-Security-Policy` que podrían romper flujos reales no verificables aquí: el frontend (Vercel) carga imágenes del API (Render) cross-origin y la CDN de Cloudinary participa en los flujos de subida/visualización. Un middleware manual es explícito, sin dependencias nuevas y testeable; CSP se reserva para la fase de estrategia de sesión (H9), donde debe diseñarse con la lista real de orígenes.
- **Frontend (`vercel.json`):** `headers` globales `/(.*)`: `X-Frame-Options: SAMEORIGIN` (clickjacking de los paneles servidos por Vercel), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Pruebas nuevas:** `backend/tests/securityHeaders.test.mjs` — **2 pruebas** (Express local): cabeceras presentes en una respuesta 200 y también en una 404.
- **Ejecutado:** `node --check` de los archivos modificados; validación de sintaxis de `vercel.json` (JSON válido); `node --test` en `backend/` → **89/89 pruebas pasan** (87 previas + 2 nuevas).
- **Limitaciones declaradas:** las cabeceras en Vercel/Render no se verificaron con `curl -I` contra los despliegues (fuera de alcance); el `X-Frame-Options: SAMEORIGIN` del frontend asume que nadie necesita embeber la app (correcto hoy); no se añadió CSP (H9).
- **Estado:** corregido a nivel de código y configuración; verificar con `curl -I` tras desplegar.

### 8.10 H6 — PII y filtro de estatus en el listado público de clubes (corregido)

- **Problema confirmado (§H6):** `GET /api/clubes` (público) seleccionaba `id_presidente` y `p.nombre_completo AS presidente_nombre` y devolvía **todos** los clubes; el filtro de estatus 3 (inactivo) existía solo en el cliente.
- **Corrección en `backend/routes/clubes.js`:**
  1. **Público (`GET /`):** `WHERE c.id_estatus_club <> 3` en servidor; se eliminan `id_presidente`, `presidente_nombre` y el `LEFT JOIN usuarios` del SELECT. El catálogo y la landing siguen recibiendo lo que usan (nombre, descripción, categoría, imagen, estatus 1/2, cupos, fechas, niveles).
  2. **Nuevo `GET /admin`** (antes de `/:id`, `authenticate` + `requireRole(3)`): la lista completa anterior (todos los estatus, incluido 3, con `id_presidente` y `presidente_nombre`) para el panel, cuyo hook `useAdminClubes` la reutiliza en sus flujos de estatus y reasignación de presidente (`AsignacionClubUsuario` depende de `id_presidente`).
- **H6b — `GET /:id` (público, revisado y corregido):** se retiraron del SELECT `p.correo_institucional AS presidente_correo` (0 consumidores en todo `src/`) y `c.id_vicepresidente` (el panel presidente lo sobrescribe con `getMe`, `usePanelPresidente.js:39`). Se conservan `presidente_nombre` (tarjeta pública `PresidenteClub.jsx:25`) e `id_presidente` (gate de render de `PresidenteClub.jsx:10` y badge «Presidente» de `SeccionMiembros.jsx:18`, servido por `AuthContext` vía `getClub`). El detalle **no** filtra estatus 3: la misma ruta sirve al panel alumno/presidente, que pueden tener un club inactivo; filtrarla rompería esos flujos (decisión explícita, no un descuido).
- **Frontend:** `clubService.getClubesAdmin` + exposición en `api.js`; `useAdminClubes` (5 llamadas) pasa a `getClubesAdmin`. Otros consumidores públicos (`useClubes`, `PaginaConoceClubs`, `ClubesPopulares`, `SelectorClubNotificacion`) siguen con `getClubes` y no necesitaban los campos retirados.
- **Pruebas nuevas:** `backend/tests/clubesPublico.test.mjs` — **4 pruebas**: SELECT público sin campos de presidente y con filtro de estatus; `/admin` sin token → 401; `/admin` autenticado con SELECT completo; `/:id` sin `presidente_correo`/`id_vicepresidente` y con `presidente_nombre`/`id_presidente`.
- **Ejecutado:** `node --check` de `clubes.js`; `node --test` de `clubesPublico.test.mjs` → **4/4**; ESLint de los 3 archivos frontend modificados; `vite build` OK.
- **Estado:** corregido a nivel de código y pruebas; verificar tras desplegar con `curl -s /api/clubes` (esperado: sin `presidente_nombre` y sin estatus 3) y `curl -s /api/clubes/1` (esperado: sin `presidente_correo` ni `id_vicepresidente`).

---

### 8.11 H10 — validación de URLs de usuario en servidor (corregido)

- **Nuevo `backend/lib/validarUrl.js`:** dos validadores puros:
  - `esUrlMapsValida` (para `ubicacion_maps`, renderizado como `<a href>`): acepta vacío/`null`/`undefined` (campo opcional) o URL con esquema `http:`/`https:`; rechaza `javascript:`, `data:`, `vbscript:`, `ftp:`, valores no string y cadenas de más de 500 caracteres (`VARCHAR(500)` de la columna).
  - `esImagenPortadaValida` (para `imagen_portada`, renderizada en `<img>` de páginas públicas): acepta vacío/`null`, rutas `/uploads/` (almacenamiento local que `src/utils/imagen.js` resuelve contra el backend) o URL `http:`/`https:`; rechaza los mismos esquemas inseguros, rutas ajenas (`//host`, relativas distintas de `/uploads/`) y longitudes > 255 (`VARCHAR(255)`).
- **Aplicación en rutas (400 antes de tocar la base):**
  - `backend/routes/horarios.js`: POST `/club/:idClub` y PUT `/:id` validan `ubicacion_maps` tras las comprobaciones de horario existentes.
  - `backend/routes/clubes.js`: POST `/` y PUT `/:id` (ambos con `requireRole(3)`) validan `imagen_portada` antes del `BEGIN`.
- **Decisión de alcance (portada):** el informe planteaba una allowlist de dominio `cloudinary.com`; se implementó validación de **esquema** + `/uploads/` para no romper el almacenamiento local que el frontend sí soporta (`src/utils/imagen.js:8-10`). Restringir solo a Cloudinary queda como ajuste posterior de una línea si se decide.
- **Pruebas nuevas:** `backend/tests/validarUrl.test.mjs` — **10 pruebas** (4 unitarias del helper + 6 de ruta con pool simulado y JWT ficticio): `javascript:`/`data:`/`vbscript:`/`ftp:`/no-string/longitud rechazados; https, `http:` y `/uploads/` aceptados; PUT de horario con `javascript:` → 400 y con URL https → 200; POST y PUT de club con esquema inseguro → 400 y con URL Cloudinary o `/uploads/` → 201.
- **Hallazgo preexistente descubierto al montar las pruebas (fuera de alcance, NO corregido en la Fase 1):** `requireClubLeader` (`backend/middleware/auth.js:81`) lee `req.params.id || req.params.id_club`, pero las rutas de horarios usan `:idClub` (POST) y `:id` = id del **horario** (PUT/DELETE). Consecuencias: el POST de horarios siempre responde `400 'id_club requerido'`, y en PUT/DELETE la verificación de liderazgo se hace contra el id de club erróneo (el handler vuelve a verificar correctamente después, así que no es un hueco de autorización, sí una puerta que puede rechazar legítimamente o pasar de forma imprecisa). Existe igual en `main`; requiere decisión del usuario. **→ Corregido en la Fase 2 (§8B.6, H16).**
- **Ejecutado:** `node --check` de `horarios.js`, `clubes.js` y `validarUrl.js`; `node --test` de `validarUrl.test.mjs` → **10/10**; suite completa `backend/` → **113/113**.
- **Estado:** corregido a nivel de código y pruebas. La verificación del vector H10(a) «en navegador sin fix» queda pendiente (con el fix ya no es necesaria para la mitigación).

---

## 8B. Fase 2 — H11–H21 (correcciones aplicadas y verificaciones ejecutadas)

Alcance ejecutado en `fix/seguridad-fase1` (sin commits), hallazgo por hallazgo, bajo la autorización de continuar sin confirmación intermedia. Cada ítem indica corrección, archivos y pruebas; **§8B.13** lista los chequeos pendientes antes de desplegar.

### 8B.1 H11 — arranque no destructivo (corregido)
- Bloque `DO $$` con `TRUNCATE horarios_club` retirado de `backend/schema.sql` (queda comentario que apunta a la migración manual); `migrate.js` solo aplica `schema.sql` y **no** ejecuta `migrations/`.
- Nueva `backend/migrations/migrate-horarios-legado-semanal.sql`: uso manual con `psql`, aviso de que **no** es automática, `⚠️ DESTRUCTIVO` con `pg_dump` previo y condición de columna `fecha` → no-op si ya migró.
- **Pruebas:** `tests/schemaArranque.test.mjs` (4): TRUNCATE ausente del arranque (ignorando comentarios), `migrate.js` solo `schema.sql`, advertencias en la migración manual.
- **Pendiente (operativo):** verificar en la BD de Render si la columna `fecha` existe aún.

### 8B.2 H12 — SVG fuera de las subidas nuevas (corregido)
- Evidencia previa: en `src/` solo iconos inline y assets del código; `SubirImagen.jsx` usa `accept="image/*"`; único endpoint `POST /api/upload/imagen`; en backend `svg` solo figuraba en `upload.js` y en la regex de lectura de `diapositivasHero.js` (recursos existentes → se conserva).
- `backend/routes/upload.js`: `'svg'` retirado de `allowed_formats` e `image/svg+xml` del `fileFilter` → rechazo `400` antes de llamar a Cloudinary (sin red).
- **Pruebas:** `tests/uploadSvg.test.mjs` (3).

### 8B.3 H13 — IDs no numéricos → 400 (corregido)
- `backend/lib/validarId.js`: `esIdEntero` (1–15 dígitos, sin ceros a la izquierda) + `validarParamsEnteros(router)` con `router.param` para `id`, `id_club`, `idClub`, `clubId`, `userId`, `idPregunta`.
- Registrado en los **12 routers** que declaran esos parámetros (avisos, clubes, convocatorias, diapositivasHero, encuestas, estadisticas, formularios, inscripciones, noticias, notificaciones, ofertas, usuarios). **Exclusiones a propósito:** `slug` (cadena legítima en encuestas públicas) y `horarios` (lo cubren los middlewares de H16 con sus mensajes).
- `GET /api/estadisticas/padron`: validación explícita de `?id_club` (antes `parseInt` → `NaN` → 500).
- Orden: `router.param` corre antes de los middlewares de la ruta; en estadísticas hay `router.use(authenticate, requireRole(4))` previo → sesión (401) antes que parámetro (400), cubierto por prueba. Documentado en `lib/validarId.js`.
- **Pruebas:** `tests/validarId.test.mjs` (12): unitarias `esIdEntero`, 400 en rutas públicas, numérico válido llega al handler, sesión/padrón, notificaciones POST/DELETE, `slug` intacto, registro estático de los 12 routers y exclusión de horarios.

### 8B.4 H14 — `err.message` fuera de la respuesta (corregido)
- `GET /api/formularios/debug-postulaciones`: catch → `console.error` + `500 'Error interno del servidor'` (ya no devuelve `err.message`).
- Verificado que `eliminarImagenCloudinary.js:64` expone `err.message` solo en un valor interno que sus callers descartan (no llega a respuestas HTTP).
- **Pruebas:** `tests/debugPostulaciones.test.mjs` (2): fallo de BD simulado → genérico sin filtrar detalle; 401 conservado sin token.

### 8B.5 H15 — manejador global de errores (corregido)
- Nuevo `backend/lib/errorHandler.js` (`manejadorErroresGlobal`): log server-side; `headersSent` → `next(err)`; conserva `err.status` 4xx (p. ej. JSON malformado de `express.json` → 400); resto → `500 'Error interno del servidor'`. Registrado en `index.js` después del 404 global.
- **Pruebas:** `tests/errorHandler.test.mjs` (3): 500 genérico sin `err.message`/stack, 4xx preservado, cableado estático en `index.js`.

### 8B.6 H16 — `requireClubLeader` y horarios (corregido)
- `requireClubLeader` acepta `idClub || id_club || id` con validación de entero → `400 'id_club inválido'`.
- Nuevo `requireHorarioLeader` en `PUT/DELETE /api/horarios/:id`: rol ≠ 2/5 → `403`; id de horario inválido → `400`; horario inexistente → `404`; club ajeno → `403`.
- Verificación inline de liderazgo retirada tras **demostrarla en dos pasos** (PASO 1 con inline → PASO 2 sin inline, mismas 13 pruebas verdes); el PUT conserva lookup defensivo de `id_club`.
- **No incorporado (decisión):** reasignación de horarios a coordinación (fase aparte).
- **Pruebas:** `tests/horariosAutorizacion.test.mjs` (13 en cada paso): club propio/ajeno, sin permisos, id inválido, 404.

### 8B.7 H17 — advertencia de seed (documentado)
- Cabecera de `backend/seed.sql` con advertencia H17: solo desarrollo local, **NO** ejecutar en producción ni BD compartida, credencial demo `123456` documentada en el archivo, y que el arranque no lo ejecuta (cubierto por `schemaArranque.test.mjs`).
- **Decisión de alcance:** no se generaron hashes distintos — el riesgo real es ejecutar el seed en un entorno accesible (la contraseña está en texto claro en el propio archivo; hashes distintos no lo mitigan) y no se introdujeron credenciales nuevas.
- **Pendiente (operativo):** verificar que la BD de Render no aplicó el seed.

### 8B.8 H18 — hostname de Cloudinary por partes (corregido)
- `esUrlCloudinary()` exportado de `backend/lib/eliminarImagenCloudinary.js`: `new URL` + protocolo http(s) + `hostname === 'cloudinary.com' || endsWith('.cloudinary.com')` — cierra el patrón de substring que marca CodeQL (`?q=cloudinary.com` en URL ajena → rechazada).
- Fase1: usado por `extraerPublicId` (lib) y `routes/diapositivasHero.js`; `routes/noticias.js` de fase1 ya delegaba en el lib (A2).
- `clubes-unid-hero`: misma edición en la copia **idéntica** del lib y en su `routes/noticias.js` (ediciones idénticas → merge limpio).
- **Pruebas:** `tests/eliminarImagenCloudinary.test.mjs` (+3: hosts legítimos aceptados, rechazos, URL ajena → null). Fase1 **154/154**; hero **12/12**.

### 8B.9 H19 — mensajes propios en la UI (corregido, con decisión de alcance)
- `src/services/api-core.js` (`request()`): red caída (fetch lanza) → mensaje propio + `status 0`; respuesta no-JSON → mensaje propio + `status` + `mensajeServidor` (diagnóstico); `≥500` → mensaje propio; `404` cuyo texto sea el de la ruta global → mensaje propio; resto de 4xx → conserva `data.error` (contrato ya redactado: validaciones, `401 Credenciales inválidas`, permisos, `429` con texto en `lib/rateLimits.js`).
- `backend/index.js`: el 404 global ya no interpola método/ruta en la respuesta (van al `console.warn`).
- **Decisión de alcance:** mapeo **central** en `request()` en vez de por componente (~65 sitios de `set*(err.message)`): mismo efecto para fallos sistémicos sin tocar ~25 archivos y **sin romper** mensajes de contrato (mapear 401 por componente habría roto el `401 Credenciales inválidas` del login). `PaginaEncuesta` (la referencia del informe) no se tocó.
- **Pruebas:** estática en `tests/errorHandler.test.mjs` (404 sin método/ruta + `console.warn`); verificado que ningún consumidor de `src/` matchea los textos viejos; ESLint 0 y `vite build` 0.

### 8B.10 H20 — dependencias de servidor fuera del manifest raíz (corregido)
- `pnpm remove cloudinary multer-storage-cloudinary` → `package.json` + `pnpm-lock.yaml` (−6 paquetes); grep de imports en `src/`: 0; en `server/`: sin uso; backend conserva ambas en `backend/package.json`.
- **Verificación:** ESLint 0, `vite build` 0 (solo warning preexistente de chunk >500 kB).

### 8B.11 H21 — node_modules sincronizado con el lock (corregido localmente)
- `npm ci` en `backend/` → Express **5.3.0** (el lockfile SÍ estaba en sync; `node_modules` estaba stale con Express 4.x) y `cloudinary` presente según `backend/package-lock.json`.
- **Verificación:** suite backend completa **154/154** bajo Express 5 (incluye `router.param` de H13).
- **Pendiente (operativo):** confirmar el install command de Render (que use lockfile).

### 8B.12 Verificaciones de la Fase 2
- Backend fase1 `node --test tests/*.test.mjs` → **154/154** (133 previos + 21 nuevos: H13 ×12, H14 ×2, H15 ×3, H18 ×3, H19 ×1).
- ESLint (raíz) exit 0; `vite build` exit 0.
- `clubes-unid-hero` backend `node --test` → **12/12** (sync H18).
- Sin navegador en este entorno → **sin verificación visual** (pendiente conocido).

### 8B.13 Pendientes y chequeos antes de desplegar (Fase 2)
1. **Render:** `NODE_ENV=production`; install command con lockfile (H21); rotación de credenciales H3; TLS/H4 según §8.7; umbrales de rate limit (§5).
2. **`curl -I` tras desplegar:** cabeceras H5b (Render y Vercel) y 404 global nuevo (sin método/ruta).
3. **BD de Render:** columna `fecha` en `horarios_club` (H11) y si `seed.sql` llegó a aplicarse (H17).
4. **Navegador:** modales (tarea C) y mensajes de error H19 en flujos reales; landing intacta.
5. **Al mergear ramas:** `ModalInicioSesion` (tarea C usa `panelClassName` nuevo), `diapositivasHero.js` (helpers locales en fase1 vs lib en hero → usar lib + conservar `validarParamsEnteros`), `routes/noticias.js` (fase1 ya delega en el lib; hero quedó corregido con `esUrlCloudinary`), `requireClubLeader`/`validarId` solo existen en fase1 → aplicarlos al mergear.

---

## 9. Primeras acciones concretas recomendadas

1. **Rotar y verificar los secretos de H3 en Render** — sigue siendo la acción operativa más crítica; la Fase 1 solo limpió la configuración del escáner (§8.3).
2. ~~Escapar el HTML de H1~~ — **hecho en la Fase 1** (§8.1); falta la verificación en navegador cuando haya servidor de prueba.
3. **Comprobar con `curl -I` las cabeceras reales de Vercel y Render tras desplegar la Fase 1** (H5b) **y definir `NODE_ENV=production` en Render** (para los demás comportamientos condicionados; los rate limits ya no dependen de ella).
4. **Revisar el estado de la BD de Render** (columna `fecha` en `horarios_club`, aplicación de `seed.sql`) para concretar H11/H17.
5. **Confirmar la regla del rol 4 en notificaciones** (§8.2). ~~H2 (revocación JWT)~~, ~~H4 (TLS)~~ y ~~H5a/H8 (rate limiting)~~ — **hechos en la Fase 1** (§8.6, §8.7 y §8.8).
6. **Verificar H4 en el despliegue:** al desplegar la Fase 1, ajustar `DATABASE_URL` en Render según los pasos de §8.7 (quitar `sslmode` de la cadena, reiniciar y ejecutar una consulta inocua con `SELECT 1`); si el proveedor usa CA propia, declarar `DB_SSL_CA_FILE`. Hasta entonces H4 está corregido solo a nivel de código y pruebas locales.
