# Catálogo unificado de clubes y actividades

## Trineo: cartas y regalos

En **Aportaciones → Cartas de regalo del Trineo**, el encargado captura nombre del niño, edad de 1 a 18 años y deseo de cada carta física. La carta de regalo es obligatoria en las nuevas inscripciones de Trineo y en las reactivaciones. Misiones no utiliza cartas. Si no hay cartas disponibles, el alumno debe consultar al encargado antes de inscribirse. Los registros confirmados anteriores sin carta se conservan y pueden corregir sus datos sin asignaciones inventadas.

Las **aportaciones para la actividad** son independientes del regalo: comida, globos u otros materiales. El encargado decide si son obligatorias en cada edición de Trineo o Misiones. En nuevas ediciones son opcionales por defecto. Las ediciones existentes conservan su configuración y los cambios publicados siguen su revisión habitual. Se pueden ofrecer opciones del catálogo aunque sean opcionales; si se exige aportar, debe existir al menos una opción disponible con su mínimo.

El alumno busca al niño por nombre o número de carta. **Elegir este niño** selecciona la carta y **Confirmar inscripción** la reserva en una transacción. No necesita seleccionar un artículo del catálogo para registrar el regalo. Puede comprometerse aparte con cero, una o varias aportaciones, según la configuración. Los datos de niños requieren sesión y no se incluyen en el detalle público.

Cada carta tiene como máximo una reserva vigente y cada inscripción una carta. Los índices únicos y el bloqueo transaccional evitan reservas duplicadas. Cambiar de niño o cancelar libera la carta si su regalo sigue pendiente. Una entrega de comida u otros materiales no impide cambiar la carta pendiente. El historial conserva los datos originales de cada carta liberada.

**Confirmar recepción del regalo** guarda el estado de entrega, el encargado y la fecha en la reserva. **Confirmar recepción de aportación** registra por separado los materiales de la actividad. Ambos procesos son idempotentes. Una carta con regalo recibido conserva su reserva incluso al cancelar la inscripción. Los regalos vinculados anteriormente a aportaciones mantienen su referencia histórica y no se muestran duplicados como aportaciones adicionales.

La estructura usa `actividades_cartas` y `actividades_cartas_reservas`. La segunda admite reservas sin `id_aportacion` y guarda `recibida`, `recibida_en` y `recibida_por`. La actualización copia las entregas históricas únicamente a la reserva vigente; conserva como desconocidas las fechas que no estaban registradas. `cartas_habilitadas` se conserva por compatibilidad, pero no decide la obligación de elegir carta.

Antes de desplegar sobre una base que ya tiene cartas, aplicar manualmente `backend/migrations/migrate-trineo-aportaciones-independientes.sql`. Si todavía no tiene cartas, la versión actual de `backend/migrations/migrate-trineo-cartas.sql` incluye toda la estructura. Las instalaciones nuevas y la actualización mediante el esquema completo lo incluyen en `schema.sql`. No se eliminan registros ni se sincroniza automáticamente SharePoint.

| Interfaz de cartas | Acceso |
| --- | --- |
| `GET /api/actividades/ediciones/:idEdicion/cartas` | Cuenta institucional; cartas disponibles de Trineo publicado |
| `GET /api/actividades/gestion/ediciones/:idEdicion/cartas` | Encargado asignado o supervisor; cartas, estado y alumno responsable |
| `POST /api/actividades/gestion/ediciones/:idEdicion/cartas` | Gestión autorizada; captura de cartas |
| `PUT /api/actividades/gestion/ediciones/:idEdicion/cartas/:idCarta` | Gestión autorizada; corrige o retira cartas sin reserva vigente |
| `POST /api/actividades/gestion/cartas-reservas/:idReserva/recibir` | Gestión autorizada; confirma el regalo de esa reserva, sin recibir otra si la carta fue reasignada |
| `PUT /api/actividades/ediciones/:idEdicion/registro` | Carta obligatoria en nuevas inscripciones de Trineo; aportaciones según la configuración |

`npm run test:trineo` cubre reservas simultáneas, aportaciones independientes, permisos, cancelaciones, recepciones, reversión ante fallos y actualización de datos anteriores. La integración requiere `ACTIVIDADES_TEST_DATABASE_URL`, usa esquemas temporales y no lee `.env`. También forma parte de `npm run test:actividades`.

## Misiones: formulario ampliado

El formulario ampliado anterior usa `configuracion_misiones.version=2` sin identificador de formato. Las ediciones clásicas mantienen configuración nula y las reglas anteriores. Ambos formatos se conservan al editar; únicamente un borrador sin registros puede adoptar explícitamente MEGAMISIONES, como se describe más adelante. Las nuevas ediciones usan MEGAMISIONES por defecto.

