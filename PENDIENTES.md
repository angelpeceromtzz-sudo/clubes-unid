# Pendientes

Única lista de trabajo abierto del repositorio. Para lo ya documentado, ver
`MANUAL.md` y `SRS.md`.

Ordenado por severidad. Cada ítem dice **qué** falla, **dónde**, **por qué
importa** y **cómo se comprueba** que quedó cerrado.

---

## 1. Bloqueantes

### 1.1 Cerrado: el alta de postulaciones manda `id_licenciatura`

`formularios.carrera` dejó de ser un `VARCHAR(100)` libre para ser una FK al
catálogo, pero el frontend nunca se actualizó, así que `POST /api/formularios`
respondía 400 y **nadie podía postular a un club**. Corregido el 30/09/2026.

| Dónde | Cambio |
|-------|--------|
| `FormularioInscripcion.jsx` | el campo es `id_licenciatura`, alimentado con `useLicenciaturas()`; el payload lo manda como `Number`, igual que `cuatrimestre` |
| `FormularioInscripcion.jsx` | si el catálogo no carga, el `<select>` queda deshabilitado y sale una `Alerta` con botón de reintento, en vez de un "selecciona una carrera" que no se puede cumplir |
| `constants/inscripcion.js` | borrada `CARRERAS` (7 textos hardcodeados); `ETIQUETAS.carrera` → `id_licenciatura: 'Licenciatura'` |
| `utils/inscripcion.js:11` | valida `formulario.id_licenciatura` |
| `PasoConfirmacionInscripcion.jsx` | el resumen muestra el nombre oficial del programa, no el id |
| `CampoSelect.jsx` | acepta `disabled`, opcional |

No se tocó lo que **lee**: los SELECT del backend siguen devolviendo la clave
`carrera` (`LEFT JOIN cat_licenciaturas ... 'l.nombre AS carrera'`), así que
padrón, solicitudes, historial y asistencia no cambian.

**Verificado contra la base real**, no sólo con el linter:

- `POST /api/formularios` con `id_licenciatura: 3` → **201** y la fila guarda el id.
- `GET /api/formularios/mis-postulaciones` → `carrera: "Licenciatura en Arquitectura"`.
- `id_licenciatura: 999` → 400 "La licenciatura seleccionada no existe".
- Sin el campo → 400 "Todos los campos obligatorios deben estar llenos".
- `npx eslint .` y `npx vite build` en verde.

**Base de datos.** Se aplicó `backend/schema.sql` sobre `clubs_bd`, se borraron
las filas viejas de `formularios` y se volvió a correr `backend/seed.sql`. Las
filas viejas guardan abreviaturas (`Lic. en Contaduría Pública`) y al menos una
(`Ing. en Mecatrónica`) no tiene programa en el catálogo, así que no se pueden
mapear sin adivinar. Son datos de prueba: se descartaron en vez de migrarse.
La base quedó con 10 clubes, 10 usuarios, 10 licenciaturas, 5 formularios y la
encuesta `demo-intereses-clubes` con sus 5 preguntas y 8 opciones.

Tres cosas que salieron en el camino y quedaron corregidas:

- `schema.sql` no es idempotente para `clubes.participacion`: la columna sólo
  existe en el `CREATE TABLE IF NOT EXISTS`, así que en una base creada antes
  nunca se agrega y el `seed.sql` muere con "no existe la columna participacion
  en la relación clubes". No afecta a una base nueva, pero rompe cualquier
  máquina que ya tuviera el esquema viejo. **Falta el `ALTER TABLE clubes ADD
  COLUMN IF NOT EXISTS participacion ...` en `schema.sql`**; aquí se aplicó a
  mano y luego se reconstruyó la base desde cero.
- `formularios.turno` (NOT NULL) quedaba de un esquema anterior y `schema.sql` ya
  no lo declara, pero tampoco lo dropea: el seed moría con "el valor nulo en la
  columna turno". Agregado el `ALTER TABLE formularios DROP COLUMN IF EXISTS turno`.
- `seed.sql` traía 10 caracteres corruptos (U+FFFD), incluido el literal
  `'En revisión'`, que viola `chk_status` y hacía fallar el seed entero.
  Corregidos.

---

## 2. PBI-10: módulo de encuestas

2.1 a 2.5 cerrados. El detalle de qué se hizo y por qué está en
[`PB-10.md`](PB-10.md). 2.6 sigue abierto y es lo único del alcance que falta.

Lo que ya estaba hecho y **no** hay que rehacer: el esquema de 5 tablas, el
`GET/POST /api/encuestas/publico/:slug`, la pantalla `/encuesta/:slug`, el
catálogo `/api/catalogos/licenciaturas`, el servicio frontend y el slug. Todo eso
está commiteado y el esquema ya está aplicado en `clubs_bd` con la encuesta demo
sembrada.

