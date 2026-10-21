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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { encuestaService } from '../services/encuesta.service';
import { ESTADO_GUARDADO, TIPOS_CON_OPCIONES } from '../constants/encuesta';
import { ESTADO_ENCUESTA } from '../constants/estatus';
import { ROL_ADMIN } from '../constants/roles';
import { aInputDateTime } from '../utils/encuesta';
import { useFeedback } from './useFeedback';

// Filtro de la lista. `null` = todas.
const SIN_FILTRO = null;

// Cadencia del sondeo de respuestas nuevas en el panel de resultados
// (6-8 segundos pedidos: 7 queda en medio). Sólo consulta el total; el panel
// completo se recarga únicamente si ese total cambió.
const CHEQUEO_MS = 7000;

// Estados del guardado del formulario de la encuesta.
//
// `inactivo`  → nada que guardar (o ya se guardó y no se volvió a tocar).
// `pendiente` → hay cambios sin guardar.
// `guardando` → viaje al servidor en curso.
// `guardado`  → el servidor confirmó.
// `error`     → el servidor rechazó: el formulario sigue intacto y se puede
//                reintentar.
//
// La tabla vive en `constants/encuesta.js` para que la barra y el hook
// compartan los mismos nombres sin que uno dependa del otro.

const ENCUESTA_VACIA = {
  titulo: '',
  descripcion: '',
  mensaje_agradecimiento: '',
  estado: ESTADO_ENCUESTA.BORRADOR,
  fecha_inicio: '',
  fecha_fin: '',
};

// La encuesta nueva se crea siempre en borrador (lo decide el backend) y sólo
// lleva título, descripción y ventana de vigencia, así que su formulario
// vacío no comparte campos con el de edición.
const ENCUESTA_NUEVA_VACIA = {
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
};

/**
 * El formulario de la encuesta tal como lo ve el admin.
 *
 * Vive aquí y no en un componente a propósito: las pestañas (Preguntas,
 * Resultados, Configuración) se montan y desmontan al cambiar, así que si el
 * formulario viviera en el componente de la pestaña de Preguntas, cambiar de
 * pestaña borraría lo que estaba a medio escribir. Con el estado en el hook,
 * cambiar de pestaña no toca nada y las dos pestañas escriben en el mismo
 * objeto.
 */
function formDesdeDetalle(detalle) {
  return {
    titulo: detalle.titulo ?? '',
    descripcion: detalle.descripcion ?? '',
    mensaje_agradecimiento: detalle.mensaje_agradecimiento ?? '',
    estado: detalle.estado ?? ESTADO_ENCUESTA.BORRADOR,
    fecha_inicio: aInputDateTime(detalle.fecha_inicio),
    fecha_fin: aInputDateTime(detalle.fecha_fin),
  };
}

