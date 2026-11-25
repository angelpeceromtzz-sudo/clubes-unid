# Cambios de base de datos

## Qué archivo usar

- `schema.sql` sirve para inicializar una base vacía y documenta el estado esperado del esquema. Su encabezado también advierte que no se debe usar para actualizar una base con datos.
- El backend no ejecuta `schema.sql` al iniciar. `backend/migrate.js` es una herramienta manual.
- `schema.sql` conserva bloques históricos de compatibilidad que eliminan columnas y pueden borrar o trasladar filas. No lo uses como migración automática de una base con datos sin revisar esos bloques y preparar un respaldo.
- `diagnostics/auditar-develop.sql` inspecciona en modo de solo lectura el ledger, las protecciones de privacidad, las relaciones de respuestas y conteos agregados. No muestra respuestas ni identidades.
- `diagnostics/prevalidar-migraciones-develop.sql` compara indicadores de las migraciones administradas, revisa si existe también el ledger interno de Supabase y cuenta respuestas/tablas relacionadas y posibles conflictos sin mostrar valores de negocio. Incluye esquemas parciales, discrepancias de configuración, cierres y contador de postulaciones para la normalización por ciclo. Es solo lectura: no crea un ledger ni decide por sí sola qué migraciones registrar o ejecutar.
- Para ejecutar ese diagnóstico directamente, configura `SUPABASE_DEVELOP_DATABASE_URL` solo en `backend/.env` y usa `pnpm --dir backend db:audit:develop`. El ejecutor comprueba el identificador de `clubsunid-develop`, valida TLS, abre una transacción `READ ONLY` con límite de 15 segundos y nunca imprime la URL. No sirve para aplicar migraciones.
- `diagnostics/auditar-rls.sql` resume RLS, políticas y privilegios directos de `anon` y `authenticated` en `public`; no lee datos de negocio ni modifica el esquema.
- Para una base existente, aplica únicamente la migración específica del cambio. Las migraciones históricas aún no tienen un registro central de aplicación ni un orden completo garantizado.
- Las migraciones de `managed.json` tienen registro, orden y checksum; aplícalas con `pnpm --dir backend migrate:managed`. No agregues migraciones históricas a ese manifiesto para reconstruir su estado.
- En una instalación nueva, `schema.sql` crea un ledger vacío y el siguiente paso es ejecutar `migrate:managed`; las migraciones del manifiesto completan el registro de versiones. Si falta el ledger y existe cualquier tabla en `public`, el ejecutor se detiene, incluso si solo quedan tablas de respuestas u otras tablas parciales.
- La reconciliación inicial registró los cambios preexistentes con origen `adopcion_verificada`. La base de develop se ha avanzado con migraciones administradas en secuencia; usa el ledger vigente para conocer el punto actual.
- En otras bases existentes sin ledger no ejecutes el script de adopción de develop: no crea un ledger genérico ni decide qué migraciones faltan. Conserva un respaldo y compara el esquema real con cada migración antes de definir un baseline propio.

## Estado revisado de clubsunid-develop

En la revisión del 25 de noviembre de 2026, el proyecto `clubsunid-develop` tenía 79 tablas públicas y carecía de ambos ledgers. Los cambios preexistentes se reconciliaron en `public.schema_migrations`; el estado verificado registra las migraciones 1–24 en el orden de `managed.json`. La migración 12 se registró como `adopcion_verificada` tras comprobar sus columnas, índices y restricción ya presentes. Las migraciones 8–11 y 13–14 se aplicaron en transacciones y quedaron registradas con checksum. La migración 24, `migrate-ciclo-inscripcion-configuracion-unica.sql`, fue aplicada manualmente en esta base y quedó registrada con el checksum `82eac238b0a77399b97a45a304a3e086fc5d5b8bdbfa8a4f5d81ba831fbe9925` y origen `aplicacion_manual`.

El ledger ya existe en develop; sus conteos son una fotografía y no sustituyen una prevalidación antes de la siguiente migración. Las migraciones 15–24 se aplicaron o adoptaron tras verificación en develop: función de sesiones, comentarios de dominio, integridad de privacidad, índices, contenido de noticias JSONB, columna para ocultar reconocimientos, FK restrictiva de respuestas y configuración única por ciclo. La consulta posterior confirmó ledger 24, cero columnas duplicadas de configuración en `clubes`, cierre manual en ciclos y ambas vistas de compatibilidad. No ejecutes el manifiesto completo en otra base existente por suposición.

