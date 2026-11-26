# Modelo de datos principal

Este diagrama resume los flujos de clubes y postulaciones, formularios configurables y encuestas. No pretende sustituir el esquema completo: la fuente definitiva de columnas, restricciones e índices es [`schema.sql`](../schema.sql).

```mermaid
erDiagram
    USUARIOS {
        int id_usuario PK
    }
    CAT_ESTATUS_CLUBES {
        int id_estatus_club PK
        string nombre_estatus UK
    }
    CAT_ESTATUS_POSTULACION {
        int id_estatus PK
        string nombre UK
    }
    CLUBES {
        int id_club PK
        string tipo
        int id_estatus_club FK
        int id_convocatoria_inscripcion_actual FK
    }
    CONVOCATORIAS_INSCRIPCION {
        int id_convocatoria_inscripcion PK
        int id_club FK
        int id_solicitud FK
    }
    SOLICITUDES_CONVOCATORIA {
        int id_solicitud PK
        int id_club FK
        int id_solicitante FK
        int id_revisor FK
        string estado
    }
    CONVOCATORIAS {
        int id_convocatoria PK
        int id_club FK
    }
    FORMULARIOS {
        int id_formulario PK
        int id_alumno FK
        int id_club FK
        int id_convocatoria FK
        int id_convocatoria_inscripcion FK
        string status FK
    }
    CLUB_FORMULARIO_PREGUNTAS {
        int id_pregunta PK
        int id_club FK
        string tipo
        json configuracion
    }
    FORMULARIO_RESPUESTAS_EXTRA {
        int id_formulario PK
        int id_pregunta PK
        int id_club FK
        string etiqueta_snapshot
        string tipo_snapshot
        json configuracion_snapshot
        json respuesta
    }
    ENCUESTAS {
        int id_encuesta PK
        int id_creador FK
        string tipo_privacidad
    }
    PREGUNTAS {
        int id_pregunta PK
        int id_encuesta FK
        string tipo
    }
    OPCIONES_PREGUNTA {
        int id_opcion PK
        int id_pregunta FK
        int id_club FK
        boolean es_otro
    }
    RESPUESTAS_ENCUESTA {
        int id_respuesta PK
        int id_encuesta FK
        int id_usuario FK
    }
    DETALLE_RESPUESTAS {
        int id_detalle PK
        int id_respuesta FK
        int id_pregunta FK
        int id_encuesta FK
        int id_opcion FK
        string texto_otro
    }

    CAT_ESTATUS_CLUBES o|--o{ CLUBES : "estatus solo si tipo=club"
    CAT_ESTATUS_POSTULACION ||--o{ FORMULARIOS : "estado de postulación"
    USUARIOS ||--o{ FORMULARIOS : "presenta"
    CLUBES ||--o{ FORMULARIOS : "recibe"
    CLUBES ||--o{ CONVOCATORIAS_INSCRIPCION : "publica ciclos"
    CLUBES o|--o| CONVOCATORIAS_INSCRIPCION : "ciclo actual del mismo club"
    CLUBES ||--o{ CONVOCATORIAS : "agenda entrevistas"
    CLUBES ||--o{ SOLICITUDES_CONVOCATORIA : "recibe solicitudes de cambio"
    CONVOCATORIAS o|--o{ FORMULARIOS : "bloque opcional del mismo club"
    CONVOCATORIAS_INSCRIPCION o|--o{ FORMULARIOS : "ciclo opcional; mismo club"
    SOLICITUDES_CONVOCATORIA o|--o{ CONVOCATORIAS_INSCRIPCION : "origen opcional del ciclo"
    USUARIOS ||--o{ SOLICITUDES_CONVOCATORIA : "solicita"
    USUARIOS o|--o{ SOLICITUDES_CONVOCATORIA : "revisa"
    CLUBES ||--o{ CLUB_FORMULARIO_PREGUNTAS : "define"
    CLUBES o|--o{ OPCIONES_PREGUNTA : "recomendación opcional"
    FORMULARIOS ||--o{ FORMULARIO_RESPUESTAS_EXTRA : "contiene respuestas"
    CLUB_FORMULARIO_PREGUNTAS ||--o{ FORMULARIO_RESPUESTAS_EXTRA : "define la pregunta respondida"

    USUARIOS ||--o{ ENCUESTAS : "crea"
    ENCUESTAS ||--o{ PREGUNTAS : "contiene"
    ENCUESTAS ||--o{ RESPUESTAS_ENCUESTA : "recibe respuestas"
    PREGUNTAS ||--o{ OPCIONES_PREGUNTA : "ofrece"
    RESPUESTAS_ENCUESTA ||--o{ DETALLE_RESPUESTAS : "se desglosa en"
    PREGUNTAS ||--o{ DETALLE_RESPUESTAS : "se responde en"
    OPCIONES_PREGUNTA o|--o{ DETALLE_RESPUESTAS : "opción elegida"
    USUARIOS o|--o{ RESPUESTAS_ENCUESTA : "identidad solo institucional"
```

## Reglas que no se ven solo con las líneas del diagrama

- `clubes` también contiene actividades. `tipo` distingue ambos recursos; restricciones reservan a los clubes el estatus operativo, el cupo y la participación. Las actividades usan `estado_publicacion` y no necesitan un estatus de club.
- Son tres conceptos distintos: `solicitudes_convocatoria` registra la petición del club que pasa por revisión; `convocatorias_inscripcion` representa el ciclo aprobado de recepción; `convocatorias` registra bloques de entrevista asociados a postulaciones. `formularios.id_convocatoria` y `formularios.id_convocatoria_inscripcion` guardan las dos relaciones directas de la postulación. Un índice único parcial impide que el mismo club tenga dos solicitudes pendientes.
- Cuando una postulación tiene ciclo o bloque de entrevista, ambos deben pertenecer al mismo club; el ciclo actual de un club también debe pertenecer a ese club. Las claves foráneas compuestas comprueban esas coincidencias, no solo que ambos identificadores existan.
- Cada respuesta configurable enlaza por claves compuestas al formulario y a la pregunta del mismo club. Sus snapshots conservan la etiqueta y configuración vigentes al contestar; editar la pregunta no reinterpreta respuestas históricas.
- En encuestas anónimas, `respuestas_encuesta.id_usuario` queda nulo; en las institucionales la API exige identidad. PostgreSQL impide mezclar la privacidad definida en la encuesta con la identidad de la respuesta y evita cambiarla después del envío.
- Cada detalle de encuesta debe vincular una respuesta y una pregunta de la misma encuesta. La opción elegida debe pertenecer a la pregunta registrada.
- `formularios.respuestas_extra` es el formato JSON histórico. Las respuestas configurables nuevas se guardan en `formulario_respuestas_extra`, una fila por pregunta, con su contexto histórico.

## Convenciones para cambios nuevos

- Tablas y columnas en `snake_case`; tablas con nombres de dominio en plural.
- Clave primaria `id_<entidad>` y claves foráneas con el mismo nombre de la clave referenciada.
- Nombres: `fk_` para claves foráneas, `chk_` para restricciones de fila, `uq_` para unicidad e `idx_` para índices no únicos.
- Declarar obligatorios los datos esenciales con `NOT NULL`; evitar defaults que mezclen reglas de tipos de recurso distintos.
- Usar una clave foránea para relaciones entre entidades y una restricción `CHECK` para valores permitidos dentro de una fila. Para catálogos administrables, referenciar la tabla de catálogo.
- Agregar migraciones nuevas al final de `managed.json`; no editar migraciones ya registradas. `schema.sql` describe una instalación vacía y no es el mecanismo para actualizar una base existente.
