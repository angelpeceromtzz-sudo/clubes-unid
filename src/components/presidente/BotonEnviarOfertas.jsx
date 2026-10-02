import { Icono } from '../ui/Icono';
import { Spinner } from '../ui/Spinner';

export function BotonEnviarOfertas({ aprobados, enviando, onEnviar }) {
  if (aprobados.length === 0) return null;
  return (
    <button
      onClick={onEnviar}
      disabled={enviando}
      className="w-full bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {enviando ? (
        <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
      ) : (
        <>
          <Icono nombre="check-circle" className="h-5 w-5" strokeWidth={2.5} />
          Enviar ofertas ({aprobados.length})
        </>
      )}
    </button>
  );
}
