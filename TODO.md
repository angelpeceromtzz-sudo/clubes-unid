# Pendientes

Notas de trabajo abierto. Para lo que ya está documentado, ver `MANUAL.md` y `SRS.md`.

---

## 1. Encuesta pública para el alumno

Pantalla más sencilla del módulo y la que da valor primero: el alumno llena la
encuesta y la manda, sin autenticación ni navegación interna.

- [x] Ruta pública (fuera del layout autenticado)
- [x] Render de preguntas según su tipo
- [x] Envío de respuestas

## 2. Dashboard de encuestas (administración)

Tres áreas:

- [ ] **Lista de encuestas** — alta, filtro por estatus
- [ ] **Editor** — preguntas, opciones, orden, requerido/opcional
- [ ] **Resultados** — agregados y gráficas (el proyecto ya usa Recharts)

Las **rutas de API** de esta sección ya están escritas (ver sección 3), pero
**sin verificar contra una base de datos**: el PostgreSQL local no abre con las
credenciales disponibles, así que el módulo está verificado solo por lint. Falta
la interfaz que las consuma: hoy no hay forma de crear una encuesta desde el
panel, así que el flujo no es utilizable todavía.

## 3. Backend del módulo de encuestas

- [x] `backend/routes/encuestas.js` y registro en `backend/index.js`
- [x] Lectura de encuesta para render, envío de respuestas
- [ ] Lectura de resultados para el área 2
- [ ] **Endpoint de duplicar** — clona una encuesta con sus preguntas y opciones;
      decide si las respuestas se copian o se descartan
- [ ] `POST /api/catalogos/licenciaturas/cache` está implementado en
      `catalogos.js`, pero sin interfaz que lo dispare

### Estado actual de la capa de datos

Ya está commiteado y desplegado:

- `backend/schema.sql` — 5 tablas: `encuestas`, `preguntas`, `opciones_pregunta`,
  `respuestas_encuesta`, `detalle_respuestas`, más `cat_licenciaturas`
- `backend/migrations/migrate-encuestas-down.sql` y
  `migrate-licenciaturas-down.sql` — bajas manuales. `migrate.js` **no** los
  ejecuta. Son destructivos: borran el módulo y sus respuestas.

### Migración de carrera a id_licenciatura

`formularios.carrera` pasó de `VARCHAR(100)` libre a `id_licenciatura` con FK
al catálogo. En una base con datos **hay que correr una vez**:

```sql
DELETE FROM formularios;
```

y volver a correr `backend/seed.sql`. Las filas viejas guardan abreviaturas
(`Lic. en Contaduría Pública`, `Ing. en Sistemas Computacionales`) y al menos
una —`Ing. en Mecatrónica`— no tiene programa en el catálogo, así que no se
pueden mapear sin adivinar, y adivinar asignaría la carrera equivocada a un
alumno. Son datos de prueba, por eso se descartan en vez de migrarse.

### Prueba local

Con `seed.sql` corrido hay una encuesta demo publicada en
`/encuesta/demo-intereses-clubes`, con los 5 tipos y una pregunta oculta. El slug
es fijo y legible a propósito, para tener un enlace estable de prueba.

**No se siembran respuestas** a propósito: son anónimas, así que un set de
respuestas de ejemplo no tendría a quién pertenecer y las gráficas del panel se
verían igual de reales que las de verdad. Para ver resultados, hay que responder
la encuesta desde el navegador unas cuantas veces.

---

## 4. Inscripción a clubes: el formulario sigue mandando `carrera` como texto

**Rompe el alta de postulaciones.** El backend ya espera `id_licenciatura` y
valida contra `cat_licenciaturas`, así que el `POST /api/formularios` devuelve 400
mientras esto no se actualice.

- [ ] `src/components/formularios/inscripcion/FormularioInscripcion.jsx:140` —
      `CampoSelect name="carrera"` con el `CARRERAS` hardcodeado de
      `src/constants/inscripcion.js`. Cambiar a `id_licenciatura`, alimentado por
      `useLicenciaturas()`, y renombrar la etiqueta a "Licenciatura"
- [ ] `src/utils/inscripcion.js:11` — valida `formulario.carrera`; validar
      `id_licenciatura`
- [ ] Borrar `CARRERAS` de `src/constants/inscripcion.js`

Quien ya lo liste para *mostrar* la carrera sigue funcionando sin cambios: los
SELECT hacen `LEFT JOIN cat_licenciaturas` con `'l.nombre AS carrera'`, así que el
JSON conserva la misma forma.

## Deuda técnica

- [ ] **JWT en el query string** — `SeccionConvocatorias.jsx:59` manda el token
      como `?token=`, queda en historial, `Referer` y logs del servidor.
      Migrar a header o cookie.
- [x] **Docs actualizadas tras el refactor de variables de entorno** —
      `MANUAL.md` (tabla de variables, sección 3), `SRS.md:387-390` (filas de
      restricciones de diseño) y `SRS.md:439` (etiqueta del diagrama).
- [ ] **Faltan dependencias en `node_modules`** — `@dnd-kit/core`,
      `@dnd-kit/utilities`, `cloudinary`, `leaflet`, `multer-storage-cloudinary`,
      `react-leaflet` y `recharts` están declaradas en `package.json` pero no
      instaladas, así que `vite build` falla. No es un problema del código: un
      `pnpm install` lo resuelve.
- [ ] **RLS no protege el módulo de encuestas** — las 5 tablas tienen
      `ENABLE ROW LEVEL SECURITY` sin políticas, pero `db.js` conecta como
      propietario y los propietarios saltan RLS salvo con
      `FORCE ROW LEVEL SECURITY`, que no se usa. La barrera real es que cada ruta
      de admin aplique `authenticate` + `requireRole`. Un endpoint nuevo que
      olvide esa línea queda abierto y nada en la base lo detecta.
