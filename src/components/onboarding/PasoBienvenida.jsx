import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Alerta } from '../ui/Alerta';
import { BotonAccion } from '../ui/BotonAccion';

export function PasoBienvenida({ onComenzar, onOmitir, ocupado = false, error = '' }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${modoOscuro ? 'bg-amber-400/15 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
        <Icono nombre="sparkles" className="h-8 w-8" />
      </span>
      <h2 id="titulo-paso" tabIndex={-1} className={`mt-6 text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¡Bienvenido a Clubs UNID!
      </h2>
      <p className={`mx-auto mt-4 max-w-md text-sm leading-relaxed sm:text-base ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
        Queremos ayudarte a descubrir clubes, conocer personas y vivir nuevas experiencias en tu universidad.
      </p>
      <p className={`mt-3 text-sm font-bold ${modoOscuro ? 'text-slate-200' : 'text-slate-700'}`}>
        Personaliza tu experiencia en menos de 2 minutos.
      </p>

      {error && (
        <div role="alert" className="mt-6 text-left">
          <Alerta tipo="error" mensaje={error} />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4">
        <BotonAccion size="lg" onClick={onComenzar} disabled={ocupado} className="w-full sm:w-auto sm:min-w-64">
          Comenzar
          <Icono nombre="arrow-right" className="h-4 w-4" />
        </BotonAccion>
        <button
          type="button"
          onClick={onOmitir}
          disabled={ocupado}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-50 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}
        >
          {ocupado && <Icono nombre="loader" className="h-4 w-4 motion-safe:animate-spin" />}
          Explorar sin personalizar
        </button>
      </div>
    </div>
  );
}
