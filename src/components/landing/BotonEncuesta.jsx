/* CTA de encuesta de las páginas públicas (landing /conoce-clubs y
   /acerca-del-proyecto). Mientras ENCUESTA_SLUG siga en null muestra un
   estado honesto de preparación sin navegar a ninguna ruta; al tener slug,
   enlaza a /encuesta/<slug>. Extraído de PaginaConoceClubs para compartirse
   entre páginas sin importaciones cruzadas, conservando su comportamiento y
   estados. */
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { LANDING, hayEncuesta, rutaEncuesta } from '../../config/landing';

const FOCO_PRIMARIO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e162c] focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400';

export function BotonEncuesta({ className = '', grande = false, fondoPanel = false }) {
  const { modoOscuro } = useTheme();
  const disponible = hayEncuesta();
  const base = grande
    ? 'inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black rounded-full transition duration-200 active:scale-[0.98]'
    : 'inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold rounded-full transition duration-200 active:scale-[0.98]';

  if (!disponible) {
    const preparacion = fondoPanel
      ? 'bg-white/5 border-dashed border-white/30 text-slate-300'
      : modoOscuro
        ? 'bg-slate-800/50 border-dashed border-slate-600 text-slate-300'
        : 'bg-white border-dashed border-slate-300 text-slate-500';
    return (
      <span
        className={`${base} border cursor-not-allowed ${preparacion} ${className}`}
        aria-disabled="true"
        title={LANDING.encuesta.sinDestino}
      >
        <Icono nombre="clock" strokeWidth={2} className="h-4 w-4 shrink-0" />
        {LANDING.encuesta.btnNoDisponible}
      </span>
    );
  }

  return (
    <Link
      to={rutaEncuesta()}
      className={`${base} bg-amber-400 text-[#0e162c] hover:bg-amber-300 ${FOCO_PRIMARIO} ${className}`}
    >
      <Icono nombre="clipboard" strokeWidth={2} className="h-4 w-4 shrink-0" />
      {LANDING.encuesta.btnDisponible}
    </Link>
  );
}
