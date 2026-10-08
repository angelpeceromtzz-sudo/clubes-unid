// Render de un campo de encuesta según su tipo.
//
// Un solo componente para todos los tipos: la forma de la respuesta vive en el
// estado del formulario (un objeto plano), no en el estado de cada input. Así el
// envío es trivial y no hay que sincronizar N inputs sueltos.
//
// Contrato del `valor` según el tipo — es el mismo que espera el backend:
//   opcion_unica   -> number        (un id_opcion)
//   opcion_multiple-> number[]      (ids marcados)
//   texto_corto     -> string
//   texto_largo     -> string
//   escala          -> number
//   licenciatura     -> number|null   (un id_licenciatura del catálogo)
//
// `licenciatura` es el único tipo sin lista de opciones propia: las suyas salen
// del catálogo `cat_licenciaturas`, que se pide aquí con useLicenciaturas. El
// `null` significa "Prefiero no decir" cuando la pregunta es opcional, y el
// backend lo guarda como NULL. Si la pregunta es obligatoria, `null` es "sin
// elegir": el envío se rechaza, así que el selector no ofrece esa salida.
//
// En las opciones el input nativo se conserva pero oculto con `sr-only`: sigue
// siendo un radio/checkbox real (teclado, lector de pantalla, name agrupado) y
// el indicador visible es un span hermano que se pinta con las clases peer-*.
// Así el estilo no depende de `accent-color` del navegador y el estado
// seleccionado se ve igual en Chrome, Firefox y móvil.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';
import { BotonCerrar } from '../ui/BotonCerrar';
import { Icono } from '../ui/Icono';

export function CampoPregunta({ pregunta, valor, onChange, error, deshabilitado }) {
  const { modoOscuro, tema } = useTheme();

  const base = `w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-4 ${
    error
      ? `border-red-500 focus:ring-red-500/20 ${modoOscuro ? 'bg-[#18223f] text-white' : 'bg-white text-slate-900'}`
      : `focus:border-amber-400 focus:ring-amber-400/20 placeholder:text-slate-400 ${
          modoOscuro
            ? 'border-slate-700 bg-[#18223f] text-white'
            : 'border-slate-300 bg-white text-slate-900'
        }`
  } ${deshabilitado ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''}`;

  // Tarjeta de opción (única y múltiple): rounded-xl, transición completa y,
  // cuando está marcada, borde ámbar + tinte + ring suave que la hace saltar
  // sin necesidad de animaciones pesadas.
  const claseOpcion = (marcada) =>
    `group flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-all ${
      marcada
        ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/30'
        : `${modoOscuro ? 'border-slate-700' : 'border-slate-200'} hover:border-amber-400/50 hover:bg-amber-400/5`
    } ${deshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`;

  // Indicador circular del radio / casilla del checkbox, oculto para lectores
  // (aria-hidden) porque el input nativo sr-only ya expone el estado.
  const indicadorRadio = (marcada) =>
    `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/70 ${
      marcada ? 'border-amber-400' : modoOscuro ? 'border-slate-500' : 'border-slate-300'
    }`;

  const indicadorCheck = (marcada) =>
    `flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/70 ${
      marcada ? 'border-amber-400 bg-amber-400' : modoOscuro ? 'border-slate-500' : 'border-slate-300'
    }`;

  switch (pregunta.tipo) {
    case 'opcion_unica':
      return (
        <div className="space-y-2.5" role="radiogroup" aria-label={pregunta.texto}>
          {pregunta.opciones.map((opcion) => {
            const marcada = valor === opcion.id;
            return (
              <label key={opcion.id} className={claseOpcion(marcada)}>
                <input
                  type="radio"
                  name={`pregunta-${pregunta.id_pregunta}`}
                  value={opcion.id}
                  checked={marcada}
                  onChange={() => onChange(opcion.id)}
                  disabled={deshabilitado}
                  className="peer sr-only"
                />
                <span className={indicadorRadio(marcada)} aria-hidden="true">
                  <span
                    className={`h-2.5 w-2.5 rounded-full bg-[#0e162c] transition-transform duration-150 ${
                      marcada ? 'scale-100' : 'scale-0'
                    }`}
                  />
                </span>
                <span className={`text-sm ${tema.text}`}>{opcion.texto}</span>
              </label>
            );
          })}
        </div>
      );

    case 'opcion_multiple':
      return (
        <div className="space-y-2.5">
          {pregunta.opciones.map((opcion) => {
            const marcada = Array.isArray(valor) && valor.includes(opcion.id);
            return (
              <label key={opcion.id} className={claseOpcion(marcada)}>
                <input
                  type="checkbox"
                  value={opcion.id}
                  checked={marcada}
                  onChange={() => {
                    // Se reconstruye el array en vez de mutarlo: mutar el estado
                    // no dispara el re-render y el checkbox se queda visualmente
                    // marcado sin que el valor cambie.
                    const actuales = Array.isArray(valor) ? valor : [];
                    onChange(
                      marcada
                        ? actuales.filter((id) => id !== opcion.id)
                        : [...actuales, opcion.id]
                    );
                  }}
                  disabled={deshabilitado}
                  className="peer sr-only"
                />
                <span className={indicadorCheck(marcada)} aria-hidden="true">
                  {marcada && (
                    <Icono nombre="check" className="h-3.5 w-3.5 text-[#0e162c]" strokeWidth={3.5} />
                  )}
                </span>
                <span className={`text-sm ${tema.text}`}>{opcion.texto}</span>
              </label>
            );
          })}
        </div>
      );

    case 'texto_corto':
      return (
        <input
          type="text"
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={deshabilitado}
          maxLength={200}
          className={base}
          placeholder="Tu respuesta"
        />
      );

    case 'texto_largo':
      return (
        <div>
          <textarea
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={deshabilitado}
            maxLength={2000}
            rows={4}
            className={`${base} resize-y`}
            placeholder="Tu respuesta"
          />
          {/* El backend corta en 2000 igual; el contador evita que se descubra
              al enviar y perder todo el formulario. */}
          <p className={`mt-1 text-right text-xs ${tema.subtitle}`}>
            {(typeof valor === 'string' ? valor.length : 0)}/2000
          </p>
        </div>
      );

    case 'escala':
      return (
        <Escala
          pregunta={pregunta}
          valor={valor}
          onChange={onChange}
          deshabilitado={deshabilitado}
        />
      );

    case 'licenciatura':
      return (
        <SelectorLicenciatura
          valor={valor}
          onChange={onChange}
          deshabilitado={deshabilitado}
          base={base}
          esObligatoria={pregunta.es_obligatoria}
        />
      );

    default:
      // No debería llegar: el backend ya filtró los tipos que no existen.
      return null;
  }
}

