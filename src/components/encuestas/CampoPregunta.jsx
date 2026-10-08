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
// `null` significa "Prefiero no decir" y el backend lo guarda como NULL.
//
// En las opciones el input nativo se conserva pero oculto con `sr-only`: sigue
// siendo un radio/checkbox real (teclado, lector de pantalla, name agrupado) y
// el indicador visible es un span hermano que se pinta con las clases peer-*.
// Así el estilo no depende de `accent-color` del navegador y el estado
// seleccionado se ve igual en Chrome, Firefox y móvil.
import { useTheme } from '../../contexts/ThemeContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';
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
 */
function SelectorLicenciatura({ valor, onChange, deshabilitado, base }) {
  const { licenciaturas, loading, error } = useLicenciaturas();

  // `?? ''` y no un cast: el contrato dice number|null, y null es justo el valor
  // que el <select> necesita para quedarse en la opción vacía. Un `|| ''` haría
  // lo mismo aquí, pero también se tragaría un 0, que no es un id válido.
  const seleccionado = valor ?? '';

  return (
    <div>
      <select
        value={seleccionado}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        disabled={deshabilitado || loading}
        className={base}
        aria-label="Tu licenciatura"
      >
        {/* La opción vacía es la respuesta por defecto y también la que
            representa "Prefiero no decir". Se rotula distinto mientras carga
            para que el alumno no la tome por una respuesta ya guardada. */}
        <option value="">{loading ? 'Cargando...' : 'Prefiero no decir'}</option>
        {licenciaturas.map((l) => (
          <option key={l.id_licenciatura} value={l.id_licenciatura}>
            {l.nombre}
          </option>
        ))}
      </select>

      {/* El fallo se dice abajo y no sobre el <select> porque el campo se puede
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

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {numeros.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={deshabilitado}
            aria-pressed={valor === n}
            className={`min-w-[2.75rem] rounded-xl border px-3.5 py-2.5 text-sm font-black transition-all ${
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
