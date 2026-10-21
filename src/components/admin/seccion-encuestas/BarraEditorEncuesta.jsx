/* Barra contextual del editor de encuestas.
 *
 * Es la barra propia del editor: no es la navbar global ni el menú lateral del
 * panel, y vive dentro del área del editor (la columna de contenido), encima
 * de las pestañas. Reúne las acciones que antes estaban repartidas por el
 * formulario: el nombre de la encuesta y su estado a la izquierda, las
 * acciones a la derecha.
 *
 * Decisiones:
 *
 * - "Publicar" es la única acción con acento ámbar. Las demás (Vista previa,
 *   Compartir, Guardar) van en contorno, con mucho menos peso visual: la
 *   acción que cambia el mundo es una sola y tiene que verse.
 *
 * - La acción principal se adapta al estado real. En borrador es "Publicar";
 *   en una encuesta abierta es "Cerrar encuesta"; en una cerrada es "Reabrir
 *   encuesta". Publicar sobre una encuesta ya publicada no hace nada, así que
 *   el botón no se queda ahí apuntando a un botón que no hace falta.
 *
 * - Todas las transiciones de estado pasan por aquí: publicar, cerrar,
 *   reabrir y volver a borrador. El selector de estado que estaba en la
 *   pestaña de Configuración se retiró para que no hubiera dos caminos para
 *   cambiar lo mismo; lo que sólo ofrecía ese selector (volver a borrador)
 *   quedó como acción secundaria en el menú "Más".
 *
 * - Guardar se llama distinto según el estado: "Guardar borrador" mientras la
 *   encuesta es un borrador (guardar sin publicar) y "Guardar cambios" cuando
 *   ya está publicada o cerrada (guardar conservando el estado vigente).
 *
 * - El estado del guardado se dice con palabras, no con el color del botón:
 *   "Cambios sin guardar", "Guardando…", "Guardado" o el error. "Guardado"
 *   sólo aparece cuando el servidor confirmó; nunca antes.
 */
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { ESTADO_ENCUESTA, infoEstadoEncuesta } from '../../../constants/estatus';
import { ESTADO_GUARDADO } from '../../../constants/encuesta';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { centrarEnSuContenedor } from '../../../utils/scroll';
import { MenuAcciones } from './MenuAcciones';
import { ModalCompartirEncuesta } from './ModalCompartirEncuesta';
import { VistaPreviaEncuesta } from './VistaPreviaEncuesta';

