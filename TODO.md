# Pendientes

Notas de trabajo abierto. Para lo que ya está documentado, ver `MANUAL.md` y `SRS.md`.

---

## 1. Encuesta pública para el alumno

Pantalla más sencilla del módulo y la que da valor primero: el alumno llena la
encuesta y la manda, sin autenticación ni navegación interna.

- [ ] Ruta pública (fuera del layout autenticado)
- [ ] Render de preguntas según su tipo
- [ ] Envío de respuestas

## 2. Dashboard de encuestas (administración)

Tres áreas:

- [ ] **Lista de encuestas** — alta, filtro por estatus
- [ ] **Editor** — preguntas, opciones, orden, requerido/opcional
- [ ] **Resultados** — agregados y gráficas (el proyecto ya usa Recharts)

## 3. Backend del módulo de encuestas

- [ ] `backend/routes/encuestas.js` y registro en `backend/index.js`
- [ ] Lectura de encuesta para render, envío de respuestas
- [ ] Lectura de resultados para el área 2
- [ ] **Endpoint de duplicar** — clona una encuesta con sus preguntas y opciones;
      decide si las respuestas se copian o se descartan

### Estado actual de la capa de datos

Lo único que ya existe son las tablas, y **está sin commitear**:

- `backend/schema.sql` — 5 tablas: `encuestas`, `preguntas`, `opciones_pregunta`,
  `respuestas_encuesta`, `detalle_respuestas` (+149 líneas sin commitear)
- `backend/migrations/migrate-encuestas-down.sql` — sin trackear. Manual, no lo
  ejecuta `migrate.js`. Es destructivo: borra el módulo y todas sus respuestas.

No hay rutas de encuestas en `backend/routes/` ni archivos de encuesta en `src/`.

Antes de arrancar el frontend conviene commitear el esquema, porque los puntos 1 y 2
dependen de que esas tablas existan en la base.

---

## Deuda técnica

- [ ] **JWT en el query string** — `SeccionConvocatorias.jsx:59` manda el token
      como `?token=`, queda en historial, `Referer` y logs del servidor.
      Migrar a header o cookie.
- [x] **Docs actualizadas tras el refactor de variables de entorno** —
      `MANUAL.md` (tabla de variables, sección 3), `SRS.md:387-390` (filas de
      restricciones de diseño) y `SRS.md:439` (etiqueta del diagrama).
