// Lista de preguntas de una encuesta.
//
// Las preguntas se editan dentro de su propia tarjeta: al pulsar "Agregar
// pregunta" aparece una tarjeta en blanco al final del listado, y al editar
// una existente se expande la suya. Sólo hay una tarjeta en edición a la vez;
// las demás muestran su resumen y conservan sus acciones (editar, duplicar,
// reordenar y eliminar).
//
// El reordenamiento usa botones ↑ ↓ y no drag & drop aunque @dnd-kit esté
// instalada en package.json. Es una decisión de esta ronda: los botones son
// <button> nativos, así que funcionan con teclado y con lector de pantalla sin
// código extra, y en un panel que se usa más en teléfono que en escritorio
// arrastrar es incómodo y falla. La librería no usada se queda declarada y
// esperando, sin código muerto.
import { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { MAX_PREGUNTAS_POR_ENCUESTA } from '../../../constants/encuesta';
import { ModalEdicionPendiente } from './ModalEdicionPendiente';
import { TarjetaPregunta } from './TarjetaPregunta';

export function EditorPreguntas({ hook }) {
  const { cardCls, tema } = useTheme();
  const {
    detalle,
    modoEdicion,
    preguntaEnEdicionId,
    abrirNuevaPregunta,
    abrirEdicionPregunta,
    cancelarEdicion,
    aplicarEdicion,
    setPreguntaEliminando,
    preguntaEliminando,
    eliminarPregunta,
    preguntaEnFoco,
    setPreguntaEnFoco,
    enviando,
    esAdmin,
    tieneRespuestas,
  } = hook;

  // Cambio que el admin quiso hacer y que quedó a la espera porque había una
  // edición con contenido pendiente. Se confirma antes de aplicarlo: abrir
  // otra pregunta no puede perder lo escrito en la anterior.
  const [cambioPendiente, setCambioPendiente] = useState(null);

  const preguntas = detalle?.preguntas ?? [];

  // La estructura se congela cuando la encuesta ya tiene respuestas.
  //
  // El backend no lo exige en todo: deja editar el texto de una pregunta y
  // reordenar. Lo que sí rompe es reemplazar las opciones de una pregunta que
  // ya tiene respuestas (el endpoint borra todas y las rehace con ids nuevos, y
  // hay respuestas apuntando a los ids viejos) y borrar una pregunta contestada.
  // Pero aunque el servidor lo permitiera, reordenar o cambiar el texto después
  // de que alguien contestó deja los resultados ya recolectados difíciles de
  // leer. Por eso aquí se congela todo el bloque y no sólo lo que el servidor
  // bloquea.
  //
  // El total se resincroniza al abrir el editor (`refrescarSeleccion`), así que
  // `tieneRespuestas` no es el de la lista de hace un rato: si un alumno contestó
  // mientras el panel estaba abierto, ya viene actualizado.
  const editable = esAdmin && !tieneRespuestas;

  const hayEdicion = modoEdicion !== null;

  const alMaximo = preguntas.length >= MAX_PREGUNTAS_POR_ENCUESTA;

  // Al terminar de guardar una pregunta, el foco va a ella: lo natural es
  // seguir con la pregunta que se acaba de escribir, no con el botón de
  // agregar. Se hace en un efecto porque la pregunta todavía no está en el
  // DOM cuando el hook la guarda.
  useEffect(() => {
    if (!preguntaEnFoco) return;

    const fila = document.querySelector(`[data-pregunta-id="${preguntaEnFoco}"]`);
    const editar = fila?.querySelector('[data-accion="editar"]');

    editar?.focus({ preventScroll: true });

    setPreguntaEnFoco(null);
  }, [preguntaEnFoco, preguntas.length, setPreguntaEnFoco]);

  // Abrir una pregunta (o una nueva) pide cerrar la edición en curso. Si esa
  // edición no tiene nada escrito, se cambia sin preguntar: abrir una tarjeta
  // sin tocarla no es un cambio pendiente.
  const abrir = (accion) => {
    if (hook.edicionPendiente) {
      setCambioPendiente(accion);
      return;
    }

    aplicar(accion);
  };

  const aplicar = (accion) => {
    if (accion.tipo === 'nueva') abrirNuevaPregunta();
    else if (accion.tipo === 'editar') abrirEdicionPregunta(accion.pregunta);
    else if (accion.tipo === 'duplicar') hook.duplicarPregunta(accion.pregunta);
    else if (accion.tipo === 'eliminar') setPreguntaEliminando(accion.pregunta);
  };

  // Confirmar el cambio pendiente: guardar lo escrito en la tarjeta anterior o
  // descartarlo. Si el guardado falla, el cambio no se aplica y la tarjeta
  // anterior sigue en edición con lo escrito.
  const confirmarCambio = async (descartar) => {
    const accion = cambioPendiente;
    setCambioPendiente(null);

    if (!descartar) {
      const ok = await aplicarEdicion();
      if (!ok) return;
    } else {
      cancelarEdicion();
    }

    aplicar(accion);
  };

  return (
    <div className="space-y-3">
      {/* Barra de la lista: sólo el contador y la nota. El acceso para
          agregar una pregunta vive al final del listado, para que haya una
          sola puerta de entrada y no dos.
          En escritorio se queda pegada arriba mientras se recorre una encuesta
          larga. El `top` negativo compensa el relleno de la zona de
          contenido: sin él, el contenido se transparenta por esa banda
          mientras la barra está fija. */}
      <div
        data-barra-herramientas
        className={`lg:sticky lg:top-[-1rem] z-10 py-2 flex items-center justify-between gap-3 flex-wrap ${cardCls} lg:border-b lg:border-slate-700/40`}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Preguntas ({preguntas.length}/{MAX_PREGUNTAS_POR_ENCUESTA})
          </h3>
          <p className={`text-[11px] ${tema.subtitle}`}>
            Todas las preguntas son públicas: si guardas la encuesta, el alumno las
            ve todas.
          </p>
        </div>
      </div>

      {/* El motivo del bloqueo se escribe aquí y no se deja que el admin lo
          descubra por un 409: si ve que los botones desaparecieron sin
          explicación, va a pensar que se rompió la pantalla. */}
      {!editable && preguntas.length > 0 && (
        <Alerta
          tipo={esAdmin ? 'warning' : 'info'}
          mensaje={
            esAdmin
              ? 'La estructura está congelada porque esta encuesta ya tiene respuestas.'
              : 'Sólo lectura: puedes consultar la encuesta, no modificarla.'
          }
        >
          <p className="text-xs mt-1">
            {esAdmin
              ? 'Para no descuadrar lo que ya respondieron no se pueden agregar, reordenar ni quitar preguntas, ni cambiar sus opciones. Los títulos, la descripción y las fechas de la encuesta sí se siguen pudiendo editar.'
              : 'Las respuestas son anónimas, así que no se puede ver quién las mandó.'}
          </p>
        </Alerta>
      )}

      {preguntas.length === 0 && !hayEdicion && (
        <div className={`${cardCls} border rounded-2xl p-8 text-center`}>
          <p className={`text-sm ${tema.subtitle}`}>
            Esta encuesta todavía no tiene preguntas. Mientras esté vacía no hay nada que
            publicar.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {preguntas.map((pregunta, indice) => (
          <TarjetaPregunta
            key={pregunta.id_pregunta}
            hook={hook}
            pregunta={pregunta}
            indice={indice}
            total={preguntas.length}
            // Mientras una tarjeta está en edición, las demás se quedan sólo
            // con su resumen: así no hay un segundo sitio donde pulsar.
            editable={editable && !hayEdicion}
            enEdicion={modoEdicion === 'existente' && preguntaEnEdicionId === pregunta.id_pregunta}
            esNueva={false}
            onEditar={(p) => abrir({ tipo: 'editar', pregunta: p })}
            onDuplicar={(p) => abrir({ tipo: 'duplicar', pregunta: p })}
            onEliminar={(p) => abrir({ tipo: 'eliminar', pregunta: p })}
            alMaximo={alMaximo}
            maximo={MAX_PREGUNTAS_POR_ENCUESTA}
          />
        ))}

        {/* La tarjeta en blanco va al final del listado, como una pregunta más
            que todavía no existe en el servidor. */}
        {modoEdicion === 'nueva' && (
          <TarjetaPregunta
            key="pregunta-nueva"
            hook={hook}
            pregunta={null}
            indice={preguntas.length}
            total={preguntas.length}
            editable={editable}
            enEdicion
            esNueva
            onEditar={() => {}}
            onDuplicar={() => {}}
            onEliminar={() => {}}
            alMaximo={alMaximo}
            maximo={MAX_PREGUNTAS_POR_ENCUESTA}
          />
        )}
      </ul>

      {/* Acceso único para agregar una pregunta: al final del listado (también
          en el estado vacío) y sólo cuando no hay ninguna tarjeta en edición. */}
      {editable && !hayEdicion && (
        <div className="pt-1">
          <BotonAccion
            id="agregar-pregunta"
            onClick={() => abrir({ tipo: 'nueva' })}
            variant="outline"
            size="sm"
            disabled={alMaximo || enviando}
            title={
              alMaximo
                ? `La encuesta ya tiene el máximo de ${MAX_PREGUNTAS_POR_ENCUESTA} preguntas`
                : 'Agregar una pregunta'
            }
          >
            <Icono nombre="plus" className="h-3.5 w-3.5" />
            Agregar pregunta
          </BotonAccion>
        </div>
      )}

      {/* --- confirmación de borrado --- */}
      <ModalConfirmacion
        show={Boolean(preguntaEliminando) && editable}
        titulo="Eliminar pregunta"
        mensaje={
          preguntaEliminando
            ? `Se eliminará "${preguntaEliminando.texto}". Si ya tiene respuestas, el servidor no la deja borrar.`
            : ''
        }
        textoConfirmar="Eliminar"
        varianteDanger
        cargando={enviando}
        onConfirmar={async () => {
          const id = preguntaEliminando.id_pregunta;
          await eliminarPregunta(id);
          // Si la pregunta eliminada era la que se estaba editando, la
          // edición se cierra: esa pregunta ya no existe.
          if (preguntaEnEdicionId === id) cancelarEdicion();
          setPreguntaEliminando(null);
        }}
        onCancelar={() => setPreguntaEliminando(null)}
      />

      {/* --- hay una edición pendiente ---
          Abrir otra pregunta no puede descartar en silencio lo que se estaba
          escribiendo: se ofrece guardarlo o descartarlo, y una tercera vía
          para seguir editando la anterior. */}
      <ModalEdicionPendiente
        show={Boolean(cambioPendiente)}
        mensaje="La pregunta que estás editando tiene cambios sin guardar. Puedes aplicarlos o descartarlos antes de continuar."
        cargando={enviando}
        onAplicar={() => confirmarCambio(false)}
        onDescartar={() => confirmarCambio(true)}
        onSeguir={() => setCambioPendiente(null)}
      />
    </div>
  );
}
