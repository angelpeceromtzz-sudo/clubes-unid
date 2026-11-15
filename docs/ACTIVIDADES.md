# Catálogo unificado de clubes y actividades

## Alcance y acceso

- `/actividades`: catálogo y ediciones destacadas automáticamente.
- `/oferta`: descripciones estables de clubes y actividades publicados seleccionados para Oferta.
- `/actividades/:slug?edicion=ID`: información, inscripción, reacciones y galerías de una edición.
- `/actividades/mis-registros`: acceso compatible a las inscripciones de alumnos. La sección habitual es **Mi panel → Mis actividades**, incluso sin pertenecer a un club. Los demás roles no muestran esta sección.
- `/actividades/gestion`: acceso compatible a la gestión común, con filtros de tipo y publicación. La organización y la revisión se abren desde **Gestión de Clubs → Clubs y actividades** en los paneles autorizados. Se retira la sección independiente Actividades del panel; el acceso público se conserva. El selector **Clubs / Actividades** sobre el listado permite cambiar entre las dos vistas. En celular se accede por el mismo submenú.
- En el portal, el selector de **Explorar clubes** incluye **Actividades** en móvil y escritorio.

Las rutas públicas no entregan participantes, encargados, respuestas personales, propuestas ni fotografías sin aprobar. Las respuestas del módulo llevan `Cache-Control: private, no-store`. El acceso privado revalida la sesión y los permisos en el servidor.

Los roles de responsables, vicepresidencia, Administración, Rectoría, mural y Coordinación pueden solicitar actividades. Administración y Coordinación también pueden crear clubes, con la contraseña administrativa existente. Administración, Rectoría y Coordinación supervisan actividades y asignan encargados. Cualquier cuenta activa asignada puede administrar su actividad sin necesitar un club o un cambio de rol global. La reasignación retira el permiso al encargado anterior. Rectoría aprueba publicaciones, propuestas y fotografías.

Los clubes conservan su límite de un responsable por club y un club por responsable. Solo Administración y Coordinación asignan esta responsabilidad a alumnos o responsables; se conserva el cambio de rol necesario para operar el club. Las reasignaciones de un club ocupado y el retiro de responsabilidades se realizan desde Usuarios. Un responsable puede organizar varias actividades además de su club. Quienes solo organizan actividades conservan su panel personal y acceden a la organización desde **Gestión de Clubs → Clubs y actividades**.

## Estructura de datos

`clubes` es la única tabla principal del catálogo. `tipo` distingue `club` de `actividad`; `estado_publicacion` controla borrador, revisión, publicación y archivo. El estado operativo del club se conserva separado. No se decide el tipo a partir del nombre.

| Información | Almacenamiento y uso |
| --- | --- |
| Nombre, descripción, categoría, portada y responsable | Compartidos en `clubes` |
| Cupo, participación y niveles | Obligatorios para clubes |
| Miembros, postulaciones, convocatorias y horarios | Procesos exclusivos de clubes, conservando sus tablas e IDs |
| Ediciones, formularios configurables, asistentes y aportaciones | Procesos exclusivos de actividades |
| Publicación con una descripción y varias fotos | `publicaciones_oferta` y `publicaciones_imagenes`, compartidas |
| Reacciones | Una por cuenta y club, o una por cuenta y edición |

`catalogo_recursos` es una vista de la tabla principal que adapta los nombres del módulo; no duplica el catálogo. `clubes_operativos` y `clubes_con_estado` restringen los procesos anteriores a registros de tipo club. La vista `actividades` ofrece consulta compatible, y la tabla anterior queda como `actividades_catalogo_anterior`, sin escrituras operativas. Las fotos anteriores se consultan por una vista compatible sobre las publicaciones compartidas.

Los IDs existentes de clubes se conservan. Los IDs de actividades anteriores se traducen mediante `catalogo_equivalencias_actividades`, sin reutilizar IDs de clubes aunque coincidan. Sus ediciones conservan su propio ID, y con él sus asistentes, aportaciones y reacciones. Se conservan los IDs, descripciones, fechas y estados de todas las fotos. Si una dirección ya pertenece a un club, la actividad importada recibe un sufijo identificable y la correspondencia conserva el dato original.

## Preparar la base

