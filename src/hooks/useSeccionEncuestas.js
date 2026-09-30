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
import { useFeedback } from './useFeedback';

// Filtro de la lista. `null` = todas.
const SIN_FILTRO = null;

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
  es_visible: true,
  escala_min: 0,
  escala_max: 5,
  escala_min_texto: '',
  escala_max_texto: '',
  opciones: ['', ''],
};

export function useSeccionEncuestas(setFeedbackExterno) {
  const { feedback, setFeedback, errorFeedback, setErrorFeedback } = useFeedback();

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

  // --- carga ---

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    setErrorLista(null);

    try {
      setLista(await encuestaService.listar());
    } catch (err) {
      setErrorLista(err.message);
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

  const cargarResultados = useCallback(async (id) => {
    setCargandoResultados(true);
    setResultados(null);

    try {
      setResultados(await encuestaService.obtenerResultados(id));
    } catch (err) {
      setErrorFeedback(err.message);
    } finally {
      setCargandoResultados(false);
    }
  }, [setErrorFeedback]);

  // --- navegación ---

  const volverALista = useCallback(() => {
    setVista('lista');
    setSeleccion(null);
    setDetalle(null);
    setResultados(null);
    setEditandoPregunta(null);
  }, []);

  const abrirEditor = useCallback(
    (encuesta) => {
      setSeleccion(encuesta);
      setVista('editor');
      setResultados(null);
      setFormPregunta(PREGUNTA_VACIA);
      setEditandoPregunta(null);
      cargarDetalle(encuesta.id_encuesta);
    },
    [cargarDetalle]
  );

  const abrirResultados = useCallback(
    (encuesta) => {
      setSeleccion(encuesta);
      setVista('resultados');
      setDetalle(null);
      cargarResultados(encuesta.id_encuesta);
    },
    [cargarResultados]
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

  const guardarMetadatos = useCallback(async () => {
    if (!seleccion) return;

    setEnviando(true);

    try {
      const actualizada = await encuestaService.actualizar(seleccion.id_encuesta, {
        titulo: detalle.titulo,
        descripcion: detalle.descripcion,
        mensaje_agradecimiento: detalle.mensaje_agradecimiento,
        estado: detalle.estado,
        fecha_inicio: detalle.fecha_inicio,
        fecha_fin: detalle.fecha_fin,
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
    setEnviando(true);

    try {
      await encuestaService.eliminar(idEncuesta);
      await cargarLista();
      volverALista();
      avisar('Encuesta eliminada');
    } catch (err) {
      // 409 = tiene respuestas. El mensaje del backend ya explica que hay que
      // cerrarla en lugar de borrarla, y es más útil que uno propio: se muestra
      // tal cual.
      setErrorFeedback(err.message);
    } finally {
      setEnviando(false);
    }
  }, [cargarLista, volverALista, avisar, setErrorFeedback]);

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
          es_visible: formPregunta.es_visible,
          escala_min: formPregunta.tipo === 'escala' ? Number(formPregunta.escala_min) : null,
          escala_max: formPregunta.tipo === 'escala' ? Number(formPregunta.escala_max) : null,
          escala_min_texto:
            formPregunta.tipo === 'escala' ? formPregunta.escala_min_texto : null,
          escala_max_texto:
            formPregunta.tipo === 'escala' ? formPregunta.escala_max_texto : null,
        });
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
          es_visible: formPregunta.es_visible,
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
  }, [formPregunta, editandoPregunta, seleccion, cargarDetalle, avisar, setErrorFeedback]);

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

  const guardarOpciones = useCallback(
    async (idPregunta, opciones) => {
      setEnviando(true);

      try {
        await encuestaService.actualizarOpciones(idPregunta, opciones);
        await cargarDetalle(seleccion.id_encuesta);
        avisar('Opciones actualizadas');
        return true;
      } catch (err) {
        // 409 = alguna opción que se quitó ya tenía respuestas. El backend lo
        // explica; se muestra su texto.
        setErrorFeedback(err.message);
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [seleccion, cargarDetalle, avisar, setErrorFeedback]
  );

  // El filtro se aplica en el cliente y no en la URL porque la lista son todas
  // las encuestas del sistema: son pocas y ya vienen cargadas, así que filtrar
  // en el servidor sería un request extra por cada clic en el filtro.
  const listaFiltrada = filtro
    ? lista.filter((e) => e.estado === filtro)
    : lista;

  const duplicar = useCallback(
    async (encuesta) => {
      setEnviando(true);

      try {
        const copia = await encuestaService.duplicar(encuesta.id_encuesta);
        await cargarLista();
        avisar(`"${copia.titulo}" creada en borrador, sin respuestas`);
        return copia;
      } catch (err) {
        setErrorFeedback(err.message);
        return null;
      } finally {
        setEnviando(false);
      }
    },
    [cargarLista, avisar, setErrorFeedback]
  );

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

  // --- orden de las opciones ---

  // A diferencia de las preguntas, aquí no se toca `detalle`: el editor de
  // opciones trabaja sobre su propia copia y manda los ids en el orden nuevo.
  // Se recarga el detalle al final para confirmar que el servidor guardó lo que
  // se pidió; si rechaza, el catch lo recarga y la lista vuelve a su posición real.
  const reordenarOpciones = useCallback(
    async (idPregunta, ids) => {
      setEnviando(true);

      try {
        await encuestaService.reordenarOpciones(idPregunta, ids);
        await cargarDetalle(seleccion.id_encuesta);
        return true;
      } catch (err) {
        setErrorFeedback(err.message);
        // El modal tiene su propia copia del orden. Si el servidor no lo acepta,
        // esa copia queda desincronizada, así que se devuelve false para que el
        // panel la descarte en vez de dejarla mostrando un orden que no se guardó.
        await cargarDetalle(seleccion.id_encuesta);
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [seleccion, cargarDetalle, setErrorFeedback]
  );

  return {
    vista,
    setVista,
    volverALista,

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

    resultados,
    cargandoResultados,
    abrirResultados,
    abrirEditor,

    formNueva,
    setFormNueva,
    crear,

    guardarMetadatos,
    eliminar,
    duplicar,

    formPregunta,
    setFormPregunta,
    editandoPregunta,
    setEditandoPregunta,
    guardarPregunta,
    eliminarPregunta,
    guardarOpciones,
    reordenarOpciones,
    moverPregunta,

    feedback,
    errorFeedback,
    setErrorFeedback,
  };
}
