import { useTheme } from '../../contexts/ThemeContext';

export function BotonMicrosoft() {
  const { modoOscuro } = useTheme();

  return (
    <div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border p-4 text-left ${
          modoOscuro
            ? 'border-slate-700/60 bg-slate-800/40 text-slate-500'
            : 'border-slate-200 bg-slate-100 text-slate-500'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300/70 bg-slate-200/70">
          <svg viewBox="0 0 21 21" className="h-5 w-5 opacity-40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#64748b" rx="1.5" />
            <rect x="11" y="1" width="9" height="9" fill="#64748b" rx="1.5" />
            <rect x="1" y="11" width="9" height="9" fill="#64748b" rx="1.5" />
            <rect x="11" y="11" width="9" height="9" fill="#64748b" rx="1.5" />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug">
            Entrar con Microsoft 365
          </span>
          <span className="mt-1 block text-xs leading-relaxed sm:text-sm">Usa tu cuenta institucional de la UNID.</span>
        </span>

        <span className="shrink-0 rounded-full bg-slate-300/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          Próximamente
        </span>
      </button>
    </div>
  );
}