La auditoría de permisos encontró RLS habilitado en las 79 tablas públicas, sin `FORCE ROW LEVEL SECURITY`, sin políticas y sin permisos efectivos para `anon` ni `authenticated`. Eso impide el acceso directo de esos roles a las tablas; no limita las consultas del backend cuando se conecta como propietario o `postgres`. El archivo `.env.example` propone `postgres` como usuario local, pero falta confirmar qué rol usa el backend desplegado y definir uno de ejecución con permisos mínimos si aplica en desarrollo. La migración 14 añadió ocho columnas de perfil y sus validaciones; falta verificar que la aplicación los use correctamente.

La revisión de Supabase del 25 de noviembre de 2026 muestra `clubsunid-develop` en el plan Free y el panel indica que ese plan no incluye respaldos del proyecto; el panel no muestra respaldos disponibles. No se probó una restauración de este proyecto, así que la categoría de operación sigue sin evidencia y no se cuenta como aprobada. No se cambió el plan.

La última suite local completa de backend (25 de noviembre de 2026) terminó con 538 pruebas aprobadas, 0 fallidas y 44 omitidas; las pruebas que necesitan PostgreSQL se omitieron en esa corrida por falta de URL de pruebas. Después se ejecutaron por separado las pruebas de integridad/migraciones contra PostgreSQL 18 temporal y aislado: 73 aprobadas, 0 fallidas y 0 omitidas. También pasó el smoke de instalación nueva: `schema.sql`, las 24 migraciones administradas y una segunda ejecución idempotente. La instalación congelada de dependencias del workflow terminó sin cambios pendientes y el YAML del workflow pasó validación sintáctica. El workflow ahora se activa también al cambiar la configuración de conexión PostgreSQL o cualquiera de los lockfiles que usa CI; falta un resultado real de GitHub Actions. En `clubsunid-develop` (PostgreSQL 17.11), la verificación encontró una encuesta, cero respuestas y cero detalles; cuatro noticias con contenido JSONB. La migración 24 quedó registrada y verificada: movió el cierre manual al ciclo, retiró cinco columnas duplicadas de `clubes` y conservó las vistas de compatibilidad. Los conteos de encuestas permanecieron en 1/0/0. La revisión del panel confirmó que el plan Free no ofrece respaldos de proyecto y que no hay respaldos visibles; tampoco se ha verificado restauración ni rol mínimo de ejecución.

## Procedimiento para una migración nueva

1. Revisa qué filas, columnas, índices y relaciones afecta; conserva los datos y aborta ante ambigüedades.
2. Haz un respaldo y confirma que se puede restaurar en una base de prueba.
3. Aplica la migración primero en una copia de la base y revisa sus conteos y restricciones.
4. Para las migraciones nuevas, usa `pnpm --dir backend migrate:managed`; el ejecutor serializa las aplicaciones y registra cada archivo con su checksum dentro de la misma transacción.
5. Para un archivo histórico que no está en el manifiesto, usa `psql -1 -v ON_ERROR_STOP=1 -d <base> -f backend/migrations/<archivo>.sql` solo después de revisar su contenido y estado.
6. Confirma el estado de los índices y restricciones después de aplicarla; conserva el log del despliegue.

Si una versión del backend escribe una columna nueva, coordina la migración y esa versión como un solo despliegue. Para `id_encuesta` en `detalle_respuestas`, aplica la migración administrada y despliega el backend que envía esa columna en la misma ventana; evita recibir respuestas mientras sólo una de las dos partes esté actualizada.

No ejecutes archivos `*-down.sql` para resolver una falla sin revisar antes si elimina datos. No edites una migración ya aplicada; crea otra que revierta o amplíe el cambio.

## Integridad de correos y postulaciones

`migrate-integridad-correos-postulaciones.sql` se ejecuta dentro de la transacción que proporciona el ejecutor. Primero busca correos duplicados ignorando mayúsculas y espacios, y postulaciones repetidas por alumno, club y ciclo. Si encuentra conflictos, cancela sin cambiar filas. Resuelve esos casos con una decisión explícita y vuelve a correr la migración; no borres ni combines registros automáticamente.

`migrate-estatus-postulacion-catalogo.sql` elimina el `CHECK` duplicado de `formularios.status` y referencia `cat_estatus_postulacion(nombre)`. Primero lista hasta diez estados existentes sin catálogo y aborta si encuentra alguno; conserva íntegro el valor histórico para que se resuelva explícitamente.

