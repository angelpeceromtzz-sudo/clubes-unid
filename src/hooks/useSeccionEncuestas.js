// Estado de la sección de encuestas del panel de administración.
//
// Va en su propio hook y no en `usePanelAdmin` a propósito. El panel carga
// usuarios, clubes, historial y diapositivas al montar; si las encapsulate
// también, entrar al panel pagaría tres requests de encuestas que casi nadie
// mira. Aquí sólo se piden cuando el admin abre la sección.
//
// La sección tiene tres pantallas (lista, editor y resultados) y se navega entre
// ellas con `vista`, no con rutas: el enlace de la encuesta pública es lo único
// que necesita URL propia.
import { useCallback, useEffect, useState } from 'react';
import { encuestaService } from '../services/encuesta.service';
import { TIPOS_CON_OPCIONES } from '../constants/encuesta';
import { ESTADO_ENCUESTA } from '../constants/estatus';
import { ROL_ADMIN } from '../constants/roles';
import { useFeedback } from './useFeedback';

// Filtro de la lista. `null` = todas.
const SIN_FILTRO = null;

// Cadencia del sondeo de respuestas nuevas en el panel de resultados
// (6-8 segundos pedidos: 7 queda en medio). Sólo consulta el total; el panel
// completo se recarga únicamente si ese total cambió.
const CHEQUEO_MS = 7000;

const ENCUESTA_VACIA = {
  titulo: '',
  descripcion: '',
  mensaje_agradecimiento: '',
  fecha_inicio: '',
  fecha_fin: '',
};

const PREGUNTA_VACIA = {
  texto: '',
  ayuda: '',
  tipo: 'texto_corto',
  es_obligatoria: false,
  escala_min: 0,
  escala_max: 5,
  escala_min_texto: '',
  escala_max_texto: '',
  opciones: ['', ''],
};