/**
 * Programa del alumno.
 *
 * Va en su propio componente y no suelto en el switch porque es el único caso
 * que necesita pedir datos: el resto de tipos traen sus opciones ya en la
 * definición de la pregunta.
 *
 * El catálogo se cachea a nivel de módulo, así que la vista previa del panel y
 * el formulario público comparten la misma petición si se abren a la vez.
 *
 * La elección se hace en un modal propio (portal al body, estilo
 * ModalConfirmacion) y no en un <select> nativo ni en un dropdown anclado: el
 * select de Android abre el modal del sistema y rompe la estética de
 * ClubsUnid, y un panel absoluto dentro de la tarjeta se queda por detrás de la
 * siguiente pregunta al hacer scroll. El contrato de datos no cambia
 * (number|null hacia onChange), así que validaciones, estado del formulario y
 * envío siguen igual.
 *
 * Accesibilidad: el botón abre con Enter/Espacio/flechas y expone
 * aria-haspopup / aria-expanded; el modal usa role="dialog" aria-modal con la
 * lista como role="listbox" y opciones role="option" aria-selected. Flechas y
 * Home/End mueven el foco entre opciones, Enter o espacio seleccionan, Escape
 * y el clic en el fondo cierran devolviendo el foco al botón, y Tab queda
 * atrapado dentro del diálogo.
 */
