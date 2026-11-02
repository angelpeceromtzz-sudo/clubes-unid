import { TIPOS_FECHA } from '../../constants/tiposFecha';
import { useTheme } from '../../contexts/ThemeContext';
import { SimboloFecha } from './SimboloFecha';

export function SelectorSimboloFecha({ value, onChange, error }) {
  const { tema, modoOscuro } = useTheme();
  return (
    <fieldset className="mt-4" aria-describedby={error ? 'error-tipo-fecha' : 'ayuda-simbolo-fecha'}>
      <legend className={`text-xs font-semibold ${tema.title}`}>Símbolo</legend>
      <p id="ayuda-simbolo-fecha" className="sr-only">Elige el icono que aparecerá en el calendario.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {TIPOS_FECHA.map((tipo) => {
          const seleccionado = value === tipo.value;
          return (
            <label key={tipo.value} className="flex min-w-0 cursor-pointer">
              <input type="radio" name="tipo_fecha" value={tipo.value} checked={seleccionado} onChange={onChange} aria-label={tipo.label} className="peer sr-only" aria-invalid={!!error} aria-describedby={error ? 'error-tipo-fecha' : undefined} />
              <span className={`inline-flex min-h-11 w-full items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${seleccionado ? modoOscuro ? 'border-amber-400/70 bg-amber-400/10 text-white' : 'border-amber-400 bg-amber-50 text-slate-900' : modoOscuro ? 'border-slate-700/80 bg-slate-900/20 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
                <SimboloFecha tipo={tipo.value} compacto />
                <span className="text-[11px] font-semibold leading-4 sm:text-xs">{tipo.label}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <p id="error-tipo-fecha" role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </fieldset>
  );
}
