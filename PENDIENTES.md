# Pendientes

Única lista de trabajo abierto del repositorio. Para lo ya documentado, ver
`MANUAL.md` y `SRS.md`.

Ordenado por severidad. Cada ítem dice **qué** falla, **dónde**, **por qué
importa** y **cómo se comprueba** que quedó cerrado.

---

## 1. Bloqueantes

### 1.1 El alta de postulaciones está rota: el formulario manda `carrera` y el backend pide `id_licenciatura`

`formularios.carrera` dejó de ser un `VARCHAR(100)` libre para ser una FK al
catálogo, pero el frontend nunca se actualizó. `POST /api/formularios` valida
`id_licenciatura` como entero positivo y lo contrasta contra `cat_licenciaturas`
(`backend/routes/formularios.js:134-150`); el formulario manda `carrera`, así que
la validación de "todos los campos obligatorios" salta y **nadie puede
postular a un club** hasta que se arregle.

| Dónde | Qué hay |
|-------|---------|
| `src/components/formularios/inscripcion/FormularioInscripcion.jsx:21` | el estado inicial declara `carrera: ''` |
| `src/components/formularios/inscripcion/FormularioInscripcion.jsx:140` | `<CampoSelect name="carrera" ... opciones={CARRERAS}>` |
| `src/constants/inscripcion.js:1-9` | `CARRERAS`, lista de 7 textos hardcodeados |
| `src/constants/inscripcion.js:14` | `ETIQUETAS.carrera: 'Carrera'` |
| `src/utils/inscripcion.js:11` | valida `formulario.carrera` |

**Cómo se arregla:** `CampoSelect` ya acepta objetos `{ value, label }`, y
`useLicenciaturas()` ya expone el catálogo público (`id_licenciatura`, `nombre`),
así que no hace falta tocar componentes nuevos: se cambia `name`, se alimenta el
`select` con `licenciaturas.map(l => ({ value: l.id_licenciatura, label: l.nombre }))`
y se borra `CARRERAS`. La etiqueta debería decir "Licenciatura": el catálogo se
llama así y la palabra "carrera" ya no corresponde a lo que se guarda.

**Lo que NO hay que romper:** todos los SELECT del backend hacen
`LEFT JOIN cat_licenciaturas` con `'l.nombre AS carrera'` (`formularios.js:31,79,299,339,372`),
así que el JSON conserva la clave `carrera`. Quien la lista para *mostrarla*
(`SeccionPadron.jsx:81`, `TarjetaSolicitud.jsx:43`, `HistorialPostulaciones.jsx:80`,
`AlumnoSeleccionCard.jsx:34`, `SeccionAsistencia.jsx:70`) sigue funcionando sin
cambios. Solo cambia lo que se **escribe**.

**Cómo se comprueba:** con el backend arriba, un alumno completa el formulario y
`POST /api/formularios` responde 201 y no 400.

**Migración de base con datos.** Una vez, sobre una base que ya tenga filas:

```sql
DELETE FROM formularios;
```

y volver a correr `backend/seed.sql`. Las filas viejas guardan abreviaturas
(`Lic. en Contaduría Pública`, `Ing. en Sistemas Computacionales`) y al menos
una —`Ing. en Mecatrónica`— no tiene programa en el catálogo, así que no se pueden
mapear sin adivinar, y adivinar asignaría la carrera equivocada a un alumno. Son
datos de prueba, por eso se descartan en vez de migrarse.

---

## 2. PBI-10: módulo de encuestas incompleto

Lo que ya está hecho y **no** hay que rehacer: el esquema de 5 tablas, el
`GET/POST /api/encuestas/publico/:slug`, la pantalla `/encuesta/:slug`, el
catálogo `/api/catalogos/licenciaturas`, el servicio frontend y el slug. Todo eso
está commiteado; su límite real es que nunca se ha corrido contra una base de
datos (ver sección 4).

### 2.1 No hay interfaz de administración: el módulo no se puede usar

La capa de servicio expone 9 métodos admin y **ningún componente los consume**.

| Método | Ruta |
|--------|------|
| `listar` | `GET /encuestas/admin` |
| `obtener` | `GET /encuestas/admin/:id` |
| `crear` | `POST /encuestas/admin` |
| `actualizar` | `PUT /encuestas/admin/:id` |
| `eliminar` | `DELETE /encuestas/admin/:id` |
| `crearPregunta` | `POST /encuestas/admin/:id/preguntas` |
| `actualizarPregunta` | `PUT /encuestas/admin/preguntas/:idPregunta` |
| `eliminarPregunta` | `DELETE /encuestas/admin/preguntas/:idPregunta` |
| `actualizarOpciones` | `PUT /encuestas/admin/preguntas/:idPregunta/opciones` |

Están en `src/services/encuesta.service.js:19-43`. En el otro extremo,
`src/pages/PanelAdmin.jsx:63-68` solo monta usuarios, clubes, anuncios y
diapositivas; `src/components/admin/` no tiene sección de encuestas. Hoy no hay
forma de crear una encuesta desde el panel: el enlace solo se consigue por API o
con el `seed.sql`.

Faltan las tres áreas: lista con filtro por estatus, editor de preguntas y
opciones, y pantalla de resultados.

**Cómo se comprueba:** entrar como admin, crear una encuesta con preguntas desde
la interfaz, copiar el enlace y responderlo en ventana incógnita.

### 2.2 No existe endpoint de resultados

Sin fuente de datos para el área de resultados. `recharts` ya está declarado en
`package.json` y no hay nada que graficar. Hay que decidir la forma de los
agregados: distribución por opción, promedio de escala, y cómo se agrupan los
tipos de texto libre (que no se pueden graficar sin leerlos).