**Lo que sí queda es verificarlo desde el navegador** (sección 4). El código pasa
el linter y el build, pero la parte de React de la sección de encuestas sólo se
comprobó por lectura.

### 2.1 Cerrado: ya hay interfaz de administración

`src/components/admin/seccion-encuestas/` con lista, editor y resultados. El
estado vive en `useSeccionEncuestas`; `PanelAdmin` monta la sección y
`navegacion.js` tiene su entrada. Los 13 métodos admin del servicio ya tienen
consumidor.

Dos arreglos que hizo falta en el camino, porque sin ellos el editor no
funcionaba aunque el código pareciera correcto:

- `Icono.jsx` no tenía `chevron-up`, que usan los botones de reordenar. El SVG
  salía vacío.
- `CampoSelect` no aceptaba `disabled`, y el editor se lo pasa en el `<select>`
  de estado y fechas. La prop se ignoraba en silencio.

**Cómo se comprueba:** sigue pendiente. Está en la sección 4.

### 2.2 Cerrado: `GET /encuestas/admin/:id/resultados`

Roles 3 y 4. Devuelve totales, respondentes por día, por licenciatura y
`sin_licenciatura`, más un resultado por pregunta **incluidas las ocultas**:
ocultarlas es una decisión de publicación, no un borrado, y sus respuestas
existen.

Decisiones que hubo que tomar y que conviene no volver a abrir sin motivo:

- Opción múltiple usa como base los respondientes, no el número de
  selecciones. Si no, un alumno que marca tres opciones hace que la suma dé
  300%.
- Escala conserva los valores tal cual llegaron. Si se estrecha el rango
  después de recibir respuestas, los valores fuera de rango se conservan y
  salen como `fuera_de_rango`; al promediar sólo el subconjunto válido el
  resultado mentía.
- Textos libres se recortan a 200 por pregunta, con el total real y cuántos se
  truncaron, para no fingir que se leyeron todos.

`LIMIT 200` por pregunta para que un texto libre de 5 000 respuestas no arrastre
la tabla entera en memoria.

En el panel se usan barras horizontales propias y no `recharts`, porque el kit
visual del panel ya trae sus clases de tema y `recharts` no las conoce.

### 2.3 Cerrado: `POST /encuestas/admin/:id/duplicar`

Copia encuesta, preguntas y opciones en una transacción. **Las respuestas no se
copian** y no es una omisión: el uso real es repetir la encuesta de un semestre
al siguiente, y arrastrar las respuestas viejas haría que los agregados de la
copia sumaran dos poblaciones. La copia nace en `borrador` y sin fechas.

Se copian también las preguntas ocultas: la copia es la misma encuesta, no una
versión recortada.

### 2.4 Cerrado: reordenar preguntas y opciones

`PUT /encuestas/admin/:id/preguntas/orden` recibe el arreglo completo de ids en
el orden deseado, no un desplazamiento, y valida que el conjunto sea el mismo
que el de la base. Un solo `UPDATE` con un `CASE` por id resuelve el intercambio
entero bajo `uq_pregunta_orden`, que es `DEFERRABLE INITIALLY DEFERRED`: por eso
el BEGIN/COMMIT es obligatorio y no decorativo.

`PUT /encuestas/admin/preguntas/:idPregunta/opciones/orden` **no estaba en este
pendiente** y salió al implementarlo. La única vía previa para cambiar el orden
de las opciones era el endpoint que reemplaza la lista entera, que borra y
recrea las opciones con ids nuevos, y eso choca con `fk_detalle_opcion`
(`ON DELETE RESTRICT`): en cuanto la pregunta tenía una respuesta, el
reordenamiento se rechazaba con 409. Es decir, funcionaba sólo en encuestas
nuevas, justo donde no importa. El endpoint nuevo sólo mueve la columna `orden`
y no cambia ningún `id_opcion`, así que no necesita migración.

En el panel el reordenamiento es con botones ↑/↓ y no con `@dnd-kit`: las
dependencias están instaladas pero no se usan. Los botones funcionan con teclado
y en móvil, y no hay que explicar un gesto de arrastre.

Corregido de paso: el endpoint de preguntas pasaba `req.params.id` a la base sin
validar, así que un id no numérico daba 500 en vez de 400.

### 2.5 Cerrado: la invalidación de caché ya es alcanzable

`catalogoService.invalidarLicenciaturas()` y `invalidarRemoto()` en
`useLicenciaturas()`, que descarta el caché local y avisa al backend.

**Sin consumidor todavía**, y es lo correcto: no hay un CRUD de catálogo de
licenciaturas en el panel, así que no hay ninguna acción de usuario que lo
dispare. La ruta es alcanzable y el método existe para cuando lo haya.

