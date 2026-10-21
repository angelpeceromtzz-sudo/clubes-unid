/* Tarjeta de una pregunta dentro del listado del editor.
 *
 * Dos estados:
 *   - resumen: el texto, el tipo, si es obligatoria y las etiquetas. Es lo que
 *     ve el admin cuando no está editando esa pregunta.
 *   - edición: el formulario en línea (cabecera con el texto y el selector de
 *     tipo, campos del tipo, franja de utilidades y acciones explícitas).
 *
 * Sólo hay una tarjeta en edición a la vez; el resto sigue mostrando su
 * resumen y conserva sus acciones (editar, duplicar, reordenar y eliminar).
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Badge } from '../../ui/Badge';
import { Icono } from '../../ui/Icono';
import { TIPOS_CON_OPCIONES, etiquetaTipoPregunta } from '../../../constants/encuesta';
import { Casilla, FormularioPregunta } from './FormularioPregunta';
import { revelarEnSuContenedor } from '../../../utils/scroll';

export function TarjetaPregunta({
  hook,
  pregunta,
  indice,
  total,
  editable,
  enEdicion,
  esNueva,
  onEditar,
  onDuplicar,
  onEliminar,
  alMaximo,
  maximo,
}) {
  const { cardCls, tema } = useTheme();
  const {
    formPregunta,
    setFormPregunta,
    guardarPregunta,
    cancelarEdicion,
    errorFeedback,
    enviando,
  } = hook;

  const filaRef = useRef(null);
  const textoRef = useRef(null);

  // Al abrir una tarjeta en edición el foco va a su campo de texto, y la
  // tarjeta se revela lo justo para que se vea sin quedar debajo de la barra
  // fija del editor.
  useEffect(() => {
    if (!enEdicion) return;

    textoRef.current?.focus({ preventScroll: true });

    const contenedor = filaRef.current?.closest('.overflow-y-auto');
    const barra = contenedor?.querySelector('[data-barra-herramientas]');
    // La barra de herramientas es fija en escritorio: la tarjeta tiene que
    // quedar por debajo de ella, no tapada.
    const esFija = barra && getComputedStyle(barra).position === 'sticky';
    const margen = esFija ? barra.getBoundingClientRect().height + 12 : 12;

    // El primer render de una tarjeta nueva puede no tener todavía su altura
    // definitiva; se espera un frame para medirla bien.
    const id = requestAnimationFrame(() => {
      revelarEnSuContenedor(filaRef.current, { margenSuperior: margen });
    });

    return () => cancelAnimationFrame(id);
  }, [enEdicion, esNueva]);

  const cambiaFormulario = (cambio) => {
    setFormPregunta((anterior) => ({ ...anterior, ...cambio }));
  };

  const alAplicar = async () => {
    // El guardado se hace aquí; si falla, la tarjeta sigue en edición con lo
    // escrito (lo decide el hook) y no se pierde nada.
    await guardarPregunta();
  };

  // Franja de utilidades de la tarjeta en edición. Duplicar y eliminar
  // necesitan un identificador que una pregunta nueva todavía no tiene: esa
  // se descarta con «Cancelar», así que no se ofrecen. El control de
  // «Obligatoria» sí está siempre: no depende de que la pregunta exista.
  const franjaUtilidades = (
    <div
      className={`mt-1 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-2 ${
        tema.isDark ? 'border-slate-700/60' : 'border-slate-200'
      }`}
    >
      {!esNueva && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicar(pregunta)}
            disabled={enviando || alMaximo}
            title={
              alMaximo
                ? `La encuesta ya tiene el máximo de ${maximo} preguntas`
                : 'Duplicar pregunta'
            }
            aria-label={`Duplicar la pregunta ${indice + 1}`}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            <Icono nombre="duplicate" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onEliminar(pregunta)}
            disabled={enviando}
            title="Eliminar"
            aria-label={`Eliminar la pregunta ${indice + 1}`}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            <Icono nombre="trash" className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="ml-auto">
        <Casilla
          etiqueta="Obligatoria"
          ayuda="El alumno no puede enviarla en blanco."
          checked={formPregunta.es_obligatoria}
          onChange={(e) => cambiaFormulario({ es_obligatoria: e.target.checked })}
          disabled={enviando}
        />
      </div>
    </div>
  );

  return (
    <li
      ref={filaRef}
      id={enEdicion ? 'pregunta-en-edicion' : undefined}
      data-pregunta-id={pregunta?.id_pregunta}
      data-pregunta-nueva={esNueva ? 'true' : undefined}
      tabIndex={-1}
      className={`${cardCls} border rounded-2xl p-5 flex flex-wrap items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
        enEdicion ? 'ring-1 ring-amber-400/60' : ''
      }`}
    >
      {enEdicion ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${tema.subtitle}`}>
              {esNueva ? 'Pregunta nueva' : `Pregunta ${indice + 1}`}
            </span>
          </div>

          <FormularioPregunta
            form={formPregunta}
            onChange={cambiaFormulario}
            modo={esNueva ? 'nueva' : 'existente'}
            disabled={enviando}
            onAplicar={alAplicar}
            onCancelar={cancelarEdicion}
            error={errorFeedback}
            textoRef={textoRef}
            franjaInferior={franjaUtilidades}
          />
        </div>
      ) : (
        <>
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
                  disabled={indice === total - 1 || enviando}
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

          {/* Las tres acciones (duplicar, editar, eliminar) comparten un
              marco para leerse como un grupo. Sueltas se leían como botones
              sueltos de la tarjeta. Duplicar reemplaza al viejo botón de
              "Editar opciones": las opciones ahora se editan dentro de la
              tarjeta, y éste crea una copia exacta de la pregunta (con sus
              opciones) justo debajo del original. */}
          {/* El grupo de acciones no se pinta cuando no hay nada que hacer: un
              marco vacío al lado de cada pregunta se lee como un botón roto.
              En móvil pasan a su propia fila para no dejar el texto de la
              pregunta en una columna estrecha. */}
          {editable && (
            <div
              className={`flex items-center gap-0.5 shrink-0 rounded-xl border p-0.5 basis-full sm:basis-auto justify-end ${
                tema.isDark ? 'border-slate-700/60' : 'border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => onDuplicar(pregunta)}
                disabled={enviando || alMaximo}
                title={
                  alMaximo
                    ? `La encuesta ya tiene el máximo de ${maximo} preguntas`
                    : 'Duplicar pregunta'
                }
                aria-label={`Duplicar la pregunta ${indice + 1}`}
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                <Icono nombre="duplicate" className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-accion="editar"
                onClick={() => onEditar(pregunta)}
                title="Editar"
                aria-label={`Editar la pregunta ${indice + 1}`}
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                <Icono nombre="pencil" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEliminar(pregunta)}
                title="Eliminar"
                aria-label={`Eliminar la pregunta ${indice + 1}`}
                className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                <Icono nombre="trash" className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