En el formato ampliado anterior, el paso **Inscripción y requisitos** incluye edad, talla de camisa, licenciatura, procedencia, sangre, alergias, contacto de emergencia, religión, grupo juvenil, conocimientos, participación previa y rol. La talla de camisa es obligatoria; el encargado decide la obligatoriedad de las demás preguntas. Los detalles de alergias, Otro y experiencia se exigen únicamente cuando su respuesta anterior los habilita. Sangre ofrece exclusivamente `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`. Las listas de religión y grupo juvenil conservan Ninguna/No pertenezco y Otra/Otro, además de las opciones configuradas. Responsable/Misionero describe la participación y conserva los permisos de la cuenta.

Los artículos se configuran por edición con precio en centavos de MXN, disponibilidad y, para sudaderas u otras prendas, tallas. El servidor calcula cantidades, subtotales y total. Cada pedido guarda nombres y precios; editar otros datos no altera su cotización. Si cambia el pedido se cotiza con el catálogo vigente y se comprueba el total mostrado. El pago es externo. Retirar un artículo conserva los pedidos anteriores. Catálogo, formulario y documento forman parte de la propuesta de edición revisada por Coordinación o Rectoría.

El encargado puede cargar el PDF original desde el asistente, incluso antes de guardar la nueva edición, y decidir si exige adjuntarlo firmado. El participante lo firma electrónicamente por fuera y sube un PDF de hasta 10 MB. Se comprueban tipo, cabecera y cierre; no se certifica su firma electrónica. Se guarda la configuración original respondida y cada PDF firmado queda asociado al participante. Los recursos se almacenan en Cloudinary como `raw/authenticated` y se descargan a través de la API después de comprobar acceso. Las firmas no tienen URL pública. Una operación fallida revierte sus datos y limpia las cargas incompletas.

El participante UNID usa su cuenta y matrícula. **Soy invitado** abre el formulario sin cuenta, con nombre, correo y teléfono obligatorios; no pide matrícula ni licenciatura. El enlace privado se muestra al confirmar y se envía por correo. Solo su poseedor puede consultar/editar ese registro o registrar su asistencia, además de los gestores autorizados. La edición se permite durante el mismo periodo aprobado de inscripción. Los duplicados por edición/correo no sobrescriben la inscripción ni devuelven su acceso. Si falla el correo, el registro se conserva y se ofrece reenviarlo desde el enlace privado.

El enlace usa `/actividades/misiones/registro/:folio#acceso=SECRETO`; el secreto no se envía en la dirección de la petición, se elimina del fragmento tras comprobarlo y solo se almacena su hash en la base. El navegador conserva la credencial por folio y edición, sin respuestas personales. Las peticiones privadas usan `Authorization: Registro SECRETO`; esta credencial no es una sesión institucional ni da acceso a otros módulos. Al escanear el QR habitual se recupera la credencial de esa edición; en otro navegador se pega el enlace recibido conservando el código del QR. Se exige inscripción confirmada, publicación, código y fechas; los reintentos conservan una sola marca y el encargado puede corregirla con motivo.

### Preparación y pruebas

Sobre una base existente ya unificada, aplicar manualmente `backend/migrations/migrate-misiones-registro-v2.sql` antes del despliegue. La instalación nueva lo incluye en `schema.sql`. La migración amplía ediciones e inscripciones y añade `misiones_documentos` a las diez tablas originales del catálogo. No se ejecuta al arrancar ni crea ediciones, artículos, firmas o participantes ficticios.

Configurar `MISIONES_PUBLIC_URL` con el origen HTTPS del frontend y `MISIONES_MAIL_PROVIDER=resend` o `smtp`. Se reutilizan las credenciales existentes de ese proveedor, manteniendo la restricción institucional de OTP. Como alternativa, el proveedor se hereda de `OTP_MAIL_PROVIDER` y el origen del primer `CORS_ORIGIN`. `mock` solo se admite en desarrollo. `CLOUDINARY_URL` configura el almacenamiento de PDFs privados.

`npm run test:misiones` cubre reglas, correo y flujos HTTP; `npm run test:actividades` incluye también las regresiones y migraciones. La integración solo usa `ACTIVIDADES_TEST_DATABASE_URL`, en esquemas temporales que elimina al terminar, sin leer las credenciales de la aplicación. Los servicios de correo y archivos se sustituyen por dobles de prueba para no realizar envíos ni cargas reales.

| Interfaz de Misiones | Acceso |
|---|---|
| `POST /api/actividades/ediciones/:idEdicion/invitados` | Registro público, únicamente para nuevas Misiones publicadas y abiertas; multipart con `formulario` JSON y `pdf` opcional |
| `GET/PUT /api/actividades/invitados/:folio` | Credencial privada del mismo registro; PUT admite el mismo multipart |
| `POST /api/actividades/invitados/:folio/reenviar-enlace` | Credencial privada, con límite de reenvíos |
| `POST /api/actividades/invitados/:folio/asistencia` | Credencial privada, con código y origen QR/código |
| `PUT /api/actividades/ediciones/:idEdicion/registro` | Cuenta UNID; conserva JSON para formularios anteriores y admite multipart en Misiones v2 |
| `POST /api/actividades/gestion/actividades/:idActividad/codigo-conducta` | Gestor autorizado; multipart `pdf` |
| `GET /api/actividades/documentos-misiones/:idDocumento` | Plantilla vigente publicada, participante propietario o gestor autorizado según corresponda |

