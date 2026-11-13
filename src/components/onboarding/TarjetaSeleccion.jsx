/* Opción seleccionable de selección múltiple (role="checkbox").
   variante "tarjeta": fila con icono, texto e indicador a la derecha.
   variante "chip": botón compacto para actividades; muestra un check al seleccionarse. */
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

const BASE = 'motion-safe:transition motion-reduce:transition-none duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-50 disabled:cursor-not-allowed';

export function TarjetaSeleccion({
  id,
  seleccionada,
  onAlternar,
  icono,
  titulo,
  descripcion,
  indicador = 'circulo',
  variante = 'tarjeta',
  disabled = false,
}) {
  const { modoOscuro } = useTheme();

  if (variante === 'chip') {
    const estilo = seleccionada
      ? modoOscuro
        ? 'border-amber-400 bg-amber-400/15 text-amber-400 font-bold'
        : 'border-amber-500 bg-amber-100 text-amber-800 font-bold'
      : modoOscuro
        ? 'border-slate-700 text-slate-200 hover:border-slate-500'
        : 'border-slate-300 text-slate-700 hover:border-slate-400';
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={seleccionada}
        id={id}
        disabled={disabled}
        onClick={onAlternar}
        className={`${BASE} inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${estilo}`}
      >
        {seleccionada && <Icono nombre="check" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
        <span>{titulo}</span>
      </button>
    );
  }

  const borde = seleccionada
    ? 'border-amber-500 ring-1 ring-amber-500/40'
    : modoOscuro
      ? 'border-slate-700/70 hover:border-slate-500'
      : 'border-slate-200 hover:border-slate-400';
  const fondo = modoOscuro ? 'bg-[#0e162c]/60' : 'bg-white';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={seleccionada}
      id={id}
      disabled={disabled}
      onClick={onAlternar}
      className={`${BASE} flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left ${borde} ${fondo}`}
    >
      {icono && (
        <Icono nombre={icono} className={`h-5 w-5 shrink-0 ${seleccionada ? 'text-amber-500' : modoOscuro ? 'text-slate-400' : 'text-slate-500'}`} />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{titulo}</span>
        {descripcion && (
          <span className={`mt-0.5 block text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{descripcion}</span>
        )}
      </span>
      {indicador === 'circulo' && (
        seleccionada
          ? <Icono nombre="check-circle-2" className="h-5 w-5 shrink-0 text-amber-500" />
          : <span aria-hidden="true" className={`h-5 w-5 shrink-0 rounded-full border-2 ${modoOscuro ? 'border-slate-600' : 'border-slate-500'}`} />
      )}
      {indicador === 'cuadro' && (
        <Icono
          nombre={seleccionada ? 'check-square' : 'square'}
          className={`h-5 w-5 shrink-0 ${seleccionada ? 'text-amber-500' : modoOscuro ? 'text-slate-500' : 'text-slate-500'}`}
        />
      )}
    </button>
  );
}