### 2.6 Entrega 2 del módulo, sin empezar

`numero`, `ranking` y escalas Likert no están en el esquema ni en la API. El
esquema actual cubre 6 tipos (`opcion_unica`, `opcion_multiple`, `texto_corto`,
`texto_largo`, `escala`, `licenciatura`). Fuera del alcance acordado.

`licenciatura` no es un tipo más: es el que hace de la pregunta de programa, que
antes era un bloque fijo al final del formulario público. Ahora se crea desde el
editor como cualquier otra, así que el admin decide si la pone, dónde y si
obliga. Su respuesta se sigue guardando en
`respuestas_encuesta.id_licenciatura` y **no** en `detalle_respuestas`, porque
`chk_detalle_valor` no tiene dónde meter un id de catálogo. Lo que garantiza que
no haya dos en la misma encuesta es el índice parcial único
`uq_pregunta_licenciatura`.

---

## 3. Documentación del módulo

El detalle de lo implementado está en [`PB-10.md`](PB-10.md).

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

**Corrección 30/09/2026.** La afirmación de que "no hay credenciales disponibles"
era falsa: `backend/.env` tiene las que hacen falta y la conexión a `clubs_bd`
funciona. Lo que pasa es que **el esquema nunca se había aplicado**: la base
tenía 18 tablas y ninguna de las de encuestas, y `formularios.carrera` seguía
siendo `character varying`. Al correr `schema.sql` + `seed.sql` (ver 1.1) todo
eso queda arreglado, así que la base ya está disponible para probar.

Lo que **sí** se ha verificado contra PostgreSQL:

- [x] Esquema y `seed.sql` aplicados sobre `clubs_bd` (10 clubes, 10 usuarios,
      10 licenciaturas, 5 formularios, encuesta demo con 5 preguntas).
- [x] `POST /api/formularios` y `GET /api/formularios/mis-postulaciones`
      (detalle en 1.1).
- [x] `GET /api/encuestas/publico/demo-intereses-clubes`: devuelve 4 de las 5
      preguntas; la oculta (`es_visible = false`) no viene.
- [x] Los 5 tipos de pregunta se enviaron por la API y se aceptaron.
- [x] `GET /encuestas/admin/1/resultados`: 6 respuestas, una sin licenciatura,
      promedios y distribuciones que coinciden con el cálculo manual. También
      sus 401, 400 y 404.
- [x] `PUT /encuestas/admin/1/preguntas/orden` sobre una encuesta que ya tiene
      respuestas, más sus 400.
- [x] `POST /api/catalogos/licenciaturas/cache`: 401 sin token, 200 con admin.

### 4.0 Bugs que bloqueaban todo lo anterior

Ninguno estaba en este archivo y los dos impedían verificar el módulo:

- **El GET y el POST públicos devolvían 500.** `comprobarVigencia()` devolvía
  `null` en vez de un objeto cuando la encuesta **sí** estaba vigente, y los dos
  callers hacían `vigencia.error`. Como `null.error` es `TypeError`, la encuesta
  pública no se podía abrir.
- **Ninguna pregunta de opción se podía responder.** `cargarDefiniciones()` no
  seleccionaba `o.id_pregunta`, así que todos los `Set` de opciones salían
  vacíos y la comprobación `ids.length > opciones.size` comparaba contra 0
  ("Demasiadas opciones seleccionadas" en cualquier pregunta de opción).

Ninguno de los dos lo detecta el linter. Salieron al probar contra la base real.

### 4.1 Lo que falta verificar

- [ ] Recorrer el flujo completo desde el panel: crear encuesta con los 5 tipos,
      copiar el enlace, responder en incógnito, ver resultados. **El código
      compila y pasa el linter, pero la parte de React sólo se comprobó por
      lectura.**
- [ ] Probar `duplicar` y `opciones/orden` en ejecución. Se escribieron al final
      de la sesión y el backend quedó arrancado con el código anterior: hay que
      reiniciarlo. `preguntas/orden` sí está probado.
- [ ] Reordenar opciones en una pregunta **que ya tiene respuestas**. Es el caso
      que motivó el endpoint de §2.4 y el que el reemplazo total no cubría.
- [ ] Comprobar los 409 al borrar encuesta o pregunta que ya tienen respuestas.
- [ ] Comprobar el 429 del límite de 5 envíos por hora, que hoy solo aplica con
      `NODE_ENV=production` (`encuestas.js:55`).

**Las 6 respuestas de la encuesta demo se enviaron por la API** para poder
verificar los agregados, y siguen ahí a propósito: son lo que permite ver el
panel con datos de verdad. No borrarlas sin avisar.

### 4.1 Dependencias: resueltas

