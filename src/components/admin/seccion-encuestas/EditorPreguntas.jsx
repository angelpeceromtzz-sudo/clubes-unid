// Editor de preguntas de una encuesta: alta, edición, baja, opciones y orden.
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
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { CampoSelect } from '../../ui/CampoSelect';
import { CampoTexto } from '../../ui/CampoTexto';
import { Icono } from '../../ui/Icono';
import { ModalBase } from '../../ui/ModalBase';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import {
  TIPOS_CON_OPCIONES,
  TIPOS_PREGUNTA_ETIQUETA,
  MAX_OPCIONES_POR_PREGUNTA,
  MAX_PREGUNTAS_POR_ENCUESTA,
  MIN_OPCIONES_POR_PREGUNTA,
  etiquetaTipoPregunta,
} from '../../../constants/encuesta';

// Checkbox etiquetado. No hay componente de checkbox en el kit de UI y usar
// CampoTexto con type="checkbox" no funciona: CampoTexto no tiene checked/onToggle.
function Casilla({ etiqueta, checked, onChange, disabled, ayuda }) {
  return (
    <label className={`flex items-start gap-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
      />
      <span className="min-w-0">
        <span className="block text-sm">{etiqueta}</span>
        {ayuda && (
          <span className="block text-[11px] leading-relaxed opacity-60">{ayuda}</span>
        )}
      </span>
    </label>
  );
}

// Campo de opciones: una fila de texto por opción, con agregar, quitar y
// reordenar. El orden importa porque es el orden en que el alumno las ve, así
// que se cambia desde la propia fila con botones y no con arrastrar.
//
// `onMover` es opcional: en una pregunta que ya existe lo pasan, y entonces el
// reordenamiento va al servidor. En una nueva no hay ids todavía, así que se
// reordena la lista en memoria y se guarda junto con el resto.
function EditorOpciones({ opciones, onChange, disabled, onMover }) {
  const actualizar = (indice, texto) => {
    const copia = [...opciones];
    copia[indice] = texto;
    onChange(copia);
  };

  const mover = (indice, delta) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= opciones.length) return;

    if (onMover) {
      onMover(indice, destino);
      return;
    }

    const copia = [...opciones];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onChange(copia);
  };

  const quitar = (indice) => onChange(opciones.filter((_, i) => i !== indice));

  const agregar = () => {
    // Se rellena con cadena vacía y no con un texto de ejemplo: el backend
    // descarta las vacías al guardar, y el admin escribe lo que quiere.
    onChange([...opciones, '']);
  };

  const completas = opciones.filter((o) => o.trim()).length;

  return (
    <div className="space-y-2">
      {opciones.map((opcion, indice) => (
        <div key={indice} className="flex items-center gap-2">
          <div className="flex-1">
            <CampoTexto
              name={`opcion-${indice}`}
              value={opcion}
              onChange={(e) => actualizar(indice, e.target.value)}
              placeholder={`Opción ${indice + 1}`}
              disabled={disabled}
              maxLength={300}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => mover(indice, -1)}
              disabled={disabled || indice === 0}
              title="Subir opción"
              aria-label={`Subir opción ${indice + 1}`}
              className="p-2 opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono nombre="chevron-up" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mover(indice, 1)}
              disabled={disabled || indice === opciones.length - 1}
              title="Bajar opción"
              aria-label={`Bajar opción ${indice + 1}`}
              className="p-2 opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono nombre="chevron-down" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => quitar(indice)}
              disabled={disabled || opciones.length <= MIN_OPCIONES_POR_PREGUNTA}
              title={
                opciones.length <= MIN_OPCIONES_POR_PREGUNTA
                  ? `Una pregunta de opción necesita al menos ${MIN_OPCIONES_POR_PREGUNTA}`
                  : 'Quitar opción'
              }
              aria-label={`Quitar opción ${indice + 1}`}
              className="p-2 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono nombre="trash" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={agregar}
          disabled={disabled || opciones.length >= MAX_OPCIONES_POR_PREGUNTA}
          className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
        >
          <Icono nombre="plus" className="h-3 w-3" />
          Agregar opción
        </button>

        <span className="text-[11px] opacity-60">
          {completas} {completas === 1 ? 'escrita' : 'escritas'} de {opciones.length}
        </span>
      </div>

      {completas > 0 && completas < MIN_OPCIONES_POR_PREGUNTA && (
        <p className="text-[11px] text-amber-400">
          Se necesitan al menos {MIN_OPCIONES_POR_PREGUNTA} opciones con texto.
        </p>
      )}

      {completas < opciones.length && (
        <p className="text-[11px] opacity-60">
          Las opciones en blanco se descartan al guardar.
        </p>
      )}
    </div>
  );
}

export function EditorPreguntas({ hook }) {
  const { cardCls, labelCls, tema } = useTheme();
  const { detalle, formPregunta, setFormPregunta, editandoPregunta, setEditandoPregunta,
    guardarPregunta, eliminarPregunta, guardarOpciones, reordenarOpciones, enviando,
    errorFeedback, esAdmin, tieneRespuestas, setPreguntasPendientes } = hook;

  const [modalAbierto, setModalAbierto] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [editandoOpciones, setEditandoOpciones] = useState(null);

  // Mientras haya un modal abierto hay algo que se perdería al cambiar de
  // pestaña: en el de pregunta, lo que se está escribiendo; en el de opciones,
  // los textos y el orden arrastrados. Se reporta al contenedor para que pida
  // confirmación antes de desmontar todo esto.
  //
  // No se intenta adivinar si el formulario "cambió": abrir el modal para
  // mirar una pregunta y cerrarlo sin escribir no ensucia nada, y un aviso ahí
  // sería ruido.
  useEffect(() => {
    setPreguntasPendientes(modalAbierto || editandoOpciones !== null);
  }, [modalAbierto, editandoOpciones, setPreguntasPendientes]);

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

  // Al cambiar de encuesta mientras el modal está abierto, el formulario dejaría
  // apuntando a la anterior. Se cierra al cambiar el id.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModalAbierto(false);
    setEditandoOpciones(null);
  }, [detalle?.id_encuesta]);

  const preguntas = detalle?.preguntas ?? [];
  const llevaOpciones = TIPOS_CON_OPCIONES.includes(formPregunta.tipo);

  const abrirNueva = () => {
    setEditandoPregunta(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (pregunta) => {
    setEditandoPregunta(pregunta.id_pregunta);
    setFormPregunta({
      texto: pregunta.texto,
      ayuda: pregunta.ayuda ?? '',
      // El tipo se pinta pero no se manda: ver la nota del formulario.
      tipo: pregunta.tipo,
      es_obligatoria: pregunta.es_obligatoria,
      escala_min: pregunta.escala_min ?? 0,
      escala_max: pregunta.escala_max ?? 5,
      escala_min_texto: pregunta.escala_min_texto ?? '',
      escala_max_texto: pregunta.escala_max_texto ?? '',
      opciones: (pregunta.opciones ?? []).map((o) => o.texto),
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoPregunta(null);
  };

  const enviar = async () => {
    // Sólo se cierra si el guardado fue bien. Si falló, el mensaje del backend
    // queda en la alerta y el modal sigue abierto con lo que escribió el admin.
    if (await guardarPregunta()) cerrarModal();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            Preguntas ({preguntas.length}/{MAX_PREGUNTAS_POR_ENCUESTA})
          </h3>
          <p className={`text-[11px] ${tema.subtitle}`}>
            Todas las preguntas son públicas: si guardas la encuesta, el alumno las
            ve todas.
          </p>
        </div>

        {editable && (
          <BotonAccion
            onClick={abrirNueva}
            size="sm"
            disabled={preguntas.length >= MAX_PREGUNTAS_POR_ENCUESTA || enviando}
          >
            <Icono nombre="plus" className="h-3.5 w-3.5" />
            Nueva pregunta
          </BotonAccion>
        )}
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
              : 'Las respuestas son anónimas, así que no se puede ver quiénlas mandó.'}
          </p>
        </Alerta>
      )}

      {preguntas.length === 0 ? (
        <div className={`${cardCls} border rounded-2xl p-8 text-center`}>
          <p className={`text-sm ${tema.subtitle}`}>
            Esta encuesta todavía no tiene preguntas. Mientras esté vacía no hay nada que
            publicar.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {preguntas.map((pregunta, indice) => (
            <li
              key={pregunta.id_pregunta}
              className={`${cardCls} border rounded-2xl p-5 flex items-start gap-4`}
            >
              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                <span className={`text-[10px] font-black w-5 text-center ${tema.subtitle}`}>
                  {indice + 1}
                </span>
                {editable && (
                  <>
                    <button
                      type="button"
                      onClick={() => hook.moverPregunta(indice, -1)}
                      disabled={indice === 0 || enviando}
                      title="Subir"
                      aria-label={`Subir la pregunta ${indice + 1}`}
                      className="p-1 opacity-60 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Icono nombre="chevron-down" className="h-4 w-4 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => hook.moverPregunta(indice, 1)}
                      disabled={indice === preguntas.length - 1 || enviando}
                      title="Bajar"
                      aria-label={`Bajar la pregunta ${indice + 1}`}
                      className="p-1 opacity-60 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Icono nombre="chevron-down" className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {/* El texto de la pregunta va a text-base para que sea el elemento
                  que domina la tarjeta, como en el editor de Forms. Con text-sm
                  quedaba al mismo nivel de peso que los badges de abajo. */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className={`text-base font-medium break-words ${tema.title}`}>
                  {pregunta.texto}
                </p>
                {pregunta.ayuda && (
                  <p className={`text-[11px] ${tema.subtitle} break-words`}>
                    {pregunta.ayuda}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />
                  {pregunta.es_obligatoria && <Badge texto="Obligatoria" color="red" />}
                  {pregunta.tipo === 'escala' && (
                    <Badge texto={`${pregunta.escala_min}–${pregunta.escala_max}`} color="purple" />
                  )}
                  {TIPOS_CON_OPCIONES.includes(pregunta.tipo) && (
                    <span className={`text-[10px] ${tema.subtitle}`}>
                      {(pregunta.opciones ?? []).length} opciones
                    </span>
                  )}
                </div>
              </div>

              {/* Las tres acciones comparten un marco para leerse como un grupo.
                  Sueltas, el ícono de opciones y el de editar parecían el mismo
                  botón repetido. */}
              {/* El grupo de acciones no se pinta cuando no hay nada que hacer: un marco
                  vacío al lado de cada pregunta se lee como un botón roto. */}
              {editable && (
                <div
                  className={`flex items-center gap-0.5 shrink-0 rounded-xl border p-0.5 ${
                    tema.isDark ? 'border-slate-700/60' : 'border-slate-200'
                  }`}
                >
                  {TIPOS_CON_OPCIONES.includes(pregunta.tipo) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditandoOpciones({
                          id: pregunta.id_pregunta,
                          texto: pregunta.texto,
                          // Se guardan los ids aparte de los textos porque el
                          // reordenamiento se guarda por id. Si se guardara sólo el
                          // texto, habría que volver a pedirlos al servidor.
                          ids: (pregunta.opciones ?? []).map((o) => o.id_opcion),
                          opciones: (pregunta.opciones ?? []).map((o) => o.texto),
                        })
                      }
                      title="Editar opciones"
                      aria-label={`Editar opciones de la pregunta ${indice + 1}`}
                      className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      <Icono nombre="clipboard" className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEdicion(pregunta)}
                    title="Editar"
                    aria-label={`Editar la pregunta ${indice + 1}`}
                    className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    <Icono nombre="pencil" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrando(pregunta)}
                    title="Eliminar"
                    aria-label={`Eliminar la pregunta ${indice + 1}`}
                    className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Icono nombre="trash" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* --- alta / edición de pregunta --- */}
      <ModalBase
        show={modalAbierto && editable}
        onClose={cerrarModal}
        maxWidth="max-w-2xl"
        closeOnBackdrop={false}
      >
        <h3 className={`text-lg font-black uppercase tracking-wider mb-5 ${tema.title}`}>
          {editandoPregunta ? 'Editar pregunta' : 'Nueva pregunta'}
        </h3>

        <div className="space-y-4">
          <CampoTexto
            label="Texto de la pregunta"
            name="texto-pregunta"
            value={formPregunta.texto}
            onChange={(e) => setFormPregunta({ ...formPregunta, texto: e.target.value })}
            placeholder="¿Qué te gustaría hacer en tu tiempo libre?"
            required
            maxLength={500}
            disabled={enviando}
          />

          <CampoTexto
            label="Ayuda (opcional)"
            name="ayuda-pregunta"
            type="textarea"
            value={formPregunta.ayuda}
            onChange={(e) => setFormPregunta({ ...formPregunta, ayuda: e.target.value })}
            placeholder="Texto de apoyo que verá el alumno"
            disabled={enviando}
          />

          <CampoSelect
            label="Tipo de respuesta"
            name="tipo-pregunta"
            value={formPregunta.tipo}
            onChange={(e) => {
              const tipo = e.target.value;
              setFormPregunta({
                ...formPregunta,
                tipo,
                // Al cambiar a o desde un tipo con opciones, la lista se arma o se
                // limpia. Sin esto, cambiar de escala a opción múltiple mandaría
                // las opciones de la escala y el backend las aceptaría como
                // si fueran opciones válidas.
                opciones: TIPOS_CON_OPCIONES.includes(tipo)
                  ? formPregunta.opciones.length
                    ? formPregunta.opciones
                    : ['', '']
                  : ['', ''],
              });
            }}
            opciones={TIPOS_PREGUNTA_ETIQUETA}
            disabled={enviando || Boolean(editandoPregunta)}
          />

          {editandoPregunta && (
            <Alerta
              tipo="info"
              mensaje="El tipo no se puede cambiar al editar."
            >
              <p className="text-xs mt-1 opacity-80">
                Pasar de un tipo a otro dejaría la pregunta sin opciones o con opciones
                que no corresponden. Si la necesitas de otro tipo, bórrala y créala de nuevo.
              </p>
            </Alerta>
          )}

          {llevaOpciones && (
            <div>
              <p className={`${labelCls} mb-1.5`}>Opciones</p>
              <EditorOpciones
                opciones={formPregunta.opciones}
                onChange={(opciones) => setFormPregunta({ ...formPregunta, opciones })}
                disabled={enviando}
              />
            </div>
          )}

          {formPregunta.tipo === 'escala' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto
                  label="Mínimo"
                  name="escala-min"
                  type="number"
                  value={formPregunta.escala_min}
                  onChange={(e) =>
                    setFormPregunta({ ...formPregunta, escala_min: e.target.value })
                  }
                  disabled={enviando}
                />
                <CampoTexto
                  label="Máximo"
                  name="escala-max"
                  type="number"
                  value={formPregunta.escala_max}
                  onChange={(e) =>
                    setFormPregunta({ ...formPregunta, escala_max: e.target.value })
                  }
                  disabled={enviando}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CampoTexto
                  label="Etiqueta del mínimo (opcional)"
                  name="escala-min-texto"
                  value={formPregunta.escala_min_texto}
                  onChange={(e) =>
                    setFormPregunta({ ...formPregunta, escala_min_texto: e.target.value })
                  }
                  placeholder="Nunca"
                  maxLength={80}
                  disabled={enviando}
                />
                <CampoTexto
                  label="Etiqueta del máximo (opcional)"
                  name="escala-max-texto"
                  value={formPregunta.escala_max_texto}
                  onChange={(e) =>
                    setFormPregunta({ ...formPregunta, escala_max_texto: e.target.value })
                  }
                  placeholder="Todos los días"
                  maxLength={80}
                  disabled={enviando}
                />
              </div>
            </div>
          )}

          {/* Sólo queda "Obligatoria". No hay forma de esconder una pregunta
              sin borrarla: si está en la encuesta, el alumno la ve. Para
              quitársela al alumno se borra la pregunta. */}
          <div className="pt-2">
            <Casilla
              etiqueta="Obligatoria"
              ayuda="El alumno no puede enviarla en blanco."
              checked={formPregunta.es_obligatoria}
              onChange={(e) =>
                setFormPregunta({ ...formPregunta, es_obligatoria: e.target.checked })
              }
              disabled={enviando}
            />
          </div>

          {errorFeedback && <Alerta tipo="error" mensaje={errorFeedback} />}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <BotonAccion variant="outline" onClick={cerrarModal} disabled={enviando}>
            Cancelar
          </BotonAccion>
          <BotonAccion onClick={enviar} disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar'}
          </BotonAccion>
        </div>
      </ModalBase>

      {/* --- opciones de una pregunta existente --- */}
      <ModalBase
        show={Boolean(editandoOpciones) && editable}
        onClose={() => setEditandoOpciones(null)}
        maxWidth="max-w-lg"
        closeOnBackdrop={false}
      >
        {editandoOpciones && (
          <>
            <h3 className={`text-lg font-black uppercase tracking-wider mb-1 ${tema.title}`}>
              Opciones
            </h3>
            <p className={`text-xs mb-5 break-words ${tema.subtitle}`}>
              {editandoOpciones.texto}
            </p>

            <Alerta tipo="warning" mensaje="Guardar reemplaza la lista completa.">
              <p className="text-xs mt-1 opacity-80">
                Si alguna de las opciones que quites ya tiene respuestas, el servidor la
                rechaza: los conteos de la pregunta están atados a su opción. Mover el orden
                con las flechas sí funciona con respuestas, porque no cambia ninguna opción.
              </p>
            </Alerta>

            <div className="my-5">
              <EditorOpciones
                opciones={editandoOpciones.opciones}
                onChange={(opciones) =>
                  setEditandoOpciones({ ...editandoOpciones, opciones })
                }
                onMover={async (origen, destino) => {
                  // Se mueven los ids y los textos a la vez: si sólo se moviera el
                  // texto, la fila se desplazaría y el id se quedaría atrás, y el
                  // siguiente guardado escribiría el orden sobre opciones equivocadas.
                  const ids = [...editandoOpciones.ids];
                  const textos = [...editandoOpciones.opciones];
                  const [id] = ids.splice(origen, 1);
                  ids.splice(destino, 0, id);
                  const [texto] = textos.splice(origen, 1);
                  textos.splice(destino, 0, texto);

                  setEditandoOpciones({ ...editandoOpciones, ids, opciones: textos });
                  // Si el servidor no lo acepta, el modal se cierra: su copia del
                  // orden ya no sería la del servidor y "Guardar" escribiría mal.
                  const guardado = await reordenarOpciones(editandoOpciones.id, ids);
                  if (!guardado) setEditandoOpciones(null);
                }}
                disabled={enviando}
              />
            </div>

            <div className="flex justify-end gap-3">
              <BotonAccion
                variant="outline"
                onClick={() => setEditandoOpciones(null)}
                disabled={enviando}
              >
                Cancelar
              </BotonAccion>
              <BotonAccion
                onClick={async () => {
                  // El modal se cierra sólo si se guardó. Si el servidor rechaza
                  // (409 por quitar una opción con respuestas), cerrarlo tiraría
                  // los cambios que el admin llevaba un rato haciendo.
                  if (await guardarOpciones(editandoOpciones.id, editandoOpciones.opciones)) {
                    setEditandoOpciones(null);
                  }
                }}
                disabled={enviando}
              >
                {enviando ? 'Guardando...' : 'Guardar opciones'}
              </BotonAccion>
            </div>
          </>
        )}
      </ModalBase>

      {/* --- baja de pregunta --- */}
      <ModalConfirmacion
        show={Boolean(borrando) && editable}
        titulo="Eliminar pregunta"
        mensaje={
          borrando
            ? `Se eliminará "${borrando.texto}". Si ya tiene respuestas, el servidor no la deja borrar.`
            : ''
        }
        textoConfirmar="Eliminar"
        varianteDanger
        cargando={enviando}
        onConfirmar={async () => {
          await eliminarPregunta(borrando.id_pregunta);
          setBorrando(null);
        }}
        onCancelar={() => setBorrando(null)}
      />
    </div>
  );
}