`migrate-preservar-bitacora.sql` conserva las acciones administrativas al borrar físicamente una cuenta (el autor queda en `NULL`; se retiene `admin_nombre`) y bloquea el borrado de una postulación mientras tenga historial de estados.

`migrate-periodos-sin-traslape.sql` verifica límites válidos y periodos existentes; si hay traslapes, aborta y conserva las filas. Después, PostgreSQL impide crear nuevos periodos que se empalmen.

`migrate-catalogo-tipo-datos.sql` exige que los clubes tengan cupo y participación y que las actividades no guarden esos campos. Si encuentra una actividad con esos datos heredados, aborta y señala su ID para revisión; no los limpia automáticamente.

`migrate-ciclo-inscripcion-mismo-club.sql` agrega claves foráneas compuestas para que una postulación y el ciclo actual de un club sólo puedan referenciar un ciclo del mismo club. Primero detecta referencias históricas cruzadas o huérfanas y se detiene sin reescribirlas; conserva todas las filas. Un ciclo con postulaciones no se puede borrar, así se conserva su relación histórica; el ciclo actual de un club puede quedar sin referencia cuando se elimina un ciclo vacío.

`migrate-respuestas-extra-normalizadas.sql` crea una fila por respuesta, con claves foráneas compuestas hacia la postulación y la pregunta que exigen que ambas sean del mismo club. Copia las respuestas JSON antiguas cuando la pregunta todavía existe en ese club. Conserva sin cambios el JSON original, incluidas las claves huérfanas, para no perder información histórica. El JSON antiguo no guardaba la etiqueta ni la configuración al responder, así que la migración solo puede copiar la versión vigente al ejecutarse; las respuestas nuevas sí conservan su propia etiqueta/configuración aunque la pregunta se edite. Las FK usan `RESTRICT`: no se puede borrar una pregunta ni una postulación con respuestas configurables históricas.

`migrate-inmutable-snapshot-respuestas-extra.sql` protege la pregunta, su etiqueta, tipo, configuración y fecha capturadas al contestar. Permite corregir el valor de la respuesta sin reescribir cómo estaba definida la pregunta.

`migrate-formularios-club-restrict-delete.sql` impide borrar físicamente un club que todavía tenga postulaciones. Antes el `CASCADE` podía eliminar el JSON histórico que conserva respuestas antiguas o huérfanas; para retirar un club se debe desactivarlo, conservando sus formularios.

`migrate-detalle-respuestas-misma-encuesta.sql` agrega al detalle el identificador derivado de la respuesta y usa dos FK compuestas para exigir que respuesta y pregunta sean de la misma encuesta. Antes de cambiar filas, bloquea brevemente escrituras concurrentes en esas tablas y aborta si encuentra referencias huérfanas, preguntas cruzadas o detalles para preguntas de licenciatura. En datos válidos, rellena la nueva columna desde la respuesta sin cambiar el contenido; conserva el borrado en cascada del detalle al borrar su respuesta y bloquea borrar preguntas que tienen respuestas.

`migrate-tipos-pregunta-formulario-club.sql` restringe las definiciones y los snapshots a `texto`, `textarea`, `numero`, `seleccion` y `fecha`, los tipos que permite el formulario actual. Si encuentra otro tipo heredado, se detiene sin modificar preguntas ni respuestas para que el equipo lo revise.

`migrate-encuestas-otro-reglas.sql` asegura las columnas e índices de la opción especial «Otro» y limita las nuevas respuestas a los 70 caracteres que acepta la API. La regla se agrega como `NOT VALID`: respuestas históricas más largas se conservan intactas, pero deben corregirse antes de poder editar esas filas o validar la regla. La validación completa se hace después de revisar y resolver esos casos sin truncar datos. Si encuentra más de una opción «Otro» para una pregunta, se detiene sin modificar respuestas. `migrate-encuestas-otro.sql` quedó retirado y ahora falla de forma explícita para impedir que reinstale el límite antiguo de 200 caracteres.

`migrate-perfil-informacion-personal.sql` agrega campos de perfil y restricciones de visibilidad, teléfono y URL. Solo suma columnas y restricciones; se ejecuta dentro de la transacción del ejecutor y revierte completa si algún dato previo no cumple las reglas.

`migrate-sesiones-vigencia-y-conteo.sql` actualiza la función de generación de sesiones en bases existentes. Limita cada horario a sus fechas de vigencia y acumula correctamente todas las sesiones insertadas. Reemplaza solo la función; no crea, borra ni reescribe sesiones existentes.