Las siete dependencias que faltaban (`@dnd-kit/core`, `@dnd-kit/utilities`,
`cloudinary`, `leaflet`, `multer-storage-cloudinary`, `react-leaflet`, `recharts`)
ya están instaladas y `vite build` pasa. Dos cosas que aparecieron al hacerlo:

- `backend/node_modules` tampoco existía, así que el backend no arrancaba sin
  `npm install` dentro de `backend/`. Al hacerlo, `package-lock.json` se
  desincronizó de `package.json` (`cloudinary` y `multer-storage-cloudinary`
  faltaban en el lock) y quedó corregido.
- `seed.sql` **no era idempotente**: el `INSERT INTO clubes` terminaba en un
  `ON CONFLICT DO NOTHING` sin destino que no frenaba nada, porque
  `clubes.nombre_club` no es UNIQUE. Cada corrida duplicaba los 10 clubes (a la
  tercera había 50). Corregido con un `WHERE NOT EXISTS` sobre el nombre; lo
  mismo en `avisos_clubes`, que también repetía avisos.

### 4.2 El `seed.sql` depende de ids fijos de club

`clubes_niveles` inserta con ids literales (`(1, 1), (1, 2), ...`) y el bloque de
`formularios` usa `id_club = 1` explícito, contando con que el primero sea
"Equipo de Voleibol". Funciona en una base recién creada, pero en cuanto una fila
se borra o se reordena, los niveles y los formularios de prueba se cuelgan del
club equivocado. Deberían resolverse por nombre, como ya se hace con las
licenciaturas (`seed.sql:143`).

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

---

## 5. Contexto: acceso a la base de datos desde desarrollo

### 5.1 Un compañero escribió en producción sin contraseña

Un compañero del equipo levantó el backend en su máquina, creó un usuario desde
la interfaz, y esa fila apareció en la base de datos de producción en Supabase. No
hubo hack ni bypass de autenticación: el diseño permitió el acceso exactamente como
está documentado.

**La cadena.** `backend/.env` (o el panel de Render) trae la cadena de conexión en
`DATABASE_URL`. Cuando ese backend local arranca, `db.js:11` la usa tal cual y
`pool` se conecta directo a producción. Desde ahí, cualquier escritura de la app —
crear usuario, mover un estatus, generar convocatorias— va a la base real. No queda
rastro en la API porque nunca hubo una petición externa: el proceso local escribió
directo.

**Por qué la analogía del "mesero y la cocina" no alcanza.** Esa descripción es
correcta en lo arquitectónico: el navegador nunca habla con la base, y nadie necesita
la contraseña para trabajar en la interfaz. Lo que no dice es *de dónde salió la
llave*. No es un permiso abstracto del sistema — es una línea de texto en un `.env`
que se puede copiar, mandar por chat o commitear. "El mesero tiene la llave desde
siempre" suena a control del sistema; en la práctica es un secreto compartido entre
personas, y los secretos compartidos se filtran. Ya hay uno filtrado:
`debug_query.mjs:8` tiene `password: 'angel2007'` y está versionado en git.

**La raíz es de entorno, no de código.** Mientras desarrollo y producción
compartan la misma `DATABASE_URL`, cualquier backend local escribe en producción. Es
una decisión de configuración, no un bug: por eso va a volver a pasar mientras siga
así.

**Pendiente de decidir con el equipo** (no es una tarea con dueño aún):

- [ ] Qué base usa el backend local: Supabase con su propio esquema de pruebas, o
      la de producción asumiendo que se escribe a ella.
- [ ] Quiénes del equipo tienen la cadena de producción y por qué vía.
- [ ] Si el frontend local debe apuntar a la API de Render por proxy, en vez de
      levantar un backend contra la base real. Eso elimina la llave local por
      completo, pero también deja de haber forma de probar escrituras sin tocar
      producción.
- [ ] Rotar los secretos de `backend/.env`. `JWT_SECRET`
      (`clubes-unid-jwt-secret-2026`) y `ADMIN_SECRET` (`unid-admin-2026`) son
      adivinables, y `ADMIN_SECRET` es la única barrera de
      `POST /api/usuarios/admin-action`, que promueve a admin.

**Lo que este ítem NO cubre**, y conviene decirlo para que no se lea como cerrado: hay
una fuga abierta en `formularios.js:26-47`
(`GET /api/formularios/debug-postulaciones`), sin `authenticate` ni `requireRole`,
que en producción responde **200 con datos reales de alumnos** (nombre, matrícula,
carrera, club). Está en `main`, que es la rama que Render despliega, así que está
vivo en `https://clubes-unid.onrender.com`. El comentario del código dice "SOLO
LOCAL", y esa suposición es lo que falló: no hay nada en el repo que impida que un
endpoint de debug llegue a producción. Se documenta aparte porque es un fix de una
línea, no una decisión de equipo.
