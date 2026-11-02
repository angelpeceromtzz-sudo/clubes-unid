/* Formulario de una pregunta, tal y como se editaba dentro del modal.
 *
 * Antes vivía dentro de `ModalPreguntaEncuesta`; ahora se pinta dentro de la
 * tarjeta de la pregunta (el editor es en línea). El modelo de datos, los
 * tipos, las opciones, la escala y los límites no cambian: esto es sólo la
 * presentación.
 *
 * Distribución de la cabecera: el texto de la pregunta a la izquierda, con el
 * espacio principal, y el selector de tipo a la derecha, alineado con el campo
 * (en escritorio). En móvil el selector cae debajo, dentro del ancho
 * disponible.
 *
 * La ayuda opcional va en un desplegable: casi ninguna pregunta la lleva y
 * tenerla siempre abierta añade ruido a la tarjeta.
 */
import { useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { BotonAccion } from '../../ui/BotonAccion';
import { CampoTexto } from '../../ui/CampoTexto';
import { Icono } from '../../ui/Icono';
import {
  TIPOS_CON_OPCIONES,
  TIPOS_PREGUNTA_ETIQUETA,
  MAX_OPCIONES_POR_PREGUNTA,
  MIN_OPCIONES_POR_PREGUNTA,
  ETIQUETA_OPCION_OTRO,
} from '../../../constants/encuesta';

// Checkbox etiquetado. No hay componente de checkbox en el kit de UI y usar
// CampoTexto con type="checkbox" no funciona: CampoTexto no tiene checked/onToggle.
export function Casilla({ etiqueta, checked, onChange, disabled, ayuda }) {
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

// Campo de opciones: una fila por opción, con el símbolo de respuesta a la
// izquierda, el texto editable en línea y la acción de quitar a la derecha.
//
// Los símbolos (círculo para opción única, casilla para opción múltiple) son
// **decorativos**: en el editor no se elige nada, así que no son controles, no
// reciben el foco y se esconden de los lectores de pantalla. En la encuesta
// pública sí son los controles de verdad (ver `CampoPregunta`).
//
// El orden importa porque es el orden en que el alumno las ve. La opción
// especial «Otro» es siempre la última y las opciones normales nuevas se
// insertan antes que ella.
//
// Sin alto máximo ni scroll propio: la tarjeta crece y es la zona de contenido
// del editor la que se desplaza. Una zona de scroll dentro de la tarjeta
// dejaría los controles fuera de alcance.
export function EditorOpciones({ opciones, onChange, disabled, esMultiple }) {
  const { inputCls, tema } = useTheme();

  // Referencias a los campos de texto, para poder enfocar y seleccionar el de
  // la opción recién creada.
  const refs = useRef([]);

  const tieneOtro = opciones.some((o) => o.es_otro);
  const indiceOtro = opciones.findIndex((o) => o.es_otro);
  const escritas = opciones.filter((o) => !o.es_otro && o.texto.trim()).length;
  const validas = escritas + (tieneOtro ? 1 : 0);

  // La opción recién creada entra con el foco dentro y el texto seleccionado,
  // para poder escribir encima sin tener que borrarlo antes.
  const enfocarYSeleccionar = (indice) => {
    requestAnimationFrame(() => {
      const campo = refs.current[indice];
      if (!campo) return;

      campo.focus();
      campo.select();
    });
  };

  const cambiar = (indice, texto) => {
    const copia = [...opciones];
    copia[indice] = { ...copia[indice], texto };
    onChange(copia);
  };

  const mover = (indice, delta) => {
    // «Otro» no se mueve: siempre es la última opción de respuesta.
    if (opciones[indice].es_otro) return;

    const destino = indice + delta;
    if (destino < 0 || destino >= opciones.length) return;
    if (opciones[destino].es_otro) return;

    const copia = [...opciones];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onChange(copia);
  };

  const quitar = (indice) => {
    onChange(opciones.filter((_, i) => i !== indice));
  };

  const anadirOpcion = () => {
    if (opciones.length >= MAX_OPCIONES_POR_PREGUNTA) return;

    // Las opciones normales nuevas van antes de «Otro».
    const posicion = indiceOtro === -1 ? opciones.length : indiceOtro;
    const nueva = { texto: `Opción ${posicion + 1}`, es_otro: false };

    const copia = [...opciones];
    copia.splice(posicion, 0, nueva);

    onChange(copia);
    enfocarYSeleccionar(posicion);
  };

  const anadirOtro = () => {
    if (tieneOtro) return;
    if (opciones.length >= MAX_OPCIONES_POR_PREGUNTA) return;

    // «Otro» es siempre la última opción de respuesta.
    onChange([...opciones, { texto: ETIQUETA_OPCION_OTRO, es_otro: true }]);
  };

  const simbolo = esMultiple
    ? 'h-4 w-4 rounded-[5px] border-2 border-slate-500 shrink-0'
    : 'h-4 w-4 rounded-full border-2 border-slate-500 shrink-0';

  return (
    <div className="space-y-2">
      {opciones.map((opcion, indice) => (
        <div key={indice} className="flex items-center gap-2">
          {/* Símbolo decorativo: informa de cómo se responde esa opción, pero
              aquí no se selecciona nada. */}
          <span aria-hidden="true" className={`${simbolo} pointer-events-none`} />

          {opcion.es_otro ? (
            // La fila de «Otro» no es un campo: el creador no escribe aquí, el
            // alumno. La línea representa dónde escribiría la respuesta.
            <div
              className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
                tema.isDark ? 'border-slate-700 bg-[#18223f]' : 'border-slate-300 bg-slate-100'
              }`}
            >
              <span className="text-sm font-semibold shrink-0">Otro:</span>
              <span
                aria-hidden="true"
                className={`flex-1 border-b border-dashed ${
                  tema.isDark ? 'border-slate-600' : 'border-slate-400'
                }`}
              />
            </div>
          ) : (
            <input
              ref={(el) => {
                refs.current[indice] = el;
              }}
              type="text"
              value={opcion.texto}
              maxLength={300}
              disabled={disabled}
              onChange={(e) => cambiar(indice, e.target.value)}
              placeholder={`Opción ${indice + 1}`}
              aria-label={`Texto de la opción ${indice + 1}`}
              className={`${inputCls} flex-1 min-w-0`}
            />
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => mover(indice, -1)}
              disabled={disabled || indice === 0 || opcion.es_otro || opciones[indice - 1]?.es_otro}
              title="Subir opción"
              aria-label={`Subir la opción ${indice + 1}`}
              className="p-2 opacity-70 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono nombre="chevron-up" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mover(indice, 1)}
              disabled={
                disabled ||
                opcion.es_otro ||
                indice === opciones.length - 1 ||
                opciones[indice + 1]?.es_otro
              }
              title="Bajar opción"
              aria-label={`Bajar la opción ${indice + 1}`}
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
              aria-label={`Quitar la opción ${indice + 1}`}
              className="p-2 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icono nombre="trash" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Las acciones van debajo de todas las respuestas y no cuentan como
          opciones. */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="button"
          onClick={anadirOpcion}
          disabled={disabled || opciones.length >= MAX_OPCIONES_POR_PREGUNTA}
          className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
        >
          <Icono nombre="plus" className="h-3 w-3" />
          Añadir opción
        </button>

        {/* «Añadir respuesta «Otro»» desaparece mientras exista la opción
            especial y vuelve a estar disponible si se elimina. */}
        {!tieneOtro && (
          <button
            type="button"
            onClick={anadirOtro}
            disabled={disabled || opciones.length >= MAX_OPCIONES_POR_PREGUNTA}
            className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
          >
            <Icono nombre="plus" className="h-3 w-3" />
            Añadir respuesta «{ETIQUETA_OPCION_OTRO}»
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] opacity-60">
          {escritas} {escritas === 1 ? 'escrita' : 'escritas'} de{' '}
          {opciones.length}
        </span>
      </div>

      {validas > 0 && validas < MIN_OPCIONES_POR_PREGUNTA && (
        <p className="text-[11px] text-amber-400">
          Se necesitan al menos {MIN_OPCIONES_POR_PREGUNTA} opciones con texto.
        </p>
      )}

      {escritas < opciones.length - (tieneOtro ? 1 : 0) && (
        <p className="text-[11px] opacity-60">
          Las opciones en blanco se descartan al guardar.
        </p>
      )}
    </div>
  );
}

export function FormularioPregunta({
  form,
  onChange,
  modo,
  disabled = false,
  onAplicar,
  onCancelar,
  error,
  textoRef,
  franjaInferior,
}) {
  // La ayuda sólo se ve si el admin la pide o si ya tenía algo escrito (si no,
  // al abrir una pregunta con ayuda, el texto quedaría escondido).
  const [ayudaVisible, setAyudaVisible] = useState(Boolean(form.ayuda));

  const { labelCls, inputCls } = useTheme();

  const llevaOpciones = TIPOS_CON_OPCIONES.includes(form.tipo);

  return (
    <div className="space-y-4">
      {/* Cabecera: el texto de la pregunta a la izquierda (espacio principal) y
          el selector de tipo a la derecha, alineado con el campo. En móvil se
          apilan. */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <CampoTexto
            label="Texto de la pregunta"
            name="texto-pregunta"
            value={form.texto}
            onChange={(e) => onChange({ texto: e.target.value })}
            placeholder="¿Qué te gustaría hacer en tu tiempo libre?"
            required
            maxLength={500}
            disabled={disabled}
            inputRef={textoRef}
          />
        </div>

        <div className="sm:w-52 sm:shrink-0">
          <label htmlFor="tipo-pregunta" className={labelCls}>
            Tipo de respuesta
          </label>
          <select
            id="tipo-pregunta"
            name="tipo-pregunta"
            value={form.tipo}
            onChange={(e) => {
              const tipo = e.target.value;
              onChange({
                tipo,
                // Al cambiar a o desde un tipo con opciones, la lista se arma o
                // se limpia. Sin esto, cambiar de escala a opción múltiple
                // mandaría las opciones de la escala y el backend las
                // aceptaría como si fueran opciones válidas.
                opciones: TIPOS_CON_OPCIONES.includes(tipo)
                  ? form.opciones.length
                    ? form.opciones
                    : [{ texto: '', es_otro: false }, { texto: '', es_otro: false }]
                  : [{ texto: '', es_otro: false }, { texto: '', es_otro: false }],
              });
            }}
            disabled={disabled || modo === 'existente'}
            className={inputCls}
          >
            {TIPOS_PREGUNTA_ETIQUETA.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {modo === 'existente' && (
        <Alerta tipo="info" mensaje="El tipo no se puede cambiar al editar.">
          <p className="text-xs mt-1 opacity-80">
            Pasar de un tipo a otro dejaría la pregunta sin opciones o con opciones
            que no corresponden. Si la necesitas de otro tipo, bórrala y créala de nuevo.
          </p>
        </Alerta>
      )}

      {/* La ayuda es opcional y casi siempre está vacía: se despliega bajo
          demanda para no llenar la tarjeta de un campo que no se usa. */}
      <div>
        {ayudaVisible ? (
          <>
            <CampoTexto
              label="Ayuda (opcional)"
              name="ayuda-pregunta"
              type="textarea"
              value={form.ayuda}
              onChange={(e) => onChange({ ayuda: e.target.value })}
              placeholder="Texto de apoyo que verá el alumno"
              disabled={disabled}
              maxLength={200}
            />
            <button
              type="button"
              onClick={() => setAyudaVisible(false)}
              className="text-[11px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer inline-flex items-center gap-1"
            >
              <Icono nombre="chevron-up" className="h-3 w-3" />
              Ocultar texto de ayuda
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAyudaVisible(true)}
            className="text-[11px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 cursor-pointer inline-flex items-center gap-1"
          >
            <Icono nombre="plus" className="h-3 w-3" />
            Añadir texto de ayuda
          </button>
        )}
      </div>

      {llevaOpciones && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Opciones
          </p>
          <EditorOpciones
            opciones={form.opciones}
            onChange={(opciones) => onChange({ opciones })}
            disabled={disabled}
            esMultiple={form.tipo === 'opcion_multiple'}
          />
        </div>
      )}

      {form.tipo === 'escala' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              label="Mínimo"
              name="escala-min"
              type="number"
              value={form.escala_min}
              onChange={(e) => onChange({ escala_min: e.target.value })}
              disabled={disabled}
            />
            <CampoTexto
              label="Máximo"
              name="escala-max"
              type="number"
              value={form.escala_max}
              onChange={(e) => onChange({ escala_max: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              label="Etiqueta del mínimo (opcional)"
              name="escala-min-texto"
              value={form.escala_min_texto}
              onChange={(e) => onChange({ escala_min_texto: e.target.value })}
              placeholder="Nunca"
              maxLength={80}
              disabled={disabled}
            />
            <CampoTexto
              label="Etiqueta del máximo (opcional)"
              name="escala-max-texto"
              value={form.escala_max_texto}
              onChange={(e) => onChange({ escala_max_texto: e.target.value })}
              placeholder="Todos los días"
              maxLength={80}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {error && <Alerta tipo="error" mensaje={error} />}

      {/* Franja de utilidades (duplicar, eliminar, obligatoria): la pinta la
          tarjeta, porque esas acciones son de la tarjeta y no del formulario. */}
      {franjaInferior}

      <div className="flex flex-wrap justify-end gap-2">
        <BotonAccion variant="outline" onClick={onCancelar} disabled={disabled}>
          Cancelar
        </BotonAccion>
        <BotonAccion onClick={onAplicar} disabled={disabled}>
          {modo === 'nueva' ? 'Añadir pregunta' : 'Aplicar cambios'}
        </BotonAccion>
      </div>
    </div>
  );
}