const PREGUNTA_VACIA = {
  texto: '',
  ayuda: '',
  tipo: 'texto_corto',
  es_obligatoria: false,
  escala_min: 0,
  escala_max: 5,
  escala_min_texto: '',
  escala_max_texto: '',
  // Las opciones son objetos con su texto y la marca de la opción especial
  // «Otro» (`es_otro`). Antes eran sólo textos: la marca es lo que permite
  // distinguir la opción especial de una opción normal escrita a mano como
  // «Otro».
  opciones: [
    { texto: '', es_otro: false },
    { texto: '', es_otro: false },
  ],
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

  // Pestaña activa dentro de la encuesta abierta: 'preguntas', 'resultados' o
  // 'configuracion'. Vive aquí y no en el componente porque tiene que sobrevivir
  // a que la vista siga siendo 'editor': cambiar de pestaña no es cambiar de
  // `vista`.
  const [pestana, setPestana] = useState('preguntas');

  // --- formulario de la encuesta ---
  //
  // Es la única fuente de estado del formulario: lo escriben la pestaña de
  // Preguntas (título y descripción) y la de Configuración (agradecimiento y
  // fechas) y lo guarda la barra de la cabecera. Que esté aquí es lo que
  // permite cambiar de pestaña sin perder lo escrito.
  const [formEncuesta, setFormEncuesta] = useState(ENCUESTA_VACIA);

  // Estado del guardado: pendiente, guardando, guardado o error.
  const [estadoGuardado, setEstadoGuardado] = useState(ESTADO_GUARDADO.INACTIVO);
  const [errorGuardado, setErrorGuardado] = useState(null);

  // --- edición de preguntas dentro del listado ---
  //
  // La pregunta en edición ya no vive en un modal sino en su propia tarjeta, y
  // el estado de esa edición vive aquí (y no en el componente) por dos razones:
  // cambiar de pestaña no puede perder lo escrito, y la barra de la cabecera
  // necesita poder resolver la edición antes de guardar o publicar la
  // encuesta.
  //
  // `modoEdicion` distingue las dos situaciones:
  //   'nueva'      → tarjeta en borrador al final del listado, sin persistir.
  //   'existente'  → tarjeta de una pregunta ya guardada, abierta para editar.
  //   null         → no hay ninguna tarjeta en edición.
  //
  // `borradorModificado` es lo que separa "tarjeta abierta" de "borrador
  // modificado": abrir una pregunta existente sin tocarla no marca cambios sin
  // guardar ni provoca ninguna petición al guardar la encuesta.
  const [modoEdicion, setModoEdicion] = useState(null);
  const [preguntaEnEdicionId, setPreguntaEnEdicionId] = useState(null);
  const [preguntaEliminando, setPreguntaEliminando] = useState(null);

  // Id de la pregunta recién guardada. El editor de preguntas lo usa para
  // dejar el foco en ella, que es lo que se espera al terminar de escribir una.
  const [preguntaEnFoco, setPreguntaEnFoco] = useState(null);

  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);

  // Encuesta abierta en el editor o en resultados, con su detalle.
  const [seleccion, setSeleccion] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [formNueva, setFormNueva] = useState(ENCUESTA_NUEVA_VACIA);
  const [formPregunta, setFormPregunta] = useState(PREGUNTA_VACIA);

  // Copia del borrador tal como se abrió, para poder saber si el admin lo
  // cambió. Es lo que permite abrir una pregunta sin marcarla como pendiente.
  const [formPreguntaOriginal, setFormPreguntaOriginal] = useState(PREGUNTA_VACIA);

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

  // Carga el detalle de una encuesta.
  //
  // `recargarFormulario` decide si además se llena el formulario con lo que
  // vino del servidor. Sólo se rellena al abrir una encuesta: agregar o
  // reordenar una pregunta también recarga el detalle y, si el formulario se
  // recargara ahí, se perdería el título a medio escribir.
  const cargarDetalle = useCallback(
    async (id, { recargarFormulario = false } = {}) => {
      setCargandoDetalle(true);

      try {
        const datos = await encuestaService.obtener(id);
        setDetalle(datos);

        if (recargarFormulario) {
          setFormEncuesta(formDesdeDetalle(datos));
          setEstadoGuardado(ESTADO_GUARDADO.INACTIVO);
          setErrorGuardado(null);
        }
      } catch (err) {
        setErrorFeedback(err.message);
      } finally {
        setCargandoDetalle(false);
      }
    },
    [setErrorFeedback]
  );

  // ¿Hay cambios sin guardar? Se compara contra lo que devolvió el servidor,
  // que es la referencia real: el formulario es lo que el admin está editando y
  // `detalle` lo que está guardado.
  const formularioSucio = useMemo(() => {
    if (!detalle) return false;

    return (
      formEncuesta.titulo !== (detalle.titulo ?? '') ||
      formEncuesta.descripcion !== (detalle.descripcion ?? '') ||
      formEncuesta.mensaje_agradecimiento !== (detalle.mensaje_agradecimiento ?? '') ||
      formEncuesta.estado !== detalle.estado ||
      formEncuesta.fecha_inicio !== aInputDateTime(detalle.fecha_inicio) ||
      formEncuesta.fecha_fin !== aInputDateTime(detalle.fecha_fin)
    );
  }, [formEncuesta, detalle]);

  // Escribir en el formulario. Cada cambio devuelve el estado de guardado a
  // "pendiente": en cuanto el admin toca algo, deja de tener sentido decir que
  // está guardado.
  const actualizarFormulario = useCallback((cambio) => {
    setFormEncuesta((anterior) => ({
      ...anterior,
      ...(typeof cambio === 'function' ? cambio(anterior) : cambio),
    }));

    setEstadoGuardado((anterior) =>
      anterior === ESTADO_GUARDADO.GUARDANDO ? anterior : ESTADO_GUARDADO.PENDIENTE
    );
    setErrorGuardado(null);
  }, []);

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
    setModoEdicion(null);
    setPreguntaEnEdicionId(null);
    setFormPreguntaOriginal(PREGUNTA_VACIA);
    setFormEncuesta(ENCUESTA_VACIA);
     setEstadoGuardado(ESTADO_GUARDADO.INACTIVO);
    setErrorGuardado(null);
    setPreguntaEliminando(null);
    setPreguntaEnFoco(null);
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
      setFormPreguntaOriginal(PREGUNTA_VACIA);
      setModoEdicion(null);
      setPreguntaEnEdicionId(null);
      // El formulario se vuelve a llenar con lo que traiga el servidor: si se
      // entrara con el formulario de la encuesta anterior, se editaría a ciegas.
       setEstadoGuardado(ESTADO_GUARDADO.INACTIVO);
      setErrorGuardado(null);
      // Siempre se entra por la pestaña de preguntas, aunque la última vez que
      // se abrió esta encuesta se terminó en resultados: reaparecer donde se
      // dejó sería raro al abrir desde la lista.
      setPestana('preguntas');
      setPreguntaEliminando(null);
      setPreguntaEnFoco(null);
      cargarDetalle(encuesta.id_encuesta, { recargarFormulario: true });
      await refrescarSeleccion(encuesta.id_encuesta);
    },
    [cargarDetalle, refrescarSeleccion]
  );

  // Abrir los resultados es entrar al editor con la pestaña de resultados
  // abierta. Antes era una pantalla aparte; ahora es la misma pantalla con
  // otra pestaña, para que el admin vea siempre el nombre de la encuesta y
  // tenga la misma barra de acciones (vista previa, compartir) sin importar en
  // qué pestaña esté.
  const abrirResultados = useCallback(
    async (encuesta) => {
      setSeleccion(encuesta);
      setVista('editor');
      setCarreraActiva(SIN_FILTRO);
      setUltimaRespuesta(null);
      setModoEdicion(null);
      setPreguntaEnEdicionId(null);
      setFormPreguntaOriginal(PREGUNTA_VACIA);
      setPreguntaEliminando(null);
      setPreguntaEnFoco(null);
       setEstadoGuardado(ESTADO_GUARDADO.INACTIVO);
      setErrorGuardado(null);
      setPestana('resultados');
      cargarDetalle(encuesta.id_encuesta, { recargarFormulario: true });
      cargarResultados(encuesta.id_encuesta);
      await refrescarSeleccion(encuesta.id_encuesta);
    },
    [cargarDetalle, cargarResultados, refrescarSeleccion]
  );


  /**
   * Cambia la pestaña sin volver a la lista ni perder lo editado.
   *
   * No hay nada que confirmar: el formulario vive en el hook (no en el
   * componente de la pestaña) y el modal de pregunta también, así que cambiar
   * de pestaña no desmonta nada de lo que el admin escribió.
   *
   * Cambiar a resultados carga los agregados la primera vez; si ya estaban
   * cargados se conservan, porque volver a pedirlos en cada cambio de pestaña
   * son seis consultas de agregados por un viaje que el usuario no pidió.
   */
  const cambiarPestana = useCallback(
    (nueva) => {
      if (nueva === pestana) return;

      setPestana(nueva);

      if (nueva === 'resultados' && !resultados && seleccion) {
        cargarResultados(seleccion.id_encuesta);
      }

      // Al revés también hace falta: entrando por "Resultados" el detalle viene
      // en null a propósito, y sin esto la pestaña de Preguntas abriría con el
      // error de "no se pudo cargar la encuesta".
      if ((nueva === 'preguntas' || nueva === 'configuracion') && !detalle && seleccion) {
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

      setFormNueva(ENCUESTA_NUEVA_VACIA);
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

  /**
   * Guarda el formulario de la encuesta.
   *
   * Devuelve `true` sólo cuando el servidor confirmó. Quien llama (la barra
   * del editor) usa ese booleano para no seguir adelante --publicar, por
   * ejemplo-- si el guardado falló.
   *
   * `opciones.estado` permite guardar con un estado distinto al del formulario
   * sin tocarlo: es lo que hace "Publicar" (guarda y publica en un solo viaje)
   * y lo que hace "Cerrar encuesta" (cierra conservando lo que se escribió).
   *
   * El formulario se lee del estado del hook y no de `detalle`: `detalle` es lo
   * que devolvió el servidor en la última carga, así que leerlo aquí mandaba
   * los valores viejos y el select de estado escribía en el formulario pero el
   * PUT enviaba el estado previo.
   */
  const guardarFormulario = useCallback(
    async (opciones = {}) => {
      if (!seleccion) return false;

      const estadoObjetivo = opciones.estado ?? formEncuesta.estado;

      // --- validaciones antes de gastar el viaje ---
      //
      // Se comprueban aquí y no sólo en el botón: cualquier vía de guardado
      // (el botón, un acceso directo, o la acción que se añada mañana) pasa
      // por esta función, así que ninguna puede saltarse las reglas.

      if (!formEncuesta.titulo.trim()) {
        setErrorGuardado('El título de la encuesta es obligatorio.');
        setEstadoGuardado(ESTADO_GUARDADO.ERROR);
        return false;
      }

      if (
        formEncuesta.fecha_inicio &&
        formEncuesta.fecha_fin &&
        formEncuesta.fecha_fin <= formEncuesta.fecha_inicio
      ) {
        setErrorGuardado('La fecha de cierre debe ser posterior a la de apertura.');
        setEstadoGuardado(ESTADO_GUARDADO.ERROR);
        return false;
      }

      // Publicar sin preguntas dejaría una encuesta que el alumno abre y no
      // tiene nada que contestar. El backend también lo rechaza, pero aquí se
      // dice antes para poder llevar al admin a donde se arregla.
      const totalPreguntas = detalle?.preguntas?.length ?? 0;

      if (estadoObjetivo === ESTADO_ENCUESTA.PUBLICADA && totalPreguntas === 0) {
        setErrorGuardado('No se puede publicar una encuesta sin preguntas.');
        setEstadoGuardado(ESTADO_GUARDADO.ERROR);
        return false;
      }

      // Reabrir una encuesta cerrada o vencida sin tocar `fecha_fin` deja el
      // enlace sirviendo un 410: el estado dice "publicada" pero el alumno lee
      // "Esta encuesta ya se cerró". Se pide una fecha nueva antes de guardar
      // en vez de dejar que el admin lo descubra cuando alguien abra el QR.
      //
      // El bloqueo es sólo para la reapertura: una encuesta que ya está
      // publicada y venció sola por su `fecha_fin` se puede seguir editando.
      const reabriendoVencida =
        estadoObjetivo === ESTADO_ENCUESTA.PUBLICADA &&
        detalle?.estado !== ESTADO_ENCUESTA.PUBLICADA &&
        Boolean(formEncuesta.fecha_fin) &&
        new Date(formEncuesta.fecha_fin).getTime() < Date.now();

      if (reabriendoVencida) {
        setErrorGuardado(
          'Para reabrirla necesita una fecha de cierre futura. Ponla en Configuración o quita la de cierre.'
        );
        setEstadoGuardado(ESTADO_GUARDADO.ERROR);
        return false;
      }

      setEnviando(true);
      setEstadoGuardado(ESTADO_GUARDADO.GUARDANDO);
      setErrorGuardado(null);

      try {
        const actualizada = await encuestaService.actualizar(seleccion.id_encuesta, {
          titulo: formEncuesta.titulo,
          descripcion: formEncuesta.descripcion,
          mensaje_agradecimiento: formEncuesta.mensaje_agradecimiento,
          estado: estadoObjetivo,
          fecha_inicio: formEncuesta.fecha_inicio,
          fecha_fin: formEncuesta.fecha_fin,
        });

        // El detalle se reemplaza por lo que devolvió el servidor, no por el
        // form: las fechas hacen round-trip por UTC y es fácil que difieran.
        setDetalle((anterior) => ({ ...anterior, ...actualizada }));
        // El formulario se realinea con lo que quedó guardado, para que el
        // estado "guardado" sea cierto y no una promesa.
        setFormEncuesta(formDesdeDetalle(actualizada));
        setEstadoGuardado(ESTADO_GUARDADO.GUARDADO);

        await cargarLista();
        avisar(
          estadoObjetivo === ESTADO_ENCUESTA.PUBLICADA
            ? 'Encuesta publicada'
            : 'Encuesta actualizada'
        );
        return true;
      } catch (err) {
        // El formulario no se toca: lo que escribió el admin se queda escrito
        // y se puede reintentar el guardado.
        setEstadoGuardado(ESTADO_GUARDADO.ERROR);
        setErrorGuardado(err.message);
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [seleccion, formEncuesta, detalle, cargarLista, avisar]
  );

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
          // El formulario se entera del cambio de estado: si no, el editor
          // compararía el estado del formulario contra el del servidor, lo
          // vería como un cambio sin guardar y ofrecería guardar algo que en
          // realidad ya está guardado.
          setFormEncuesta((anterior) => ({ ...anterior, estado: nuevoEstado }));
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

  // El borrador de una pregunta tal como se abre, para poder compararlo con
  // lo que el admin escribe y saber si hay algo pendiente de verdad.
  function borradorDesdePregunta(pregunta) {
    return {
      texto: pregunta.texto,
      ayuda: pregunta.ayuda ?? '',
      // El tipo se pinta pero no se manda: ver la nota del formulario.
      tipo: pregunta.tipo,
      es_obligatoria: pregunta.es_obligatoria,
      escala_min: pregunta.escala_min ?? 0,
      escala_max: pregunta.escala_max ?? 5,
      escala_min_texto: pregunta.escala_min_texto ?? '',
      escala_max_texto: pregunta.escala_max_texto ?? '',
      // La opción especial «Otro» conserva su marca: es lo que la
      // distingue de una opción normal escrita a mano.
      opciones: (pregunta.opciones ?? []).map((o) => ({
        texto: o.texto ?? '',
        es_otro: Boolean(o.es_otro),
      })),
    };
  }

  // Dos borradores son iguales si todo lo que se guarda coincide. La escala se
  // compara como texto porque el input es de texto y el backend lo recibe
  // como número.
  function borradoresIguales(a, b) {
    if (!a || !b) return false;

    return (
      a.texto === b.texto &&
      a.ayuda === b.ayuda &&
      a.tipo === b.tipo &&
      Boolean(a.es_obligatoria) === Boolean(b.es_obligatoria) &&
      String(a.escala_min) === String(b.escala_min) &&
      String(a.escala_max) === String(b.escala_max) &&
      a.escala_min_texto === b.escala_min_texto &&
      a.escala_max_texto === b.escala_max_texto &&
      a.opciones.length === b.opciones.length &&
      a.opciones.every(
        (o, i) =>
          o.texto === b.opciones[i].texto &&
          Boolean(o.es_otro) === Boolean(b.opciones[i].es_otro)
      )
    );
  }

  // Abrir una tarjeta nueva (en blanco) al final del listado.
  const abrirNuevaPregunta = useCallback(() => {
    setModoEdicion('nueva');
    setPreguntaEnEdicionId(null);
    setFormPregunta(PREGUNTA_VACIA);
    setFormPreguntaOriginal(PREGUNTA_VACIA);
  }, []);

  // Expandir la tarjeta de una pregunta existente.
  const abrirEdicionPregunta = useCallback((pregunta) => {
    const borrador = borradorDesdePregunta(pregunta);

    setModoEdicion('existente');
    setPreguntaEnEdicionId(pregunta.id_pregunta);
    setFormPregunta(borrador);
    setFormPreguntaOriginal(borrador);
  }, []);

  // Descartar la edición en curso. Si la tarjeta era nueva y no se confirmó,
  // desaparece del listado: nunca llegó a persistirse.
  const cancelarEdicion = useCallback(() => {
    setModoEdicion(null);
    setPreguntaEnEdicionId(null);
    setFormPregunta(PREGUNTA_VACIA);
    setFormPreguntaOriginal(PREGUNTA_VACIA);
  }, []);

  // ¿Hay algo de verdad pendiente? Abrir una tarjeta sin tocarla no cuenta:
  // no hay nada que guardar ni que perder.
  const borradorModificado = useMemo(
    () => !borradoresIguales(formPregunta, formPreguntaOriginal),
    [formPregunta, formPreguntaOriginal]
  );

  // Pendiente = una edición con contenido. Es lo que la barra resuelve antes
  // de guardar la encuesta y lo que avisa antes de abandonar el editor.
  const edicionPendiente = modoEdicion !== null && borradorModificado;

  const guardarPregunta = useCallback(async () => {
    if (!formPregunta.texto.trim()) {
      setErrorFeedback('El texto de la pregunta es obligatorio');
      return false;
    }

    setEnviando(true);

    try {
      let idGuardada = null;
      const editando = modoEdicion === 'existente' && preguntaEnEdicionId !== null;

      if (editando) {
        // El tipo NO se manda al editar, y las opciones tampoco: van en su propio
        // endpoint. El backend ignora el tipo a propósito (cambiarlo dejaría la
        // pregunta sin opciones), pero mandarlo sería confiar en que un campo
        // se ignora. Se arma el payload a mano para que quede claro qué se envía.
        await encuestaService.actualizarPregunta(preguntaEnEdicionId, {
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
          const origen = detalle?.preguntas?.find((p) => p.id_pregunta === preguntaEnEdicionId);
          const previas = (origen?.opciones ?? []).map((o) => ({
            texto: o.texto ?? '',
            es_otro: Boolean(o.es_otro),
          }));
          const sinCambios =
            previas.length === formPregunta.opciones.length &&
            previas.every(
              (o, i) =>
                o.texto === formPregunta.opciones[i].texto &&
                o.es_otro === Boolean(formPregunta.opciones[i].es_otro)
            );

          if (!sinCambios) {
            await encuestaService.actualizarOpciones(preguntaEnEdicionId, formPregunta.opciones);
          }
        }

        idGuardada = preguntaEnEdicionId;
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

        const creada = await encuestaService.crearPregunta(seleccion.id_encuesta, {
          texto: formPregunta.texto,
          ayuda: formPregunta.ayuda,
          tipo: formPregunta.tipo,
          es_obligatoria: formPregunta.es_obligatoria,
          opciones: TIPOS_CON_OPCIONES.includes(formPregunta.tipo)
            ? formPregunta.opciones
            : undefined,
          ...escalaEsNumero,
        });

        idGuardada = creada?.id_pregunta ?? null;
        avisar('Pregunta agregada');
      }

      // La edición se cierra aquí, no cuando se guarda la encuesta: si la
      // pregunta quedó guardada pero la encuesta falla después, la pregunta ya
      // está en el servidor y reintentar no puede crear una segunda copia.
      setModoEdicion(null);
      setPreguntaEnEdicionId(null);
      setFormPregunta(PREGUNTA_VACIA);
      setFormPreguntaOriginal(PREGUNTA_VACIA);
      // El error anterior era de este guardado: se limpia para que la tarjeta
      // no lo siga mostrando ya resuelto.
      setErrorFeedback(null);

      await cargarDetalle(seleccion.id_encuesta);
      // La pregunta recién guardada recibe el foco: al terminar de escribir una
      // pregunta lo natural es seguir con ella, no con el botón de agregar.
      setPreguntaEnFoco(idGuardada);
      // El booleano le dice a la tarjeta si ya puede cerrarse. Antes no devolvía
      // nada y se cerraba también cuando el guardado había fallado, con lo que
      // el admin perdía lo que había escrito.
      return true;
    } catch (err) {
      setErrorFeedback(err.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }, [formPregunta, modoEdicion, preguntaEnEdicionId, detalle, seleccion, cargarDetalle, avisar, setErrorFeedback]);

  // Resolver la edición en curso (crear o actualizar la tarjeta abierta).
  //
  // Lo usa la barra de la cabecera antes de guardar o publicar la encuesta:
  // una pregunta en edición no se puede quedar sin aplicar, y la encuesta no
  // puede decir "guardada" mientras esa pregunta siga sin guardar.
  //
  // Si no hay nada pendiente, no se hace ninguna petición: abrir una tarjeta
  // sin tocarla no puede generar un PUT de más.
  const aplicarEdicion = useCallback(async () => {
    if (modoEdicion === null) return true;
    if (!borradorModificado) return true;

    return guardarPregunta();
  }, [modoEdicion, borradorModificado, guardarPregunta]);

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
          // La copia lleva su propia marca de «Otro»: el backend crea ids
          // nuevos para las opciones, así que la copia no reutiliza los de la
          // original.
          opciones: TIPOS_CON_OPCIONES.includes(pregunta.tipo)
            ? (pregunta.opciones ?? []).map((o) => ({
                texto: o.texto ?? '',
                es_otro: Boolean(o.es_otro),
              }))
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

    // --- formulario de la encuesta ---
    //
    // Una sola fuente de estado para el formulario: lo escriben las pestañas de
    // Preguntas y de Configuración y lo guarda la barra de la cabecera.
    formEncuesta,
    actualizarFormulario,
    formularioSucio,
    estadoGuardado,
    errorGuardado,
    guardarFormulario,

    // Hay algo a medias (un modal de pregunta abierto) que se perdería al
    // abandonar el editor.

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

    aplicarEstado,
    eliminar,

    // --- edición de preguntas en las tarjetas ---
    //
    // `modoEdicion` es 'nueva', 'existente' o null. `borradorModificado` dice
    // si lo escrito difiere de lo que se abrió: abrir una tarjeta sin tocarla
    // no es un cambio pendiente.
    formPregunta,
    setFormPregunta,
    modoEdicion,
    preguntaEnEdicionId,
    borradorModificado,
    edicionPendiente,
    abrirNuevaPregunta,
    abrirEdicionPregunta,
    cancelarEdicion,
    aplicarEdicion,
    preguntaEliminando,
    setPreguntaEliminando,
    preguntaEnFoco,
    setPreguntaEnFoco,
    guardarPregunta,
    eliminarPregunta,
    duplicarPregunta,
    moverPregunta,

    feedback,
    errorFeedback,
    setErrorFeedback,
  };
}
