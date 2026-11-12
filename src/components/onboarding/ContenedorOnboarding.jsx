/* Marco visual del onboarding: encabezado de marca, indicador "N de 5",
   barra de progreso de cinco segmentos y pie de navegación. */
import { useTheme } from '../../contexts/ThemeContext';
import { TOTAL_PASOS_ONBOARDING } from '../../constants/onboarding';

function BarraProgreso({ actual }) {
  const { modoOscuro } = useTheme();
  return (
    <div
      role="progressbar"
      aria-label="Progreso del onboarding"
      aria-valuemin={1}
      aria-valuemax={TOTAL_PASOS_ONBOARDING}
      aria-valuenow={actual}
      aria-valuetext={`Paso ${actual} de ${TOTAL_PASOS_ONBOARDING}`}
      className="mt-4 grid grid-cols-5 gap-2"
    >
      {Array.from({ length: TOTAL_PASOS_ONBOARDING }, (_, indice) => (
        <span
          key={indice}
          aria-hidden="true"
          className={`h-1.5 rounded-full motion-safe:transition-colors motion-safe:duration-300 ${
            indice < actual ? (modoOscuro ? 'bg-amber-400' : 'bg-amber-500') : modoOscuro ? 'bg-slate-800' : 'bg-slate-300'
          }`}
        />
      ))}
    </div>
  );
}

export function ContenedorOnboarding({ progreso = null, pie = null, children }) {
  const { modoOscuro } = useTheme();
  const marco = modoOscuro
    ? 'bg-[#0b111e] text-slate-200'
    : 'bg-white text-slate-800';

  return (
    <section
      aria-label="Personaliza tu experiencia en Clubs UNID"
      className={`mx-auto w-full max-w-xl rounded-3xl p-5 sm:p-8 ${marco}`}
    >
      <header>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400">
              <img src="/branding/lobounid.png" alt="Clubs UNID" className="h-8 w-8 object-contain" draggable={false} />
            </span>
            <div>
              <p className={`text-base font-black leading-tight ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Clubs UNID</p>
              <p className={`text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Tu experiencia universitaria</p>
            </div>
          </div>
          {progreso && (
            <p className={`text-xs font-bold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              {progreso} de {TOTAL_PASOS_ONBOARDING}
            </p>
          )}
        </div>
        {progreso && <BarraProgreso actual={progreso} />}
      </header>

      <div className="mt-6">{children}</div>

      {pie && (
        <footer className={`mt-8 border-t pt-6 ${modoOscuro ? 'border-slate-800' : 'border-slate-200'}`}>
          {pie}
        </footer>
      )}
    </section>
  );
}