function SelectorLicenciatura({ valor, onChange, deshabilitado, base, esObligatoria }) {
  const { licenciaturas, loading, error } = useLicenciaturas();
  const { modoOscuro, tema } = useTheme();

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [focoEnBoton, setFocoEnBoton] = useState(false);

  const botonRef = useRef(null);
  const dialogoRef = useRef(null);
  const refsOpciones = useRef([]);
  const idLista = useId();

  const etiquetaVacia = loading
    ? 'Cargando...'
    : esObligatoria
      ? 'Selecciona tu licenciatura'
      : 'Prefiero no decir';

  // La opción vacía encabeza la lista: es la respuesta por defecto. Si la
  // pregunta es opcional se rotula "Prefiero no decir" (es una salida válida);
  // si es obligatoria no se ofrece esa salida como respuesta válida, porque
  // elegirla sería un error al enviar (la tarjeta ya lleva el * rojo): el hueco
  // se rotula como pedido de selección. Mientras carga se rotula distinto para
  // que el alumno no la tome por una respuesta ya guardada.
  const opciones = [
    { valor: null, etiqueta: etiquetaVacia },
    ...licenciaturas.map((l) => ({ valor: l.id_licenciatura, etiqueta: l.nombre })),
  ];

  const nombreElegido = licenciaturas.find((l) => l.id_licenciatura === valor)?.nombre;
  const esPlaceholder = valor == null && esObligatoria;
  const textoBoton = valor == null ? etiquetaVacia : (nombreElegido ?? etiquetaVacia);

  const abrir = () => {
    if (deshabilitado || loading) return;
    const idx = opciones.findIndex((o) => o.valor === (valor ?? null));
    setActivo(idx >= 0 ? idx : 0);
    setFocoEnBoton(false);
    setAbierto(true);
  };

  // Cerrar no toca refs: sólo pide el foco de vuelta y el effect de más abajo
  // lo devuelve al botón. Así los handlers no leen refs y pasa react-hooks/refs.
  const cerrar = (devolverFoco) => {
    if (devolverFoco) setFocoEnBoton(true);
    setAbierto(false);
  };

  const elegir = (v) => {
    onChange(v);
    cerrar(true);
  };

  const moverA = (i) => {
    setActivo(Math.min(Math.max(i, 0), opciones.length - 1));
  };

  // Flechas sobre el botón cerrado: abren el modal como el resto de los
  // combobox. Enter y Espacio no hace falta interceptarlos, el botón ya
  // dispara click con esas teclas.
  const manejarTeclaBoton = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      abrir();
    }
  };

  const manejarTeclaDialogo = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar(true);
      return;
    }

    // Trampa de foco: Tab sólo recorre la X y las opciones del diálogo, para
    // que el teclado no se pierda detrás del modal.
    if (e.key === 'Tab') {
      const nodos = Array.from(
        dialogoRef.current?.querySelectorAll('button, [role="option"]') ?? []
      );
      if (nodos.length === 0) return;
      const primero = nodos[0];
      const ultimo = nodos[nodos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      } else if (!nodos.includes(document.activeElement)) {
        e.preventDefault();
        primero.focus();
      }
      return;
    }

    const indiceFoco = refsOpciones.current.findIndex((el) => el === document.activeElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moverA(indiceFoco >= 0 ? indiceFoco + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moverA(indiceFoco >= 0 ? indiceFoco - 1 : opciones.length - 1);
        break;
      case 'Home':
        e.preventDefault();
        moverA(0);
        break;
      case 'End':
        e.preventDefault();
        moverA(opciones.length - 1);
        break;
      case 'Enter':
      case ' ':
        // Sólo cuando el foco está en una opción: en la X, Enter/Espacio ya
        // activan el botón nativamente.
        if (indiceFoco >= 0) {
          e.preventDefault();
          elegir(opciones[indiceFoco]?.valor ?? null);
        }
        break;
      default:
        break;
    }
  };

  // El foco vive en la opción activa mientras el modal está abierto; así las
  // flechas del teclado funcionan sin aria-activedescendant y el lector anuncia
  // la opción enfocada. scrollIntoView mantiene visible la activa al navegar.
  useEffect(() => {
    if (!abierto) return;
    const el = refsOpciones.current[activo];
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [abierto, activo]);

  // Al cerrar (selección o Escape) el foco vuelve al botón que abrió el modal,
  // para que el teclado siga en el mismo sitio del formulario. El flag se
  // limpia en abrir() y no aquí: setState dentro de un effect dispara la regla
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    if (abierto || !focoEnBoton) return;
    botonRef.current?.focus();
  }, [abierto, focoEnBoton]);

  return (
    <div>
      <button
        ref={botonRef}
        type="button"
        disabled={deshabilitado || loading}
        onClick={abrir}
        onKeyDown={manejarTeclaBoton}
        aria-label="Tu licenciatura"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className={`${base} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={`min-w-0 truncate ${esPlaceholder ? 'text-slate-400' : ''}`}>
          {textoBoton}
        </span>
        <Icono
          nombre={abierto ? 'chevron-up' : 'chevron-down'}
          className={`h-4 w-4 shrink-0 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}
          strokeWidth={2}
        />
      </button>

      {/* Portal al body: el modal queda por encima de todas las tarjetas sin
          importar el scroll ni el apilado de la página. El fondo cierra (como
          ModalBase) y el diálogo para el click con stopPropagation. */}
      {abierto &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={() => cerrar(true)}
            onKeyDown={manejarTeclaDialogo}
          >
            <div
              ref={dialogoRef}
              role="dialog"
              aria-modal="true"
              aria-label="Selecciona tu licenciatura"
              className={`relative w-full max-w-sm rounded-2xl border p-6 scrollbar-amber ${
                modoOscuro
                  ? 'border-slate-700/50 bg-[#0e162c] text-slate-200'
                  : 'border-slate-200 bg-white shadow-sm text-slate-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <BotonCerrar
                onClick={() => cerrar(true)}
                etiqueta="Cerrar"
                className="absolute top-4 right-4"
              />

              <h3
                className={`mb-4 pr-8 text-sm font-black uppercase tracking-widest ${
                  modoOscuro ? 'text-white' : 'text-slate-900'
                }`}
              >
                Selecciona tu licenciatura
              </h3>

              <ul
                id={idLista}
                role="listbox"
                aria-label="Tu licenciatura"
                className={`max-h-[280px] overflow-y-auto overscroll-contain rounded-xl border p-1 scrollbar-amber ${
                  modoOscuro ? 'border-slate-700' : 'border-slate-200'
                }`}
              >
                {licenciaturas.length === 0 && !loading ? (
                  <li role="presentation" className={`px-3 py-2.5 text-sm ${tema.subtitle}`}>
                    No hay programas disponibles
                  </li>
                ) : (
                  opciones.map((o, i) => {
                    const seleccionada = o.valor === (valor ?? null);
                    return (
                      <li
                        key={o.valor ?? '__vacio__'}
                        id={`${idLista}-opt-${i}`}
                        ref={(el) => {
                          refsOpciones.current[i] = el;
                        }}
                        role="option"
                        tabIndex={-1}
                        aria-selected={seleccionada}
                        onClick={() => elegir(o.valor)}
                        onMouseEnter={() => setActivo(i)}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors ${
                          seleccionada
                            ? 'bg-amber-400/15 font-bold text-amber-500'
                            : i === activo
                              ? 'bg-amber-400/10'
                              : `${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`
                        }`}
                      >
                        <span className="min-w-0">{o.etiqueta}</span>
                        {seleccionada && (
                          <Icono nombre="check" className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body
        )}

      {/* El fallo se dice abajo y no sobre el campo porque el campo se puede
          dejar vacío: la encuesta sigue siendo enviable sin programa, así que
          un error aquí no debe parecer que bloquea el envío. */}
      {error && (
        <p className="mt-1 text-xs text-red-500">
          No se pudo cargar la lista de programas. La respuesta quedará sin registrar.
        </p>
      )}
    </div>
  );
}

// Escala como botones: un <input type="range"> con 0..10 es casi imposible de
// acertar y no muestra las etiquetas de los extremos, que son justamente lo que
// el admin escribe para dar contexto ('Nunca' / 'Todos los días').
function Escala({ pregunta, valor, onChange, deshabilitado }) {
  const { modoOscuro, tema } = useTheme();
  const min = pregunta.escala_min ?? 0;
  const max = pregunta.escala_max ?? 5;
  const numeros = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Escalas cortas (hasta 6 opciones, p. ej. 0..5) van en una sola fila:
  // columnas iguales que se adaptan al ancho disponible sin desbordar.
  // Escalas más largas usan auto-fill para repartirse en filas iguales.
  const columnas =
    numeros.length <= 6
      ? `repeat(${numeros.length}, minmax(0, 1fr))`
      : 'repeat(auto-fill, minmax(min(2.75rem, 100%), 1fr))';

  return (
    <div>
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: columnas }}
      >
        {numeros.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={deshabilitado}
            aria-pressed={valor === n}
            className={`min-w-0 rounded-xl border px-1 py-2.5 text-sm font-black transition-all sm:px-3.5 ${
              valor === n
                ? 'scale-105 border-transparent bg-gradient-to-br from-amber-400 to-amber-500 text-[#0e162c] shadow-md shadow-amber-400/30'
                : `${
                    modoOscuro
                      ? 'border-slate-700 text-slate-300'
                      : 'border-slate-300 text-slate-600'
                  } hover:border-amber-400/60 hover:text-amber-500`
            } ${deshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>

      {(pregunta.escala_min_texto || pregunta.escala_max_texto) && (
        <div className={`mt-2 flex justify-between text-xs font-medium ${tema.subtitle}`}>
          <span>{pregunta.escala_min_texto || ''}</span>
          <span>{pregunta.escala_max_texto || ''}</span>
        </div>
      )}
    </div>
  );
}
