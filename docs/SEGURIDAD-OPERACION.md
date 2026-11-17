# Seguridad — checklist operativa (T-034)

Documento para el equipo de infraestructura. Las tareas de código ya están en el
repositorio; aquí se listan las verificaciones y acciones que requieren acceso
a los servicios desplegados.

## Secretos (H3)

- [ ] En Render, verificar si `JWT_SECRET` y `ADMIN_SECRET` vigentes coinciden con
      los valores históricos del repositorio. Si coinciden o hay duda, **rotar**
      (generar valor nuevo con
      `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
      actualizar la variable en Render, reiniciar).
- [ ] Verificar la contraseña del usuario administrativo (`admin@unid.mx`) y
      cambiarla si se sospecha reutilización.
- [ ] Rotar `DB_PASSWORD`/`DATABASE_URL` y credenciales de Cloudinary si se
      considera que estuvieron expuestas.
- [ ] Confirmar que ningún valor real está en `.env` versionado (`git ls-files`).

## Entorno (H8, H4)

- [ ] Declarar `NODE_ENV=production` en Render.
- [ ] Confirmar que el install command del servicio usa el lockfile
      (`npm ci` o `pnpm install --frozen-lockfile`), no `npm install` sin fijar.
- [ ] Ajustar `DATABASE_URL` quitando `sslmode`/`ssl*` (el backend rechaza
      arrancar con esos parámetros). Reiniciar y ejecutar una consulta inocua
      (`SELECT 1`) para verificar H4. Si el proveedor usa CA propia, declarar
      `DB_SSL_CA_FILE` o `DB_SSL_CA_PEM`.

## Cabeceras (H5b)

- [ ] Tras desplegar, verificar con `curl -I https://<backend>/api/health` y
      `curl -I https://<frontend>/` que aparecen `X-Frame-Options`, `Strict-Transport-Security`,
      `Content-Security-Policy` (backend) y `Content-Security-Policy-Report-Only`
      (frontend).
- [ ] Revisar la consola del navegador en los flujos reales (login MSAL, subida
      de imagen, paneles) para detectar violaciones de CSP antes de forzarla.

## Base de datos (H11, H17)

- [ ] Verificar si la columna `fecha` existe en `horarios_club` de la BD de Render.
      Si existe con datos, ejecutar manualmente
      `backend/migrations/migrate-horarios-legado-semanal.sql` con `pg_dump` previo.
- [ ] Verificar que `seed.sql` no se aplicó en la BD de Render.

## Rate limiting

- [ ] Confirmar que el servicio es de instancia única (si hay varias, el límite
      efectivo se multiplica; evaluar Redis).
- [ ] Ajustar umbrales `RATE_LIMIT_*` tras medir uso real.

## Rotación de JWT

- [ ] Tras rotar `JWT_SECRET`, verificar que un token firmado con el secreto
      histórico es rechazado (`401` en `/api/usuarios`).
- [ ] Confirmar que Gitleaks sigue detectando cadenas de prueba en una rama temporal.

## Verificación en navegador

- [ ] H1: abrir la lista de asistencia con nombres con `<script>` y confirmar
      que se muestran literales.
- [ ] H10(a): confirmar que `javascript:` en `ubicacion_maps` ya no se puede guardar (400).
- [ ] Clickjacking: intentar embeber el panel en un `<iframe>` y confirmar bloqueo.