### 2.3 No existe endpoint de duplicar

Clona encuesta con sus preguntas y opciones. Falta decidir si las respuestas se
copian o se descartan; para el uso real (repetir una encuesta de un semestre)
lo razonable es descartar, porque arrastrar respuestas falsearía los agregados.

### 2.4 No existe endpoint de reordenar, aunque el esquema ya lo permite

`schema.sql:542` declara `uq_pregunta_orden UNIQUE (id_encuesta, orden)
DEFERRABLE INITIALLY DEFERRED`, con el comentario de que es "para permitir
reordenar preguntas dentro de una transacción". La restricción está pensada para
el caso de uso pero **la ruta nunca se escribió**: no existe `/orden` ni
`reordenar` en `backend/routes/encuestas.js`, y `PUT /admin/:id` (que actualiza
la encuesta) no toca el orden de sus preguntas. Lo mismo con las opciones de una
pregunta (`uq_opcion_orden`, `schema.sql:572`).

### 2.5 El endpoint de invalidar caché es inalcanzable

`POST /api/catalogos/licenciaturas/cache` existe (`catalogos.js:47`, rol 3) pero
`catalogoService` solo expone `getLicenciaturas` (`encuesta.service.js:48`).
Nadie lo puede llamar. Nota: `useLicenciaturas()` ya trae un `invalidar()`
local (`src/hooks/useLicenciaturas.js:83`) que descarta el caché del módulo, así
que falta el método de servicio que pegue al backend.

### 2.6 Entrega 2 del módulo, sin empezar

`numero`, `ranking` y escalas Likert no están en el esquema ni en la API. El
esquema actual cubre 5 tipos (`opcion_unica`, `opcion_multiple`, `texto_corto`,
`texto_largo`, `escala`).

---

## 3. Documentación del módulo

### 3.1 El SRS no tiene requisitos del módulo de encuestas

El SRS documenta `RF-01` a `RF-14` (`SRS.md:97-326`) y **ninguno es de
encuestas**. Tampoco hay filas en la tabla de trazabilidad
(`SRS.md:486-509`) ni criterios de aceptación en Gherkin. Solo se actualizó el
alcance, en `SRS.md:22` y `SRS.md:24`.

**Cómo se cierra:** añadir los RF que correspondan al módulo entregado, con los
mismos campos `Prioridad`, `Trazabilidad` y Gherkin que el resto, más sus filas en
la tabla de trazabilidad.

---

## 4. Verificación pendiente

Nada del módulo de encuestas se ha probado contra PostgreSQL: la conexión local
falla con `FATAL: la autenticación password falló para el usuario "postgres"` y no
hay credenciales disponibles. El único control ejecutado es `npx eslint backend
src` (exit 0), que no toca SQL ni contratos.

**Pendientes de verificación concreta:**

- [ ] Levantar el esquema y el `seed.sql` contra una base real.
- [ ] Responder la encuesta demo `/encuesta/demo-intereses-clubes` (5 tipos, una
      pregunta oculta) desde el navegador. El slug es fijo y legible a propósito,
      para tener un enlace estable de prueba.
- [ ] Comprobar los 409 al borrar encuesta o pregunta que ya tienen respuestas.
- [ ] Comprobar el 429 del límite de 5 envíos por hora, que hoy solo aplica con
      `NODE_ENV=production` (`encuestas.js:55`).

**No se siembran respuestas** a propósito: son anónimas, así que un set de ejemplo
no tendría a quién pertenecer y las gráficas del panel se verían igual de reales
que las de verdad. Para ver resultados hay que responder la encuesta unas cuantas
veces desde el navegador.

### 4.1 Faltan dependencias en `node_modules`

`@dnd-kit/core`, `@dnd-kit/utilities`, `cloudinary`, `leaflet`,
`multer-storage-cloudinary`, `react-leaflet` y `recharts` están declaradas en
`package.json` pero no instaladas, así que `vite build` falla. No es un problema
del código: `pnpm install` lo resuelve. Bloquea cualquier verificación del
frontend, incluida la del punto 1.1.

---

## Deuda técnica

Ajena a PBI-10. Se registra aquí para que no se pierda.

- [ ] **JWT en el query string** — `SeccionConvocatorias.jsx:59` manda el token
      como `?token=`, queda en historial, `Referer` y logs del servidor.
      Migrar a header o cookie.
- [ ] **RLS no protege el módulo de encuestas** — las 5 tablas tienen
      `ENABLE ROW LEVEL SECURITY` sin políticas, pero `db.js` conecta como
      propietario y los propietarios saltan RLS salvo con
      `FORCE ROW LEVEL SECURITY`, que no se usa (`schema.sql:660`). La barrera
      real es que cada ruta de admin aplique `authenticate` + `requireRole`. Un
      endpoint nuevo que olvide esa línea queda abierto y nada en la base lo
      detecta.
- [ ] **Sin tests** — el repositorio no tiene ningún archivo de prueba ni script
      `test` en `package.json`. Por eso lo único que se puede afirmar del módulo
      es que pasa el linter.
- [ ] **Límite de envíos en memoria** — el contador de 5/hora es el `Map` de
      `express-rate-limit` (`encuestas.js:46-61`), en memoria del proceso. Con más
      de una instancia cada una lleva su cuenta, y un reinicio lo borra. En
      producción es una protección disuasoria, no un límite firme.
      `trust proxy = 1` sí está (`backend/index.js:34`), que es lo que hace que
      `req.ip` resuelva bien detrás del proxy, pero conviene confirmarlo con un
      429 real.