// `usuario` llega del panel para poder distinguir a rectoría (rol 4) de admin
// (rol 3): el backend los deja leer las encuestas a los dos pero sólo deja
// escribir al admin, así que el panel es quien tiene que esconder los botones de
// escritura. Se compara con la constante y no con el 3 suelto.
export function useSeccionEncuestas(setFeedbackExterno, usuario) {
  const { feedback, setFeedback, errorFeedback, setErrorFeedback } = useFeedback();

  const esAdmin = usuario?.id_rol === ROL_ADMIN;

  // El éxito también se manda al panel, para que el aviso salga en el lugar donde
  // el admin ya está mirando y no dentro de la sección.
  const avisar = useCallback(
    (mensaje) => {
      setFeedback(mensaje);
      setFeedbackExterno?.(mensaje);
    },
    [setFeedback, setFeedbackExterno]
  );

  const [vista, setVista] = useState('lista');
  const [filtro, setFiltro] = useState(SIN_FILTRO);

  // Pestaña activa dentro de la encuesta abierta: 'preguntas' o 'resultados'.
  // Vive aquí y no en el componente porque tiene que sobrevivir a que la vista
  // siga siendo 'editor': cambiar de pestaña no es cambiar de `vista`.
  const [pestana, setPestana] = useState('preguntas');

  // El formulario de metadatos vive en `EditorEncuesta`, pero el aviso de
  // "cambiaste de pestaña y hay cosas sin guardar" tiene que decidirlo el
  // contenedor. Por eso el editor reporta su estado sucio acá en vez de resolver
  // el cambio de pestaña él mismo.
  const [metadatosSucios, setMetadatosSucios] = useState(false);

  // Mismo problema con los modales de pregunta y de opciones: viven en
  // `EditorPreguntas` y se desmontan al cambiar de pestaña, así que lo que el
  // admin escribió en ellos se perdería sin avisar. El editor reporta si tiene
  // algo abierto y el contenedor pregunta antes de dejarlo ir.
  const [preguntasPendientes, setPreguntasPendientes] = useState(false);

  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);

  // Encuesta abierta en el editor o en resultados, con su detalle.
  const [seleccion, setSeleccion] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [formNueva, setFormNueva] = useState(ENCUESTA_VACIA);
  const [formPregunta, setFormPregunta] = useState(PREGUNTA_VACIA);
  const [editandoPregunta, setEditandoPregunta] = useState(null);

  const [resultados, setResultados] = useState(null);
  const [cargandoResultados, setCargandoResultados] = useState(false);

  // Filtro de carrera del panel de resultados y fecha de la respuesta más
  // reciente. Vive aquí (y no en el panel) porque el sondeo de tiempo real
  // necesita las dos: compara el total con el mismo filtro con el que se cargó,
  // y la hora de la última respuesta la trae él.
  const [carreraActiva, setCarreraActiva] = useState(SIN_FILTRO);
  const [ultimaRespuesta, setUltimaRespuesta] = useState(null);

  // --- carga ---

  // Devuelve las filas además de ponerlas en el estado: al abrir el editor o los
  // resultados hay que resincronizar la encuesta elegida con el servidor, y leer
  // `lista` después del setState daría todavía la versión anterior.
  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    setErrorLista(null);

    try {
      const filas = await encuestaService.listar();
      setLista(filas);
      return filas;
    } catch (err) {
      setErrorLista(err.message);
      return [];
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    // Sigue la convención de usePanelAdmin: cargar la lista al montar la sección
    // es sincronizar con el servidor, que es exactamente para lo que sirve un
    // efecto. La alternativa (que el padre dispare la carga) metería estado de
    // encuestas en usePanelAdmin para todo el panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarLista();
  }, [cargarLista]);

  // Resincroniza la encuesta abierta con el servidor.
  //
  // Hace falta porque el panel decide varias cosas a partir de
  // `total_respuestas` (si la estructura queda en solo lectura, si se puede
  // borrar, si se puede editar) y ese número lo trae la fila de la lista, que
  // quedó calculada cuando se cargó. Si un alumno contesta en medio de la sesión
  // —o el admin publica y alguien responde enseguida— el panel razonaría con un
  // conteo viejo y dejaría editar una estructura que ya está congelada.
  //
  // Se recarga la lista y no el detalle a propósito: `GET /admin/:id` no devuelve
  // el conteo (sí el detalle y las preguntas), y `/resultados` lo devuelve pero
  // son seis consultas de agregados para leer un integer. La lista es una sola
  // consulta barata y ya se carga para la vista de lista.
  const refrescarSeleccion = useCallback(
    async (idEncuesta) => {
      const filas = await cargarLista();
      const fresca = filas.find((e) => e.id_encuesta === idEncuesta);

      // Si el listado falla o la encuesta ya no está, se conserva la que había:
      // perder la selección dejaría al admin en una vista sin encabezado.
      if (fresca) setSeleccion(fresca);
    },
    [cargarLista]
  );

  const cargarDetalle = useCallback(async (id) => {
    setCargandoDetalle(true);

    try {
      setDetalle(await encuestaService.obtener(id));
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setCargandoDetalle(false);
    }
  }, [setErrorFeedback]);

  const cargarResultados = useCallback(async (id, carrera = null) => {
    setCargandoResultados(true);
    // `resultados` no se borra antes de recargar: el panel se refresca solo
    // cada pocos segundos (sondeo de tiempo real) y vaciarlo haría que todo el
    // contenido parpadeara a Spinner en cada ciclo. El spinner inicial se ve
    // igual porque `resultados` arranca en null y el panel lo maneja aparte.

    try {
      const datos = await encuestaService.obtenerResultados(id, carrera);
      setResultados(datos);
      setUltimaRespuesta(datos.ultima_respuesta ?? null);
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setCargandoResultados(false);
    }
  }, [setErrorFeedback]);

  // --- tiempo real: refresco del panel de resultados ---
  //
  // Cada CHEQUEO_MS se le pregunta al servidor el total de respuestas y la
  // fecha de la más reciente con la consulta ligera de `respuestas-recientes`.
  // Sólo si el total cambió se recarga el panel completo (nueve consultas); si
  // no entró nada, no pasa nada. El sondeo se salta con la pestaña oculta y se
  // detiene al salir de la pestaña de resultados, de la encuesta o si la
  // encuesta ya cerró.
  useEffect(() => {
    if (pestana !== 'resultados' || !resultados || seleccion?.estado !== 'publicada') {
      return undefined;
    }

    const idEncuesta = seleccion.id_encuesta;
    const totalActual = resultados.total_respuestas;
    let enCurso = false;

    const chequear = async () => {
      if (enCurso || document.hidden) return;
      enCurso = true;

      try {
        const { total, ultima } = await encuestaService.respuestasRecientes(
          idEncuesta,
          carreraActiva
        );
        // La hora de la última respuesta se toma de aquí para que no dependa
        // de que haya habido un cambio: con la misma respuesta, el string es
        // idéntico y React no vuelve a pintar.
        setUltimaRespuesta(ultima ?? null);

        if (total !== totalActual) {
          await cargarResultados(idEncuesta, carreraActiva);
        }
      } catch {
        // Un sondeo que falle (red, sesión vencida) no debe romper el panel
        // ni llenar la pantalla de errores cada pocos segundos: se ignora y
        // el siguiente tick vuelve a intentar.
      } finally {
        enCurso = false;
      }
    };

    // El primer chequeo va de inmediato y no a los 7 s: al entrar a la
    // pestaña ya se sabe si llegaron respuestas mientras no se miraba.
    chequear();

    const intervalo = setInterval(chequear, CHEQUEO_MS);
    return () => clearInterval(intervalo);
  }, [pestana, resultados, seleccion, carreraActiva, cargarResultados]);

  // --- navegación ---

  const volverALista = useCallback(() => {
    setVista('lista');
    setSeleccion(null);
    setDetalle(null);
    setResultados(null);
    setCarreraActiva(SIN_FILTRO);
    setUltimaRespuesta(null);
    setEditandoPregunta(null);
    setMetadatosSucios(false);
    setPreguntasPendientes(false);
    setPestana('preguntas');
  }, []);

  const abrirEditor = useCallback(
    async (encuesta) => {
      setSeleccion(encuesta);
      setVista('editor');
      setResultados(null);
      // El filtro de carrera es de una encuesta: arrastrarlo a otra dejaría
      // los resultados nuevos filtrados por una licenciatura al azar.
      setCarreraActiva(SIN_FILTRO);
      setUltimaRespuesta(null);
      setFormPregunta(PREGUNTA_VACIA);
      setEditandoPregunta(null);
      // Siempre se entra por la pestaña de preguntas, aunque la última vez que
      // se abrió esta encuesta se terminó en resultados: reaparecer donde se
      // dejó sería raro al abrir desde la lista.
      setPestana('preguntas');
      setMetadatosSucios(false);
      setPreguntasPendientes(false);
      cargarDetalle(encuesta.id_encuesta);
      await refrescarSeleccion(encuesta.id_encuesta);
    },
    [cargarDetalle, refrescarSeleccion]
  );

  const abrirResultados = useCallback(
    async (encuesta) => {
      setSeleccion(encuesta);
      setVista('resultados');
      setDetalle(null);
      setCarreraActiva(SIN_FILTRO);
      setUltimaRespuesta(null);
      setMetadatosSucios(false);
      setPreguntasPendientes(false);
      setPestana('resultados');
      cargarResultados(encuesta.id_encuesta);
      await refrescarSeleccion(encuesta.id_encuesta);
    },
    [cargarResultados, refrescarSeleccion]
  );

  /**
   * Cambia la pestaña sin volver a la lista ni perder lo editado.
   *
   * Cambiar a resultados carga los agregados la primera vez; si ya estaban
   * cargados se conservan, porque volver a pedirlos en cada cambio de pestaña
   * son seis consultas de agregados por un viaje que el usuario no pidió.
   */
  const cambiarPestana = useCallback(
    (nueva) => {
      if (nueva === pestana) return;

      // El formulario de metadatos y los modales de pregunta viven en la vista
      // de preguntas. Si se cambia a resultados con algo a medias, todo eso se
      // desmonta y lo escrito se pierde; quien llama es responsable de haber
      // avisado antes.
      if (pestana === 'preguntas' && nueva === 'resultados') {
        setMetadatosSucios(false);
        setPreguntasPendientes(false);
      }

      setPestana(nueva);

      if (nueva === 'resultados' && !resultados && seleccion) {
        cargarResultados(seleccion.id_encuesta);
      }

      // Al revés también hace falta: entrando por "Resultados" el detalle viene
      // en null a propósito, y sin esto la pestaña de Preguntas abriría con el
      // error de "no se pudo cargar la encuesta".
      if (nueva === 'preguntas' && !detalle && seleccion) {
        cargarDetalle(seleccion.id_encuesta);
      }
    },
    [pestana, resultados, detalle, seleccion, cargarResultados, cargarDetalle]
  );

  // --- encuesta ---

  const crear = useCallback(async () => {
    if (!formNueva.titulo.trim()) {
      setErrorFeedback('El título es obligatorio');
      return null;
    }

    setEnviando(true);

    try {
      const nueva = await encuestaService.crear({
        titulo: formNueva.titulo,
        descripcion: formNueva.descripcion,
        fecha_inicio: formNueva.fecha_inicio,
        fecha_fin: formNueva.fecha_fin,
      });

      setFormNueva(ENCUESTA_VACIA);
      await cargarLista();
      avisar('Encuesta creada. Ya puedes agregar sus preguntas.');
      setSeleccion(nueva);
      setVista('editor');
      await cargarDetalle(nueva.id_encuesta);
      return nueva;
    } catch (err) {
      setErrorFeedback(err.message);
      return null;
    } finally {
      setEnviando(false);
    }
  }, [formNueva, cargarLista, avisar, cargarDetalle, setErrorFeedback]);

  // El formulario se recibe como argumento, no se lee de `detalle`. `detalle` es
  // lo que devolvió el servidor en la última carga, así que leerlo aquí mandaba
  // los valores viejos: el select de estado escribía en el borrador local pero el
  // PUT enviaba el estado previo y el servidor lo reescribía con COALESCE,
  // dejando el panel como estaba. Todos los campos del formulario sufrían lo mismo.
  const guardarMetadatos = useCallback(async (formulario) => {
    if (!seleccion) return;

    // Publicar sin preguntas no lo bloquea el backend (pendiente #4 de
    // docs/pbi-10-pendientes-backend.md). La comprobación vive aquí y no sólo en
    // el botón del editor para que ninguna otra vía de guardado --una tecla, un
    // acceso directo, o el botón del futuro que alguien añada-- pueda mandar
    // ese PUT. Se lee `detalle.preguntas`, que es lo que el backend acaba de
    // devolver, en lugar del conteo de la fila del listado.
    const sinPreguntas = (detalle?.preguntas?.length ?? 0) === 0;

    if (formulario.estado === ESTADO_ENCUESTA.PUBLICADA && sinPreguntas) {
      setErrorFeedback('No se puede publicar una encuesta sin preguntas');
      return;
    }

    setEnviando(true);

    try {
      const actualizada = await encuestaService.actualizar(seleccion.id_encuesta, {
        titulo: formulario.titulo,
        descripcion: formulario.descripcion,
        mensaje_agradecimiento: formulario.mensaje_agradecimiento,
        estado: formulario.estado,
        fecha_inicio: formulario.fecha_inicio,
        fecha_fin: formulario.fecha_fin,
      });

      // El detalle se reemplaza por lo que devolvió el servidor, no por el form:
      // las fechas hacen round-trip por UTC y es fácil que difieran un día.
      setDetalle((anterior) => ({ ...anterior, ...actualizada }));
      await cargarLista();
      avisar('Encuesta actualizada');
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setEnviando(false);
    }
  }, [seleccion, detalle, cargarLista, avisar, setErrorFeedback]);

  // El id llega por parámetro, no se toma de `seleccion`: el borrado se dispara
  // desde la fila de la lista, y ahí `seleccion` puede ser null o ser otra
  // encuesta. Con `seleccion` el botón "Eliminar" fallaba en silencio.
  const eliminar = useCallback(async (idEncuesta) => {
    // La misma regla que decide el botón en la lista: una encuesta con respuestas
    // no se borra... salvo en borrador, donde el backend descarta esas respuestas
    // antes de borrar la encuesta (son residuo de una prueba: un borrador no
    // recibe respuestas por su enlace). Aquí se replica la regla por si el borrado
    // se dispara por otra vía; el backend responde 409 si se cuela una
    // publicada/cerrada con respuestas.
    const fila = lista.find((e) => e.id_encuesta === idEncuesta);

    if (fila && fila.estado !== 'borrador' && fila.total_respuestas > 0) {
      setErrorFeedback(
        'Esta encuesta ya tiene respuestas, así que no se puede borrar. Ciérrala para que deje de recibir respuestas.'
      );
      return;
    }

    setEnviando(true);

    try {
      await encuestaService.eliminar(idEncuesta);
      await cargarLista();
      volverALista();
      avisar('Encuesta eliminada');
    } catch (err) {
      // El 409 llega si una publicada/cerrada con respuestas se coló entre los
      // filtros; no se descartan respuestas fuera de un borrador. El mensaje ya
      // viene útil del backend.
      setErrorFeedback(
        err.status === 500
          ? 'No se pudo borrar. Si la encuesta ya tiene respuestas, ciérrala en lugar de borrarla.'
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  }, [lista, cargarLista, volverALista, avisar, setErrorFeedback]);

  /**
   * Cambiar el estado (publicar, cerrar) sin perder los otros campos.
   *
   * `PUT /admin/:id` sólo protege con COALESCE el título y el estado:
   * descripcion, mensaje_agradecimiento y las dos fechas son asignación directa,
   * así que si no llegan se borran. Por eso aquí no se manda "el estado y ya" sino
   * el objeto completo.
   *
   * El objeto de referencia sale de `detalle` cuando está cargado (el editor lo
   * tiene). Desde resultados `detalle` es null, y la fila de la lista no trae
   * `mensaje_agradecimiento`, así que se pide una lectura antes de escribir: sin
   * ella, cerrar una encuesta le vaciaría la descripción y el agradecimiento.
   */
  const aplicarEstado = useCallback(
    async (idEncuesta, nuevoEstado) => {
      setEnviando(true);

      try {
        const base =
          detalle?.id_encuesta === idEncuesta
            ? detalle
            : (await encuestaService.obtener(idEncuesta));

        await encuestaService.actualizar(idEncuesta, {
          titulo: base.titulo,
          descripcion: base.descripcion,
          mensaje_agradecimiento: base.mensaje_agradecimiento,
          // Las fechas van tal cual vinieron (ISO). `validarFechas` las vuelve a
          // pasar por `new Date`, y reenviar el mismo valor evita que un simple
          // cambio de estado las mueva de día por el viaje de UTC.
          fecha_inicio: base.fecha_inicio,
          fecha_fin: base.fecha_fin,
          estado: nuevoEstado,
        });

        await cargarLista();

        // El detalle se refresca con la misma lectura para que el editor no siga
        // mostrando el estado anterior.
        if (detalle?.id_encuesta === idEncuesta) {
          setDetalle(await encuestaService.obtener(idEncuesta));
        }

        avisar(nuevoEstado === 'cerrada' ? 'Encuesta cerrada' : 'Encuesta actualizada');
      } catch (err) {
        setErrorFeedback(err.message);
      } finally {
        setEnviando(false);
      }
    },
    [detalle, cargarLista, avisar, setErrorFeedback]
  );

  // --- preguntas ---

  const guardarPregunta = useCallback(async () => {
    if (!formPregunta.texto.trim()) {
      setErrorFeedback('El texto de la pregunta es obligatorio');
      return false;
    }

    setEnviando(true);

    try {
      if (editandoPregunta) {
        // El tipo NO se manda al editar, y las opciones tampoco: van en su propio
        // endpoint. El backend ignora el tipo a propósito (cambiarlo dejaría la
        // pregunta sin opciones), pero mandarlo sería confiar en que un campo
        // se ignora. Se arma el payload a mano para que quede claro qué se envía.
        await encuestaService.actualizarPregunta(editandoPregunta, {
          texto: formPregunta.texto,
          ayuda: formPregunta.ayuda,
          es_obligatoria: formPregunta.es_obligatoria,
          escala_min: formPregunta.tipo === 'escala' ? Number(formPregunta.escala_min) : null,
          escala_max: formPregunta.tipo === 'escala' ? Number(formPregunta.escala_max) : null,
          escala_min_texto:
            formPregunta.tipo === 'escala' ? formPregunta.escala_min_texto : null,
          escala_max_texto:
            formPregunta.tipo === 'escala' ? formPregunta.escala_max_texto : null,
        });

        // Las opciones también se guardan al editar: van en su propio endpoint
        // (que reemplaza la lista completa) y sólo se mandan si algo cambió,
        // comparando contra lo que trae `detalle`. Sin esto, lo que se escribía
        // en el editor de opciones del modal se descartaba al cerrar, y la
        // única vía real era el botón de opciones de la lista.
        if (TIPOS_CON_OPCIONES.includes(formPregunta.tipo)) {
          const origen = detalle?.preguntas?.find((p) => p.id_pregunta === editandoPregunta);
          const previas = (origen?.opciones ?? []).map((o) => o.texto);
          const sinCambios =
            previas.length === formPregunta.opciones.length &&
            previas.every((t, i) => t === formPregunta.opciones[i]);

          if (!sinCambios) {
            await encuestaService.actualizarOpciones(editandoPregunta, formPregunta.opciones);
          }
        }

        avisar('Pregunta actualizada');
      } else {
        // Los valores de la escala llegan como string desde el <input type="number">
        // y el backend exige enteros con Number.isInteger, así que un "5" textual
        // se rechazaría con 400. Se convierten aquí.
        const escalaEsNumero =
          formPregunta.tipo === 'escala'
            ? {
                escala_min: Number(formPregunta.escala_min),
                escala_max: Number(formPregunta.escala_max),
                escala_min_texto: formPregunta.escala_min_texto,
                escala_max_texto: formPregunta.escala_max_texto,
              }
            : { escala_min: null, escala_max: null, escala_min_texto: null, escala_max_texto: null };

        await encuestaService.crearPregunta(seleccion.id_encuesta, {
          texto: formPregunta.texto,
          ayuda: formPregunta.ayuda,
          tipo: formPregunta.tipo,
          es_obligatoria: formPregunta.es_obligatoria,
          opciones: TIPOS_CON_OPCIONES.includes(formPregunta.tipo)
            ? formPregunta.opciones
            : undefined,
          ...escalaEsNumero,
        });
        avisar('Pregunta agregada');
      }

      setFormPregunta(PREGUNTA_VACIA);
      setEditandoPregunta(null);
      await cargarDetalle(seleccion.id_encuesta);
      // El booleano le dice al modal si ya puede cerrarse. Antes no devolvía nada
      // y el modal cerraba también cuando el guardado había fallado, con lo que
      // el admin perdía lo que había escrito.
      return true;
    } catch (err) {
      setErrorFeedback(err.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }, [formPregunta, editandoPregunta, detalle, seleccion, cargarDetalle, avisar, setErrorFeedback]);

  const eliminarPregunta = useCallback(
    async (idPregunta) => {
      setEnviando(true);

      try {
        await encuestaService.eliminarPregunta(idPregunta);
        await cargarDetalle(seleccion.id_encuesta);
        avisar('Pregunta eliminada');
      } catch (err) {
        setErrorFeedback(err.message);
      } finally {
        setEnviando(false);
      }
    },
    [seleccion, cargarDetalle, avisar, setErrorFeedback]
  );

  // Crea una copia exacta de la pregunta (texto, ayuda, escala y opciones) y
  // la inserta justo debajo del original. Usa el mismo endpoint de creación
  // que el formulario, así que respeta el máximo de preguntas y la unicidad
  // de licenciatura con sus mensajes de error tal cual. El reordenamiento va
  // en su propio try: si falla, la copia ya existe (queda al final) y se avisa
  // del problema sin tirar la duplicación.
  const duplicarPregunta = useCallback(
    async (pregunta) => {
      setEnviando(true);

      try {
        const { id_pregunta } = await encuestaService.crearPregunta(seleccion.id_encuesta, {
          texto: pregunta.texto,
          ayuda: pregunta.ayuda,
          tipo: pregunta.tipo,
          es_obligatoria: pregunta.es_obligatoria,
          opciones: TIPOS_CON_OPCIONES.includes(pregunta.tipo)
            ? (pregunta.opciones ?? []).map((o) => o.texto)
            : undefined,
          escala_min: pregunta.tipo === 'escala' ? pregunta.escala_min : null,
          escala_max: pregunta.tipo === 'escala' ? pregunta.escala_max : null,
          escala_min_texto: pregunta.tipo === 'escala' ? pregunta.escala_min_texto : null,
          escala_max_texto: pregunta.tipo === 'escala' ? pregunta.escala_max_texto : null,
        });

        try {
          const ids = (detalle?.preguntas ?? []).map((p) => p.id_pregunta);
          const posicion = ids.indexOf(pregunta.id_pregunta);
          if (posicion !== -1) {
            ids.splice(posicion + 1, 0, id_pregunta);
            await encuestaService.reordenarPreguntas(seleccion.id_encuesta, ids);
          }
        } catch (errOrden) {
          setErrorFeedback(errOrden.message);
        }

        avisar('Pregunta duplicada');
        await cargarDetalle(seleccion.id_encuesta);
      } catch (err) {
        // Máximo de preguntas o licenciatura repetida: el backend lo explica.
        setErrorFeedback(err.message);
      } finally {
        setEnviando(false);
      }
    },
    [detalle, seleccion, cargarDetalle, avisar, setErrorFeedback]
  );

  // El filtro se aplica en el cliente y no en la URL porque la lista son todas
  // las encuestas del sistema: son pocas y ya vienen cargadas, así que filtrar
  // en el servidor sería un request extra por cada clic en el filtro.
  const listaFiltrada = filtro
    ? lista.filter((e) => e.estado === filtro)
    : lista;

  // --- orden de las preguntas ---

  const moverPregunta = useCallback(
    async (indice, delta) => {
      const preguntas = detalle?.preguntas;
      if (!preguntas) return;

      const destino = indice + delta;
      if (destino < 0 || destino >= preguntas.length) return;

      // Se mueve en una copia y se pinta antes de llamar al servidor. El orden es
      // cosmético y la operación es una sola llamada, así que esperar el round
      // trip para mover un renglón se siente lento. Si el backend rechaza, el
      // catch recarga el detalle y la lista vuelve a la posición buena.
      const ids = preguntas.map((p) => p.id_pregunta);
      const [idMovido] = ids.splice(indice, 1);
      ids.splice(destino, 0, idMovido);

      const preguntasOptimistas = [...preguntas];
      const [preguntaMovida] = preguntasOptimistas.splice(indice, 1);
      preguntasOptimistas.splice(destino, 0, preguntaMovida);

      setDetalle({ ...detalle, preguntas: preguntasOptimistas });

      setEnviando(true);

      try {
        await encuestaService.reordenarPreguntas(seleccion.id_encuesta, ids);
      } catch (err) {
        setErrorFeedback(err.message);
        await cargarDetalle(seleccion.id_encuesta);
      } finally {
        setEnviando(false);
      }
    },
    [detalle, seleccion, cargarDetalle, setErrorFeedback]
  );

  return {
    vista,
    setVista,
    volverALista,

    // Pestaña activa de la encuesta abierta y su cambio. Cambiar de pestaña no
    // vuelve a la lista ni recarga el detalle.
    pestana,
    cambiarPestana,

    // El editor de metadatos reporta acá si el formulario tiene cambios sin
    // guardar, para poder avisar antes de cambiar de pestaña y desmontarlo.
    metadatosSucios,
    setMetadatosSucios,
    preguntasPendientes,
    setPreguntasPendientes,

    // Rol y capacidad de escritura. Rectoría entra al panel pero sólo lee:
    // el backend le da acceso de lectura a las encuestas y no de escritura.
    esAdmin,

    // Refresca la encuesta abierta contra el servidor. Se usa al entrar al
    // editor o a resultados, para no decidir con un conteo viejo.
    refrescarSeleccion,

    filtro,
    setFiltro,
    lista: listaFiltrada,
    totalLista: lista.length,
    cargandoLista,
    errorLista,
    cargarLista,

    seleccion,
    detalle,
    cargandoDetalle,
    enviando,

    // Una encuesta con respuestas ya no es un borrador: su estructura queda
    // congelada en el panel porque el backend sólo bloquea a medias (deja
    // editar el texto de la pregunta y deja publicar sin preguntas).
    //
    // Sale de `seleccion`, que `abrirEditor` y `abrirResultados` resincronizan
    // con el servidor antes de llegar aquí, así que no es el conteo de cuando se
    // cargó la lista. Y sale de la fila de la lista porque ni `GET /admin/:id`
    // (que sí trae detalle y preguntas) ni nada más barato expone el conteo.
    tieneRespuestas: (seleccion?.total_respuestas ?? 0) > 0,

    resultados,
    cargandoResultados,
    abrirResultados,
    abrirEditor,

    // Recarga los agregados de la encuesta abierta. La usa el panel de
    // resultados después de cerrar, porque el estado del badge y de la vigencia
    // salen de la misma respuesta y si no se recarga quedarían diciendo
    // "Publicada" con el enlace ya dead.
    cargarResultados,

    // Filtro de carrera y fecha de la respuesta más reciente. El filtro vive
    // aquí porque el sondeo de tiempo real lo necesita para comparar totales
    // del mismo ámbito; el panel sólo los consume para pintar.
    carreraActiva,
    setCarreraActiva,
    ultimaRespuesta,

    formNueva,
    setFormNueva,
    crear,

    guardarMetadatos,
    aplicarEstado,
    eliminar,

    formPregunta,
    setFormPregunta,
    editandoPregunta,
    setEditandoPregunta,
    guardarPregunta,
    eliminarPregunta,
    duplicarPregunta,
    moverPregunta,

    feedback,
    errorFeedback,
    setErrorFeedback,
  };
}