export function BarraEditorEncuesta({ hook, onVolver }) {
  const { tema, cardCls } = useTheme();
  const {
    detalle,
    formEncuesta,
    formularioSucio,
    estadoGuardado,
    errorGuardado,
    guardarFormulario,
    cambiarPestana,
    esAdmin,
    enviando,
    tieneRespuestas,
  } = hook;

  const [compartiendo, setCompartiendo] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [confirmandoBorrador, setConfirmandoBorrador] = useState(false);
  const [problema, setProblema] = useState(null);

  // En móvil las acciones de lectura no caben en línea y se agrupan en el
  // menú "Más"; en escritorio van en línea y el menú queda sólo para lo que no
  // tiene sitio allí (volver a borrador).
  const esMovil = useMediaQuery('(max-width: 639px)');

  // Acción que se repite cuando el guardado falla. Guardar el gesto y no
  // sólo "guardar" importa: si lo que falló fue una publicación, reintentar
  // tiene que volver a publicar, no dejar la encuesta a medio publicar.
  const [accionReintento, setAccionReintento] = useState(null);

  // Elemento al que hay que devolver el foco (al cerrar la vista previa o el
  // diálogo de compartir) y elemento al que hay que llevar el foco cuando la
  // validación no deja publicar.
  const botonPreviaRef = useRef(null);
  const botonCompartirRef = useRef(null);
  const [focoPendiente, setFocoPendiente] = useState(null);

  // Lleva el foco al control que falta. Se hace en un efecto porque el control
  // puede estar en otra pestaña: primero se cambia de pestaña y, cuando el
  // navegador ya pintó ese panel, se enfoca.
  useEffect(() => {
    if (!focoPendiente) return;

    const destino = document.querySelector(focoPendiente);
    if (destino) {
      destino.focus({ preventScroll: true });
      // El desplazamiento va al contenedor del editor, no a la ventana: así la
      // barra contextual no se sale de la vista.
      centrarEnSuContenedor(destino);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocoPendiente(null);
  }, [focoPendiente]);

  if (!detalle) return null;

  const info = infoEstadoEncuesta(detalle.estado);
  const totalPreguntas = detalle.preguntas?.length ?? 0;

  const esBorrador = detalle.estado === ESTADO_ENCUESTA.BORRADOR;
  const esPublicada = detalle.estado === ESTADO_ENCUESTA.PUBLICADA;

  // --- acciones ---

  // Resolver la pregunta que esté en edición antes de tocar la encuesta.
  //
  // Una pregunta a medio escribir no se puede dejar sin aplicar: la encuesta
  // no puede decir "guardada" mientras esa pregunta siga pendiente. Si el
  // guardado de la pregunta falla, aquí se detiene todo y la tarjeta conserva
  // lo escrito (el hook no cierra la edición cuando el guardado falla).
  const resolverEdicion = async () => {
    if (!hook.edicionPendiente) return true;

    const ok = await hook.aplicarEdicion();

    if (!ok) {
      setProblema({
        mensaje:
          'No se pudo guardar la pregunta que está en edición. Guárdala o cancélala para continuar.',
        foco: '#pregunta-en-edicion',
      });
    }

    return ok;
  };

  const guardar = async () => {
    setProblema(null);
    setAccionReintento(() => guardar);

    if (!(await resolverEdicion())) return;

    await guardarFormulario();
  };

  const publicar = async () => {
    setProblema(null);

    // La pregunta en edición se resuelve antes de validar: si es nueva, la
    // encuesta ya tiene una pregunta más y el aviso de "sin preguntas" no
    // aplica.
    if (!(await resolverEdicion())) return;

    // Antes de publicar se revisa la encuesta. Un mensaje que además lleva al
    // admin al campo que falta es mejor que un botón que no hace nada.
    if (!formEncuesta.titulo.trim()) {
      setProblema({
        mensaje: 'La encuesta necesita un título antes de publicarse.',
        foco: '#titulo',
        accion: () => cambiarPestana('preguntas'),
      });
      return;
    }

    if (totalPreguntas === 0) {
      setProblema({
        mensaje: 'No se puede publicar una encuesta sin preguntas.',
        foco: '#agregar-pregunta',
        accion: () => cambiarPestana('preguntas'),
      });
      return;
    }

    // Guardar y publicar en un solo viaje: si el guardado falla, la encuesta
    // no se publica y el formulario queda como estaba, con lo escrito.
    setAccionReintento(() => publicar);
    await guardarFormulario({ estado: ESTADO_ENCUESTA.PUBLICADA });
  };

  const cerrar = async () => {
    setConfirmandoCierre(false);

    if (!(await resolverEdicion())) return;

    await guardarFormulario({ estado: ESTADO_ENCUESTA.CERRADA });
  };

  const reabrir = async () => {
    setProblema(null);

    if (!(await resolverEdicion())) return;

    await guardarFormulario({ estado: ESTADO_ENCUESTA.PUBLICADA });
  };

  // Volver a borrador: la transición que sólo ofrecía el selector de estado de
  // Configuración. Reutiliza el mismo guardado que el resto de acciones, así
  // que pasa por las mismas validaciones y por el mismo manejo de cambios
  // pendientes.
  const volverABorrador = async () => {
    setConfirmandoBorrador(false);
    setProblema(null);

    if (!(await resolverEdicion())) return;

    await guardarFormulario({ estado: ESTADO_ENCUESTA.BORRADOR });
  };

  // --- etiquetas de la acción principal ---
  //
  // El botón cambia con el estado real de la encuesta: publicar una encuesta
  // que ya está publicada no hace nada, y cerrar una que ya está cerrada
  // tampoco.
  let accionPrincipal = null;

  if (esAdmin && esBorrador) {
    accionPrincipal = {
      etiqueta: 'Publicar',
      etiquetaCorta: 'Publicar',
      icono: 'zap',
      onClick: publicar,
      deshabilitado: enviando || estadoGuardado === ESTADO_GUARDADO.GUARDANDO,
    };
  } else if (esAdmin && esPublicada) {
    accionPrincipal = {
      etiqueta: 'Cerrar encuesta',
      etiquetaCorta: 'Cerrar',
      icono: 'lock',
      onClick: () => setConfirmandoCierre(true),
      deshabilitado: enviando || estadoGuardado === ESTADO_GUARDADO.GUARDANDO,
    };
  } else if (esAdmin) {
    accionPrincipal = {
      etiqueta: 'Reabrir encuesta',
      etiquetaCorta: 'Reabrir',
      icono: 'zap',
      onClick: reabrir,
      deshabilitado: enviando || estadoGuardado === ESTADO_GUARDADO.GUARDANDO,
    };
  }

  // --- estado del guardado ---
  const guardadoEnCurso = estadoGuardado === ESTADO_GUARDADO.GUARDANDO;
  const hayError = estadoGuardado === ESTADO_GUARDADO.ERROR;

  let estadoTexto = '';
  let estadoRol = 'status';

  if (hayError) {
    estadoTexto = errorGuardado || 'No se pudo guardar.';
    estadoRol = 'alert';
  } else if (guardadoEnCurso) {
    estadoTexto = 'Guardando…';
  } else if (estadoGuardado === ESTADO_GUARDADO.GUARDADO) {
    estadoTexto = 'Guardado';
  } else if (formularioSucio || hook.edicionPendiente) {
    estadoTexto = hook.edicionPendiente
      ? 'Tienes una pregunta en edición sin guardar.'
      : 'Tienes cambios sin guardar.';
  }

  const etiquetaGuardar = esBorrador ? 'Guardar borrador' : 'Guardar cambios';

  // El menú agrupa lo que no va en línea: en móvil, las dos acciones de
  // lectura; en cualquier ancho, volver a borrador.
  const puedeVolverABorrador = esAdmin && !esBorrador;

  const itemsMenu = [
    ...(esMovil
      ? [
          {
            clave: 'previa',
            icono: 'eye',
            texto: 'Vista previa',
            onClick: () => setPrevia(true),
          },
          {
            clave: 'compartir',
            icono: 'link',
            texto: 'Compartir',
            onClick: () => setCompartiendo(true),
          },
        ]
      : []),
    ...(puedeVolverABorrador
      ? [
          {
            clave: 'borrador',
            icono: 'clipboard',
            texto: 'Volver a borrador',
            onClick: () => setConfirmandoBorrador(true),
          },
        ]
      : []),
  ];

  return (
    <>
      {/* `shrink-0`: la barra es una parte fija del panel y nunca debe
          comprimirse para dejar sitio al contenido. */}
      <div className={`${cardCls} shrink-0 border-b px-4 py-3 sm:px-5`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Izquierda: volver, nombre y estado.
              En móvil el nombre se recorta (`truncate`) para que el estado y las
              acciones siempre quepan; en escritorio se ve completo. */}
          <div className="flex items-center gap-2 min-w-0 flex-1 basis-full sm:basis-auto">
            <button
              type="button"
              onClick={onVolver}
              aria-label="Volver a las encuestas"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded px-1 py-1"
            >
              <Icono nombre="arrow-left" className="h-3.5 w-3.5" />
              {/* En móvil no cabe la palabra: el nombre accesible lo da el
                  `aria-label` del botón, que es más explícito. */}
              <span className="hidden sm:inline">Volver</span>
            </button>

            <h1
              className={`text-sm sm:text-base font-black truncate min-w-0 ${tema.title}`}
              title={detalle.titulo}
            >
              {detalle.titulo}
            </h1>

            {/* El estado no se encoge: si el nombre largo lo dejara, el texto
                del badge quedaría cortado. */}
            <span className="shrink-0">
              <Badge texto={info.etiqueta} color={info.color} />
            </span>

          </div>

          {/* Derecha: acciones. En móvil van en su propia fila: con cinco
              botones a 320 px no caben en una y se amontonarían sobre el
              nombre de la encuesta. */}
          <div className="flex items-center gap-2 flex-wrap basis-full sm:basis-auto justify-end">
            {/* En escritorio las dos acciones de lectura van en línea. En móvil
                caben en una fila secundaria y se agrupan en el menú "Más": con
                cinco botones a 320 px no caben sin que se desborden. */}
            <BotonAccion
              ref={botonPreviaRef}
              variant="outline"
              size="sm"
              onClick={() => setPrevia(true)}
              className="hidden sm:inline-flex"
            >
              <Icono nombre="eye" className="h-3.5 w-3.5" />
              Vista previa
            </BotonAccion>

            <BotonAccion
              ref={botonCompartirRef}
              variant="outline"
              size="sm"
              onClick={() => setCompartiendo(true)}
              className="hidden sm:inline-flex"
            >
              <Icono nombre="link" className="h-3.5 w-3.5" />
              Compartir
            </BotonAccion>

            {/* El menú secundario. En móvil sustituye a las dos acciones de
                lectura (que van en línea sólo en escritorio) y en cualquier
                ancho ofrece volver a borrador. Si no queda ningún ítem, no se
                pinta: un "Más" vacío parece un botón roto. */}
            {itemsMenu.length > 0 && <MenuAcciones etiqueta="Más" items={itemsMenu} />}

            {esAdmin && (
              <BotonAccion
                variant="outline"
                size="sm"
                onClick={guardar}
                disabled={
                  enviando ||
                  guardadoEnCurso ||
                  (!formularioSucio && !hook.edicionPendiente)
                }
              >
                <Icono nombre="check" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{etiquetaGuardar}</span>
                <span className="sm:hidden">Guardar</span>
              </BotonAccion>
            )}

            {accionPrincipal && (
              <BotonAccion
                size="sm"
                onClick={accionPrincipal.onClick}
                disabled={accionPrincipal.deshabilitado}
              >
                <Icono nombre={accionPrincipal.icono} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{accionPrincipal.etiqueta}</span>
                <span className="sm:hidden">{accionPrincipal.etiquetaCorta}</span>
              </BotonAccion>
            )}
          </div>
        </div>

        {/* Estado del guardado y problemas de validación. */}
        {(estadoTexto || problema) && (
          <div className="mt-2 flex items-start gap-2 flex-wrap">
            {problema ? (
              <Alerta tipo="error" mensaje={problema.mensaje} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    problema.accion?.();
                    setFocoPendiente(problema.foco);
                  }}
                  className="text-xs font-bold underline cursor-pointer mt-1"
                >
                  Ir a lo que falta
                </button>
              </Alerta>
            ) : (
              <>
                <p
                  role={estadoRol}
                  aria-live={estadoRol === 'alert' ? 'assertive' : 'polite'}
                  className={`text-[11px] ${
                    hayError ? 'text-red-400 font-semibold' : tema.subtitle
                  }`}
                >
                  {estadoTexto}
                </p>

                {hayError && (
                  <button
                    type="button"
                    onClick={() => (accionReintento ? accionReintento() : guardar())}
                    disabled={enviando}
                    className="text-[11px] font-bold underline cursor-pointer disabled:opacity-50"
                  >
                    Reintentar
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* --- diálogos --- */}

      <ModalConfirmacion
        show={confirmandoCierre}
        titulo="Cerrar encuesta"
        mensaje={`Al cerrar "${detalle.titulo}" el enlace público dejará de recibir respuestas.${
          tieneRespuestas
            ? ' Las respuestas que ya hay se conservan y se pueden seguir viendo en Resultados.'
            : ''
        } Si te equivocaste, puedes reabrirla desde aquí.`}
        textoConfirmar="Cerrar encuesta"
        cargando={enviando}
        onConfirmar={cerrar}
        onCancelar={() => setConfirmandoCierre(false)}
      />

      <ModalConfirmacion
        show={confirmandoBorrador}
        titulo="Volver a borrador"
        mensaje={`"${detalle.titulo}" dejará de estar publicada: el enlace público dejará de mostrar el formulario. ${
          tieneRespuestas
            ? 'Las respuestas que ya hay se conservan y se pueden seguir viendo en Resultados.'
            : ''
        } Puedes volver a publicarla desde esta misma barra en cualquier momento.`}
        textoConfirmar="Volver a borrador"
        cargando={enviando}
        onConfirmar={volverABorrador}
        onCancelar={() => setConfirmandoBorrador(false)}
      />

      {previa && (
        <VistaPreviaEncuesta
          // La vista previa refleja lo que hay en el editor ahora mismo,
          // guardado o no: si el admin está escribiendo el título y abre la
          // vista previa, tiene que ver el título que está escribiendo.
          encuesta={{ ...detalle, ...formEncuesta, slug: detalle.slug }}
          preguntas={detalle.preguntas ?? []}
          onClose={() => {
            setPrevia(false);
            // Al cerrar, el foco vuelve al botón de origen: si no, el teclado
            // se queda en un nodo que ya no existe.
            botonPreviaRef.current?.focus();
          }}
        />
      )}

      {compartiendo && (
        <ModalCompartirEncuesta
          encuesta={detalle}
          onClose={() => {
            setCompartiendo(false);
            botonCompartirRef.current?.focus();
          }}
        />
      )}
    </>
  );
}