`migrate-indices-formularios-club.sql` agrega el índice que usan los listados de postulaciones por club y fecha. No modifica filas; su primera columna también ayuda a PostgreSQL a localizar postulaciones al validar la clave foránea del club.

`migrate-indices-consultas-frecuentes.sql` agrega índices para localizar clubes por vicepresidente y estado, y para unir las notificaciones de chat con su mensaje. Responde a consultas existentes y no modifica filas.

`migrate-retirar-indice-presencia-chat.sql` elimina el índice que no usan las consultas de presencia, que ya buscan por la clave primaria del club y usuario. Reduce escrituras de índice en cada latido; no elimina ni modifica filas de presencia. El archivo histórico `migrate-chat-club.sql` conserva la definición antigua y no se debe volver a ejecutar después de esta migración.

`migrate-comentarios-dominio.sql` añade descripciones persistentes a las tablas principales para distinguir clubes, actividades, solicitudes, ciclos de inscripción, formularios configurables y encuestas. Solo cambia metadatos del catálogo; no toca filas.

`migrate-noticias-contenido-jsonb.sql` convierte el texto actual de cada noticia en un bloque de párrafo dentro de JSONB, conservando el texto íntegro. Agrega una función para obtener texto plano en vistas previas y una restricción básica del formato. Las noticias nuevas pueden incluir párrafos, títulos e imágenes HTTPS alojadas en Cloudinary; el frontend las representa como texto React e imágenes, sin ejecutar HTML. La migración no toca encuestas, respuestas ni formularios.

`migrate-reconocimientos-ocultar.sql` agrega `oculta` con valor inicial `FALSE`. Conserva las insignias existentes y permite que el alumno retire una insignia de su perfil público sin borrarla.

`migrate-encuestas-privacidad-integridad.sql` impide guardar identidad en una encuesta anónima, exige identidad al enviar una respuesta institucional y bloquea cambiar la privacidad después de recibir respuestas. Tras el envío no se puede reasignar la respuesta ni moverla a otra encuesta. Si detecta una respuesta anónima histórica identificada, aborta sin reescribirla. Al borrar una cuenta, PostgreSQL puede dejar `id_usuario` nulo por la clave foránea, pero un `UPDATE` directo no puede retirar ni cambiar la identidad de una respuesta institucional.

`migrate-encuestas-respuestas-restrict.sql` reemplaza únicamente la FK directa de `respuestas_encuesta.id_encuesta` hacia `encuestas.id_encuesta` por una FK validada `ON DELETE RESTRICT`. Evita que un `DELETE` directo de encuesta elimine respuestas por cascada. No actualiza ni borra respuestas; si existen referencias huérfanas o más de una FK coincidente, la migración falla de forma transaccional y conserva el estado previo. Agregar la FK validada revisa las respuestas existentes y puede bloquear escrituras durante la operación; en una base grande debe programarse en una ventana de bajo uso. El endpoint administrativo puede borrar respuestas de forma explícita después de autenticar la contraseña y dentro de la misma transacción que elimina la encuesta; sus detalles se eliminan por su FK hija.

`migrate-ciclo-inscripcion-configuracion-unica.sql` mueve la configuración vigente y el cierre manual al ciclo de inscripción, retira de `clubes` la copia de esa configuración y el contador materializado de postulaciones, y mantiene los nombres usados por la API mediante `clubes_con_estado`. Antes de retirar columnas compara la configuración y el contador con sus valores derivados, y se detiene ante configuraciones parciales, discrepancias, cierres manuales contradictorios o huérfanos, y punteros de ciclo inválidos. Bloquea brevemente `clubes`, ciclos y formularios para que el preflight no se cruce con una postulación concurrente. No reasigna formularios históricos ni toca solicitudes pendientes. El conteo sale de `formularios`; las respuestas de encuestas no se consultan ni modifican. Las rutas y la migración deben desplegarse juntas, porque una versión antigua del backend todavía escribe las columnas que se retiran.

La prueba `backend/tests/postgresIntegridad.integration.test.mjs` verifica las migraciones con PostgreSQL real. Usa una base de pruebas desechable; crea esquemas temporales con nombres únicos y los elimina al terminar. El caso del ejecutor sólo crea una tabla en `public` dentro de una transacción que revierte, y el ledger sintético vive en un esquema temporal, nunca en `public`. No la apuntes a producción. El flujo de GitHub Actions usa una base efímera para esa suite y otra base separada para inicializar `schema.sql`, aplicar el manifiesto y confirmar que la segunda ejecución no repite cambios.