`backend/schema.sql` contiene toda esta extensión junto con el resto de la estructura del proyecto: catálogo unificado, ediciones, registros, aportaciones, publicaciones, imágenes, reacciones, vistas y restricciones. Se ejecuta como un único archivo y en una transacción:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
```

El comando manual existente `node backend/migrate.js` aplica ese mismo archivo. No hace falta ejecutar después las migraciones de actividades. En una base vacía crea directamente el catálogo final y las publicaciones compartidas, sin crear un catálogo anterior de respaldo. En una base del proyecto que todavía tiene el módulo separado, reconoce sus tablas y conserva los IDs, fotos y registros al unificar. Se verificó su repetición con datos existentes, sin duplicar registros ni sobrescribir las descripciones de las actividades.

Para una base compartida, revisar el esquema y probar sobre una copia con respaldo antes de aplicarlo; el archivo también contiene la estructura de los demás módulos y bloquea escrituras mientras realiza cambios. El arranque de Express sigue sin ejecutarlo automáticamente. La versión nueva de la aplicación requiere terminar esta actualización antes de recibir tráfico.

Las migraciones anteriores se conservan como alternativa para actualizar exclusivamente el módulo en instalaciones anteriores: `migrate-actividades.sql` y después `migrate-catalogo-unificado.sql` si aún no existía; solo la segunda si ya había actividades. Esta alternativa no se combina con la instalación mediante el esquema consolidado. Después de unificar, no se repiten las migraciones retiradas `migrate-actividades.sql` ni `migrate-actividades-galeria.sql`.

La instalación incorpora únicamente las descripciones e imágenes informativas existentes de Trineo y Misiones. No crea cuentas, ediciones, fechas, aportaciones, mínimos, tallas ni responsables ficticios. La configuración operativa posterior se hace desde el panel: tipo al crear, información, cupo y niveles de clubes, responsables, ediciones, preguntas, tallas, aportaciones, fechas y destacados. Los registros existentes conservan su tipo; el traslado revisado atiende los eventos registrados anteriormente como clubes.

`seed.sql` mantiene los datos de demostración para desarrollo local. Es opcional y está separado de la preparación de la estructura; sus clubes usan el tipo club y los roles actuales. No es necesario para habilitar actividades ni para configurar el módulo desde el panel.

Las reglas compartidas se empaquetan dentro de `backend/lib/actividadesDominio.js`; el frontend las consume mediante una reexportación. El backend puede desplegarse con su propia carpeta sin depender de archivos de una carpeta hermana.

## Administrar clubes

Desde **Gestión de Clubs → Clubs y actividades**, Administración o Coordinación conservan su tabla y el formulario de **Crear club / Editar**. El selector de tipo está sobre el listado, sin añadirse al formulario. Completan cupo, participación, niveles y los datos comunes; **Publicación** abre el detalle, la galería y el envío a revisión de Rectoría. Rectoría accede desde **Clubs y actividades → Revisar publicación**. Los clubes anteriores conservan su publicación actual al migrar. Los cambios posteriores generan propuestas y mantienen visible la versión aprobada hasta su autorización. El cupo nuevo no puede quedar por debajo de sus miembros activos.

Cada club ofrece la misma galería general y el mismo visor que una actividad. Su apartado **Comunidad del club** permite enviar fotografías a revisión y abre el panel operativo para miembros, postulaciones, convocatorias y horarios. Las rutas anteriores de escritura reutilizan la validación y revisión del catálogo, por lo que el formulario restaurado conserva el proceso de publicación aprobado.

## Organizar una edición

1. Coordinación abre una actividad en su panel y asigna al encargado desde el apartado Responsable.
2. El encargado selecciona **Agregar edición**. El asistente tiene cuatro pasos: **Información**, **Fechas**, **Inscripción y aportaciones** y **Resumen**. Anterior y Continuar conservan los datos introducidos.
3. Información reúne nombre, lugar y descripción; Fechas reúne el evento y el periodo opcional de destacado. Este último es independiente del periodo de inscripción. Las fechas son inclusivas y se evalúan con la fecha del campus (`America/Mexico_City`).
4. En Inscripción y aportaciones configura las preguntas y el periodo de registro. En Trineo y Misiones, edad y talla son obligatorias y licenciatura es opcional. Debe completar las tallas disponibles. Nombre y matrícula se incluyen siempre; la API toma los datos institucionales de la cuenta cuando existen.
5. En Trineo agrega al menos una opción de aportación, con nombre, unidad y cantidad mínima. En actividades generales se habilita cuando la edición lo requiere. Las opciones nuevas y la edición se guardan en una sola transacción. Al editar ediciones existentes se conserva su catálogo, que se administra desde Aportaciones en el detalle.
6. Resumen muestra una vista previa antes de guardar. **Guardar edición** deja un borrador; **Guardar borrador y salir** permite continuar después. Guardar cambios sobre una edición publicada crea una propuesta y conserva la versión vigente.
7. Envía la edición a revisión desde su detalle. Rectoría abre la misma actividad en su panel y revisa la vista previa. La descripción general y cada edición tienen su propia sección de revisión. Puede **Aprobar y publicar** o **Solicitar cambios**, con motivo obligatorio. Una edición requiere que la descripción general esté publicada primero.

Cuando hay una propuesta sobre una edición publicada, Rectoría puede comparar ambas versiones. Para aprobar debe volver a la propuesta. La vista previa de la edición utiliza la descripción general vigente; los cambios pendientes de esa descripción se revisan en su propio apartado. Los controles de inscripciones, aportaciones, participantes y fotografías se presentan en apartados desplegables para separar la operación de la revisión.

La información publicada sigue disponible mientras se revisa una propuesta de cambios. El catálogo publicado lo actualiza Rectoría. Las opciones se pueden editar o retirar; los compromisos previos conservan su nombre, unidad, mínimo y cantidad originales. Las preguntas de registros confirmados también conservan una copia de la configuración que respondieron.

El encargado puede pausar/reabrir inscripciones dentro del periodo aprobado. Los alumnos corrigen o cancelan durante ese periodo. La cancelación cancela compromisos pendientes y conserva las aportaciones recibidas. Los dobles envíos se resuelven con bloqueo transaccional y unicidad por edición/usuario y edición/matrícula. No se consultan ni consumen postulaciones o membresías de clubes.

Las fotografías se presentan en una galería general del club o edición, con las más recientes primero, descripción, fecha y visor ampliado con botones, teclado y gestos. Desde el panel se seleccionan hasta diez fotos de hasta 5 MB cada una, con vista previa y la opción de quitarlas antes de enviarlas. La descripción se almacena una sola vez por publicación y se presenta con sus fotos. Se admiten JPG, PNG, WebP y GIF. No existe clasificación antes/después.

La autorización por actividad se comprueba antes de procesar los archivos. El álbum se registra en una transacción; si falla, se revierten sus filas y se intenta limpiar sus archivos subidos. Las fotos de encargados requieren aprobación; las de Rectoría se publican directamente. Cada cuenta tiene una reacción por edición, que puede cambiar o retirar. El catálogo público se actualiza cada minuto y al volver a la pestaña para reflejar los cambios de fecha sin un proceso programado.

## Transición de clubes existentes

El programa no asume IDs ni modifica registros por coincidencias de nombre. Identificar primero el club anterior y la edición correcta. Ensayar con una copia de la base y revisar el respaldo antes de aplicar en la base autorizada.

Administración o Coordinación abren una edición de Trineo o Misiones y usan **Trasladar registros anteriores**. Seleccionan el club de origen, consultan el resumen, verifican la correspondencia y confirman el traslado. La primera consulta no cambia registros. El panel muestra cuántos se importaron y cuántos requieren revisión por falta de matrícula. Esta acción afecta al club de origen seleccionado; debe revisarse su correspondencia antes de confirmar.

También existe un programa de mantenimiento para la misma operación:

La primera llamada solo muestra un resumen de conteos:

```sh
node backend/scripts/migrar-actividades-legado.mjs --club ID_CLUB --edicion ID_EDICION
```

Tras revisar esa correspondencia, agregar `--aplicar`:

```sh
node backend/scripts/migrar-actividades-legado.mjs --club ID_CLUB --edicion ID_EDICION --aplicar
```

Toda la transición es una transacción. Conserva los datos y estados originales en la correspondencia de legado y mantiene las tablas originales. Importa integrantes activos y solicitudes no rechazadas como `pendiente_completar`; el alumno debe completar los datos nuevos y, en Trineo, su aportación para confirmar. No convierte solicitudes rechazadas en asistentes. Las cuentas sin matrícula o desactivadas conservan su historial sin recibir una inscripción inventada.

Al aplicar, el club anterior queda inactivo y cerrado, sus membresías activas pasan a baja y se cierran las solicitudes pendientes. Se libera su vínculo con la convocatoria actual para que no siga ocupando postulaciones. No se tocan otros clubes. Los enlaces antiguos al detalle del club redirigen a la edición publicada. Una segunda aplicación de la misma correspondencia no duplica registros; una correspondencia diferente para el mismo club se rechaza.

El script no aplica migraciones ni se ejecuta durante un despliegue. No se ha aplicado una transición a una base compartida como parte de esta implementación.

## Verificación

```sh
npm run build
npm test
npm run test:actividades
```

Las pruebas de dominio funcionan sin base de datos. Las pruebas de API, migración y transición requieren `ACTIVIDADES_TEST_DATABASE_URL` apuntando explícitamente a una base de pruebas. Crean un esquema aleatorio con el esquema real y lo eliminan al terminar; no leen `backend/.env`. La API se prueba preparando la base únicamente con `schema.sql`. Se comprueba la instalación desde cero, la carga opcional del seed local, la repetición de ambos y la actualización de datos anteriores tanto mediante el esquema completo como con la migración específica. Cubren ambos tipos, permisos, restricciones entre procesos, galería compartida, registros, concurrencia, privacidad, aprobación, snapshots, recepción/cancelación de aportaciones, destacados, archivo e importación de legado. La prueba de actualización verifica además IDs que colisionan, secuencias adelantadas, conservación de fotos antiguas, asistentes y aportaciones recibidas, una sola fuente operativa y una segunda aplicación sin duplicados.

La implementación y las verificaciones locales no aplican migraciones ni trasladan registros en una base compartida. Su activación requiere actualizar esa base y desplegar las dos partes de la aplicación.
