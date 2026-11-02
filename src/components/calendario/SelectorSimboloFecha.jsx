import { TIPOS_FECHA } from '../../constants/tiposFecha';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { SimboloFecha } from './SimboloFecha';

export function SelectorSimboloFecha({ value, onChange, error }) {
  const { tema, modoOscuro } = useTheme();
  return (
    <fieldset className="mt-5" aria-describedby={error ? 'error-tipo-fecha' : 'ayuda-simbolo-fecha'}>
      <legend className={`text-xs font-semibold ${tema.title}`}>Símbolo</legend>
      <p id="ayuda-simbolo-fecha" className={`mt-1 mb-3 text-[11px] ${tema.subtitle}`}>Elige el icono que aparecerá en el calendario.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {TIPOS_FECHA.map((tipo) => {
          const seleccionado = value === tipo.value;
          return (
            <label key={tipo.value} className="min-w-0 cursor-pointer">
              <input type="radio" name="tipo_fecha" value={tipo.value} checked={seleccionado} onChange={onChange} className="peer sr-only" aria-invalid={!!error} aria-describedby={error ? 'error-tipo-fecha' : undefined} />
              <span className={`relative flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-1.5 py-3 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${seleccionado ? modoOscuro ? 'border-amber-400/70 bg-amber-400/5' : 'border-amber-400 bg-amber-50/70' : modoOscuro ? 'border-slate-700 hover:border-slate-500 bg-slate-900/20' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                {seleccionado && <span className="absolute right-1.5 top-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-slate-950"><Icono nombre="check" className="h-2.5 w-2.5" strokeWidth={2.5} /></span>}
                <SimboloFecha tipo={tipo.value} />
                <span className={`text-[11px] font-semibold leading-snug ${seleccionado ? tema.title : tema.subtitle}`}>{tipo.label}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && <p id="error-tipo-fecha" role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </fieldset>
  );
}
