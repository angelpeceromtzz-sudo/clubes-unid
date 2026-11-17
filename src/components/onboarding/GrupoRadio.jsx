/* Grupo de selección única (role="radiogroup") con navegación por teclado:
   flechas para moverse y foco tabulable solo en la opción activa. */
import { useTheme } from '../../contexts/ThemeContext';

export function GrupoRadio({ nombre, opciones, valor, onCambiar, labelledBy, disabled = false }) {
  const { modoOscuro } = useTheme();
  const indiceActivo = Math.max(0, opciones.findIndex((opcion) => opcion.valor === valor));

  function moverA(indice) {
    const destino = opciones[(indice + opciones.length) % opciones.length];
    onCambiar(destino.valor);
    document.getElementById(`${nombre}-${destino.valor}`)?.focus();
  }

  function alTeclear(evento, indice) {
    if (disabled) return;
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowRight') {
      evento.preventDefault();
      moverA(indice + 1);
    } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowLeft') {
      evento.preventDefault();
      moverA(indice - 1);
    }
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="mt-3 space-y-2">
      {opciones.map((opcion, indice) => {
        const seleccionado = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            id={`${nombre}-${opcion.valor}`}
            type="button"
            role="radio"
            aria-checked={seleccionado}
            tabIndex={indice === indiceActivo ? 0 : -1}
            disabled={disabled}
            onClick={() => onCambiar(opcion.valor)}
            onKeyDown={(evento) => alTeclear(evento, indice)}
            className={`motion-safe:transition motion-reduce:transition-none flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 disabled:cursor-not-allowed ${
              modoOscuro ? 'text-slate-200 hover:bg-slate-800/50' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                seleccionado ? 'border-amber-500' : modoOscuro ? 'border-slate-600' : 'border-slate-400'
              }`}
            >
              {seleccionado && <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
            </span>
            <span className="text-sm font-medium sm:text-base">{opcion.etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
