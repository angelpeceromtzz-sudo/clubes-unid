import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';

/* Candado para invitados: el calendario académico y las fechas de examen
   requieren una sesión institucional. El mural público sigue disponible. */
export function AccesoCalendarioPrivado({ onLoginClick, onVerMural }) {
  const { tema, modoOscuro, cardCls } = useTheme();

  return (
    <section
      className={`rounded-2xl border p-6 sm:p-8 text-center ${cardCls}`}
      aria-labelledby="acceso-calendario-titulo"
    >
      <span
        aria-hidden="true"
        className={`mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${
          modoOscuro ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700'
        }`}
      >
        <Icono nombre="lock" className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <h2 id="acceso-calendario-titulo" className={`text-lg font-black ${tema.title}`}>
        Calendario privado
      </h2>
      <p className={`mx-auto mt-2 max-w-md text-sm leading-relaxed ${tema.subtitle}`}>
        Las fechas académicas y los exámenes están disponibles para alumnos y personal
        autorizado. Inicia sesión con tu cuenta institucional para consultarlos.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onLoginClick}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 active:scale-95"
        >
          <Icono nombre="login" className="h-4 w-4" strokeWidth={2.2} />
          Iniciar sesión
        </button>
        {onVerMural && (
          <button
            type="button"
            onClick={onVerMural}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors active:scale-95 ${
              modoOscuro
                ? 'border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/60'
                : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <Icono nombre="newspaper" className="h-4 w-4" strokeWidth={2} />
            Ver mural público
          </button>
        )}
      </div>
    </section>
  );
}
