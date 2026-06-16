// Modal de éxito que se muestra tras una inscripción exitosa
export function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center">
        {/* Ícono de verificación */}
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-black text-white mb-3">
          ¡Formulario enviado con éxito!
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Te avisaremos y te daremos más información detallada a tu correo institucional y a tu número de teléfono.
        </p>

        <button
          onClick={onClose}
          className="mt-6 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-8 py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ✦ A