## Alcance y acceso

El asistente de ediciones separa los datos esenciales del punto de encuentro y distingue los campos opcionales. En **¿Dónde será?** se puede escribir una referencia, marcar un punto en el mapa o pegar un enlace de Google Maps u OpenStreetMap. El mapa es opcional; no reemplaza el nombre del lugar. La ubicación se conserva entre pasos, borradores y propuestas. Aparece en la revisión y en el detalle público después de aprobarse. Los enlaces compartidos cortos se abren en su proveedor; el mapa integrado solo se muestra cuando el enlace contiene coordenadas del punto. No se realizan búsquedas automáticas de direcciones.

La ubicación usa `actividades_ediciones.ubicacion_maps`, con máximo de 2048 caracteres y vacío para ediciones anteriores. En bases existentes, aplicar `backend/migrations/migrate-actividades-ubicacion.sql` antes de desplegar la API; la instalación nueva y la actualización mediante `schema.sql` ya incluyen la columna. La migración es aditiva e idempotente. El mapa integrado se carga al abrirlo y utiliza [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) con atribución visible. Los puntos generan [enlaces oficiales de Google Maps](https://developers.google.com/maps/documentation/urls/get-started), sin credenciales de Google.

- `/actividades`: catálogo y ediciones destacadas automáticamente.
- `/oferta`: descripciones estables de clubes y actividades publicados seleccionados para Oferta.
- `/actividades/:slug?edicion=ID`: información, inscripción, reacciones y galerías de una edición.
- `/actividades/mis-registros`: acceso compatible a las inscripciones de alumnos. La sección habitual es **Mi panel → Mis actividades**, incluso sin pertenecer a un club. Los demás roles no muestran esta sección.
- `/actividades/gestion`: acceso compatible a la gestión común, con filtros de tipo y publicación. La organización y la revisión se abren desde **Gestión de Clubs → Clubs y actividades** en los paneles autorizados. Se retira la sección independiente Actividades del panel; el acceso público se conserva. El selector **Clubs / Actividades** sobre el listado permite cambiar entre las dos vistas. En celular se accede por el mismo submenú.
- En el portal, el selector de **Explorar clubes** incluye **Actividades** en móvil y escritorio.

Las rutas públicas no entregan participantes, encargados, respuestas personales, propuestas ni fotografías sin aprobar. Las respuestas del módulo llevan `Cache-Control: private, no-store`. El acceso privado revalida la sesión y los permisos en el servidor.

Solo Administración, Coordinación y Rectoría pueden crear actividades. El acceso **Gestión de Clubs → Clubs y actividades** se muestra únicamente a esos tres roles, tanto en escritorio como en el menú del celular. Periódico Mural, responsables, vicepresidencia y alumnos no muestran ese acceso, incluso si tienen una actividad asignada. Administración y Coordinación también pueden crear clubes, con la contraseña administrativa existente. Administración, Rectoría y Coordinación supervisan actividades y asignan encargados. Cualquier cuenta activa asignada conserva permisos sobre su actividad sin necesitar un club o un cambio de rol global. La reasignación retira el permiso al encargado anterior. Rectoría aprueba la información general de clubes y actividades y sus fotografías. Coordinación y Rectoría pueden aprobar nuevas ediciones de actividades y sus propuestas de cambios, o solicitar correcciones con motivo obligatorio. El archivo, la restauración y la edición directa del catálogo publicado conservan su autorización de Rectoría. Las respuestas de gestión y del detalle asignado incluyen `puede_aprobar_ediciones`, separado de `puede_aprobar`. El permiso de creación se verifica en el servidor y controla tanto el botón como la apertura del formulario mediante un enlace directo.

Los clubes conservan su límite de un responsable por club y un club por responsable. Solo Administración y Coordinación asignan esta responsabilidad a alumnos o responsables; se conserva el cambio de rol necesario para operar el club. Las reasignaciones de un club ocupado y el retiro de responsabilidades se realizan desde Usuarios. Un responsable puede organizar varias actividades además de su club.

Al asignar una actividad, el encargado encuentra **Actividades a mi cargo** directamente en la pantalla principal de su panel. Cada tarjeta muestra nombre, descripción, estado y el botón **Administrar actividad**, que abre la gestión completa con el registro seleccionado. El panel de presidente las presenta en Principal, junto a la información del club. También aparecen para encargados sin club y en la vista principal de los otros paneles.

La barra conserva las opciones originales de cada rol, sin grupos separados de club y actividad. El presidente mantiene Principal, Miembros del Club, Horario, Asistencia, Convocatorias e Historial. Los alumnos conservan **Mis actividades** para sus inscripciones como participantes; ese acceso es independiente de las tarjetas del encargado. Administración, Rectoría y Coordinación mantienen su gestión general.

Desde las tarjetas se accede a la presentación de Oferta, su revisión, el asistente de ediciones y los controles de inscripción, participantes, aportaciones y fotografías. Estas funciones permanecen en el detalle de administración, con sus permisos existentes.

La lista privada se obtiene mediante `/api/actividades/gestion/asignadas` y solo incluye actividades asignadas al usuario de la sesión. Se conservan los accesos privados de detalle e historial en `/api/actividades/gestion/asignadas/:idActividad` y `/historial`, comprobando al encargado actual en cada consulta. El listado de tarjetas se actualiza al volver a la pestaña o ventana y cada minuto, y ofrece Actualizar. Una reasignación retira la tarjeta del encargado anterior y revoca su acceso privado. La asignación conserva el rol y las membresías existentes. El menú general de gestión y la creación siguen reservados a Administración, Coordinación y Rectoría.

## Estructura de datos

La [guía de estudio de la base de datos](GUIA-BASE-DATOS-CLUBS-ACTIVIDADES.md) explica el antes y después, las relaciones, los estados y las reglas con ejemplos. Incluye [consultas de práctica de solo lectura](sql/estudiar-catalogo.sql).

`clubes` es la única tabla principal del catálogo. `tipo` distingue `club` de `actividad`; `estado_publicacion` controla borrador, revisión, publicación y archivo. El estado operativo del club se conserva separado. No se decide el tipo a partir del nombre.

| Información | Almacenamiento y uso |
| --- | --- |
| Nombre, descripción, categoría, portada y responsable | Compartidos en `clubes` |
| Cupo, participación y niveles | Obligatorios para clubes |
| Miembros, postulaciones, convocatorias y horarios | Procesos exclusivos de clubes, conservando sus tablas e IDs |
| Ediciones, formularios configurables, asistentes y aportaciones | Procesos exclusivos de actividades |
| Acceso al pase de lista y asistencia física por inscripción | `actividades_asistencia_accesos` y `actividades_asistencias`, exclusivas de actividades |
| Publicación con una descripción y varias fotos | `publicaciones_oferta` y `publicaciones_imagenes`, compartidas |
| Reacciones | Una por cuenta y club, o una por cuenta y edición |

La estructura compacta añade **diez tablas físicas** al proyecto: `actividades_ediciones`, `actividades_registros`, `actividades_aportes_catalogo`, `actividades_aportaciones`, `publicaciones_oferta`, `publicaciones_imagenes`, `reacciones_catalogo`, `migraciones_catalogo`, `actividades_asistencia_accesos` y `actividades_asistencias`. Se amplían las tablas existentes `clubes` y `actividad_clubes`.

`reacciones_catalogo` reúne las reacciones de ambos tipos. Para clubes, `id_edicion` queda vacío; para actividades, identifica una edición de esa misma actividad. Dos índices únicos parciales mantienen una reacción por cuenta y destino. `migraciones_catalogo.tipo` distingue las equivalencias de IDs (`equivalencia_actividad`) de los traslados explícitos desde clubes (`traslado_club`); cada caso tiene sus campos y restricciones.

`catalogo_recursos` es una vista de la tabla principal que adapta los nombres del módulo; no duplica el catálogo. `clubes_operativos` y `clubes_con_estado` restringen los procesos anteriores a registros de tipo club. La vista `actividades` ofrece consulta compatible, y la tabla anterior queda como `actividades_catalogo_anterior`, sin escrituras operativas. Las fotos anteriores se consultan por una vista compatible sobre las publicaciones compartidas.

Los IDs existentes de clubes se conservan. Los IDs de actividades anteriores se traducen mediante `migraciones_catalogo`, sin reutilizar IDs de clubes aunque coincidan. Sus ediciones conservan su propio ID, y con él sus asistentes, aportaciones y reacciones. Se conservan los IDs, descripciones, fechas y estados de todas las fotos. Si una dirección ya pertenece a un club, la actividad importada recibe un sufijo identificable y la correspondencia conserva el dato original.

Los nombres anteriores `actividades_reacciones`, `clubes_reacciones`, `catalogo_equivalencias_actividades`, `actividades_legado_clubes` y `actividades_historial` quedan como vistas de solo consulta. La aplicación escribe en las tablas compartidas. Al actualizar la versión de once tablas, se comprueba la copia antes de retirar cada tabla sustituida; una incompatibilidad revierte la transacción.

## Bitácora compartida

**Gestión de Clubs → Bitácora de clubs y actividades** permite a Administración, Rectoría y Coordinación consultar las acciones de ambos tipos, con filtros por tipo de recurso, autor, acción y club o actividad. Cada entrada muestra fecha, actor, descripción y edición cuando corresponde. Los alumnos y responsables no tienen acceso a esta consulta.

La tabla existente `actividad_clubes` recibe también las acciones del catálogo mediante `origen = 'catalogo'`. Añade `id_edicion` y una referencia al ID del historial anterior. Las operaciones del módulo y su entrada de bitácora se confirman en la misma transacción: si falla el registro del historial, se revierte la operación. El historial administrativo general del proyecto continúa en su apartado propio.

Las entradas importadas conservan actor, acción, detalle JSONB y fecha. Obtienen un `id_evento` común para evitar colisiones con la bitácora de clubes; el ID anterior queda en `id_historial_actividad_anterior` y en `actividades_historial.id_anterior`. Si una referencia histórica no puede resolverse, se conserva el evento sin inventarle un destino. La eliminación física de una cuenta deja el actor vacío y conserva el evento.

## Preparar la base

`backend/schema.sql` contiene toda esta extensión junto con el resto de la estructura del proyecto: catálogo unificado, ediciones, registros, aportaciones, publicaciones, imágenes, reacciones, vistas y restricciones. Se ejecuta como un único archivo y en una transacción:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/schema.sql
```

El comando manual existente `node backend/migrate.js` aplica ese mismo archivo. No hace falta ejecutar después las migraciones de actividades. En una base vacía crea directamente las diez tablas finales, sin crear un catálogo anterior de respaldo. Reconoce tanto el módulo separado como la versión unificada de once tablas y conserva sus datos al actualizar. Se verificó su repetición con datos existentes, sin duplicar registros ni sobrescribir las descripciones de las actividades.

Para una base compartida, revisar el esquema y probar sobre una copia con respaldo antes de aplicarlo; el archivo también contiene la estructura de los demás módulos y bloquea escrituras mientras realiza cambios. El arranque de Express sigue sin ejecutarlo automáticamente. La versión nueva de la aplicación requiere terminar esta actualización antes de recibir tráfico.

Las migraciones se conservan como alternativa para actualizar exclusivamente el módulo: `migrate-actividades.sql` y después `migrate-catalogo-unificado.sql` si aún no existía; solo la segunda si ya había actividades o la versión unificada de once tablas. Después de unificar, aplicar `migrate-actividades-asistencia.sql`, que incorpora las dos tablas del pase de lista. Si la base ya tiene el catálogo compacto de ocho tablas, aplicar únicamente esta última migración. Esta alternativa no se combina con la instalación mediante el esquema consolidado. Después de unificar, no se repiten las migraciones retiradas `migrate-actividades.sql` ni `migrate-actividades-galeria.sql`.

La instalación incorpora únicamente las descripciones e imágenes informativas existentes de Trineo y Misiones. No crea cuentas, ediciones, fechas, aportaciones, mínimos, tallas ni responsables ficticios. La configuración operativa posterior se hace desde el panel: tipo al crear, información, cupo y niveles de clubes, responsables, ediciones, preguntas, tallas, aportaciones, fechas y destacados. Los registros existentes conservan su tipo; el traslado revisado atiende los eventos registrados anteriormente como clubes.

`seed.sql` mantiene los datos de demostración para desarrollo local. Es opcional y está separado de la preparación de la estructura; sus clubes usan el tipo club y los roles actuales. No es necesario para habilitar actividades ni para configurar el módulo desde el panel.

Las reglas compartidas se empaquetan dentro de `backend/lib/actividadesDominio.js`; el frontend las consume mediante una reexportación. El backend puede desplegarse con su propia carpeta sin depender de archivos de una carpeta hermana.

## Administrar clubes

Desde **Gestión de Clubs → Clubs y actividades**, Administración o Coordinación conservan su tabla y el formulario de **Crear club / Editar**. El selector de tipo está sobre el listado, sin añadirse al formulario. Completan cupo, participación, niveles y los datos comunes; **Publicación** abre el detalle, la galería y el envío a revisión de Rectoría. Rectoría accede desde **Clubs y actividades → Revisar publicación**. Los clubes anteriores conservan su publicación actual al migrar. Los cambios posteriores generan propuestas y mantienen visible la versión aprobada hasta su autorización. El cupo nuevo no puede quedar por debajo de sus miembros activos.

Cada club ofrece la misma galería general y el mismo visor que una actividad. Su apartado **Comunidad del club** permite enviar fotografías a revisión y abre el panel operativo para miembros, postulaciones, convocatorias y horarios. Las rutas anteriores de escritura reutilizan la validación y revisión del catálogo, por lo que el formulario restaurado conserva el proceso de publicación aprobado.

## MEGAMISIONES: formulario de referencia e identidad de reacciones

Las nuevas ediciones de Misiones usan `configuracion_misiones.version = 2` y `formato = "megamisiones-2026"`, tomando como referencia [MEGAMISIONES 2026](https://docs.google.com/forms/d/1OXtReLGwqKY7DWhfGWNBpM0T5G5DwzieZVYJt_cdgVM/edit). Las configuraciones sin `formato` conservan su plantilla anterior. El enlace se usa como referencia; las inscripciones permanecen en ClubsUNID y no se importan respuestas de Google Forms.

El registro tiene cinco secciones: Presentación y contacto, Datos personales, Salud y emergencia, Logística, y Datos religiosos y experiencia. Reutiliza nombre y correo de la cuenta UNID; los invitados proporcionan nombre completo y correo. El celular es obligatorio para ambos. La fecha de nacimiento usa `tipo: "fecha"`, exige una fecha existente y no futura según el día del campus. Los teléfonos del nuevo formato se validan y guardan como dígitos. Se separan alergias a medicamentos, alergias a alimentos o materiales y enfermedades. Las preguntas sobre otra religión, otro grupo, parroquia y número de participaciones se muestran cuando corresponden y se descartan sus respuestas al dejar de aplicar. El rol declarado de la misión no modifica el rol ni los permisos de la cuenta.

Las opciones se basan en el formulario de referencia. Las inclusiones del kit se escriben en `informacion_kit` por edición; las fechas y precios de 2026 no se precargan. Los extras usan únicamente el catálogo. Un producto nuevo comienza sin precio y sin disponibilidad (`precio_centavos: null`, `activo: false`); solo puede ofrecerse al configurar un precio y sus tallas, si corresponde. No hay una pregunta de interés para artículos sin precio.

En un borrador anterior sin ningún registro, incluido historial cancelado, el asistente ofrece **Usar formato MEGAMISIONES**. Prepara las preguntas y conserva catálogo, PDF y preguntas adicionales compatibles; se aplica al guardar. El límite total sigue siendo de 25 preguntas, por lo que el nuevo formato admite cuatro adicionales. El detalle privado expone `puede_adoptar_formato`; el servidor vuelve a comprobar estado y ausencia de registros dentro de la transacción. Las ediciones publicadas conservan su formato y los registros guardan `formulario_snapshot` y `misiones_snapshot`.

Antes de desplegar sobre una base existente, aplicar manualmente `backend/migrations/migrate-misiones-megamisiones.sql`, después de las migraciones anteriores de Misiones. La migración actualiza la restricción de configuración y el trigger de cambio de formato; no modifica filas ni añade tablas. También está consolidada en `backend/schema.sql`. Ambos procedimientos son repetibles. La integración comprueba la conservación de respuestas, pedidos, firmas y formatos, además del bloqueo de conversiones indebidas mediante API y SQL directo.

Las reacciones de clubes y actividades usan tres ilustraciones vectoriales del lobo de ClubsUNID bajo **Deja tu huella**: aprobación, cariño y aplausos. Cada una tiene un gesto de 300–500 ms, etiquetas y contadores visibles, soporte de teclado y movimiento reducido. Conservan `like`, `love` y `clap`, una sola reacción por cuenta y destino, sustitución, retirada y recuperación ante errores. No requieren migración de reacciones.

## Organizar una edición

1. Coordinación abre una actividad en su panel y asigna al encargado desde el apartado Responsable.
2. El encargado selecciona **Agregar edición**. El asistente tiene cuatro pasos: **Información de la edición**, **Fechas y destacado**, **Inscripción y requisitos** y **Revisión final**. Sus encabezados permiten volver directamente a los pasos alcanzados y conservan los datos introducidos. Al corregir un paso no se pierde el avance: los pendientes se señalan y se pueden revisar sin bloquear la navegación entre pasos alcanzados. Continuar valida antes de abrir un paso nuevo; Guardar revisa todo y lleva al primer apartado pendiente. El avance se conserva mientras permanezca abierto el formulario y no se guarda automáticamente al cambiar de paso.
3. Información reúne nombre, lugar y descripción; Fechas reúne el evento y el periodo opcional de destacado. Este último es independiente del periodo de inscripción. Las fechas son inclusivas y se evalúan con la fecha del campus (`America/Mexico_City`).
4. En Inscripción y requisitos configura el periodo de registro, las preguntas, los artículos promocionales, el código de conducta y las aportaciones que correspondan. En Misiones, las preguntas se agrupan en datos personales, salud y emergencia, religión y grupo juvenil, y experiencia y rol. En Trineo y las ediciones anteriores de Misiones, edad y talla son obligatorias y licenciatura es opcional. Las nuevas Misiones usan las cinco secciones de MEGAMISIONES descritas en esta guía; las anteriores conservan su agrupación. Debe completar las tallas disponibles. Para cuentas UNID, nombre y matrícula se incluyen siempre; la API toma los datos institucionales de la cuenta cuando existen.
5. Configura las aportaciones para la actividad con nombre, unidad y cantidad mínima, y decide si serán obligatorias. Son independientes de la carta de regalo, que se exige solo en Trineo. Las opciones y la edición se guardan juntas, también cuando son opcionales. Al editar ediciones existentes, su catálogo se administra desde Aportaciones en el detalle.
6. Revisión final muestra la vista previa y los enlaces a los apartados pendientes antes de guardar. **Guardar edición** deja un borrador; **Guardar borrador y salir** permite continuar después. Guardar cambios sobre una edición publicada crea una propuesta y conserva la versión vigente.
7. Envía la edición a revisión desde su detalle. Coordinación o Rectoría abren la misma actividad en su panel y revisan la vista previa. La descripción general y cada edición tienen su propia sección de revisión. Pueden **Aprobar y publicar** o **Solicitar cambios**, con motivo obligatorio. Una edición requiere que la descripción general esté publicada primero.

Cuando hay una propuesta sobre una edición publicada, Coordinación o Rectoría pueden comparar ambas versiones. Para aprobar deben volver a la propuesta. La vista previa de la edición utiliza la descripción general vigente; los cambios pendientes de esa descripción se revisan en su propio apartado. Los controles de inscripciones, aportaciones, participantes y fotografías se presentan en apartados desplegables para separar la operación de la revisión.

La información publicada sigue disponible mientras se revisa una propuesta de cambios. El catálogo publicado lo actualiza Rectoría. Las opciones se pueden editar o retirar; los compromisos previos conservan su nombre, unidad, mínimo y cantidad originales. Las preguntas de registros confirmados también conservan una copia de la configuración que respondieron.

El encargado puede pausar/reabrir inscripciones dentro del periodo aprobado. Los alumnos corrigen o cancelan durante ese periodo. La cancelación cancela compromisos pendientes y conserva las aportaciones recibidas. Los dobles envíos se resuelven con bloqueo transaccional y unicidad por edición/usuario y edición/matrícula. No se consultan ni consumen postulaciones o membresías de clubes.

Las fotografías se presentan en una galería general del club o edición, con las más recientes primero, descripción, fecha y visor ampliado con botones, teclado y gestos. Desde el panel se seleccionan hasta diez fotos de hasta 5 MB cada una, con vista previa y la opción de quitarlas antes de enviarlas. La descripción se almacena una sola vez por publicación y se presenta con sus fotos. Se admiten JPG, PNG, WebP y GIF. No existe clasificación antes/después.

La autorización por actividad se comprueba antes de procesar los archivos. El álbum se registra en una transacción; si falla, se revierten sus filas y se intenta limpiar sus archivos subidos. Las fotos de encargados requieren aprobación; las de Rectoría se publican directamente. Cada cuenta tiene una sola reacción por club o edición: Me gusta, Me encanta o Aplausos. Se muestran como lobos ilustrados de ClubsUNID con contadores, halo de selección y animación breve. Tocar la reacción seleccionada la retira y elegir otra la sustituye. La vista actualiza los contadores al instante, confirma con el servidor y restaura el estado anterior si falla, con opción de reintentar. Las reacciones admiten teclado, ambos temas y movimiento reducido; los visitantes consultan los totales e inician sesión para reaccionar. El catálogo público se actualiza cada minuto y al volver a la pestaña para reflejar los cambios de fecha sin un proceso programado.

## Pase de lista

Cada edición con inscripciones tiene el apartado **Pase de lista**, dentro de su administración. El encargado actual y los supervisores con permisos de gestión pueden consultar la lista, generar una sola vez el acceso y realizar correcciones. La reasignación revoca el acceso del encargado anterior. El QR y el código de ocho caracteres se conservan para la edición; no se generan datos durante una consulta ni al migrar la base.

El alumno escanea el QR, inicia sesión y pulsa **Registrar mi asistencia**. También puede escribir el código desde **Mis actividades** o desde el detalle de su inscripción. El inicio de sesión conserva la edición y el código del enlace. Se requiere cuenta activa, inscripción confirmada, actividad y edición publicadas, código correcto y fecha del campus dentro del inicio y fin del evento, ambos incluidos. Sin fecha final, solo se admite el día inicial. Se usa la zona de fechas de actividades existente, `America/Mexico_City`; la hora de inicio y las fechas o pausas de inscripción no limitan el pase de lista.

Hay una asistencia por inscripción/edición, con fecha del servidor, origen (QR, código o manual) y autor. Los reintentos y los envíos simultáneos devuelven la misma marca y no repiten el evento de bitácora. La confirmación se muestra únicamente después de guardar en el servidor; no hay almacenamiento de asistencias sin conexión. El código se valida con el limitador de escrituras por cuenta existente. El acceso no aparece en las consultas públicas ni en la bitácora. Como el QR y el código pueden compartirse, la verificación física queda a cargo del encargado.

La lista se actualiza cada 15 segundos mientras su apartado está abierto y la pestaña está visible, y al volver a ella. Permite buscar por nombre o matrícula, ver inscripciones confirmadas, asistencias registradas y confirmados sin asistencia. Se conservan visibles las marcas de inscripciones posteriormente canceladas o incompletas con su estado identificado; el total de asistencias incluye esas marcas históricas y puede superar el total de inscripciones confirmadas actuales. Sin marca se muestra **Sin asistencia registrada**, sin asignar ausencias, retardos o justificaciones.

El registro manual y la corrección requieren motivo y se permiten fuera de las fechas del evento. Solo se marca presente a inscritos confirmados con cuenta activa; una marca existente puede anularse incluso si después se canceló la inscripción. Las anulaciones conservan el registro y su historial; el alumno debe pedir ayuda al encargado para restablecer una asistencia anulada. Cancelar una inscripción, archivar o modificar la publicación no elimina las asistencias. Cada corrección guarda el antes, el después, el actor y el motivo en la misma transacción que la marca.

Contratos bajo `/api/actividades`, todos privados y sin caché:

| Operación | Ruta | Entrada / respuesta |
| --- | --- | --- |
| Lista y acceso existentes, para gestión | `GET /gestion/ediciones/:idEdicion/asistencia` | Disponibilidad, acceso si existe, totales y registros; cada marca incluye origen, fecha, autor y último motivo |
| Generar u obtener acceso estable | `POST /gestion/ediciones/:idEdicion/asistencia/acceso` | Devuelve `{ codigo }`; requiere publicación vigente e inscripciones |
| Consulta propia, incluso histórica | `GET /ediciones/:idEdicion/mi-asistencia` | Edición, estado de inscripción, disponibilidad y asistencia propia |
| Registrar llegada propia | `POST /ediciones/:idEdicion/asistencia` | `{ codigo, origen: 'qr' o 'codigo' }`; devuelve `{ asistencia }` |
| Registrar o corregir manualmente | `PUT /gestion/ediciones/:idEdicion/asistencia/:idRegistro` | `{ estado: 'presente' o 'anulada', motivo }`; devuelve `{ asistencia }` |

Las consultas existentes de **Mis actividades** y **Mi registro** también entregan `asistencia` (estado, fecha ISO y origen, o `null`) y `disponibilidad_asistencia`. Ningún alumno puede indicar la identidad de otra persona para registrar una llegada.

Para una base ya unificada, probar y aplicar manualmente `backend/migrations/migrate-actividades-asistencia.sql` con respaldo previo, antes de desplegar backend y frontend. La migración es aditiva e idempotente; no se ejecuta al arrancar ni necesita el seed. No se ha aplicado a una base compartida como parte de esta implementación.

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

Toda la transición es una transacción. Conserva los datos y estados originales en `migraciones_catalogo` con `tipo = 'traslado_club'` y mantiene las tablas originales de participantes. Importa integrantes activos y solicitudes no rechazadas como `pendiente_completar`; el alumno debe completar los datos nuevos y, en Trineo, elegir su carta de regalo para confirmar. Las aportaciones adicionales dependen de la configuración de la edición. No convierte solicitudes rechazadas en asistentes. Las cuentas sin matrícula o desactivadas conservan su historial sin recibir una inscripción inventada.

Al aplicar, el club anterior queda inactivo y cerrado, sus membresías activas pasan a baja y se cierran las solicitudes pendientes. Se libera su vínculo con la convocatoria actual para que no siga ocupando postulaciones. No se tocan otros clubes. Los enlaces antiguos al detalle del club redirigen a la edición publicada. Una segunda aplicación de la misma correspondencia no duplica registros; una correspondencia diferente para el mismo club se rechaza.

El script no aplica migraciones ni se ejecuta durante un despliegue. No se ha aplicado una transición a una base compartida como parte de esta implementación.

## Verificación

```sh
npm run build
npm test
npm run test:actividades
```

Las pruebas de dominio y `backend/tests/actividadesAprobacion.test.mjs` funcionan sin base de datos. Esta última comprueba los permisos HTTP de aprobación de ediciones, las observaciones, las propuestas, la bitácora y la separación de los demás permisos con una conexión simulada. Las pruebas de API, migración y transición requieren `ACTIVIDADES_TEST_DATABASE_URL` apuntando explícitamente a una base de pruebas. Crean un esquema aleatorio con el esquema real y lo eliminan al terminar; no leen `backend/.env`. La API se prueba preparando la base únicamente con `schema.sql`. Se comprueba la instalación desde cero, la carga opcional del seed local, la repetición de ambos y la actualización de datos anteriores tanto mediante el esquema completo como con la migración específica. Cubren ambos tipos, permisos, restricciones entre procesos, galería compartida, registros, concurrencia, privacidad, aprobación, snapshots, recepción/cancelación de aportaciones, destacados, archivo e importación de legado. La prueba de actualización verifica además IDs que colisionan, secuencias adelantadas, conservación de fotos antiguas, asistentes y aportaciones recibidas, una sola fuente operativa y una segunda aplicación sin duplicados.

La implementación y las verificaciones locales no aplican migraciones ni trasladan registros en una base compartida. Su activación requiere actualizar esa base y desplegar las dos partes de la aplicación.

`catalogoCompacto.integration.test.mjs` verifica las diez tablas físicas, las cinco vistas compatibles, los destinos y duplicados de reacciones, la conservación de la bitácora al retirar un actor y la actualización desde once tablas mediante ambos procedimientos. `actividadesAsistencia.integration.test.mjs` prueba QR/código, permisos y reasignación, fechas inclusivas, cuentas inactivas, inscripciones canceladas o incompletas, concurrencia, correcciones, historial, limitación de intentos, repetición de migración y reversión ante un fallo de bitácora.
